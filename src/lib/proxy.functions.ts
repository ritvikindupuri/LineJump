import { createServerFn } from "@tanstack/react-start";
import * as db from "./db";

export const getProxyLogsFn = createServerFn({ method: "POST" })
  .validator((d: { limit?: number }) => d || {})
  .handler(async ({ data }) => {
    return await db.getProxyLogs(data.limit);
  });

export const getPinnedToolsFn = createServerFn({ method: "POST" })
  .validator((d: { serverName?: string }) => d || {})
  .handler(async ({ data }) => {
    return await db.getPinnedTools(data.serverName);
  });

export const approvePinnedToolFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => {
    if (!d.id) throw new Error("id is required");
    return d;
  })
  .handler(async ({ data }) => {
    await db.approvePinnedTool(data.id);
    return { success: true };
  });

export const blockPinnedToolFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => {
    if (!d.id) throw new Error("id is required");
    return d;
  })
  .handler(async ({ data }) => {
    await db.blockPinnedTool(data.id);
    return { success: true };
  });

export const getQuarantinedResponsesFn = createServerFn({ method: "POST" })
  .handler(async () => {
    return await db.getQuarantinedResponses();
  });

export const releaseQuarantineFn = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => {
    if (!d.id) throw new Error("id is required");
    return d;
  })
  .handler(async ({ data }) => {
    await db.releaseQuarantine(data.id);
    return { success: true };
  });

export const getManifestApprovalsFn = createServerFn({ method: "POST" })
  .validator((d: any) => {
    const payload = d && d.data ? d.data : d;
    return payload || {};
  })
  .handler(async ({ data }) => {
    return await db.getManifestApprovals(data.serverName);
  });

export const approveManifestFn = createServerFn({ method: "POST" })
  .validator((d: any) => {
    const payload = d && d.data ? d.data : d;
    if (!payload || !payload.serverName || !payload.manifestHash || !payload.manifestJson) {
      throw new Error("Invalid parameters");
    }
    return payload;
  })
  .handler(async ({ data }) => {
    await db.approveManifest(data.serverName, data.manifestHash, data.manifestJson, data.approvedBy, data.keyScheme);
    return { success: true };
  });

export const getLatestApprovedManifestFn = createServerFn({ method: "POST" })
  .validator((d: any) => {
    const payload = d && d.data ? d.data : d;
    if (!payload || !payload.serverName) throw new Error("serverName is required");
    return payload;
  })
  .handler(async ({ data }) => {
    return await db.getLatestApprovedManifest(data.serverName);
  });
