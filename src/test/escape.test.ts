import { describe, expect, it } from "vitest";
import { escapeHtml, jsonForScript } from "../escape.js";

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

describe("jsonForScript", () => {
  it("prevents </script> breakout", () => {
    const out = jsonForScript({ name: "</script><script>alert(1)</script>" });
    expect(out).not.toContain("</script>");
    expect(out).toContain("\\u003c/script\\u003e");
  });

  it("escapes U+2028 and U+2029 line/paragraph separators", () => {
    const lineSep = String.fromCharCode(0x2028);
    const paraSep = String.fromCharCode(0x2029);
    const out = jsonForScript({ name: `before${lineSep}after${paraSep}end` });
    expect(out).not.toContain(lineSep);
    expect(out).not.toContain(paraSep);
    expect(out).toContain("\\u2028");
    expect(out).toContain("\\u2029");
  });

  it("escapes a bare & so entity-decoding contexts can't reinterpret it", () => {
    const out = jsonForScript({ name: "Tom & Jerry" });
    expect(out).not.toContain("&");
    expect(out).toContain("\\u0026");
  });

  it("round-trips ordinary data unchanged in meaning", () => {
    const out = jsonForScript({ slug: "pickles", url: "https://pickles.dev" });
    expect(JSON.parse(out)).toEqual({ slug: "pickles", url: "https://pickles.dev" });
  });
});
