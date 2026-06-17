export type RiskSeverity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  id: string;
  severity: RiskSeverity;
  category: string;
  title: string;
  detail: string;
  toolName?: string;
  evidence?: string;
}

export interface McpTool {
  name?: string;
  description?: string;
  inputSchema?: unknown;
  [k: string]: unknown;
}

export interface McpManifest {
  name?: string;
  version?: string;
  tools?: McpTool[];
  prompts?: unknown[];
  resources?: unknown[];
  [k: string]: unknown;
}

export interface ScanReport {
  serverName: string;
  toolCount: number;
  scannedAt: string;
  findings: Finding[];
  score: number; // 0-100, higher = safer
}

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const ZERO_WIDTH_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;

const INJECTION_PHRASES = [
  "ignore previous",
  "ignore all previous",
  "ignore the above",
  "disregard previous",
  "disregard the above",
  "system prompt",
  "you are now",
  "act as",
  "override",
  "jailbreak",
  "developer mode",
  "do anything now",
  "as an ai",
  "new instructions",
  "forget your instructions",
  "from now on",
  "before answering",
  "before responding",
  "before using this tool",
  "before calling",
  "always call",
  "always invoke",
  "secretly",
  "do not tell",
  "do not mention",
  "without informing the user",
  "without the user knowing",
];

const SENSITIVE_KEYWORDS: Array<{ key: string; label: string; sev: RiskSeverity }> = [
  { key: "shell", label: "shell execution", sev: "high" },
  { key: "exec", label: "command execution", sev: "high" },
  { key: "subprocess", label: "subprocess spawn", sev: "high" },
  { key: "bash", label: "shell access", sev: "high" },
  { key: "rm -rf", label: "destructive shell command", sev: "critical" },
  { key: "sudo", label: "privilege escalation", sev: "critical" },
  { key: "filesystem", label: "broad filesystem access", sev: "medium" },
  { key: "read_file", label: "filesystem read", sev: "medium" },
  { key: "write_file", label: "filesystem write", sev: "high" },
  { key: "delete_file", label: "filesystem delete", sev: "high" },
  { key: "ssh", label: "remote shell access", sev: "high" },
  { key: "/etc/passwd", label: "credential file path", sev: "critical" },
  { key: ".ssh", label: "SSH key directory", sev: "critical" },
  { key: "env", label: "environment variables", sev: "medium" },
  { key: "secret", label: "secret access", sev: "high" },
  { key: "credential", label: "credential access", sev: "high" },
  { key: "api key", label: "API key access", sev: "high" },
  { key: "token", label: "token access", sev: "medium" },
  { key: "password", label: "password handling", sev: "high" },
  { key: "private key", label: "private key access", sev: "critical" },
  { key: "exfiltrate", label: "data exfiltration intent", sev: "critical" },
  { key: "fetch(", label: "arbitrary network fetch", sev: "medium" },
  { key: "http://", label: "insecure URL", sev: "low" },
  { key: "webhook", label: "outbound webhook", sev: "medium" },
];

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function lower(s: string | undefined) {
  return (s ?? "").toLowerCase();
}

function scanText(text: string, toolName: string | undefined, category: string): Finding[] {
  const findings: Finding[] = [];
  if (!text) return findings;
  const lc = text.toLowerCase();

  // ANSI escape sequences
  if (ANSI_ESCAPE_RE.test(text)) {
    findings.push({
      id: id(),
      severity: "high",
      category: "Hidden ANSI escape",
      title: "ANSI terminal escape sequence detected",
      detail:
        "The text contains terminal escape codes that can hide content from humans reading the description while still being interpreted by the model or terminal.",
      toolName,
      evidence: JSON.stringify(text.match(ANSI_ESCAPE_RE)?.slice(0, 3)),
    });
  }

  // Other control characters
  if (CONTROL_CHAR_RE.test(text)) {
    findings.push({
      id: id(),
      severity: "medium",
      category: "Hidden control characters",
      title: "Non-printable control characters",
      detail:
        "Description contains control characters (other than tab/newline). These can mask malicious content from human reviewers.",
      toolName,
    });
  }

  // Zero-width / bidi
  if (ZERO_WIDTH_RE.test(text)) {
    findings.push({
      id: id(),
      severity: "high",
      category: "Invisible Unicode",
      title: "Zero-width or bidi override characters",
      detail:
        "Description contains zero-width or right-to-left override characters that can hide instructions from a human reviewer.",
      toolName,
    });
  }

  // Prompt injection phrases
  const matchedPhrases = INJECTION_PHRASES.filter((p) => lc.includes(p));
  if (matchedPhrases.length) {
    findings.push({
      id: id(),
      severity: matchedPhrases.length > 2 ? "critical" : "high",
      category: "Prompt injection",
      title: "Possible prompt-injection language in description",
      detail: `Phrases commonly used to override model behavior were found: ${matchedPhrases.slice(0, 5).join(", ")}.`,
      toolName,
      evidence: matchedPhrases.slice(0, 5).join(" | "),
    });
  }

  // System-instruction override patterns
  if (
    /<\s*system\s*>/.test(lc) ||
    /\[\s*system\s*\]/.test(lc) ||
    /<\|system\|>/.test(lc) ||
    /<\|im_start\|>/.test(lc)
  ) {
    findings.push({
      id: id(),
      severity: "critical",
      category: "System-instruction override",
      title: "Embedded system role markers",
      detail:
        "Description embeds tokens that mimic system-role boundaries. A model may treat the following text as authoritative instructions.",
      toolName,
    });
  }

  // Sensitive capability hints
  for (const kw of SENSITIVE_KEYWORDS) {
    if (lc.includes(kw.key)) {
      findings.push({
        id: id(),
        severity: kw.sev,
        category: "Broad capability",
        title: `Indicates ${kw.label}`,
        detail: `${category} mentions "${kw.key}" which suggests ${kw.label}. Confirm this capability is required and properly sandboxed.`,
        toolName,
        evidence: kw.key,
      });
    }
  }

  return findings;
}

