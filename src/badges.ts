import { escapeHtml } from "./escape.js";

const WIDTH = 88;
const HEIGHT = 31;

/** Build-time-generated default badge for members who didn't supply one. First-party, so SVG is fine here. */
export function renderDefaultMemberBadgeSvg(name: string): string {
  const label = escapeHtml(truncate(name, 16));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="#6b6b6b"/>
<rect x="0.5" y="0.5" width="${WIDTH - 1}" height="${HEIGHT - 1}" fill="none" stroke="#3a3a3a"/>
<text x="${WIDTH / 2}" y="14" font-family="Georgia, serif" font-size="9" fill="#d8d8d8" text-anchor="middle">DHTS</text>
<text x="${WIDTH / 2}" y="25" font-family="Courier New, monospace" font-size="8" fill="#7fffd4" text-anchor="middle">${label}</text>
</svg>
`;
}

/** The Society's own badge: `</blink>` on a tombstone. */
export function renderHubBadgeSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
<rect width="${WIDTH}" height="${HEIGHT}" fill="#1a1a1a"/>
<path d="M20 30 L20 10 A24 24 0 0 1 68 10 L68 30 Z" fill="#6b6b6b" stroke="#3a3a3a"/>
<text x="${WIDTH / 2}" y="20" font-family="Courier New, monospace" font-size="9" fill="#7fffd4" text-anchor="middle">&lt;/blink&gt;</text>
<text x="${WIDTH / 2}" y="29" font-family="Georgia, serif" font-size="6" fill="#d8d8d8" text-anchor="middle">R.I.P. 1996-2013</text>
</svg>
`;
}

function truncate(value: string, max: number): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}
