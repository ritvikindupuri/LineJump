import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldCheck,
  ScanLine,
  AlertTriangle,
  Eye,
  TerminalSquare,
  Workflow,
  ArrowRight,
  Globe,
} from "lucide-react";
import {
  parseManifestInput,
  scanManifest,
  type ScanReport,
  type RiskSeverity,
} from "@/lib/mcp-scanner";
import { useServerFn } from "@tanstack/react-start";
import { fetchMcpManifest } from "@/lib/mcp-fetch.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linejump — MCP Server Risk Scanner" },
      {
        name: "description",
        content:
          "Inspect MCP server manifests for prompt injection, hidden ANSI escapes, and over-broad tool permissions before you ever connect.",
      },
      { property: "og:title", content: "Linejump — MCP Server Risk Scanner" },
      {
        property: "og:description",
        content:
          "Audit MCP servers for line-jumping attacks, hidden instructions, and risky capabilities before connection.",
      },
    ],
  }),
  component: Index,
});

const ease = [0.16, 1, 0.3, 1] as const;

const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.7, ease },
};

const severityClasses: Record<RiskSeverity, string> = {
  critical: "bg-destructive/15 text-destructive border-destructive/30",
  high: "bg-[oklch(0.72_0.14_45_/_0.15)] text-[oklch(0.45_0.16_40)] border-[oklch(0.72_0.14_45_/_0.3)]",
  medium:
    "bg-[oklch(0.78_0.12_75_/_0.2)] text-[oklch(0.42_0.1_70)] border-[oklch(0.78_0.12_75_/_0.35)]",
  low: "bg-muted text-muted-foreground border-border",
  info: "bg-secondary text-secondary-foreground border-border",
};

function Index() {
  const [input, setInput] = useState("");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [fetchedFrom, setFetchedFrom] = useState<string | null>(null);
  const [report, setReport] = useState<ScanReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const fetchManifest = useServerFn(fetchMcpManifest);

  const handleScan = () => {
    setError(null);
    setScanning(true);
    try {
      const manifest = parseManifestInput(input);
      const result = scanManifest(manifest);
      setReport(result);
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
    setFetching(true);
    setFetchedFrom(null);
    try {
      const res = await fetchManifest({ data: { url: url.trim() } });
      setInput(res.raw);
      setFetchedFrom(
        res.source === "tools/list"
          ? `Live tools/list · ${res.url}`
          : `Manifest · ${res.url}`,
      );
      const manifest = parseManifestInput(res.raw);
      setReport(scanManifest(manifest));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to fetch manifest.");
    } finally {
      setFetching(false);
    }
  };

  const scrollToScanner = () => {
    document.getElementById("scanner")?.scrollIntoView({ behavior: "smooth" });
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
      <Nav />
      <Hero onScan={scrollToScanner} />
      <Features />
      <Scanner
        input={input}
        setInput={setInput}
        url={url}
        setUrl={setUrl}
        onFetchAndScan={handleFetchAndScan}
        fetching={fetching}
        fetchedFrom={fetchedFrom}
        onScan={handleScan}
        scanning={scanning}
        error={error}
        report={report}
        counts={counts}
      />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease }}
      className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/60"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-foreground" strokeWidth={1.5} />
          <span className="text-[15px] font-medium tracking-tight">Linejump</span>
        </div>
        <nav className="hidden gap-8 text-[13px] text-muted-foreground sm:flex">
          <a href="#features" className="hover:text-foreground transition-colors">
            How it works
          </a>
          <a href="#scanner" className="hover:text-foreground transition-colors">
            Scanner
          </a>
        </nav>
      </div>
    </motion.header>
  );
}

