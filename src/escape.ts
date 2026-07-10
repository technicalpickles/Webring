const ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/** The one HTML-escape helper. Every member-provided string must pass through this before being written into a template. */
export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char]!);
}
