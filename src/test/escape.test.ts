import { describe, expect, it } from "vitest";
import { escapeHtml } from "../escape.js";

describe("escapeHtml", () => {
  it("escapes all five special characters", () => {
    expect(escapeHtml(`<script>alert("x") & 'y'</script>`)).toBe(
      "&lt;script&gt;alert(&quot;x&quot;) &amp; &#39;y&#39;&lt;/script&gt;",
    );
  });

  it("leaves plain text untouched", () => {
    expect(escapeHtml("pickles.dev")).toBe("pickles.dev");
  });

  it("neutralizes an attribute-breakout attempt", () => {
    const input = `"><img src=x onerror=alert(1)>`;
    const escaped = escapeHtml(input);
    expect(escaped).not.toContain("<img");
    expect(escaped).not.toContain('"');
  });

  it("handles empty string", () => {
    expect(escapeHtml("")).toBe("");
  });
});
