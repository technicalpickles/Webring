import { describe, expect, it } from "vitest";
import { neighbors } from "../ring-order.js";
import type { Member } from "../types.js";

function member(slug: string): Member {
  return {
    slug,
    name: slug,
    url: `https://${slug}.example`,
    owner: slug,
    tag: "blink",
    joined: "2026-01-01",
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
    const members = ["a", "b", "c", "d"].map(member);
    const result = neighbors(members);
    expect(result.map((r) => r.member.slug)).toEqual(["a", "b", "c", "d"]);
  });
});
