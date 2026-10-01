/**
 * AgentRuntime — executes Pulse runs in the background and reports every step
 * as a persisted AgentEvent.
 *
 *   agent run:  checkpoint manual edits → context → model ⇄ tools loop →
 *               install → typecheck → build → bounded repair → lint →
 *               preview → checkpoint → summary
 *   setup run:  install → preview (templates and imports, no model involved)
 *
 * One mutating run per project at a time (in-process lock); different
 * projects run concurrently. Cancelling aborts the model stream, any running
 * command and preview start.
 */
import { serverEnv } from "../config/env.server";
import {
  TERMINAL_STATES,
  type AgentMode,
  type AgentState,
  type Attachment,
  type FileChangeSummary,
} from "../domain/types";
import { logger } from "../log.server";
import {
  conversationsRepo,
  messagesRepo,
  projectsRepo,
  runsRepo,
  versionsRepo,
  type ProjectRecord,
} from "../persistence/repositories.server";
import { getPreview, restartPreview, startPreview } from "../preview/preview-manager.server";
import { createCheckpoint, pendingChanges } from "../versions/checkpoints.server";
import { frameworkInfo, needsInstall } from "../workspace/project-commands.server";
import { workspaceFor, type Workspace } from "../workspace/workspace-manager.server";
import { resolveFallbackProvider, resolveProvider } from "../ai/registry.server";
import type { AIProvider, ChatTurn } from "../ai/types";
import { buildRunContext, filesFromErrors } from "./context.server";
import { closeChannel, emit } from "./event-bus.server";
import { parseAgentOutput, visibleProse } from "./protocol";
import { buildSystemPrompt } from "./system-prompt.server";
import {
  executeTool,
  getPackageManagerFor,
  type ExecutedTool,
  type ToolContext,
} from "./tools.server";

const log = logger("agent");

export class ProjectBusyError extends Error {
  constructor() {
    super(
      "Pulse is already working on this project. Wait for the current run to finish or stop it.",
    );
    this.name = "ProjectBusyError";
  }
}

class CancelledError extends Error {
  constructor() {
    super("Run cancelled.");
    this.name = "CancelledError";
  }
}

type ActiveRun = { runId: string; controller: AbortController };
type RuntimeState = { active: Map<string, ActiveRun> };
const KEY = Symbol.for("pulseui.agent-runtime");

function runtime(): RuntimeState {
  const store = globalThis as unknown as Record<symbol, RuntimeState | undefined>;
  store[KEY] ??= { active: new Map() };
  return store[KEY];
}

function acquire(projectId: string): AbortController {
  const state = runtime();
  if (state.active.has(projectId) || runsRepo.active(projectId)) throw new ProjectBusyError();
  const controller = new AbortController();
  state.active.set(projectId, { runId: "", controller });
  return controller;
}

function release(projectId: string): void {
  runtime().active.delete(projectId);
}

export function cancelRun(runId: string): boolean {
  for (const [projectId, active] of runtime().active) {
    if (active.runId === runId) {
      active.controller.abort();
      log.info("run.cancel", { runId, projectId });
      return true;
    }
  }
  // Stale DB state with no live process (e.g. after a crash): close it out.
  const run = runsRepo.get(runId);
  if (run && !TERMINAL_STATES.has(run.state)) {
    runsRepo.update(runId, { state: "cancelled", finished: true, error: "Cancelled." });
    emit(runId, "agent.cancelled", {});
    closeChannel(runId);
    return true;
  }
  return false;
}

export function activeRunId(projectId: string): string | null {
  return runtime().active.get(projectId)?.runId || runsRepo.active(projectId)?.id || null;
}

function shortLabel(prompt: string): string {
  const firstLine = prompt.trim().split("\n")[0] ?? "";
  return firstLine.length > 80 ? `${firstLine.slice(0, 77)}…` : firstLine || "Pulse changes";
}

const isEmpty = (changes: FileChangeSummary) =>
  changes.added.length + changes.changed.length + changes.removed.length === 0;

/* ------------------------------------------------------------------ *
 * Public entry points
 * ------------------------------------------------------------------ */

