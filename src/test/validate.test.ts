import { describe, expect, it } from "vitest";
import { validateRing } from "../validate.js";
import type { Ring } from "../types.js";

function baseRing(): Ring {
  return {
    name: "Dead HTML Tag Society",
    url: "https://ring.pickles.dev",
    members: [
      {
        slug: "pickles",
        name: "pickles.dev",
        url: "https://pickles.dev",
        owner: "technicalpickles",
        tag: "blink",
        joined: "2026-07-09",
      },
      {
        slug: "noizwaves",
        name: "noizwaves.com",
        url: "https://noizwaves.com",
        owner: "noizwaves",
        tag: "marquee",
        joined: "2026-07-09",
      },
    ],
  };
}

describe("validateRing", () => {
  it("accepts a valid ring", async () => {
    const issues = await validateRing(baseRing());
    expect(issues).toEqual([]);
  });

  it("rejects an invalid slug", async () => {
    const ring = baseRing();
    ring.members[0]!.slug = "Not Valid!";
    const issues = await validateRing(ring);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects an http:// member url", async () => {
    const ring = baseRing();
    ring.members[0]!.url = "http://pickles.dev";
    const issues = await validateRing(ring);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects an unknown patron tag", async () => {
    const ring = baseRing();
    ring.members[0]!.tag = "div";
    const issues = await validateRing(ring);
    expect(issues.some((i) => i.message.includes("unknown patron tag"))).toBe(true);
  });

  it("rejects a duplicate slug", async () => {
    const ring = baseRing();
    ring.members[1]!.slug = "pickles";
    const issues = await validateRing(ring);
    expect(issues.some((i) => i.message.includes("duplicate slug"))).toBe(true);
  });

  it("rejects a duplicate patron tag while unclaimed tags remain", async () => {
    const ring = baseRing();
    ring.members[1]!.tag = "blink";
    const issues = await validateRing(ring);
    expect(issues.some((i) => i.message.includes("duplicate patron tag"))).toBe(true);
  });

  it("rejects a name containing disallowed characters", async () => {
    const ring = baseRing();
    ring.members[0]!.name = `<script>evil</script>`;
    const issues = await validateRing(ring);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects unknown fields via additionalProperties", async () => {
    const ring = baseRing() as Ring & { members: Array<Record<string, unknown>> };
    ring.members[0]!.extra = "not allowed";
    const issues = await validateRing(ring as unknown as Ring);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("rejects a future joined date (would permanently exempt the member from the link checker)", async () => {
    const ring = baseRing();
    ring.members[0]!.joined = "2099-01-01";
    const issues = await validateRing(ring);
    expect(issues.some((i) => i.message.includes("is in the future"))).toBe(true);
  });

  it("accepts a joined date of today", async () => {
    const ring = baseRing();
    const today = new Date().toISOString().slice(0, 10);
    ring.members[0]!.joined = today;
    const issues = await validateRing(ring);
    expect(issues).toEqual([]);
  });

  it("rejects control characters (e.g. a tab or NUL) in name/owner", async () => {
    const tab = String.fromCharCode(0x09);
    const nul = String.fromCharCode(0x00);

    const withTab = baseRing();
    withTab.members[0]!.name = `pickles${tab}dev`;
    expect((await validateRing(withTab)).length).toBeGreaterThan(0);

    const withNul = baseRing();
    withNul.members[0]!.owner = `technical${nul}pickles`;
    expect((await validateRing(withNul)).length).toBeGreaterThan(0);
  });

  it("rejects a bidi right-to-left override in name (visual spoofing)", async () => {
    const rlo = String.fromCharCode(0x202e);
    const ring = baseRing();
    ring.members[0]!.name = `evil${rlo}reversed`;
    const issues = await validateRing(ring);
    expect(issues.length).toBeGreaterThan(0);
  });

  it("still accepts legitimate accented / non-Latin names", async () => {
    const ring = baseRing();
    ring.members[0]!.name = "José García";
    ring.members[1]!.owner = "田中";
    const issues = await validateRing(ring);
    expect(issues).toEqual([]);
  });
});
