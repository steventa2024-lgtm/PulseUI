/**
 * Project-level commands (install, typecheck, lint, test, build) resolved from
 * framework detection and executed through the CommandRunner.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  formatCommandResult,
  runCommand,
  type CommandResult,
} from "../commands/command-runner.server";
import { serverEnv } from "../config/env.server";
import type { PackageManager } from "../domain/types";
import { detectProject, type FrameworkInfo } from "./framework-detect.server";

export type ProjectCommandKind = "install" | "typecheck" | "lint" | "test" | "build";

export type ProjectCommandOutcome =
  | { kind: ProjectCommandKind; skipped: true; reason: string }
  | { kind: ProjectCommandKind; skipped: false; result: CommandResult };

const INSTALL_MARKER = ".pulseui-install-hash";

function onPath(binary: string): boolean {
  const dirs = (process.env["PATH"] ?? "").split(path.delimiter);
  dirs.push(path.dirname(process.execPath));
  return dirs.some((dir) => dir && fs.existsSync(path.join(dir, binary)));
}

/** Package manager for new projects: Bun when installed (fast, cached), else npm. */
export function preferredPackageManager(): PackageManager {
  return onPath("bun") ? "bun" : "npm";
}

export function frameworkInfo(root: string, preferred?: PackageManager): FrameworkInfo {
  return detectProject(root, preferred ?? preferredPackageManager());
}

function dependencyFingerprint(root: string): string | null {
  const file = path.join(root, "package.json");
  if (!fs.existsSync(file)) return null;
  try {
    const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as {
      dependencies?: unknown;
      devDependencies?: unknown;
    };
    return createHash("sha1")
      .update(JSON.stringify([pkg.dependencies ?? {}, pkg.devDependencies ?? {}]))
      .digest("hex");
  } catch {
    return null;
  }
}

/** True when package.json dependencies changed since the last successful install. */
export function needsInstall(root: string): boolean {
  const fingerprint = dependencyFingerprint(root);
  if (!fingerprint) return false;
  const marker = path.join(root, "node_modules", INSTALL_MARKER);
  if (!fs.existsSync(marker)) return true;
  return fs.readFileSync(marker, "utf8").trim() !== fingerprint;
}

function recordInstall(root: string): void {
  const fingerprint = dependencyFingerprint(root);
  if (!fingerprint) return;
  const dir = path.join(root, "node_modules");
  if (fs.existsSync(dir)) fs.writeFileSync(path.join(dir, INSTALL_MARKER), fingerprint);
}

export async function runProjectCommand(
  root: string,
  kind: ProjectCommandKind,
  options: {
    packageManager?: PackageManager;
    signal?: AbortSignal;
    onOutput?: (chunk: string, stream: "stdout" | "stderr") => void;
  } = {},
): Promise<ProjectCommandOutcome> {
  const info = frameworkInfo(root, options.packageManager);
  const env = serverEnv();
  const command =
    kind === "install"
      ? info.installCommand
      : kind === "typecheck"
        ? info.typecheckCommand
        : kind === "lint"
          ? info.lintCommand
          : kind === "test"
            ? info.testCommand
            : info.buildCommand;

  if (!command) {
    const reason =
      kind === "install"
        ? "No package.json — nothing to install."
        : kind === "typecheck"
          ? "No typecheck script and no TypeScript config."
          : `No "${kind}" script in package.json.`;
    return { kind, skipped: true, reason };
  }

  const result = await runCommand(command, {
    cwd: root,
    timeoutMs: kind === "install" ? env.INSTALL_TIMEOUT_MS : env.COMMAND_TIMEOUT_MS,
    env: {
      NODE_ENV:
        kind === "install" ? "development" : kind === "build" ? "production" : "development",
    },
    ...(options.signal ? { signal: options.signal } : {}),
    ...(options.onOutput ? { onOutput: options.onOutput } : {}),
  });
  if (kind === "install" && result.ok) recordInstall(root);
  return { kind, skipped: false, result };
}

export function describeOutcome(outcome: ProjectCommandOutcome): string {
  if (outcome.skipped) return `${outcome.kind}: skipped (${outcome.reason})`;
  return formatCommandResult(outcome.result);
}
