import type {
  Finding,
  McpManifest,
  McpTool,
  RiskSeverity,
  ScannerPolicy,
  ScanCoverage,
} from "../mcp-scanner";
import {
  collapseSpacedLetters,
  foldHomoglyphs,
  joinSplitFragments,
  normalizeForBypass,
  normalizeInjectionText,
} from "./normalize";

export const ENGINE_VERSION = "2.1.0";

type Confidence = "low" | "medium" | "high";
type ScanSurface = "prose" | "schema_text" | "name";

interface RuleHit {
  ruleId: string;
  severity: RiskSeverity;
  category: string;
  title: string;
  detail: string;
  toolName?: string;
  evidence?: string;
  confidence: Confidence;
  location?: string;
}

// eslint-disable-next-line no-control-regex
const ANSI_ESCAPE_RE = /\x1b\[[0-9;?]*[ -/]*[@-~]/;
// eslint-disable-next-line no-control-regex
const CONTROL_CHAR_RE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;
const ZERO_WIDTH_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/;
const BASE64_BLOB_RE = /(?:^|[^A-Za-z0-9+/])[A-Za-z0-9+/]{48,}={0,2}(?:[^A-Za-z0-9+/]|$)/;
const UNICODE_ESCAPE_RE = /\\u[0-9a-fA-F]{4}/;
const HEX_ESCAPE_RE = /\\x[0-9a-fA-F]{2}/;
const EXTERNAL_URL_RE = /https?:\/\/[^\s"'<>)\]]+/gi;
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/;
const HTML_ENTITY_RE = /&#(?:#x?[0-9a-fA-F]+|\w+);/;
const MARKDOWN_JS_RE = /\]\(\s*javascript:/i;
const FULLWIDTH_LATIN_RE = /[\uFF01-\uFF5E]/;

const HUMAN_TEXT_KEYS = new Set([
  "description",
  "title",
  "summary",
  "help",
  "prompt",
  "message",
  "instructions",
  "content",
  "text",
  "body",
  "readme",
  "documentation",
  "systemPrompt",
]);

const INJECTION_PHRASES = [
  "ignore previous",
  "ignore all previous",
  "ignore the above",
  "disregard previous",
  "disregard the above",
  "system prompt",
  "you are now",
  "act as",
  "jailbreak",
  "developer mode",
  "do anything now",
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
  "end of user query",
  "real instructions",
  "hidden instruction",
  "do not reveal",
  "pretend you are",
  "your new role",
];

const INJECTION_REGEXES: Array<{ ruleId: string; re: RegExp; severity: RiskSeverity; title: string }> =
  [
    {
      ruleId: "injection.system_marker",
      re: /<\s*system\s*>|<\|system\|>|<\|im_start\|>|\[\s*system\s*\]/i,
      severity: "critical",
      title: "Embedded system role markers",
    },
    {
      ruleId: "injection.line_jump_coerce",
      re: /always\s+(use|call|invoke)\s+(the\s+)?[\w-]+\s+tool/i,
      severity: "high",
      title: "Tool-routing coercion language",
    },
    {
      ruleId: "injection.block_other_tools",
      re: /do\s+not\s+use\s+(any\s+)?other\s+tools?|ignore\s+(all\s+)?other\s+tools?/i,
      severity: "high",
      title: "Attempts to block other tools",
    },
    {
      ruleId: "injection.priority_hijack",
      re: /(first|always)\s+(tool|step)\s+(to\s+)?(call|invoke|run|use)/i,
      severity: "high",
      title: "Tool priority hijacking language",
    },
    {
      ruleId: "injection.override",
      re: /\boverride\b.{0,40}\b(instruction|prompt|rule|policy)\b/i,
      severity: "high",
      title: "Instruction override language",
    },
  ];

const CAPABILITY_KEYWORDS: Array<{
  ruleId: string;
  pattern: RegExp;
  label: string;
  sev: RiskSeverity;
  confidence: Confidence;
  surfaces: ScanSurface[];
}> = [
  {
    ruleId: "capability.shell",
    pattern: /\b(shell\s+command|subprocess|bash\s+-c|powershell\s+-|cmd\.exe)\b/i,
    label: "shell execution",
    sev: "high",
    confidence: "high",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.exec",
    pattern: /\b(exec(ute)?\s+(command|code)|os\.system|child_process\.spawn)\b/i,
    label: "command execution",
    sev: "high",
    confidence: "high",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.destructive",
    pattern: /\brm\s+-rf\b|\bformat\s+c:\b|\bshred\b/i,
    label: "destructive command",
    sev: "critical",
    confidence: "high",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.privilege",
    pattern: /\bsudo\b|\belevated\s+privilege\b|\brun\s+as\s+(admin|root)\b/i,
    label: "privilege escalation",
    sev: "critical",
    confidence: "high",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.exfil",
    pattern: /\bexfiltrat(e|ion)\b|\bleak\s+data\b|\bsteal\s+(the\s+)?(data|secrets?)\b/i,
    label: "data exfiltration intent",
    sev: "critical",
    confidence: "high",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.secrets",
    pattern: /\b(api[_\s-]?key|credentials?|password|private\s+key|\/etc\/passwd|\.ssh\/)\b/i,
    label: "secret or credential access",
    sev: "high",
    confidence: "medium",
    surfaces: ["prose", "schema_text"],
  },
  {
    ruleId: "capability.filesystem_write",
    pattern: /\b(write|delete|remove|unlink|overwrite)\s+(any\s+)?file/i,
    label: "filesystem write or delete",
    sev: "high",
    confidence: "medium",
    surfaces: ["prose"],
  },
  {
    ruleId: "capability.filesystem_read",
    pattern: /\b(read|access)\s+(any\s+)?(file|path|directory)\b/i,
    label: "filesystem read",
    sev: "low",
    confidence: "low",
    surfaces: ["prose"],
  },
  {
    ruleId: "capability.network",
    pattern: /\b(webhook|outbound\s+(http|request)|post\s+to\s+url|fetch\s+url)\b/i,
    label: "outbound network access",
    sev: "medium",
    confidence: "medium",
    surfaces: ["prose"],
  },
  {
    ruleId: "capability.env",
    pattern: /\b(environment\s+variables?|process\.env|getenv)\b/i,
    label: "environment variable access",
    sev: "medium",
    confidence: "medium",
    surfaces: ["prose", "schema_text"],
  },
];

/** Common MCP tool names — capability hints on these alone are expected noise. */
const LEGIT_TOOL_NAME_RE =
  /^(read|write|list|get|search|fetch|create|update|delete|move|copy)_[a-z0-9_]+$/i;

const DANGEROUS_PARAM_PATTERNS: Array<{
  ruleId: string;
  pattern: RegExp;
  label: string;
  sev: RiskSeverity;
}> = [
  {
    ruleId: "schema.param.command",
    pattern: /^(command|cmd|shell|exec|script|bash|powershell|code|eval)$/i,
    label: "command execution parameter",
    sev: "critical",
  },
  {
    ruleId: "schema.param.path",
    pattern: /^(path|filepath|file_path|directory|dir|filename)$/i,
    label: "filesystem path parameter",
    sev: "low",
  },
  {
    ruleId: "schema.param.url",
    pattern: /^(url|uri|endpoint|callback|webhook|redirect)$/i,
    label: "URL or callback parameter",
    sev: "low",
  },
  {
    ruleId: "schema.param.query",
    pattern: /^(query|sql|statement|script)$/i,
    label: "query or script parameter",
    sev: "high",
  },
];

const SEVERITY_WEIGHT: Record<RiskSeverity, number> = {
  critical: 30,
  high: 15,
  medium: 6,
  low: 2,
  info: 0,
};

const CONFIDENCE_MULTIPLIER: Record<Confidence, number> = {
  high: 1,
  medium: 0.75,
  low: 0.45,
};

function id() {
  return Math.random().toString(36).slice(2, 10);
}

function hit(h: RuleHit): Finding {
  return { id: id(), ...h };
}

function extractHumanText(
  value: unknown,
  path = "",
): Array<{ path: string; text: string }> {
  if (typeof value === "string" && value.trim()) {
    return [{ path: path || "root", text: value }];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, i) => extractHumanText(item, `${path}[${i}]`));
  }
  if (value && typeof value === "object") {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) => {
      const childPath = path ? `${path}.${key}` : key;
      if (HUMAN_TEXT_KEYS.has(key) && typeof child === "string" && child.trim()) {
        return [{ path: childPath, text: child }];
      }
      if (child && typeof child === "object") {
        return extractHumanText(child, childPath);
      }
      return [];
    });
  }
  return [];
}

