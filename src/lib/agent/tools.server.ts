/**
 * Pulse's tool registry. Each tool has a typed, validated input, a declared
 * access level (plan mode only gets read tools), a workspace-scoped executor
 * and structured output. Every call is recorded with status and duration.
 */
import { z } from "zod";

import { formatCommandResult, runCommand } from "../commands/command-runner.server";
import { serverEnv } from "../config/env.server";
import type { AgentMode, AgentState, PackageManager } from "../domain/types";
import { workspaceGitDiff, workspaceGitLog, workspaceGitStatus } from "../git/git.server";
import { logger } from "../log.server";
import { toolCallsRepo } from "../persistence/repositories.server";
import {
  getPreview,
  previewLogs,
  restartPreview,
  startPreview,
  stopPreview,
} from "../preview/preview-manager.server";
import {
  describeOutcome,
  frameworkInfo,
  runProjectCommand,
} from "../workspace/project-commands.server";
import { normalizeRelative } from "../workspace/paths.server";
import type { Workspace } from "../workspace/workspace-manager.server";
import { emit } from "./event-bus.server";
import { applyPatch } from "./protocol";

const log = logger("tools");

export type ToolAccess = "read" | "write" | "exec";

export type ToolContext = {
  runId: string;
  projectId: string;
  workspace: Workspace;
  mode: AgentMode;
  packageManager: PackageManager;
  signal: AbortSignal;
  /** Files read or written during this run — edits to existing files require a prior read. */
  seenFiles: Set<string>;
  setState: (state: AgentState) => void;
};

export type ToolResult = { output: string; ok?: boolean };

