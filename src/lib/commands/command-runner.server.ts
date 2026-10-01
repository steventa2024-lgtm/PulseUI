/**
 * CommandRunner executes validated commands inside a project workspace.
 *
 * - no shell: argv goes straight to spawn()
 * - scrubbed environment: an allow-list of harmless variables; AI keys, GitHub
 *   tokens and every other PulseUI secret are simply never passed through
 * - own process group, so a timeout or cancel kills the whole tree
 * - timeout, abort signal, output capture with truncation
 *
 * This is process isolation, not a security sandbox. For multi-tenant hosting
 * run PulseUI's workspaces inside containers (see README, "Security model").
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { logger } from "../log.server";
import { STATIC_SERVER_EXECUTABLE, truncateOutput, validateCommand } from "./command-policy";

const log = logger("command");

const PASSTHROUGH_ENV = [
  "PATH",
  "HOME",
  "USER",
  "LANG",
  "LC_ALL",
  "TERM",
  "TMPDIR",
  "TMP",
  "TEMP",
  "SYSTEMROOT",
  "XDG_CACHE_HOME",
  "BUN_INSTALL",
  // Package installs need the network path the host uses.
  "HTTP_PROXY",
  "HTTPS_PROXY",
  "NO_PROXY",
  "http_proxy",
  "https_proxy",
  "no_proxy",
  "NODE_EXTRA_CA_CERTS",
  "SSL_CERT_FILE",
  "PLAYWRIGHT_BROWSERS_PATH",
];

export function sandboxEnv(extra: Record<string, string> = {}): Record<string, string> {
  const env: Record<string, string> = {};
  for (const key of PASSTHROUGH_ENV) {
    const value = process.env[key];
    if (value) env[key] = value;
  }
  // Make sure the runtime that is running PulseUI is reachable by child scripts.
  const runtimeDir = path.dirname(process.execPath);
  env["PATH"] = [runtimeDir, env["PATH"] ?? "/usr/local/bin:/usr/bin:/bin"].join(path.delimiter);
  Object.assign(env, {
    CI: "1",
    FORCE_COLOR: "0",
    NO_COLOR: "1",
    BROWSER: "none",
    npm_config_update_notifier: "false",
    npm_config_fund: "false",
    npm_config_audit: "false",
    ...extra,
  });
  return env;
}

export type CommandResult = {
  command: string;
  exitCode: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  durationMs: number;
  timedOut: boolean;
  aborted: boolean;
  truncated: boolean;
  ok: boolean;
};

export type RunOptions = {
  cwd: string;
  timeoutMs: number;
  signal?: AbortSignal;
  env?: Record<string, string>;
  maxOutputChars?: number;
  onOutput?: (chunk: string, stream: "stdout" | "stderr") => void;
};

/** Prefer the project's own node_modules/.bin, then the host PATH. */
export function resolveExecutable(
  cwd: string,
  executable: string,
): { file: string; prefix: string[] } {
  if (executable === STATIC_SERVER_EXECUTABLE) {
    return {
      file: process.execPath,
      prefix: [path.join(process.cwd(), "scripts", "static-server.mjs")],
    };
  }
  const local = path.join(cwd, "node_modules", ".bin", executable);
  if (fs.existsSync(local)) return { file: local, prefix: [] };
  return { file: executable, prefix: [] };
}

export function killTree(child: ChildProcess, signal: NodeJS.Signals = "SIGTERM"): void {
  if (child.pid === undefined || child.exitCode !== null) return;
  try {
    // Negative pid targets the process group created by `detached: true`.
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Already gone.
    }
  }
}

export function spawnInWorkspace(
  argv: string[],
  options: { cwd: string; env?: Record<string, string> },
): ChildProcess {
  const [executable, ...args] = argv;
  if (!executable) throw new Error("Empty command");
  const { file, prefix } = resolveExecutable(options.cwd, executable);
  return spawn(file, [...prefix, ...args], {
    cwd: options.cwd,
    env: sandboxEnv(options.env),
    shell: false,
    detached: true,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
}

export async function runCommand(
  command: string | string[],
  options: RunOptions,
): Promise<CommandResult> {
  const argv = validateCommand(command);
  const display = argv.join(" ");
  const maxChars = options.maxOutputChars ?? 60_000;
  const started = Date.now();

  if (options.signal?.aborted) {
    return {
      command: display,
      exitCode: null,
      signal: null,
      stdout: "",
      stderr: "Cancelled before start.",
      durationMs: 0,
      timedOut: false,
      aborted: true,
      truncated: false,
      ok: false,
    };
  }

  log.info("command.start", { command: display, cwd: options.cwd });

  return await new Promise<CommandResult>((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let aborted = false;
    let settled = false;
    // Hard cap on what we buffer so a runaway process cannot exhaust memory.
    const bufferCap = maxChars * 4;

    let child: ChildProcess;
    try {
      child = spawnInWorkspace(argv, {
        cwd: options.cwd,
        ...(options.env ? { env: options.env } : {}),
      });
    } catch (error) {
      resolve({
        command: display,
        exitCode: null,
        signal: null,
        stdout: "",
        stderr: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - started,
        timedOut: false,
        aborted: false,
        truncated: false,
        ok: false,
      });
      return;
    }

    const stop = () => {
      killTree(child, "SIGTERM");
      setTimeout(() => killTree(child, "SIGKILL"), 3000).unref();
    };

    const timer = setTimeout(() => {
      timedOut = true;
      stop();
    }, options.timeoutMs);

    const onAbort = () => {
      aborted = true;
      stop();
    };
    options.signal?.addEventListener("abort", onAbort, { once: true });

    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      stdout = (stdout + chunk).slice(-bufferCap);
      options.onOutput?.(chunk, "stdout");
    });
    child.stderr?.on("data", (chunk: string) => {
      stderr = (stderr + chunk).slice(-bufferCap);
      options.onOutput?.(chunk, "stderr");
    });

    const finish = (exitCode: number | null, signal: string | null, spawnError?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener("abort", onAbort);
      if (spawnError) {
        stderr += `\n${
          (spawnError as NodeJS.ErrnoException).code === "ENOENT"
            ? `Executable not found: ${argv[0]}`
            : spawnError.message
        }`;
      }
      const out = truncateOutput(stdout, maxChars);
      const err = truncateOutput(stderr, maxChars);
      const result: CommandResult = {
        command: display,
        exitCode,
        signal,
        stdout: out.text,
        stderr: err.text,
        durationMs: Date.now() - started,
        timedOut,
        aborted,
        truncated: out.truncated || err.truncated,
        ok: exitCode === 0 && !timedOut && !aborted,
      };
      log.info("command.finish", {
        command: display,
        exitCode,
        durationMs: result.durationMs,
        timedOut,
        aborted,
      });
      resolve(result);
    };

    child.on("error", (error) => finish(null, null, error));
    child.on("close", (code, signal) => finish(code, signal));
  });
}

export function formatCommandResult(result: CommandResult): string {
  const status = result.timedOut
    ? "TIMED OUT"
    : result.aborted
      ? "CANCELLED"
      : `exit code ${result.exitCode ?? "none"}`;
  const parts = [`$ ${result.command}`, `(${status}, ${(result.durationMs / 1000).toFixed(1)}s)`];
  if (result.stdout.trim()) parts.push(`stdout:\n${result.stdout.trim()}`);
  if (result.stderr.trim()) parts.push(`stderr:\n${result.stderr.trim()}`);
  return parts.join("\n");
}
