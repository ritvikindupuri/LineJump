import { ENGINE_VERSION, runDetectionEngine } from "./detection/engine";
import { DEFAULT_SCANNER_POLICY } from "./default-policy";

export function mergePolicy(policy?: ScannerPolicy): ScannerPolicy {
  return {
    ...DEFAULT_SCANNER_POLICY,
    ...policy,
    severityOverrides: {
      ...DEFAULT_SCANNER_POLICY.severityOverrides,
      ...policy?.severityOverrides,
    },
  };
}

export type RiskSeverity = "critical" | "high" | "medium" | "low" | "info";
export type FindingConfidence = "low" | "medium" | "high";

export interface Finding {
  id: string;
  ruleId?: string;
  severity: RiskSeverity;
  category: string;
  title: string;
  detail: string;
  toolName?: string;
  evidence?: string;
  confidence?: FindingConfidence;
  location?: string;
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
  description?: string;
  instructions?: string;
  systemPrompt?: string;
  readme?: string;
  documentation?: string;
  serverInfo?: unknown;
  tools?: McpTool[];
  prompts?: unknown[];
  resources?: unknown[];
  [k: string]: unknown;
}

export interface ScanCoverage {
  toolsScanned: number;
  promptsScanned: number;
  resourcesScanned: number;
  schemaFieldsScanned: number;
  textFragmentsScanned: number;
  rulesVersion: string;
}

export interface ScanReport {
  serverName: string;
  toolCount: number;
  scannedAt: string;
  findings: Finding[];
  score: number;
  engineVersion: string;
  coverage: ScanCoverage;
}

export interface ScannerPolicy {
  disabledRules?: string[];
  customRegexes?: Array<{ regex: string; severity: RiskSeverity; title: string; category: string }>;
  severityOverrides?: Record<string, RiskSeverity>;
  blockedCapabilities?: string[];
  requireApproval?: boolean;
}

export { ENGINE_VERSION };

export function scanManifest(manifest: McpManifest, policy?: ScannerPolicy): ScanReport {
  const { findings, score, coverage } = runDetectionEngine(manifest, mergePolicy(policy));
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];

  return {
    serverName: typeof manifest.name === "string" ? manifest.name : "Unnamed MCP server",
    toolCount: tools.length,
    scannedAt: new Date().toISOString(),
    findings,
    score,
    engineVersion: ENGINE_VERSION,
    coverage,
  };
}

export function parseManifestInput(raw: string): McpManifest {
  const trimmed = raw.trim();
  if (!trimmed) throw new Error("Paste an MCP manifest or tools/list JSON to scan.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Input is not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Expected a JSON object.");
  }
  const obj = parsed as Record<string, unknown>;
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
  if (typeof obj.name === "string" && (typeof obj.description === "string" || obj.inputSchema)) {
    return { tools: [obj as McpTool] };
  }
  return obj as McpManifest;
}
