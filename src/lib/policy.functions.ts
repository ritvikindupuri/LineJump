import { createServerFn } from "@tanstack/react-start";
import { getPolicy, updatePolicy } from "./db.ts";
import type { ScannerPolicy } from "./mcp-scanner";

export const fetchPolicy = createServerFn({ method: "GET" }).handler(
  async (): Promise<ScannerPolicy> => {
    // For now, always use "default_org"
    const policy = getPolicy("default_org");
    return (
      (policy as ScannerPolicy) || {
        disabledRules: [],
        customRegexes: [],
        severityOverrides: {},
        blockedCapabilities: [],
        requireApproval: false,
      }
    );
  },
);

export const savePolicyFn = createServerFn({ method: "POST" })
  .validator((d: ScannerPolicy) => d)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    updatePolicy("default_org", data);
    return { success: true };
  });
