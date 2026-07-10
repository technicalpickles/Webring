import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import sharp from "sharp";
import type { Ring } from "./types.js";
import { safeFetchText } from "./safe-fetch.js";

const ROOT = path.resolve(import.meta.dirname, "..");

export interface ValidationIssue {
  message: string;
}

function charRange(startCode: number, endCode: number): string {
  return `${String.fromCharCode(startCode)}-${String.fromCharCode(endCode)}`;
}

// Printable text only: blocks the five HTML metacharacters, C0/C1 control
// characters (incl. newlines/tabs/NUL), and Unicode bidi formatting
// characters (incl. U+202E RIGHT-TO-LEFT OVERRIDE) that can visually spoof
// a member's displayed name/owner without tripping any HTML escaping.
const BLOCKED_CHARS =
  charRange(0x00, 0x1f) + // C0 controls
  charRange(0x7f, 0x9f) + // DEL + C1 controls
  String.fromCharCode(0x200e) + // LRM
  String.fromCharCode(0x200f) + // RLM
  charRange(0x202a, 0x202e) + // LRE RLE PDF LRO RLO
  charRange(0x2066, 0x2069); // LRI RLI FSI PDI

const CHARSET_RE = new RegExp(`^[^<>&"'${BLOCKED_CHARS}]*$`);
const MAX_BADGE_BYTES = 100 * 1024;
const BADGE_WIDTH = 88;
const BADGE_HEIGHT = 31;

export async function loadSchema(): Promise<object> {
  const raw = await readFile(path.join(ROOT, "ring.schema.json"), "utf-8");
  return JSON.parse(raw);
}

export async function loadDeadTags(): Promise<string[]> {
  const raw = await readFile(path.join(ROOT, "dead-tags.json"), "utf-8");
  return JSON.parse(raw);
}

export async function validateRing(ring: Ring): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = await loadSchema();
  const validateSchema = ajv.compile(schema);
  if (!validateSchema(ring)) {
    for (const err of validateSchema.errors ?? []) {
      issues.push({ message: `schema: ${err.instancePath || "/"} ${err.message}` });
    }
    // Schema failures make further structural checks unreliable; bail early.
    return issues;
  }

  const deadTags = await loadDeadTags();
  const deadTagSet = new Set(deadTags);

  const slugs = new Set<string>();
  const duplicateSlugs = new Set<string>();
  for (const member of ring.members) {
    if (slugs.has(member.slug)) duplicateSlugs.add(member.slug);
    slugs.add(member.slug);
  }
  for (const slug of duplicateSlugs) {
    issues.push({ message: `duplicate slug: "${slug}"` });
  }

  const claimedTags = new Set(ring.members.map((m) => m.tag));
  const allTagsClaimed = deadTags.every((t) => claimedTags.has(t));

  const tagCounts = new Map<string, number>();
  for (const member of ring.members) {
    tagCounts.set(member.tag, (tagCounts.get(member.tag) ?? 0) + 1);
  }

  for (const member of ring.members) {
    if (!deadTagSet.has(member.tag)) {
      issues.push({ message: `${member.slug}: unknown patron tag "${member.tag}" (not in dead-tags.json)` });
    } else if ((tagCounts.get(member.tag) ?? 0) > 1 && !allTagsClaimed) {
      issues.push({
        message: `${member.slug}: duplicate patron tag "${member.tag}" is only allowed once every tag in dead-tags.json has been claimed`,
      });
    }

    if (!CHARSET_RE.test(member.name)) {
      issues.push({ message: `${member.slug}: name contains disallowed characters (HTML metacharacters, control characters, or bidi-override characters)` });
    }
    if (!CHARSET_RE.test(member.owner)) {
      issues.push({ message: `${member.slug}: owner contains disallowed characters (HTML metacharacters, control characters, or bidi-override characters)` });
    }
    if (!member.url.startsWith("https://")) {
      issues.push({ message: `${member.slug}: url must be https://` });
    }
    if (member.rss && !member.rss.startsWith("https://")) {
      issues.push({ message: `${member.slug}: rss must be https://` });
    }

    // A future joined date makes daysSince() negative forever in check-links.ts,
    // permanently exempting the member from the weekly dead-link checker's
    // 7-day grace period instead of just covering it temporarily.
    const joinedMs = Date.parse(`${member.joined}T00:00:00Z`);
    if (Number.isNaN(joinedMs)) {
      issues.push({ message: `${member.slug}: joined "${member.joined}" is not a valid date` });
    } else if (joinedMs > Date.now()) {
      issues.push({ message: `${member.slug}: joined "${member.joined}" is in the future` });
    }

    if (member.badge) {
      const expected = `badges/${member.slug}.`;
      if (!member.badge.startsWith(expected)) {
        issues.push({
          message: `${member.slug}: badge path must be badges/${member.slug}.png or badges/${member.slug}.gif`,
        });
      }
      const badgePath = path.join(ROOT, member.badge);
      if (!existsSync(badgePath)) {
        issues.push({ message: `${member.slug}: badge file ${member.badge} does not exist` });
      } else {
        issues.push(...(await validateBadgeFile(member.slug, badgePath)));
      }
    }
  }

  if (!CHARSET_RE.test(ring.name)) {
    issues.push({ message: `ring name contains disallowed characters (HTML metacharacters, control characters, or bidi-override characters)` });
  }

  return issues;
}

