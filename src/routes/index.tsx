import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "motion/react";
import { LinejumpWordmark } from "../components/linejump-logo";
import { Button } from "../components/ui/button";
import { ArrowRight, Shield, FileSearch, GitBranch, Library, ScanLine, Eye, Server, Download, Bell, LayoutList } from "lucide-react";

export const Route = createFileRoute("/")({
  component: LandingPage,
});

const fadeUp = {
  initial: { y: 30, opacity: 0 },
  animate: { y: 0, opacity: 1 },
};

const stagger = {
  animate: { transition: { staggerChildren: 0.12 } },
};

function AnimatedGradient() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute -left-[30%] -top-[20%] h-[60%] w-[60%] rounded-full bg-gradient-to-br from-[#6C5CE7]/20 blur-[120px]" />
      <div className="absolute -right-[20%] top-[10%] h-[50%] w-[50%] rounded-full bg-gradient-to-bl from-[#00CEC9]/15 blur-[120px]" />
      <div className="absolute bottom-[0%] left-[20%] h-[40%] w-[40%] rounded-full bg-gradient-to-tr from-[#FDCB6E]/10 blur-[100px]" />
    </div>
  );
}

function HeroSection() {
  return (
    <section className="relative flex min-h-[85vh] flex-col items-center justify-center px-6 pt-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="mb-6"
      >
        <div className="inline-flex items-center gap-2 rounded-full border border-border bg-background/60 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur-sm">
          <Shield className="h-3 w-3 text-[#6C5CE7]" />
          MCP Server Security Scanner
        </div>
      </motion.div>

      <motion.h1
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
        className="max-w-4xl text-center text-5xl font-bold leading-[1.08] tracking-tight sm:text-6xl md:text-7xl"
      >
        <span className="bg-gradient-to-r from-[#6C5CE7] via-[#00CEC9] to-[#6C5CE7] bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient">
          Security is not a feature.
        </span>
        <br />
        It's a scan away.
      </motion.h1>

      <motion.p
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
        className="mt-6 max-w-2xl text-center text-lg leading-relaxed text-muted-foreground"
      >
        Linejump analyzes MCP server manifests for prompt injection, hidden escapes,
        over-broad capabilities, and cross-tool exfiltration paths — before they reach your agents.
      </motion.p>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.45 }}
        className="mt-10 flex flex-wrap items-center justify-center gap-4"
      >
        <Link to="/app">
          <Button size="lg" className="rounded-full px-8 text-sm font-medium shadow-lg shadow-[#6C5CE7]/20">
            Start Scanning
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </Link>
        <Link to="/docs">
          <Button variant="outline" size="lg" className="rounded-full px-8 text-sm font-medium">
            Read the Docs
          </Button>
        </Link>
      </motion.div>

      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.6 }}
        className="mt-16 w-full max-w-3xl"
      >
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl">
          <div className="flex items-center gap-2 border-b border-border/30 px-5 py-3">
            <div className="h-3 w-3 rounded-full bg-red-400/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
            <div className="h-3 w-3 rounded-full bg-green-400/80" />
            <span className="ml-3 text-xs text-muted-foreground">linejump scan ./manifest.json</span>
          </div>
          <div className="p-5 font-mono text-xs leading-relaxed">
            <span className="text-green-500">✓</span> Scanning <span className="text-foreground">./manifest.json</span>...<br />
            <span className="text-yellow-400">!</span> <span className="text-yellow-400/80">medium</span> Description contains control characters (tool: read_file)<br />
            <span className="text-red-400">✗</span> <span className="text-red-400/80">critical</span> Prompt injection phrases detected: "ignore previous", "override" (tool: search_tool)<br />
            <span className="text-yellow-400">!</span> <span className="text-yellow-400/80">high</span> ANSI terminal escape sequence detected (tool: csv_export)<br />
            <span className="text-yellow-400">!</span> <span className="text-yellow-400/80">medium</span> Reader + outbound sender combination detected<br />
            <br />
            <span className="text-foreground">Score: 54/100 — High Risk</span><br />
            <span className="text-red-400">CI check failed: 1 critical, 2 high exceed thresholds</span>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 flex items-center gap-6 text-xs text-muted-foreground"
      >
        <span className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> No sign-up required</span>
        <span className="flex items-center gap-1.5"><ScanLine className="h-3 w-3" /> Scans run locally</span>
        <span className="flex items-center gap-1.5"><Download className="h-3 w-3" /> PDF reports included</span>
      </motion.div>
    </section>
  );
}

