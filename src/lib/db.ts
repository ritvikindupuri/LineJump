import Database from "better-sqlite3";

export const db = new Database("linejump.sqlite");

db.exec(`
  CREATE TABLE IF NOT EXISTS orgs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS policies (
    org_id TEXT PRIMARY KEY,
    config_json TEXT NOT NULL,
    FOREIGN KEY (org_id) REFERENCES orgs(id)
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    org_id TEXT NOT NULL,
    server_url TEXT,
    manifest_json TEXT NOT NULL,
    report_json TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (org_id) REFERENCES orgs(id)
  );
`);

// Seed a default org
const orgExists = db.prepare(`SELECT id FROM orgs WHERE id = 'default_org'`).get();
if (!orgExists) {
  db.prepare(`INSERT INTO orgs (id, name) VALUES ('default_org', 'Default Organization')`).run();
  const defaultPolicy = JSON.stringify({
    disabledRules: [],
    customRegexes: [],
    severityOverrides: {},
    blockedCapabilities: [],
    requireApproval: false,
  });
  db.prepare(`INSERT INTO policies (org_id, config_json) VALUES ('default_org', ?)`).run(
    defaultPolicy,
  );
}

export function getPolicy(orgId: string): unknown {
  const row = db
    .prepare<{ org_id: string }>(`SELECT config_json FROM policies WHERE org_id = @org_id`)
    .get({ org_id: orgId }) as { config_json: string } | undefined;
  if (!row) return null;
  return JSON.parse(row.config_json);
}

export function updatePolicy(orgId: string, policy: unknown) {
  db.prepare<{ config: string; orgId: string }>(
    `UPDATE policies SET config_json = @config WHERE org_id = @orgId`,
  ).run({ config: JSON.stringify(policy), orgId });
}

export function saveScan(
  id: string,
  orgId: string,
  serverUrl: string | null,
  manifest: unknown,
  report: unknown,
) {
  db.prepare<{
    id: string;
    orgId: string;
    serverUrl: string | null;
    manifest: string;
    report: string;
  }>(
    `INSERT INTO scans (id, org_id, server_url, manifest_json, report_json) VALUES (@id, @orgId, @serverUrl, @manifest, @report)`,
  ).run({
    id,
    orgId,
    serverUrl,
    manifest: JSON.stringify(manifest),
    report: JSON.stringify(report),
  });
}

export function getHistory(orgId: string): unknown[] {
  return db
    .prepare<{
      orgId: string;
    }>(
      `SELECT id, server_url, report_json, created_at FROM scans WHERE org_id = @orgId ORDER BY created_at DESC`,
    )
    .all({ orgId }) as unknown[];
}

export function getScan(id: string): unknown {
  return db.prepare<{ id: string }>(`SELECT * FROM scans WHERE id = @id`).get({ id });
}
