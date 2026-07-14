import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { Member } from "./types.js";
import { sortMembers } from "./ring-order.js";

const ROOT = path.resolve(import.meta.dirname, "..");
export const MEMBERS_DIR = path.join(ROOT, "members");

export interface MemberFileIssue {
  message: string;
}

export interface LoadedMembers {
  members: Member[];
  issues: MemberFileIssue[];
}

/**
 * Loads every members/{slug}.json file. One member per file is what makes
 * concurrent join PRs stop conflicting with each other — each PR only adds
 * a new file, never edits a line another PR also touched.
 */
export async function loadMembers(dir: string = MEMBERS_DIR): Promise<LoadedMembers> {
  const issues: MemberFileIssue[] = [];

  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return { members: [], issues };
    throw err;
  }

  const files = entries.filter((f) => f.endsWith(".json")).sort();
  const members: Member[] = [];

  for (const file of files) {
    const raw = await readFile(path.join(dir, file), "utf-8");

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      issues.push({ message: `members/${file} is not valid JSON: ${(err as Error).message}` });
      continue;
    }

    const expectedSlug = file.slice(0, -".json".length);
    const slug = (parsed as { slug?: unknown }).slug;
    if (slug !== expectedSlug) {
      issues.push({
        message: `members/${file}: "slug" field is ${JSON.stringify(slug)}, must match the filename ("${expectedSlug}")`,
      });
      continue;
    }

    members.push(parsed as Member);
  }

  return { members: sortMembers(members), issues };
}
