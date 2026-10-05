/**
 * Version checkpoints.
 *
 * Each project gets a private "shadow" git repository that lives outside the
 * workspace (<data>/history/<projectId>.git) and uses the workspace as its work
 * tree. A checkpoint is a commit there. This gives cheap, content-addressed
 * snapshots and real diffs without adding commits to the project's own git
 * history, which belongs to the user.
 */
import fs from "node:fs";
import path from "node:path";

import { dataPaths } from "../config/env.server";
import type { FileChangeSummary, Version } from "../domain/types";
import { runGit, type GitOptions } from "../git/git.server";
import { logger } from "../log.server";
import { versionsRepo } from "../persistence/repositories.server";
import { assertProjectId, workspaceRootFor } from "../workspace/workspace-manager.server";

const log = logger("checkpoints");

const EXCLUDES = [
  "node_modules/",
  "dist/",
  "build/",
  ".next/",
  ".astro/",
  ".cache/",
  ".vite/",
  ".turbo/",
  "coverage/",
  ".output/",
  ".pulseui-deploy/",
  ".env",
  ".env.*",
  "!.env.example",
  "*.log",
  "*.tsbuildinfo",
];

function shadowOptions(projectId: string): GitOptions {
  assertProjectId(projectId);
  const workTree = workspaceRootFor(projectId);
  return {
    cwd: workTree,
    gitDir: path.join(dataPaths().history, `${projectId}.git`),
    workTree,
  };
}

async function shadowGit(projectId: string, args: string[]) {
  const result = await runGit(args, shadowOptions(projectId));
  return result;
}

async function ensureRepo(projectId: string): Promise<void> {
  const options = shadowOptions(projectId);
  const gitDir = options.gitDir as string;
  if (fs.existsSync(path.join(gitDir, "HEAD"))) return;
  fs.mkdirSync(gitDir, { recursive: true });
  const init = await runGit(["init", "--quiet"], options);
  if (!init.ok) throw new Error(`Could not initialise version history: ${init.stderr}`);
  fs.mkdirSync(path.join(gitDir, "info"), { recursive: true });
  fs.writeFileSync(path.join(gitDir, "info", "exclude"), `${EXCLUDES.join("\n")}\n`);
}

export function parseNameStatus(output: string): FileChangeSummary {
  const summary: FileChangeSummary = { added: [], changed: [], removed: [] };
  for (const line of output.split("\n")) {
    const parts = line.split("\t");
    const status = parts[0]?.trim();
    if (!status) continue;
    if (status.startsWith("R")) {
      if (parts[1]) summary.removed.push(parts[1]);
      if (parts[2]) summary.added.push(parts[2]);
    } else if (status === "A") summary.added.push(parts[1] ?? "");
    else if (status === "D") summary.removed.push(parts[1] ?? "");
    else if (parts[1]) summary.changed.push(parts[1]);
  }
  return summary;
}

async function headSha(projectId: string): Promise<string | null> {
  const head = await shadowGit(projectId, ["rev-parse", "--verify", "--quiet", "HEAD"]);
  return head.ok ? head.stdout.trim() : null;
}

/** Changes in the workspace since the last checkpoint (not yet committed). */
export async function pendingChanges(projectId: string): Promise<FileChangeSummary> {
  await ensureRepo(projectId);
  await shadowGit(projectId, ["add", "-A"]);
  const head = await headSha(projectId);
  const args = head
    ? ["diff", "--cached", "--name-status", "-M", "HEAD"]
    : ["diff", "--cached", "--name-status", "-M", "--root"];
  if (!head) {
    const files = await shadowGit(projectId, ["ls-files"]);
    return { added: files.stdout.split("\n").filter(Boolean), changed: [], removed: [] };
  }
  const result = await shadowGit(projectId, args);
  return parseNameStatus(result.stdout);
}

/**
 * Commit the workspace's current state. Returns null when nothing changed
 * since the previous checkpoint (unless `allowEmpty`).
 */
export async function createCheckpoint(input: {
  projectId: string;
  label: string;
  prompt?: string | null;
  status?: Version["status"];
  runId?: string | null;
  allowEmpty?: boolean;
}): Promise<Version | null> {
  await ensureRepo(input.projectId);
  const changes = await pendingChanges(input.projectId);
  const dirty = changes.added.length + changes.changed.length + changes.removed.length > 0;
  const previous = await headSha(input.projectId);
  if (!dirty && previous && !input.allowEmpty) return null;

  const message = input.label.slice(0, 200) || "Checkpoint";
  const commit = await shadowGit(input.projectId, [
    "commit",
    "--quiet",
    "--allow-empty",
    "-m",
    message,
  ]);
  if (!commit.ok) throw new Error(`Checkpoint failed: ${commit.stderr || commit.stdout}`);
  const sha = await headSha(input.projectId);
  if (!sha) throw new Error("Checkpoint failed: no commit was created.");

  const version = versionsRepo.create({
    projectId: input.projectId,
    label: message,
    prompt: input.prompt ?? null,
    sha,
    changedFiles: changes,
    status: input.status ?? "ok",
    runId: input.runId ?? null,
  });
  log.info("checkpoint.created", { projectId: input.projectId, number: version.number, sha });
  return version;
}

/** Unified diff introduced by one version (vs. its parent). */
export async function versionDiff(projectId: string, sha: string): Promise<string> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid version reference.");
  const result = await shadowGit(projectId, [
    "show",
    "--no-color",
    "--no-ext-diff",
    "--format=",
    "-M",
    "--patch",
    sha,
  ]);
  if (!result.ok) throw new Error(result.stderr || "Could not load diff.");
  return result.stdout.slice(0, 600_000);
}

/** Unified diff between a version and the current workspace. */
export async function diffAgainstWorkspace(projectId: string, sha: string): Promise<string> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid version reference.");
  await shadowGit(projectId, ["add", "-A"]);
  const result = await shadowGit(projectId, ["diff", "--cached", "--no-color", "-M", sha]);
  return result.stdout.slice(0, 600_000);
}

/** Content of a file as it was in a version. */
export async function fileAtVersion(
  projectId: string,
  sha: string,
  file: string,
): Promise<string | null> {
  if (!/^[0-9a-f]{7,40}$/.test(sha)) throw new Error("Invalid version reference.");
  const result = await shadowGit(projectId, ["show", `${sha}:${file}`]);
  return result.ok ? result.stdout : null;
}

/**
 * Restore the workspace to a version. The current state is checkpointed first,
 * so a restore is itself undoable, and the restored state becomes a new version.
 */
export async function restoreVersion(projectId: string, versionId: string): Promise<Version> {
  const target = versionsRepo.get(versionId);
  if (!target || target.projectId !== projectId) throw new Error("Version not found.");

  await createCheckpoint({
    projectId,
    label: `Before restoring version ${target.number}`,
    status: "manual",
  });

  const restore = await shadowGit(projectId, [
    "restore",
    `--source=${target.sha}`,
    "--staged",
    "--worktree",
    "--",
    ":/",
  ]);
  if (!restore.ok) throw new Error(`Restore failed: ${restore.stderr}`);

  const version = await createCheckpoint({
    projectId,
    label: `Restored version ${target.number}: ${target.label}`,
    status: "restored",
    allowEmpty: true,
  });
  if (!version) throw new Error("Restore did not produce a version.");
  return version;
}

export function deleteHistory(projectId: string): void {
  const options = shadowOptions(projectId);
  if (options.gitDir) fs.rmSync(options.gitDir, { recursive: true, force: true });
}
