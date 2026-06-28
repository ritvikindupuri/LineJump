import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScanLine, Shield, FileText, Download,
  Share2, Mail, Copy, RefreshCw, ArrowLeft,
  Link2, Terminal, Brain, Layers, Activity, Lock, Eye, Trash, Check, AlertTriangle, ShieldCheck, Info,
  GitFork, FileSpreadsheet, CheckCircle2 as CheckCircle
} from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "../components/ui/tooltip";
import {
  getProxyLogsFn,
  getPinnedToolsFn,
  approvePinnedToolFn,
  blockPinnedToolFn,
  getQuarantinedResponsesFn,
  releaseQuarantineFn,
  getManifestApprovalsFn,
  approveManifestFn,
  getLatestApprovedManifestFn
} from "../lib/proxy.functions";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Label } from "../components/ui/label";
import { scanManifest, parseManifestInput, type ScanReport, type Finding, type RiskSeverity } from "../lib/mcp-scanner";
import { downloadPdfReport, exportJsonReport } from "../lib/report-pdf";
import { shareByEmail, copyShareableLink } from "../lib/share";
import { evaluateCiCheck, DEFAULT_CI_CONFIG, generateCiCheckMarkdown, type CiCheckResult } from "../lib/ci-check";
import { useScanStore } from "../hooks/use-scan-store";
import { fetchMcpManifest } from "../lib/mcp-fetch.functions";
import { deepScanManifest, type DeepScanResult, type DeepScanFinding } from "../lib/deep-scan.functions";

export const Route = createFileRoute("/app")({
  component: AppPage,
});

const SEVERITY_COLORS: Record<RiskSeverity, string> = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  info: "bg-muted text-muted-foreground border-border",
};

function SeverityBadge({ severity }: { severity: RiskSeverity }) {
  return (
    <Badge variant="outline" className={`${SEVERITY_COLORS[severity]} text-[10px] font-medium uppercase tracking-wider px-2 py-0.5`}>
      {severity}
    </Badge>
  );
}

