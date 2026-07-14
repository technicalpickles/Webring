import { describe, expect, it } from "vitest";
import { neighbors, sortMembers } from "../ring-order.js";
import type { Member } from "../types.js";

function member(slug: string, joined = "2026-01-01"): Member {
  return {
    slug,
    name: slug,
    url: `https://${slug}.example`,
    owner: slug,
    tag: "blink",
    joined,
  };
}

describe("neighbors", () => {
  it("wraps around for two members (each is the other's prev and next)", () => {
    const [a, b] = [member("a"), member("b")];
    const result = neighbors([a, b]);

    expect(result[0]!.prev.slug).toBe("b");
    expect(result[0]!.next.slug).toBe("b");
    expect(result[1]!.prev.slug).toBe("a");
    expect(result[1]!.next.slug).toBe("a");
  });

  it("wraps around for three or more members", () => {
    const [a, b, c] = [member("a"), member("b"), member("c")];
    const result = neighbors([a, b, c]);

    expect(result[0]!.prev.slug).toBe("c");
    expect(result[0]!.next.slug).toBe("b");
    expect(result[1]!.prev.slug).toBe("a");
    expect(result[1]!.next.slug).toBe("c");
    expect(result[2]!.prev.slug).toBe("b");
    expect(result[2]!.next.slug).toBe("a");
  });

  it("a single member is its own prev and next", () => {
    const a = member("a");
    const result = neighbors([a]);

    expect(result[0]!.prev.slug).toBe("a");
    expect(result[0]!.next.slug).toBe("a");
  });

  it("preserves array order as ring order", () => {
    const members = ["a", "b", "c", "d"].map((s) => member(s));
    const result = neighbors(members);
    expect(result.map((r) => r.member.slug)).toEqual(["a", "b", "c", "d"]);
  });
});

describe("sortMembers", () => {
  it("sorts by joined date ascending", () => {
    const members = [member("c", "2026-01-03"), member("a", "2026-01-01"), member("b", "2026-01-02")];
    expect(sortMembers(members).map((m) => m.slug)).toEqual(["a", "b", "c"]);
  });

  it("breaks same-day ties by slug ascending", () => {
    const members = [member("pickles", "2026-07-09"), member("noizwaves", "2026-07-09")];
    expect(sortMembers(members).map((m) => m.slug)).toEqual(["noizwaves", "pickles"]);
  });

  it("does not mutate the input array", () => {
    const members = [member("b", "2026-01-02"), member("a", "2026-01-01")];
    const original = [...members];
    sortMembers(members);
    expect(members).toEqual(original);
  });
});
