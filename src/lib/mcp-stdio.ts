import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { resolve } from "node:path";

export interface McpServerConfig {
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface McpConfigFile {
  mcpServers?: Record<string, McpServerConfig>;
}

function expandPath(p: string): string {
  return p.startsWith("~") ? resolve(homedir(), p.slice(1)) : resolve(p);
}

export function loadMcpConfig(configPath: string): McpConfigFile {
  const raw = readFileSync(expandPath(configPath), "utf-8");
  return JSON.parse(raw) as McpConfigFile;
}

export function resolveMcpServer(
  config: McpConfigFile,
  serverName: string,
): McpServerConfig {
  const server = config.mcpServers?.[serverName];
  if (!server?.command) {
    throw new Error(`MCP server "${serverName}" not found in config.`);
  }
  return server;
}

function parseJsonLines(buffer: string): unknown[] {
  const messages: unknown[] = [];
  for (const line of buffer.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{")) continue;
    try {
      messages.push(JSON.parse(trimmed));
    } catch {
      // skip non-json lines (some servers log to stdout)
    }
  }
  return messages;
}

function findToolsListResult(messages: unknown[]): { tools: unknown[] } | null {
  for (const msg of messages) {
    const m = msg as { result?: { tools?: unknown[] }; error?: { message?: string } };
    if (m.error) throw new Error(m.error.message ?? "MCP server returned an error.");
    if (m.result?.tools) return { tools: m.result.tools };
  }
  return null;
}

/**
 * Spawn a local MCP server over stdio, run initialize + tools/list, return manifest JSON.
 */
export async function fetchToolsListStdio(
  command: string,
  args: string[] = [],
  env: Record<string, string> = {},
  timeoutMs = 20_000,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
      env: { ...process.env, ...env },
      shell: process.platform === "win32",
    });

    let stdout = "";
    let settled = false;

    const finish = (err: Error | null, result?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      try {
        child.kill();
      } catch {
        /* ignore */
      }
      if (err) reject(err);
      else resolve(result!);
    };

    const timer = setTimeout(() => {
      finish(new Error(`stdio MCP timed out after ${timeoutMs}ms`));
    }, timeoutMs);

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", () => {
      // servers often log to stderr — ignore unless we fail
    });

    child.on("error", (err) => finish(err));

    const send = (payload: unknown) => {
      child.stdin.write(`${JSON.stringify(payload)}\n`);
    };

    // MCP handshake: initialize → initialized → tools/list
    send({
      jsonrpc: "2.0",
      id: 1,
      method: "initialize",
      params: {
        protocolVersion: "2024-11-05",
        capabilities: {},
        clientInfo: { name: "linejump", version: "2.1.0" },
      },
    });
    send({ jsonrpc: "2.0", method: "notifications/initialized", params: {} });
    send({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} });
    child.stdin.end();

    child.on("close", (code) => {
      const messages = parseJsonLines(stdout);
      try {
        const result = findToolsListResult(messages);
        if (!result) {
          finish(
            new Error(
              code === 0
                ? "No tools/list response from stdio MCP server."
                : `stdio MCP exited with code ${code}.`,
            ),
          );
          return;
        }
        const manifest = {
          name: `${command} ${args.join(" ")}`.trim(),
          transport: "stdio",
          tools: result.tools,
        };
        finish(null, JSON.stringify(manifest, null, 2));
      } catch (e) {
        finish(e instanceof Error ? e : new Error(String(e)));
      }
    });
  });
}

/** Parse `--stdio "npx -y pkg arg"` into command + args. */
export function parseStdioCommand(raw: string): { command: string; args: string[] } {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Empty stdio command.");

  const parts = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g);
  if (!parts?.length) throw new Error("Could not parse stdio command.");
  const command = parts[0]!.replace(/^["']|["']$/g, "");
  const args = parts.slice(1).map((p) => p.replace(/^["']|["']$/g, ""));
  return { command, args };
}
