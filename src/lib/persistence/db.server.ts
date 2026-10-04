/**
 * SQLite storage for projects, conversations, agent runs, versions and
 * deployments.
 *
 * Uses the runtime's built-in driver — `node:sqlite` on Node 22+, `bun:sqlite`
 * under Bun — so there is no native addon to compile and no database server to
 * run. Only positional `?` parameters are used, which both drivers accept.
 */
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { dataPaths } from "../config/env.server";

export type SqlValue = string | number | null;

export interface Statement {
  run(...params: SqlValue[]): unknown;
  get(...params: SqlValue[]): unknown;
  all(...params: SqlValue[]): unknown[];
}

export interface Database {
  exec(sql: string): void;
  prepare(sql: string): Statement;
  close(): void;
}

const require = createRequire(import.meta.url);

function openDriver(file: string): Database {
  if (typeof (globalThis as { Bun?: unknown }).Bun !== "undefined") {
    const { Database: BunDatabase } = require("bun:sqlite") as {
      Database: new (file: string) => Database;
    };
    return new BunDatabase(file);
  }
  // Silence the one-time ExperimentalWarning node prints for node:sqlite.
  const originalEmit = process.emitWarning;
  process.emitWarning = ((warning: string | Error, ...rest: unknown[]) => {
    const text = typeof warning === "string" ? warning : warning.message;
    if (text.includes("SQLite")) return;
    return (originalEmit as (...args: unknown[]) => void).call(process, warning, ...rest);
  }) as typeof process.emitWarning;
  try {
    const { DatabaseSync } = require("node:sqlite") as {
      DatabaseSync: new (file: string) => Database;
    };
    return new DatabaseSync(file);
  } finally {
    process.emitWarning = originalEmit;
  }
}

const MIGRATIONS: string[] = [
  `
  CREATE TABLE projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    framework TEXT NOT NULL DEFAULT 'unknown',
    package_manager TEXT NOT NULL DEFAULT 'npm',
    template_id TEXT,
    status TEXT NOT NULL DEFAULT 'idle',
    preview_port INTEGER,
    active_version_id TEXT,
    git_repository TEXT,
    git_branch TEXT,
    settings_json TEXT NOT NULL DEFAULT '{}',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX conversations_project ON conversations(project_id);
  CREATE TABLE messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    run_id TEXT,
    attachments_json TEXT NOT NULL DEFAULT '[]',
    metadata_json TEXT NOT NULL DEFAULT '{}',
    created_at TEXT NOT NULL
  );
  CREATE INDEX messages_conversation ON messages(conversation_id, created_at);
  CREATE TABLE agent_runs (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    conversation_id TEXT NOT NULL,
    kind TEXT NOT NULL,
    mode TEXT NOT NULL,
    state TEXT NOT NULL,
    provider TEXT,
    model TEXT,
    error TEXT,
    summary TEXT,
    files_changed_json TEXT NOT NULL DEFAULT '{"added":[],"changed":[],"removed":[]}',
    started_at TEXT NOT NULL,
    finished_at TEXT
  );
  CREATE INDEX agent_runs_project ON agent_runs(project_id, started_at);
  CREATE TABLE agent_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    seq INTEGER NOT NULL,
    type TEXT NOT NULL,
    data_json TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX agent_events_run ON agent_events(run_id, seq);
  CREATE TABLE tool_calls (
    id TEXT PRIMARY KEY,
    run_id TEXT NOT NULL REFERENCES agent_runs(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    input_json TEXT NOT NULL,
    output TEXT,
    status TEXT NOT NULL,
    error TEXT,
    duration_ms INTEGER,
    started_at TEXT NOT NULL
  );
  CREATE INDEX tool_calls_run ON tool_calls(run_id);
  CREATE TABLE versions (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    number INTEGER NOT NULL,
    label TEXT NOT NULL,
    prompt TEXT,
    sha TEXT NOT NULL,
    changed_files_json TEXT NOT NULL,
    status TEXT NOT NULL,
    run_id TEXT,
    created_at TEXT NOT NULL
  );
  CREATE UNIQUE INDEX versions_project_number ON versions(project_id, number);
  CREATE TABLE deployments (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_id TEXT,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    url TEXT,
    logs TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX deployments_project ON deployments(project_id, created_at);
  CREATE TABLE connections (
    id TEXT PRIMARY KEY,
    kind TEXT NOT NULL,
    metadata_json TEXT NOT NULL DEFAULT '{}',
    updated_at TEXT NOT NULL
  );
  CREATE TABLE app_settings (
    key TEXT PRIMARY KEY,
    value_json TEXT NOT NULL
  );
  `,
];

function migrate(db: Database): void {
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY)");
  const row = db.prepare("SELECT MAX(version) AS v FROM schema_migrations").get() as
    { v: number | null } | undefined;
  const current = row?.v ?? 0;
  for (let index = current; index < MIGRATIONS.length; index += 1) {
    db.exec("BEGIN");
    try {
      db.exec(MIGRATIONS[index] ?? "");
      db.prepare("INSERT INTO schema_migrations (version) VALUES (?)").run(index + 1);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
  }
}

type DbHolder = { db: Database; file: string };
const GLOBAL_KEY = Symbol.for("pulseui.db");

/**
 * One connection per process. Kept on globalThis so Vite's SSR module reloads
 * during development reuse it instead of leaking handles.
 */
export function getDb(): Database {
  const store = globalThis as unknown as Record<symbol, DbHolder | undefined>;
  const file = dataPaths().database;
  const existing = store[GLOBAL_KEY];
  if (existing && existing.file === file) return existing.db;
  if (existing) existing.db.close();

  fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = openDriver(file);
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  db.exec("PRAGMA busy_timeout = 5000");
  migrate(db);
  store[GLOBAL_KEY] = { db, file };
  return db;
}

/** Test helper: close and forget the current connection. */
export function closeDb(): void {
  const store = globalThis as unknown as Record<symbol, DbHolder | undefined>;
  store[GLOBAL_KEY]?.db.close();
  store[GLOBAL_KEY] = undefined;
}

export function transaction<T>(fn: () => T): T {
  const db = getDb();
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
