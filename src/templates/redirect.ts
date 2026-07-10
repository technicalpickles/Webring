import { escapeHtml } from "../escape.js";

/**
 * Meta-refresh redirect stub. Works without JS, has a visible-link fallback,
 * and is kept out of search indexes. Redirect target is always a
 * schema-validated https:// member URL from merged ring.json — never
 * user-controlled at request time.
 */
export function renderRedirect(targetUrl: string, targetName: string): string {
  const url = escapeHtml(targetUrl);
  const name = escapeHtml(targetName);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="robots" content="noindex">
<meta http-equiv="refresh" content="0; url=${url}">
<link rel="canonical" href="${url}">
<title>Redirecting to ${name}…</title>
</head>
<body>
<p>Next stop: <a href="${url}">${name}</a></p>
</body>
</html>
`;
}
