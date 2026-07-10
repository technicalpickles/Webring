import { escapeHtml } from "../escape.js";

export function renderLayout(title: string, description: string, bodyHtml: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}">
<link rel="stylesheet" href="/style.css">
</head>
<body>
<main>
${bodyHtml}
</main>
</body>
</html>
`;
}
