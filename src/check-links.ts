import { readFile } from "node:fs/promises";
import path from "node:path";
import type { Ring, Member } from "./types.js";
import { safeFetchText } from "./safe-fetch.js";

const ROOT = path.resolve(import.meta.dirname, "..");
const GRACE_PERIOD_DAYS = 7;
const RETRY_COUNT = 2;
const RETRY_DELAY_MS = 2000;
const LABEL = "dead-link";

interface GitHubIssue {
  number: number;
  title: string;
  state: "open" | "closed";
  body: string | null;
}

function githubApi(): { repo: string; token: string } {
  const repo = process.env.GITHUB_REPOSITORY;
  const token = process.env.GITHUB_TOKEN;
  if (!repo || !token) {
    throw new Error("GITHUB_REPOSITORY and GITHUB_TOKEN must be set");
  }
  return { repo, token };
}

async function ghFetch(pathname: string, init: RequestInit = {}): Promise<Response> {
  const { repo, token } = githubApi();
  const res = await fetch(`https://api.github.com/repos/${repo}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API ${pathname} failed: ${res.status} ${await res.text()}`);
  }
  return res;
}

function issueTitle(slug: string): string {
  return `Dead link: ${slug}`;
}

const MAX_ISSUE_PAGES = 50; // 50 * 100 = 5,000 dead-link issues, ever — a hard backstop, not an expected ceiling

/**
 * Lists every open+closed `dead-link` issue, paginated. Without this, a
 * ring that has ever accumulated more than one page of dead-link issues
 * (open or closed — closed issues keep the label forever) would silently
 * stop finding existing issues past page 1: openOrUpdateIssue would open
 * duplicates, and closeIssueIfOpen would never find the issue to close.
 */
export async function listDeadLinkIssues(): Promise<GitHubIssue[]> {
  const all: GitHubIssue[] = [];
  for (let page = 1; page <= MAX_ISSUE_PAGES; page++) {
    const res = await ghFetch(`/issues?labels=${LABEL}&state=all&per_page=100&page=${page}`);
    const issues = (await res.json()) as GitHubIssue[];
    all.push(...issues);
    if (issues.length < 100) break;
  }
  return all;
}

function findIssue(issues: GitHubIssue[], slug: string): GitHubIssue | null {
  return issues.find((i) => i.title === issueTitle(slug)) ?? null;
}

async function openOrUpdateIssue(member: Member, reason: string, issues: GitHubIssue[]): Promise<void> {
  const existing = findIssue(issues, member.slug);
  const body = `The link checker could not confirm \`${member.url}\` is healthy.\n\nReason: ${reason}\n\nThis is an automated report from the weekly dead-link checker. Removal from the ring is a human decision — see JOINING.md.`;

  if (existing && existing.state === "open") {
    await ghFetch(`/issues/${existing.number}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
    console.log(`Updated existing issue #${existing.number} for ${member.slug}`);
    return;
  }

  if (existing && existing.state === "closed") {
    await ghFetch(`/issues/${existing.number}`, {
      method: "PATCH",
      body: JSON.stringify({ state: "open", body }),
    });
    console.log(`Reopened issue #${existing.number} for ${member.slug}`);
    return;
  }

  const res = await ghFetch(`/issues`, {
    method: "POST",
    body: JSON.stringify({
      title: issueTitle(member.slug),
      body,
      labels: [LABEL],
    }),
  });
  const created = (await res.json()) as GitHubIssue;
  console.log(`Opened issue #${created.number} for ${member.slug}`);
}

async function closeIssueIfOpen(member: Member, issues: GitHubIssue[]): Promise<void> {
  const existing = findIssue(issues, member.slug);
  if (!existing || existing.state !== "open") return;

  await ghFetch(`/issues/${existing.number}/comments`, {
    method: "POST",
    body: JSON.stringify({
      body: `\`${member.url}\` is healthy again. Closing.`,
    }),
  });
  await ghFetch(`/issues/${existing.number}`, {
    method: "PATCH",
    body: JSON.stringify({ state: "closed" }),
  });
  console.log(`Closed issue #${existing.number} for ${member.slug} (recovered)`);
}

function daysSince(dateStr: string): number {
  const then = new Date(`${dateStr}T00:00:00Z`).getTime();
  return (Date.now() - then) / (1000 * 60 * 60 * 24);
}

async function fetchWithRetry(url: string): Promise<{ status: number; ok: boolean; text: string }> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      return await safeFetchText(url, 15_000);
    } catch (err) {
      lastErr = err;
      if (attempt < RETRY_COUNT) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)));
      }
    }
  }
  throw lastErr;
}

export async function checkMember(member: Member, ringHost: string): Promise<{ ok: boolean; reason: string }> {
  try {
    const res = await fetchWithRetry(member.url);
    if (!res.ok) {
      return { ok: false, reason: `HTTP ${res.status}` };
    }
    if (!res.text.includes(ringHost)) {
      return { ok: false, reason: `page does not link back to ${ringHost}` };
    }
    return { ok: true, reason: "" };
  } catch (err) {
    return { ok: false, reason: (err as Error).message };
  }
}

async function main(): Promise<void> {
  const raw = await readFile(path.join(ROOT, "ring.json"), "utf-8");
  const ring: Ring = JSON.parse(raw);
  const ringHost = new URL(ring.url).host;

  const issues = await listDeadLinkIssues();
  let failures = 0;

  for (const member of ring.members) {
    if (daysSince(member.joined) < GRACE_PERIOD_DAYS) {
      console.log(`${member.slug}: skipped (joined < ${GRACE_PERIOD_DAYS} days ago)`);
      continue;
    }

    const result = await checkMember(member, ringHost);
    if (result.ok) {
      console.log(`${member.slug}: ok`);
      await closeIssueIfOpen(member, issues);
    } else {
      console.log(`${member.slug}: FAILED (${result.reason})`);
      await openOrUpdateIssue(member, result.reason, issues);
      failures++;
    }
  }

  console.log(`Link check complete: ${failures} failure(s) out of ${ring.members.length} member(s).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