async function validateBadgeFile(slug: string, badgePath: string): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];
  const buf = await readFile(badgePath);

  if (buf.byteLength > MAX_BADGE_BYTES) {
    issues.push({ message: `${slug}: badge exceeds ${MAX_BADGE_BYTES} bytes` });
  }

  let meta: sharp.Metadata;
  try {
    meta = await sharp(buf).metadata();
  } catch {
    issues.push({ message: `${slug}: badge is not a decodable image` });
    return issues;
  }

  if (meta.format !== "png" && meta.format !== "gif") {
    issues.push({ message: `${slug}: badge must be PNG or GIF, got ${meta.format}` });
  }
  if (meta.width !== BADGE_WIDTH || meta.height !== BADGE_HEIGHT) {
    issues.push({
      message: `${slug}: badge must be ${BADGE_WIDTH}x${BADGE_HEIGHT}, got ${meta.width}x${meta.height}`,
    });
  }

  return issues;
}

/** Live reachability check — network I/O, so kept separate from the pure validateRing(). */
export async function checkSitesReachable(ring: Ring): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = [];

  await Promise.all(
    ring.members.map(async (member) => {
      try {
        const res = await safeFetchText(member.url);
        if (!res.ok) {
          issues.push({ message: `${member.slug}: ${member.url} returned HTTP ${res.status}` });
        }
      } catch (err) {
        issues.push({ message: `${member.slug}: ${member.url} unreachable (${(err as Error).message})` });
      }
    }),
  );

  return issues;
}

/**
 * Soft check: does the member's homepage already link back to the hub?
 * Never fails the PR — redirects don't exist for a new member until their
 * PR merges, so this is chicken-and-egg by design. Warn only.
 */
export async function warnMissingBacklinks(ring: Ring): Promise<string[]> {
  const ringHost = new URL(ring.url).host;
  const warnings: string[] = [];

  await Promise.all(
    ring.members.map(async (member) => {
      try {
        const res = await safeFetchText(member.url);
        if (!res.ok) return;
        if (!res.text.includes(ringHost)) {
          warnings.push(`${member.slug}: homepage does not yet link back to ${ringHost}`);
        }
      } catch {
        // Reachability failures are already reported by checkSitesReachable; ignore here.
      }
    }),
  );

  return warnings;
}

async function main(): Promise<void> {
  const raw = await readFile(path.join(ROOT, "ring.json"), "utf-8");
  let ring: Ring;
  try {
    ring = JSON.parse(raw);
  } catch (err) {
    console.error(`ring.json is not valid JSON: ${(err as Error).message}`);
    process.exit(1);
  }

  const issues = await validateRing(ring);

  if (issues.length > 0) {
    console.error(`ring.json validation failed (${issues.length} issue(s)):`);
    for (const issue of issues) console.error(`  - ${issue.message}`);
    process.exit(1);
  }

  if (process.env.SKIP_NETWORK_CHECKS !== "1") {
    const networkIssues = await checkSitesReachable(ring);
    if (networkIssues.length > 0) {
      console.error(`Site reachability check failed (${networkIssues.length} issue(s)):`);
      for (const issue of networkIssues) console.error(`  - ${issue.message}`);
      process.exit(1);
    }

    const backlinkWarnings = await warnMissingBacklinks(ring);
    if (backlinkWarnings.length > 0) {
      console.warn(`Backlink check (informational — does not fail the PR):`);
      for (const w of backlinkWarnings) console.warn(`  - ${w}`);
    }
  }

  console.log(`ring.json is valid (${ring.members.length} member(s)).`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
