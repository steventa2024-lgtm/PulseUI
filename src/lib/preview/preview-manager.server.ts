/**
 * PreviewManager runs each project's real dev server as an isolated child
 * process (own process group, scrubbed env, workspace cwd), allocates a port,
 * waits until it answers HTTP, keeps a log ring buffer and cleans up on exit.
 *
 * The browser loads the preview from its own origin (a different port), so the
 * generated app never shares an origin, cookies or storage with PulseUI.
 */
import type { ChildProcess } from "node:child_process";
import net from "node:net";

import { killTree, spawnInWorkspace } from "../commands/command-runner.server";
import { validateArgv } from "../commands/command-policy";
import { serverEnv } from "../config/env.server";
import type { PackageManager, PreviewStatus } from "../domain/types";
import { logger } from "../log.server";
import {
  frameworkInfo,
  needsInstall,
  runProjectCommand,
} from "../workspace/project-commands.server";
import { workspaceRootFor } from "../workspace/workspace-manager.server";

const log = logger("preview");
const MAX_LOG_LINES = 1500;
// Built from a string so the ESC control character is not a regex literal.
const ANSI_ESCAPE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*[A-Za-z]`, "g");

export type PreviewInfo = {
  status: PreviewStatus;
  port: number | null;
  url: string | null;
  error: string | null;
  startedAt: string | null;
  command: string | null;
};

type LogListener = (line: string) => void;
type StatusListener = (info: PreviewInfo) => void;

type PreviewEntry = {
  projectId: string;
  child: ChildProcess | null;
  port: number | null;
  status: PreviewStatus;
  error: string | null;
  startedAt: string | null;
  command: string | null;
  logs: string[];
  logListeners: Set<LogListener>;
  statusListeners: Set<StatusListener>;
  starting: Promise<PreviewInfo> | null;
};

type Registry = { entries: Map<string, PreviewEntry>; hooked: boolean };
const KEY = Symbol.for("pulseui.preview");

function registry(): Registry {
  const store = globalThis as unknown as Record<symbol, Registry | undefined>;
  let current = store[KEY];
  if (!current) {
    current = { entries: new Map(), hooked: false };
    store[KEY] = current;
  }
  if (!current.hooked) {
    current.hooked = true;
    const shutdown = () => {
      for (const entry of current?.entries.values() ?? []) {
        if (entry.child) killTree(entry.child, "SIGKILL");
      }
    };
    process.once("exit", shutdown);
    for (const signal of ["SIGINT", "SIGTERM"] as const) {
      process.once(signal, () => {
        shutdown();
        process.exit(0);
      });
    }
  }
  return current;
}

function entryFor(projectId: string): PreviewEntry {
  const entries = registry().entries;
  let entry = entries.get(projectId);
  if (!entry) {
    entry = {
      projectId,
      child: null,
      port: null,
      status: "stopped",
      error: null,
      startedAt: null,
      command: null,
      logs: [],
      logListeners: new Set(),
      statusListeners: new Set(),
      starting: null,
    };
    entries.set(projectId, entry);
  }
  return entry;
}

export function previewUrl(port: number): string {
  const host = serverEnv().PREVIEW_PUBLIC_HOST ?? "localhost";
  return `http://${host}:${port}/`;
}

function snapshot(entry: PreviewEntry): PreviewInfo {
  return {
    status: entry.status,
    port: entry.port,
    url: entry.port && entry.status === "ready" ? previewUrl(entry.port) : null,
    error: entry.error,
    startedAt: entry.startedAt,
    command: entry.command,
  };
}

function setStatus(entry: PreviewEntry, status: PreviewStatus, error: string | null = null) {
  entry.status = status;
  entry.error = error;
  const info = snapshot(entry);
  for (const listener of entry.statusListeners) listener(info);
}

function pushLog(entry: PreviewEntry, text: string) {
  for (const raw of text.split(/\r?\n/)) {
    // Strip ANSI escapes; dev servers colour their output even with NO_COLOR sometimes.
    const line = raw.replace(ANSI_ESCAPE, "");
    if (!line.trim()) continue;
    entry.logs.push(line);
    if (entry.logs.length > MAX_LOG_LINES) entry.logs.splice(0, entry.logs.length - MAX_LOG_LINES);
    for (const listener of entry.logListeners) listener(line);
  }
}

function portFree(port: number, host: string): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => server.close(() => resolve(true)));
    server.listen(port, host);
  });
}

async function allocatePort(preferred: number | null): Promise<number> {
  const env = serverEnv();
  const host = env.PREVIEW_HOST ?? "127.0.0.1";
  const used = new Set(
    [...registry().entries.values()].filter((entry) => entry.child).map((entry) => entry.port),
  );
  if (preferred && !used.has(preferred) && (await portFree(preferred, host))) return preferred;
  for (let port = env.PREVIEW_PORT_START; port <= env.PREVIEW_PORT_END; port += 1) {
    if (used.has(port)) continue;
    if (await portFree(port, host)) return port;
  }
  throw new Error(
    "No free preview port available. Stop another preview or widen PREVIEW_PORT_START/END.",
  );
}

async function waitForHttp(entry: PreviewEntry, port: number, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!entry.child || entry.child.exitCode !== null) {
      throw new Error("The dev server exited before it became ready.");
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(`http://127.0.0.1:${port}/`, { signal: controller.signal });
      clearTimeout(timer);
      await response.body?.cancel().catch(() => undefined);
      if (response.status < 500) return;
    } catch {
      // Not listening yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`The dev server did not respond within ${Math.round(timeoutMs / 1000)}s.`);
}