export type StartAgentRunInput = {
  projectId: string;
  prompt: string;
  mode: AgentMode;
  modelId?: string | null;
  attachments?: Attachment[];
};

export async function startAgentRun(
  input: StartAgentRunInput,
): Promise<{ runId: string; messageId: string }> {
  const project = projectsRepo.get(input.projectId);
  if (!project) throw new Error("Project not found.");

  const provider = await resolveProvider(input.modelId ?? project.settings.model ?? null);
  const controller = acquire(project.id);
  try {
    const conversation = conversationsRepo.primary(project.id);
    const userMessage = messagesRepo.add({
      conversationId: conversation.id,
      projectId: project.id,
      role: "user",
      content: input.prompt,
      attachments: input.attachments ?? [],
      metadata: { mode: input.mode, model: `${provider.label} · ${provider.model}` },
    });
    const run = runsRepo.create({
      projectId: project.id,
      conversationId: conversation.id,
      kind: "agent",
      mode: input.mode,
      provider: provider.id,
      model: provider.model,
    });
    messagesRepo.setRun(userMessage.id, run.id);
    const active = runtime().active.get(project.id);
    if (active) active.runId = run.id;
    projectsRepo.update(project.id, { status: "running" });

    log.info("run.start", {
      runId: run.id,
      projectId: project.id,
      mode: input.mode,
      provider: provider.id,
    });
    void executeAgentRun({
      runId: run.id,
      project,
      provider,
      prompt: input.prompt,
      mode: input.mode,
      attachments: input.attachments ?? [],
      conversationId: conversation.id,
      userMessageId: userMessage.id,
      controller,
    });
    return { runId: run.id, messageId: userMessage.id };
  } catch (error) {
    release(project.id);
    throw error;
  }
}

export function startSetupRun(projectId: string, label: string): { runId: string } {
  const project = projectsRepo.get(projectId);
  if (!project) throw new Error("Project not found.");
  const controller = acquire(project.id);
  const conversation = conversationsRepo.primary(project.id);
  const run = runsRepo.create({
    projectId: project.id,
    conversationId: conversation.id,
    kind: "setup",
    mode: "build",
  });
  const active = runtime().active.get(project.id);
  if (active) active.runId = run.id;
  projectsRepo.update(project.id, { status: "running" });
  void executeSetupRun(run.id, project, label, controller);
  return { runId: run.id };
}

/* ------------------------------------------------------------------ *
 * Shared helpers
 * ------------------------------------------------------------------ */

function makeToolContext(
  runId: string,
  project: ProjectRecord,
  workspace: Workspace,
  mode: AgentMode,
  signal: AbortSignal,
  seen: Iterable<string>,
): ToolContext {
  let current: AgentState = "queued";
  return {
    runId,
    projectId: project.id,
    workspace,
    mode,
    packageManager: getPackageManagerFor(workspace.root, project.packageManager),
    signal,
    seenFiles: new Set(seen),
    setState: (state) => {
      if (state === current) return;
      current = state;
      runsRepo.update(runId, { state });
      emit(runId, "agent.state", { state });
    },
  };
}

async function launchPreview(ctx: ToolContext, restart: boolean): Promise<boolean> {
  ctx.setState("starting_preview");
  emit(ctx.runId, "preview.starting", {});
  const options = { packageManager: ctx.packageManager, signal: ctx.signal };
  const info = restart
    ? await restartPreview(ctx.projectId, options)
    : await startPreview(ctx.projectId, options);
  if (info.status === "ready") {
    projectsRepo.update(ctx.projectId, { previewPort: info.port });
    emit(ctx.runId, "preview.ready", { url: info.url, port: info.port });
    return true;
  }
  emit(ctx.runId, "preview.failed", { error: info.error ?? "Preview did not start." });
  return false;
}

/* ------------------------------------------------------------------ *
 * Model ⇄ tools loop
 * ------------------------------------------------------------------ */

type LoopOutcome = {
  done: string | null;
  prose: string[];
  actionsRun: number;
  stepLimitHit: boolean;
};