type ToolDefinition<Schema extends z.ZodTypeAny> = {
  name: string;
  description: string;
  access: ToolAccess;
  input: Schema;
  execute: (ctx: ToolContext, args: z.infer<Schema>) => Promise<ToolResult> | ToolResult;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyTool = ToolDefinition<any>;

function defineTool<Schema extends z.ZodTypeAny>(tool: ToolDefinition<Schema>): AnyTool {
  return tool;
}

const pathArg = z.string().min(1).max(400);
const MAX_RESULT_CHARS = 14_000;

function clip(text: string, max = MAX_RESULT_CHARS): string {
  return text.length > max
    ? `${text.slice(0, max)}\n… [${text.length - max} more characters truncated]`
    : text;
}

function requireSeen(ctx: ToolContext, path: string, action: string) {
  if (ctx.workspace.exists(path) && !ctx.seenFiles.has(normalizeRelative(path))) {
    throw new Error(
      `${path} already exists and has not been read in this run. Read it first with read_file, then ${action} it — it may contain the user's manual edits.`,
    );
  }
}

const PACKAGE_SPEC = /^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*(@[\w.^~*-]+)?$/i;

function addCommand(pm: PackageManager, packages: string[], dev: boolean): string[] {
  if (pm === "npm") return ["npm", "install", ...(dev ? ["--save-dev"] : []), ...packages];
  if (pm === "yarn") return ["yarn", "add", ...(dev ? ["-D"] : []), ...packages];
  if (pm === "pnpm") return ["pnpm", "add", ...(dev ? ["-D"] : []), ...packages];
  return ["bun", "add", ...(dev ? ["-d"] : []), ...packages];
}

async function projectCommandTool(
  ctx: ToolContext,
  kind: "typecheck" | "lint" | "test" | "build",
  state: AgentState,
): Promise<ToolResult> {
  ctx.setState(state);
  if (kind === "build") emit(ctx.runId, "build.started", { command: kind });
  const outcome = await runProjectCommand(ctx.workspace.root, kind, {
    packageManager: ctx.packageManager,
    signal: ctx.signal,
    onOutput: (chunk) => {
      if (kind === "build") emit(ctx.runId, "build.output", { text: chunk.slice(0, 4000) });
    },
  });
  const ok = outcome.skipped || outcome.result.ok;
  if (kind === "build") emit(ctx.runId, "build.completed", { ok, skipped: outcome.skipped });
  return { output: clip(describeOutcome(outcome)), ok };
}

export const TOOLS: AnyTool[] = [
  defineTool({
    name: "list_files",
    description: "List project files (ignores node_modules, dist, .git). Args: {directory?}",
    access: "read",
    input: z.object({ directory: z.string().max(400).optional() }),
    execute: (ctx, args) => {
      ctx.setState("reading");
      const files = ctx.workspace.listFiles(args.directory ? { directory: args.directory } : {});
      return { output: files.length ? clip(files.slice(0, 600).join("\n")) : "(no files)" };
    },
  }),
  defineTool({
    name: "read_file",
    description: "Read one file. Args: {path}",
    access: "read",
    input: z.object({ path: pathArg }),
    execute: (ctx, args) => {
      ctx.setState("reading");
      const content = ctx.workspace.readFile(args.path);
      ctx.seenFiles.add(normalizeRelative(args.path));
      return { output: clip(content, 40_000) };
    },
  }),
  defineTool({
    name: "read_files",
    description: "Read up to 8 files at once. Args: {paths: string[]}",
    access: "read",
    input: z.object({ paths: z.array(pathArg).min(1).max(8) }),
    execute: (ctx, args) => {
      ctx.setState("reading");
      const parts = args.paths.map((path) => {
        try {
          const content = ctx.workspace.readFile(path);
          ctx.seenFiles.add(normalizeRelative(path));
          return `=== ${path} ===\n${clip(content, 16_000)}`;
        } catch (error) {
          return `=== ${path} ===\nERROR: ${error instanceof Error ? error.message : String(error)}`;
        }
      });
      return { output: parts.join("\n\n") };
    },
  }),
  defineTool({
    name: "search_files",
    description: "Search file contents (case-insensitive). Args: {query, regex?}",
    access: "read",
    input: z.object({ query: z.string().min(1).max(200), regex: z.boolean().optional() }),
    execute: (ctx, args) => {
      ctx.setState("reading");
      const matches = ctx.workspace.search(args.query, { regex: args.regex ?? false, limit: 80 });
      if (!matches.length) return { output: "No matches." };
      return {
        output: matches.map((match) => `${match.path}:${match.line}: ${match.text}`).join("\n"),
      };
    },
  }),
  defineTool({
    name: "write_file",
    description: "Create or overwrite a file. Prefer the <write path> tag. Args: {path, content}",
    access: "write",
    input: z.object({ path: pathArg, content: z.string() }),
    execute: (ctx, args) => {
      ctx.setState("editing");
      requireSeen(ctx, args.path, "overwrite");
      const result = ctx.workspace.writeFile(args.path, args.content);
      ctx.seenFiles.add(result.path);
      emit(ctx.runId, result.created ? "file.created" : "file.updated", {
        path: result.path,
        bytes: Buffer.byteLength(args.content),
      });
      return {
        output: `${result.created ? "Created" : "Updated"} ${result.path} (${args.content.split("\n").length} lines)`,
      };
    },
  }),
  defineTool({
    name: "replace_file",
    description: "Replace the full content of an existing file. Args: {path, content}",
    access: "write",
    input: z.object({ path: pathArg, content: z.string() }),
    execute: (ctx, args) => {
      ctx.setState("editing");
      if (!ctx.workspace.exists(args.path))
        throw new Error(`${args.path} does not exist; use write_file.`);
      requireSeen(ctx, args.path, "replace");
      const result = ctx.workspace.writeFile(args.path, args.content);
      emit(ctx.runId, "file.updated", {
        path: result.path,
        bytes: Buffer.byteLength(args.content),
      });
      return { output: `Replaced ${result.path}` };
    },
  }),
  defineTool({
    name: "patch_file",
    description:
      "Apply SEARCH/REPLACE blocks to an existing file. Prefer the <patch path> tag. Args: {path, patch}",
    access: "write",
    input: z.object({ path: pathArg, patch: z.string().min(1) }),
    execute: (ctx, args) => {
      ctx.setState("editing");
      const original = ctx.workspace.readFile(args.path);
      requireSeen(ctx, args.path, "patch");
      const updated = applyPatch(original, args.patch);
      if (updated === original) return { output: `No change to ${args.path}.` };
      const result = ctx.workspace.writeFile(args.path, updated);
      emit(ctx.runId, "file.updated", {
        path: result.path,
        bytes: Buffer.byteLength(updated),
        patched: true,
      });
      return { output: `Patched ${result.path}` };
    },
  }),
  defineTool({
    name: "create_directory",
    description: "Create a directory. Args: {path}",
    access: "write",
    input: z.object({ path: pathArg }),
    execute: (ctx, args) => ({
      output: `Created directory ${ctx.workspace.createDirectory(args.path)}`,
    }),
  }),
  defineTool({
    name: "delete_file",
    description: "Delete a file or directory. Args: {path}",
    access: "write",
    input: z.object({ path: pathArg }),
    execute: (ctx, args) => {
      ctx.setState("editing");
      const result = ctx.workspace.delete(args.path);
      emit(ctx.runId, "file.deleted", { path: result.path });
      return { output: `Deleted ${result.path}` };
    },
  }),
  defineTool({
    name: "rename_file",
    description: "Rename or move a file. Args: {from, to}",
    access: "write",
    input: z.object({ from: pathArg, to: pathArg }),
    execute: (ctx, args) => {
      ctx.setState("editing");
      const result = ctx.workspace.rename(args.from, args.to);
      emit(ctx.runId, "file.deleted", { path: result.from });
      emit(ctx.runId, "file.created", { path: result.to });
      return { output: `Renamed ${result.from} → ${result.to}` };
    },
  }),
  defineTool({
    name: "install_dependencies",
    description:
      "Install dependencies. Args: {packages?: string[], dev?: boolean} — omit packages to install package.json",
    access: "exec",
    input: z.object({
      packages: z.array(z.string().max(120)).max(20).optional(),
      dev: z.boolean().optional(),
    }),
    execute: async (ctx, args) => {
      ctx.setState("installing");
      if (args.packages?.length) {
        const invalid = args.packages.filter((name) => !PACKAGE_SPEC.test(name));
        if (invalid.length) throw new Error(`Invalid package name(s): ${invalid.join(", ")}`);
        const result = await runCommand(
          addCommand(ctx.packageManager, args.packages, args.dev ?? false),
          {
            cwd: ctx.workspace.root,
            timeoutMs: serverEnv().INSTALL_TIMEOUT_MS,
            signal: ctx.signal,
          },
        );
        return { output: clip(formatCommandResult(result)), ok: result.ok };
      }
      const outcome = await runProjectCommand(ctx.workspace.root, "install", {
        packageManager: ctx.packageManager,
        signal: ctx.signal,
      });
      return { output: clip(describeOutcome(outcome)), ok: outcome.skipped || outcome.result.ok };
    },
  }),
  defineTool({
    name: "run_command",
    description:
      "Run one command in the project (no shell; allowed: bun, npm, pnpm, yarn, npx, node, git, tsc, vite, eslint, prettier, vitest). Args: {command}",
    access: "exec",
    input: z.object({ command: z.string().min(1).max(2000) }),
    execute: async (ctx, args) => {
      ctx.setState("testing");
      const result = await runCommand(args.command, {
        cwd: ctx.workspace.root,
        timeoutMs: serverEnv().COMMAND_TIMEOUT_MS,
        signal: ctx.signal,
      });
      return { output: clip(formatCommandResult(result)), ok: result.ok };
    },
  }),
  defineTool({
    name: "run_typecheck",
    description: "Run the TypeScript type checker. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: (ctx) => projectCommandTool(ctx, "typecheck", "testing"),
  }),
  defineTool({
    name: "run_lint",
    description: "Run the project's lint script. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: (ctx) => projectCommandTool(ctx, "lint", "testing"),
  }),
  defineTool({
    name: "run_tests",
    description: "Run the project's test script. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: (ctx) => projectCommandTool(ctx, "test", "testing"),
  }),
  defineTool({
    name: "run_build",
    description: "Run the production build. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: (ctx) => projectCommandTool(ctx, "build", "building"),
  }),
  defineTool({
    name: "start_preview",
    description: "Start the live preview dev server. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: async (ctx) => {
      ctx.setState("starting_preview");
      const info = await startPreview(ctx.projectId, {
        packageManager: ctx.packageManager,
        signal: ctx.signal,
      });
      return {
        output: `Preview ${info.status}${info.url ? ` at ${info.url}` : ""}${info.error ? `: ${info.error}` : ""}`,
        ok: info.status === "ready",
      };
    },
  }),
  defineTool({
    name: "restart_preview",
    description: "Restart the live preview dev server. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: async (ctx) => {
      ctx.setState("starting_preview");
      const info = await restartPreview(ctx.projectId, {
        packageManager: ctx.packageManager,
        signal: ctx.signal,
      });
      return {
        output: `Preview ${info.status}${info.error ? `: ${info.error}` : ""}`,
        ok: info.status === "ready",
      };
    },
  }),
  defineTool({
    name: "stop_preview",
    description: "Stop the live preview. Args: {}",
    access: "exec",
    input: z.object({}).passthrough(),
    execute: async (ctx) => {
      await stopPreview(ctx.projectId);
      return { output: "Preview stopped." };
    },
  }),
  defineTool({
    name: "read_preview_logs",
    description: "Read recent dev-server output (runtime/compile errors). Args: {lines?}",
    access: "read",
    input: z.object({ lines: z.number().int().min(1).max(400).optional() }),
    execute: (ctx, args) => {
      const info = getPreview(ctx.projectId);
      const lines = previewLogs(ctx.projectId, args.lines ?? 120);
      return { output: `Preview status: ${info.status}\n${lines.join("\n") || "(no output yet)"}` };
    },
  }),
  defineTool({
    name: "git_status",
    description: "Show the project's git status. Args: {}",
    access: "read",
    input: z.object({}).passthrough(),
    execute: async (ctx) => {
      const status = await workspaceGitStatus(ctx.workspace.root);
      if (!status.initialized) return { output: "This project is not a git repository." };
      const lines = status.entries.map((entry) => `${entry.index}${entry.worktree} ${entry.path}`);
      return {
        output: `On branch ${status.branch ?? "(detached)"}\n${lines.join("\n") || "clean"}`,
      };
    },
  }),
  defineTool({
    name: "git_diff",
    description: "Show uncommitted changes. Args: {path?}",
    access: "read",
    input: z.object({ path: z.string().max(400).optional() }),
    execute: async (ctx, args) => ({
      output: clip((await workspaceGitDiff(ctx.workspace.root, args.path)) || "No changes."),
    }),
  }),
  defineTool({
    name: "git_log",
    description: "Show recent commits. Args: {}",
    access: "read",
    input: z.object({}).passthrough(),
    execute: async (ctx) => {
      const entries = await workspaceGitLog(ctx.workspace.root, 20);
      return {
        output: entries.map((entry) => `${entry.sha} ${entry.subject}`).join("\n") || "No commits.",
      };
    },
  }),
];

