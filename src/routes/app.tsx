import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ScanLine, Shield, FileText, Download,
  Share2, Mail, Copy, RefreshCw, ArrowLeft,
  Link2, Terminal, Brain, Layers,
} from "lucide-react";
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
        const result = await fetchMcpManifest({ url: url.trim() });
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
              <Label className="text-xs text-muted-foreground">Manifest URL (GET or MCP Streamable HTTP)</Label>
              <div className="mt-1.5 flex gap-2">
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

  const criticalCount = report.findings.filter((f) => f.severity === "critical").length;
  const highCount = report.findings.filter((f) => f.severity === "high").length;

  const handleCopyLink = async () => {
    await copyShareableLink(report);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleCiCheck = () => {
    const result = evaluateCiCheck(report.score, report.findings, DEFAULT_CI_CONFIG);
    setCiResult(result);
  };

  const handleDeepScan = async () => {
    setDeepScanning(true);
    try {
      const result = await deepScanManifest({ manifest: rawManifest, serverName: report.serverName });
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
    await downloadPdfReport(report, rawManifest);
  };

  const combinedScore = deepResult && deepResult.llmScore >= 0
    ? Math.round((report.score + deepResult.llmScore) / 2)
    : report.score;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-lg font-semibold">{report.serverName}</h2>
            <p className="text-xs text-muted-foreground">{report.toolCount} tool(s) · {report.findings.length} regex + {deepResult?.findings.length ?? 0} LLM finding(s)</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={handleDownloadPdf}>
            <Download className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => exportJsonReport(report)}>
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
                <button onClick={() => shareByEmail(report)} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs transition-colors hover:bg-muted">
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
                <span className="text-foreground">{report.score}r</span>
                <span className="text-[#6C5CE7]">{deepResult.llmScore}l</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex flex-1 flex-wrap gap-3">
          {([
            ["Critical", criticalCount + (deepResult ? deepResult.findings.filter(f => f.severity === "critical").length : 0), "text-red-500 bg-red-500/10"],
            ["High", highCount + (deepResult ? deepResult.findings.filter(f => f.severity === "high").length : 0), "text-orange-500 bg-orange-500/10"],
            ["Medium", report.findings.filter(f => f.severity === "medium").length + (deepResult ? deepResult.findings.filter(f => f.severity === "medium").length : 0), "text-yellow-500 bg-yellow-500/10"],
            ["Low", report.findings.filter(f => f.severity === "low").length + (deepResult ? deepResult.findings.filter(f => f.severity === "low").length : 0), "text-blue-500 bg-blue-500/10"],
          ] as const).map(([label, count, cls]) => (
            <div key={label} className={`flex flex-col items-center justify-center rounded-lg border border-border/50 px-5 py-3 ${cls.split(" ").slice(1).join(" ")}`}>
              <span className="text-lg font-bold">{count}</span>
              <span className="text-[10px] font-medium uppercase tracking-wider">{label}</span>
            </div>
          ))}
        </div>
      </div>

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

      {/* Findings */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Findings</h3>
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
          {findingView === "regex" && report.findings.length === 0 && (
            <p className="text-sm text-muted-foreground">No regex findings detected.</p>
          )}
          {findingView === "llm" && (!deepResult || deepResult.findings.length === 0) && (
            <p className="text-sm text-muted-foreground">No LLM findings detected. {!deepResult ? "Run a deep scan first." : ""}</p>
          )}
          {findingView === "all" && report.findings.length === 0 && (!deepResult || deepResult.findings.length === 0) && (
            <p className="text-sm text-muted-foreground">No findings detected. This server appears clean.</p>
          )}
          {findingView !== "llm" && report.findings.map((f) => (
            <FindingCard key={f.id} finding={f} />
          ))}
          {findingView !== "regex" && deepResult?.findings.map((f, i) => (
            <DeepFindingCard key={`llm-${i}`} finding={f} />
          ))}
        </div>
      </div>
    </div>
  );
}

function AppPage() {
  const { currentReport, setCurrentReport, currentRaw, setCurrentRaw, saveScan, history } = useScanStore();
  const [showHistory, setShowHistory] = useState(false);

  const handleScan = (report: ScanReport, raw: string) => {
    setCurrentReport(report);
    setCurrentRaw(raw);
    saveScan(report, raw);
    setShowHistory(false);
  };

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
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
              <h1 className="text-2xl font-bold tracking-tight">MCP Server Security Scanner</h1>
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
      </div>
    </div>
  );
}