function compactHistory(messages: ChatTurn[]): ChatTurn[] {
  const resultIndexes = messages
    .map((turn, index) =>
      turn.role === "user" && turn.content.startsWith("<tool_results>") ? index : -1,
    )
    .filter((index) => index >= 0);
  const keep = new Set(resultIndexes.slice(-2));
  return messages.map((turn, index) =>
    resultIndexes.includes(index) && !keep.has(index) && turn.content.length > 1500
      ? {
          ...turn,
          content: `${turn.content.slice(0, 1500)}\n… [older tool output omitted]\n</tool_results>`,
        }
      : turn,
  );
}

function formatResults(results: ExecutedTool[], parseErrors: string[]): string {
  const blocks = results.map((result) => {
    const args = JSON.stringify(
      Object.fromEntries(
        Object.entries(result.args).map(([key, value]) => [
          key,
          typeof value === "string" && value.length > 120
            ? `${value.split("\n").length} lines`
            : value,
        ]),
      ),
    );
    return `### ${result.name} ${args} — ${result.ok ? "OK" : "FAILED"}\n${result.output}`;
  });
  for (const error of parseErrors) blocks.push(`### protocol error\n${error}`);
  return `<tool_results>\n${blocks.join("\n\n")}\n</tool_results>`;
}

async function streamTurn(
  runId: string,
  provider: AIProvider,
  messages: ChatTurn[],
  signal: AbortSignal,
): Promise<string> {
  let raw = "";
  let shown = 0;
  for await (const delta of provider.stream({ messages: compactHistory(messages), signal })) {
    if (signal.aborted) throw new CancelledError();
    raw += delta;
    const visible = visibleProse(raw);
    if (visible.length > shown) {
      emit(runId, "agent.delta", { text: visible.slice(shown) });
      shown = visible.length;
    }
  }
  if (signal.aborted) throw new CancelledError();
  return raw;
}

async function agentLoop(
  ctx: ToolContext,
  providerRef: { current: AIProvider },
  messages: ChatTurn[],
  maxSteps: number,
): Promise<LoopOutcome> {
  const prose: string[] = [];
  let actionsRun = 0;

  for (let step = 0; step < maxSteps; step += 1) {
    if (ctx.signal.aborted) throw new CancelledError();
    if (step === 0) ctx.setState("planning");

    let raw: string;
    try {
      raw = await streamTurn(ctx.runId, providerRef.current, messages, ctx.signal);
    } catch (error) {
      if (ctx.signal.aborted) throw new CancelledError();
      const fallback = resolveFallbackProvider(providerRef.current.id);
      if (!fallback || step > 0) throw error;
      emit(ctx.runId, "agent.message", {
        level: "warning",
        text: `${providerRef.current.label} failed (${error instanceof Error ? error.message : String(error)}). Falling back to ${fallback.label} · ${fallback.model}.`,
      });
      providerRef.current = fallback;
      runsRepo.update(ctx.runId, { provider: fallback.id, model: fallback.model });
      raw = await streamTurn(ctx.runId, fallback, messages, ctx.signal);
    }

    const parsed = parseAgentOutput(raw);
    messages.push({ role: "assistant", content: raw });
    if (parsed.prose) prose.push(parsed.prose);
    if (parsed.plan) emit(ctx.runId, "agent.plan", { text: parsed.plan });

    const results: ExecutedTool[] = [];
    for (const action of parsed.actions) {
      if (ctx.signal.aborted) throw new CancelledError();
      results.push(await executeTool(ctx, action.tool, action.args));
      actionsRun += 1;
    }

    const failures = results.filter((result) => !result.ok);
    if (parsed.done !== null && !failures.length && !parsed.errors.length) {
      return { done: parsed.done, prose, actionsRun, stepLimitHit: false };
    }
    if (!parsed.actions.length && !parsed.errors.length) {
      // Plain answer with no tools: treat it as the final reply.
      return { done: parsed.done ?? parsed.prose, prose, actionsRun, stepLimitHit: false };
    }

    const nudge =
      failures.length || parsed.errors.length
        ? "Some actions failed. Fix them (re-read files if needed), then continue."
        : "Continue. When the change is complete, reply with <done>summary</done>.";
    messages.push({ role: "user", content: `${formatResults(results, parsed.errors)}\n${nudge}` });
  }
  return { done: null, prose, actionsRun, stepLimitHit: true };
}

