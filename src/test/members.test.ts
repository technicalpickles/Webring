import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadMembers } from "../members.js";

let dir: string | undefined;

afterEach(async () => {
  if (dir) await rm(dir, { recursive: true, force: true });
  dir = undefined;
});

async function writeMember(name: string, contents: string): Promise<void> {
  dir ??= await mkdtemp(path.join(tmpdir(), "members-test-"));
  await writeFile(path.join(dir, name), contents, "utf-8");
}

describe("loadMembers", () => {
  it("returns an empty ring for a directory that doesn't exist", async () => {
    const result = await loadMembers(path.join(tmpdir(), "does-not-exist-" + Math.random()));
    expect(result).toEqual({ members: [], issues: [] });
  });

  it("loads one member per file, sorted by joined date then slug", async () => {
    await writeMember(
      "pickles.json",
      JSON.stringify({ slug: "pickles", name: "pickles.dev", url: "https://pickles.dev", owner: "technicalpickles", tag: "blink", joined: "2026-07-09" }),
    );
    await writeMember(
      "noizwaves.json",
      JSON.stringify({ slug: "noizwaves", name: "noizwaves.com", url: "https://noizwaves.com", owner: "noizwaves", tag: "marquee", joined: "2026-07-09" }),
    );

    const result = await loadMembers(dir);
    expect(result.issues).toEqual([]);
    expect(result.members.map((m) => m.slug)).toEqual(["noizwaves", "pickles"]);
  });

  it("ignores non-.json files in the directory", async () => {
    await writeMember("pickles.json", JSON.stringify({ slug: "pickles", name: "p", url: "https://p.example", owner: "p", tag: "blink", joined: "2026-01-01" }));
    await writeMember("README.md", "not a member file");

    const result = await loadMembers(dir);
    expect(result.issues).toEqual([]);
    expect(result.members).toHaveLength(1);
  });

  it("reports an issue for a file that isn't valid JSON", async () => {
    await writeMember("broken.json", "{ not json");

    const result = await loadMembers(dir);
    expect(result.members).toEqual([]);
    expect(result.issues.some((i) => i.message.includes("not valid JSON"))).toBe(true);
  });

  it("reports an issue when the slug field doesn't match the filename", async () => {
    await writeMember("pickles.json", JSON.stringify({ slug: "someone-else", name: "p", url: "https://p.example", owner: "p", tag: "blink", joined: "2026-01-01" }));

    const result = await loadMembers(dir);
    expect(result.members).toEqual([]);
    expect(result.issues.some((i) => i.message.includes("must match the filename"))).toBe(true);
  });

  it("loads the repo's real members/ directory with no issues", async () => {
    const result = await loadMembers();
    expect(result.issues).toEqual([]);
    expect(result.members.length).toBeGreaterThan(0);
    for (const m of result.members) {
      expect(typeof m.slug).toBe("string");
    }
  });
});
