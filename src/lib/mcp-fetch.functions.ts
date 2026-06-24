import { createServerFn } from "@tanstack/react-start";
import { safeFetch, SsrfError } from "./ssrf-guard";

export type FetchSource = "json" | "tools/list";

export interface FetchManifestResult {
  source: FetchSource;
  url: string;
  raw: string;
}

export const fetchMcpManifest = createServerFn({ method: "POST" })
  .inputValidator((d: { url: string }) => {
    if (!d || typeof d.url !== "string") throw new Error("url required");
    return { url: d.url.trim() };
  })
  .handler(async ({ data }): Promise<FetchManifestResult> => {
    // 1) Try a plain GET — works for static manifests, .well-known/mcp,
    //    registry entries, GitHub raw files, etc. safeFetch validates the
    //    target, pins the connection IP, and re-checks every redirect hop.
    try {
      const res = await safeFetch(data.url, {
        method: "GET",
        headers: { Accept: "application/json, text/plain;q=0.9, */*;q=0.5" },
      });
      if (res.status >= 200 && res.status < 300) {
        const trimmed = res.body.trim();
        if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
          // Looks like JSON — let the scanner parse and validate it.
          return { source: "json", url: res.finalUrl, raw: res.body };
        }
      }
    } catch (e) {
      // An unsafe target must abort the whole request — never fall through.
      if (e instanceof SsrfError) throw e;
      // Other GET failures (404, non-JSON, connection reset) fall through to RPC.
    }

    // 2) MCP Streamable HTTP: POST tools/list and synthesize a manifest.
    const rpcBody = JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "tools/list",
      params: {},
    });
    const rpc = await safeFetch(data.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // MCP servers using the official SDK require both content types.
        Accept: "application/json, text/event-stream",
      },
      body: rpcBody,
    });
    if (rpc.status < 200 || rpc.status >= 300) {
      throw new Error(`Server returned ${rpc.status} ${rpc.statusText}.`);
    }
    const ct = rpc.headers["content-type"] ?? "";
    const text = rpc.body;

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
      name: new URL(rpc.finalUrl).host,
      transport: "http",
      url: rpc.finalUrl,
      tools,
    };
    return {
      source: "tools/list",
      url: rpc.finalUrl,
      raw: JSON.stringify(manifest, null, 2),
    };
  });