/* ------------------------------------------------------------------ *
 * Validation & repair
 * ------------------------------------------------------------------ */

type ValidationResult = {
  ok: boolean;
  failedOutput: string;
  installed: boolean;
  skippedAll: boolean;
};

async function validate(
  ctx: ToolContext,
  project: ProjectRecord,
  forceInstall: boolean,
): Promise<ValidationResult> {
  let installed = false;
  if (forceInstall || needsInstall(ctx.workspace.root)) {
    const install = await executeTool(ctx, "install_dependencies", {});
    installed = true;
    if (!install.ok)
      return { ok: false, failedOutput: install.output, installed, skippedAll: false };
  }
  const info = frameworkInfo(ctx.workspace.root, ctx.packageManager);
  if (project.settings.runTypecheck && info.typecheckCommand) {
    const typecheck = await executeTool(ctx, "run_typecheck", {});
    if (!typecheck.ok)
      return { ok: false, failedOutput: typecheck.output, installed, skippedAll: false };
  }
  if (info.buildCommand) {
    const build = await executeTool(ctx, "run_build", {});
    if (!build.ok) return { ok: false, failedOutput: build.output, installed, skippedAll: false };
  }
  if (project.settings.runLint && info.lintCommand) {
    // Lint findings are reported but do not block the run.
    await executeTool(ctx, "run_lint", {});
  }
  return {
    ok: true,
    failedOutput: "",
    installed,
    skippedAll: !info.buildCommand && !(project.settings.runTypecheck && info.typecheckCommand),
  };
}

