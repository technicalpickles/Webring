import { escapeHtml, jsonForScript } from "../escape.js";
import type { Ring } from "../types.js";
import { renderLayout } from "./layout.js";

/**
 * The one JS in the whole project. Runs only on the hub, never on member
 * sites. `?from=` only ever filters the candidate list — it is never used
 * as a redirect target, so there is no open-redirect surface.
 */
export function renderRandom(ring: Ring): string {
  const memberData = jsonForScript(
    ring.members.map((m) => ({ slug: m.slug, url: m.url, name: m.name })),
  );

  const list = ring.members
    .map((m) => `<li><a href="${escapeHtml(m.url)}">${escapeHtml(m.name)}</a></li>`)
    .join("\n");

  const body = `<h1>Random site</h1>
<p><a href="/">&larr; back to the directory</a></p>
<noscript>
  <p>JavaScript is off, so here's the full list instead:</p>
  <ul class="random-list">
${list}
  </ul>
</noscript>
<script>
  var members = ${memberData};
  var from = new URLSearchParams(location.search).get("from");
  var pool = members.filter(function (m) { return m.slug !== from; });
  if (pool.length === 0) pool = members;
  if (pool.length > 0) location.replace(pool[Math.floor(Math.random() * pool.length)].url);
</script>`;

  return renderLayout(
    "Random site — " + ring.name,
    "Hop to a random member of the ring.",
    body,
  );
}
