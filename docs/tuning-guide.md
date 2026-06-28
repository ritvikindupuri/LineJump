# Linejump Policy Tuning Guide

Linejump ships with **default policy overrides** that reduce noise on common legitimate MCP servers (e.g. `read_file`, `path` parameters). Organizations can layer custom policy on top.

## Where policy lives

| Surface | Location |
|---------|----------|
| Web UI | **Policy** page (`/policy`) |
| Database | `linejump.sqlite` → `policies` table |
| CLI | `--policy ./policy.json` |
| Defaults | `src/lib/default-policy.ts` |

## Default severity overrides (built-in)

These apply automatically unless your org policy replaces them:

```json
{
  "severityOverrides": {
    "capability.filesystem_read": "low",
    "schema.param.path": "low",
    "schema.param.url": "low",
    "network.external_url": "info"
  }
}
```

## Policy fields

### `disabledRules`

Comma-separated **rule IDs** or titles to ignore entirely.

**Example — filesystem MCP server:**

```json
{
  "disabledRules": [
    "capability.filesystem_read",
    "schema.param.path"
  ]
}
```

**Web UI:** Policy page → **Disabled Rules** field → Save Policy.

### `severityOverrides`

Map rule IDs to a new severity: `critical`, `high`, `medium`, `low`, `info`.

**Example — treat all path params as informational:**

```json
{
  "severityOverrides": {
    "schema.param.path": "info",
    "chain.read_to_network": "high"
  }
}
```

### `blockedCapabilities`

Comma-separated keywords. Any finding whose title, detail, or evidence contains a keyword is **escalated to critical**.

**Example:**

```json
{
  "blockedCapabilities": ["shell", "exfiltrate", "sudo"]
}
```

### `customRegexes`

Add organization-specific patterns:

```json
{
  "customRegexes": [
    {
      "regex": "internal-only-bypass",
      "severity": "critical",
      "title": "Internal bypass token",
      "category": "Org policy"
    }
  ]
}
```

## Common tuning scenarios

### Scenario 1: Official filesystem MCP server

**Symptoms:** `schema.param.path`, low severity filesystem hints.

**Fix:**

```json
{
  "disabledRules": ["capability.filesystem_read"],
  "severityOverrides": {
    "schema.param.path": "info"
  }
}
```

### Scenario 2: CI gate — fail only on critical/high

```bash
npm run scan -- ./manifest.json --ci --max-critical=0 --max-high=0 --min-score=60
```

Tune `min-score` based on your risk appetite. See [Rule Catalog](./rule-catalog.md) for what each rule costs in score.

### Scenario 3: Security team wants injection only

```json
{
  "disabledRules": [
    "capability.filesystem_read",
    "capability.network",
    "schema.param.path",
    "schema.param.url",
    "chain.read_to_network"
  ]
}
```

### Scenario 4: GitHub Advanced Security / SARIF

Export SARIF and upload as a code scanning artifact:

```bash
npm run scan -- ./manifest.json --sarif results.sarif.json
```

GitHub Actions example:

```yaml
- name: Linejump MCP scan
  run: npm run scan -- ./mcp-manifest.json --sarif linejump.sarif.json --ci

- name: Upload SARIF
  uses: github/codeql-action/upload-sarif@v3
  with:
    sarif_file: linejump.sarif.json
```

## Understanding the safety score

- Starts at **100**
- Each unique rule hit per tool deducts points weighted by **severity** and **confidence**
- Duplicate hits for the same rule on the same tool are not double-counted
- Hover the score badge in the web scanner for a tooltip explanation

| Severity | Base penalty |
|----------|--------------|
| critical | 30 |
| high | 15 |
| medium | 6 |
| low | 2 |
| info | 0 |

Confidence multipliers: high = 1×, medium = 0.75×, low = 0.45×.

## Safety score thresholds (recommended)

| Environment | min-score | max-critical | max-high |
|-------------|-----------|--------------|----------|
| Production gate | 70 | 0 | 0 |
| Staging | 50 | 0 | 2 |
| Dev / exploratory | 30 | 1 | 5 |

## Validating policy changes

1. Save policy on **Policy** page (or update JSON / DB).
2. Re-run scan on a known-good manifest — score should rise, noise should drop.
3. Re-run on a known-bad sample — critical injection rules should still fire.
4. Run `npm test` after engine upgrades to confirm rule IDs unchanged.

## Rule reference

Full list of rule IDs: [Rule Catalog](./rule-catalog.md).
