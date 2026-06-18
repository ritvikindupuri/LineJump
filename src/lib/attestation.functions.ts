import { createServerFn } from "@tanstack/react-start";
import { signReport } from "./attestation";
import type { ScanReport } from "./mcp-scanner";
import { saveScan } from "./db.ts";

export const generateSignedReport = createServerFn({ method: "POST" })
  .validator((d: { report: ScanReport; manifest: unknown; url: string | null }) => d)
  .handler(async ({ data }): Promise<{ signatureData: unknown; scanId: string }> => {
    const scanId = Math.random().toString(36).slice(2, 10);
    // save to DB
    saveScan(scanId, "default_org", data.url, data.manifest, data.report);

    // sign
    const signatureData = signReport(data.report);

    return { signatureData, scanId };
  });
