/**
 * Typed data access. Every SQL statement in PulseUI lives in this file, so the
 * rest of the server works with domain objects rather than rows.
 */
import { randomUUID } from "node:crypto";

import {
  projectSettingsSchema,
  type AgentEvent,
  type AgentEventType,
  type AgentMode,
  type AgentRun,
  type AgentState,
  type Attachment,
  type ChatMessage,
  type Deployment,
  type DeploymentStatus,
  type FileChangeSummary,
  type Framework,
  type MessageRole,
  type PackageManager,
  type ProjectMetadata,
  type ProjectSettings,
  type ProjectStatus,
  type RunKind,
  type ToolCallRecord,
  type ToolCallStatus,
  type Version,
} from "../domain/types";
import { getDb, transaction, type SqlValue } from "./db.server";

const now = () => new Date().toISOString();
export const newId = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, "").slice(0, 20)}`;

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== "string") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const EMPTY_CHANGES: FileChangeSummary = { added: [], changed: [], removed: [] };

/* ------------------------------------------------------------------ *
 * Projects
 * ------------------------------------------------------------------ */

export type ProjectRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: Framework;
  packageManager: PackageManager;
  templateId: string | null;
  status: ProjectStatus;
  previewPort: number | null;
  activeVersionId: string | null;
  gitRepository: string | null;
  gitBranch: string | null;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
  createdAt: string;
  updatedAt: string;
};

type ProjectRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  framework: string;
  package_manager: string;
  template_id: string | null;
  status: string;
  preview_port: number | null;
  active_version_id: string | null;
  git_repository: string | null;
  git_branch: string | null;
  settings_json: string;
  metadata_json: string;
  created_at: string;
  updated_at: string;
};

function toProject(row: ProjectRow): ProjectRecord {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    framework: row.framework as Framework,
    packageManager: row.package_manager as PackageManager,
    templateId: row.template_id,
    status: row.status as ProjectStatus,
    previewPort: row.preview_port,
    activeVersionId: row.active_version_id,
    gitRepository: row.git_repository,
    gitBranch: row.git_branch,
    settings: projectSettingsSchema.parse(parseJson(row.settings_json, {})),
    metadata: parseJson<ProjectMetadata>(row.metadata_json, {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function slugify(value: string): string {
  const slug = value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "project";
}

export const projectsRepo = {
  create(input: {
    name: string;
    description?: string;
    framework?: Framework;
    packageManager?: PackageManager;
    templateId?: string | null;
    gitRepository?: string | null;
    gitBranch?: string | null;
    metadata?: ProjectMetadata;
    settings?: Partial<ProjectSettings>;
  }): ProjectRecord {
    const id = newId("prj");
    const at = now();
    getDb()
      .prepare(
        `INSERT INTO projects (id, name, slug, description, framework, package_manager, template_id,
          status, git_repository, git_branch, settings_json, metadata_json, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'idle', ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.name,
        slugify(input.name),
        input.description ?? "",
        input.framework ?? "unknown",
        input.packageManager ?? "npm",
        input.templateId ?? null,
        input.gitRepository ?? null,
        input.gitBranch ?? null,
        JSON.stringify(projectSettingsSchema.parse(input.settings ?? {})),
        JSON.stringify(input.metadata ?? {}),
        at,
        at,
      );
    const created = this.get(id);
    if (!created) throw new Error("Project insert failed");
    return created;
  },

  get(id: string): ProjectRecord | null {
    const row = getDb().prepare("SELECT * FROM projects WHERE id = ?").get(id) as
      ProjectRow | undefined;
    return row ? toProject(row) : null;
  },

  list(options: { query?: string; limit?: number } = {}): ProjectRecord[] {
    const limit = options.limit ?? 200;
    const rows = options.query
      ? getDb()
          .prepare(
            `SELECT * FROM projects WHERE name LIKE ? OR description LIKE ?
             ORDER BY updated_at DESC LIMIT ?`,
          )
          .all(`%${options.query}%`, `%${options.query}%`, limit)
      : getDb().prepare("SELECT * FROM projects ORDER BY updated_at DESC LIMIT ?").all(limit);
    return (rows as ProjectRow[]).map(toProject);
  },

  update(
    id: string,
    patch: Partial<
      Pick<
        ProjectRecord,
        | "name"
        | "description"
        | "framework"
        | "packageManager"
        | "status"
        | "previewPort"
        | "activeVersionId"
        | "gitRepository"
        | "gitBranch"
        | "settings"
        | "metadata"
      >
    >,
  ): ProjectRecord {
    const columns: Record<string, SqlValue> = {};
    if (patch.name !== undefined) {
      columns["name"] = patch.name;
      columns["slug"] = slugify(patch.name);
    }
    if (patch.description !== undefined) columns["description"] = patch.description;
    if (patch.framework !== undefined) columns["framework"] = patch.framework;
    if (patch.packageManager !== undefined) columns["package_manager"] = patch.packageManager;
    if (patch.status !== undefined) columns["status"] = patch.status;
    if (patch.previewPort !== undefined) columns["preview_port"] = patch.previewPort;
    if (patch.activeVersionId !== undefined) columns["active_version_id"] = patch.activeVersionId;
    if (patch.gitRepository !== undefined) columns["git_repository"] = patch.gitRepository;
    if (patch.gitBranch !== undefined) columns["git_branch"] = patch.gitBranch;
    if (patch.settings !== undefined)
      columns["settings_json"] = JSON.stringify(projectSettingsSchema.parse(patch.settings));
    if (patch.metadata !== undefined) columns["metadata_json"] = JSON.stringify(patch.metadata);
    columns["updated_at"] = now();

    const keys = Object.keys(columns);
    getDb()
      .prepare(`UPDATE projects SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`)
      .run(...keys.map((key) => columns[key] ?? null), id);
    const updated = this.get(id);
    if (!updated) throw new Error(`Project ${id} not found`);
    return updated;
  },

  touch(id: string): void {
    getDb().prepare("UPDATE projects SET updated_at = ? WHERE id = ?").run(now(), id);
  },

  delete(id: string): void {
    getDb().prepare("DELETE FROM projects WHERE id = ?").run(id);
  },

  /** On boot no preview or agent process from a previous server can still be alive. */
  resetTransientState(): void {
    getDb().prepare("UPDATE projects SET status = 'idle' WHERE status = 'running'").run();
    getDb()
      .prepare(
        `UPDATE agent_runs SET state = 'failed', error = 'PulseUI restarted while this run was active.',
         finished_at = ? WHERE state NOT IN ('completed', 'failed', 'cancelled')`,
      )
      .run(now());
  },
};

