/**
 * Non-maintainer PRs may only touch ring.json and files under badges/.
 * Everything else (src/, .github/, schema, dead-tags.json, ...) requires
 * a maintainer, enforced by this check plus CODEOWNERS + branch protection.
 */
const ALLOWED_PATHS = ["ring.json"];
const ALLOWED_PREFIXES = ["badges/"];

export function isAllowedChange(filePath: string): boolean {
  if (ALLOWED_PATHS.includes(filePath)) return true;
  return ALLOWED_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

export interface AllowlistResult {
  allowed: boolean;
  disallowedFiles: string[];
}

export function checkChangedFiles(files: string[]): AllowlistResult {
  const disallowedFiles = files.filter((f) => !isAllowedChange(f));
  return { allowed: disallowedFiles.length === 0, disallowedFiles };
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const files = Buffer.concat(chunks)
    .toString("utf-8")
    .split("\n")
    .map((f) => f.trim())
    .filter(Boolean);

  const result = checkChangedFiles(files);
  if (!result.allowed) {
    console.error("This PR modifies files outside the ring.json + badges/ allowlist:");
    for (const f of result.disallowedFiles) console.error(`  - ${f}`);
    console.error("Only a maintainer can merge changes outside that allowlist.");
    process.exit(1);
  }
  console.log(`All ${files.length} changed file(s) are within the allowlist.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}
