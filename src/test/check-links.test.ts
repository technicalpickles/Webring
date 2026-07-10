import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { listDeadLinkIssues } from "../check-links.js";

function issue(n: number, slug: string, state: "open" | "closed" = "closed") {
  return { number: n, title: `Dead link: ${slug}`, state, body: null };
}

describe("listDeadLinkIssues pagination", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.GITHUB_REPOSITORY = "technicalpickles/webring";
    process.env.GITHUB_TOKEN = "test-token";
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.GITHUB_REPOSITORY;
    delete process.env.GITHUB_TOKEN;
  });

  it("stops after a page with fewer than 100 results", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: string) => {
      calls.push(url);
      return {
        ok: true,
        json: async () => [issue(1, "a"), issue(2, "b")],
      } as Response;
    }) as unknown as typeof fetch;

    const issues = await listDeadLinkIssues();
    expect(issues).toHaveLength(2);
    expect(calls).toHaveLength(1);
  });

  it("follows a second page when the first page is exactly full (the pagination bug this guards against)", async () => {
    const calls: string[] = [];
    global.fetch = vi.fn(async (url: string) => {
      calls.push(url);
      const page = new URL(url).searchParams.get("page");
      if (page === "1") {
        return {
          ok: true,
          json: async () => Array.from({ length: 100 }, (_, i) => issue(i + 1, `member-${i}`)),
        } as Response;
      }
      return {
        ok: true,
        json: async () => [issue(101, "the-101st-member")],
      } as Response;
    }) as unknown as typeof fetch;

    const issues = await listDeadLinkIssues();
    expect(issues).toHaveLength(101);
    expect(issues.some((i) => i.title === "Dead link: the-101st-member")).toBe(true);
    expect(calls).toHaveLength(2);
  });
});
