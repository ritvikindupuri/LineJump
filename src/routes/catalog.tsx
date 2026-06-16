import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Library, Search, ArrowUp, Shield, BadgeCheck, ExternalLink, Filter, SortAsc } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { getAllEntries, upvoteCatalogEntry, type CatalogEntry } from "../lib/catalog";
import type { RiskSeverity } from "../lib/mcp-scanner";

export const Route = createFileRoute("/catalog")({
  component: CatalogPage,
});

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-blue-500",
  info: "bg-gray-400",
};

function EntryCard({ entry, onUpvote }: { entry: CatalogEntry; onUpvote: (id: string) => void }) {
  const scoreColor = entry.scanReport.score >= 75 ? "text-green-500" : entry.scanReport.score >= 50 ? "text-yellow-500" : "text-red-500";
  const critical = entry.scanReport.findings.filter(f => f.severity === "critical").length;
  const high = entry.scanReport.findings.filter(f => f.severity === "high").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="rounded-lg border border-border/50 bg-card/30 p-5 transition-colors hover:border-border/80"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold truncate">{entry.serverName}</h3>
            {entry.verified && (
              <BadgeCheck className="h-4 w-4 shrink-0 text-[#6C5CE7]" />
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{entry.serverUrl}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className={`text-lg font-bold ${scoreColor}`}>{entry.scanReport.score}</span>
            <span className="text-[10px] text-muted-foreground">/ 100</span>
            {critical > 0 && <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/20 bg-red-500/5">{critical} critical</Badge>}
            {high > 0 && <Badge variant="outline" className="text-[10px] text-orange-500 border-orange-500/20 bg-orange-500/5">{high} high</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {entry.tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="text-[9px] uppercase tracking-wider">{tag}</Badge>
            ))}
          </div>
          {entry.submittedBy && (
            <p className="mt-2 text-[10px] text-muted-foreground">Submitted by {entry.submittedBy}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1">
          <button
            onClick={() => onUpvote(entry.id)}
            className="flex h-10 w-10 flex-col items-center justify-center rounded-lg border border-border/50 transition-colors hover:border-[#6C5CE7]/50 hover:bg-[#6C5CE7]/5"
          >
            <ArrowUp className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium">{entry.upvotes}</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function CatalogPage() {
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"score" | "upvotes" | "date">("upvotes");
  const [showSubmit, setShowSubmit] = useState(false);

  useEffect(() => {
    getAllEntries().then(setEntries);
  }, []);

  const handleUpvote = async (id: string) => {
    await upvoteCatalogEntry(id);
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, upvotes: e.upvotes + 1 } : e)),
    );
  };

  const filtered = entries
    .filter((e) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return e.serverName.toLowerCase().includes(q) || e.serverUrl.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      if (sort === "score") return b.scanReport.score - a.scanReport.score;
      if (sort === "upvotes") return b.upvotes - a.upvotes;
      return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
    });

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Server Catalog</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Community-powered registry of MCP server security scan results.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 text-xs"
              onClick={() => setShowSubmit(!showSubmit)}
            >
              <Library className="h-3.5 w-3.5" />
              Submit Scan
            </Button>
          </div>

          {showSubmit && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 overflow-hidden"
            >
              <Card className="border-border/50 p-5">
                <p className="text-sm text-muted-foreground">
                  Run a scan on the <Link to="/app" className="text-[#6C5CE7] hover:underline">Scanner page</Link>,
                  then submit from the report view. Your scan will appear here for the community.
                </p>
              </Card>
            </motion.div>
          )}

          {/* Search + Sort */}
          <div className="mt-8 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search servers..."
                className="pl-9 text-sm"
              />
            </div>
            <Select value={sort} onValueChange={(v: typeof sort) => setSort(v)}>
              <SelectTrigger className="w-36 h-9 text-xs">
                <SortAsc className="h-3.5 w-3.5 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="upvotes" className="text-xs">Most Upvotes</SelectItem>
                <SelectItem value="score" className="text-xs">Highest Score</SelectItem>
                <SelectItem value="date" className="text-xs">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Entries */}
          <div className="mt-6 space-y-3">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-12">
                No servers found. {search ? "Try a different search." : "Submit the first scan!"}
              </p>
            ) : (
              filtered.map((entry) => (
                <EntryCard key={entry.id} entry={entry} onUpvote={handleUpvote} />
              ))
            )}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Need to scan a server? <Link to="/app" className="text-[#6C5CE7] hover:underline">Launch the scanner</Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
