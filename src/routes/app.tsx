import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowLeft, ScanLine, ShieldCheck, AlertTriangle, Globe, Download, Info } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import {
  parseManifestInput,
  scanManifest,
  type ScanReport,
  type RiskSeverity,
} from "@/lib/mcp-scanner";
import { fetchMcpManifest } from "@/lib/mcp-fetch.functions";
import { fetchPolicy } from "@/lib/policy.functions";
import { generateSignedReport } from "@/lib/attestation.functions";
import { generateSarif } from "@/lib/sarif";
import { LinejumpLogo } from "@/components/linejump-logo";
import { AtlasMap } from "@/components/atlas-map";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Scanner — Linejump" },
      {
        name: "description",
        content:
          "Audit an MCP server manifest for prompt injection, hidden ANSI escapes, and over-broad capabilities.",
      },
    ],
  }),
  component: ScannerPage,
});

const ease = [0.16, 1, 0.3, 1] as const;

const severityClasses: Record<RiskSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-[oklch(0.72_0.14_45_/_0.15)] text-[oklch(0.42_0.16_40)] border-[oklch(0.72_0.14_45_/_0.3)]",
  medium:
    "bg-[oklch(0.78_0.12_75_/_0.2)] text-[oklch(0.4_0.1_70)] border-[oklch(0.78_0.12_75_/_0.35)]",
  low: "bg-muted text-muted-foreground border-border",
  info: "bg-secondary text-secondary-foreground border-border",
};

