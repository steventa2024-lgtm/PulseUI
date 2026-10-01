/**
 * Domain model shared by the server and the browser. Nothing in this file may
 * import server code — it is bundled into the client.
 */
import { z } from "zod";

export type Framework =
  "vite-react" | "vite" | "nextjs" | "astro" | "static-html" | "node" | "unknown";
export type PackageManager = "bun" | "npm" | "pnpm" | "yarn";

export type ProjectStatus = "idle" | "running" | "error";
export type PreviewStatus = "stopped" | "installing" | "starting" | "ready" | "failed";

export const projectSettingsSchema = z.object({
  autoRepairAttempts: z.number().int().min(0).max(10).default(3),
  runTypecheck: z.boolean().default(true),
  runLint: z.boolean().default(true),
  autoStartPreview: z.boolean().default(true),
  model: z.string().max(200).optional(),
});
export type ProjectSettings = z.infer<typeof projectSettingsSchema>;

export type ProjectMetadata = {
  importedFrom?: string;
  initialPrompt?: string;
  installCommand?: string;
  devCommand?: string;
  buildCommand?: string;
};

export type Project = {
  id: string;
  name: string;
  slug: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  framework: Framework;
  packageManager: PackageManager;
  templateId: string | null;
  workspacePath: string;
  status: ProjectStatus;
  previewStatus: PreviewStatus;
  previewPort: number | null;
  previewUrl: string | null;
  activeVersionId: string | null;
  gitRepository: string | null;
  gitBranch: string | null;
  settings: ProjectSettings;
  metadata: ProjectMetadata;
};

export type ProjectSummary = Pick<
  Project,
  | "id"
  | "name"
  | "slug"
  | "description"
  | "framework"
  | "templateId"
  | "status"
  | "updatedAt"
  | "createdAt"
>;

export type MessageRole = "user" | "assistant" | "tool" | "system";

export type Attachment = {
  name: string;
  mimeType: string;
  size: number;
  kind: "image" | "text";
  /** base64 for images, utf-8 for text. Never returned to the client after persisting images. */
  data?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  projectId: string;
  role: MessageRole;
  content: string;
  runId: string | null;
  attachments: Array<Omit<Attachment, "data">>;
  metadata: {
    filesChanged?: FileChangeSummary;
    mode?: AgentMode;
    model?: string;
  };
  createdAt: string;
};

export type AgentMode = "plan" | "build";
export type RunKind = "agent" | "setup";

export type AgentState =
  | "queued"
  | "planning"
  | "reading"
  | "editing"
  | "installing"
  | "building"
  | "testing"
  | "starting_preview"
  | "repairing"
  | "completed"
  | "failed"
  | "cancelled";

export const TERMINAL_STATES: ReadonlySet<AgentState> = new Set([
  "completed",
  "failed",
  "cancelled",
]);

export type FileChangeSummary = {
  added: string[];
  changed: string[];
  removed: string[];
};

export type AgentRun = {
  id: string;
  projectId: string;
  conversationId: string;
  kind: RunKind;
  mode: AgentMode;
  state: AgentState;
  provider: string | null;
  model: string | null;
  error: string | null;
  summary: string | null;
  filesChanged: FileChangeSummary;
  startedAt: string;
  finishedAt: string | null;
};

export type ToolCallStatus = "running" | "succeeded" | "failed";

export type JsonValue =
  string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Drop keys whose value is undefined (for exactOptionalPropertyTypes-friendly patches). */
export function compact<T extends Record<string, unknown>>(
  value: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>;
  };
}

export type AgentEventType =
  | "agent.started"
  | "agent.state"
  | "agent.delta"
  | "agent.plan"
  | "agent.message"
  | "tool.started"
  | "tool.output"
  | "tool.completed"
  | "file.created"
  | "file.updated"
  | "file.deleted"
  | "build.started"
  | "build.output"
  | "build.completed"
  | "preview.starting"
  | "preview.ready"
  | "preview.failed"
  | "version.created"
  | "agent.completed"
  | "agent.failed"
  | "agent.cancelled";

export type AgentEvent = {
  runId: string;
  seq: number;
  type: AgentEventType;
  at: string;
  data: Record<string, unknown>;
};

export type ToolCallRecord = {
  id: string;
  runId: string;
  name: string;
  input: Record<string, JsonValue>;
  output: string | null;
  status: ToolCallStatus;
  error: string | null;
  durationMs: number | null;
  startedAt: string;
};

export type Version = {
  id: string;
  projectId: string;
  number: number;
  label: string;
  prompt: string | null;
  sha: string;
  changedFiles: FileChangeSummary;
  status: "ok" | "build_failed" | "restored" | "manual";
  runId: string | null;
  createdAt: string;
};

export type DeploymentStatus = "QUEUED" | "BUILDING" | "READY" | "FAILED" | "CANCELLED";

export type Deployment = {
  id: string;
  projectId: string;
  versionId: string | null;
  provider: string;
  status: DeploymentStatus;
  url: string | null;
  logs: string;
  createdAt: string;
  updatedAt: string;
};

export type FileNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileNode[];
};

export type ModelOption = {
  /** `${providerId}:${model}` — what the composer sends back. */
  id: string;
  providerId: string;
  providerLabel: string;
  model: string;
  local: boolean;
  supportsVision: boolean;
};

export type ConnectionState = "connected" | "not_connected" | "local" | "unavailable";

export type ConnectionInfo = {
  id: string;
  name: string;
  category: "ai" | "source" | "backend" | "payments" | "email";
  state: ConnectionState;
  detail: string;
  envVars: string[];
};

export const ATTACHMENT_LIMITS = {
  maxCount: 6,
  maxImageBytes: 4 * 1024 * 1024,
  maxTextBytes: 200 * 1024,
  imageTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  textExtensions: [
    ".txt",
    ".md",
    ".markdown",
    ".json",
    ".ts",
    ".tsx",
    ".js",
    ".jsx",
    ".css",
    ".html",
    ".yml",
    ".yaml",
    ".csv",
    ".svg",
    ".py",
    ".toml",
  ],
} as const;