/* ------------------------------------------------------------------ *
 * Conversations & messages
 * ------------------------------------------------------------------ */

type MessageRow = {
  id: string;
  conversation_id: string;
  project_id: string;
  role: string;
  content: string;
  run_id: string | null;
  attachments_json: string;
  metadata_json: string;
  created_at: string;
};

function toMessage(row: MessageRow): ChatMessage {
  return {
    id: row.id,
    conversationId: row.conversation_id,
    projectId: row.project_id,
    role: row.role as MessageRole,
    content: row.content,
    runId: row.run_id,
    attachments: parseJson(row.attachments_json, []),
    metadata: parseJson(row.metadata_json, {}),
    createdAt: row.created_at,
  };
}

export const conversationsRepo = {
  /** Every project has one primary conversation, created on demand. */
  primary(projectId: string): { id: string; title: string } {
    const existing = getDb()
      .prepare(
        "SELECT id, title FROM conversations WHERE project_id = ? ORDER BY created_at LIMIT 1",
      )
      .get(projectId) as { id: string; title: string } | undefined;
    if (existing) return existing;
    const id = newId("cnv");
    getDb()
      .prepare("INSERT INTO conversations (id, project_id, title, created_at) VALUES (?, ?, ?, ?)")
      .run(id, projectId, "Main", now());
    return { id, title: "Main" };
  },
};