function walkSchemaProperties(
  schema: unknown,
  path: string,
  onProperty: (name: string, propSchema: unknown, propPath: string) => void,
): void {
  if (!schema || typeof schema !== "object") return;
  const s = schema as Record<string, unknown>;

  if (s.properties && typeof s.properties === "object") {
    for (const [name, prop] of Object.entries(s.properties as Record<string, unknown>)) {
      const propPath = `${path}.properties.${name}`;
      onProperty(name, prop, propPath);
      walkSchemaProperties(prop, propPath, onProperty);
    }
  }

  for (const combiner of ["items", "additionalProperties", "patternProperties"] as const) {
    const child = s[combiner];
    if (child && typeof child === "object" && combiner !== "patternProperties") {
      walkSchemaProperties(child, `${path}.${combiner}`, onProperty);
    }
    if (combiner === "patternProperties" && child && typeof child === "object") {
      for (const [pattern, prop] of Object.entries(child as Record<string, unknown>)) {
        walkSchemaProperties(prop, `${path}.patternProperties.${pattern}`, onProperty);
      }
    }
  }

  for (const combiner of ["oneOf", "anyOf", "allOf"] as const) {
    const variants = s[combiner];
    if (Array.isArray(variants)) {
      variants.forEach((variant, i) => {
        walkSchemaProperties(variant, `${path}.${combiner}[${i}]`, onProperty);
      });
    }
  }
}

