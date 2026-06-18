# Linejump Rule Catalog

Engine version: **2.1.0**

Every finding includes a stable `ruleId` for policy tuning. Disable rules or override severity on the **Policy** page or via `disabledRules` / `severityOverrides` in policy JSON.

## Severity legend

| Severity | SARIF level | Typical action |
|----------|-------------|----------------|
| critical | error | Block deploy / reject server |
| high | error | Require security review |
| medium | warning | Review before production |
| low | note | Informational |
| info | note | Informational |

---

## Prompt injection

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `injection.phrase_list` | high (critical if 3+ phrases) | medium–high | Known prompt-injection phrases in text |
| `injection.system_marker` | critical | high | Embedded `<\|system\|>`, `[system]`, ChatML tokens |
| `injection.line_jump_coerce` | high | high | Language forcing a specific tool call |
| `injection.block_other_tools` | high | high | Attempts to disable other tools |
| `injection.priority_hijack` | high | high | Forces tool call order |
| `injection.override` | high | high | Override instructions/prompt/policy language |
| `injection.split_field` | critical | high | Injection phrase only appears when fields are combined |
| `injection.split_field_pattern` | varies | high | Regex pattern matches combined fields only |

## Obfuscation

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `obfuscation.ansi_escape` | high | high | Terminal ANSI escape sequences |
| `obfuscation.control_chars` | medium | high | Non-printable control characters |
| `obfuscation.zero_width` | high | high | Zero-width / bidi Unicode |
| `obfuscation.homoglyph` | high | medium | Cyrillic lookalike characters |
| `obfuscation.html_comment` | medium | medium | HTML comment blocks hiding text |
| `obfuscation.html_entity` | medium | medium | HTML entity encoding |
| `obfuscation.markdown_js` | high | high | `javascript:` markdown links |
| `obfuscation.fullwidth` | medium | medium | Fullwidth Latin characters |
| `obfuscation.base64` | medium | medium | Long Base64-encoded blobs |
| `obfuscation.escaped_chars` | medium | medium | `\u` or `\x` escape sequences |

## Broad capability

| Rule ID | Default severity | Confidence | Surfaces |
|---------|------------------|------------|----------|
| `capability.shell` | high | high | prose, schema |
| `capability.exec` | high | high | prose, schema |
| `capability.destructive` | critical | high | prose, schema |
| `capability.privilege` | critical | high | prose, schema |
| `capability.exfil` | critical | high | prose, schema |
| `capability.secrets` | high | medium | prose, schema |
| `capability.filesystem_write` | high | medium | prose only |
| `capability.filesystem_read` | low | low | prose only |
| `capability.network` | medium | medium | prose only |
| `capability.env` | medium | medium | prose, schema |

> Legitimate tool names like `read_file` skip `capability.filesystem_read` noise automatically.

## Schema parameter risk

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `schema.param.command` | critical | high | Parameter named command/shell/exec/etc. |
| `schema.param.path` | low | low–high | Filesystem path parameter |
| `schema.param.url` | low | low–high | URL/callback parameter |
| `schema.param.query` | high | high | SQL/script query parameter |
| `schema.param.uri_format` | low | medium | String parameter with URI format |
| `schema.additional_properties_open` | medium | medium | `additionalProperties: true` |

## Cross-tool attack paths

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `chain.read_to_network` | high or low | high/low | Read/secret + outbound network tools |
| `chain.exec_to_network` | high | high | Code execution + outbound network |

## Tool shadowing

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `tool.name.unusual_chars` | medium | high | Non-standard characters in tool name |
| `tool.name.long` | low | medium | Tool name longer than 64 chars |
| `tool.name.sensitive_keyword` | medium | medium | Sensitive keyword in name (excludes standard MCP names) |
| `tool.duplicate_name` | high | high | Duplicate tool name in manifest |
| `tool.name_prefix_shadow` | medium | medium | Tool names share confusing prefix |

## Resources & network

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `resource.local_or_traversal` | high | high | `file://` or `..` in resource URI |
| `resource.remote_uri` | low | medium | Remote HTTP resource URI |
| `network.insecure_url` | medium | medium | `http://` URL in prose |

## Manifest

| Rule ID | Default severity | Confidence | Description |
|---------|------------------|------------|-------------|
| `manifest.no_tools` | info | high | No tools found in input |

## Custom rules

| Rule ID pattern | Description |
|-----------------|-------------|
| `custom.<title>` | User-defined regex from policy `customRegexes` |

---

See [Tuning Guide](./tuning-guide.md) for how to disable or override these rules per organization.