export const messagesRepo = {
  add(input: {
    conversationId: string;
    projectId: string;
    role: MessageRole;
    content: string;
    runId?: string | null;
    attachments?: Attachment[];
    metadata?: ChatMessage["metadata"];
  }): ChatMessage {
    const id = newId("msg");
    // Image bytes are not stored: they are only needed for the run they were attached to.
    const attachments = (input.attachments ?? []).map(({ data: _data, ...rest }) => rest);
    getDb()
      .prepare(
        `INSERT INTO messages (id, conversation_id, project_id, role, content, run_id,
          attachments_json, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.conversationId,
        input.projectId,
        input.role,
        input.content,
        input.runId ?? null,
        JSON.stringify(attachments),
        JSON.stringify(input.metadata ?? {}),
        now(),
      );
    const row = getDb().prepare("SELECT * FROM messages WHERE id = ?").get(id) as MessageRow;
    return toMessage(row);
  },

  setRun(messageId: string, runId: string): void {
    getDb().prepare("UPDATE messages SET run_id = ? WHERE id = ?").run(runId, messageId);
  },

  list(conversationId: string, limit = 500): ChatMessage[] {
    const rows = getDb()
      .prepare(
        `SELECT * FROM (SELECT *, rowid AS seq FROM messages WHERE conversation_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?)
         ORDER BY created_at ASC, seq ASC`,
      )
      .all(conversationId, limit) as MessageRow[];
    return rows.map(toMessage);
  },
};

/* ------------------------------------------------------------------ *
 * Agent runs, events, tool calls
 * ------------------------------------------------------------------ */

type RunRow = {
  id: string;
  project_id: string;
  conversation_id: string;
  kind: string;
  mode: string;
  state: string;
  provider: string | null;
  model: string | null;
  error: string | null;
  summary: string | null;
  files_changed_json: string;
  started_at: string;
  finished_at: string | null;
};

function toRun(row: RunRow): AgentRun {
  return {
    id: row.id,
    projectId: row.project_id,
    conversationId: row.conversation_id,
    kind: row.kind as RunKind,
    mode: row.mode as AgentMode,
    state: row.state as AgentState,
    provider: row.provider,
    model: row.model,
    error: row.error,
    summary: row.summary,
    filesChanged: parseJson(row.files_changed_json, EMPTY_CHANGES),
    startedAt: row.started_at,
    finishedAt: row.finished_at,
  };
}

export const runsRepo = {
  create(input: {
    projectId: string;
    conversationId: string;
    kind: RunKind;
    mode: AgentMode;
    provider?: string | null;
    model?: string | null;
  }): AgentRun {
    const id = newId("run");
    getDb()
      .prepare(
        `INSERT INTO agent_runs (id, project_id, conversation_id, kind, mode, state, provider, model, started_at)
         VALUES (?, ?, ?, ?, ?, 'queued', ?, ?, ?)`,
      )
      .run(
        id,
        input.projectId,
        input.conversationId,
        input.kind,
        input.mode,
        input.provider ?? null,
        input.model ?? null,
        now(),
      );
    return this.get(id) as AgentRun;
  },

  get(id: string): AgentRun | null {
    const row = getDb().prepare("SELECT * FROM agent_runs WHERE id = ?").get(id) as
      RunRow | undefined;
    return row ? toRun(row) : null;
  },

  listForProject(projectId: string, limit = 50): AgentRun[] {
    const rows = getDb()
      .prepare("SELECT * FROM agent_runs WHERE project_id = ? ORDER BY started_at DESC LIMIT ?")
      .all(projectId, limit) as RunRow[];
    return rows.map(toRun);
  },

  active(projectId: string): AgentRun | null {
    const row = getDb()
      .prepare(
        `SELECT * FROM agent_runs WHERE project_id = ? AND state NOT IN ('completed','failed','cancelled')
         ORDER BY started_at DESC LIMIT 1`,
      )
      .get(projectId) as RunRow | undefined;
    return row ? toRun(row) : null;
  },

  update(
    id: string,
    patch: Partial<
      Pick<AgentRun, "state" | "error" | "summary" | "filesChanged" | "provider" | "model">
    > & {
      finished?: boolean;
    },
  ): void {
    const columns: Record<string, SqlValue> = {};
    if (patch.state !== undefined) columns["state"] = patch.state;
    if (patch.error !== undefined) columns["error"] = patch.error;
    if (patch.summary !== undefined) columns["summary"] = patch.summary;
    if (patch.provider !== undefined) columns["provider"] = patch.provider;
    if (patch.model !== undefined) columns["model"] = patch.model;
    if (patch.filesChanged !== undefined)
      columns["files_changed_json"] = JSON.stringify(patch.filesChanged);
    if (patch.finished) columns["finished_at"] = now();
    const keys = Object.keys(columns);
    if (!keys.length) return;
    getDb()
      .prepare(`UPDATE agent_runs SET ${keys.map((key) => `${key} = ?`).join(", ")} WHERE id = ?`)
      .run(...keys.map((key) => columns[key] ?? null), id);
  },
};

export const eventsRepo = {
  append(
    runId: string,
    seq: number,
    type: AgentEventType,
    data: Record<string, unknown>,
  ): AgentEvent {
    const at = now();
    getDb()
      .prepare(
        "INSERT INTO agent_events (run_id, seq, type, data_json, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(runId, seq, type, JSON.stringify(data), at);
    return { runId, seq, type, at, data };
  },

  list(runId: string, afterSeq = -1): AgentEvent[] {
    const rows = getDb()
      .prepare(
        "SELECT run_id, seq, type, data_json, created_at FROM agent_events WHERE run_id = ? AND seq > ? ORDER BY seq",
      )
      .all(runId, afterSeq) as Array<{
      run_id: string;
      seq: number;
      type: string;
      data_json: string;
      created_at: string;
    }>;
    return rows.map((row) => ({
      runId: row.run_id,
      seq: row.seq,
      type: row.type as AgentEventType,
      at: row.created_at,
      data: parseJson(row.data_json, {}),
    }));
  },
};

export const toolCallsRepo = {
  start(runId: string, name: string, input: Record<string, unknown>): string {
    const id = newId("tc");
    getDb()
      .prepare(
        "INSERT INTO tool_calls (id, run_id, name, input_json, status, started_at) VALUES (?, ?, ?, ?, 'running', ?)",
      )
      .run(id, runId, name, JSON.stringify(input), now());
    return id;
  },

  finish(
    id: string,
    result: {
      status: ToolCallStatus;
      output?: string | null;
      error?: string | null;
      durationMs: number;
    },
  ): void {
    getDb()
      .prepare(
        "UPDATE tool_calls SET status = ?, output = ?, error = ?, duration_ms = ? WHERE id = ?",
      )
      .run(result.status, result.output ?? null, result.error ?? null, result.durationMs, id);
  },

  list(runId: string): ToolCallRecord[] {
    const rows = getDb()
      .prepare("SELECT * FROM tool_calls WHERE run_id = ? ORDER BY started_at, rowid")
      .all(runId) as Array<{
      id: string;
      run_id: string;
      name: string;
      input_json: string;
      output: string | null;
      status: string;
      error: string | null;
      duration_ms: number | null;
      started_at: string;
    }>;
    return rows.map((row) => ({
      id: row.id,
      runId: row.run_id,
      name: row.name,
      input: parseJson(row.input_json, {}),
      output: row.output,
      status: row.status as ToolCallStatus,
      error: row.error,
      durationMs: row.duration_ms,
      startedAt: row.started_at,
    }));
  },
};

/* ------------------------------------------------------------------ *
 * Versions
 * ------------------------------------------------------------------ */

type VersionRow = {
  id: string;
  project_id: string;
  number: number;
  label: string;
  prompt: string | null;
  sha: string;
  changed_files_json: string;
  status: string;
  run_id: string | null;
  created_at: string;
};

function toVersion(row: VersionRow): Version {
  return {
    id: row.id,
    projectId: row.project_id,
    number: row.number,
    label: row.label,
    prompt: row.prompt,
    sha: row.sha,
    changedFiles: parseJson(row.changed_files_json, EMPTY_CHANGES),
    status: row.status as Version["status"],
    runId: row.run_id,
    createdAt: row.created_at,
  };
}

export const versionsRepo = {
  create(input: {
    projectId: string;
    label: string;
    prompt?: string | null;
    sha: string;
    changedFiles: FileChangeSummary;
    status: Version["status"];
    runId?: string | null;
  }): Version {
    return transaction(() => {
      const row = getDb()
        .prepare("SELECT COALESCE(MAX(number), 0) AS n FROM versions WHERE project_id = ?")
        .get(input.projectId) as { n: number };
      const id = newId("ver");
      getDb()
        .prepare(
          `INSERT INTO versions (id, project_id, number, label, prompt, sha, changed_files_json, status, run_id, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .run(
          id,
          input.projectId,
          row.n + 1,
          input.label,
          input.prompt ?? null,
          input.sha,
          JSON.stringify(input.changedFiles),
          input.status,
          input.runId ?? null,
          now(),
        );
      getDb()
        .prepare("UPDATE projects SET active_version_id = ?, updated_at = ? WHERE id = ?")
        .run(id, now(), input.projectId);
      return this.get(id) as Version;
    });
  },

  get(id: string): Version | null {
    const row = getDb().prepare("SELECT * FROM versions WHERE id = ?").get(id) as
      VersionRow | undefined;
    return row ? toVersion(row) : null;
  },

  list(projectId: string): Version[] {
    const rows = getDb()
      .prepare("SELECT * FROM versions WHERE project_id = ? ORDER BY number DESC")
      .all(projectId) as VersionRow[];
    return rows.map(toVersion);
  },

  latest(projectId: string): Version | null {
    const row = getDb()
      .prepare("SELECT * FROM versions WHERE project_id = ? ORDER BY number DESC LIMIT 1")
      .get(projectId) as VersionRow | undefined;
    return row ? toVersion(row) : null;
  },
};