function scanTextFragment(
  text: string,
  ctx: {
    toolName?: string;
    category: string;
    location?: string;
    policy?: ScannerPolicy;
    surface?: ScanSurface;
  },
): RuleHit[] {
  const findings: RuleHit[] = [];
  if (!text?.trim()) return findings;

  const surface = ctx.surface ?? "prose";
  const normalized = normalizeInjectionText(text);
  const bypassForm = normalizeForBypass(text);
  const collapsed = collapseSpacedLetters(bypassForm);
  const folded = foldHomoglyphs(text);

  findings.push(...policyCustomRegexes(ctx.policy, text, ctx));

  if (ANSI_ESCAPE_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.ansi_escape",
      severity: "high",
      category: "Hidden ANSI escape",
      title: "ANSI terminal escape sequence detected",
      detail:
        "Terminal escape codes can hide content from human reviewers while remaining visible to models or terminals.",
      toolName: ctx.toolName,
      evidence: text.match(ANSI_ESCAPE_RE)?.[0]?.slice(0, 40),
      confidence: "high",
      location: ctx.location,
    });
  }

  if (CONTROL_CHAR_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.control_chars",
      severity: "medium",
      category: "Hidden control characters",
      title: "Non-printable control characters",
      detail: "Control characters can mask malicious content from human reviewers.",
      toolName: ctx.toolName,
      confidence: "high",
      location: ctx.location,
    });
  }

  if (ZERO_WIDTH_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.zero_width",
      severity: "high",
      category: "Invisible Unicode",
      title: "Zero-width or bidi override characters",
      detail: "Invisible Unicode can hide instructions from human reviewers.",
      toolName: ctx.toolName,
      confidence: "high",
      location: ctx.location,
    });
  }

  if (folded !== text && /[a-z]/i.test(folded)) {
    findings.push({
      ruleId: "obfuscation.homoglyph",
      severity: "high",
      category: "Homoglyph attack",
      title: "Cyrillic lookalike characters detected",
      detail:
        "Text contains characters that visually mimic Latin letters — a common technique to bypass keyword filters.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  if (HTML_COMMENT_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.html_comment",
      severity: "medium",
      category: "Obfuscated content",
      title: "HTML comment block in text",
      detail: "HTML comments can conceal instructions from human reviewers.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  if (HTML_ENTITY_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.html_entity",
      severity: "medium",
      category: "Obfuscated content",
      title: "HTML entity encoding detected",
      detail: "Encoded entities can hide readable malicious content.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  if (MARKDOWN_JS_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.markdown_js",
      severity: "high",
      category: "Obfuscated content",
      title: "JavaScript markdown link detected",
      detail: "Markdown links with javascript: URLs are suspicious in tool metadata.",
      toolName: ctx.toolName,
      confidence: "high",
      location: ctx.location,
    });
  }

  if (FULLWIDTH_LATIN_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.fullwidth",
      severity: "medium",
      category: "Obfuscated content",
      title: "Fullwidth Latin characters detected",
      detail: "Fullwidth characters can bypass naive ASCII-only filters.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  if (BASE64_BLOB_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.base64",
      severity: "medium",
      category: "Obfuscated content",
      title: "Embedded Base64-encoded blob",
      detail: "Long Base64 strings may conceal instructions or payloads from casual review.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  if (UNICODE_ESCAPE_RE.test(text) || HEX_ESCAPE_RE.test(text)) {
    findings.push({
      ruleId: "obfuscation.escaped_chars",
      severity: "medium",
      category: "Obfuscated content",
      title: "Escaped character sequences",
      detail: "Unicode or hex escape sequences can hide readable malicious content.",
      toolName: ctx.toolName,
      confidence: "medium",
      location: ctx.location,
    });
  }

  const matchedPhrases = INJECTION_PHRASES.filter((p) => {
    const compact = p.replace(/\s+/g, "");
    return (
      normalized.includes(p) ||
      bypassForm.includes(p) ||
      collapsed.includes(compact) ||
      bypassForm.replace(/\s+/g, "").includes(compact)
    );
  });
  if (matchedPhrases.length) {
    findings.push({
      ruleId: "injection.phrase_list",
      severity: matchedPhrases.length > 2 ? "critical" : "high",
      category: "Prompt injection",
      title: "Prompt-injection language detected",
      detail: `Matched ${matchedPhrases.length} known injection phrase(s).`,
      toolName: ctx.toolName,
      evidence: matchedPhrases.slice(0, 5).join(" | "),
      confidence: matchedPhrases.length > 1 ? "high" : "medium",
      location: ctx.location,
    });
  }

  for (const rule of INJECTION_REGEXES) {
    if (
      rule.re.test(text) ||
      rule.re.test(normalized) ||
      rule.re.test(bypassForm) ||
      rule.re.test(collapsed)
    ) {
      findings.push({
        ruleId: rule.ruleId,
        severity: rule.severity,
        category: "Prompt injection",
        title: rule.title,
        detail: `${ctx.category} matches pattern associated with MCP line-jumping or instruction override.`,
        toolName: ctx.toolName,
        confidence: "high",
        location: ctx.location,
      });
    }
  }

  for (const kw of CAPABILITY_KEYWORDS) {
    if (!kw.surfaces.includes(surface)) continue;
    if (kw.pattern.test(text) || kw.pattern.test(bypassForm)) {
      if (
        ctx.toolName &&
        LEGIT_TOOL_NAME_RE.test(ctx.toolName) &&
        (kw.ruleId === "capability.filesystem_read" || kw.ruleId === "capability.filesystem_write")
      ) {
        continue;
      }
      findings.push({
        ruleId: kw.ruleId,
        severity: kw.sev,
        category: "Broad capability",
        title: `Indicates ${kw.label}`,
        detail: `${ctx.category} suggests ${kw.label}. Confirm scope and sandboxing.`,
        toolName: ctx.toolName,
        evidence: text.match(kw.pattern)?.[0],
        confidence: kw.confidence,
        location: ctx.location,
      });
    }
  }

  const urls = text.match(EXTERNAL_URL_RE);
  if (urls?.length && surface === "prose") {
    const insecure = urls.filter((u) => u.startsWith("http://"));
    if (insecure.length) {
      findings.push({
        ruleId: "network.insecure_url",
        severity: "medium",
        category: "External reference",
        title: "Insecure HTTP URL in text",
        detail: `Found ${insecure.length} insecure HTTP URL(s).`,
        toolName: ctx.toolName,
        evidence: insecure.slice(0, 3).join(" | "),
        confidence: "medium",
        location: ctx.location,
      });
    }
  }

  return findings;
}

