import type { ScanReport } from "./mcp-scanner";

function encodeReportForUrl(report: ScanReport): string {
  const payload = btoa(JSON.stringify(report));
  return `${window.location.origin}/scan?data=${payload}`;
}

export function getShareableLink(report: ScanReport): string {
  return encodeReportForUrl(report);
}

export function shareByEmail(report: ScanReport): void {
  const subject = encodeURIComponent(`Linejump Security Report: ${report.serverName}`);
  const body = encodeURIComponent(
    `MCP Server Security Report for "${report.serverName}"\n` +
    `Safety Score: ${report.score}/100\n` +
    `Findings: ${report.findings.length} total (${report.findings.filter(f => f.severity === "critical").length} critical, ${report.findings.filter(f => f.severity === "high").length} high)\n` +
    `\nView full report: ${getShareableLink(report)}`,
  );
  window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
}

export function copyShareableLink(report: ScanReport): Promise<void> {
  const link = getShareableLink(report);
  return navigator.clipboard.writeText(link);
}
