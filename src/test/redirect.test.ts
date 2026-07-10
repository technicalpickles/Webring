import { describe, expect, it } from "vitest";
import { renderRedirect } from "../templates/redirect.js";

describe("renderRedirect", () => {
  it("includes a meta-refresh, canonical link, noindex, and visible fallback link", () => {
    const html = renderRedirect("https://noizwaves.com", "noizwaves.com");
    expect(html).toContain('<meta name="robots" content="noindex">');
    expect(html).toContain('<meta http-equiv="refresh" content="0; url=https://noizwaves.com">');
    expect(html).toContain('<link rel="canonical" href="https://noizwaves.com">');
    expect(html).toContain('<a href="https://noizwaves.com">noizwaves.com</a>');
  });

  it("escapes a malicious member name", () => {
    const html = renderRedirect("https://evil.example", `<script>alert(1)</script>`);
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