function policyCustomRegexes(
  policy: ScannerPolicy | undefined,
  text: string,
  ctx: { toolName?: string; category: string; location?: string },
): RuleHit[] {
  if (!policy?.customRegexes?.length) return [];
  const findings: RuleHit[] = [];
  for (const rule of policy.customRegexes) {
    try {
      const re = new RegExp(rule.regex, "i");
      if (re.test(text)) {
        findings.push({
          ruleId: `custom.${rule.title.replace(/\s+/g, "_").toLowerCase()}`,
          severity: rule.severity,
          category: rule.category,
          title: rule.title,
          detail: `Matched custom rule: ${rule.regex}`,
          toolName: ctx.toolName,
          evidence: text.match(re)?.[0]?.slice(0, 80),
          confidence: "high",
          location: ctx.location,
        });
      }
    } catch {
      // invalid regex in policy — skip
    }
  }
  return findings;
}

function scanToolName(name: string | undefined): RuleHit[] {
  if (!name) return [];
  const findings: RuleHit[] = [];

  if (!/^[a-zA-Z0-9_.-]+$/.test(name)) {
    findings.push({
      ruleId: "tool.name.unusual_chars",
      severity: "medium",
      category: "Suspicious tool name",
      title: "Unusual characters in tool name",
      detail: `Tool name "${name}" may be used to spoof or confuse tool routing.`,
      toolName: name,
      confidence: "high",
    });
  }

  if (name.length > 64) {
    findings.push({
      ruleId: "tool.name.long",
      severity: "low",
      category: "Suspicious tool name",
      title: "Unusually long tool name",
      detail: `Tool name is ${name.length} characters.`,
      toolName: name,
      confidence: "medium",
    });
  }

  if (/(admin|root|sudo|exec|shell|secret|exfil|leak)/i.test(name) && !LEGIT_TOOL_NAME_RE.test(name)) {
    findings.push({
      ruleId: "tool.name.sensitive_keyword",
      severity: "medium",
      category: "Suspicious tool name",
      title: "Sensitive keyword in tool name",
      detail: `Tool name "${name}" includes a sensitive keyword.`,
      toolName: name,
      confidence: "medium",
    });
  }

  return findings;
}

