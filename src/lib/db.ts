import Database from "better-sqlite3";

let db: Database.Database | null = null;

async function getDb(): Promise<Database.Database> {
  if (db) return db;
  db = new Database("linejump.db");
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA foreign_keys=ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS policies (
      org_id TEXT PRIMARY KEY,
      config_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      team_id TEXT,
      role TEXT NOT NULL DEFAULT 'member',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS scans (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      server_name TEXT NOT NULL,
      manifest TEXT NOT NULL,
      score INTEGER NOT NULL,
      findings TEXT NOT NULL,
      deep_score INTEGER,
      deep_findings TEXT,
      deep_analysis TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS ci_configs (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      max_critical INTEGER NOT NULL DEFAULT 0,
      max_high INTEGER NOT NULL DEFAULT 1,
      max_medium INTEGER NOT NULL DEFAULT 3,
      min_score INTEGER NOT NULL DEFAULT 60,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      details TEXT,
      ip TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS catalog_entries (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      server_url TEXT NOT NULL,
      scan_report TEXT NOT NULL,
      submitted_by TEXT,
      upvotes INTEGER NOT NULL DEFAULT 0,
      tags TEXT NOT NULL DEFAULT '[]',
      verified INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pinned_tools (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      description TEXT NOT NULL,
      schema_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(server_name, tool_name)
    );

    CREATE TABLE IF NOT EXISTS quarantined_responses (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      original_content TEXT NOT NULL,
      sanitized_content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'quarantined',
      reason TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS proxy_logs (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      tool_name TEXT NOT NULL,
      arguments TEXT NOT NULL,
      response TEXT NOT NULL,
      status TEXT NOT NULL,
      duration_ms INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS manifest_approvals (
      id TEXT PRIMARY KEY,
      server_name TEXT NOT NULL,
      manifest_hash TEXT NOT NULL,
      manifest_json TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'approved',
      approved_at TEXT NOT NULL DEFAULT (datetime('now')),
      approved_by TEXT NOT NULL DEFAULT 'security_admin',
      key_scheme TEXT NOT NULL DEFAULT 'LineJump HSM Key'
    );
  `);

  try {
    db.exec("ALTER TABLE manifest_approvals ADD COLUMN key_scheme TEXT NOT NULL DEFAULT 'LineJump HSM Key'");
  } catch (e) {
    // Ignore if column already exists
  }
}

export async function registerUser(email: string, name: string, password: string): Promise<string> {
  const db = await getDb();
  const bcrypt = (await import("bcryptjs")) as typeof import("bcryptjs");
  const hash = bcrypt.hashSync(password, 12);
  const id = crypto.randomUUID();

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) throw new Error("Email already registered");

  db.prepare("INSERT INTO users (id, email, name, password_hash) VALUES (?, ?, ?, ?)").run(id, email, name, hash);
  return id;
}

export async function authenticateUser(email: string, password: string): Promise<{ id: string; name: string; email: string; team_id: string | null; role: string } | null> {
  const db = await getDb();
  const bcrypt = (await import("bcryptjs")) as typeof import("bcryptjs");
  const user = db.prepare("SELECT id, name, email, password_hash, team_id, role FROM users WHERE email = ?").get(email) as { id: string; name: string; email: string; password_hash: string; team_id: string | null; role: string } | undefined;
  if (!user) return null;
  if (!bcrypt.compareSync(password, user.password_hash)) return null;
  return { id: user.id, name: user.name, email: user.email, team_id: user.team_id, role: user.role };
}

export async function createSession(userId: string): Promise<string> {
  const db = await getDb();
  const token = crypto.randomUUID();
  const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(token, userId, expires);
  return token;
}

export async function getSession(token: string): Promise<{ id: string; name: string; email: string; team_id: string | null; role: string } | null> {
  const db = await getDb();
  const row = db.prepare(`
    SELECT u.id, u.name, u.email, u.team_id, u.role
    FROM sessions s JOIN users u ON s.user_id = u.id
    WHERE s.id = ? AND s.expires_at > datetime('now')
  `).get(token) as { id: string; name: string; email: string; team_id: string | null; role: string } | undefined;
  return row || null;
}

export async function deleteSession(token: string): Promise<void> {
  const db = await getDb();
  db.prepare("DELETE FROM sessions WHERE id = ?").run(token);
}

export async function getUserById(userId: string): Promise<{ id: string; name: string; email: string; team_id: string | null; role: string } | null> {
  const db = await getDb();
  const row = db.prepare("SELECT id, name, email, team_id, role FROM users WHERE id = ?").get(userId) as any;
  return row || null;
}

export async function getTeamMembers(teamId: string): Promise<Array<{ id: string; name: string; email: string; role: string }>> {
  const db = await getDb();
  return db.prepare("SELECT id, name, email, role FROM users WHERE team_id = ?").all(teamId) as any[];
}

export async function createTeam(name: string, creatorUserId: string): Promise<string> {
  const db = await getDb();
  const teamId = crypto.randomUUID();
  db.prepare("INSERT INTO teams (id, name) VALUES (?, ?)").run(teamId, name);
  db.prepare("UPDATE users SET team_id = ?, role = 'admin' WHERE id = ?").run(teamId, creatorUserId);
  return teamId;
}

export async function joinTeam(userId: string, teamId: string): Promise<void> {
  const db = await getDb();
  const team = db.prepare("SELECT id FROM teams WHERE id = ?").get(teamId);
  if (!team) throw new Error("Team not found");
  db.prepare("UPDATE users SET team_id = ? WHERE id = ?").run(teamId, userId);
}

export async function saveScan(
  arg1: string,
  arg2: string,
  arg3: any,
  arg4: any,
  arg5?: any,
  deepScore?: number,
  deepFindings?: any[],
  deepAnalysis?: string
): Promise<string> {
  const db = await getDb();
  
  if (typeof arg4 === "object" || (arg5 && typeof arg5 === "object")) {
    const id = arg1;
    const orgId = arg2;
    const serverUrl = arg3;
    const manifest = arg4;
    const report = arg5;

    const serverName = serverUrl || report?.serverName || "unnamed";
    const manifestStr = typeof manifest === "string" ? manifest : JSON.stringify(manifest);
    const findingsStr = JSON.stringify(report?.findings || []);
    const score = report?.score || 0;

    db.prepare("INSERT OR REPLACE INTO scans (id, user_id, server_name, manifest, score, findings) VALUES (?, ?, ?, ?, ?, ?)")
      .run(id, "system", serverName, manifestStr, score, findingsStr);
    return id;
  } else {
    const userId = arg1;
    const serverName = arg2;
    const manifest = arg3;
    const score = arg4;
    const findings = arg5;

    const id = crypto.randomUUID();
    db.prepare("INSERT INTO scans (id, user_id, server_name, manifest, score, findings, deep_score, deep_findings, deep_analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
      .run(id, userId, serverName, manifest, score, JSON.stringify(findings), deepScore ?? null, deepFindings ? JSON.stringify(deepFindings) : null, deepAnalysis ?? null);
    return id;
  }
}

export async function getScans(userId: string, limit = 50): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT id, server_name, score, findings, deep_score, created_at FROM scans WHERE user_id = ? ORDER BY created_at DESC LIMIT ?").all(userId, limit) as any[];
}

export async function getScanById(scanId: string): Promise<any | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM scans WHERE id = ?").get(scanId) as any || null;
}

export async function getCiConfig(userId: string): Promise<{ max_critical: number; max_high: number; max_medium: number; min_score: number } | null> {
  const db = await getDb();
  return db.prepare("SELECT max_critical, max_high, max_medium, min_score FROM ci_configs WHERE user_id = ?").get(userId) as any || null;
}

export async function upsertCiConfig(userId: string, config: { max_critical: number; max_high: number; max_medium: number; min_score: number }): Promise<void> {
  const db = await getDb();
  const existing = db.prepare("SELECT id FROM ci_configs WHERE user_id = ?").get(userId);
  if (existing) {
    db.prepare("UPDATE ci_configs SET max_critical = ?, max_high = ?, max_medium = ?, min_score = ? WHERE user_id = ?")
      .run(config.max_critical, config.max_high, config.max_medium, config.min_score, userId);
  } else {
    db.prepare("INSERT INTO ci_configs (id, user_id, max_critical, max_high, max_medium, min_score) VALUES (?, ?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), userId, config.max_critical, config.max_high, config.max_medium, config.min_score);
  }
}

export async function logAudit(userId: string | null, action: string, details: string, ip?: string): Promise<void> {
  const db = await getDb();
  db.prepare("INSERT INTO audit_logs (id, user_id, action, details, ip) VALUES (?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), userId, action, details, ip ?? null);
}

export async function getAuditLogs(limit = 100): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT al.*, u.name as user_name FROM audit_logs al LEFT JOIN users u ON al.user_id = u.id ORDER BY al.created_at DESC LIMIT ?").all(limit) as any[];
}

export async function getTeamScanSummary(teamId: string): Promise<any[]> {
  const db = await getDb();
  return db.prepare(`
    SELECT u.name as user_name, s.server_name, s.score, s.deep_score, s.created_at
    FROM scans s JOIN users u ON s.user_id = u.id
    WHERE u.team_id = ?
    ORDER BY s.created_at DESC LIMIT 100
  `).all(teamId) as any[];
}

export async function getAllUsers(): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT id, name, email, team_id, role, created_at FROM users ORDER BY created_at DESC").all() as any[];
}

export async function getCatalogEntries(): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT * FROM catalog_entries ORDER BY upvotes DESC, created_at DESC").all() as any[];
}

export async function addCatalogEntry(entry: { server_name: string; server_url: string; scan_report: string; submitted_by?: string; tags: string }): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO catalog_entries (id, server_name, server_url, scan_report, submitted_by, tags) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, entry.server_name, entry.server_url, entry.scan_report, entry.submitted_by ?? null, entry.tags);
  return id;
}

export async function upvoteCatalogEntry(id: string): Promise<void> {
  const db = await getDb();
  db.prepare("UPDATE catalog_entries SET upvotes = upvotes + 1 WHERE id = ?").run(id);
}

export async function logProxyCall(serverName: string, toolName: string, args: string, response: string, status: string, durationMs: number): Promise<void> {
  const db = await getDb();
  db.prepare("INSERT INTO proxy_logs (id, server_name, tool_name, arguments, response, status, duration_ms) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), serverName, toolName, args, response, status, durationMs);
}

export async function getProxyLogs(limit = 100): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT * FROM proxy_logs ORDER BY created_at DESC LIMIT ?").all(limit) as any[];
}

export async function getPinnedTools(serverName?: string): Promise<any[]> {
  const db = await getDb();
  if (serverName) {
    return db.prepare("SELECT * FROM pinned_tools WHERE server_name = ?").all(serverName) as any[];
  }
  return db.prepare("SELECT * FROM pinned_tools ORDER BY created_at DESC").all() as any[];
}

export async function pinTool(serverName: string, toolName: string, description: string, schemaJson: string, status: string): Promise<void> {
  const db = await getDb();
  const existing = db.prepare("SELECT id FROM pinned_tools WHERE server_name = ? AND tool_name = ?").get(serverName, toolName) as any;
  if (existing) {
    db.prepare("UPDATE pinned_tools SET description = ?, schema_json = ?, status = ? WHERE id = ?")
      .run(description, schemaJson, status, existing.id);
  } else {
    db.prepare("INSERT INTO pinned_tools (id, server_name, tool_name, description, schema_json, status) VALUES (?, ?, ?, ?, ?, ?)")
      .run(crypto.randomUUID(), serverName, toolName, description, schemaJson, status);
  }
}

export async function approvePinnedTool(id: string): Promise<void> {
  const db = await getDb();
  db.prepare("UPDATE pinned_tools SET status = 'approved' WHERE id = ?").run(id);
}

export async function blockPinnedTool(id: string): Promise<void> {
  const db = await getDb();
  db.prepare("UPDATE pinned_tools SET status = 'blocked' WHERE id = ?").run(id);
}

export async function getQuarantinedResponses(): Promise<any[]> {
  const db = await getDb();
  return db.prepare("SELECT * FROM quarantined_responses ORDER BY created_at DESC").all() as any[];
}

export async function quarantineResponse(serverName: string, toolName: string, originalContent: string, sanitizedContent: string, reason: string): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO quarantined_responses (id, server_name, tool_name, original_content, sanitized_content, reason) VALUES (?, ?, ?, ?, ?, ?)")
    .run(id, serverName, toolName, originalContent, sanitizedContent, reason);
  return id;
}

export async function releaseQuarantine(id: string): Promise<void> {
  const db = await getDb();
  db.prepare("UPDATE quarantined_responses SET status = 'released' WHERE id = ?").run(id);
}

export async function getManifestApprovals(serverName?: string): Promise<any[]> {
  const db = await getDb();
  if (serverName) {
    return db.prepare("SELECT * FROM manifest_approvals WHERE server_name = ? ORDER BY approved_at DESC").all(serverName) as any[];
  }
  return db.prepare("SELECT * FROM manifest_approvals ORDER BY approved_at DESC").all() as any[];
}

export async function approveManifest(serverName: string, manifestHash: string, manifestJson: string, approvedBy = "security_admin", keyScheme = "LineJump HSM Key", status = "approved"): Promise<void> {
  const db = await getDb();
  db.prepare("INSERT INTO manifest_approvals (id, server_name, manifest_hash, manifest_json, status, approved_by, key_scheme) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(crypto.randomUUID(), serverName, manifestHash, manifestJson, status, approvedBy, keyScheme);
}

export async function getLatestApprovedManifest(serverName: string): Promise<any | null> {
  const db = await getDb();
  return db.prepare("SELECT * FROM manifest_approvals WHERE server_name = ? ORDER BY approved_at DESC LIMIT 1").get(serverName) as any || null;
}

export async function getHistory(orgId: string = "default_org"): Promise<any[]> {
  const db = await getDb();
  const rows = db.prepare("SELECT id, server_name, score, findings, created_at FROM scans ORDER BY created_at DESC").all() as any[];
  return rows.map((r) => {
    const findingsList = JSON.parse(r.findings || "[]");
    const mockReport = {
      serverName: r.server_name,
      score: r.score,
      findings: findingsList,
      toolCount: 0,
      scannedAt: r.created_at,
    };
    return {
      id: r.id,
      server_url: r.server_name,
      report_json: JSON.stringify(mockReport),
      created_at: r.created_at,
    };
  });
}

export async function getScan(id: string): Promise<any | null> {
  const db = await getDb();
  const r = db.prepare("SELECT id, server_name, score, findings, created_at FROM scans WHERE id = ?").get(id) as any;
  if (!r) return null;
  const findingsList = JSON.parse(r.findings || "[]");
  const mockReport = {
    serverName: r.server_name,
    score: r.score,
    findings: findingsList,
    toolCount: 0,
    scannedAt: r.created_at,
  };
  return {
    id: r.id,
    server_url: r.server_name,
    report_json: JSON.stringify(mockReport),
    created_at: r.created_at,
  };
}

export async function getPolicy(orgId: string): Promise<any> {
  const db = await getDb();
  const row = db.prepare("SELECT config_json FROM policies WHERE org_id = ?").get(orgId) as { config_json: string } | undefined;
  if (!row) {
    const { DEFAULT_SCANNER_POLICY } = await import("./default-policy");
    const defaultJson = JSON.stringify(DEFAULT_SCANNER_POLICY);
    db.prepare("INSERT INTO policies (org_id, config_json) VALUES (?, ?)").run(orgId, defaultJson);
    return DEFAULT_SCANNER_POLICY;
  }
  return JSON.parse(row.config_json);
}

export async function updatePolicy(orgId: string, policy: unknown): Promise<void> {
  const db = await getDb();
  db.prepare("INSERT OR REPLACE INTO policies (org_id, config_json) VALUES (?, ?)")
    .run(orgId, JSON.stringify(policy));
}


