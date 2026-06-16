#!/usr/bin/env bun
/**
 * Linejump CLI — MCP Server Security Scanner
 *
 * Usage:
 *   bun run cli scan ./manifest.json
 *   bun run cli scan https://example.com/manifest.json
 *   bun run cli scan ./manifest.json --max-critical=0 --max-high=1 --min-score=60
 *   bun run cli scan ./manifest.json --json    # output JSON
 *   bun run cli scan ./manifest.json --ci      # CI-friendly markdown output
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { scanManifest, parseManifestInput, type ScanReport } from "../src/lib/mcp-scanner";
import { evaluateCiCheck, generateCiCheckMarkdown, DEFAULT_CI_CONFIG, type CiCheckConfig } from "../src/lib/ci-check";

interface CliOptions {
  json: boolean;
  ci: boolean;
  maxCritical?: number;
  maxHigh?: number;
  maxMedium?: number;
  minScore?: number;
}

function parseArgs(args: string[]): { fileOrUrl: string; options: CliOptions } {
  const options: CliOptions = { json: false, ci: false };
  let fileOrUrl = "";

  for (const arg of args) {
    if (arg === "--json") options.json = true;
    else if (arg === "--ci") options.ci = true;
    else if (arg.startsWith("--max-critical=")) options.maxCritical = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--max-high=")) options.maxHigh = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--max-medium=")) options.maxMedium = parseInt(arg.split("=")[1], 10);
    else if (arg.startsWith("--min-score=")) options.minScore = parseInt(arg.split("=")[1], 10);
    else if (!arg.startsWith("--") && !fileOrUrl) fileOrUrl = arg;
  }

  if (!fileOrUrl) throw new Error("Usage: linejump scan <file-or-url> [options]");

  return { fileOrUrl, options };
}

async function readInput(fileOrUrl: string): Promise<string> {
  if (fileOrUrl.startsWith("http://") || fileOrUrl.startsWith("https://")) {
    const res = await fetch(fileOrUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
    return await res.text();
  }
  return fs.readFileSync(path.resolve(fileOrUrl), "utf-8");
}

function formatScore(score: number): string {
  if (score >= 75) return `\x1b[32m${score}/100\x1b[0m`;
  if (score >= 50) return `\x1b[33m${score}/100\x1b[0m`;
  return `\x1b[31m${score}/100\x1b[0m`;
}

function formatSeverity(sev: string): string {
  const colors: Record<string, string> = {
    critical: "\x1b[31m", high: "\x1b[33m", medium: "\x1b[93m", low: "\x1b[34m", info: "\x1b[90m",
  };
  const reset = "\x1b[0m";
  return `${colors[sev] || ""}${sev}${reset}`;
}

function printReport(report: ScanReport): void {
  const critical = report.findings.filter(f => f.severity === "critical").length;
  const high = report.findings.filter(f => f.severity === "high").length;
  const medium = report.findings.filter(f => f.severity === "medium").length;
  const low = report.findings.filter(f => f.severity === "low").length;

  console.log(`\n  ${"=".repeat(54)}`);
  console.log(`  LINEJUMP — MCP Server Security Scan`);
  console.log(`  ${"=".repeat(54)}`);
  console.log(`  Server:    ${report.serverName}`);
  console.log(`  Tools:     ${report.toolCount}`);
  console.log(`  Score:     ${formatScore(report.score)}`);
  console.log(`  Findings:  ${report.findings.length} total (C:${critical} H:${high} M:${medium} L:${low})`);
  console.log(`  ${"=".repeat(54)}\n`);

  if (report.findings.length === 0) {
    console.log("  ✓ No findings detected.\n");
    return;
  }

  for (const f of report.findings) {
    const sev = formatSeverity(f.severity);
    const tool = f.toolName ? `\x1b[90m[${f.toolName}]\x1b[0m ` : "";
    console.log(`  ${sev}  ${tool}${f.title}`);
    console.log(`       ${f.category} — ${f.detail.substring(0, 120)}${f.detail.length > 120 ? "…" : ""}`);
    if (f.evidence) {
      console.log(`       \x1b[90mEvidence: ${f.evidence}\x1b[0m`);
    }
    console.log();
  }
}

async function main() {
  const raw = process.argv.slice(2);
  if (raw[0] === "scan") raw.shift();
  const args = raw;
  const { fileOrUrl, options } = parseArgs(args);

  try {
    const raw = await readInput(fileOrUrl);
    const manifest = parseManifestInput(raw);
    const report = scanManifest(manifest);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    if (options.ci) {
      const ciConfig: CiCheckConfig = {};
      if (options.maxCritical !== undefined) ciConfig.maxCritical = options.maxCritical;
      if (options.maxHigh !== undefined) ciConfig.maxHigh = options.maxHigh;
      if (options.maxMedium !== undefined) ciConfig.maxMedium = options.maxMedium;
      if (options.minScore !== undefined) ciConfig.minScore = options.minScore;
      const result = evaluateCiCheck(report.score, report.findings, ciConfig);
      console.log(generateCiCheckMarkdown(result));
      process.exit(result.passed ? 0 : 1);
      return;
    }

    printReport(report);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`\x1b[31mError:\x1b[0m ${msg}`);
    process.exit(1);
  }
}

main();
