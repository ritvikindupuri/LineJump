import { createServerFn } from "@tanstack/react-start";
import * as db from "./db";

export interface CatalogEntry {
  id: string;
  serverName: string;
  serverUrl: string;
  submittedBy: string | null;
  submittedAt: string;
  scanReport: any;
  upvotes: number;
  tags: string[];
  verified: boolean;
}

function rowToEntry(row: any): CatalogEntry {
  return {
    id: row.id,
    serverName: row.server_name,
    serverUrl: row.server_url,
    submittedBy: row.submitted_by,
    submittedAt: row.created_at,
    scanReport: JSON.parse(row.scan_report),
    upvotes: row.upvotes,
    tags: JSON.parse(row.tags || "[]"),
    verified: row.verified === 1 || row.verified === true,
  };
}

export const getCatalogEntries = createServerFn({ method: "GET" })
  .handler(async (): Promise<CatalogEntry[]> => {
    const rows = await db.getCatalogEntries();
    return (rows as any[]).map(rowToEntry);
  });

export const addCatalogEntry = createServerFn({ method: "POST" })
  .validator((d: { serverName: string; serverUrl: string; scanReport: string; submittedBy?: string; tags?: string[] }) => {
    if (!d.serverName) throw new Error("serverName required");
    if (!d.serverUrl) throw new Error("serverUrl required");
    if (!d.scanReport) throw new Error("scanReport required");
    return d;
  })
  .handler(async ({ data }) => {
    const id = await db.addCatalogEntry({
      server_name: data.serverName,
      server_url: data.serverUrl,
      scan_report: data.scanReport,
      submitted_by: data.submittedBy,
      tags: JSON.stringify(data.tags || []),
    });
    return id;
  });

export const upvoteCatalogEntry = createServerFn({ method: "POST" })
  .validator((d: { id: string }) => {
    if (!d.id) throw new Error("id required");
    return d;
  })
  .handler(async ({ data }) => {
    await db.upvoteCatalogEntry(data.id);
  });
