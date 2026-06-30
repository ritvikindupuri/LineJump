import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  BookOpen,
  Terminal,
  Shield,
  FileText,
  Lock,
  GitBranch,
  Layers,
  Cpu,
  ArrowLeft,
  ChevronRight,
  Info,
  ShieldAlert,
  FileSpreadsheet,
  Settings,
  Flame,
  CheckCircle,
  Database,
  Brain
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { LinejumpLogo } from "../components/linejump-logo";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title: "Documentation — LineJump" },
      {
        name: "description",
        content: "Comprehensive security & governance documentation for the LineJump MCP Stdio Proxy Platform.",
      },
    ],
  }),
  component: DocsPage,
});

const ease = [0.16, 1, 0.3, 1] as const;

function Section({ title, children, id }: { title: string; children: React.ReactNode; id: string }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.5, ease }}
      id={id}
      className="mb-16 scroll-mt-20"
    >
      <h2 className="text-2xl font-bold tracking-tight mb-6 text-foreground">{title}</h2>
      {children}
    </motion.section>
  );
}

const PIPELINE_STAGES = [
  {
    id: "client-req",
    label: "1. Client Request",
    actor: "LLM Client (e.g. Claude Desktop)",
    desc: "The host chat application issues a tool call request via JSON-RPC stdio streams to execute a system command.",
    json: `{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "write_query",
    "arguments": {
      "sql": "SELECT * FROM users; DROP TABLE logs;"
    }
  },
  "id": 42
}`,
    checks: ["DLP Parameter Parsing", "Command Validation"],
    color: "border-blue-500/20 bg-blue-500/5 text-blue-500"
  },
  {
    id: "proxy-pre",
    label: "2. Proxy Gate (Pre-Flight)",
    actor: "LineJump Stdio Wrapper",
    desc: "LineJump intercepts the request stream. It inspects parameters for credential leaks or forbidden SQL sequences, and verifies if the schema hash has security approval.",
    json: `// DLP Guard Verdict: BLOCKED
// Reason: SQL injection threat detected in 'sql' argument.
// Action: Return standard JSON-RPC error -32602, prevent command execution.`,
    checks: ["TOFU Pinning", "DLP Regex Guards", "Subprocess Isolation"],
    color: "border-amber-500/20 bg-amber-500/5 text-amber-500"
  },
  {
    id: "server-exec",
    label: "3. Server Execution",
    actor: "MCP Server (Downstream)",
    desc: "If approved, the command is forwarded to the downstream server stdout. In this blocked case, the execution is bypassed entirely, shielding the database.",
    json: `// [Downstream MCP Process bypassed]
// No command written to server stdin.
// Local infrastructure protected.`,
    checks: ["Local Shell Protection"],
    color: "border-purple-500/20 bg-purple-500/5 text-purple-500"
  },
  {
    id: "proxy-post",
    label: "4. Proxy Gate (Post-Flight)",
    actor: "LineJump Interceptor",
    desc: "For successful runs, LineJump intercepts the server stdout. It strips ANSI escape character codes and inspects the payload for prompt injection hijacking phrases.",
    json: `// Quarantine Check: ACTIVE
// ANSI escape codes: STRIPPED
// Prompt injection checks: PASSED`,
    checks: ["ANSI Character Stripping", "Output Quarantine Check"],
    color: "border-rose-500/20 bg-rose-500/5 text-rose-500"
  },
  {
    id: "client-resp",
    label: "5. Safe Client Delivery",
    actor: "LLM Client",
    desc: "The client receives either the sanitized result or a quarantine/DLP error block, preserving the LLM context window.",
    json: `{
  "jsonrpc": "2.0",
  "error": {
    "code": -32602,
    "message": "[LineJump SECURITY ALERT: SQL injection vector blocked]"
  },
  "id": 42
}`,
    checks: ["Context Window Cleanliness"],
    color: "border-green-500/20 bg-green-500/5 text-green-500"
  }
];

