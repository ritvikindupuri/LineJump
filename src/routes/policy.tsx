import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState, useEffect } from "react";
import { LinejumpLogo } from "@/components/linejump-logo";
import { ArrowLeft } from "lucide-react";
import { fetchPolicy, savePolicyFn } from "@/lib/policy.functions";
import type { ScannerPolicy } from "@/lib/mcp-scanner";

export const Route = createFileRoute("/policy")({
  component: PolicyPage,
});

function PolicyPage() {
  const [policy, setPolicy] = useState<ScannerPolicy>({
    disabledRules: [],
    customRegexes: [],
    severityOverrides: {},
    blockedCapabilities: [],
    requireApproval: false,
  });
  const [loading, setLoading] = useState(true);

  const loadPolicy = useServerFn(fetchPolicy);
  const savePolicy = useServerFn(savePolicyFn);

  useEffect(() => {
    loadPolicy()
      .then((p) => {
        setPolicy(p);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [loadPolicy]);

  const handleSave = async () => {
    await savePolicy({ data: policy });
    alert("Policy saved!");
  };

  if (loading) return <div className="p-8">Loading...</div>;

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
      <div className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-semibold mb-6">Org Policy Configuration</h1>

        <div className="space-y-6">
          <div className="p-6 border rounded-xl bg-card">
            <h2 className="text-lg font-medium mb-4">Blocked Capabilities</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Comma-separated keywords (e.g. "filesystem write, exec"). Auto-escalates to critical.
            </p>
            <input
              type="text"
              className="w-full bg-background border rounded px-3 py-2 text-sm"
              value={policy.blockedCapabilities?.join(", ") || ""}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  blockedCapabilities: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <div className="p-6 border rounded-xl bg-card">
            <h2 className="text-lg font-medium mb-4">Disabled Rules</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Comma-separated rule titles to ignore entirely.
            </p>
            <input
              type="text"
              className="w-full bg-background border rounded px-3 py-2 text-sm"
              value={policy.disabledRules?.join(", ") || ""}
              onChange={(e) =>
                setPolicy({
                  ...policy,
                  disabledRules: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>

          <button
            onClick={handleSave}
            className="bg-primary text-primary-foreground px-6 py-2 rounded-full text-sm font-medium"
          >
            Save Policy
          </button>
        </div>
      </div>
    </div>
  );
}
