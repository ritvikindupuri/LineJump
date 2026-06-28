#!/usr/bin/env npx tsx
/**
 * Linejump CLI — MCP Server Security Scanner
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanManifest, parseManifestInput, mergePolicy, type ScanReport } from "../src/lib/mcp-scanner";
import type { ScannerPolicy } from "../src/lib/mcp-scanner";
import {
  evaluateCiCheck,
  generateCiCheckMarkdown,
  type CiCheckConfig,
} from "../src/lib/ci-check";
import { generateSarif } from "../src/lib/sarif";
import {
  fetchToolsListStdio,
  loadMcpConfig,
  parseStdioCommand,
  resolveMcpServer,
} from "../src/lib/mcp-stdio";

interface CliOptions {
  json: boolean;
  ci: boolean;
  sarif?: string;
  stdio?: string;
  mcpConfig?: string;
  server?: string;
  policyFile?: string;
  maxCritical?: number;
  maxHigh?: number;
  maxMedium?: number;
  minScore?: number;
}

function printHelp(): void {
  console.log(`
Linejump — MCP manifest security scanner

Usage:
  npx tsx cli/scan.ts <file|url|-> [options]
  npx tsx cli/scan.ts --stdio "npx -y @modelcontextprotocol/server-filesystem /tmp"
  npx tsx cli/scan.ts --mcp-config ~/.cursor/mcp.json --server filesystem

Inputs:
  ./manifest.json          Local JSON manifest or tools/list response
  https://host/mcp         Remote MCP HTTP endpoint
  -                        Read manifest JSON from stdin

Options:
  --stdio <command>        Spawn local MCP server over stdio and scan tools/list
  --mcp-config <path>      MCP config JSON (Cursor / Claude Desktop style)
  --server <name>          Server name inside --mcp-config (required with --mcp-config)
  --policy <path>          Optional policy JSON overlay
  --json                   Output full JSON report
  --sarif [file]           Write SARIF 2.1.0 (stdout if no file given)
  --ci                     CI-friendly markdown + exit 1 on threshold failure
  --max-critical=<n>       CI threshold (default 0)
  --max-high=<n>           CI threshold (default 0)
  --max-medium=<n>         CI threshold (default 100)
  --min-score=<n>          CI threshold (default 50)
  --help                   Show this help

Examples:
  npx tsx cli/scan.ts ./tools-list.json
  cat manifest.json | npx tsx cli/scan.ts -
  npx tsx cli/scan.ts --stdio "npx -y @modelcontextprotocol/server-filesystem /tmp"
  npx tsx cli/scan.ts --mcp-config ./mcp.json --server my-server --ci
`);
}

function parseArgs(args: string[]): { target?: string; options: CliOptions } {
  const options: CliOptions = { json: false, ci: false };
  let target: string | undefined;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i]!;
    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }     else if (arg === "--json") options.json = true;
    else if (arg === "--ci") options.ci = true;
    else if (arg === "--sarif") {
      const next = args[i + 1];
      options.sarif = next && !next.startsWith("--") ? args[++i] : "-";
    }
    else if (arg === "--stdio") options.stdio = args[++i];
    else if (arg === "--mcp-config") options.mcpConfig = args[++i];
    else if (arg === "--server") options.server = args[++i];
    else if (arg === "--policy") options.policyFile = args[++i];
    else if (arg.startsWith("--max-critical="))
      options.maxCritical = parseInt(arg.split("=")[1]!, 10);
    else if (arg.startsWith("--max-high=")) options.maxHigh = parseInt(arg.split("=")[1]!, 10);
    else if (arg.startsWith("--max-medium="))
      options.maxMedium = parseInt(arg.split("=")[1]!, 10);
    else if (arg.startsWith("--min-score=")) options.minScore = parseInt(arg.split("=")[1]!, 10);
    else if (!arg.startsWith("--") && !target) target = arg;
  }

  if (!target && !options.stdio && !options.mcpConfig) {
    printHelp();
    throw new Error("Provide a manifest file, URL, stdin (-), --stdio, or --mcp-config.");
  }
  if (options.mcpConfig && !options.server) {
    throw new Error("--server is required when using --mcp-config.");
  }

  return { target, options };
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const raw = Buffer.concat(chunks).toString("utf-8").trim();
  if (!raw) throw new Error("No input on stdin.");
  return raw;
}

async function loadPolicy(options: CliOptions): Promise<ScannerPolicy> {
  let userPolicy: ScannerPolicy = {};

  if (options.policyFile) {
    userPolicy = JSON.parse(fs.readFileSync(path.resolve(options.policyFile), "utf-8"));
  } else {
    try {
      const dbMod = await import("../src/lib/db.ts");
      const p = dbMod.getPolicy("default_org");
      if (p) userPolicy = p as ScannerPolicy;
    } catch {
      // no local db — defaults only
    }
  }

  return mergePolicy(userPolicy);
}

async function resolveManifest(
  target: string | undefined,
  options: CliOptions,
): Promise<string> {
  if (options.mcpConfig && options.server) {
    const config = loadMcpConfig(options.mcpConfig);
    const server = resolveMcpServer(config, options.server);
    return fetchToolsListStdio(server.command, server.args ?? [], server.env ?? {});
  }

  if (options.stdio) {
    const { command, args } = parseStdioCommand(options.stdio);
    return fetchToolsListStdio(command, args);
  }

  if (target === "-" || target === undefined) {
    return readStdin();
  }

  if (target.startsWith("http://") || target.startsWith("https://")) {
    const res = await fetch(target);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.text();
  }

  return fs.readFileSync(path.resolve(target), "utf-8");
}

function formatScore(score: number): string {
  if (score >= 75) return `\x1b[32m${score}/100\x1b[0m`;
  if (score >= 50) return `\x1b[33m${score}/100\x1b[0m`;
  return `\x1b[31m${score}/100\x1b[0m`;
}

function formatSeverity(sev: string): string {
  const colors: Record<string, string> = {
    critical: "\x1b[31m",
    high: "\x1b[33m",
    medium: "\x1b[93m",
    low: "\x1b[34m",
    info: "\x1b[90m",
  };
  return `${colors[sev] || ""}${sev}\x1b[0m`;
}

function printReport(report: ScanReport): void {
  const critical = report.findings.filter((f) => f.severity === "critical").length;
  const high = report.findings.filter((f) => f.severity === "high").length;
  const medium = report.findings.filter((f) => f.severity === "medium").length;
  const low = report.findings.filter((f) => f.severity === "low").length;

  console.log(`\n  ${"=".repeat(54)}`);
  console.log(`  LINEJUMP — MCP Server Security Scan`);
  console.log(`  Engine:    ${report.engineVersion}`);
  console.log(`  ${"=".repeat(54)}`);
  console.log(`  Server:    ${report.serverName}`);
  console.log(`  Tools:     ${report.toolCount}`);
  console.log(`  Score:     ${formatScore(report.score)}`);
  console.log(
    `  Findings:  ${report.findings.length} total (C:${critical} H:${high} M:${medium} L:${low})`,
  );
  console.log(`  ${"=".repeat(54)}\n`);

  if (report.findings.length === 0) {
    console.log("  ✓ No findings detected.\n");
    return;
  }

  for (const f of report.findings) {
    const sev = formatSeverity(f.severity);
    const tool = f.toolName ? `\x1b[90m[${f.toolName}]\x1b[0m ` : "";
    const rule = f.ruleId ? `\x1b[90m(${f.ruleId})\x1b[0m ` : "";
    console.log(`  ${sev}  ${tool}${rule}${f.title}`);
    console.log(
      `       ${f.category} — ${f.detail.substring(0, 120)}${f.detail.length > 120 ? "…" : ""}`,
    );
    if (f.evidence) {
      console.log(`       \x1b[90mEvidence: ${f.evidence}\x1b[0m`);
    }
    console.log();
  }
}

async function main() {
  const raw = process.argv.slice(2);
  if (raw[0] === "scan") raw.shift();
  const { target, options } = parseArgs(raw);

  try {
    const manifestRaw = await resolveManifest(target, options);
    const manifest = parseManifestInput(manifestRaw);
    const policy = await loadPolicy(options);
    const report = scanManifest(manifest, policy);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (options.sarif) {
      const sarif = generateSarif(report, target ?? "linejump://manifest");
      if (options.sarif === "-") {
        console.log(sarif);
      } else {
        fs.writeFileSync(path.resolve(options.sarif), sarif, "utf-8");
        console.error(`SARIF written to ${options.sarif}`);
      }
      return;
    }

    const ciConfig: CiCheckConfig = {};
    if (options.maxCritical !== undefined) ciConfig.maxCritical = options.maxCritical;
    if (options.maxHigh !== undefined) ciConfig.maxHigh = options.maxHigh;
    if (options.maxMedium !== undefined) ciConfig.maxMedium = options.maxMedium;
    if (options.minScore !== undefined) ciConfig.minScore = options.minScore;
    const result = evaluateCiCheck(report.score, report.findings, ciConfig);

    if (options.ci) {
      console.log(generateCiCheckMarkdown(result));
      process.exit(result.passed ? 0 : 1);
    }

    printReport(report);

    if (!result.passed) {
      console.error(`\n\x1b[31mScan failed threshold constraints.\x1b[0m`);
      process.exit(1);
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\x1b[31mError:\x1b[0m ${msg}`);
    process.exit(1);
  }
}

main();
