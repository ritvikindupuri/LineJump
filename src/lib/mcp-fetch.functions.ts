import { createServerFn } from "@tanstack/react-start";
import { checkRateLimit } from "./rate-limit";

export type FetchSource = "json" | "tools/list";

export interface FetchManifestResult {
  source: FetchSource;
  url: string;
  raw: string;
}

function validateUrl(input: string): URL {
  let u: URL;
  try {
    u = new URL(input);
  } catch {
    throw new Error("Invalid URL.");
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") {
    throw new Error("Only http(s) URLs are allowed.");
  }
  // Basic SSRF guards: block obvious internal hosts.
  const host = u.hostname.toLowerCase();
  const blocked = [
    "localhost",
    "0.0.0.0",
    "127.0.0.1",
    "::1",
    "metadata.google.internal",
  ];
  if (blocked.includes(host)) throw new Error("Host is not allowed.");
  if (
    host.endsWith(".local") ||
    host.startsWith("169.254.") ||
    host.startsWith("10.") ||
    host.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  ) {
    throw new Error("Private network hosts are not allowed.");
  }
  return u;
}

async function fetchWithTimeout(url: string, init: RequestInit, ms = 8000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(t);
  }
}

export const fetchMcpManifest = createServerFn({ method: "POST" })
  .validator((d: { url: string }) => {
    if (!d || typeof d.url !== "string") throw new Error("url required");
    return { url: d.url.trim() };
  })
  .handler(async ({ data }): Promise<FetchManifestResult> => {
    checkRateLimit("fetch-manifest", 30, 60000);
    const u = validateUrl(data.url);
    const url = u.toString();

    // 1) Try a plain GET — works for static manifests, .well-known/mcp,
    //    registry entries, GitHub raw files, etc.
    try {
      const res = await fetchWithTimeout(url, {
        method: "GET",
        headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.5" },
      });
      if (res.ok) {
        const text = await res.text();
        const trimmed = text.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          // Looks like JSON — let the scanner parse and validate it.
          return { source: "json", url, raw: text };
        }
      }
    } catch {
      // fall through to JSON-RPC
    }

    // 2) MCP Streamable HTTP: POST tools/list and synthesize a manifest.
    const rpcBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    const rpc = await fetchWithTimeout(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // MCP servers using the official SDK require both content types.
        Accept: "application/json, text/event-stream",
      },
      body: rpcBody,
    });
    if (!rpc.ok) {
      throw new Error(`Server returned ${rpc.status} ${rpc.statusText}.`);
    }
    const ct = rpc.headers.get("content-type") ?? "";
    const text = await rpc.text();

    let parsed: unknown;
    if (ct.includes("text/event-stream")) {
      // Pick the first `data:` line that parses as JSON.
      const dataLines = text
        .split(/\r?\n/)
        .filter((l) => l.startsWith("data:"))
        .map((l) => l.slice(5).trim());
      for (const line of dataLines) {
        try {
          parsed = JSON.parse(line);
          break;
        } catch {
          /* keep looking */
        }
      }
      if (parsed === undefined) {
        throw new Error("Could not parse SSE response from MCP server.");
      }
    } else {
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("Response was not JSON or MCP SSE.");
      }
    }

    const obj = parsed as {
      result?: { tools?: unknown[] };
      error?: { message?: string };
    };
    if (obj.error) {
      throw new Error(obj.error.message || "MCP server returned an error.");
    }
    const tools = obj.result?.tools ?? [];
    const manifest = {
      name: u.host,
      transport: "http",
      url,
      tools,
    };
    return {
      source: "tools/list",
      url,
      raw: JSON.stringify(manifest, null, 2),
    };
  });