function FeatureCard({ icon: Icon, title, description, index }: { icon: typeof Shield; title: string; description: string; index: number }) {
  return (
    <motion.div
      initial={{ y: 30, opacity: 0 }}
      whileInView={{ y: 0, opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: index * 0.1 }}
      className="group rounded-2xl border border-border/50 bg-card/30 p-6 backdrop-blur-sm transition-colors hover:border-border/80"
    >
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#6C5CE7]/10 to-[#00CEC9]/10">
        <Icon className="h-5 w-5 text-[#6C5CE7]" />
      </div>
      <h3 className="mb-2 text-base font-semibold">{title}</h3>
      <p className="text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function FeaturesSection() {
  const features = [
    { icon: Eye, title: "Line-Jumping Detection", description: "Detects prompt injection phrases, ANSI escapes, and zero-width Unicode characters used to hide instructions from human review." },
    { icon: FileSearch, title: "Deep Manifest Analysis", description: "Scans every tool name, description, and input schema for hidden control characters, system-role overrides, and confusable homoglyphs." },
    { icon: Server, title: "Capability Auditing", description: "Flags excessive filesystem, shell, network, and credential access. Identifies cross-tool exfiltration paths where readers and senders coexist." },
    { icon: GitBranch, title: "CI Pipeline Ready", description: "Run `linejump scan ./server.json` in your CI pipeline. Fail builds on critical or high-severity findings with configurable thresholds." },
    { icon: Library, title: "Community Catalog", description: "Browse scan results for popular MCP servers. Submit your own scans and help build a shared knowledge base of server trustworthiness." },
    { icon: Bell, title: "Share & Report", description: "Export professional PDF reports with executive summaries. Share findings via Slack webhooks, email, or shareable links." },
  ];

  return (
    <section className="mx-auto max-w-6xl px-6 py-32">
      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6 }}
        className="mb-16 text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Everything you need to vet MCP servers
        </h2>
        <p className="mt-4 text-muted-foreground">
          From quick one-off scans to pipeline-gated security checks.
        </p>
      </motion.div>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <FeatureCard key={f.title} icon={f.icon} title={f.title} description={f.description} index={i} />
        ))}
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="border-t border-border/40 bg-card/20 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <div className="grid gap-8 sm:grid-cols-3">
          {[
            { value: "50+", label: "Injection patterns detected" },
            { value: "3", label: "Detection layers (regex, homoglyph, LLM)" },
            { value: "PDF", label: "Professional security reports" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="text-center"
            >
              <div className="text-3xl font-bold text-[#6C5CE7]">{stat.value}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{stat.label}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CtaSection() {
  return (
    <section className="px-6 py-32">
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        whileInView={{ y: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-2xl text-center"
      >
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to scan your first server?
        </h2>
        <p className="mt-4 text-muted-foreground">
          No account. No setup. Paste a manifest or fetch one by URL.
        </p>
        <div className="mt-8 flex items-center justify-center gap-4">
          <Link to="/app">
            <Button size="lg" className="rounded-full px-8 text-sm font-medium shadow-lg shadow-[#6C5CE7]/20">
              Launch Scanner
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function FooterSection() {
  return (
    <footer className="border-t border-border/40 px-6 py-10">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 sm:flex-row">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <LinejumpWordmark height={14} />
          <span className="ml-2">— MCP Server Security Scanner</span>
        </div>
        <div className="flex items-center gap-6 text-xs text-muted-foreground">
          <Link to="/app" className="transition-colors hover:text-foreground">Scanner</Link>
          <Link to="/catalog" className="transition-colors hover:text-foreground">Catalog</Link>
          <Link to="/docs" className="transition-colors hover:text-foreground">Docs</Link>
          <a href="https://github.com/ritvikindupuri/mcp-sentinel" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-foreground">GitHub</a>
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  const { scrollYProgress } = useScroll();
  const headerOpacity = useTransform(scrollYProgress, [0, 0.05], [0, 1]);

  return (
    <>
      <motion.div
        style={{ opacity: headerOpacity }}
        className="fixed top-0 left-0 right-0 z-40 h-0.5 origin-left bg-gradient-to-r from-[#6C5CE7] via-[#00CEC9] to-[#6C5CE7]"
      />
      <AnimatedGradient />
      <HeroSection />
      <FeaturesSection />
      <StatsSection />
      <CtaSection />
      <FooterSection />
    </>
  );
}