function scanSchema(toolName: string | undefined, schema: unknown): RuleHit[] {
  const findings: RuleHit[] = [];
  if (!schema || typeof schema !== "object") return findings;
  const root = schema as Record<string, unknown>;

  if (root.additionalProperties === true) {
    findings.push({
      ruleId: "schema.additional_properties_open",
      severity: "medium",
      category: "Permissive schema",
      title: "Schema allows arbitrary additional properties",
      detail: "Open schemas accept undeclared fields that may smuggle instructions or paths.",
      toolName,
      confidence: "medium",
      location: "inputSchema.additionalProperties",
    });
  }

  walkSchemaProperties(schema, "inputSchema", (name, propSchema, propPath) => {
    for (const rule of DANGEROUS_PARAM_PATTERNS) {
      if (rule.pattern.test(name)) {
        findings.push({
          ruleId: rule.ruleId,
          severity: rule.sev,
          category: "Schema parameter risk",
          title: `Sensitive parameter: ${name}`,
          detail: `Parameter "${name}" is a ${rule.label}.`,
          toolName,
          evidence: name,
          confidence:
            toolName && LEGIT_TOOL_NAME_RE.test(toolName) && rule.sev === "low"
              ? "low"
              : "high",
          location: propPath,
        });
      }
    }

    if (propSchema && typeof propSchema === "object") {
      const prop = propSchema as Record<string, unknown>;
      if (prop.type === "string" && prop.format === "uri") {
        findings.push({
          ruleId: "schema.param.uri_format",
          severity: "low",
          category: "Schema parameter risk",
          title: `URI parameter: ${name}`,
          detail: `Parameter "${name}" accepts arbitrary URIs.`,
          toolName,
          confidence: "medium",
          location: propPath,
        });
      }
    }
  });

  for (const fragment of extractHumanText(schema, "inputSchema")) {
    for (const h of scanTextFragment(fragment.text, {
      toolName,
      category: "Input schema",
      location: fragment.path,
      surface: "schema_text",
    })) {
      findings.push(h);
    }
  }

  return findings;
}

