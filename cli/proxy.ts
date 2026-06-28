import { spawn } from "node:child_process";
import * as readline from "node:readline";
import * as crypto from "node:crypto";
import { getPinnedTools, pinTool, logProxyCall, quarantineResponse } from "../src/lib/db";
import { scanText } from "../src/lib/mcp-scanner";

// Parse command line arguments to spawn downstream server
const args = process.argv.slice(2);
let serverName = "mcp-proxy-server";

// Detect if a custom server name is provided: --name <server-name>
const nameIndex = args.indexOf("--name");
if (nameIndex !== -1 && nameIndex + 1 < args.length) {
  serverName = args[nameIndex + 1];
  args.splice(nameIndex, 2);
}

if (args.length === 0) {
  console.error("Usage: linejump-proxy [--name <server-name>] <command> [args...]");
  process.exit(1);
}

const [cmd, ...subArgs] = args;

// Spawn child process
const child = spawn(cmd, subArgs, { stdio: ["pipe", "pipe", "inherit"] });

// Setup readline interface for standard input (client -> proxy)
const clientReader = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

// Setup readline interface for downstream server output (proxy <- server)
const serverReader = readline.createInterface({
  input: child.stdout,
  terminal: false,
});

// Track pending requests by ID to match responses
const activeRequests = new Map<number | string, { method: string; startTime: number; name?: string; args?: any }>();

// Simple DLP secret regexes
const SECRETS_PATTERNS = [
  /password\s*[:=]\s*['"]?[a-zA-Z0-9_.-]{4,}['"]?/i,
  /aws_access_key_id\s*[:=]\s*['"]?[A-Z0-9]{20}['"]/i,
  /aws_secret_access_key\s*[:=]\s*['"]?[a-zA-Z0-9/+=]{40}['"]/i,
  /secret_key|private_key|api_key|auth_token|client_secret/i,
  /\.env|\/etc\/passwd|\.git\/config/i,
];

// Helper to sanitize ANSI characters
function sanitizeAnsi(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/\x1b/g, "ESC");
}

// Client -> Server request handler
clientReader.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);

    if (msg.id !== undefined && msg.method !== undefined) {
      // Record request details
      activeRequests.set(msg.id, {
        method: msg.method,
        startTime: Date.now(),
        name: msg.params?.name,
        args: msg.params?.arguments,
      });

      // DLP check on inputs
      if (msg.method === "tools/call") {
        const argStr = JSON.stringify(msg.params.arguments || {});
        let dlpViolation = "";
        for (const pattern of SECRETS_PATTERNS) {
          if (pattern.test(argStr)) {
            dlpViolation = pattern.toString();
            break;
          }
        }

        if (dlpViolation) {
          const errMsg = `[LineJump DLP Alert: Parameter block. Potential secret/file path violation: ${dlpViolation}]`;
          const errorResponse = {
            jsonrpc: "2.0",
            error: {
              code: -32602,
              message: errMsg,
            },
            id: msg.id,
          };
          process.stdout.write(JSON.stringify(errorResponse) + "\n");
          
          // Log blocked transaction
          await logProxyCall(serverName, msg.params.name || "unknown", JSON.stringify(msg.params.arguments || {}), errMsg, "blocked", 0);
          activeRequests.delete(msg.id);
          return; // Do NOT forward to downstream server
        }
      }
    }

    // Forward to downstream server
    child.stdin.write(line + "\n");
  } catch (e) {
    // If fail parsing, pass through
    child.stdin.write(line + "\n");
  }
});

