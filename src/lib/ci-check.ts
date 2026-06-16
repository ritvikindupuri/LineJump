export interface CiCheckConfig {
  maxCritical?: number;
  maxHigh?: number;
  maxMedium?: number;
  minScore?: number;
}

export interface CiCheckResult {
  passed: boolean;
  score: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
  failures: string[];
}

export function evaluateCiCheck(
  score: number,
  findings: Array<{ severity: string }>,
  config: CiCheckConfig = {},
): CiCheckResult {
  const critical = findings.filter((f) => f.severity === "critical").length;
  const high = findings.filter((f) => f.severity === "high").length;
  const medium = findings.filter((f) => f.severity === "medium").length;
  const low = findings.filter((f) => f.severity === "low").length;

  const failures: string[] = [];

  if (config.maxCritical !== undefined && critical > config.maxCritical) {
    failures.push(`Critical findings (${critical}) exceed threshold (${config.maxCritical})`);
  }
  if (config.maxHigh !== undefined && high > config.maxHigh) {
    failures.push(`High-severity findings (${high}) exceed threshold (${config.maxHigh})`);
  }
  if (config.maxMedium !== undefined && medium > config.maxMedium) {
    failures.push(`Medium-severity findings (${medium}) exceed threshold (${config.maxMedium})`);
  }
  if (config.minScore !== undefined && score < config.minScore) {
    failures.push(`Safety score (${score}) below minimum threshold (${config.minScore})`);
  }

  return {
    passed: failures.length === 0,
    score,
    critical,
    high,
    medium,
    low,
    total: findings.length,
    failures,
  };
}

export const DEFAULT_CI_CONFIG: CiCheckConfig = {
  maxCritical: 0,
  maxHigh: 1,
  maxMedium: 3,
  minScore: 60,
};

export function generateCiCheckMarkdown(result: CiCheckResult): string {
  const status = result.passed ? "✅ PASSED" : "❌ FAILED";
  const lines = [
    `## Linejump CI Check — ${status}`,
    ``,
    `| Metric | Value |`,
    `|--------|-------|`,
    `| Safety Score | ${result.score}/100 |`,
    `| Critical | ${result.critical} |`,
    `| High | ${result.high} |`,
    `| Medium | ${result.medium} |`,
    `| Low | ${result.low} |`,
    `| Total Findings | ${result.total} |`,
  ];
  if (!result.passed) {
    lines.push(``, `### Failures`);
    for (const f of result.failures) {
      lines.push(`- ${f}`);
    }
  }
  return lines.join("\n");
}
