import type { ScannerPolicy } from "./mcp-scanner";

/** Sensible defaults — reduces noise on common legitimate MCP servers. */
export const DEFAULT_SCANNER_POLICY: ScannerPolicy = {
  disabledRules: [],
  customRegexes: [],
  severityOverrides: {
    "capability.filesystem_read": "low",
    "schema.param.path": "low",
    "schema.param.url": "low",
    "network.external_url": "info",
  },
  blockedCapabilities: [],
  requireApproval: false,
};