/* ------------------------------------------------------------------ *
 * Deployments
 * ------------------------------------------------------------------ */

type DeploymentRow = {
  id: string;
  project_id: string;
  version_id: string | null;
  provider: string;
  status: string;
  url: string | null;
  logs: string;
  created_at: string;
  updated_at: string;
};

function toDeployment(row: DeploymentRow): Deployment {
  return {
    id: row.id,
    projectId: row.project_id,
    versionId: row.version_id,
    provider: row.provider,
    status: row.status as DeploymentStatus,
    url: row.url,
    logs: row.logs,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const deploymentsRepo = {
  create(input: { projectId: string; versionId: string | null; provider: string }): Deployment {
    const id = newId("dpl");
    const at = now();
    getDb()
      .prepare(
        `INSERT INTO deployments (id, project_id, version_id, provider, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'QUEUED', ?, ?)`,
      )
      .run(id, input.projectId, input.versionId, input.provider, at, at);
    return this.get(id) as Deployment;
  },

  get(id: string): Deployment | null {
    const row = getDb().prepare("SELECT * FROM deployments WHERE id = ?").get(id) as
      DeploymentRow | undefined;
    return row ? toDeployment(row) : null;
  },

  list(projectId: string): Deployment[] {
    const rows = getDb()
      .prepare("SELECT * FROM deployments WHERE project_id = ? ORDER BY created_at DESC")
      .all(projectId) as DeploymentRow[];
    return rows.map(toDeployment);
  },

  update(
    id: string,
    patch: Partial<Pick<Deployment, "status" | "url">> & { appendLog?: string },
  ): void {
    const current = this.get(id);
    if (!current) return;
    const logs = patch.appendLog ? (current.logs + patch.appendLog).slice(-200_000) : current.logs;
    getDb()
      .prepare("UPDATE deployments SET status = ?, url = ?, logs = ?, updated_at = ? WHERE id = ?")
      .run(patch.status ?? current.status, patch.url ?? current.url, logs, now(), id);
  },
};

/* ------------------------------------------------------------------ *
 * App settings (non-secret preferences only)
 * ------------------------------------------------------------------ */

export const settingsRepo = {
  get<T>(key: string, fallback: T): T {
    const row = getDb().prepare("SELECT value_json FROM app_settings WHERE key = ?").get(key) as
      { value_json: string } | undefined;
    return row ? parseJson(row.value_json, fallback) : fallback;
  },
  set(key: string, value: unknown): void {
    getDb()
      .prepare(
        "INSERT INTO app_settings (key, value_json) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value_json = excluded.value_json",
      )
      .run(key, JSON.stringify(value));
  },
};
