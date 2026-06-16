import type { Database } from "bun:sqlite";

let db: Database | null = null;

async function getDb(): Promise<Database> {
  if (db) return db;
  const { Database } = (await import("bun:sqlite")) as { Database: typeof import("bun:sqlite")["Database"] };
  db = new Database("linejump.db", { create: true });
  db.exec("PRAGMA journal_mode=WAL");
  db.exec("PRAGMA foreign_keys=ON");
  initSchema(db);
  return db;
}

function initSchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
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
  `);
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

export async function saveScan(userId: string, serverName: string, manifest: string, score: number, findings: any[], deepScore?: number, deepFindings?: any[], deepAnalysis?: string): Promise<string> {
  const db = await getDb();
  const id = crypto.randomUUID();
  db.prepare("INSERT INTO scans (id, user_id, server_name, manifest, score, findings, deep_score, deep_findings, deep_analysis) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(id, userId, serverName, manifest, score, JSON.stringify(findings), deepScore ?? null, deepFindings ? JSON.stringify(deepFindings) : null, deepAnalysis ?? null);
  return id;
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
