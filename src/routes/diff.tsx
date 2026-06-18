import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { LinejumpLogo } from "@/components/linejump-logo";
import { ArrowLeft } from "lucide-react";
import { fetchScan } from "@/lib/db.functions";

export const Route = createFileRoute("/diff")({
  component: DiffPage,
});

function DiffPage() {
  const [scan1, setScan1] = useState<Record<string, unknown> | null>(null);
  const [scan2, setScan2] = useState<Record<string, unknown> | null>(null);

  const loadScan = useServerFn(fetchScan);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const searchParams = new URLSearchParams(window.location.search);
    const id1 = searchParams.get("id1");
    const id2 = searchParams.get("id2");

    if (!id1 || !id2) return;
    loadScan({ data: { id: id1 } })
      .then((s) => setScan1(s as Record<string, unknown>))
      .catch(console.error);
    loadScan({ data: { id: id2 } })
      .then((s) => setScan2(s as Record<string, unknown>))
      .catch(console.error);
  }, [loadScan]);

  if (typeof window === "undefined") return null;

  const searchParams = new URLSearchParams(window.location.search);
  const id1 = searchParams.get("id1");
  const id2 = searchParams.get("id2");

  if (!id1 || !id2) return <div className="p-8">Please provide id1 and id2 query parameters.</div>;
  if (!scan1 || !scan2) return <div className="p-8">Loading scans...</div>;

  const r1 = JSON.parse(scan1.report_json as string);
  const r2 = JSON.parse(scan2.report_json as string);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/50 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <LinejumpLogo size={22} className="text-foreground" />
            <span className="text-[15px] font-medium tracking-tight">Linejump</span>
          </Link>
          <Link
            to="/history"
            className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to History
          </Link>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="text-3xl font-semibold mb-6">Semantic Scan Diff</h1>

        <div className="grid grid-cols-2 gap-8">
          <div className="p-6 border rounded-xl bg-card">
            <h2 className="text-xl font-medium mb-2">
              Previous ({new Date(scan1.created_at as string).toLocaleString()})
            </h2>
            <div className="mb-4 text-sm text-muted-foreground">
              Score: {r1.score} | ID: {scan1.id as string}
            </div>
            <div className="space-y-4">
              {r1.findings.map((f: unknown) => (
                <div key={f.id} className="p-3 border rounded bg-background/50 text-sm">
                  <span className="uppercase font-bold mr-2 text-[10px] bg-secondary px-1 rounded">
                    {f.severity}
                  </span>
                  {f.title}
                </div>
              ))}
              {r1.findings.length === 0 && (
                <p className="text-sm text-muted-foreground">No findings.</p>
              )}
            </div>
          </div>
          <div className="p-6 border rounded-xl bg-card">
            <h2 className="text-xl font-medium mb-2">
              Current ({new Date(scan2.created_at as string).toLocaleString()})
            </h2>
            <div className="mb-4 text-sm text-muted-foreground">
              Score: {r2.score} | ID: {scan2.id as string}
            </div>
            <div className="space-y-4">
              {r2.findings.map((f: unknown) => (
                <div key={f.id} className="p-3 border rounded bg-background/50 text-sm">
                  <span className="uppercase font-bold mr-2 text-[10px] bg-secondary px-1 rounded">
                    {f.severity}
                  </span>
                  {f.title}
                </div>
              ))}
              {r2.findings.length === 0 && (
                <p className="text-sm text-muted-foreground">No findings.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