// Server -> Client response handler
serverReader.on("line", async (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);

    if (msg.id !== undefined && activeRequests.has(msg.id)) {
      const request = activeRequests.get(msg.id)!;
      activeRequests.delete(msg.id);
      const duration = Date.now() - request.startTime;

      // Handle tools/list responses
      if (request.method === "tools/list" && msg.result?.tools) {
        const rawTools = msg.result.tools as any[];
        const processedTools: any[] = [];

        // Load all current pinned tools for this server
        const pinnedList = await getPinnedTools(serverName);
        const pinnedMap = new Map<string, { id: string; status: string; description: string; schema_json: string }>();
        for (const t of pinnedList) {
          pinnedMap.set(t.tool_name, t);
        }

        for (const t of rawTools) {
          const name = t.name || "unknown";
          const desc = t.description || "";
          const schema = JSON.stringify(t.inputSchema || {});

          const existing = pinnedMap.get(name);
          if (!existing) {
            // New tool found -> TOFU: pin as pending
            await pinTool(serverName, name, desc, schema, "pending");
            // Do NOT include it in tools list or redact description to warn the model
            processedTools.push({
              ...t,
              description: `[LineJump PENDING: Awaiting tool configuration approval in the LineJump Console]`,
            });
          } else if (existing.description !== desc || existing.schema_json !== schema) {
            // Configuration changed -> set status to pending again
            await pinTool(serverName, name, desc, schema, "pending");
            processedTools.push({
              ...t,
              description: `[LineJump CONFIGURATION CHANGED: Awaiting security approval in the LineJump Console]`,
            });
          } else if (existing.status === "approved") {
            // Approved tool, pass it through
            processedTools.push(t);
          } else if (existing.status === "blocked") {
            // Explicitly blocked by user in dashboard
            processedTools.push({
              ...t,
              description: `[LineJump BLOCKED: Explicitly disabled by security policy]`,
            });
          } else {
            // Pending tool -> keep blocked/redacted
            processedTools.push({
              ...t,
              description: `[LineJump PENDING: Awaiting tool configuration approval in the LineJump Console]`,
            });
          }
        }

        // Return processed tools list
        msg.result.tools = processedTools;
        const modifiedLine = JSON.stringify(msg);
        process.stdout.write(modifiedLine + "\n");
        return;
      }

      // Handle tools/call responses
      if (request.method === "tools/call" && msg.result?.content) {
        const contents = msg.result.content as any[];
        let hasThreat = false;
        let threatReason = "";
        let originalText = "";
        let sanitizedText = "";

        // Process output text nodes
        for (const item of contents) {
          if (item.type === "text" && item.text) {
            originalText = item.text;
            
            // 1. Sanitize ANSI codes
            const cleanText = sanitizeAnsi(item.text);
            sanitizedText = cleanText;

            // 2. Scan for prompt injections
            const findings = scanText(cleanText, request.name, "Tool response");
            const highRiskFindings = findings.filter(f => f.severity === "critical" || f.severity === "high");
            if (highRiskFindings.length > 0) {
              hasThreat = true;
              threatReason = highRiskFindings.map(f => `[${f.category}] ${f.title}`).join(", ");
            }

            item.text = cleanText;
          }
        }

        if (hasThreat) {
          // Quarantine response
          const quarantineId = await quarantineResponse(serverName, request.name || "unknown", originalText, sanitizedText, threatReason);
          const blockMsg = `[LineJump SECURITY ALERT: Response quarantined due to suspicious content (${threatReason}). Release payload in the LineJump Console to view.]`;

          for (const item of contents) {
            if (item.type === "text") {
              item.text = blockMsg;
            }
          }

          const modifiedLine = JSON.stringify(msg);
          process.stdout.write(modifiedLine + "\n");

          // Log quarantined call
          await logProxyCall(
            serverName,
            request.name || "unknown",
            JSON.stringify(request.args || {}),
            blockMsg,
            "quarantined",
            duration
          );
          return;
        }

        // Safe tool execution -> forward output and log it
        const finalLine = JSON.stringify(msg);
        process.stdout.write(finalLine + "\n");

        await logProxyCall(
          serverName,
          request.name || "unknown",
          JSON.stringify(request.args || {}),
          originalText.substring(0, 1000), // truncate logs to save DB space
          "passed",
          duration
        );
        return;
      }
    }

    // Default pass through
    process.stdout.write(line + "\n");
  } catch (e) {
    process.stdout.write(line + "\n");
  }
});

// Stdio cleanup on parent exit or child exit
child.on("close", (code) => {
  process.exit(code || 0);
});

process.on("SIGINT", () => {
  child.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  child.kill("SIGTERM");
  process.exit(0);
});