function classifyToolCapabilities(tool: McpTool): Set<string> {
  const text = `${tool.description ?? ""}`.toLowerCase();
  const name = (tool.name ?? "").toLowerCase();
  const caps = new Set<string>();
  if (
    /\b(read|load)\s+(file|secret|credential|env)/i.test(text) ||
    /^(read|get)_(file|secret|env)/i.test(name)
  ) {
    caps.add("filesystem_read");
  }
  if (/\b(secret|credential|password|api[_\s-]?key|\.ssh)\b/i.test(text)) caps.add("secrets");
  if (/\b(webhook|outbound|post\s+to|http\s+request|send\s+data)\b/i.test(text)) {
    caps.add("network_out");
  }
  if (/\b(shell|exec|bash|subprocess|run\s+command)\b/i.test(text)) caps.add("code_exec");
  return caps;
}

function scanSplitFieldInjection(tool: McpTool): RuleHit[] {
  const fragments: string[] = [];
  if (typeof tool.description === "string") fragments.push(tool.description);
  for (const f of extractHumanText(tool.inputSchema ?? {}, "inputSchema")) {
    fragments.push(f.text);
  }
  if (fragments.length < 2) return [];

  const combined = joinSplitFragments(fragments);
  const hits: RuleHit[] = [];

  for (const phrase of INJECTION_PHRASES) {
    const compact = phrase.replace(/\s+/g, "");
    const inCombined =
      combined.includes(phrase) || combined.replace(/\s+/g, "").includes(compact);
    if (!inCombined) continue;

    const inSingle = fragments.some((f) => {
      const n = normalizeForBypass(f);
      return n.includes(phrase) || n.replace(/\s+/g, "").includes(compact);
    });

    if (!inSingle) {
      hits.push({
        ruleId: "injection.split_field",
        severity: "critical",
        category: "Split-field injection",
        title: "Injection phrase split across fields",
        detail:
          "Instructions appear only when tool description and schema text are combined — a common bypass against per-field scanners.",
        toolName: tool.name,
        evidence: phrase,
        confidence: "high",
        location: "description+inputSchema",
      });
      break;
    }
  }

  for (const rule of INJECTION_REGEXES) {
    if (rule.re.test(combined)) {
      const inSingle = fragments.some((f) => rule.re.test(normalizeForBypass(f)));
      if (!inSingle) {
        hits.push({
          ruleId: "injection.split_field_pattern",
          severity: rule.severity,
          category: "Split-field injection",
          title: `${rule.title} (split across fields)`,
          detail: "Pattern matches combined tool fields but not any single field.",
          toolName: tool.name,
          confidence: "high",
          location: "description+inputSchema",
        });
      }
    }
  }

  return hits;
}

function scanCrossTool(tools: McpTool[]): RuleHit[] {
  const findings: RuleHit[] = [];
  const caps = tools.map((t) => ({ tool: t, caps: classifyToolCapabilities(t) }));

  const readers = caps.filter((c) => c.caps.has("filesystem_read") || c.caps.has("secrets"));
  const senders = caps.filter((c) => c.caps.has("network_out"));
  const execTools = caps.filter((c) => c.caps.has("code_exec"));

  if (readers.length > 0 && senders.length > 0) {
    findings.push({
      ruleId: "chain.read_to_network",
      severity: "high",
      category: "Cross-tool exfiltration path",
      title: "Sensitive read + outbound network combination",
      detail: `${readers.length} read/secret tool(s) and ${senders.length} outbound tool(s) could be chained for exfiltration.`,
      confidence: "high",
    });
  } else if (
    caps.some((c) => c.caps.has("filesystem_read")) &&
    caps.some((c) => c.caps.has("network_out"))
  ) {
    findings.push({
      ruleId: "chain.read_to_network",
      severity: "low",
      category: "Cross-tool exfiltration path",
      title: "Reader + outbound sender combination",
      detail: "Filesystem read and network tools coexist — review chaining risk.",
      confidence: "low",
    });
  }

  if (execTools.length > 0 && senders.length > 0) {
    findings.push({
      ruleId: "chain.exec_to_network",
      severity: "high",
      category: "Cross-tool attack path",
      title: "Code execution + outbound network combination",
      detail: "Shell/exec tools combined with outbound senders increase blast radius.",
      confidence: "high",
    });
  }

  const names = tools.map((t) => t.name).filter((n): n is string => !!n);
  const seen = new Map<string, string>();
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) {
      findings.push({
        ruleId: "tool.duplicate_name",
        severity: "high",
        category: "Tool shadowing",
        title: "Duplicate tool name",
        detail: `Tool "${name}" is declared more than once — routing ambiguity risk.`,
        toolName: name,
        confidence: "high",
      });
    }
    seen.set(key, name);
  }

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i]!;
      const b = names[j]!;
      if (a !== b && (a.startsWith(b) || b.startsWith(a)) && Math.min(a.length, b.length) >= 4) {
        findings.push({
          ruleId: "tool.name_prefix_shadow",
          severity: "medium",
          category: "Tool shadowing",
          title: "Similar tool names may shadow each other",
          detail: `"${a}" and "${b}" share a prefix — models may confuse them.`,
          confidence: "medium",
        });
      }
    }
  }

  return findings;
}

