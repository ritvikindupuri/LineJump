import { useState, useCallback } from "react";
import type { ScanReport } from "@/lib/mcp-scanner";

interface SavedScan {
  report: ScanReport;
  rawManifest: string;
  savedAt: string;
  id: string;
}

export function useScanStore() {
  const [currentReport, setCurrentReport] = useState<ScanReport | null>(null);
  const [currentRaw, setCurrentRaw] = useState<string>("");
  const [history, setHistory] = useState<SavedScan[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("lj-scan-history") || "[]");
    } catch {
      return [];
    }
  });

  const saveScan = useCallback((report: ScanReport, raw: string) => {
    const entry: SavedScan = {
      report,
      rawManifest: raw,
      savedAt: new Date().toISOString(),
      id: crypto.randomUUID(),
    };
    const updated = [entry, ...history].slice(0, 20);
    setHistory(updated);
    localStorage.setItem("lj-scan-history", JSON.stringify(updated));
  }, [history]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem("lj-scan-history");
  }, []);

  return {
    currentReport,
    setCurrentReport,
    currentRaw,
    setCurrentRaw,
    history,
    saveScan,
    clearHistory,
  };
}
