import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  ArrowRight,
  Fingerprint,
  ScanSearch,
  GitCompare,
  FileSignature,
  Network,
  Clock,
} from "lucide-react";
import { LinejumpLogo } from "@/components/linejump-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linejump — Pre-flight risk intelligence for MCP servers" },
      {
        name: "description",
        content:
          "Linejump audits MCP servers before they ever touch your model's context window. Forensic manifest analysis, drift attestation, and fleet-wide line-jumping defense for every security team.",
      },
      {
        property: "og:title",
        content: "Linejump — Pre-flight risk intelligence for MCP servers",
      },
      {
        property: "og:description",
        content:
          "Forensic, signed, pre-connection audits of every MCP server in your fleet. Not a runtime wrapper — an evidence layer.",
      },
    ],
  }),
  component: Landing,
});

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.8, ease },
};

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Marquee />
      <Difference />
      <Pillars />
      <HowItWorks />
      <CTA />
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
      className="sticky top-0 z-30 backdrop-blur-xl bg-background/70 border-b border-border/50"
    >
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <LinejumpLogo size={22} className="text-foreground" />
          <span className="text-[15px] font-medium tracking-tight">Linejump</span>
        </Link>
        <nav className="hidden gap-8 text-[13px] text-muted-foreground sm:flex">
          <a href="#difference" className="hover:text-foreground transition-colors">
            Why Linejump
          </a>
          <a href="#pillars" className="hover:text-foreground transition-colors">
            Platform
          </a>
          <a href="#how" className="hover:text-foreground transition-colors">
            How it works
          </a>
        </nav>
        <Link
          to="/app"
          className="group inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-1.5 text-[13px] font-medium text-primary-foreground transition-all hover:opacity-90"
        >
          Open scanner
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="mx-auto max-w-6xl px-6 pb-28 pt-28 sm:pt-40">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.08 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.div
            {...fadeUp}
            className="mb-7 inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1 text-[12px] text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Pre-flight intelligence for the MCP supply chain
          </motion.div>

          <motion.h1
            {...fadeUp}
            className="text-balance text-5xl font-semibold tracking-[-0.04em] sm:text-7xl"
          >
            Audit every MCP server
            <br />
            <span className="text-muted-foreground">before it audits you.</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            className="mx-auto mt-7 max-w-xl text-pretty text-[17px] leading-[1.55] text-muted-foreground"
          >
            Wrappers fix the symptom at runtime. Linejump fixes the root cause — a forensic, signed
            audit of every manifest, instruction, and tool description <em>before</em> a single byte
            reaches your model's context window.
          </motion.p>

          <motion.div {...fadeUp} className="mt-11 flex items-center justify-center gap-3">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90"
            >
              Run a scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <a
              href="#difference"
              className="rounded-full px-5 py-2.5 text-[14px] font-medium text-foreground hover:bg-secondary transition-colors"
            >
              How we're different
            </a>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease, delay: 0.35 }}
          className="relative mx-auto mt-24 max-w-4xl"
        >
          <div className="absolute inset-x-0 -top-12 -z-10 mx-auto h-64 w-3/4 rounded-full bg-accent/40 blur-3xl" />
          <ScanCard />
        </motion.div>
      </div>
    </section>
  );
}