function ScanInput({ onScan }: { onScan: (report: ScanReport, raw: string) => void }) {
  const [url, setUrl] = useState("");
  const [manifestText, setManifestText] = useState("");
  const [scanning, setScanning] = useState(false);
  const [mode, setMode] = useState<"paste" | "url">("paste");
  const [error, setError] = useState("");

  const handleScan = async () => {
    setError("");
    let raw = manifestText;

    if (mode === "url") {
      if (!url.trim()) { setError("Enter a manifest URL"); return; }
      setScanning(true);
      try {
        const result = await fetchMcpManifest({ data: { url: url.trim() } });
        raw = result.raw;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Failed to fetch manifest";
        setError(msg);
        setScanning(false);
        return;
      }
      setScanning(false);
    } else {
      if (!raw.trim()) { setError("Paste a manifest JSON to scan"); return; }
    }

    try {
      const parsed = parseManifestInput(raw);
      const report = scanManifest(parsed);
      onScan(report, raw);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Invalid manifest");
    }
  };

  return (
    <Card className="overflow-hidden border-border/50">
      <div className="flex items-center gap-2 border-b border-border/30 bg-card/50 px-5 py-3">
        <ScanLine className="h-4 w-4 text-[#6C5CE7]" />
        <span className="text-sm font-medium">Scan MCP Server Manifest</span>
      </div>
      <div className="p-5">
        <Tabs value={mode} onValueChange={(v) => setMode(v as typeof mode)} className="mb-4">
          <TabsList className="h-9">
            <TabsTrigger value="paste" className="gap-1.5 text-xs">
              <FileText className="h-3.5 w-3.5" />
              Paste JSON
            </TabsTrigger>
            <TabsTrigger value="url" className="gap-1.5 text-xs">
              <Link2 className="h-3.5 w-3.5" />
              Fetch URL
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <AnimatePresence mode="wait">
          {mode === "paste" ? (
            <motion.div
              key="paste"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <Label className="text-xs text-muted-foreground">Paste MCP manifest or tools/list JSON</Label>
              <Textarea
                value={manifestText}
                onChange={(e) => setManifestText(e.target.value)}
                placeholder='{\n  "name": "my-server",\n  "version": "1.0.0",\n  "tools": [...]\n}'
                className="mt-1.5 min-h-[180px] font-mono text-xs"
              />
            </motion.div>
          ) : (
            <motion.div
              key="url"
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Label className="text-xs text-muted-foreground">Manifest URL (GET or MCP Streamable HTTP)</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-muted-foreground hover:text-foreground transition-colors outline-none cursor-pointer">
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="start" className="max-w-xs p-3 leading-relaxed bg-card text-foreground border border-border shadow-md rounded-lg z-50">
                      <div className="space-y-2 text-xs">
                        <p className="font-semibold text-foreground">How to get a hosted MCP Manifest URL</p>
                        <p className="text-[11px] text-muted-foreground leading-normal">
                          MCP servers run on either **Stdio** (local streams) or **HTTP** (SSE / remote). Expose manifests via two ways:
                        </p>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-[11px]">1. Dynamic HTTP SSE (POST):</p>
                          <p className="text-[10.5px] text-muted-foreground leading-normal">
                            Host the server (Node/Python SDK) on an endpoint (e.g. <code className="bg-muted px-1 py-0.5 rounded text-[10px]">https://mcp.yourcompany.com/mcp</code>). LineJump query calls <code className="bg-muted px-1 py-0.5 rounded text-[10px]">tools/list</code> directly.
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium text-foreground text-[11px]">2. Static Schema Hosting (GET):</p>
                          <p className="text-[10.5px] text-muted-foreground leading-normal">
                            Publish a static JSON file on a CDN or portal (e.g. <code className="bg-muted px-1 py-0.5 rounded text-[10px]">https://cdn.company.com/mcp-manifest.json</code>) and paste it here.
                          </p>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex gap-2">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/manifest.json"
                  className="flex-1 text-sm"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 text-xs text-destructive"
          >
            {error}
          </motion.p>
        )}

        <Button
          onClick={handleScan}
          disabled={scanning}
          size="sm"
          className="mt-4 w-full gap-2"
        >
          {scanning ? (
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Shield className="h-3.5 w-3.5" />
          )}
          {scanning ? "Scanning..." : "Run Security Scan"}
        </Button>
      </div>
    </Card>
  );
}

function ScoreRing({ score }: { score: number }) {
  const color = score >= 75 ? "#22c55e" : score >= 50 ? "#eab308" : "#ef4444";
  const r = 36;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx="44" cy="44" r={r} fill="none" stroke="oklch(0.9 0.02 78 / 0.3)" strokeWidth="6" />
        <motion.circle
          cx="44" cy="44" r={r}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circ}
          initial={{ strokeDashoffset: circ }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
          transform="rotate(-90 44 44)"
        />
        <text x="44" y="44" textAnchor="middle" dominantBaseline="central" className="fill-foreground text-lg font-bold" fontSize="16">
          {score}
        </text>
      </svg>
      <span className="text-[10px] font-medium text-muted-foreground">Safety Score</span>
    </div>
  );
}

function FindingCard({ finding }: { finding: Finding }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-border/50 bg-card/30 p-4"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <span className="text-xs text-muted-foreground">{finding.category}</span>
        </div>
        {finding.toolName && (
          <Badge variant="secondary" className="shrink-0 text-[10px]">{finding.toolName}</Badge>
        )}
      </div>
      <p className="text-sm font-medium">{finding.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
      {finding.evidence && (
        <div className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground break-all">
          {finding.evidence}
        </div>
      )}
    </motion.div>
  );
}

function DeepFindingCard({ finding }: { finding: DeepScanFinding }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border border-[#6C5CE7]/20 bg-[#6C5CE7]/[0.02] p-4"
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={finding.severity} />
          <span className="text-xs text-muted-foreground">{finding.category}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Brain className="h-3 w-3 text-[#6C5CE7]" />
          <span className="text-[9px] font-medium uppercase tracking-wider text-[#6C5CE7]">LLM</span>
          {finding.toolName && (
            <Badge variant="secondary" className="shrink-0 text-[10px]">{finding.toolName}</Badge>
          )}
        </div>
      </div>
      <p className="text-sm font-medium">{finding.title}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{finding.detail}</p>
      {finding.evidence && (
        <div className="mt-2 rounded-md bg-muted/50 px-2.5 py-1.5 font-mono text-[10px] text-muted-foreground break-all">
          {finding.evidence}
        </div>
      )}
      {finding.llmReasoning && (
        <div className="mt-2 flex gap-2 rounded-md border border-[#6C5CE7]/10 bg-[#6C5CE7]/[0.03] px-3 py-2">
          <Brain className="mt-0.5 h-3 w-3 shrink-0 text-[#6C5CE7]" />
          <p className="text-[10px] leading-relaxed text-muted-foreground">{finding.llmReasoning}</p>
        </div>
      )}
    </motion.div>
  );
}

function ReportView({ report, rawManifest, onBack }: { report: ScanReport; rawManifest: string; onBack: () => void }) {
  const [shareMenuOpen, setShareMenuOpen] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [ciResult, setCiResult] = useState<CiCheckResult | null>(null);
  const [deepResult, setDeepResult] = useState<DeepScanResult | null>(null);
  const [deepScanning, setDeepScanning] = useState(false);
  const [findingView, setFindingView] = useState<"regex" | "llm" | "all">("all");

  // Enterprise Governance States
  const [activePolicy, setActivePolicy] = useState("default");
  const [reportState, setReportState] = useState(report);
  const [workspaceTab, setWorkspaceTab] = useState("findings");

  // Drift Governance approvals lists
  const [lastApproved, setLastApproved] = useState<any | null>(null);
  const [approvalsHistory, setApprovalsHistory] = useState<any[]>([]);
  const [signing, setSigning] = useState(false);

  const loadApprovals = async () => {
    try {
      const latest = await getLatestApprovedManifestFn({ serverName: reportState.serverName });
      setLastApproved(latest);
      const list = await getManifestApprovalsFn({ serverName: reportState.serverName });
      setApprovalsHistory(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadApprovals();
  }, [reportState.serverName]);

  const handlePolicyChange = (policy: string) => {
    setActivePolicy(policy);
    try {
      const parsed = parseManifestInput(rawManifest);
      const updated = scanManifest(parsed, policy);
      if (reportState.fetchReport) {
        updated.fetchReport = reportState.fetchReport;
      }
      setReportState(updated);
      // Reset CI check evaluation state
      setCiResult(null);
    } catch (e) {
      console.error("Re-scan fail on policy switch:", e);
    }
  };

  const handleSignManifest = async () => {
    setSigning(true);
    try {
      const clientHash = "h-" + Math.abs(Array.from(rawManifest).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)).toString(16);
      await approveManifestFn({
        serverName: reportState.serverName,
        manifestHash: clientHash,
        manifestJson: rawManifest,
        approvedBy: "security_admin"
      });
      await loadApprovals();
      alert("Manifest version approved and signed off successfully.");
    } catch (e) {
      console.error(e);
    } finally {
      setSigning(false);
    }
  };

  const criticalCount = reportState.findings.filter((f) => f.severity === "critical").length;
  const highCount = reportState.findings.filter((f) => f.severity === "high").length;

  const handleCopyLink = async () => {
    await copyShareableLink(reportState);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCiCheck = () => {
    const result = evaluateCiCheck(reportState.score, reportState.findings, DEFAULT_CI_CONFIG);
    setCiResult(result);
  };

  const handleDeepScan = async () => {
    setDeepScanning(true);
    try {
      const result = await deepScanManifest({ manifest: rawManifest, serverName: reportState.serverName });
      setDeepResult(result);
    } catch (e: unknown) {
      setDeepResult({
        findings: [{
          severity: "info",
          category: "LLM Error",
          title: "Deep scan failed",
          detail: e instanceof Error ? e.message : "Unknown error",
          llmReasoning: "",
        }],
        llmScore: -1,
        analysis: "Deep scan encountered an error.",
        model: "unknown",
        tokenUsage: { input: 0, output: 0 },
      });
    }
    setDeepScanning(false);
  };

  const handleDownloadPdf = async () => {
    await downloadPdfReport(reportState, rawManifest);
  };

  const downloadBomJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(reportState.bom, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `${reportState.serverName}-mcp-bom.json`);
    dlAnchorElem.click();
  };

  const copyBomMarkdown = () => {
    let md = `## MCP-BOM: ${reportState.serverName}\n\n`;
    md += `| Tool Name | SHA-256 Hash | Capabilities | External Domains | Safety Score |\n`;
    md += `| --- | --- | --- | --- | --- |\n`;
    reportState.bom?.forEach((item: any) => {
      md += `| ${item.name} | \`${item.approvedHash}\` | ${item.capabilities.join(", ") || "None"} | ${item.externalDomains.join(", ") || "None"} | ${item.safetyScore}/100 |\n`;
    });
    navigator.clipboard.writeText(md);
    alert("BOM Markdown table copied to clipboard!");
  };

  const combinedScore = deepResult && deepResult.llmScore >= 0
    ? Math.round((reportState.score + deepResult.llmScore) / 2)
    : reportState.score;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{reportState.serverName}</h2>
            <p className="text-xs text-muted-foreground">{reportState.toolCount} tool(s) · {reportState.findings.length} regex + {deepResult?.findings.length ?? 0} LLM finding(s)</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
          {/* Policy Pack Select Box */}
          <div className="flex items-center gap-2 mr-2">
            <Label htmlFor="policy-select" className="text-[11px] text-muted-foreground font-semibold">Policy Profile:</Label>
            <select
              id="policy-select"
              value={activePolicy}
              onChange={(e) => handlePolicyChange(e.target.value)}
              className="h-8 rounded-md border border-border bg-card px-2.5 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-[#6C5CE7] hover:bg-card/80 transition-colors"
            >
              <option value="default">Default Profile</option>
              <option value="strict">Strict Enterprise</option>
              <option value="dev-friendly">Developer Friendly</option>
              <option value="no-network">No External Network</option>
              <option value="local-only">Local Filesystem Only</option>
            </select>
          </div>

          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportJsonReport(reportState)}>
            <FileText className="h-3.5 w-3.5" />
            JSON
          </Button>
          <div className="relative">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => setShareMenuOpen(!shareMenuOpen)}>
              <Share2 className="h-3.5 w-3.5" />
              Share
            </Button>
            {shareMenuOpen && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute right-0 top-10 z-50 w-48 rounded-lg border border-border bg-card p-2 shadow-xl"
              >
                <button onClick={handleCopyLink} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted">
                  {copySuccess ? <Copy className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
                  {copySuccess ? "Copied!" : "Copy shareable link"}
                </button>
                <button onClick={() => shareByEmail(reportState)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted">
                  <Mail className="h-3.5 w-3.5" />
                  Share via Email
                </button>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Score + Counts */}
      <div className="flex gap-6">
        <div className="flex items-center gap-3">
          <ScoreRing score={combinedScore} />
          {deepResult && deepResult.llmScore >= 0 && (
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Combined</span>
              <div className="flex gap-2 text-[10px]">
                <span className="text-foreground">{reportState.score}r</span>
                <span className="text-[#6C5CE7]">{deepResult.llmScore}l</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-3">
          {([
            ["Critical", criticalCount + (deepResult ? deepResult.findings.filter(f => f.severity === "critical").length : 0), "text-red-500 bg-red-500/10"],
            ["High", highCount + (deepResult ? deepResult.findings.filter(f => f.severity === "high").length : 0), "text-orange-500 bg-orange-500/10"],
            ["Medium", reportState.findings.filter(f => f.severity === "medium").length + (deepResult ? deepResult.findings.filter(f => f.severity === "medium").length : 0), "text-yellow-500 bg-yellow-500/10"],
            ["Low", reportState.findings.filter(f => f.severity === "low").length + (deepResult ? deepResult.findings.filter(f => f.severity === "low").length : 0), "text-blue-500 bg-blue-500/10"],
          ] as const).map(([label, count, cls]) => (
            <div key={label} className={`flex flex-col items-center justify-center rounded-lg border border-border/50 px-5 py-3 ${cls.split(" ").slice(1).join(" ")}`}>
              <span className="text-lg font-bold">{count}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SafeFetch Inspector panel if present */}
      {reportState.fetchReport && (
        <Card className="border-border/50 overflow-hidden">
          <div className="flex items-center gap-2 border-b border-border/30 bg-muted/20 px-5 py-3">
            <ShieldCheck className="h-4 w-4 text-green-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">SafeFetch Inspector</span>
          </div>
          <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground">Resolved Address:</span>
                <span className="font-mono font-semibold">{reportState.fetchReport.resolvedIp}</span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground">Subnet Egress Check:</span>
                <span className={`font-semibold ${reportState.fetchReport.privateRangeCheck === "passed" ? "text-green-500" : "text-red-500"}`}>
                  {reportState.fetchReport.privateRangeCheck.toUpperCase()}
                </span>
              </div>
              <div className="flex justify-between border-b border-border/20 pb-1.5">
                <span className="text-muted-foreground">Cloud Metadata Shield:</span>
                <span className={`font-semibold ${reportState.fetchReport.cloudMetadataCheck === "passed" ? "text-green-500" : "text-red-500"}`}>
                  {reportState.fetchReport.cloudMetadataCheck.toUpperCase()}
                </span>
              </div>
              {reportState.fetchReport.tlsCertSummary && (
                <div className="flex justify-between border-b border-border/20 pb-1.5">
                  <span className="text-muted-foreground">TLS Connection Summary:</span>
                  <span>{reportState.fetchReport.tlsCertSummary.protocol} / {reportState.fetchReport.tlsCertSummary.issuer.split("/")[0]}</span>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">Redirect Chain Path:</span>
              <div className="space-y-1.5 font-mono text-[10px] bg-muted/40 p-2.5 border border-border/30 rounded max-h-[100px] overflow-y-auto">
                {reportState.fetchReport.redirectHops.map((hop: string, idx: number) => (
                  <div key={idx} className="flex gap-1.5 items-center truncate">
                    <span className="text-muted-foreground">{idx + 1}.</span>
                    <span className="truncate" title={hop}>{hop}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Deep Scan Card */}
      <Card className="overflow-hidden border-[#6C5CE7]/20">
        <div className="flex items-center justify-between border-b border-[#6C5CE7]/10 bg-[#6C5CE7]/[0.02] px-5 py-3">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#6C5CE7]" />
            <span className="text-sm font-medium">LLM Deep Scan</span>
            {deepResult && deepResult.llmScore >= 0 && (
              <Badge variant="outline" className="text-[9px] border-[#6C5CE7]/20 text-[#6C5CE7] bg-[#6C5CE7]/5 ml-2">
                {deepResult.model}
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`h-7 gap-1.5 text-xs border-[#6C5CE7]/30 ${deepScanning ? "opacity-50" : ""}`}
            onClick={handleDeepScan}
            disabled={deepScanning}
          >
            <Brain className={`h-3 w-3 ${deepScanning ? "animate-pulse" : ""}`} />
            {deepScanning ? "Analyzing..." : deepResult ? "Re-scan with LLM" : "Deep Scan with Claude"}
          </Button>
        </div>
        <div className="p-5">
          {!deepResult ? (
            <p className="text-xs text-muted-foreground">
              Run a deep semantic analysis using Claude. Catches social engineering, tone manipulation,
              hidden persuasion, and capability deception that regex scanners miss.
            </p>
          ) : deepResult.llmScore < 0 ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{deepResult.analysis}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">LLM Score</span>
                  <span className={`text-lg font-bold ${deepResult.llmScore >= 75 ? "text-green-500" : deepResult.llmScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                    {deepResult.llmScore}/100
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>Tokens: {deepResult.tokenUsage.input} in / {deepResult.tokenUsage.output} out</span>
                </div>
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground bg-muted/30 rounded-md p-3">
                {deepResult.analysis}
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* CI Check */}
      <Card className="overflow-hidden border-border/50">
        <div className="flex items-center justify-between border-b border-border/30 bg-card/50 px-5 py-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[#6C5CE7]" />
            <span className="text-sm font-medium">CI Pipeline Check</span>
          </div>
          <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={handleCiCheck}>
            <RefreshCw className="h-3 w-3" />
            Evaluate
          </Button>
        </div>
        <div className="p-5">
          {ciResult ? (
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${ciResult.passed ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
                {ciResult.passed ? "✓ PASSED" : "✗ FAILED"}
              </div>
              {!ciResult.passed && (
                <ul className="space-y-1">
                  {ciResult.failures.map((f, i) => (
                    <li key={i} className="text-xs text-destructive">{f}</li>
                  ))}
                </ul>
              )}
              <pre className="rounded-md bg-muted/50 p-3 text-[10px] leading-relaxed text-muted-foreground overflow-x-auto">
                {generateCiCheckMarkdown(ciResult)}
              </pre>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Run CI evaluation against default thresholds (maxCritical: 0, maxHigh: 1, minScore: 60).</p>
          )}
        </div>
      </Card>

      {/* Platform Workspace Tabs */}
      <Tabs value={workspaceTab} onValueChange={setWorkspaceTab} className="space-y-4">
        <div className="border-b border-border/30 pb-1">
          <TabsList className="h-9 bg-muted/20 border border-border/20 p-1 flex">
            <TabsTrigger value="findings" className="text-xs gap-1.5 flex-1">
              <Layers className="h-3.5 w-3.5" />
              Risk Findings ({reportState.findings.length})
            </TabsTrigger>
            <TabsTrigger value="path" className="text-xs gap-1.5 flex-1">
              <GitFork className="h-3.5 w-3.5" />
              Attack Path Graph
            </TabsTrigger>
            <TabsTrigger value="bom" className="text-xs gap-1.5 flex-1">
              <FileSpreadsheet className="h-3.5 w-3.5" />
              MCP-BOM Sheet
            </TabsTrigger>
            <TabsTrigger value="drift" className="text-xs gap-1.5 flex-1">
              <Shield className="h-3.5 w-3.5" />
              Drift Governance
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Tab Content: Risk Findings */}
        <TabsContent value="findings" className="space-y-3 focus-visible:outline-none">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Metadata Risk Alerts</h3>
            {deepResult && (
              <Tabs value={findingView} onValueChange={(v) => setFindingView(v as typeof findingView)} className="h-7">
                <TabsList className="h-7">
                  <TabsTrigger value="all" className="text-[10px] px-2.5 py-1">All</TabsTrigger>
                  <TabsTrigger value="regex" className="text-[10px] px-2.5 py-1">Regex</TabsTrigger>
                  <TabsTrigger value="llm" className="text-[10px] px-2.5 py-1">LLM</TabsTrigger>
                </TabsList>
              </Tabs>
            )}
          </div>
          <div className="space-y-2">
            {findingView === "regex" && reportState.findings.length === 0 && (
              <p className="text-sm text-muted-foreground">No regex findings detected.</p>
            )}
            {findingView === "llm" && (!deepResult || deepResult.findings.length === 0) && (
              <p className="text-sm text-muted-foreground">No LLM findings detected. {!deepResult ? "Run a deep scan first." : ""}</p>
            )}
            {findingView === "all" && reportState.findings.length === 0 && (!deepResult || deepResult.findings.length === 0) && (
              <p className="text-sm text-muted-foreground">No findings detected. This server appears clean.</p>
            )}
            {findingView !== "llm" && reportState.findings.map((f) => (
              <FindingCard key={f.id} finding={f} />
            ))}
            {findingView !== "regex" && deepResult?.findings.map((f, i) => (
              <DeepFindingCard key={`llm-${i}`} finding={f} />
            ))}
          </div>
        </TabsContent>

        {/* Tab Content: Attack Path Graph */}
        <TabsContent value="path" className="focus-visible:outline-none">
          <div className="p-6 border border-border/40 rounded-lg bg-card/20 space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 py-6">
              {/* LLM Client */}
              <div className="flex flex-col items-center p-3.5 rounded-lg border border-border/50 bg-muted/40 w-44 text-center">
                <Activity className="h-5 w-5 text-blue-500 mb-1.5" />
                <span className="text-xs font-semibold text-foreground">LLM Client Host</span>
                <span className="text-[10px] text-muted-foreground">Claude / Cursor</span>
              </div>

              <div className="text-muted-foreground font-mono text-sm hidden md:block">→</div>

              {/* Chained Tools */}
              <div className="flex flex-col gap-3">
                {reportState.attackPath?.nodes.filter(n => n.type === "tool").map(t => {
                  const hasInjection = reportState.attackPath?.edges.some(e => e.to === t.id && (e.severity === "critical" || e.severity === "high"));
                  return (
                    <div key={t.id} className={`flex flex-col items-center p-3 rounded-lg border w-48 text-center bg-card ${hasInjection ? "border-red-500/30 bg-red-500/[0.02]" : "border-border/50"}`}>
                      <Layers className="h-4 w-4 text-purple-500 mb-1" />
                      <span className="text-xs font-semibold truncate max-w-full text-foreground">{t.label}</span>
                      <span className="text-[9px] text-muted-foreground truncate max-w-full">{t.details}</span>
                      {hasInjection && (
                        <Badge variant="outline" className="mt-1.5 text-[8px] bg-red-500/10 text-red-500 border-red-500/20 px-1 py-0 uppercase">
                          Injection Vector
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>

              {reportState.attackPath?.nodes.some(n => n.type === "egress") && (
                <>
                  <div className="text-muted-foreground font-mono text-sm hidden md:block">→</div>
                  
                  {/* Egress Node */}
                  <div className="flex flex-col items-center p-3.5 rounded-lg border border-red-500/25 bg-red-500/[0.03] w-44 text-center">
                    <Shield className="h-5 w-5 text-red-500 mb-1.5" />
                    <span className="text-xs font-semibold text-red-500">Outbound Egress</span>
                    <span className="text-[10px] text-muted-foreground text-red-500/70">Exfiltration Point</span>
                  </div>
                </>
              )}
            </div>

            {/* Exploit details banner */}
            {reportState.findings.some(f => f.category.includes("exfiltration")) && (
              <div className="flex gap-2.5 p-4 rounded-lg border border-yellow-500/20 bg-yellow-500/5 text-xs text-yellow-600">
                <AlertTriangle className="h-4 w-4 shrink-0 text-yellow-500 mt-0.5" />
                <div>
                  <span className="font-semibold block mb-0.5">Dangerous Combinations (Exfiltration Mode):</span>
                  <span className="leading-relaxed">This server exposes both read-access commands (files, databases, web scraping) and network egress operations (HTTP fetch, email post, webhook publisher). If a user loads untrusted content causing prompt injection, the model could silently read internal files and post them to the external web.</span>
                </div>
              </div>
            )}
          </div>
        </TabsContent>

        {/* Tab Content: MCP-BOM */}
        <TabsContent value="bom" className="space-y-4 focus-visible:outline-none">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Bill of Materials Spreadsheet</h4>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={downloadBomJson} className="h-8 gap-1.5 text-xs">
                <Download className="h-3.5 w-3.5" />
                Download BOM (JSON)
              </Button>
              <Button variant="outline" size="sm" onClick={copyBomMarkdown} className="h-8 gap-1.5 text-xs">
                <Copy className="h-3.5 w-3.5" />
                Copy Markdown
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-border/50">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-muted/40 border-b border-border/30 text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Tool Name</th>
                    <th className="p-3">Tamper-evident Hash</th>
                    <th className="p-3">Capabilities</th>
                    <th className="p-3">Target Domains</th>
                    <th className="p-3 text-right">Safety Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/25">
                  {reportState.bom?.map((item: any) => (
                    <tr key={item.name} className="hover:bg-card/30">
                      <td className="p-3 font-semibold font-mono text-foreground truncate max-w-[150px]">{item.name}</td>
                      <td className="p-3 font-mono text-muted-foreground text-[10px]">{item.approvedHash}</td>
                      <td className="p-3 space-x-1">
                        {item.capabilities.length === 0 ? (
                          <span className="text-[10px] text-muted-foreground">Standard queries</span>
                        ) : (
                          item.capabilities.map((c: string) => (
                            <Badge key={c} variant="secondary" className="text-[9px] px-1.5 py-0">{c}</Badge>
                          ))
                        )}
                      </td>
                      <td className="p-3 font-mono text-red-500 text-[10.5px]">
                        {item.externalDomains.length === 0 ? (
                          <span className="text-muted-foreground text-[10px]">None</span>
                        ) : (
                          item.externalDomains.join(", ")
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <span className={`font-bold ${item.safetyScore >= 80 ? "text-green-500" : item.safetyScore >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                          {item.safetyScore}/100
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* Tab Content: Drift Governance */}
        <TabsContent value="drift" className="focus-visible:outline-none">
          <DiffGovernancePanel
            report={reportState}
            rawManifest={rawManifest}
            lastApproved={lastApproved}
            approvalsHistory={approvalsHistory}
            onApprove={handleSignManifest}
            signing={signing}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DiffGovernancePanel({
  report,
  rawManifest,
  lastApproved,
  approvalsHistory,
  onApprove,
  signing,
}: {
  report: ScanReport;
  rawManifest: string;
  lastApproved: any;
  approvalsHistory: any[];
  onApprove: () => void;
  signing: boolean;
}) {
  const currentHash = "h-" + Math.abs(Array.from(rawManifest).reduce((s, c) => Math.imul(31, s) + c.charCodeAt(0) | 0, 0)).toString(16);
  const isMatch = lastApproved && lastApproved.manifest_hash === currentHash;

  // Compile schema diff details
  const diffs: Array<{ type: "add" | "remove" | "modify"; name: string; detail: string }> = [];
  if (lastApproved) {
    try {
      const appv = JSON.parse(lastApproved.manifest_json);
      const appvTools = Array.isArray(appv.tools) ? appv.tools : [];
      const currTools = report.bom || [];

      for (const ct of currTools) {
        const at = appvTools.find((t: any) => t.name === ct.name);
        if (!at) {
          diffs.push({ type: "add", name: ct.name, detail: "New tool exposed in server." });
        } else {
          const descChanged = at.description !== ct.description;
          const schemaChanged = JSON.stringify(at.inputSchema ?? {}) !== JSON.stringify(ct.inputSchema ?? {});
          if (descChanged || schemaChanged) {
            diffs.push({
              type: "modify",
              name: ct.name,
              detail: descChanged && schemaChanged ? "Description & Schema parameters modified." : descChanged ? "Tool description modified." : "Schema parameters updated.",
            });
          }
        }
      }

      for (const at of appvTools) {
        const ct = currTools.find((t: any) => t.name === at.name);
        if (!ct) {
          diffs.push({ type: "remove", name: at.name || "unnamed", detail: "Tool removed from manifest." });
        }
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-semibold">Change Governance & Drift Check</h4>
            <p className="text-xs text-muted-foreground">Verify manifest schema drift against signed approvals.</p>
          </div>
          {lastApproved ? (
            isMatch ? (
              <Badge variant="outline" className="text-[10px] font-semibold text-green-500 bg-green-500/10 border-green-500/20 px-2 py-0.5 uppercase">
                Authorized Matches Approval
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 border-yellow-500/20 px-2 py-0.5 uppercase">
                Drift Detected Pending Approval
              </Badge>
            )
          ) : (
            <Badge variant="outline" className="text-[10px] font-semibold text-yellow-500 bg-yellow-500/10 border-yellow-500/20 px-2 py-0.5 uppercase">
              No Approved Version Found
            </Badge>
          )}
        </div>

        {/* Diff Result List */}
        {lastApproved && !isMatch && diffs.length > 0 && (
          <div className="space-y-2 bg-muted/40 p-3 rounded-lg border border-border/30">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Manifest Changes Diff:</span>
            <div className="space-y-1.5 text-xs">
              {diffs.map((d, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 ${d.type === "add" ? "bg-green-500/10 text-green-500 border border-green-500/25" : d.type === "remove" ? "bg-red-500/10 text-red-500 border border-red-500/25" : "bg-yellow-500/10 text-yellow-500 border border-yellow-500/25"}`}>
                    {d.type}
                  </span>
                  <div>
                    <span className="font-mono font-medium text-foreground">{d.name}</span>: <span className="text-muted-foreground">{d.detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {lastApproved && isMatch && (
          <div className="flex gap-2.5 items-center bg-green-500/5 text-green-500 p-3.5 rounded border border-green-500/15 text-xs">
            <CheckCircle className="h-4 w-4 shrink-0 text-green-500" />
            <div>
              <span className="font-semibold block">Version Authorized:</span>
              <span>This manifest matches the hash signed off on {new Date(lastApproved.approved_at).toLocaleString()} by <b>{lastApproved.approved_by}</b>. No drift detected.</span>
            </div>
          </div>
        )}

        {!isMatch && (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
            <p className="text-xs text-muted-foreground max-w-md">
              Sign off on this manifest configuration. Signed manifests bypass downstream stdio wrapper blocks and are marked as approved in production deployments.
            </p>
            <Button size="sm" onClick={onApprove} disabled={signing} className="h-8 shrink-0 text-xs bg-green-600 hover:bg-green-700 text-white font-medium">
              {signing ? "Signing..." : "Approve & Sign Manifest"}
            </Button>
          </div>
        )}
      </Card>

      {/* Approvals History List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Signed Approvals Trail</h4>
        <div className="space-y-1.5">
          {approvalsHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4 bg-muted/20 border border-border/40 rounded">
              No historical approvals recorded.
            </p>
          ) : (
            approvalsHistory.map((h) => (
              <Card key={h.id} className="border-border/40 p-3 flex justify-between items-center text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium text-muted-foreground">{h.manifest_hash}</span>
                    <Badge className="bg-green-500/10 text-green-500 border-none text-[9px] px-1 py-0 uppercase">Signed</Badge>
                  </div>
                  <p className="text-[10px] text-muted-foreground">Approved by {h.approved_by}</p>
                </div>
                <span className="text-muted-foreground text-[10px]">{new Date(h.approved_at).toLocaleString()}</span>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ProxyLogsView() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const result = await getProxyLogsFn({ limit: 50 });
      setLogs(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Proxy Audit Trail</h2>
          <p className="text-xs text-muted-foreground">Real-time log of agent tool calls intercepted by LineJump proxy.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadLogs} disabled={loading} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <div className="space-y-2">
        {logs.length === 0 ? (
          <Card className="border-border/50 p-8 text-center text-xs text-muted-foreground bg-card/10">
            No proxy logs recorded yet. Configure your MCP servers to use `linejump proxy`.
          </Card>
        ) : (
          logs.map((log) => {
            const isBlocked = log.status === "blocked";
            const isQuarantined = log.status === "quarantined";
            const statusColor = isBlocked ? "text-red-500 bg-red-500/10 border-red-500/20" : isQuarantined ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" : "text-green-500 bg-green-500/10 border-green-500/20";
            return (
              <Card key={log.id} className="border-border/40 p-4 transition-colors hover:bg-card/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold">{log.server_name}</span>
                      <span className="text-xs text-muted-foreground">/</span>
                      <span className="text-xs font-mono font-medium">{log.tool_name}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()} · {log.duration_ms}ms
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className={`text-[10px] font-medium uppercase tracking-wider ${statusColor}`}>
                      {log.status}
                    </Badge>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSelectedLog(log)}>
                      Inspect
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl border-border/50 p-6 shadow-2xl max-h-[85vh] overflow-y-auto bg-card">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-semibold">Inspect Tool Call</h3>
                <p className="text-xs text-muted-foreground">{selectedLog.server_name} / {selectedLog.tool_name}</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedLog(null)}>Close</Button>
            </div>
            <div className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Input Arguments</Label>
                <pre className="mt-1.5 rounded-md bg-muted p-3 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-[200px]">
                  {selectedLog.arguments}
                </pre>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground font-semibold">Response Output</Label>
                <pre className="mt-1.5 rounded-md bg-muted p-3 font-mono text-[11px] overflow-x-auto whitespace-pre-wrap max-h-[300px]">
                  {selectedLog.response}
                </pre>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

function SecurityGatekeeperView() {
  const [pinnedTools, setPinnedTools] = useState<any[]>([]);
  const [quarantined, setQuarantined] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [gatekeeperTab, setGatekeeperTab] = useState<"tofu" | "quarantine">("tofu");

  const loadData = async () => {
    setLoading(true);
    try {
      const [tools, quar] = await Promise.all([
        getPinnedToolsFn({}),
        getQuarantinedResponsesFn(),
      ]);
      setPinnedTools(tools);
      setQuarantined(quar);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleApprove = async (id: string) => {
    await approvePinnedToolFn({ id });
    await loadData();
  };

  const handleBlock = async (id: string) => {
    await blockPinnedToolFn({ id });
    await loadData();
  };

  const handleRelease = async (id: string) => {
    await releaseQuarantineFn({ id });
    await loadData();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Security Gatekeeper</h2>
          <p className="text-xs text-muted-foreground">Manage Trust-on-First-Use (TOFU) tool pinning and quarantined tool responses.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadData} disabled={loading} className="h-8 gap-1.5 text-xs">
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      <Tabs value={gatekeeperTab} onValueChange={(v) => setGatekeeperTab(v as any)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tofu" className="text-xs">Tool Pinning (TOFU)</TabsTrigger>
          <TabsTrigger value="quarantine" className="text-xs">Quarantine Center</TabsTrigger>
        </TabsList>

        <TabsContent value="tofu" className="mt-4 space-y-4">
          <div className="space-y-2">
            {pinnedTools.length === 0 ? (
              <Card className="border-border/50 p-8 text-center text-xs text-muted-foreground bg-card/10">
                No pinned tools. Pinned tools will appear here when an agent accesses an MCP server.
              </Card>
            ) : (
              pinnedTools.map((tool) => {
                const isPending = tool.status === "pending";
                const isApproved = tool.status === "approved";
                const statusColor = isApproved ? "text-green-500 bg-green-500/10 border-green-500/20" : isPending ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" : "text-red-500 bg-red-500/10 border-red-500/20";
                return (
                  <Card key={tool.id} className="border-border/40 p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{tool.server_name}</span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs font-mono font-medium">{tool.tool_name}</span>
                          <Badge variant="outline" className={`text-[9px] font-medium uppercase tracking-wider ml-1 px-1.5 py-0 ${statusColor}`}>
                            {tool.status}
                          </Badge>
                        </div>
                        <p className="text-xs font-medium text-foreground mt-1.5">{tool.description || "No description provided."}</p>
                        <p className="text-[10px] text-muted-foreground mt-1">Registered: {new Date(tool.created_at).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-500 hover:bg-green-500/5 hover:text-green-600 border-green-500/20" onClick={() => handleApprove(tool.id)}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" className="h-7 text-xs text-red-500 hover:bg-red-500/5 hover:text-red-600 border-red-500/20" onClick={() => handleBlock(tool.id)}>
                          Block
                        </Button>
                      </div>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>

        <TabsContent value="quarantine" className="mt-4 space-y-4">
          <div className="space-y-2">
            {quarantined.length === 0 ? (
              <Card className="border-border/50 p-8 text-center text-xs text-muted-foreground bg-card/10">
                Quarantine folder is empty. Sanitized and secure.
              </Card>
            ) : (
              quarantined.map((q) => {
                const isQuarantined = q.status === "quarantined";
                const statusColor = isQuarantined ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20" : "text-green-500 bg-green-500/10 border-green-500/20";
                return (
                  <Card key={q.id} className="border-border/40 p-4 space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold">{q.server_name}</span>
                          <span className="text-xs text-muted-foreground">/</span>
                          <span className="text-xs font-mono font-medium">{q.tool_name}</span>
                          <Badge variant="outline" className={`text-[9px] font-medium uppercase tracking-wider ml-1 px-1.5 py-0 ${statusColor}`}>
                            {q.status}
                          </Badge>
                        </div>
                        <p className="text-[11px] text-red-500 font-medium mt-1">Reason: {q.reason}</p>
                      </div>
                      {isQuarantined && (
                        <Button size="sm" variant="outline" className="h-7 text-xs text-green-500 border-green-500/20 hover:bg-green-500/5" onClick={() => handleRelease(q.id)}>
                          Release Content
                        </Button>
                      )}
                    </div>
                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground font-semibold">Quarantined Output Payload</Label>
                      <pre className="rounded bg-muted/60 p-2.5 font-mono text-[10.5px] leading-relaxed text-foreground overflow-x-auto whitespace-pre-wrap max-h-[150px]">
                        {q.original_content}
                      </pre>
                    </div>
                  </Card>
                );
              })
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AppPage() {
  const { currentReport, setCurrentReport, currentRaw, setCurrentRaw, saveScan, history } = useScanStore();
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState<"scanner" | "logs" | "gatekeeper">("scanner");

  const handleScan = (report: ScanReport, raw: string) => {
    setCurrentReport(report);
    setCurrentRaw(raw);
    saveScan(report, raw);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-border/30 pb-3 gap-3">
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">Console Control</h1>
              <p className="text-xs text-muted-foreground">Manage audits, live monitoring, and security exceptions.</p>
            </div>
            <TabsList className="h-9 self-start sm:self-auto">
              <TabsTrigger value="scanner" className="gap-1.5 text-xs">
                <ScanLine className="h-3.5 w-3.5" />
                Vulnerability Scanner
              </TabsTrigger>
              <TabsTrigger value="logs" className="gap-1.5 text-xs">
                <Terminal className="h-3.5 w-3.5" />
                Proxy Audit Log
              </TabsTrigger>
              <TabsTrigger value="gatekeeper" className="gap-1.5 text-xs">
                <Shield className="h-3.5 w-3.5" />
                Security Gatekeeper
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="scanner" className="focus-visible:outline-none">
            {currentReport ? (
              <ReportView
                report={currentReport}
                rawManifest={currentRaw}
                onBack={() => {
                  setCurrentReport(null);
                  setCurrentRaw("");
                }}
              />
            ) : (
              <div className="mx-auto max-w-xl space-y-8">
                <div className="text-center">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">MCP Server Security Scanner</h1>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Paste a manifest or fetch one by URL to scan for vulnerabilities.
                  </p>
                </div>

                <ScanInput onScan={handleScan} />

                {history.length > 0 && (
                  <div className="rounded-lg border border-border/50">
                    <button
                      onClick={() => setShowHistory(!showHistory)}
                      className="flex w-full items-center justify-between px-5 py-3 text-sm transition-colors hover:bg-card/50"
                    >
                      <span className="font-medium">Recent Scans</span>
                      <span className="text-xs text-muted-foreground">{history.length} scan(s)</span>
                    </button>
                    <AnimatePresence>
                      {showHistory && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden border-t border-border/30"
                        >
                          <div className="divide-y divide-border/30">
                            {history.map((entry) => (
                              <button
                                key={entry.id}
                                onClick={() => {
                                  setCurrentReport(entry.report);
                                  setCurrentRaw(entry.rawManifest);
                                }}
                                className="flex w-full items-center justify-between px-5 py-3 text-left text-xs transition-colors hover:bg-card/50"
                              >
                                <div>
                                  <span className="font-medium">{entry.report.serverName}</span>
                                  <span className="ml-2 text-muted-foreground">{entry.report.score}/100 · {entry.report.findings.length} findings</span>
                                </div>
                                <span className="text-muted-foreground">{new Date(entry.savedAt).toLocaleDateString()}</span>
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="focus-visible:outline-none">
            <ProxyLogsView />
          </TabsContent>

          <TabsContent value="gatekeeper" className="focus-visible:outline-none">
            <SecurityGatekeeperView />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
