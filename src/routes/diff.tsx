import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect, useMemo } from "react";
import { LinejumpLogo } from "@/components/linejump-logo";
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { fetchScan } from "@/lib/db.functions";
import type { ScanReport, Finding } from "@/lib/mcp-scanner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/diff")({
  component: DiffPage,
});

function FindingCard({
  finding,
  diffType,
}: {
  finding: Finding;
  diffType: "new" | "resolved" | "persistent";
}) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high":
        return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium":
        return "bg-yellow-500/10 text-yellow-500 border-yellow-500/20";
      case "low":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-zinc-500/10 text-zinc-500 border-zinc-500/20";
    }
  };

  const getBorderColor = () => {
    if (diffType === "new") return "border-red-500/30 bg-red-500/5";
    if (diffType === "resolved") return "border-green-500/30 bg-green-500/5";
    return "border-border bg-card";
  };

  return (
    <div
      className={cn(
        "p-4 border rounded-xl flex flex-col gap-3 transition-colors",
        getBorderColor(),
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          {diffType === "new" && <ArrowUpRight className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />}
          {diffType === "resolved" && (
            <CheckCircle className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
          )}
          {diffType === "persistent" && (
            <Minus className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
          )}

          <div>
            <div className="flex items-center gap-2 mb-1">
              <span
                className={cn(
                  "uppercase font-bold text-[10px] px-1.5 py-0.5 rounded border",
                  getSeverityColor(finding.severity),
                )}
              >
                {finding.severity}
              </span>
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider bg-secondary/50 px-1.5 py-0.5 rounded">
                {finding.category}
              </span>
              {finding.toolName && (
                <span className="text-[10px] font-mono text-muted-foreground bg-secondary/50 px-1.5 py-0.5 rounded">
                  tool: {finding.toolName}
                </span>
              )}
            </div>
            <h3 className="text-sm font-medium leading-snug">{finding.title}</h3>
          </div>
        </div>

        {finding.confidence && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-[10px] font-medium px-2 py-1 bg-secondary rounded cursor-help">
                  Confidence: {finding.confidence}
                </div>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs">
                <p>
                  Confidence is a measure of certainty from the detection engine based on pattern
                  matching reliability. High confidence indicates a strong match, while low
                  confidence suggests a potential false positive.
                </p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      <div className="pl-8 flex flex-col gap-2">
        <p className="text-sm text-muted-foreground">{finding.detail}</p>

        {finding.evidence && (
          <div className="mt-1 p-2 rounded bg-background/50 border border-border/50 text-xs font-mono break-all whitespace-pre-wrap">
            <span className="text-muted-foreground block mb-1 font-sans">Evidence:</span>
            {finding.evidence}
          </div>
        )}
      </div>
    </div>
  );
}

function DiffPage() {
  const [scan1, setScan1] = useState<Record<string, unknown> | null>(null);
  const [scan2, setScan2] = useState<Record<string, unknown> | null>(null);

  const loadScan = useServerFn(fetchScan);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const id1 = searchParams.get("id1");
    const id2 = searchParams.get("id2");

    if (!id1 || !id2) return;

    // In chronologically ordered history, id1 might be older or newer.
    // Let's fetch both and we will sort them by created_at.
    Promise.all([loadScan({ data: { id: id1 } }), loadScan({ data: { id: id2 } })])
      .then(([s1, s2]) => {
        const d1 = new Date(s1.created_at as string).getTime();
        const d2 = new Date(s2.created_at as string).getTime();

        // Ensure scan1 is older, scan2 is newer
        if (d1 < d2) {
          setScan1(s1 as Record<string, unknown>);
          setScan2(s2 as Record<string, unknown>);
        } else {
          setScan1(s2 as Record<string, unknown>);
          setScan2(s1 as Record<string, unknown>);
        }
      })
      .catch(console.error);
  }, [loadScan]);

  const diffData = useMemo(() => {
    if (!scan1 || !scan2) return null;

    const r1 = JSON.parse(scan1.report_json as string) as ScanReport;
    const r2 = JSON.parse(scan2.report_json as string) as ScanReport;

    // A reliable way to match findings is by ruleId + toolName, or by id.
    // However, finding IDs might be generated per-scan. We'll try to match by ruleId and toolName first.
    const makeKey = (f: Finding) =>
      `${f.ruleId || f.id}-${f.toolName || "global"}-${f.location || ""}`;

    const f1Map = new Map(r1.findings.map((f) => [makeKey(f), f]));
    const f2Map = new Map(r2.findings.map((f) => [makeKey(f), f]));

    const newFindings: Finding[] = [];
    const resolvedFindings: Finding[] = [];
    const persistentFindings: Finding[] = [];

    for (const f2 of r2.findings) {
      const key = makeKey(f2);
      if (f1Map.has(key)) {
        persistentFindings.push(f2);
      } else {
        newFindings.push(f2);
      }
    }

    for (const f1 of r1.findings) {
      const key = makeKey(f1);
      if (!f2Map.has(key)) {
        resolvedFindings.push(f1);
      }
    }

    return {
      r1,
      r2,
      newFindings,
      resolvedFindings,
      persistentFindings,
      scoreDelta: r2.score - r1.score,
      toolsDelta: r2.toolCount - r1.toolCount,
      date1: new Date(scan1.created_at as string),
      date2: new Date(scan2.created_at as string),
    };
  }, [scan1, scan2]);

  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

  if (!id1 || !id2) return <div className="p-8">Please provide id1 and id2 query parameters.</div>;
  if (!diffData)
    return <div className="p-8 flex items-center justify-center h-[50vh]">Loading diff...</div>;

  const {
    r1,
    r2,
    newFindings,
    resolvedFindings,
    persistentFindings,
    scoreDelta,
    toolsDelta,
    date1,
    date2,
  } = diffData;

  return (
    <div className="min-h-screen bg-background text-foreground pb-24">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <LinejumpLogo size={22} className="text-foreground" />
            <span className="text-[15px] font-medium tracking-tight">Linejump</span>
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to History
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex flex-col gap-2 mb-8">
          <h1 className="text-3xl font-semibold tracking-tight">Scan Comparison</h1>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            Comparing <span className="font-medium text-foreground">{date1.toLocaleString()}</span>{" "}
            to <span className="font-medium text-foreground">{date2.toLocaleString()}</span>
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
          <div className="p-4 rounded-xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Score</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{r2.score}</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  scoreDelta > 0
                    ? "text-green-500"
                    : scoreDelta < 0
                      ? "text-red-500"
                      : "text-muted-foreground",
                )}
              >
                {scoreDelta > 0 ? "+" : ""}
                {scoreDelta}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Tools Scanned</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold">{r2.toolCount}</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  toolsDelta > 0
                    ? "text-blue-500"
                    : toolsDelta < 0
                      ? "text-orange-500"
                      : "text-muted-foreground",
                )}
              >
                {toolsDelta > 0 ? "+" : ""}
                {toolsDelta}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">New Findings</div>
            <div className="text-2xl font-semibold text-red-500">{newFindings.length}</div>
          </div>
          <div className="p-4 rounded-xl border bg-card">
            <div className="text-sm text-muted-foreground mb-1">Resolved</div>
            <div className="text-2xl font-semibold text-green-500">{resolvedFindings.length}</div>
          </div>
        </div>

        {/* Diff Sections */}
        <div className="space-y-12">
          {newFindings.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center">
                  <ArrowUpRight className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-xl font-medium">New Findings Introduced</h2>
              </div>
              <div className="flex flex-col gap-4">
                {newFindings.map((f) => (
                  <FindingCard key={f.id} finding={f} diffType="new" />
                ))}
              </div>
            </section>
          )}

          {resolvedFindings.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <h2 className="text-xl font-medium cursor-help decoration-dashed underline-offset-4 decoration-muted-foreground hover:underline">
                        Findings Resolved
                      </h2>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        These are potential security issues that were present in the previous scan but are no longer detected.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <div className="flex flex-col gap-4">
                {resolvedFindings.map((f) => (
                  <FindingCard key={f.id} finding={f} diffType="resolved" />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                <Minus className="w-5 h-5 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-medium">Persistent Findings</h2>
              <span className="text-sm text-muted-foreground ml-2">
                ({persistentFindings.length})
              </span>
            </div>

            {persistentFindings.length === 0 ? (
              <div className="p-8 border border-dashed rounded-xl text-center text-muted-foreground">
                No persistent findings between these scans.
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                {persistentFindings.map((f) => (
                  <FindingCard key={f.id} finding={f} diffType="persistent" />
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
