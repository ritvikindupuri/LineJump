const ZERO_WIDTH_RE = /[\u200B-\u200F\u202A-\u202E\u2060-\u206F\uFEFF]/g;

const HOMOGLYPH_MAP: Record<string, string> = {
  "\u0430": "a",
  "\u0435": "e",
  "\u043e": "o",
  "\u0440": "p",
  "\u0441": "c",
  "\u0443": "y",
  "\u0445": "x",
  "\u0456": "i",
  "\u04cf": "l",
  "\u0501": "d",
  "\u0410": "a",
  "\u0415": "e",
  "\u041e": "o",
};

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "@": "a",
  "$": "s",
};

export function foldHomoglyphs(text: string): string {
  return [...text].map((c) => HOMOGLYPH_MAP[c] ?? c).join("");
}

export function deLeet(text: string): string {
  return [...text.toLowerCase()].map((c) => LEET_MAP[c] ?? c).join("");
}

/** Collapse single-letter spacing: "i g n o r e" → "ignore" */
export function collapseSpacedLetters(text: string): string {
  return text.replace(/(?<=\b[a-z])\s+(?=[a-z]\b)/gi, "");
}

/** Remove punctuation used to break keywords: ign0re-previous → ignore previous */
export function stripBypassPunctuation(text: string): string {
  return text
    .replace(/[·•|/\\]+/g, " ")
    .replace(/[_\-.`'"`]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function normalizeForBypass(text: string): string {
  let t = text.normalize("NFKC");
  t = foldHomoglyphs(t);
  t = t.replace(ZERO_WIDTH_RE, "");
  t = deLeet(t);
  t = stripBypassPunctuation(t);
  t = collapseSpacedLetters(t);
  return t.toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizeInjectionText(text: string): string {
  return normalizeForBypass(text);
}

/** Join fragments the way an attacker might split instructions across fields. */
export function joinSplitFragments(parts: string[]): string {
  return normalizeForBypass(parts.filter(Boolean).join(" "));
}
