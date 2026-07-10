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

const LINE_SEPARATOR = String.fromCharCode(0x2028);
const PARAGRAPH_SEPARATOR = String.fromCharCode(0x2029);

const SCRIPT_ESCAPE_MAP: Record<string, string> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  [LINE_SEPARATOR]: "\\u2028",
  [PARAGRAPH_SEPARATOR]: "\\u2029",
};

const SCRIPT_ESCAPE_RE = new RegExp(`[<>&${LINE_SEPARATOR}${PARAGRAPH_SEPARATOR}]`, "g");

/**
 * Safely embed a JSON-serializable value inside an inline `<script>` block.
 * A different context than escapeHtml: `<`/`>`/`&` are escaped so member
 * data can't break out of the surrounding `<script>` tag (e.g. a `name` of
 * `</script><script>...`), and U+2028/U+2029 are escaped for engines that
 * predate their ES2019 string-literal exemption.
 */
export function jsonForScript(value: unknown): string {
  return JSON.stringify(value).replace(SCRIPT_ESCAPE_RE, (char) => SCRIPT_ESCAPE_MAP[char]!);
}
