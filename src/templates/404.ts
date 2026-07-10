import { escapeHtml } from "../escape.js";
import { renderLayout } from "./layout.js";

export function render404(ringName: string): string {
  const body = `<h1>404</h1>
<p>This page doesn't exist — maybe it went the way of &lt;marquee&gt;.</p>
<p><a href="/">&larr; back to the ${escapeHtml(ringName)} directory</a></p>`;

  return renderLayout("404 — Not Found", "Page not found.", body);
}
