/**
 * Git plumbing used by PulseUI itself (checkpoints, workspace status, import).
 * Unlike agent commands, these run with fixed arguments chosen by PulseUI, but
 * still without a shell and with global/system git config disabled so a
 * user's hooks or aliases cannot interfere.
 */
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import { sandboxEnv } from "../commands/command-runner.server";

export type GitResult = { ok: boolean; stdout: string; stderr: string; code: number | null };

export type GitOptions = {
  cwd: string;
  gitDir?: string;
  workTree?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  /** Extra env (e.g. an auth header for private clones). Never logged. */
  env?: Record<string, string>;
  maxBuffer?: number;
};

export function runGit(args: string[], options: GitOptions): Promise<GitResult> {
  const prefix: string[] = [
    "-c",
    "user.name=Pulse",
    "-c",
    "user.email=pulse@pulseui.local",
    "-c",
    "commit.gpgsign=false",
    "-c",
    "core.hooksPath=/dev/null",
    "-c",
    "init.defaultBranch=main",
    "-c",
    "core.quotepath=false",
  ];
  if (options.gitDir) prefix.push(`--git-dir=${options.gitDir}`);
  if (options.workTree) prefix.push(`--work-tree=${options.workTree}`);

  const env = sandboxEnv({
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: "/dev/null",
    GIT_TERMINAL_PROMPT: "0",
    // Never let git walk up out of the workspace into an enclosing repository.
    GIT_CEILING_DIRECTORIES: path.dirname(path.resolve(options.workTree ?? options.cwd)),
    ...options.env,
  });

  return new Promise((resolve) => {
    execFile(
      "git",
      [...prefix, ...args],
      {
        cwd: options.cwd,
        env,
        timeout: options.timeoutMs ?? 60_000,
        maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
        ...(options.signal ? { signal: options.signal } : {}),
      },
      (error, stdout, stderr) => {
        const code =
          error && typeof (error as { code?: unknown }).code === "number"
            ? (error as { code: number }).code
            : error
              ? null
              : 0;
        resolve({ ok: !error, stdout: String(stdout), stderr: String(stderr), code });
      },
    );
  });
}

export function hasOwnGitRepo(workspaceRoot: string): boolean {
  return fs.existsSync(path.join(workspaceRoot, ".git"));
}

export type GitStatusEntry = { path: string; index: string; worktree: string };

export type GitStatus =
  | { initialized: false }
  | {
      initialized: true;
      branch: string | null;
      head: string | null;
      ahead: number;
      behind: number;
      entries: GitStatusEntry[];
      remote: string | null;
    };

export function parsePorcelainStatus(output: string): {
  branch: string | null;
  ahead: number;
  behind: number;
  entries: GitStatusEntry[];
} {
  let branch: string | null = null;
  let ahead = 0;
  let behind = 0;
  const entries: GitStatusEntry[] = [];
  for (const line of output.split("\n")) {
    if (!line) continue;
    if (line.startsWith("## ")) {
      const header = line.slice(3);
      const name = header.split("...")[0]?.split(" ")[0] ?? null;
      branch = name?.startsWith("No commits yet on ")
        ? header.replace("No commits yet on ", "")
        : name;
      const aheadMatch = /ahead (\d+)/.exec(header);
      const behindMatch = /behind (\d+)/.exec(header);
      ahead = aheadMatch ? Number(aheadMatch[1]) : 0;
      behind = behindMatch ? Number(behindMatch[1]) : 0;
      continue;
    }
    const index = line[0] ?? " ";
    const worktree = line[1] ?? " ";
    let file = line.slice(3);
    if (file.includes(" -> ")) file = file.split(" -> ")[1] ?? file;
    entries.push({ path: file.replace(/^"|"$/g, ""), index, worktree });
  }
  return { branch, ahead, behind, entries };
}

export async function workspaceGitStatus(workspaceRoot: string): Promise<GitStatus> {
  if (!hasOwnGitRepo(workspaceRoot)) return { initialized: false };
  const status = await runGit(["status", "--porcelain=v1", "--branch", "--untracked-files=all"], {
    cwd: workspaceRoot,
  });
  const parsed = parsePorcelainStatus(status.stdout);
  const head = await runGit(["rev-parse", "--short", "HEAD"], { cwd: workspaceRoot });
  const remote = await runGit(["remote", "get-url", "origin"], { cwd: workspaceRoot });
  return {
    initialized: true,
    branch: parsed.branch,
    head: head.ok ? head.stdout.trim() : null,
    ahead: parsed.ahead,
    behind: parsed.behind,
    entries: parsed.entries,
    remote: remote.ok ? remote.stdout.trim().replace(/\/\/[^@/]+@/, "//") : null,
  };
}

export async function workspaceGitDiff(workspaceRoot: string, file?: string): Promise<string> {
  if (!hasOwnGitRepo(workspaceRoot)) return "";
  // Intent-to-add makes untracked files show up in `git diff` without staging content.
  await runGit(["add", "--intent-to-add", "--all"], { cwd: workspaceRoot });
  const args = ["diff", "--no-color", "--no-ext-diff", "HEAD"];
  if (file) args.push("--", file);
  const result = await runGit(args, { cwd: workspaceRoot });
  if (result.ok) return result.stdout.slice(0, 500_000);
  // No commits yet: diff against the empty tree.
  const empty = await runGit(["diff", "--no-color", "--cached"], { cwd: workspaceRoot });
  return empty.stdout.slice(0, 500_000);
}

export type GitLogEntry = { sha: string; subject: string; author: string; date: string };

export async function workspaceGitLog(workspaceRoot: string, limit = 30): Promise<GitLogEntry[]> {
  if (!hasOwnGitRepo(workspaceRoot)) return [];
  const result = await runGit(["log", `-n${limit}`, "--pretty=format:%h%x1f%s%x1f%an%x1f%aI"], {
    cwd: workspaceRoot,
  });
  if (!result.ok) return [];
  return result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [sha = "", subject = "", author = "", date = ""] = line.split("\x1f");
      return { sha, subject, author, date };
    });
}

export async function workspaceGitInit(workspaceRoot: string, message: string): Promise<void> {
  if (hasOwnGitRepo(workspaceRoot)) return;
  await runGit(["init"], { cwd: workspaceRoot });
  if (!fs.existsSync(path.join(workspaceRoot, ".gitignore"))) {
    fs.writeFileSync(
      path.join(workspaceRoot, ".gitignore"),
      "node_modules\ndist\n.env\n.env.*\n!.env.example\n*.log\n",
    );
  }
  await runGit(["add", "-A"], { cwd: workspaceRoot });
  await runGit(["commit", "-m", message], { cwd: workspaceRoot });
}

export async function workspaceGitCommit(
  workspaceRoot: string,
  message: string,
): Promise<{ ok: boolean; sha: string | null; output: string }> {
  if (!hasOwnGitRepo(workspaceRoot))
    return { ok: false, sha: null, output: "Not a git repository." };
  await runGit(["add", "-A"], { cwd: workspaceRoot });
  const commit = await runGit(["commit", "-m", message], { cwd: workspaceRoot });
  if (!commit.ok) return { ok: false, sha: null, output: (commit.stdout + commit.stderr).trim() };
  const head = await runGit(["rev-parse", "--short", "HEAD"], { cwd: workspaceRoot });
  return { ok: true, sha: head.stdout.trim(), output: commit.stdout.trim() };
}
