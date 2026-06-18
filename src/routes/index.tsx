import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { ArrowRight, Fingerprint, ScanSearch, GitCompare, Globe, ShieldCheck } from "lucide-react";
import { LinejumpLogo } from "@/components/linejump-logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Linejump — MCP security, pre-flight" },
      {
        name: "description",
        content:
          "Audit every MCP server before it reaches your model. Forensic manifest analysis, drift detection, and fleet-wide visibility.",
      },
      {
        property: "og:title",
        content: "Linejump — MCP security, pre-flight",
      },
      {
        property: "og:description",
        content: "Audit every MCP server before it reaches your model.",
      },
    ],
  }),
  component: Landing,
});

const ease = [0.16, 1, 0.3, 1] as const;
const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.9, ease },
};

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Nav />
      <Hero />
      <Statement />
      <Features />
      <Steps />
      <CTA />
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <motion.header
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, ease }}
      className="sticky top-0 z-30 border-b border-border/40 bg-background/80 backdrop-blur-2xl"
    >
      <div className="mx-auto flex h-12 max-w-5xl items-center justify-between px-6">
        <Link to="/" className="flex items-center gap-2">
          <LinejumpLogo size={20} className="text-foreground" />
          <span className="text-[14px] font-medium tracking-tight">Linejump</span>
        </Link>
        <Link
          to="/app"
          className="group inline-flex items-center gap-1.5 text-[13px] font-medium text-foreground transition-opacity hover:opacity-60"
        >
          Scanner
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_-10%,oklch(0.78_0.08_55_/_0.12),transparent)]" />
      <div className="mx-auto max-w-5xl px-6 pb-20 pt-24 sm:pt-32 sm:pb-28">
        <motion.div
          initial="initial"
          animate="animate"
          transition={{ staggerChildren: 0.1 }}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.h1
            {...fadeUp}
            className="text-balance text-[2.75rem] font-semibold leading-[1.05] tracking-[-0.045em] sm:text-7xl"
          >
            Audit every MCP server.
            <br />
            <span className="text-muted-foreground">Before it reaches your model.</span>
          </motion.h1>

          <motion.p
            {...fadeUp}
            className="mx-auto mt-6 max-w-md text-pretty text-[17px] leading-relaxed text-muted-foreground sm:text-[19px]"
          >
            Forensic scans of manifests, tools, and instructions — before a single byte hits
            context.
          </motion.p>

          <motion.div {...fadeUp} className="mt-10">
            <Link
              to="/app"
              className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-85"
            >
              Run a scan
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease, delay: 0.3 }}
          className="relative mx-auto mt-20 max-w-3xl sm:mt-28"
        >
          <ScanCard />
        </motion.div>
      </div>
    </section>
  );
}

function ScanCard() {
  const rows: { sev: "critical" | "high" | "medium" | "ok"; label: string }[] = [
    { sev: "critical", label: "Embedded system override" },
    { sev: "high", label: "Hidden ANSI escape sequence" },
    { sev: "high", label: "Prompt-injection phrase" },
    { sev: "medium", label: "Reader + outbound sender pair" },
    { sev: "ok", label: "Trust pin verified" },
  ];
  const sevColor = {
    critical: "bg-destructive/12 text-destructive",
    high: "bg-[oklch(0.72_0.14_45_/_0.12)] text-[oklch(0.42_0.16_40)]",
    medium: "bg-[oklch(0.78_0.12_75_/_0.15)] text-[oklch(0.4_0.1_70)]",
    ok: "bg-[oklch(0.78_0.08_150_/_0.15)] text-[oklch(0.38_0.09_150)]",
  };
  return (
    <div className="rounded-[1.25rem] border border-border/60 bg-card/60 p-1 shadow-[0_40px_100px_-40px_oklch(0.35_0.05_55_/_0.2)] backdrop-blur-xl">
      <div className="rounded-[1rem] bg-background/50 px-6 py-7 sm:px-8 sm:py-9">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          <span className="font-mono normal-case tracking-normal">acme-mcp · v1.4.2</span>
          <span>0.6s</span>
        </div>
        <div className="mt-7 space-y-2">
          {rows.map((r, i) => (
            <motion.div
              key={r.label}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.5 + i * 0.07 }}
              className="flex items-center gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-secondary/40"
            >
              <span
                className={`rounded-md px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${sevColor[r.sev]}`}
              >
                {r.sev}
              </span>
              <span className="text-[14px] text-foreground">{r.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Statement() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.9, ease }}
          className="mx-auto max-w-2xl text-center"
        >
          <h2 className="text-balance text-3xl font-semibold tracking-[-0.035em] sm:text-5xl">
            Not a runtime wrapper.
            <br />
            <span className="text-muted-foreground">An evidence layer.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-md text-[16px] leading-relaxed text-muted-foreground sm:text-[17px]">
            Scan before you connect. Pin trust. Catch drift. Export proof.
          </p>
        </motion.div>
      </div>
    </section>
  );
}

