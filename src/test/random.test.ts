import { describe, expect, it } from "vitest";
import { renderRandom } from "../templates/random.js";
import type { Ring } from "../types.js";

const ring: Ring = {
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

describe("renderRandom", () => {
  it("embeds member data only as a JSON literal, never as a redirect built from user input", () => {
    const html = renderRandom(ring);
    expect(html).toContain('new URLSearchParams(location.search).get("from")');
    expect(html).not.toMatch(/location\.(replace|href)\s*=\s*from/);
  });

  it("provides a noscript fallback listing every member", () => {
    const html = renderRandom(ring);
    expect(html).toContain("<noscript>");
    expect(html).toContain("https://pickles.dev");
    expect(html).toContain("https://noizwaves.com");
  });

  it("escapes '</script' sequences that could appear in embedded data", () => {
    const evil: Ring = {
      ...ring,
      members: [
        { ...ring.members[0]!, name: "</script><script>alert(1)</script>" },
      ],
    };
    const html = renderRandom(evil);
    expect(html).not.toContain("</script><script>alert(1)</script>");
  });

  it("escapes U+2028/U+2029 within the inline <script> block (harmless elsewhere, e.g. the noscript text list)", () => {
    const lineSep = String.fromCharCode(0x2028);
    const weird: Ring = {
      ...ring,
      members: [{ ...ring.members[0]!, name: `pickles${lineSep}dev` }],
    };
    const html = renderRandom(weird);
    const scriptBlock = html.slice(html.indexOf("<script>"), html.indexOf("</script>"));
    expect(scriptBlock).not.toContain(lineSep);
    expect(scriptBlock).toContain("\\u2028");
  });
});
