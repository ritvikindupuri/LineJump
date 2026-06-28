const Database = require("better-sqlite3");
const db = new Database("linejump.db");

console.log("Seeding mock database data for LineJump...");

// Initialize tables if they do not exist
db.exec(`
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
    approved_by TEXT NOT NULL DEFAULT 'security_admin'
  );
`);

// 1. Seed pinned tools
db.prepare("DELETE FROM pinned_tools").run();
const insertPinned = db.prepare(`
  INSERT INTO pinned_tools (id, server_name, tool_name, description, schema_json, status, created_at)
  VALUES (?, ?, ?, ?, ?, ?, datetime('now', ?))
`);

insertPinned.run("pt-1", "SuperSecure-Internal-Server", "read_confidential_db", "Read DB contents.", '{"type":"object"}', "pending", "-10 minutes");
insertPinned.run("pt-2", "SuperSecure-Internal-Server", "send_webhook_report", "Sends analytics webhook.", '{"type":"object"}', "approved", "-9 minutes");
insertPinned.run("pt-3", "SuperSecure-Internal-Server", "execute_shell_cmd", "Execute terminal actions.", '{"type":"object"}', "blocked", "-8 minutes");
insertPinned.run("pt-4", "SuperSecure-Internal-Server", "write_query", "Write database query.", '{"type":"object"}', "approved", "-7 minutes");

// 2. Seed quarantined responses
db.prepare("DELETE FROM quarantined_responses").run();
const insertQuar = db.prepare(`
  INSERT INTO quarantined_responses (id, server_name, tool_name, original_content, sanitized_content, status, reason, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
`);

insertQuar.run(
  "qr-1",
  "SuperSecure-Internal-Server",
  "print_terminal_status",
  "Status: \u001b[31mWARNING\u001b[0m - Command executed successfully.",
  "Status: WARNING - Command executed successfully.",
  "quarantined",
  "ANSI Terminal Escape Characters detected",
  "-5 minutes"
);
insertQuar.run(
  "qr-2",
  "SuperSecure-Internal-Server",
  "read_confidential_db",
  "Error: Access denied for root. Secret token mismatch.",
  "Error: Access denied for root. [REDACTED token] mismatch.",
  "released",
  "DLP Secret Token leak quarantined and redacted",
  "-4 minutes"
);

// 3. Seed proxy logs
db.prepare("DELETE FROM proxy_logs").run();
const insertLog = db.prepare(`
  INSERT INTO proxy_logs (id, server_name, tool_name, arguments, response, status, duration_ms, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
`);

insertLog.run("pl-1", "SuperSecure-Internal-Server", "read_confidential_db", '{"table":"users"}', '{"status":"success","rows":100}', "allowed", 124, "-3 minutes");
insertLog.run("pl-2", "SuperSecure-Internal-Server", "execute_shell_cmd", '{"cmd":"sudo rm -rf /"}', '{"error":"Blocked: Execution of destructive command blocked by LineJump Policy"}', "blocked", 5, "-2 minutes");
insertLog.run("pl-3", "SuperSecure-Internal-Server", "print_terminal_status", '{}', '{"text":"Status: WARNING - Clean output"}', "sanitized", 45, "-1 minute");

// 4. Seed manifest approvals (Drift Governance)
db.prepare("DELETE FROM manifest_approvals").run();
const insertAppr = db.prepare(`
  INSERT INTO manifest_approvals (id, server_name, manifest_hash, manifest_json, status, approved_at, approved_by)
  VALUES (?, ?, ?, ?, ?, datetime('now', ?), ?)
`);

const historicalManifest = JSON.stringify({
  name: "SuperSecure-Internal-Server",
  version: "1.0.0",
  tools: [
    {
      name: "read_confidential_db",
      description: "Read records from the database."
    }
  ]
});

insertAppr.run(
  "ap-1",
  "SuperSecure-Internal-Server",
  "h-historicalhash",
  historicalManifest,
  "approved",
  "-1 hour",
  "security_admin"
);

console.log("Mock database data seeded successfully!");
