import https from "node:https";
import net from "node:net";
import { lookup as dnsLookup } from "node:dns/promises";
import ipaddr from "ipaddr.js";

/**
 * SSRF guard for the live-fetch path.
 *
 * Design principles (why this is shaped the way it is):
 *  1. Safety is decided on the *resolved IP*, never the hostname string. The
 *     hostname is attacker-controlled via DNS, so string checks are meaningless.
 *  2. We use an ALLOWLIST: only normal public ("unicast") addresses are permitted.
 *     Every reserved class (loopback, private, link-local, ULA, CGNAT, multicast,
 *     reserved, 6to4, teredo, ...) is refused by default, including ranges IANA
 *     may add later.
 *  3. We PIN the connection to the exact IP we validated, so DNS cannot rebind to
 *     an internal address between our check and the actual connect (TOCTOU).
 *  4. Redirects are followed manually and every hop is re-validated.
 */

export class SsrfError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsrfError";
  }
}

/**
 * Throw unless `ip` is a normal, routable, public address.
 * IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1) is unwrapped and judged as IPv4.
 */
export function assertPublicIp(ip: string): void {
  if (net.isIP(ip) === 0) {
    throw new SsrfError(`Not a valid IP address: ${ip}`);
  }
  let addr = ipaddr.parse(ip);
  if (addr.kind() === "ipv6") {
    const v6 = addr as ipaddr.IPv6;
    if (v6.isIPv4MappedAddress()) {
      addr = v6.toIPv4Address();
    }
  }
  const range = addr.range();
  if (range !== "unicast") {
    throw new SsrfError(`Refusing to connect to ${ip} (non-public range: ${range}).`);
  }
}

export interface ResolvedTarget {
  url: URL;
  pinnedIp: string;
  family: 4 | 6;
}

/**
 * Parse + validate a single URL and resolve it to a safe, pinned IP.
 * Rejects non-https, embedded credentials, and any host that resolves to a
 * non-public address. Validates *every* A/AAAA record, not just the first.
 */
export async function validateAndResolve(input: string): Promise<ResolvedTarget> {
  let raw = input.trim();
  if (!/^https?:\/\//i.test(raw)) raw = "https://" + raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new SsrfError("Invalid URL.");
  }

  if (url.protocol !== "https:") {
    throw new SsrfError("Only https URLs are allowed.");
  }
  if (url.username || url.password) {
    throw new SsrfError("URLs with embedded credentials are not allowed.");
  }

  // Node keeps brackets on IPv6 hostnames ("[::1]"); strip them for parsing.
  const host = url.hostname.replace(/^\[|\]$/g, "");

  // Literal IP host (covers decimal/octal/hex forms, which the URL parser has
  // already normalized to dotted/colon notation): validate directly, no DNS.
  if (net.isIP(host) !== 0) {
    assertPublicIp(host);
    return { url, pinnedIp: host, family: net.isIP(host) as 4 | 6 };
  }

  let records: Array<{ address: string; family: number }>;
  try {
    records = await dnsLookup(host, { all: true });
  } catch {
    throw new SsrfError(`DNS resolution failed for ${host}.`);
  }
  if (!records.length) {
    throw new SsrfError(`No DNS records for ${host}.`);
  }
  // An attacker can return several records; one bad one is enough to refuse.
  for (const r of records) assertPublicIp(r.address);

  const pinned = records[0]!;
  return { url, pinnedIp: pinned.address, family: net.isIP(pinned.address) as 4 | 6 };
}

/** Resolve a redirect Location (which may be relative) against the current URL. */
export function resolveRedirectTarget(location: string, base: URL): string {
  return new URL(location, base).toString();
}

export interface SafeFetchOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
}

export interface SafeFetchResult {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  finalUrl: string;
}

/**
 * Perform an https request that is validated, IP-pinned, redirect-revalidated,
 * timed out, and size-capped. Drop-in replacement for the previous fetch path.
 */
export async function safeFetch(
  input: string,
  options: SafeFetchOptions = {},
): Promise<SafeFetchResult> {
  const {
    method = "GET",
    headers = {},
    body,
    timeoutMs = 8000,
    maxRedirects = 3,
    maxBytes = 5_000_000,
  } = options;

  let current = input;

  for (let hop = 0; hop <= maxRedirects; hop++) {
    const { url, pinnedIp } = await validateAndResolve(current);
    const result = await requestPinned(url, pinnedIp, {
      method,
      headers,
      body,
      timeoutMs,
      maxBytes,
    });

    const isRedirect = result.status >= 300 && result.status < 400;
    const location = result.headers["location"];
    if (isRedirect && location) {
      if (hop === maxRedirects) {
        throw new SsrfError("Too many redirects.");
      }
      // Re-validate the next hop on the next loop iteration.
      current = resolveRedirectTarget(location, url);
      continue;
    }
    return { ...result, finalUrl: url.toString() };
  }

  throw new SsrfError("Too many redirects.");
}

function requestPinned(
  url: URL,
  pinnedIp: string,
  opts: { method: string; headers: Record<string, string>; body?: string; timeoutMs: number; maxBytes: number },
): Promise<Omit<SafeFetchResult, "finalUrl">> {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        // The pin: connect straight to the IP we already validated and never
        // resolve again, so DNS cannot rebind to an internal address. SNI and
        // certificate validation still use the real hostname (servername), and
        // the Host header lets virtual-hosted servers route the request.
        host: pinnedIp,
        servername: url.hostname,
        port: url.port ? Number(url.port) : 443,
        path: url.pathname + url.search,
        method: opts.method,
        headers: { "User-Agent": "Linejump-Scanner", ...opts.headers, Host: url.host },
        // No auto-follow; safeFetch re-validates every redirect hop itself.
      },
      (res) => {
        const chunks: Buffer[] = [];
        let total = 0;
        res.on("data", (c: Buffer) => {
          total += c.length;
          if (total > opts.maxBytes) {
            req.destroy(new SsrfError("Response exceeded size limit."));
            return;
          }
          chunks.push(c);
        });
        res.on("end", () => {
          const headers: Record<string, string> = {};
          for (const [k, v] of Object.entries(res.headers)) {
            headers[k.toLowerCase()] = Array.isArray(v) ? v.join(", ") : (v ?? "");
          }
          resolve({
            status: res.statusCode ?? 0,
            statusText: res.statusMessage ?? "",
            headers,
            body: Buffer.concat(chunks).toString("utf8"),
          });
        });
      },
    );

    req.setTimeout(opts.timeoutMs, () => req.destroy(new SsrfError("Request timed out.")));
    req.on("error", (e) => reject(e instanceof SsrfError ? e : new SsrfError(e.message)));
    if (opts.body) req.write(opts.body);
    req.end();
  });
}