function scanToolName(name: string | undefined): Finding[] {
  if (!name) return [];
  const findings: Finding[] = [];
  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    findings.push({
      id: id(),
      severity: "medium",
      category: "Suspicious tool name",
      title: "Unusual characters in tool name",
      detail: `Tool name "${name}" contains characters outside the typical [a-zA-Z0-9_.-] set. This can be used to spoof or confuse tool routing.`,
      toolName: name,
    });
  }
  if (name.length > 64) {
    findings.push({
      id: id(),
      severity: "low",
      category: "Suspicious tool name",
      title: "Unusually long tool name",
      detail: `Tool name is ${name.length} characters. Long names can hide intent.`,
      toolName: name,
    });
  }
  if (/(admin|root|sudo|exec|shell|secret|exfil|leak)/i.test(name)) {
    findings.push({
      id: id(),
      severity: "medium",
      category: "Suspicious tool name",
      title: "Sensitive keyword in tool name",
      detail: `Tool name "${name}" includes a sensitive keyword. Confirm the tool's scope matches its name.`,
      toolName: name,
    });
  }
  return findings;
}

function scanCrossTool(tools: McpTool[]): Finding[] {
  const findings: Finding[] = [];
  const readers = tools.filter((t) =>
    /read|get|list|load|fetch|query|search/i.test(`${t.name ?? ""} ${t.description ?? ""}`),
  );
  const senders = tools.filter((t) =>
    /(send|post|publish|upload|write|email|webhook|http|fetch|notify|export)/i.test(
      `${t.name ?? ""} ${t.description ?? ""}`,
    ),
  );
  if (readers.length > 0 && senders.length > 0) {
    findings.push({
      id: id(),
      severity: "medium",
      category: "Cross-tool exfiltration path",
      title: "Reader + outbound sender combination",
      detail: `Server exposes ${readers.length} reader-style tool(s) and ${senders.length} outbound-sender tool(s). A line-jumping or prompt-injection payload could chain these to exfiltrate data.`,
    });
  }
  return findings;
}

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  critical: 30,
  high: 15,
  medium: 6,
  low: 2,
  info: 0,
};

export function scanManifest(manifest: McpManifest): ScanReport {
  const findings: Finding[] = [];
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];

  // Server-level description if present
  if (typeof manifest.description === "string") {
    findings.push(...scanText(manifest.description, undefined, "Server description"));
  }

  for (const t of tools) {
    findings.push(...scanToolName(t.name));
    findings.push(
      ...scanText(
        lower(t.description) ? (t.description as string) : "",
        t.name,
        "Tool description",
      ),
    );
    // Schema descriptions
    try {
      const schemaJson = JSON.stringify(t.inputSchema ?? {});
      if (schemaJson.length > 2) {
        findings.push(...scanText(schemaJson, t.name, "Input schema"));
      }
    } catch {
      // ignore
    }
  }

  findings.push(...scanCrossTool(tools));

  if (tools.length === 0) {
    findings.push({
      id: id(),
      severity: "info",
      category: "Manifest",
      title: "No tools found",
      detail:
        "The manifest does not declare any tools. Confirm you pasted the tools/list response or full server manifest.",
    });
  }

  // Dedupe by toolName+title
  const seen = new Set<string>();
  const deduped = findings.filter((f) => {
    const k = `${f.toolName ?? ""}::${f.title}::${f.evidence ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const penalty = deduped.reduce((acc, f) => acc + SEVERITY_WEIGHT[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    serverName: typeof manifest.name === "string" ? manifest.name : "Unnamed MCP server",
    toolCount: tools.length,
    scannedAt: new Date().toISOString(),
    findings: deduped.sort((a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity]),
    score,
  };
}

export function parseManifestInput(raw: string): McpManifest {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Paste an MCP manifest or tools/list JSON to scan.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch (e) {
    throw new Error("Input is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Expected a JSON object.");
  }
  const obj = parsed as Record<string, unknown>;
  // Accept either a full manifest, a tools/list response, or a bare array
  if (Array.isArray(parsed)) {
    return { tools: parsed as McpTool[] };
  }
  if (Array.isArray(obj.tools)) return obj as McpManifest;
  if (
    obj.result &&
    typeof obj.result === "object" &&
    Array.isArray((obj.result as { tools?: unknown }).tools)
  ) {
    return { ...(obj.result as McpManifest) };
  }
  // Single tool object
  if (typeof obj.name === "string" && (typeof obj.description === "string" || obj.inputSchema)) {
    return { tools: [obj as McpTool] };
  }
  return obj as McpManifest;
}
