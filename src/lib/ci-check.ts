import type { Finding } from "./mcp-scanner";

export interface CiCheckConfig {
  maxCritical?: number;
  maxHigh?: number;
  maxMedium?: number;
  minScore?: number;
}

export const DEFAULT_CI_CONFIG: CiCheckConfig = {
  maxCritical: 0,
  maxHigh: 0,
  maxMedium: 100,
  minScore: 50,
};

export interface CiCheckResult {
  passed: boolean;
  score: number;
  findings: {
    critical: number;
    high: number;
    medium: number;
  };
  config: CiCheckConfig;
  errors: string[];
}

export function evaluateCiCheck(
  score: number,
  findings: Finding[],
  config: CiCheckConfig = {},
): CiCheckResult {
  const mergedConfig = { ...DEFAULT_CI_CONFIG, ...config };

  const counts = {
    critical: findings.filter((f) => f.severity === "critical").length,
    high: findings.filter((f) => f.severity === "high").length,
    medium: findings.filter((f) => f.severity === "medium").length,
  };

  const errors: string[] = [];

  if (mergedConfig.minScore !== undefined && score < mergedConfig.minScore) {
    errors.push(`Score ${score} is below the minimum required score of ${mergedConfig.minScore}`);
  }
  if (mergedConfig.maxCritical !== undefined && counts.critical > mergedConfig.maxCritical) {
    errors.push(
      `Found ${counts.critical} critical findings (max allowed: ${mergedConfig.maxCritical})`,
    );
  }
  if (mergedConfig.maxHigh !== undefined && counts.high > mergedConfig.maxHigh) {
    errors.push(`Found ${counts.high} high findings (max allowed: ${mergedConfig.maxHigh})`);
  }
  if (mergedConfig.maxMedium !== undefined && counts.medium > mergedConfig.maxMedium) {
    errors.push(`Found ${counts.medium} medium findings (max allowed: ${mergedConfig.maxMedium})`);
  }

  return {
    passed: errors.length === 0,
    score,
    findings: counts,
    config: mergedConfig,
    errors,
  };
}

export function generateCiCheckMarkdown(result: CiCheckResult): string {
  let md = `## Linejump Security Scan\n\n`;
  if (result.passed) {
    md += `✅ **PASSED**\n\n`;
  } else {
    md += `❌ **FAILED**\n\n### Errors:\n`;
    for (const err of result.errors) {
      md += `- ${err}\n`;
    }
    md += `\n`;
  }

  md += `### Summary\n`;
  md += `- **Score:** ${result.score}/100\n`;
  md += `- **Critical:** ${result.findings.critical}\n`;
  md += `- **High:** ${result.findings.high}\n`;
  md += `- **Medium:** ${result.findings.medium}\n`;

  return md;
}