function repairMessage(
  ctx: ToolContext,
  failedOutput: string,
  attempt: number,
  max: number,
): string {
  const files = filesFromErrors(failedOutput, ctx.workspace.listFiles());
  const sources = files
    .map((file) => {
      try {
        const content = ctx.workspace.readFile(file);
        ctx.seenFiles.add(file);
        return `=== ${file} ===\n${content.length > 12_000 ? `${content.slice(0, 12_000)}\n… [truncated]` : content}`;
      } catch {
        return "";
      }
    })
    .filter(Boolean);
  return [
    `## Build failed (repair attempt ${attempt} of ${max})`,
    "The project's real validation command failed with this output:",
    failedOutput.slice(-7000),
    sources.length ? `## Relevant files (current content)\n${sources.join("\n\n")}` : "",
    "Fix the root cause with <patch> (or <write> for a full rewrite), then reply <done>. Do not change unrelated code.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

/* ------------------------------------------------------------------ *
 * Agent run
 * ------------------------------------------------------------------ */

type ExecuteInput = {
  runId: string;
  project: ProjectRecord;
  provider: AIProvider;
  prompt: string;
  mode: AgentMode;
  attachments: Attachment[];
  conversationId: string;
  userMessageId: string;
  controller: AbortController;
};

async function executeAgentRun(input: ExecuteInput): Promise<void> {
  const { runId, project, mode, controller } = input;
  const signal = controller.signal;
  const workspace = workspaceFor(project.id);
  const env = serverEnv();
  const providerRef = { current: input.provider };
  let changes: FileChangeSummary = { added: [], changed: [], removed: [] };
  let ctx: ToolContext | null = null;

  emit(runId, "agent.started", {
    mode,
    provider: input.provider.label,
    model: input.provider.model,
  });

  try {
    if (mode === "build") {
      const manual = await createCheckpoint({
        projectId: project.id,
        label: "Manual edits",
        status: "manual",
      });
      if (manual)
        emit(runId, "version.created", {
          id: manual.id,
          number: manual.number,
          label: manual.label,
        });
    }

    const info = frameworkInfo(workspace.root, project.packageManager);
    const history = messagesRepo
      .list(input.conversationId)
      .filter((message) => message.id !== input.userMessageId);
    const visionSupported = input.provider.supportsVision();
    const images = input.attachments.filter(
      (attachment) => attachment.kind === "image" && attachment.data,
    );
    if (images.length && !visionSupported) {
      emit(runId, "agent.message", {
        level: "warning",
        text: `${input.provider.model} cannot view images, so ${images.length} attached image(s) were not sent to the model.`,
      });
    }

    const context = buildRunContext({
      project,
      info,
      workspace,
      history,
      latestVersion: versionsRepo.latest(project.id),
      request: input.prompt,
      mode,
      attachments: input.attachments,
      visionSupported,
    });

    ctx = makeToolContext(runId, project, workspace, mode, signal, context.seen);
    const messages: ChatTurn[] = [
      { role: "system", content: buildSystemPrompt(mode) },
      {
        role: "user",
        content: context.text,
        ...(visionSupported && images.length
          ? {
              images: images.map((image) => ({ mimeType: image.mimeType, data: image.data ?? "" })),
            }
          : {}),
      },
    ];

    const outcome = await agentLoop(ctx, providerRef, messages, env.AGENT_MAX_STEPS);
    let summary = outcome.done ?? outcome.prose.at(-1) ?? "";
    if (outcome.stepLimitHit) {
      summary =
        `${summary}\n\nStopped after ${env.AGENT_MAX_STEPS} steps without finishing. Ask Pulse to continue.`.trim();
    }

    if (mode === "plan") {
      finish(runId, project.id, input.conversationId, {
        state: "completed",
        summary: [
          ...outcome.prose,
          outcome.done && !outcome.prose.includes(outcome.done) ? outcome.done : "",
        ]
          .filter(Boolean)
          .join("\n\n"),
        changes,
        model: providerRef.current,
        mode,
      });
      return;
    }

    changes = await pendingChanges(project.id);
    let buildOk = true;
    let buildError: string | null = null;
    let installed = false;

    if (!isEmpty(changes) || needsInstall(workspace.root)) {
      let result = await validate(ctx, project, false);
      installed = result.installed;
      const maxRepairs = Math.min(
        project.settings.autoRepairAttempts,
        env.AGENT_MAX_REPAIR_ATTEMPTS,
      );
      for (let attempt = 1; !result.ok && attempt <= maxRepairs; attempt += 1) {
        if (signal.aborted) throw new CancelledError();
        ctx.setState("repairing");
        emit(runId, "agent.message", {
          level: "info",
          text: `Build failed — repair attempt ${attempt} of ${maxRepairs}.`,
        });
        messages.push({
          role: "user",
          content: repairMessage(ctx, result.failedOutput, attempt, maxRepairs),
        });
        await agentLoop(ctx, providerRef, messages, 6);
        result = await validate(ctx, project, false);
        installed ||= result.installed;
      }
      buildOk = result.ok;
      if (!result.ok) buildError = result.failedOutput.slice(-4000);
      changes = await pendingChanges(project.id);
    }

    if (project.settings.autoStartPreview && !isEmpty(changes)) {
      const preview = getPreview(project.id);
      await launchPreview(ctx, installed && preview.status === "ready");
    } else if (project.settings.autoStartPreview && getPreview(project.id).status !== "ready") {
      await launchPreview(ctx, false);
    }

    if (!isEmpty(changes)) {
      const version = await createCheckpoint({
        projectId: project.id,
        label: shortLabel(input.prompt),
        prompt: input.prompt,
        runId,
        status: buildOk ? "ok" : "build_failed",
      });
      if (version)
        emit(runId, "version.created", {
          id: version.id,
          number: version.number,
          label: version.label,
        });
    }

    if (!buildOk) {
      finish(runId, project.id, input.conversationId, {
        state: "failed",
        summary: `${summary}\n\nThe build is still failing after automatic repair attempts. See the build output below or ask Pulse to fix it.`,
        error: buildError ?? "Build failed",
        changes,
        model: providerRef.current,
        mode,
      });
      return;
    }

    finish(runId, project.id, input.conversationId, {
      state: "completed",
      summary: summary || (isEmpty(changes) ? "No files were changed." : "Done."),
      changes,
      model: providerRef.current,
      mode,
    });
  } catch (error) {
    const cancelled = error instanceof CancelledError || signal.aborted;
    if (!isEmpty(changes) || mode === "build") {
      try {
        changes = await pendingChanges(project.id);
        if (!isEmpty(changes)) {
          const version = await createCheckpoint({
            projectId: project.id,
            label: `${cancelled ? "Cancelled" : "Interrupted"}: ${shortLabel(input.prompt)}`,
            prompt: input.prompt,
            runId,
            status: "build_failed",
          });
          if (version)
            emit(runId, "version.created", {
              id: version.id,
              number: version.number,
              label: version.label,
            });
        }
      } catch {
        // Best effort.
      }
    }
    const message = error instanceof Error ? error.message : String(error);
    log.warn("run.error", { runId, cancelled, error: message });
    finish(runId, project.id, input.conversationId, {
      state: cancelled ? "cancelled" : "failed",
      summary: cancelled ? "Stopped." : `Pulse stopped: ${message}`,
      error: cancelled ? null : message,
      changes,
      model: providerRef.current,
      mode,
    });
  }
}

function finish(
  runId: string,
  projectId: string,
  conversationId: string,
  result: {
    state: "completed" | "failed" | "cancelled";
    summary: string;
    error?: string | null;
    changes: FileChangeSummary;
    model: AIProvider | null;
    mode: AgentMode;
  },
): void {
  runsRepo.update(runId, {
    state: result.state,
    summary: result.summary,
    error: result.error ?? null,
    filesChanged: result.changes,
    finished: true,
  });
  messagesRepo.add({
    conversationId,
    projectId,
    role: "assistant",
    content: result.summary,
    runId,
    metadata: {
      filesChanged: result.changes,
      mode: result.mode,
      ...(result.model ? { model: `${result.model.label} · ${result.model.model}` } : {}),
    },
  });
  emit(
    runId,
    result.state === "completed"
      ? "agent.completed"
      : result.state === "cancelled"
        ? "agent.cancelled"
        : "agent.failed",
    {
      summary: result.summary,
      error: result.error ?? null,
      filesChanged: result.changes,
    },
  );
  emit(runId, "agent.state", { state: result.state });
  projectsRepo.update(projectId, { status: result.state === "failed" ? "error" : "idle" });
  release(projectId);
  closeChannel(runId);
  log.info("run.finish", { runId, projectId, state: result.state });
}

/* ------------------------------------------------------------------ *
 * Setup run (template / import): install + preview, no model
 * ------------------------------------------------------------------ */

async function executeSetupRun(
  runId: string,
  project: ProjectRecord,
  label: string,
  controller: AbortController,
): Promise<void> {
  const workspace = workspaceFor(project.id);
  const conversationId = conversationsRepo.primary(project.id).id;
  emit(runId, "agent.started", { mode: "setup", label });
  const ctx = makeToolContext(runId, project, workspace, "build", controller.signal, []);
  try {
    if (needsInstall(workspace.root)) {
      const install = await executeTool(ctx, "install_dependencies", {});
      if (!install.ok)
        throw new Error("Dependency installation failed. See the install output for details.");
    }
    if (controller.signal.aborted) throw new CancelledError();
    const ready = await launchPreview(ctx, false);
    finish(runId, project.id, conversationId, {
      state: ready ? "completed" : "failed",
      summary: ready
        ? `${label} is ready. Describe what you want to change and Pulse will edit it.`
        : `${label} was created, but the preview did not start. Check the preview logs.`,
      error: ready ? null : getPreview(project.id).error,
      changes: { added: [], changed: [], removed: [] },
      model: null,
      mode: "build",
    });
  } catch (error) {
    const cancelled = error instanceof CancelledError || controller.signal.aborted;
    finish(runId, project.id, conversationId, {
      state: cancelled ? "cancelled" : "failed",
      summary: cancelled
        ? "Setup stopped."
        : `Setup failed: ${error instanceof Error ? error.message : String(error)}`,
      error: cancelled ? null : error instanceof Error ? error.message : String(error),
      changes: { added: [], changed: [], removed: [] },
      model: null,
      mode: "build",
    });
  }
}
