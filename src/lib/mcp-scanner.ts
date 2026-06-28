
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

export interface AttackPathNode {
  id: string;
  label: string;
  type: "client" | "tool" | "risk" | "egress";
  details?: string;
}

export interface AttackPathEdge {
  from: string;
  to: string;
  label?: string;
  severity?: RiskSeverity;
}

export interface AttackPathGraph {
  nodes: AttackPathNode[];
  edges: AttackPathEdge[];
}

export interface McpBomItem {
  name: string;
  type: "tool" | "prompt" | "resource";
  description: string;
  capabilities: string[];
  externalDomains: string[];
  approvedHash: string;
  safetyScore: number;
}

export interface ScanReport {
  serverName: string;
  toolCount: number;
  scannedAt: string;
  findings: Finding[];
  score: number; // 0-100, higher = safer
  policyPack: string;
  attackPath: AttackPathGraph;
  bom: McpBomItem[];
  fetchReport?: any;
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

export function scanText(text: string, toolName: string | undefined, category: string): Finding[] {
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

const SEVERITY_WEIGHT: Record<string, Record<RiskSeverity, number>> = {
  default: { critical: 35, high: 15, medium: 6, low: 2, info: 0 },
  strict: { critical: 60, high: 30, medium: 15, low: 5, info: 0 },
  "dev-friendly": { critical: 15, high: 5, medium: 2, low: 0, info: 0 },
  "no-network": { critical: 40, high: 20, medium: 8, low: 2, info: 0 },
  "local-only": { critical: 40, high: 20, medium: 8, low: 2, info: 0 },
};

function computeToolHash(t: McpTool): string {
  const str = `${t.name ?? ""}-${t.description ?? ""}-${JSON.stringify(t.inputSchema ?? {})}`;
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return "h-" + Math.abs(hash).toString(16);
}

function compileMcpBom(manifest: McpManifest, findings: Finding[]): McpBomItem[] {
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  return tools.map((t) => {
    const desc = t.description ?? "";
    const name = t.name ?? "unnamed";
    
    // Detect capabilities
    const capabilities: string[] = [];
    if (/read|get|file/i.test(`${name} ${desc}`)) capabilities.push("Read access");
    if (/write|post|send|webhook|http|request/i.test(`${name} ${desc}`)) capabilities.push("Write / Send access");
    if (/shell|exec|spawn|bash/i.test(`${name} ${desc}`)) capabilities.push("Subprocess execution");
    if (/env|secret|token|password|key/i.test(`${name} ${desc}`)) capabilities.push("Secrets / Config access");
    
    // Extract domain matches
    const domains: string[] = [];
    const urlMatches = desc.match(/https?:\/\/[a-zA-Z0-9.-]+/g);
    if (urlMatches) {
      for (const url of urlMatches) {
        try {
          domains.push(new URL(url).hostname);
        } catch {
          // ignore
        }
      }
    }

    // Calc safety score per tool
    const toolFindings = findings.filter((f) => f.toolName === name);
    let penalty = 0;
    for (const f of toolFindings) {
      if (f.severity === "critical") penalty += 35;
      else if (f.severity === "high") penalty += 15;
      else if (f.severity === "medium") penalty += 6;
      else if (f.severity === "low") penalty += 2;
    }
    const toolScore = Math.max(0, 100 - penalty);

    return {
      name,
      type: "tool",
      description: desc,
      capabilities,
      externalDomains: Array.from(new Set(domains)),
      approvedHash: computeToolHash(t),
      safetyScore: toolScore,
    };
  });
}

function compileAttackPathGraph(manifest: McpManifest, findings: Finding[]): AttackPathGraph {
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const nodes: AttackPathNode[] = [
    { id: "client", label: "LLM Client Host", type: "client", details: "Local User Agent (Claude / Cursor)" }
  ];
  const edges: AttackPathEdge[] = [];

  const readers = tools.filter((t) =>
    /read|get|list|load|fetch|query|search/i.test(`${t.name ?? ""} ${t.description ?? ""}`),
  );
  const senders = tools.filter((t) =>
    /(send|post|publish|upload|write|email|webhook|http|fetch|notify|export)/i.test(
      `${t.name ?? ""} ${t.description ?? ""}`,
    ),
  );

  // Add tool nodes
  for (const t of tools) {
    const tName = t.name ?? "unnamed";
    nodes.push({
      id: `tool-${tName}`,
      label: tName,
      type: "tool",
      details: t.description ?? "Exposes schema capabilities to the model."
    });
  }

  // Draw client connections
  for (const r of readers) {
    edges.push({
      from: "client",
      to: `tool-${r.name}`,
      label: "Queries resource",
      severity: "info"
    });
  }

  // Draw exfiltration vectors if client connects to both
  if (readers.length > 0 && senders.length > 0) {
    nodes.push({
      id: "egress",
      label: "Outbound Egress",
      type: "egress",
      details: "Outbound remote network vector."
    });

    for (const r of readers) {
      for (const s of senders) {
        edges.push({
          from: `tool-${r.name}`,
          to: `tool-${s.name}`,
          label: "Chained payload flow",
          severity: "high"
        });
      }
    }

    for (const s of senders) {
      edges.push({
        from: `tool-${s.name}`,
        to: "egress",
        label: "Exfiltrates content",
        severity: "critical"
      });
    }
  }

  // Inject risk nodes
  const injectionFindings = findings.filter((f) => f.category === "Prompt injection");
  for (const f of injectionFindings) {
    if (f.toolName) {
      nodes.push({
        id: `risk-inject-${f.toolName}`,
        label: "Metadata Hijack Vector",
        type: "risk",
        details: "Hijack model prompt instructions via description."
      });
      edges.push({
        from: `risk-inject-${f.toolName}`,
        to: `tool-${f.toolName}`,
        label: "Injects model control",
        severity: f.severity
      });
    }
  }

  return { nodes, edges };
}

export function scanManifest(manifest: McpManifest, policyPack = "default"): ScanReport {
  let findings: Finding[] = [];
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];

  // Server-level description if present
  if (typeof manifest.description === "string") {
    findings.push(...scanText(manifest.description, undefined, "Server description"));
  }

  for (const t of tools) {
    findings.push(...scanToolName(t.name));
    findings.push(...scanText(lower(t.description) ? (t.description as string) : "", t.name, "Tool description"));
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

  // Dedupe by toolName+title
  const seen = new Set<string>();
  let deduped = findings.filter((f) => {
    const k = `${f.toolName ?? ""}::${f.title}::${f.evidence ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // Apply Policy Pack adjustments
  if (policyPack === "strict") {
    deduped = deduped.map((f) => {
      if (f.category.includes("exfiltration") || f.category.includes("DLP")) {
        return { ...f, severity: "critical", detail: `[STRICT POLICY ENFORCED] ${f.detail}` };
      }
      if (f.title.includes("execution") || f.title.includes("shell")) {
        return { ...f, severity: "critical", detail: `[STRICT POLICY ENFORCED] Privileged command executions are strictly blocked.` };
      }
      return f;
    });
  } else if (policyPack === "no-network") {
    deduped = deduped.map((f) => {
      if (f.evidence && /(http|webhook|fetch|send|post)/i.test(f.evidence)) {
        return { ...f, severity: "critical", detail: `[NO-NETWORK POLICY] Outbound network indicators are prohibited in this pack: ${f.detail}` };
      }
      return f;
    });
  } else if (policyPack === "local-only") {
    deduped = deduped.map((f) => {
      if (f.evidence && /(http|webhook|fetch|send|post)/i.test(f.evidence)) {
        return { ...f, severity: "critical", detail: `[LOCAL-ONLY POLICY] Network communication is blocked in this profile.` };
      }
      if (f.title.includes("filesystem")) {
        return { ...f, severity: "info", detail: `[LOCAL-ONLY POLICY] Filesystem access is pre-authorized inside this segment.` };
      }
      return f;
    });
  } else if (policyPack === "dev-friendly") {
    // Map severities down
    deduped = deduped.map((f) => {
      let severity: RiskSeverity = f.severity;
      if (f.severity === "critical") severity = "high";
      else if (f.severity === "high") severity = "medium";
      else if (f.severity === "medium") severity = "low";
      return { ...f, severity };
    });
  }

  const weights = SEVERITY_WEIGHT[policyPack] || SEVERITY_WEIGHT.default;
  const penalty = deduped.reduce((acc, f) => acc + weights[f.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  const sortedFindings = deduped.sort(
    (a, b) => weights[b.severity] - weights[a.severity]
  );

  return {
    serverName: typeof manifest.name === "string" ? manifest.name : "Unnamed MCP server",
    toolCount: tools.length,
    scannedAt: new Date().toISOString(),
    findings: sortedFindings,
    score,
    policyPack,
    attackPath: compileAttackPathGraph(manifest, sortedFindings),
    bom: compileMcpBom(manifest, sortedFindings)
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
  if (obj.result && typeof obj.result === "object" && Array.isArray((obj.result as { tools?: unknown }).tools)) {
    return { ...(obj.result as McpManifest) };
  }
  // Single tool object
  if (typeof obj.name === "string" && (typeof obj.description === "string" || obj.inputSchema)) {
    return { tools: [obj as McpTool] };
  }
  return obj as McpManifest;
}