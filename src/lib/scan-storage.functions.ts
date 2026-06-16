import { createServerFn } from "@tanstack/react-start";
import { saveScan, getScans, getScanById, upsertCiConfig, getCiConfig, logAudit, getTeamScanSummary } from "./db";
import { getSession } from "./db";
import { checkRateLimit, getRateLimitKey } from "./rate-limit";

export const persistScan = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { token, serverName, manifest, score, findings, deepScore, deepFindings, deepAnalysis } = d as any;
    if (!token) throw new Error("Not authenticated");
    return { token, serverName, manifest, score, findings, deepScore, deepFindings, deepAnalysis };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Invalid session");
    checkRateLimit(getRateLimitKey(user.id, "scan-save"), 50, 60000);
    const id = await saveScan(user.id, data.serverName, data.manifest, data.score, data.findings, data.deepScore, data.deepFindings, data.deepAnalysis);
    await logAudit(user.id, "scan.saved", `Saved scan for "${data.serverName}" (score: ${data.score})`);
    return { id };
  });

export const loadScans = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) throw new Error("Not authenticated");
    return { token };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Invalid session");
    const scans = await getScans(user.id);
    return { scans };
  });

export const loadSingleScan = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token, scanId } = d as { token?: string; scanId: string };
    if (!token || !scanId) throw new Error("Not authenticated");
    return { token, scanId };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Invalid session");
    const scan = await getScanById(data.scanId);
    if (!scan) throw new Error("Scan not found");
    if (scan.user_id !== user.id && !user.team_id) throw new Error("Access denied");
    return { scan };
  });

export const saveCiConfig = createServerFn({ method: "POST" })
  .validator((d: unknown) => {
    const { token, config } = d as { token: string; config: { max_critical: number; max_high: number; max_medium: number; min_score: number } };
    if (!token) throw new Error("Not authenticated");
    return { token, config };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user) throw new Error("Invalid session");
    await upsertCiConfig(user.id, data.config);
    await logAudit(user.id, "ci_config.updated", JSON.stringify(data.config));
    return { success: true };
  });

export const loadCiConfig = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) return { token: "" };
    return { token };
  })
  .handler(async ({ data }) => {
    if (!data.token) return { config: null };
    const user = await getSession(data.token);
    if (!user) return { config: null };
    const config = await getCiConfig(user.id);
    return { config };
  });

export const loadTeamScans = createServerFn({ method: "GET" })
  .validator((d: unknown) => {
    const { token } = d as { token?: string };
    if (!token) throw new Error("Not authenticated");
    return { token };
  })
  .handler(async ({ data }) => {
    const user = await getSession(data.token);
    if (!user || !user.team_id) throw new Error("No team");
    const scans = await getTeamScanSummary(user.team_id);
    return { scans };
  });
