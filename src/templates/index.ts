import { escapeHtml } from "../escape.js";
import type { Member, Ring } from "../types.js";
import { renderLayout } from "./layout.js";
import { renderSnippet } from "./snippet.js";

function renderMember(member: Member, ring: Ring, badgeSrc: string): string {
  const name = escapeHtml(member.name);
  const url = escapeHtml(member.url);
  const owner = escapeHtml(member.owner);
  const tag = escapeHtml(member.tag);
  const joined = escapeHtml(member.joined);
  const snippet = renderSnippet(ring.url, ring.name, member.slug);

  return `<li class="member">
  <img class="badge" src="${escapeHtml(badgeSrc)}" alt="${name} badge" width="88" height="31" loading="lazy">
  <div>
    <div class="member-name"><a href="${url}">${name}</a></div>
    <p class="member-meta">patron tag: <code class="tag blink">&lt;${tag}&gt;</code> &middot; owner: ${owner} &middot; joined: ${joined}</p>
    <details class="snippet">
      <summary>copy this member's ring snippet</summary>
      <pre><code>${escapeHtml(snippet)}</code></pre>
    </details>
  </div>
</li>`;
}

export function renderIndex(
  ring: Ring,
  badgeSrcFor: (member: Member) => string,
  unclaimedTags: string[],
): string {
  const name = escapeHtml(ring.name);
  const members = ring.members.map((m) => renderMember(m, ring, badgeSrcFor(m))).join("\n");
  const unclaimed = unclaimedTags
    .map((t) => `<li><code>&lt;${escapeHtml(t)}&gt;</code></li>`)
    .join("\n");

  const body = `<h1 class="blink">${name}</h1>
<p class="subtitle">a webring for personal sites, in loving memory of &lt;blink&gt;</p>

<p>
  Once upon a time the web was full of tags that made things move, glow,
  and scroll sideways for no reason. Browsers killed them off one by one —
  not because they were dangerous, but because they were <em>too much fun</em>.
  This is a webring for people with personal sites who still believe a
  little too much fun is exactly the right amount. Each member adopts a
  patron tag from the departed and wears it like a badge of honor.
</p>

<img class="hub-badge" src="/badges/dhts.png" width="88" height="31" alt="${name} badge — a tombstone reading &lt;/blink&gt;">

<hr>

<h2>Directory</h2>
<ul class="directory">
${members}
</ul>

<hr>

<h2>How to join</h2>
<p>
  Fork this repo, add yourself to <code>ring.json</code>, pick an unclaimed
  patron tag, and open a pull request. See
  <a href="https://github.com/technicalpickles/webring/blob/main/JOINING.md">JOINING.md</a>
  for the full rules.
</p>

<h3>Unclaimed dead tags</h3>
<p>These are still up for adoption:</p>
<ul class="tags-unclaimed">
${unclaimed || "<li>all tags claimed — duplicates now allowed</li>"}
</ul>

<footer>
  <p><a href="/random/">random site</a> &middot; <a href="https://github.com/technicalpickles/webring">source</a></p>
</footer>`;

  return renderLayout(
    `${ring.name}`,
    "A webring for personal sites, in loving memory of <blink>.",
    body,
  );
}
