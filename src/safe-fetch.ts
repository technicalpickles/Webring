import dns from "node:dns/promises";
import net from "node:net";

const MAX_REDIRECTS = 5;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024; // 2 MB
const DEFAULT_TIMEOUT_MS = 10_000;

/**
 * Blocks loopback, link-local (incl. the 169.254.169.254 cloud metadata
 * address), private, CGNAT, and multicast/reserved ranges. Member URLs are
 * attacker-controlled data (any stranger's PR can set one), so every fetch
 * of one — reachability checks, the backlink check, the weekly link
 * checker — must refuse to let a CI runner touch internal infrastructure,
 * including via an https redirect chain that only resolves to a private IP
 * after the initial hop.
 */
export function isDisallowedIp(ip: string): boolean {
  const type = net.isIP(ip);
  if (type === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === undefined || b === undefined) return true;
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT, RFC 6598
    if (a >= 224) return true; // multicast + reserved
    return false;
  }
  if (type === 6) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
      return true; // fe80::/10 link-local
    }
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // fc00::/7 unique local
    const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped) return isDisallowedIp(mapped[1]!);
    return false;
  }
  return true; // unresolvable / unknown family -> block
}

async function assertHostAllowed(hostname: string): Promise<void> {
  const records = await dns.lookup(hostname, { all: true, verbatim: true });
  if (records.length === 0) {
    throw new Error(`could not resolve ${hostname}`);
  }
  for (const record of records) {
    if (isDisallowedIp(record.address)) {
      throw new Error(`${hostname} resolves to a disallowed address (${record.address})`);
    }
  }
}

export interface SafeFetchResult {
  status: number;
  ok: boolean;
  text: string;
}

/**
 * https-only fetch with manual redirect handling (each hop is re-checked
 * against the private-IP blocklist before it's followed), a redirect cap,
 * and a response-size cap. Never a raw fetch(url, { redirect: "follow" })
 * on attacker-controlled data.
 */
export async function safeFetchText(url: string, timeoutMs = DEFAULT_TIMEOUT_MS): Promise<SafeFetchResult> {
  let currentUrl = url;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const parsed = new URL(currentUrl);
    if (parsed.protocol !== "https:") {
      throw new Error(`refusing non-https URL: ${currentUrl}`);
    }
    await assertHostAllowed(parsed.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(currentUrl, { redirect: "manual", signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new Error(`redirect from ${currentUrl} had no Location header`);
      }
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }

    const text = await readCappedText(res);
    return { status: res.status, ok: res.ok, text };
  }

  throw new Error(`too many redirects starting at ${url}`);
}

async function readCappedText(res: Response): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error(`response exceeded ${MAX_RESPONSE_BYTES} bytes`);
    }
    chunks.push(value);
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString("utf-8");
}
