const HOMOGLYPH_MAP: Record<string, string> = {
  "а": "a", "е": "e", "о": "o", "р": "p", "с": "c", "у": "y", "х": "x",
  "і": "i", "ј": "j", "ӏ": "l", "ӧ": "o", "ԁ": "d", "ɡ": "g", "һ": "h",
  "ӏ": "i", "ӓ": "a", "ӗ": "e", "ӟ": "z", "ӡ": "z", "ӥ": "i",
  "Α": "A", "Β": "B", "Ε": "E", "Ζ": "Z", "Η": "H", "Ι": "I", "Κ": "K",
  "Μ": "M", "Ν": "N", "Ο": "O", "Ρ": "P", "Τ": "T", "Υ": "Y", "Χ": "X",
};

const HOMOGLYPH_RANGES = [
  { name: "Cyrillic", range: [0x0400, 0x04FF] },
  { name: "Greek", range: [0x0370, 0x03FF] },
];

function isConfusableChar(char: string): boolean {
  const cp = char.codePointAt(0);
  if (!cp) return false;
  return HOMOGLYPH_RANGES.some((r) => cp >= r.range[0] && cp <= r.range[1]);
}

export function detectHomoglyphs(text: string): Array<{ char: string; codepoint: string; position: number; resembles: string }> {
  const results: Array<{ char: string; codepoint: string; position: number; resembles: string }> = [];
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (isConfusableChar(ch)) {
      const cp = `U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, "0")}`;
      const resembles = HOMOGLYPH_MAP[ch] || ch;
      results.push({ char: ch, codepoint: cp, position: i, resembles });
    }
  }
  return results;
}

export function detectAnomalousKeys(obj: Record<string, unknown>, depth = 0): string[] {
  if (depth > 3) return [];
  const issues: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    for (const ch of key) {
      if (isConfusableChar(ch)) {
        issues.push(`Key "${key}" contains homoglyph character U+${ch.codePointAt(0)!.toString(16).toUpperCase()}`);
      }
    }
    if (val && typeof val === "object") {
      issues.push(...detectAnomalousKeys(val as Record<string, unknown>, depth + 1));
    }
  }
  return issues;
}

export function compareToBaseline(
  manifest: Record<string, unknown>,
  baseline: Record<string, unknown>,
): Array<{ type: "added" | "removed" | "changed"; path: string; before?: string; after?: string }> {
  const changes: Array<{ type: "added" | "removed" | "changed"; path: string; before?: string; after?: string }> = [];

  function walk(current: Record<string, unknown>, prev: Record<string, unknown>, prefix: string) {
    const allKeys = new Set([...Object.keys(current), ...Object.keys(prev)]);
    for (const key of allKeys) {
      const path = prefix ? `${prefix}.${key}` : key;
      const curVal = current[key];
      const preVal = prev[key];

      if (!(key in prev)) {
        changes.push({ type: "added", path, after: typeof curVal === "object" ? JSON.stringify(curVal).slice(0, 200) : String(curVal) });
      } else if (!(key in current)) {
        changes.push({ type: "removed", path, before: typeof preVal === "object" ? JSON.stringify(preVal).slice(0, 200) : String(preVal) });
      } else if (typeof curVal !== typeof preVal || (typeof curVal !== "object" && curVal !== preVal)) {
        changes.push({
          type: "changed",
          path,
          before: typeof preVal === "object" ? JSON.stringify(preVal).slice(0, 200) : String(preVal),
          after: typeof curVal === "object" ? JSON.stringify(curVal).slice(0, 200) : String(curVal),
        });
      } else if (typeof curVal === "object" && curVal !== null && preVal !== null) {
        walk(curVal as Record<string, unknown>, preVal as Record<string, unknown>, path);
      }
    }
  }

  walk(manifest, baseline, "");
  return changes;
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function detectSimilarNames(names: string[], threshold = 2): Array<[string, string, number]> {
  const pairs: Array<[string, string, number]> = [];
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const dist = levenshtein(names[i], names[j]);
      if (dist <= threshold && names[i] !== names[j]) {
        pairs.push([names[i], names[j], dist]);
      }
    }
  }
  return pairs;
}
