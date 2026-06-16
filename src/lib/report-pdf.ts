import { jsPDF } from "jspdf";
import type { ScanReport, Finding, RiskSeverity } from "./mcp-scanner";

const SEVERITY_COLORS: Record<RiskSeverity, [number, number, number]> = {
  critical: [200, 40, 40],
  high: [220, 120, 30],
  medium: [210, 170, 30],
  low: [100, 140, 200],
  info: [120, 120, 120],
};

function severityLabel(s: RiskSeverity): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDate(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function scoreToGrade(score: number): { grade: string; label: string; color: [number, number, number] } {
  if (score >= 90) return { grade: "A", label: "Secure", color: [50, 160, 80] };
  if (score >= 75) return { grade: "B", label: "Low Risk", color: [100, 180, 100] };
  if (score >= 55) return { grade: "C", label: "Moderate Risk", color: [210, 170, 30] };
  if (score >= 35) return { grade: "D", label: "High Risk", color: [220, 120, 30] };
  return { grade: "F", label: "Critical Risk", color: [200, 40, 40] };
}

export async function generatePdfReport(report: ScanReport, rawManifest?: string): Promise<Blob> {
  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const pw = 210;
  const lm = 20;
  const rm = 20;
  const cw = pw - lm - rm;
  let y = 20;

  const grade = scoreToGrade(report.score);

  // -- cover / executive summary page --
  // Header accent bar
  doc.setFillColor(108, 92, 231);
  doc.rect(0, 0, pw, 6, "F");

  // Title
  doc.setTextColor(30, 30, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("MCP Server Security Report", lm, y + 10);

  // Server name
  doc.setFont("helvetica", "normal");
  doc.setFontSize(16);
  doc.setTextColor(80, 80, 100);
  doc.text(`"${report.serverName}"`, lm, y + 22);

  // Grade badge
  const gx = pw - lm - 30;
  doc.setFillColor(...grade.color);
  doc.setDrawColor(...grade.color);
  doc.roundedRect(gx, y + 6, 30, 24, 3, 3, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text(grade.grade, gx + 15, y + 23, { align: "center" });

  // Score bar
  y += 38;
  doc.setFillColor(230, 230, 235);
  doc.roundedRect(lm, y, cw, 8, 4, 4, "F");
  const scoreW = (report.score / 100) * cw;
  doc.setFillColor(...grade.color);
  doc.roundedRect(lm, y, scoreW, 8, 4, 4, "F");
  doc.setTextColor(60, 60, 80);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(`Safety Score: ${report.score}/100`, lm, y + 14);
  doc.setTextColor(100, 100, 120);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(`Scanned: ${formatDate(report.scannedAt)}`, lm + 80, y + 14);

  y += 26;

  // Executive summary section
  doc.setFillColor(108, 92, 231);
  doc.rect(lm, y, 3, 14, "F");
  doc.setTextColor(30, 30, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("EXECUTIVE SUMMARY", lm + 8, y + 10);
  y += 20;

  const criticalCount = report.findings.filter((f) => f.severity === "critical").length;
  const highCount = report.findings.filter((f) => f.severity === "high").length;
  const mediumCount = report.findings.filter((f) => f.severity === "medium").length;
  const lowCount = report.findings.filter((f) => f.severity === "low").length;

  const summaryLines = [
    `Linejump performed an automated security analysis of the MCP server "${report.serverName}". The server exposes ${report.toolCount} tool(s) across its manifest.`,
    `The overall safety score is ${report.score}/100 (Grade ${grade.grade} — ${grade.label}). A total of ${report.findings.length} finding(s) were identified across ${criticalCount} critical, ${highCount} high, ${mediumCount} medium, and ${lowCount} low-severity categories.`,
    `Findings span prompt injection risks, hidden encoding techniques, broad capability declarations, suspicious tool naming, and potential cross-tool exfiltration paths. Each finding is detailed in the following sections with actionable remediation guidance.`,
  ];

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 80);

  for (const line of summaryLines) {
    const lines = doc.splitTextToSize(line, cw - 8);
    for (const l of lines) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(l, lm + 4, y);
      y += 5.5;
    }
    y += 3;
  }

  // Key metrics box
  y += 4;
  if (y > 265) {
    doc.addPage();
    y = 20;
  }

  const metricsLeft = [
    `Server Name: ${report.serverName}`,
    `Tools Scanned: ${report.toolCount}`,
    `Scan Date: ${formatDate(report.scannedAt)}`,
  ];
  const metricsRight = [
    `Total Findings: ${report.findings.length}`,
    `Critical: ${criticalCount} | High: ${highCount}`,
    `Medium: ${mediumCount} | Low: ${lowCount}`,
  ];

  doc.setFillColor(245, 245, 250);
  doc.roundedRect(lm, y, cw, 28, 3, 3, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(80, 80, 100);

  let my = y + 8;
  for (const m of metricsLeft) {
    doc.text(m, lm + 6, my);
    my += 6;
  }
  my = y + 8;
  for (const m of metricsRight) {
    doc.text(m, lm + cw / 2 + 4, my);
    my += 6;
  }

  y += 38;

  // -- findings page --
  if (report.findings.length > 0) {
    doc.addPage();
    y = 20;

    doc.setFillColor(108, 92, 231);
    doc.rect(0, 0, pw, 6, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30, 30, 40);
    doc.text("Detailed Findings", lm, y + 10);

    y += 20;

    // Table header
    doc.setFillColor(50, 50, 70);
    doc.rect(lm, y - 5, cw, 8, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Severity", lm + 3, y);
    doc.text("Category", lm + 22, y);
    doc.text("Tool", lm + 52, y);
    doc.text("Title / Detail", lm + 80, y);
    y += 8;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    for (const f of report.findings) {
      if (y > 275) {
        doc.addPage();
        y = 20;
        doc.setFillColor(50, 50, 70);
        doc.rect(lm, y - 5, cw, 8, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("Severity", lm + 3, y);
        doc.text("Category", lm + 22, y);
        doc.text("Tool", lm + 52, y);
        doc.text("Title / Detail", lm + 80, y);
        y += 8;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
      }

      const rowBg = report.findings.indexOf(f) % 2 === 0 ? [248, 248, 252] : [255, 255, 255];
      doc.setFillColor(...rowBg);
      doc.rect(lm, y - 5, cw, report.findings.indexOf(f) === report.findings.length - 1 ? 15 : 15, "F");

      // Severity badge
      const [sr, sg, sb] = SEVERITY_COLORS[f.severity];
      doc.setFillColor(sr, sg, sb);
      doc.roundedRect(lm + 1, y - 4, 16, 6, 2, 2, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(severityLabel(f.severity), lm + 9, y, { align: "center" });

      doc.setTextColor(50, 50, 60);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(f.category, lm + 24, y);
      doc.text(f.toolName || "—", lm + 54, y);

      // Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(f.title, lm + 80, y);

      // Detail
      y += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(90, 90, 110);
      const detailLines = doc.splitTextToSize(f.detail, cw - 84);
      for (const dl of detailLines.slice(0, 3)) {
        if (y > 282) break;
        doc.text(dl, lm + 80, y);
        y += 4;
      }
      y = Math.max(y + 2, y);
    }
  }

  // -- conclusion page --
  doc.addPage();
  y = 20;

  doc.setFillColor(108, 92, 231);
  doc.rect(0, 0, pw, 6, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(30, 30, 40);
  doc.text("Conclusion & Recommendations", lm, y + 10);
  y += 22;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(60, 60, 80);

  let conclusionSummary: string;
  if (report.score >= 75) {
    conclusionSummary = `The MCP server "${report.serverName}" presents a ${grade.label.toLowerCase()} profile with a safety score of ${report.score}/100. While no immediate critical threats were detected, the ${report.findings.length} finding(s) identified should be reviewed as part of standard security hygiene.`;
  } else if (report.score >= 50) {
    conclusionSummary = `The MCP server "${report.serverName}" shows a ${grade.label.toLowerCase()} security posture (score: ${report.score}/100). Several findings require attention, particularly in the ${criticalCount > 0 ? `critical (${criticalCount}) and ` : ""}high-severity (${highCount}) categories. Remediation is recommended before deploying this server in sensitive environments.`;
  } else {
    conclusionSummary = `The MCP server "${report.serverName}" exhibits a ${grade.label.toLowerCase()} security posture with a score of ${report.score}/100. Immediate action is recommended. The server contains ${criticalCount} critical and ${highCount} high-severity findings that could pose significant risk if exploited through prompt injection or line-jumping attacks.`;
  }

  const conclusionLines = doc.splitTextToSize(conclusionSummary, cw - 8);
  for (const l of conclusionLines) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.text(l, lm + 4, y);
    y += 6;
  }

  y += 8;

  // Recommendations
  doc.setFillColor(108, 92, 231);
  doc.rect(lm, y, 3, 12, "F");
  doc.setTextColor(30, 30, 40);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Recommended Actions", lm + 8, y + 9);
  y += 18;

  const recommendations: Array<{ icon: string; text: string }> = [
    { icon: "1.", text: "Review each finding in the Detailed Findings section and verify whether each flagged behavior is intentional and properly sandboxed." },
    { icon: "2.", text: `For any critical (${criticalCount}) or high-severity (${highCount}) findings, ensure the flagged capabilities are necessary and isolated from sensitive data paths.` },
    { icon: "3.", text: "Implement input validation on tool descriptions to strip ANSI escapes, control characters, and zero-width Unicode markers." },
    { icon: "4.", text: "Audit cross-tool data flow: no tool that reads data should coexist with a tool that sends data to external destinations." },
    { icon: "5.", text: "Restrict tool permissions to the minimum required surface. Revoke any broadly-scoped filesystem, shell, or network capabilities." },
    { icon: "6.", text: "Run periodic scans using Linejump CLI or CI pipeline integration to catch regressions in server manifests." },
  ];

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  for (const rec of recommendations) {
    if (y > 275) { doc.addPage(); y = 20; }
    doc.setTextColor(60, 60, 80);
    doc.text(rec.icon, lm + 4, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const recLines = doc.splitTextToSize(rec.text, cw - 16);
    for (const rl of recLines) {
      if (y > 275) { doc.addPage(); y = 20; }
      doc.text(rl, lm + 12, y);
      y += 5;
    }
    y += 4;
    doc.setFont("helvetica", "bold");
  }

  y += 6;

  // Footer note
  doc.setDrawColor(210, 210, 220);
  doc.line(lm, y, pw - lm, y);
  y += 6;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 160);
  doc.text("Generated by Linejump — MCP Server Security Scanner", lm, y);
  y += 4;
  doc.text(`Report generated: ${formatDate(new Date().toISOString())}`, lm, y);

  return doc.output("blob");
}

export function exportJsonReport(report: ScanReport): void {
  const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
  downloadBlob(blob, `linejump-report-${report.serverName.replace(/[^a-zA-Z0-9]/g, "-")}.json`);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadPdfReport(report: ScanReport, rawManifest?: string): Promise<void> {
  const blob = await generatePdfReport(report, rawManifest);
  downloadBlob(blob, `linejump-report-${report.serverName.replace(/[^a-zA-Z0-9]/g, "-")}.pdf`);
}