function scanPrompts(prompts: unknown[]): { hits: RuleHit[]; count: number } {
  const hits: RuleHit[] = [];
  let count = 0;
  for (const [i, prompt] of prompts.entries()) {
    if (!prompt || typeof prompt !== "object") continue;
    count++;
    const p = prompt as Record<string, unknown>;
    const base = `prompts[${i}]`;
    if (typeof p.name === "string") {
      hits.push(
        ...scanTextFragment(p.name, { category: "Prompt name", location: `${base}.name` }).map(
          (h) => ({ ...h, toolName: p.name as string }),
        ),
      );
    }
    for (const fragment of extractHumanText(prompt, base)) {
      hits.push(
        ...scanTextFragment(fragment.text, {
          category: "Prompt content",
          location: fragment.path,
          toolName: typeof p.name === "string" ? p.name : undefined,
        }),
      );
    }
  }
  return { hits, count };
}

function scanResources(resources: unknown[]): { hits: RuleHit[]; count: number } {
  const hits: RuleHit[] = [];
  let count = 0;
  for (const [i, resource] of resources.entries()) {
    if (!resource || typeof resource !== "object") continue;
    count++;
    const r = resource as Record<string, unknown>;
    const base = `resources[${i}]`;
    const uri = typeof r.uri === "string" ? r.uri : typeof r.url === "string" ? r.url : null;

    if (uri) {
      if (uri.startsWith("file://") || uri.includes("..")) {
        hits.push({
          ruleId: "resource.local_or_traversal",
          severity: "high",
          category: "Resource URI risk",
          title: "Sensitive or traversable resource URI",
          detail: `Resource URI "${uri}" may expose local files or path traversal.`,
          evidence: uri,
          confidence: "high",
          location: `${base}.uri`,
        });
      }
      if (/https?:\/\//.test(uri)) {
        hits.push({
          ruleId: "resource.remote_uri",
          severity: "low",
          category: "Resource URI",
          title: "Remote resource URI",
          detail: "Server exposes a remote resource endpoint.",
          evidence: uri,
          confidence: "medium",
          location: `${base}.uri`,
        });
      }
    }

    for (const fragment of extractHumanText(resource, base)) {
      hits.push(...scanTextFragment(fragment.text, { category: "Resource", location: fragment.path }));
    }
  }
  return { hits, count };
}

function scanServerLevelFields(manifest: McpManifest): RuleHit[] {
  const hits: RuleHit[] = [];
  const fields = ["description", "instructions", "systemPrompt", "readme", "documentation"] as const;
  for (const field of fields) {
    const val = manifest[field];
    if (typeof val === "string" && val.trim()) {
      hits.push(
        ...scanTextFragment(val, {
          category: `Server ${field}`,
          location: field,
        }),
      );
    }
  }
  if (manifest.serverInfo && typeof manifest.serverInfo === "object") {
    for (const fragment of extractHumanText(manifest.serverInfo, "serverInfo")) {
      hits.push(
        ...scanTextFragment(fragment.text, {
          category: "Server info",
          location: fragment.path,
        }),
      );
    }
  }
  return hits;
}