function Hero({ onScan }: { onScan: () => void }) {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-24 pt-24 sm:pt-32">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div {...fadeUp} className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[12px] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Defending against line-jumping in MCP
          </motion.div>
          <motion.h1
            {...fadeUp}
            className="text-balance text-5xl font-semibold tracking-[-0.035em] sm:text-7xl"
          >
            See the risks
            <br />
            <span className="text-muted-foreground">before you connect.</span>
          </motion.h1>
          <motion.p
            {...fadeUp}
            className="mx-auto mt-6 max-w-xl text-pretty text-[17px] leading-relaxed text-muted-foreground"
          >
            Linejump inspects MCP server manifests for prompt injection in tool
            descriptions, hidden ANSI escapes, over-broad capabilities, and
            cross-tool exfiltration paths — before a single tool is ever invoked.
          </motion.p>
          <motion.div {...fadeUp} className="mt-10 flex items-center justify-center gap-3">
            <button
              onClick={onScan}
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              Scan a manifest
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
            </button>
            <a
              href="#features"
              className="rounded-full px-5 py-2.5 text-[14px] font-medium text-foreground hover:bg-secondary transition-colors"
            >
              Learn more
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, ease, delay: 0.3 }}
          className="relative mx-auto mt-20 max-w-4xl"
        >
          <div className="absolute inset-x-0 -top-12 -z-10 mx-auto h-64 w-3/4 rounded-full bg-accent/30 blur-3xl" />
          <div className="rounded-2xl border border-border bg-card/80 p-1 shadow-[0_30px_80px_-30px_oklch(0.35_0.05_55_/_0.25)] backdrop-blur">
            <div className="rounded-xl bg-background/60 p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-destructive/70" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.12_75)]" />
                <span className="h-2 w-2 rounded-full bg-[oklch(0.6_0.12_150)]" />
                <span className="ml-3">linejump scan ./mcp-server.json</span>
              </div>
              <pre className="mt-5 overflow-x-auto whitespace-pre text-left text-[12.5px] leading-relaxed text-foreground/90">
{`▸ Parsing manifest …
▸ 7 tools detected

  ⚠  high     Tool "search_docs"
              Possible prompt-injection language in description
              ↳ "ignore previous instructions"

  ⚠  critical Tool "fetch_url"
              Embedded system role markers (<|system|>)

  ◦  medium   Cross-tool exfiltration path
              4 readers + 2 outbound senders
`}
              </pre>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: Eye,
      title: "Line-jumping detection",
      body: "Catches instructions hidden in tool descriptions and input schemas before the user invokes anything.",
    },
    {
      icon: TerminalSquare,
      title: "Hidden escape sequences",
      body: "Flags ANSI terminal codes, zero-width characters, and bidi overrides that mask content from human reviewers.",
    },
    {
      icon: AlertTriangle,
      title: "Broad capability hints",
      body: "Surfaces tools that request shell, filesystem, credential, or unconstrained network access.",
    },
    {
      icon: Workflow,
      title: "Exfiltration paths",
      body: "Identifies reader + outbound-sender pairs that an injected payload could chain to leak data.",
    },
  ];
  return (
    <section id="features" className="border-t border-border/60 bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl"
        >
          <h2 className="text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Static, structural, and pattern checks.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Linejump runs entirely in your browser. Paste a manifest or the
            response from <code className="rounded bg-secondary px-1.5 py-0.5 text-[13px]">tools/list</code> and
            get an auditable report — nothing leaves your machine.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.06 }}
              className="group rounded-2xl border border-border bg-card p-7 transition-all hover:border-foreground/20"
            >
              <it.icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-5 text-[17px] font-medium tracking-tight">{it.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted-foreground">
                {it.body}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Scanner({
  input,
  setInput,
  url,
  setUrl,
  onFetchAndScan,
  fetching,
  fetchedFrom,
  onScan,
  scanning,
  error,
  report,
  counts,
}: {
  input: string;
  setInput: (v: string) => void;
  url: string;
  setUrl: (v: string) => void;
  onFetchAndScan: () => void;
  fetching: boolean;
  fetchedFrom: string | null;
  onScan: () => void;
  scanning: boolean;
  error: string | null;
  report: ScanReport | null;
  counts: Record<RiskSeverity, number> | null;
}) {
  return (
    <section id="scanner" className="border-t border-border/60">
      <div className="mx-auto max-w-6xl px-6 py-24">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease }}
          className="max-w-2xl"
        >
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <ScanLine className="h-4 w-4" strokeWidth={1.5} />
            Scanner
          </div>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Audit any manifest.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-muted-foreground">
            Point Linejump at a live MCP endpoint and we'll fetch its manifest
            or call{" "}
            <code className="rounded bg-secondary px-1.5 py-0.5 text-[13px]">tools/list</code>{" "}
            for you — or paste a manifest by hand.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6, ease }}
          className="mt-8 rounded-2xl border border-border bg-card p-2"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex flex-1 items-center gap-2 px-3">
              <Globe className="h-4 w-4 text-muted-foreground" strokeWidth={1.5} />
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") onFetchAndScan();
                }}
                spellCheck={false}
                placeholder="https://your-mcp-server.example.com/mcp"
                className="h-11 w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/60"
              />
            </div>
            <button
              onClick={onFetchAndScan}
              disabled={fetching || !url.trim()}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90 disabled:opacity-40"
            >
              {fetching ? "Fetching…" : "Fetch & scan"}
              <ArrowRight className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
          {fetchedFrom ? (
            <div className="px-3 pb-2 pt-1 text-[12px] text-muted-foreground">
              {fetchedFrom}
            </div>
          ) : (
            <div className="px-3 pb-2 pt-1 text-[12px] text-muted-foreground">
              GET first, then MCP <code className="rounded bg-secondary px-1 py-0.5 text-[11px]">tools/list</code> over JSON-RPC. http(s) only.
            </div>
          )}
        </motion.div>

        <div className="mt-10 grid gap-6 lg:grid-cols-[1.05fr_1fr]">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease }}
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
                onClick={onScan}
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
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, ease, delay: 0.05 }}
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
                  <ShieldCheck
                    className="h-7 w-7 text-muted-foreground"
                    strokeWidth={1.25}
                  />
                  <p className="mt-4 text-[14px] text-muted-foreground">
                    Your report appears here.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
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
        </div>
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="rounded-full border border-border bg-background px-4 py-2 text-right"
        >
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Safety
          </div>
          <div className="text-[20px] font-semibold tracking-tight">
            {report.score}
            <span className="text-muted-foreground text-[13px]">/100</span>
          </div>
        </motion.div>
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
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {f.detail}
              </p>
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

function Footer() {
  return (
    <footer className="border-t border-border/60">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-10 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4" strokeWidth={1.5} />
          <span>Linejump · static MCP risk scanner</span>
        </div>
        <div>
          Inspired by Trail of Bits research on MCP line-jumping attacks.
        </div>
      </div>
    </footer>
  );
}