export type StartOptions = {
  packageManager?: PackageManager;
  preferredPort?: number | null;
  signal?: AbortSignal;
  onLog?: LogListener;
};

export function getPreview(projectId: string): PreviewInfo {
  return snapshot(entryFor(projectId));
}

export function previewLogs(projectId: string, tail = 300): string[] {
  return entryFor(projectId).logs.slice(-tail);
}

export function subscribePreview(
  projectId: string,
  listeners: { onLog?: LogListener; onStatus?: StatusListener },
): () => void {
  const entry = entryFor(projectId);
  if (listeners.onLog) entry.logListeners.add(listeners.onLog);
  if (listeners.onStatus) entry.statusListeners.add(listeners.onStatus);
  return () => {
    if (listeners.onLog) entry.logListeners.delete(listeners.onLog);
    if (listeners.onStatus) entry.statusListeners.delete(listeners.onStatus);
  };
}

export async function stopPreview(projectId: string): Promise<PreviewInfo> {
  const entry = entryFor(projectId);
  const child = entry.child;
  entry.child = null;
  if (child) {
    killTree(child, "SIGTERM");
    await new Promise<void>((resolve) => {
      const timer = setTimeout(() => {
        killTree(child, "SIGKILL");
        resolve();
      }, 3000);
      child.once("exit", () => {
        clearTimeout(timer);
        resolve();
      });
      if (child.exitCode !== null) {
        clearTimeout(timer);
        resolve();
      }
    });
    pushLog(entry, "[pulse] preview stopped");
  }
  setStatus(entry, "stopped");
  return snapshot(entry);
}

async function doStart(entry: PreviewEntry, options: StartOptions): Promise<PreviewInfo> {
  const root = workspaceRootFor(entry.projectId);
  const env = serverEnv();
  const detach = options.onLog
    ? subscribePreview(entry.projectId, { onLog: options.onLog })
    : () => {};
  try {
    if (needsInstall(root)) {
      setStatus(entry, "installing");
      pushLog(entry, "[pulse] installing dependencies…");
      const install = await runProjectCommand(root, "install", {
        ...(options.packageManager ? { packageManager: options.packageManager } : {}),
        ...(options.signal ? { signal: options.signal } : {}),
        onOutput: (chunk) => pushLog(entry, chunk),
      });
      if (!install.skipped && !install.result.ok) {
        throw new Error(`Dependency install failed (exit ${install.result.exitCode ?? "?"}).`);
      }
    }

    setStatus(entry, "starting");
    const info = frameworkInfo(root, options.packageManager);
    const host = env.PREVIEW_HOST ?? "127.0.0.1";
    const port = await allocatePort(options.preferredPort ?? entry.port);
    const argv = info.dev.argv(port, host);
    if (!argv.length)
      throw new Error("Could not determine how to run this project (no dev script or index.html).");
    validateArgv(argv);

    entry.port = port;
    entry.command = argv.join(" ");
    entry.startedAt = new Date().toISOString();
    pushLog(entry, `[pulse] $ ${entry.command}`);
    log.info("preview.start", { projectId: entry.projectId, port, command: entry.command });

    const child = spawnInWorkspace(argv, {
      cwd: root,
      env: { NODE_ENV: "development", ...(info.dev.env?.(port, host) ?? {}) },
    });
    entry.child = child;
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => pushLog(entry, chunk));
    child.stderr?.on("data", (chunk: string) => pushLog(entry, chunk));
    child.on("error", (error) => pushLog(entry, `[pulse] ${error.message}`));
    child.on("exit", (code, signal) => {
      if (entry.child !== child) return;
      entry.child = null;
      pushLog(
        entry,
        `[pulse] dev server exited (code ${code ?? "none"}${signal ? `, ${signal}` : ""})`,
      );
      setStatus(entry, "failed", `Dev server exited with code ${code ?? signal ?? "unknown"}.`);
    });

    await waitForHttp(entry, port, env.PREVIEW_READY_TIMEOUT_MS);
    setStatus(entry, "ready");
    log.info("preview.ready", { projectId: entry.projectId, port });
    return snapshot(entry);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (entry.child) {
      killTree(entry.child, "SIGKILL");
      entry.child = null;
    }
    pushLog(entry, `[pulse] preview failed: ${message}`);
    setStatus(entry, "failed", message);
    log.warn("preview.failed", { projectId: entry.projectId, error: message });
    return snapshot(entry);
  } finally {
    detach();
  }
}

export async function startPreview(
  projectId: string,
  options: StartOptions = {},
): Promise<PreviewInfo> {
  const entry = entryFor(projectId);
  if (entry.starting) return entry.starting;
  if (entry.child && entry.status === "ready") return snapshot(entry);
  if (entry.child) await stopPreview(projectId);
  entry.starting = doStart(entry, options).finally(() => {
    entry.starting = null;
  });
  return entry.starting;
}

export async function restartPreview(
  projectId: string,
  options: StartOptions = {},
): Promise<PreviewInfo> {
  if (entryFor(projectId).starting) await entryFor(projectId).starting;
  await stopPreview(projectId);
  return startPreview(projectId, options);
}

export async function stopAllPreviews(): Promise<void> {
  await Promise.all([...registry().entries.keys()].map((id) => stopPreview(id)));
}
