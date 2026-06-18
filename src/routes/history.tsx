import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { LinejumpLogo } from "@/components/linejump-logo";
import { ArrowLeft } from "lucide-react";
import { fetchHistory } from "@/lib/db.functions";

export const Route = createFileRoute("/history")({
  component: HistoryPage,
});

function HistoryPage() {
  const [history, setHistory] = useState<Record<string, unknown>[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const loadHistory = useServerFn(fetchHistory);

  useEffect(() => {
    loadHistory()
      .then((data) => setHistory(data as Record<string, unknown>[]))
      .catch(console.error);
  }, [loadHistory]);

  const handleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <LinejumpLogo size={22} className="text-foreground" />
            <span className="text-[15px] font-medium tracking-tight">Linejump</span>
          </Link>
          <Link
            to="/app"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Scanner
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-semibold">Scan History</h1>
          {selectedIds.length === 2 && (
            <Link
              to={`/diff?id1=${selectedIds[0]}&id2=${selectedIds[1]}`}
              className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium"
            >
              Compare Selected
            </Link>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Select two scans to view a semantic diff.
        </p>
        <div className="grid gap-4">
          {history.length === 0 ? (
            <p className="text-muted-foreground">No scans found.</p>
          ) : (
            history.map((h) => {
              const id = h.id as string;
              const isSelected = selectedIds.includes(id);
              const report = JSON.parse(h.report_json as string);
              return (
                <div
                  key={id}
                  onClick={() => handleSelect(id)}
                  className={`p-4 border rounded-xl flex items-center justify-between cursor-pointer transition-colors ${isSelected ? "border-primary bg-primary/5" : "bg-card hover:bg-secondary/50"}`}
                >
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4" />
                    <div>
                      <div className="font-mono text-sm">{id}</div>
                      <div className="text-sm text-muted-foreground">
                        {(h.server_url as string) || report.serverName}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">Score: {report.score}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(h.created_at as string).toLocaleString()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
