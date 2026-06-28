import { useMemo } from "react";
import { motion } from "motion/react";
import type { Finding, RiskSeverity } from "@/lib/mcp-scanner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const SEVERITY_RANK: Record<RiskSeverity, number> = {
  critical: 5,
  high: 4,
  medium: 3,
  low: 2,
  info: 1,
};

const SEVERITY_DOT: Record<RiskSeverity, string> = {
  critical: "bg-destructive",
  high: "bg-[oklch(0.72_0.14_45)]",
  medium: "bg-[oklch(0.78_0.12_75)]",
  low: "bg-muted-foreground/50",
  info: "bg-[oklch(0.6_0.12_150)]",
};

const SEVERITY_CELL: Record<RiskSeverity, string> = {
  critical: "border-destructive/40 bg-destructive/8",
  high: "border-[oklch(0.72_0.14_45_/_0.35)] bg-[oklch(0.72_0.14_45_/_0.08)]",
  medium: "border-[oklch(0.78_0.12_75_/_0.4)] bg-[oklch(0.78_0.12_75_/_0.1)]",
  low: "border-border bg-muted/30",
  info: "border-border bg-secondary/40",
};

function highestSeverity(findings: Finding[]): RiskSeverity {
  return findings.reduce<RiskSeverity>(
    (best, f) => (SEVERITY_RANK[f.severity] > SEVERITY_RANK[best] ? f.severity : best),
    "info",
  );
}

export function AtlasMap({ findings }: { findings: Finding[] }) {
  const categories = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of findings) {
      const list = map.get(f.category) ?? [];
      list.push(f);
      map.set(f.category, list);
    }
    return [...map.entries()]
      .map(([category, items]) => ({
        category,
        items,
        peak: highestSeverity(items),
        counts: items.reduce(
          (acc, f) => {
            acc[f.severity]++;
            return acc;
          },
          { critical: 0, high: 0, medium: 0, low: 0, info: 0 } as Record<RiskSeverity, number>,
        ),
      }))
      .sort((a, b) => SEVERITY_RANK[b.peak] - SEVERITY_RANK[a.peak] || b.items.length - a.items.length);
  }, [findings]);

  if (findings.length === 0) return null;

  return (
    <div className="mt-5 rounded-xl border border-border bg-background/40 p-4">
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            ATLAS
          </div>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            Attack landscape map — findings by category
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-card px-2 py-0.5 text-[10px] text-muted-foreground">
          {categories.length} zones
        </span>
      </div>

      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {categories.map((zone, i) => (
            <Tooltip key={zone.category}>
              <TooltipTrigger asChild>
                <motion.div
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className={`cursor-default rounded-lg border p-3 transition-colors hover:bg-background/80 ${SEVERITY_CELL[zone.peak]}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="line-clamp-2 text-left text-[11.5px] font-medium leading-snug text-foreground">
                      {zone.category}
                    </span>
                    <span
                      className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${SEVERITY_DOT[zone.peak]}`}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[18px] font-semibold tabular-nums tracking-tight">
                      {zone.items.length}
                    </span>
                    <span className="text-[10px] capitalize text-muted-foreground">{zone.peak}</span>
                  </div>
                  <div className="mt-2 flex h-1 overflow-hidden rounded-full bg-border/60">
                    {(["critical", "high", "medium", "low", "info"] as RiskSeverity[]).map((s) =>
                      zone.counts[s] > 0 ? (
                        <div
                          key={s}
                          className={`${SEVERITY_DOT[s]} h-full`}
                          style={{ flex: zone.counts[s] }}
                        />
                      ) : null,
                    )}
                  </div>
                </motion.div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[220px] border border-border bg-popover px-3 py-2 text-popover-foreground"
              >
                <p className="font-medium">{zone.category}</p>
                <ul className="mt-1.5 space-y-0.5 text-[11px] text-muted-foreground">
                  {zone.items.slice(0, 5).map((f) => (
                    <li key={f.id} className="truncate">
                      · {f.title}
                    </li>
                  ))}
                  {zone.items.length > 5 ? (
                    <li className="text-muted-foreground/80">+{zone.items.length - 5} more</li>
                  ) : null}
                </ul>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  );
}