function ScanCard() {
  const rows: { sev: "critical" | "high" | "medium" | "ok"; label: string; meta: string }[] = [
    { sev: "critical", label: "Embedded <|system|> override", meta: "tool · fetch_url · desc" },
    {
      sev: "high",
      label: "Hidden ANSI escape · CSI sequence",
      meta: "tool · open_terminal · desc",
    },
    { sev: "high", label: "Prompt-injection phrase detected", meta: "instructions" },
    { sev: "medium", label: "Reader + outbound sender pair", meta: "read_file → http_post" },
    {
      sev: "ok",
      label: "Trust pin matches v1.4.2 attestation",
      meta: "fingerprint · sha256:9f3e…",
    },
  ];
  const sevColor = {
    critical: "bg-destructive/15 text-destructive border-destructive/30",
    high: "bg-[oklch(0.72_0.14_45_/_0.15)] text-[oklch(0.42_0.16_40)] border-[oklch(0.72_0.14_45_/_0.3)]",
    medium:
      "bg-[oklch(0.78_0.12_75_/_0.2)] text-[oklch(0.4_0.1_70)] border-[oklch(0.78_0.12_75_/_0.35)]",
    ok: "bg-[oklch(0.78_0.08_150_/_0.2)] text-[oklch(0.38_0.09_150)] border-[oklch(0.78_0.08_150_/_0.35)]",
  };
  return (
    <div className="rounded-2xl border border-border bg-card/80 p-1 shadow-[0_30px_80px_-30px_oklch(0.35_0.05_55_/_0.25)] backdrop-blur">
      <div className="rounded-xl bg-background/60 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-muted-foreground">
            <span className="h-2 w-2 rounded-full bg-destructive/70" />
            <span className="h-2 w-2 rounded-full bg-[oklch(0.78_0.12_75)]" />
            <span className="h-2 w-2 rounded-full bg-[oklch(0.6_0.12_150)]" />
            <span className="ml-3 font-mono">linejump audit acme-mcp@1.4.2</span>
          </div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            attested 0.6s
          </div>
        </div>
        <div className="mt-6 space-y-2.5">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.55 + i * 0.08 }}
              className="flex items-center gap-3 rounded-lg border border-border/70 bg-card/50 px-3 py-2.5"
            >
              <span
                className={`rounded-full border px-2 py-0.5 text-[10.5px] uppercase tracking-wider ${sevColor[r.sev]}`}
              >
                {r.sev}
              </span>
              <span className="truncate text-[13px] text-foreground">{r.label}</span>
              <span className="ml-auto font-mono text-[11.5px] text-muted-foreground">
                {r.meta}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Marquee() {
  const items = [
    "Prompt injection",
    "ANSI escapes",
    "Tool-shadowing",
    "Cross-tool exfil",
    "Hidden bidi",
    "Description drift",
    "Unsigned updates",
    "Capability creep",
  ];
  return (
    <section className="border-y border-border/50 bg-card/40">
      <div className="mx-auto max-w-6xl overflow-hidden px-6 py-6">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease }}
          className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[12.5px] uppercase tracking-[0.16em] text-muted-foreground"
        >
          <span className="text-foreground/90">We catch</span>
          {items.map((s) => (
            <span key={s}>{s}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}

function Difference() {
  return (
    <section id="difference" className="border-b border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="max-w-3xl"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Why Linejump
          </div>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Wrappers are a patch. <br />
            <span className="text-muted-foreground">Linejump is the evidence layer.</span>
          </h2>
          <p className="mt-5 text-[16px] leading-[1.6] text-muted-foreground">
            Runtime wrappers sit between your model and the server and re-prompt the human in the
            loop on every change. That works for one developer. It collapses inside a company with
            hundreds of servers, dozens of agents, and a change-management policy. Linejump runs{" "}
            <em>before</em> the connection, captures cryptographic evidence of what the server
            actually exposed at that moment, and lets your security team approve, deny, and diff it
            like any other supply-chain artifact.
          </p>
        </motion.div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2">
          <CompareCard
            kind="them"
            title="Runtime wrappers"
            points={[
              "Proxy on the developer's machine",
              "Re-prompt per config change → alert fatigue",
              "No central fleet view",
              "Evidence lives in one local SQLite",
              "Blocks at the wire, not at procurement",
            ]}
          />
          <CompareCard
            kind="us"
            title="Linejump"
            points={[
              "Pre-connection audit at CI / registry / gateway",
              "Signed attestation per version, diffed automatically",
              "Fleet-wide drift map across every team",
              "Exportable evidence: SBOM-style, SARIF, PDF",
              "Policy as code: deny shell, require approval on write",
            ]}
          />
        </div>
      </div>
    </section>
  );
}

function CompareCard({
  kind,
  title,
  points,
}: {
  kind: "us" | "them";
  title: string;
  points: string[];
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease }}
      className={`p-8 sm:p-10 ${kind === "us" ? "bg-card" : "bg-background"}`}
    >
      <div className="flex items-center gap-2 text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
        <span
          className={`h-1.5 w-1.5 rounded-full ${
            kind === "us" ? "bg-accent" : "bg-muted-foreground/40"
          }`}
        />
        {kind === "us" ? "Linejump approach" : "Wrapper approach"}
      </div>
      <h3 className="mt-3 text-[22px] font-medium tracking-tight">{title}</h3>
      <ul className="mt-6 space-y-3.5 text-[14.5px] leading-relaxed">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-3">
            <span
              className={`mt-2 h-1 w-1 shrink-0 rounded-full ${
                kind === "us" ? "bg-foreground" : "bg-muted-foreground/50"
              }`}
            />
            <span className={kind === "us" ? "text-foreground" : "text-muted-foreground"}>{p}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
}

function Pillars() {
  const items = [
    {
      icon: ScanSearch,
      title: "Forensic manifest analysis",
      body: "Every tool description, instruction, input schema, and resource template is parsed, normalized, and scanned for prompt injection, hidden ANSI, zero-width, bidi, and capability hints.",
    },
    {
      icon: Fingerprint,
      title: "Cryptographic trust pinning",
      body: "Each scan produces a signed fingerprint of the exact bytes the server exposed. When a vendor silently updates a tool, the next pull fails the attestation before the model ever sees it.",
    },
    {
      icon: GitCompare,
      title: "Semantic drift diffs",
      body: "Compare any two versions of a server side-by-side. We surface meaning-level changes — new capabilities, expanded scopes, new exfil paths — not just textual diffs.",
    },
    {
      icon: Network,
      title: "Fleet-wide visibility",
      body: "A single view of every MCP server connected by every team. Group by owner, capability, risk score; gate connections by policy; revoke an entire publisher in one click.",
    },
    {
      icon: FileSignature,
      title: "Auditable evidence",
      body: "Export SARIF for code-scanning pipelines, JSON for SIEMs, and signed PDF reports for procurement and SOC 2. Every finding carries the exact byte range that triggered it.",
    },
    {
      icon: Clock,
      title: "Policy as code",
      body: "Declare rules in YAML — deny shell, require human approval on filesystem writes, block servers without an attested publisher. Enforce in CI, at the gateway, or at the registry.",
    },
  ];
  return (
    <section id="pillars" className="border-b border-border/50 bg-card/40">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="max-w-2xl"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            Platform
          </div>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Six primitives. One audit trail.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.05 }}
              className="group bg-card p-8 transition-colors hover:bg-card/80"
            >
              <it.icon className="h-5 w-5 text-foreground" strokeWidth={1.5} />
              <h3 className="mt-6 text-[17px] font-medium tracking-tight">{it.title}</h3>
              <p className="mt-2 text-[14px] leading-[1.6] text-muted-foreground">{it.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    {
      n: "01",
      title: "Point Linejump at a server",
      body: "Paste a URL, a stdio command, or a manifest. Linejump fetches what the server actually exposes — not what its README claims.",
    },
    {
      n: "02",
      title: "Static + semantic audit",
      body: "We parse every instruction and tool description, run injection / ANSI / capability rules, and capture an immutable fingerprint of the response.",
    },
    {
      n: "03",
      title: "Sign, store, share",
      body: "Every audit is signed, versioned, and exportable. Wire it into CI to fail builds; into your registry to gate publishing; into procurement to approve vendors.",
    },
    {
      n: "04",
      title: "Diff on every change",
      body: "When a server's tool descriptions change, Linejump catches it the next time you scan — before the new bytes touch your model's context window.",
    },
  ];
  return (
    <section id="how" className="border-b border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease }}
          className="max-w-2xl"
        >
          <div className="text-[12px] uppercase tracking-[0.18em] text-muted-foreground">
            How it works
          </div>
          <h2 className="mt-3 text-balance text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
            Audit. Attest. Diff. Repeat.
          </h2>
        </motion.div>

        <div className="mt-14 grid gap-10 md:grid-cols-2">
          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, ease, delay: i * 0.06 }}
              className="flex gap-6"
            >
              <div className="font-mono text-[12px] tracking-wider text-muted-foreground">
                {s.n}
              </div>
              <div>
                <h3 className="text-[18px] font-medium tracking-tight">{s.title}</h3>
                <p className="mt-2 text-[14.5px] leading-[1.6] text-muted-foreground">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="border-b border-border/50">
      <div className="mx-auto max-w-6xl px-6 py-32 text-center">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="mx-auto max-w-3xl text-balance text-5xl font-semibold tracking-[-0.035em] sm:text-6xl"
        >
          Start with one server.
          <br />
          <span className="text-muted-foreground">See what's hiding in your fleet.</span>
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease, delay: 0.15 }}
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[14px] font-medium text-primary-foreground transition-all hover:opacity-90"
          >
            Open the scanner
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer>
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-12 text-[12.5px] text-muted-foreground sm:flex-row sm:items-center">
        <div className="flex items-center gap-2">
          <LinejumpLogo size={16} className="text-foreground" />
          <span>Linejump — pre-flight risk intelligence for MCP servers.</span>
        </div>
        <div>Built on research into MCP line-jumping attacks.</div>
      </div>
    </footer>
  );
}
