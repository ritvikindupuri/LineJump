import type { Finding, ScanReport } from "./mcp-scanner";
import { ENGINE_VERSION } from "./detection/engine";

type SarifLevel = "error" | "warning" | "note" | "none";

function severityToLevel(severity: Finding["severity"]): SarifLevel {
  switch (severity) {
    case "critical":
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
    case "info":
      return "note";
    default:
      return "note";
  }
}

function uniqueRules(findings: Finding[]) {
  const rules = new Map<string, Finding>();
  for (const f of findings) {
    const id = f.ruleId ?? f.title.replace(/\s+/g, "_").toLowerCase();
    if (!rules.has(id)) rules.set(id, f);
  }
  return [...rules.entries()].map(([id, f]) => ({
    id,
    name: f.title,
    shortDescription: { text: f.title },
    fullDescription: { text: f.detail },
    defaultConfiguration: { level: severityToLevel(f.severity) },
    properties: {
      category: f.category,
      precision: f.confidence ?? "medium",
    },
  }));
}

export function generateSarif(report: ScanReport, sourceUri = "linejump://scan"): string {
  const rules = uniqueRules(report.findings);

  const results = report.findings.map((f) => {
    const ruleId = f.ruleId ?? f.title.replace(/\s+/g, "_").toLowerCase();
    return {
      ruleId,
      level: severityToLevel(f.severity),
      message: {
        text: `${f.title} — ${f.detail}`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: sourceUri,
              description: { text: report.serverName },
            },
            region: {
              message: { text: f.location ?? f.category },
            },
          },
          logicalLocations: f.toolName
            ? [
                {
                  name: f.toolName,
                  kind: "module",
                },
              ]
            : undefined,
        },
      ],
      properties: {
        category: f.category,
        confidence: f.confidence,
        evidence: f.evidence,
        safetyScore: report.score,
      },
    };
  });

  const sarif = {
    version: "2.1.0",
    $schema:
      "https://raw.githubusercontent.com/oasis-tcs/sarif-spec/master/Schemata/sarif-schema-2.1.0.json",
    runs: [
      {
        tool: {
          driver: {
            name: "Linejump",
            informationUri: "https://github.com/ritvikindupuri/LineJump",
            version: report.engineVersion ?? ENGINE_VERSION,
            semanticVersion: report.engineVersion ?? ENGINE_VERSION,
            rules,
          },
        },
        invocations: [
          {
            executionSuccessful: true,
            endTimeUtc: report.scannedAt,
          },
        ],
        properties: {
          safetyScore: report.score,
          toolCount: report.toolCount,
          findingCount: report.findings.length,
          coverage: report.coverage,
        },
        results,
      },
    ],
  };

  return JSON.stringify(sarif, null, 2);
}