const BY_NAME = new Map(TOOLS.map((tool) => [tool.name, tool]));

export function toolCatalog(mode: AgentMode): string {
  return TOOLS.filter((tool) => mode === "build" || tool.access === "read")
    .map((tool) => `- ${tool.name}: ${tool.description}`)
    .join("\n");
}

export type ExecutedTool = {
  name: string;
  args: Record<string, unknown>;
  ok: boolean;
  output: string;
  durationMs: number;
};

/** Summarize arguments for logs and the activity feed (never full file bodies). */
export function displayArgs(args: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(args)) {
    if (typeof value === "string" && (key === "content" || key === "patch")) {
      out[key] = `${value.split("\n").length} lines`;
    } else {
      out[key] = value;
    }
  }
  return out;
}

export async function executeTool(
  ctx: ToolContext,
  name: string,
  rawArgs: Record<string, unknown>,
): Promise<ExecutedTool> {
  const started = Date.now();
  const tool = BY_NAME.get(name);
  const shownArgs = displayArgs(rawArgs);
  const callId = toolCallsRepo.start(ctx.runId, name, shownArgs);
  emit(ctx.runId, "tool.started", { id: callId, name, args: shownArgs });

  const finish = (ok: boolean, output: string, error: string | null): ExecutedTool => {
    const durationMs = Date.now() - started;
    toolCallsRepo.finish(callId, {
      status: ok ? "succeeded" : "failed",
      output: output.slice(0, 20_000),
      error,
      durationMs,
    });
    emit(ctx.runId, "tool.completed", {
      id: callId,
      name,
      ok,
      durationMs,
      output: output.slice(0, 6000),
      error,
    });
    log.info("tool.call", { runId: ctx.runId, tool: name, ok, durationMs });
    return { name, args: rawArgs, ok, output, durationMs };
  };

  if (!tool) return finish(false, `Unknown tool "${name}".`, `Unknown tool "${name}"`);
  if (ctx.mode === "plan" && tool.access !== "read") {
    const message = `${name} is not available in Plan mode — Plan mode cannot modify the project.`;
    return finish(false, message, message);
  }
  const parsed = tool.input.safeParse(rawArgs);
  if (!parsed.success) {
    const message = `Invalid arguments for ${name}: ${parsed.error.issues
      .map((issue: z.ZodIssue) => `${issue.path.join(".") || "args"} ${issue.message}`)
      .join("; ")}`;
    return finish(false, message, message);
  }
  try {
    const result = await tool.execute(ctx, parsed.data);
    const ok = result.ok ?? true;
    return finish(ok, result.output, ok ? null : "Command reported failure");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return finish(false, `ERROR: ${message}`, message);
  }
}

export function getPackageManagerFor(root: string, fallback: PackageManager): PackageManager {
  try {
    return frameworkInfo(root, fallback).packageManager;
  } catch {
    return fallback;
  }
}
