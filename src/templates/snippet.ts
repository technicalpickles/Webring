import { escapeHtml } from "../escape.js";

/** The member integration snippet: four plain <a> tags, no JS. */
export function renderSnippet(hubUrl: string, ringName: string, slug: string): string {
  const hub = escapeHtml(hubUrl);
  const name = escapeHtml(ringName);
  const s = escapeHtml(slug);
  return `<p class="dhts">
  <a href="${hub}/${s}/prev/" aria-label="previous site in the ${name}">←</a>
  <a href="${hub}/">${name}</a>
  <a href="${hub}/random/?from=${s}" aria-label="random site in the ring">\u{1F3B2}</a>
  <a href="${hub}/${s}/next/" aria-label="next site in the ${name}">→</a>
</p>`;
}
