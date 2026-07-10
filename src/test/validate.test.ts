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
});