function ScannerPage() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchedFrom, setFetchedFrom] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [policy, setPolicy] = useState<unknown>(null);
  const [attestation, setAttestation] = useState<{ signatureData: unknown; scanId: string } | null>(
    null,
  );

  const fetchManifest = useServerFn(fetchMcpManifest);
  const fetchPolicyData = useServerFn(fetchPolicy);
  const signReportFn = useServerFn(generateSignedReport);

  useEffect(() => {
    fetchPolicyData().then(setPolicy).catch(console.error);
  }, [fetchPolicyData]);

  const handleScan = async () => {
    setError(null);
    setScanning(true);
    setAttestation(null);
    try {
      const manifest = parseManifestInput(input);
      const newReport = scanManifest(manifest, policy || {});
      setReport(newReport);
      const res = await signReportFn({ data: { report: newReport, manifest, url: url || null } });
      setAttestation(res);
    } catch (e) {
      setReport(null);
      setError(e instanceof Error ? e.message : "Failed to parse input.");
    } finally {
      setScanning(false);
    }
  };

  const handleFetchAndScan = async () => {
    if (!url.trim()) return;
    setError(null);
    setReport(null);
    setAttestation(null);
    setFetching(true);
    setFetchedFrom(null);
    try {
      const res = await fetchManifest({ data: { url: url.trim() } });
      setInput(res.raw);
      setFetchedFrom(
        res.source === "tools/list" ? `Live tools/list · ${res.url}` : `Manifest · ${res.url}`,
      );
      const manifest = parseManifestInput(res.raw);
      const newReport = scanManifest(manifest, policy || {});
      setReport(newReport);
      const sigRes = await signReportFn({ data: { report: newReport, manifest, url: url.trim() } });
      setAttestation(sigRes);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch manifest.");
    } finally {
      setFetching(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!report || !attestation) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.text("Linejump Security Report", 14, 22);
    doc.setFontSize(11);
    doc.text(`Server: ${report.serverName}`, 14, 32);
    doc.text(`Scan ID: ${attestation.scanId}`, 14, 38);
    doc.text(`Score: ${report.score}/100`, 14, 44);
    doc.text(`Findings: ${report.findings.length}`, 14, 50);

    doc.setFontSize(14);
    doc.text("Findings", 14, 60);
    doc.setFontSize(10);
    let y = 68;
    for (const f of report.findings.slice(0, 20)) {
      doc.text(`[${f.severity.toUpperCase()}] ${f.title}`, 14, y);
      y += 6;
      const splitDetail = doc.splitTextToSize(f.detail, 180);
      doc.text(splitDetail, 14, y);
      y += splitDetail.length * 5 + 4;
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    }

    doc.save(`linejump-report-${attestation.scanId}.pdf`);
  };

  const handleDownloadSarif = () => {
    if (!report || !attestation) return;
    const blob = new Blob([generateSarif(report, url || "linejump://manifest")], {
      type: "application/sarif+json",
    });
    const href = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = href;
    a.download = `linejump-report-${attestation.scanId}.sarif.json`;
    a.click();
    URL.revokeObjectURL(href);
  };

  const counts = useMemo(() => {
    if (!report) return null;
    const c: Record<RiskSeverity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of report.findings) c[f.severity]++;
    return c;
  }, [report]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <LinejumpLogo size={22} className="text-foreground" />
            <span className="text-[15px] font-medium tracking-tight">Linejump</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              to="/history"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              History
            </Link>
            <Link
              to="/policy"
              className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Policy
            </Link>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            <ScanLine className="h-3.5 w-3.5" strokeWidth={1.5} />
            Scanner
          </div>
          <h1 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Audit a manifest.
          </h1>
          <p className="mt-4 text-[16px] leading-[1.6] text-muted-foreground">
            Point Linejump at a live MCP endpoint or paste a manifest. Every scan runs the same
            forensic rules and produces an evidence-backed report — no data leaves this session.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease, delay: 0.05 }}
          className="mt-8 rounded-2xl border border-border bg-card p-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleFetchAndScan();
                }}
                spellCheck={false}
                placeholder="https://your-mcp-server.example.com/mcp"
                className="h-11 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              onClick={handleFetchAndScan}
              disabled={fetching || !url.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              {fetching ? "Fetching…" : "Fetch & scan"}
            </button>
          </div>
          <div className="px-3 pb-2 pt-1 text-[12px] text-muted-foreground">
            {fetchedFrom ?? "GET first, then MCP tools/list over JSON-RPC. http(s) only."}
          </div>
        </motion.div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.1 }}
            className="rounded-2xl border border-border bg-card p-2"
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              spellCheck={false}
              placeholder={`{
  "name": "example-mcp",
  "tools": [
    {
      "name": "read_file",
      "description": "Read a file from disk.",
      "inputSchema": { "type": "object" }
    }
  ]
}`}
              className="h-[420px] w-full resize-none rounded-xl bg-background/60 p-5 font-mono text-[13px] leading-relaxed text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <div className="flex items-center justify-between px-3 py-2">
              <span className="text-[12px] text-muted-foreground">
                {input.length.toLocaleString()} chars · runs locally
              </span>
              <button
                onClick={handleScan}
                disabled={scanning || !input.trim()}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
              >
                {scanning ? "Scanning…" : "Run scan"}
                <ScanLine className="h-3.5 w-3.5" strokeWidth={2} />
              </button>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease, delay: 0.15 }}
            className="rounded-2xl border border-border bg-card p-6"
          >
            <AnimatePresence mode="wait">
              {error ? (
                <motion.div
                  key="error"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[380px] flex-col items-center justify-center text-center"
                >
                  <AlertTriangle className="h-6 w-6 text-destructive" strokeWidth={1.5} />
                  <p className="mt-3 text-[14px] text-foreground">{error}</p>
                </motion.div>
              ) : report && counts ? (
                <motion.div
                  key="report"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease }}
                >
                  {attestation && (
                    <div className="mb-4 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={handleDownloadSarif}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/60"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={2} />
                        Download SARIF
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadPDF}
                        className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary/60"
                      >
                        <Download className="h-3.5 w-3.5" strokeWidth={2} />
                        Download PDF
                      </button>
                    </div>
                  )}
                  <ReportView report={report} counts={counts} />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex h-full min-h-[380px] flex-col items-center justify-center text-center"
                >
                  <ShieldCheck className="h-7 w-7 text-muted-foreground" strokeWidth={1.25} />
                  <p className="mt-4 text-[14px] text-muted-foreground">
                    Your report appears here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function ReportView({
  report,
  counts,
}: {
  report: ScanReport;
  counts: Record<RiskSeverity, number>;
}) {
  const sevOrder: RiskSeverity[] = ["critical", "high", "medium", "low", "info"];
  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[12px] uppercase tracking-wider text-muted-foreground">
            {report.serverName}
          </div>
          <div className="mt-1 text-[15px] text-foreground">
            {report.toolCount} tool{report.toolCount === 1 ? "" : "s"} scanned ·{" "}
            {report.findings.length} finding
            {report.findings.length === 1 ? "" : "s"}
          </div>
          {report.coverage ? (
            <div className="mt-1 font-mono text-[10.5px] text-muted-foreground">
              engine {report.engineVersion} · {report.coverage.textFragmentsScanned} text fields ·{" "}
              {report.coverage.schemaFieldsScanned} schema fields
            </div>
          ) : null}
        </div>
        <div className="rounded-full border border-border bg-background px-4 py-2 text-right">
          <TooltipProvider delayDuration={200}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="group text-right outline-none"
                  aria-label="What does the safety score mean?"
                >
                  <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                    Safety
                    <Info className="h-3 w-3 opacity-50 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="text-[20px] font-semibold tracking-tight">
                    {report.score}
                    <span className="text-[13px] text-muted-foreground">/100</span>
                  </div>
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="left"
                className="max-w-[240px] border border-border bg-popover px-3 py-2.5 text-popover-foreground"
              >
                <p className="text-[12px] font-medium text-foreground">Safety score</p>
                <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                  A 0–100 rating of manifest risk. Higher is safer. Each unique rule hit reduces
                  the score based on severity and confidence. 100 means no findings were detected.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {sevOrder.map((s) =>
          counts[s] ? (
            <span
              key={s}
              className={`rounded-full border px-2.5 py-0.5 text-[11px] capitalize ${severityClasses[s]}`}
            >
              {counts[s]} {s}
            </span>
          ) : null,
        )}
      </div>

      <AtlasMap findings={report.findings} />

      <div className="mt-6 max-h-[380px] space-y-3 overflow-y-auto pr-1">
        {report.findings.length === 0 ? (
          <div className="rounded-xl border border-border bg-background/50 p-6 text-center">
            <ShieldCheck className="mx-auto h-6 w-6 text-[oklch(0.6_0.12_150)]" strokeWidth={1.5} />
            <p className="mt-2 text-[14px] text-foreground">No risks detected.</p>
            <p className="mt-1 text-[12.5px] text-muted-foreground">
              Static checks passed. Continue to review dynamic behavior at runtime.
            </p>
          </div>
        ) : (
          report.findings.map((f, i) => (
            <motion.div
              key={f.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, ease, delay: i * 0.02 }}
              className="rounded-xl border border-border bg-background/60 p-4"
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-wider ${severityClasses[f.severity]}`}
                >
                  {f.severity}
                </span>
                <span className="text-[11.5px] text-muted-foreground">{f.category}</span>
                {f.toolName ? (
                  <span className="ml-auto rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-secondary-foreground">
                    {f.toolName}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 text-[14px] font-medium text-foreground">{f.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">{f.detail}</p>
              {f.ruleId ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[10.5px] text-muted-foreground">
                  <span className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono">{f.ruleId}</span>
                  {f.confidence ? <span>{f.confidence} confidence</span> : null}
                  {f.location ? <span className="truncate">{f.location}</span> : null}
                </div>
              ) : null}
              {f.evidence ? (
                <pre className="mt-2 overflow-x-auto rounded bg-secondary/60 p-2 font-mono text-[11.5px] text-secondary-foreground">
                  {f.evidence}
                </pre>
              ) : null}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