function InteractivePipeline() {
  const [activeStage, setActiveStage] = useState(0);

  const stage = PIPELINE_STAGES[activeStage];

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-6 sm:p-8 my-8 shadow-sm">
      <h3 className="text-base font-semibold mb-4 text-foreground flex items-center gap-2">
        <Cpu className="h-4.5 w-4.5 text-accent" />
        Interactive Interception Pipeline Simulator
      </h3>
      <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
        Click through the stages of a tool call request below to trace the stdio data stream and view how LineJump intercepts and gates execution.
      </p>

      {/* Stage indicators */}
      <div className="grid grid-cols-5 gap-2 mb-8">
        {PIPELINE_STAGES.map((s, idx) => {
          const isActive = idx === activeStage;
          return (
            <button
              key={s.id}
              onClick={() => setActiveStage(idx)}
              className={`text-center py-2.5 px-1.5 rounded-lg border transition-all cursor-pointer outline-none ${
                isActive
                  ? "border-foreground bg-foreground/5 text-foreground font-semibold"
                  : "border-border/60 hover:border-border text-muted-foreground hover:text-foreground text-xs"
              }`}
            >
              <div className="text-[10px] uppercase font-mono tracking-wider opacity-60">Step</div>
              <div className="text-sm mt-0.5">0{idx + 1}</div>
            </button>
          );
        })}
      </div>

      {/* Interactive Detail Box */}
      <AnimatePresence mode="wait">
        <motion.div
          key={stage.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.25, ease }}
          className="grid gap-6 md:grid-cols-2 border border-border/50 rounded-xl bg-background/50 p-5"
        >
          <div>
            <span className={`text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded border ${stage.color}`}>
              {stage.actor}
            </span>
            <h4 className="text-sm font-semibold mt-3 text-foreground">{stage.label}</h4>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{stage.desc}</p>
            
            <div className="mt-5">
              <span className="text-[10px] font-semibold text-foreground uppercase tracking-widest block mb-2">Checks Active</span>
              <div className="flex flex-wrap gap-1.5">
                {stage.checks.map((chk) => (
                  <span key={chk} className="text-[9.5px] bg-secondary/80 border border-border/40 px-2 py-1 rounded text-foreground font-mono">
                    {chk}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col rounded-lg border border-border/40 bg-card overflow-hidden">
            <div className="border-b border-border/20 bg-background/60 px-4 py-2 text-[10px] font-mono text-muted-foreground">
              stdio stream segment
            </div>
            <pre className="p-4 overflow-x-auto text-[11px] font-mono leading-relaxed text-foreground/90 flex-1 whitespace-pre-wrap">
              <code>{stage.json}</code>
            </pre>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function DocsPage() {
  const sections = [
    { id: "platform-overview", label: "Platform Overview", icon: BookOpen },
    { id: "interception-pipeline", label: "Interception Pipeline", icon: Cpu },
    { id: "safefetch-inspector", label: "SafeFetch SSRF Guard", icon: Shield },
    { id: "attack-paths", label: "Attack Path Modeling", icon: Flame },
    { id: "drift-governance", label: "Drift Governance", icon: Lock },
    { id: "policy-packs", label: "Policy Packs", icon: Settings },
    { id: "mcp-bom", label: "MCP-BOM Sheets", icon: FileSpreadsheet },
    { id: "quarantine-dlp", label: "DLP & Quarantine", icon: ShieldAlert },
    { id: "cli-ci", label: "CLI & CI Integration", icon: GitBranch },
  ];

  const [activeId, setActiveId] = useState("platform-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0.1 }
    );

    sections.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Sticky Header */}
      <header className="sticky top-0 z-30 border-b border-border/30 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <LinejumpLogo size={22} className="text-foreground" />
            <span className="text-[15px] font-medium tracking-tight">LineJump</span>
          </Link>
          <Link to="/app">
            <Button variant="outline" size="sm" className="gap-1.5 text-xs font-medium tracking-tight">
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex gap-12">
          {/* Sidebar Navigation */}
          <nav className="hidden w-56 shrink-0 lg:block">
            <div className="sticky top-20 space-y-1">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Documentation</p>
              {sections.map((s) => {
                const isActive = s.id === activeId;
                return (
                  <a
                    key={s.id}
                    href={`#${s.id}`}
                    onClick={(e) => {
                      e.preventDefault();
                      document.getElementById(s.id)?.scrollIntoView({ behavior: "smooth" });
                      setActiveId(s.id);
                    }}
                    className={`flex items-center gap-2 rounded-md px-3 py-1.5 text-[13px] transition-all ${
                      isActive
                        ? "font-medium text-foreground bg-accent/10 border-l-2 border-accent rounded-l-none pl-2.5"
                        : "text-muted-foreground hover:text-foreground hover:bg-secondary/45 pl-3"
                    }`}
                  >
                    <s.icon className={`h-3.5 w-3.5 shrink-0 ${isActive ? "text-accent" : ""}`} />
                    {s.label}
                  </a>
                );
              })}
            </div>
          </nav>

          {/* Main Content Area */}
          <div className="min-w-0 flex-1">
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease }}
            >
              <h1 className="text-3xl font-bold tracking-tight">Technical Documentation</h1>
              <p className="mt-2 text-muted-foreground text-sm leading-relaxed max-w-2xl">
                A comprehensive guide to configuring, auditing, and executing governance sign-offs on Model Context Protocol (MCP) servers using the LineJump platform.
              </p>
            </motion.div>

            <div className="mt-12">
              
              <Section title="Platform Overview" id="platform-overview">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    <strong>LineJump</strong> is an enterprise-grade security review, wrapper, and approval platform designed specifically for the <strong>Model Context Protocol (MCP)</strong> standard.
                  </p>
                  <p>
                    AI agents are highly vulnerable to prompt injections originating from tools, untrusted data sources, or malicious server configurations. A simple tool name description override can trick your LLM host (e.g. Claude Desktop, Cursor, Custom Agents) into executing dangerous commands—an exploit vector known as <strong>line-jumping</strong>.
                  </p>
                  <p>
                    LineJump secures your agent environment by acting as a transparent stdio command-line proxy wrapping downstream servers, alongside a comprehensive web governance panel that handles:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-3 mt-4">
                    <Card className="p-4 bg-card/40 border-border/60">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Lock className="h-3.5 w-3.5 text-accent" />
                        TOFU Change Approval
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                        Enforce Trust-On-First-Use. Pins tool schemas and mandates security signatures for modified schemas before they bypass proxy filters.
                      </p>
                    </Card>
                    <Card className="p-4 bg-card/40 border-border/60">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Shield className="h-3.5 w-3.5 text-accent" />
                        Outbound SSRF Shield
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                        Blocks Server-Side Request Forgery by tracing redirect hops and verifying DNS resolves away from internal subnets.
                      </p>
                    </Card>
                    <Card className="p-4 bg-card/40 border-border/60">
                      <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                        <Brain className="h-3.5 w-3.5 text-accent" />
                        Gemini Deep Scan
                      </h4>
                      <p className="text-[11px] text-muted-foreground mt-1 leading-normal">
                        Leverages Gemini 2.5 Pro to trace subtle prompt injections, capability mismatches, and social engineering in tool descriptions.
                      </p>
                    </Card>
                  </div>
                </div>
              </Section>

              <Section title="Interception Pipeline Flow" id="interception-pipeline">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    LineJump wraps downstream server subprocess streams. When an AI client makes a query, LineJump intercepts the stdin/stdout pipes, runs security filters, and passes clean payloads to prevent hijacking.
                  </p>
                  <InteractivePipeline />
                </div>
              </Section>

              <Section title="SafeFetch SSRF Guard" id="safefetch-inspector">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Exposing remote HTTP servers invites Server-Side Request Forgery (SSRF). The **SafeFetch Inspector** enforces a zero-trust retrieval process when validating hosted manifest URLs.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">SSRF Defense Logic</h4>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li><strong>Active DNS Resolution</strong>: Prior to dispatching GET requests, LineJump resolves the host domain name into raw IPv4 records.</li>
                    <li><strong>Manual Hop Auditing</strong>: Automated HTTP library redirect loops can bypass standard subnet checks via malicious redirects. SafeFetch manually catches 301/302 headers, intercepts the target redirect URL, and re-runs DNS checks on the new host *at each hop* (capped at 5 hops).</li>
                    <li><strong>Subnet Verification</strong>: Instantly blocks queries where resolved IPs point to loopbacks (`127.0.0.1`), LAN private ranges (`10.x.x.x`, `192.168.x.x`), or cloud metadata paths (`169.254.169.254`).</li>
                  </ul>
                </div>
              </Section>

              <Section title="Attack Path Modeling" id="attack-paths">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Traditional scanners alert on isolated parameters. LineJump calculates the risk of **Capability Chaining**—where the LLM uses multiple innocent tools to exfiltrate private data.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">Dangerous Double-Vector Chains</h4>
                  <p>
                    If a server exposes a tool with filesystem read scopes alongside a tool with outbound networking scopes (e.g. webhooks, POST triggers), LineJump flags this as a critical exfiltration path:
                  </p>
                  <pre className="overflow-x-auto rounded-md bg-muted/50 p-4 text-[11.5px] font-mono text-foreground/80 leading-relaxed">
                    {"LLM Chat Context --> Reader Tool (read_file) --> Exfiltration Buffer --> Sender Tool (post_log) --> Attacker URL"}
                  </pre>
                  <p className="text-xs">
                    This visualization highlights vulnerable exfiltration paths to reviewers before the server is approved in the environment.
                  </p>
                </div>
              </Section>

              <Section title="Drift Governance" id="drift-governance">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    In active CI/CD pipelines, servers update frequently. The **Drift Governance** page calculates schema differences and lets administrators authorize changes securely.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">The Approval Cycle</h4>
                  <ol className="list-decimal pl-5 space-y-2 text-xs">
                    <li><strong>Trust-On-First-Use (TOFU)</strong>: When a server registers, it is pinned as `pending`. LineJump redacts tool descriptions in Client `tools/list` returns to prevent LLM triggers until approved.</li>
                    <li><strong>Drift Analysis</strong>: Any schema modifications (modified parameter, added/removed tools) triggers a Drift warning.</li>
                    <li><strong>Sign-off</strong>: Reviewers examine side-by-side diffs and click **Approve & Sign Manifest**, saving the hash signature into SQLite `manifest_approvals`.</li>
                    <li><strong>Bypass Verification</strong>: Verified signatures allow tool calls to execute through the stdio proxy without restriction.</li>
                  </ol>
                </div>
              </Section>

              <Section title="Policy Packs" id="policy-packs">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Customize your security threshold with **Policy Packs**. You can toggle pre-configured templates that dynamically recalculate safety ratings and severity overrides:
                  </p>
                  <div className="grid gap-3 sm:grid-cols-2 mt-4 text-xs">
                    <div className="border border-border/60 bg-card/25 p-3 rounded-lg">
                      <span className="font-semibold text-foreground block">Strict Enterprise</span>
                      <span className="text-muted-foreground text-[11px] mt-1 block">Escalates filesystem modifications and subprocess triggers (e.g. bash, exec) to critical failures.</span>
                    </div>
                    <div className="border border-border/60 bg-card/25 p-3 rounded-lg">
                      <span className="font-semibold text-foreground block">No External Network</span>
                      <span className="text-muted-foreground text-[11px] mt-1 block">Automatically flags any tool containing URL, HTTP, or outbound webhook parameters as critical.</span>
                    </div>
                    <div className="border border-border/60 bg-card/25 p-3 rounded-lg">
                      <span className="font-semibold text-foreground block">Developer Friendly</span>
                      <span className="text-muted-foreground text-[11px] mt-1 block">Suppresses minor warnings, allowing fast local iteration without strict governance locks.</span>
                    </div>
                    <div className="border border-border/60 bg-card/25 p-3 rounded-lg">
                      <span className="font-semibold text-foreground block">Local Filesystem Only</span>
                      <span className="text-muted-foreground text-[11px] mt-1 block">Prohibits network operations completely but grants baseline file reading permissions.</span>
                    </div>
                  </div>
                </div>
              </Section>

              <Section title="MCP-BOM (Bill of Materials) Sheets" id="mcp-bom">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Maintain a rigorous software inventory. LineJump generates an **MCP-BOM** sheet for security compliance audits.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">BOM Properties</h4>
                  <ul className="list-disc pl-5 space-y-2 text-xs">
                    <li><strong>Tool Signatures</strong>: Computes tamper-evident polynomial hashes for each tool schema.</li>
                    <li><strong>Exposed Scopes</strong>: Categorizes capabilities (e.g. Read-only, Write/Send, Subprocess shell, Secrets access).</li>
                    <li><strong>Egress Domains</strong>: Extract all outbound domains and IP addresses embedded inside descriptions or schemas.</li>
                    <li><strong>Exporters</strong>: Download the completed inventory spreadsheet as JSON or copy a pre-formatted Markdown table directly into your audit logs.</li>
                  </ul>
                </div>
              </Section>

              <Section title="Data Loss Prevention (DLP) & Output Quarantine" id="quarantine-dlp">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Protect credentials and catch prompt injections returning in stdout.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">Pre-Execution DLP Guard</h4>
                  <p className="text-xs">
                    Scans tool call arguments before they hit the server. If it matches path traversal characters (e.g. `../../.env`, `/etc/passwd`) or API key and password variables, the call is blocked immediately, returning JSON-RPC error -32602 to the client.
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">Post-Execution Output Quarantine</h4>
                  <p className="text-xs">
                    Scans response payloads. If prompt injection strings are found (e.g. `ignore previous instructions`), the output is placed in quarantine, and a security alert warning is returned to the model context. Reviewers can release quarantined items inside the console.
                  </p>
                </div>
              </Section>

              <Section title="CLI & CI Integration" id="cli-ci">
                <div className="prose-sm max-w-none text-muted-foreground space-y-4 leading-relaxed text-[13.5px]">
                  <p>
                    Gate production deployments by running LineJump checks inside your CI pipelines (GitHub Actions, GitLab CI).
                  </p>
                  <h4 className="text-sm font-semibold text-foreground mt-4">CI Command Execution</h4>
                  <div className="rounded-lg border border-border/50 bg-card/30 p-4 font-mono text-xs text-foreground/90">
                    <p className="text-muted-foreground"># Run offline static check and enforce security bounds</p>
                    <p className="mt-1">npx linejump scan ./mcp-manifest.json \</p>
                    <p className="pl-4">--max-critical=0 \</p>
                    <p className="pl-4">--max-high=1 \</p>
                    <p className="pl-4">--min-score=70</p>
                  </div>
                  <p className="text-xs mt-3">
                    If the manifest score falls below the threshold or contains forbidden critical vulnerabilities, the script exits with code `1`, causing the pipeline stage to fail and block deployment.
                  </p>
                </div>
              </Section>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