function applyPolicy(findings: Finding[], policy?: ScannerPolicy): Finding[] {
  return findings
    .filter((f) => {
      if (!policy?.disabledRules?.length) return true;
      return !policy.disabledRules.some(
        (rule) => rule === f.ruleId || rule === f.title,
      );
    })
    .map((f) => {
      let severity = f.severity;
      if (f.ruleId && policy?.severityOverrides?.[f.ruleId]) {
        severity = policy.severityOverrides[f.ruleId]!;
      } else if (policy?.severityOverrides?.[f.title]) {
        severity = policy.severityOverrides[f.title]!;
      }
      if (
        policy?.blockedCapabilities?.some(
          (cap) =>
            f.detail.toLowerCase().includes(cap.toLowerCase()) ||
            f.title.toLowerCase().includes(cap.toLowerCase()) ||
            (f.evidence ?? "").toLowerCase().includes(cap.toLowerCase()),
        )
      ) {
        severity = "critical";
      }
      return severity === f.severity ? f : { ...f, severity };
    });
}

function dedupeFindings(findings: Finding[]): Finding[] {
  const seen = new Set<string>();
  return findings.filter((f) => {
    const key = `${f.toolName ?? ""}::${f.ruleId ?? f.title}::${f.location ?? ""}::${f.evidence ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function computeScore(findings: Finding[]): number {
  const ruleCounts = new Map<string, number>();
  let penalty = 0;

  for (const f of findings) {
    const ruleKey = `${f.toolName ?? "server"}::${f.ruleId ?? f.title}`;
    const count = ruleCounts.get(ruleKey) ?? 0;
    if (count >= 1) continue;
    ruleCounts.set(ruleKey, count + 1);

    const conf = f.confidence ?? "medium";
    const weight = SEVERITY_WEIGHT[f.severity] * CONFIDENCE_MULTIPLIER[conf];
    penalty += weight;
  }

  return Math.max(0, Math.min(100, Math.round(100 - penalty)));
}

export function runDetectionEngine(
  manifest: McpManifest,
  policy?: ScannerPolicy,
): { findings: Finding[]; score: number; coverage: ScanCoverage } {
  const tools = Array.isArray(manifest.tools) ? manifest.tools : [];
  const prompts = Array.isArray(manifest.prompts) ? manifest.prompts : [];
  const resources = Array.isArray(manifest.resources) ? manifest.resources : [];

  const rawHits: RuleHit[] = [];
  let schemaFieldsScanned = 0;
  let textFragmentsScanned = 0;

  rawHits.push(...scanServerLevelFields(manifest));

  for (const t of tools) {
    rawHits.push(...scanToolName(t.name));
    if (typeof t.description === "string" && t.description.trim()) {
      textFragmentsScanned++;
      rawHits.push(
        ...scanTextFragment(t.description, {
          toolName: t.name,
          category: "Tool description",
          location: "description",
          surface: "prose",
        }),
      );
    }
    rawHits.push(...scanSplitFieldInjection(t));
    const schemaHits = scanSchema(t.name, t.inputSchema);
    schemaFieldsScanned += extractHumanText(t.inputSchema ?? {}, "inputSchema").length;
    rawHits.push(...schemaHits);
  }

  const promptResult = scanPrompts(prompts);
  rawHits.push(...promptResult.hits);
  textFragmentsScanned += promptResult.count;

  const resourceResult = scanResources(resources);
  rawHits.push(...resourceResult.hits);
  textFragmentsScanned += resourceResult.count;

  rawHits.push(...scanCrossTool(tools));

  if (tools.length === 0) {
    rawHits.push({
      ruleId: "manifest.no_tools",
      severity: "info",
      category: "Manifest",
      title: "No tools found",
      detail: "Paste a tools/list response or full server manifest.",
      confidence: "high",
    });
  }

  const findings = applyPolicy(dedupeFindings(rawHits.map(hit)), policy);
  const score = computeScore(findings);

  return {
    findings: findings.sort(
      (a, b) => SEVERITY_WEIGHT[b.severity] - SEVERITY_WEIGHT[a.severity],
    ),
    score,
    coverage: {
      toolsScanned: tools.length,
      promptsScanned: promptResult.count,
      resourcesScanned: resourceResult.count,
      schemaFieldsScanned,
      textFragmentsScanned,
      rulesVersion: ENGINE_VERSION,
    },
  };
}