function Features() {
  const items = [
    {
      icon: ScanSearch,
      title: "Forensic analysis",
      body: "Every tool, schema, and instruction — scanned for injection, escapes, and hidden capabilities.",
    },
    {
      icon: Fingerprint,
      title: "Trust pinning",
      body: "A fingerprint of exactly what the server exposed. Silent updates fail before your model sees them.",
    },
    {
      icon: GitCompare,
      title: "Drift detection",
      body: "Compare any two versions. Surface new capabilities and expanded scopes — not just text diffs.",
    },
  ];
  return (
    <section className="border-t border-border/40 bg-card/30">
      <div className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
        <div className="grid gap-16 sm:grid-cols-3 sm:gap-10">
          {items.map((it, i) => (
            <motion.div
              key={it.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.7, ease, delay: i * 0.08 }}
              className="text-center sm:text-left"
            >
              <it.icon className="mx-auto h-5 w-5 text-foreground sm:mx-0" strokeWidth={1.5} />
              <h3 className="mt-5 text-[19px] font-semibold tracking-[-0.02em]">{it.title}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{it.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Steps() {
  const steps = [
    {
      n: "01",
      title: "Point at a server",
      body: "URL, manifest, or live endpoint.",
      visual: <StepVisualPoint />,
    },
    {
      n: "02",
      title: "Run the audit",
      body: "Static rules plus semantic analysis.",
      visual: <StepVisualAudit />,
    },
    {
      n: "03",
      title: "Export and enforce",
      body: "CI, registry, or gateway.",
      visual: <StepVisualEnforce />,
    },
  ];

  return (
    <section className="border-t border-border/40 overflow-hidden">
      <div className="mx-auto max-w-5xl px-6 py-28 sm:py-36">
        <motion.h2
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="text-center text-3xl font-semibold tracking-[-0.035em] sm:text-5xl"
        >
          Three steps. Done.
        </motion.h2>

        <div className="mx-auto mt-16 max-w-4xl">
          <div className="grid gap-10 sm:grid-cols-3 sm:gap-6">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.7, ease, delay: i * 0.12 }}
                className="flex flex-col items-center text-center"
              >
                <div className="w-full overflow-hidden rounded-2xl border border-border/60 bg-card/50 shadow-[0_20px_60px_-30px_oklch(0.35_0.05_55_/_0.18)] backdrop-blur-sm">
                  <div className="flex items-center justify-between border-b border-border/50 px-4 py-2.5">
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground">
                      {s.n}
                    </span>
                    <span className="h-1.5 w-1.5 rounded-full bg-accent/80" />
                  </div>
                  <div className="flex h-[9.5rem] items-center justify-center p-4">{s.visual}</div>
                </div>

                <h3 className="mt-5 text-[17px] font-semibold tracking-[-0.02em]">{s.title}</h3>
                <p className="mt-1.5 max-w-[11rem] text-[14px] leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function StepVisualPoint() {
  return (
    <div className="w-full max-w-[11rem] space-y-2">
      <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background/80 px-2.5 py-2">
        <Globe className="h-3.5 w-3.5 shrink-0 text-muted-foreground" strokeWidth={1.5} />
        <span className="truncate font-mono text-[10px] text-muted-foreground">
          mcp.example.com
        </span>
      </div>
      <div className="rounded-lg border border-dashed border-border/60 bg-background/40 px-2.5 py-2">
        <div className="font-mono text-[9px] leading-relaxed text-muted-foreground/80">
          {`{ "tools": [ … ] }`}
        </div>
      </div>
    </div>
  );
}

function StepVisualAudit() {
  const rows = [
    { sev: "bg-destructive/70", w: "w-[85%]" },
    { sev: "bg-[oklch(0.72_0.14_45)]", w: "w-[70%]" },
    { sev: "bg-[oklch(0.78_0.12_75)]", w: "w-[55%]" },
    { sev: "bg-[oklch(0.6_0.12_150)]", w: "w-[40%]" },
  ];
  return (
    <div className="flex w-full max-w-[11rem] flex-col items-center gap-3">
      <div className="relative flex h-14 w-14 items-center justify-center rounded-full border border-border/60 bg-background/80">
        <ScanSearch className="h-5 w-5 text-foreground" strokeWidth={1.5} />
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, ease, delay: 0.3 }}
          className="absolute inset-0 rounded-full border border-foreground/10"
        />
        <motion.div
          animate={{ scale: [1, 1.35, 1], opacity: [0.35, 0, 0.35] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="absolute inset-0 rounded-full border border-foreground/15"
        />
      </div>
      <div className="w-full space-y-1.5">
        {rows.map((r, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -8 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease, delay: 0.35 + i * 0.08 }}
            className="flex items-center gap-2"
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.sev}`} />
            <div className={`h-1.5 rounded-full bg-secondary ${r.w}`} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function StepVisualEnforce() {
  const targets = ["CI", "Registry", "Gateway"];
  return (
    <div className="flex w-full max-w-[10rem] flex-col items-center gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/50 bg-background/80">
        <ShieldCheck className="h-4 w-4 text-foreground" strokeWidth={1.5} />
      </div>
      <div className="flex w-full flex-col gap-1.5">
        {targets.map((t, i) => (
          <motion.div
            key={t}
            initial={{ opacity: 0, y: 4 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, ease, delay: 0.25 + i * 0.08 }}
            className="w-full rounded-lg border border-border/50 bg-background/70 px-3 py-2 text-center text-[11px] font-medium tracking-wide text-foreground"
          >
            {t}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function CTA() {
  return (
    <section className="border-t border-border/40">
      <div className="mx-auto max-w-5xl px-6 py-32 text-center sm:py-40">
        <motion.h2
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.8, ease }}
          className="text-balance text-4xl font-semibold tracking-[-0.04em] sm:text-6xl"
        >
          See what&apos;s hiding
          <br />
          <span className="text-muted-foreground">in your fleet.</span>
        </motion.h2>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease, delay: 0.12 }}
          className="mt-10"
        >
          <Link
            to="/app"
            className="group inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-[15px] font-medium text-primary-foreground transition-opacity hover:opacity-85"
          >
            Open scanner
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-border/40">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-8 text-[12px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <LinejumpLogo size={14} className="text-foreground" />
          <span>Linejump</span>
        </div>
        <span>MCP security, pre-flight.</span>
      </div>
    </footer>
  );
}
