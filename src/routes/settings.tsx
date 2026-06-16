import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Settings, LogOut, Users, Shield, Terminal, Copy, Check, Plus, UserPlus } from "lucide-react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { useAuth } from "../lib/auth-context";
import { logout as logoutFn, createTeamFn, joinTeamFn, getTeamMembersFn } from "../lib/auth.functions";
import { upsertCiConfig, getCiConfig } from "../lib/db";

export const Route = createFileRoute("/settings")({
  component: SettingsPage,
});

function SettingsPage() {
  const { user, token, logout, setAuth } = useAuth();
  const router = useRouter();

  const [maxCritical, setMaxCritical] = useState("0");
  const [maxHigh, setMaxHigh] = useState("1");
  const [maxMedium, setMaxMedium] = useState("3");
  const [minScore, setMinScore] = useState("60");
  const [ciSaved, setCiSaved] = useState(false);

  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [teamMembers, setTeamMembers] = useState<Array<{ id: string; name: string; email: string; role: string }>>([]);
  const [teamError, setTeamError] = useState("");

  useEffect(() => {
    if (!user) { router.navigate({ to: "/login" }); return; }
    getCiConfig(user.id).then((cfg) => {
      if (cfg) {
        setMaxCritical(String(cfg.max_critical));
        setMaxHigh(String(cfg.max_high));
        setMaxMedium(String(cfg.max_medium));
        setMinScore(String(cfg.min_score));
      }
    });
    if (user.team_id) {
      getTeamMembersFn({ token }).then((res) => {
        if (res.members) setTeamMembers(res.members as any);
      }).catch(() => {});
    }
  }, [user, token]);

  if (!user) return null;

  const handleSaveCi = async () => {
    await upsertCiConfig(user.id, {
      max_critical: parseInt(maxCritical) || 0,
      max_high: parseInt(maxHigh) || 1,
      max_medium: parseInt(maxMedium) || 3,
      min_score: parseInt(minScore) || 60,
    });
    setCiSaved(true);
    setTimeout(() => setCiSaved(false), 2000);
  };

  const handleCreateTeam = async () => {
    setTeamError("");
    try {
      const result = await createTeamFn({ token, name: teamName });
      setAuth({ ...user, team_id: result.teamId, role: "admin" }, token);
      setTeamName("");
    } catch (e: any) {
      setTeamError(e.message);
    }
  };

  const handleJoinTeam = async () => {
    setTeamError("");
    try {
      await joinTeamFn({ token, teamId: joinCode });
      setAuth({ ...user, team_id: joinCode, role: "member" }, token);
      setJoinCode("");
    } catch (e: any) {
      setTeamError(e.message);
    }
  };

  const handleLogout = async () => {
    try { await logoutFn({ token }); } catch {}
    logout();
    router.navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen pt-14">
      <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
              <p className="mt-1 text-sm text-muted-foreground">{user.email}</p>
            </div>
            <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={handleLogout}>
              <LogOut className="h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>

          {/* CI Thresholds */}
          <Card className="border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/30 bg-card/50 px-5 py-3">
              <Terminal className="h-4 w-4 text-[#6C5CE7]" />
              <span className="text-sm font-medium">CI Pipeline Thresholds</span>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-muted-foreground">Configure thresholds for CI pipeline checks. A scan that exceeds any threshold will fail the check.</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs">Max Critical</Label>
                  <Input type="number" value={maxCritical} onChange={(e) => setMaxCritical(e.target.value)} className="mt-1 h-9 text-sm" min="0" />
                </div>
                <div>
                  <Label className="text-xs">Max High</Label>
                  <Input type="number" value={maxHigh} onChange={(e) => setMaxHigh(e.target.value)} className="mt-1 h-9 text-sm" min="0" />
                </div>
                <div>
                  <Label className="text-xs">Max Medium</Label>
                  <Input type="number" value={maxMedium} onChange={(e) => setMaxMedium(e.target.value)} className="mt-1 h-9 text-sm" min="0" />
                </div>
                <div>
                  <Label className="text-xs">Min Score</Label>
                  <Input type="number" value={minScore} onChange={(e) => setMinScore(e.target.value)} className="mt-1 h-9 text-sm" min="0" max="100" />
                </div>
              </div>
              <Button size="sm" className="gap-1.5 text-xs" onClick={handleSaveCi}>
                {ciSaved ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Shield className="h-3.5 w-3.5" />}
                {ciSaved ? "Saved" : "Save Thresholds"}
              </Button>
            </div>
          </Card>

          {/* Team */}
          <Card className="border-border/50 overflow-hidden">
            <div className="flex items-center gap-2 border-b border-border/30 bg-card/50 px-5 py-3">
              <Users className="h-4 w-4 text-[#6C5CE7]" />
              <span className="text-sm font-medium">Team</span>
            </div>
            <div className="p-5 space-y-4">
              {user.team_id ? (
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Team members can view shared scan history and CI results.</p>
                  <div className="space-y-2">
                    {teamMembers.map((m) => (
                      <div key={m.id} className="flex items-center justify-between rounded-lg border border-border/50 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{m.email}</p>
                        </div>
                        <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{m.role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label className="text-xs">Create a team</Label>
                    <div className="mt-1 flex gap-2">
                      <Input value={teamName} onChange={(e) => setTeamName(e.target.value)} placeholder="My Company" className="flex-1 text-sm" />
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleCreateTeam}>
                        <Plus className="h-3.5 w-3.5" />
                        Create
                      </Button>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/30" /></div>
                    <span className="relative flex justify-center text-xs text-muted-foreground"><span className="bg-card px-2">or join existing</span></span>
                  </div>
                  <div>
                    <Label className="text-xs">Team ID</Label>
                    <div className="mt-1 flex gap-2">
                      <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Paste team ID" className="flex-1 text-sm" />
                      <Button size="sm" variant="outline" className="gap-1.5 text-xs" onClick={handleJoinTeam}>
                        <UserPlus className="h-3.5 w-3.5" />
                        Join
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {teamError && <p className="text-xs text-destructive">{teamError}</p>}
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
