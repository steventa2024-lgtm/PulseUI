/**
 * Project lifecycle: create (blank, from prompt, from template, from GitHub),
 * read with live preview state, update settings, delete.
 */
import fs from "node:fs";
import path from "node:path";

import { dataPaths, serverEnv, startersDir } from "../config/env.server";
import { compact, type Project, type ProjectSettings, type ProjectSummary } from "../domain/types";
import { runGit, workspaceGitInit } from "../git/git.server";
import { logger } from "../log.server";
import { projectsRepo, type ProjectRecord } from "../persistence/repositories.server";
import { activeRunId, cancelRun } from "../agent/runtime.server";
import { getPreview, stopPreview } from "../preview/preview-manager.server";
import { getTemplate } from "../templates/registry";
import { createCheckpoint, deleteHistory } from "../versions/checkpoints.server";
import { frameworkInfo, preferredPackageManager } from "../workspace/project-commands.server";
import { workspaceFor } from "../workspace/workspace-manager.server";

const log = logger("projects");

const BOOT_KEY = Symbol.for("pulseui.booted");

/** Clear state left over by a previous server process (runs and previews cannot survive a restart). */
export function ensureBooted(): void {
  const store = globalThis as unknown as Record<symbol, boolean | undefined>;
  if (store[BOOT_KEY]) return;
  store[BOOT_KEY] = true;
  projectsRepo.resetTransientState();
}

export function toProject(record: ProjectRecord): Project {
  const preview = getPreview(record.id);
  return {
    ...record,
    workspacePath: workspaceFor(record.id).root,
    previewStatus: preview.status,
    previewPort: preview.port ?? record.previewPort,
    previewUrl: preview.url,
  };
}

export function toSummary(record: ProjectRecord): ProjectSummary {
  return {
    id: record.id,
    name: record.name,
    slug: record.slug,
    description: record.description,
    framework: record.framework,
    templateId: record.templateId,
    status: record.status,
    updatedAt: record.updatedAt,
    createdAt: record.createdAt,
  };
}

const FILLER =
  /^(please\s+)?(build|create|make|generate|design|write|develop|i want|i need|can you build|help me build)\s+(me\s+)?(a|an|the|my)?\s*/i;

/** Readable project name from a prompt: "Build a CRM for my landscaping…" → "CRM for Landscaping". */
export function nameFromPrompt(prompt: string): string {
  const firstSentence = prompt.trim().split(/[.\n!?]/)[0] ?? "";
  const words = firstSentence
    .replace(FILLER, "")
    .replace(/\b(modern|simple|beautiful|new|basic|my|our)\b/gi, "")
    .split(/\s+/)
    .filter(Boolean);
  const cut = words.findIndex((word) =>
    /^(with|that|which|including|using|and|where)$/i.test(word),
  );
  const picked = (cut > 1 ? words.slice(0, cut) : words).slice(0, 5);
  const name = picked
    .map((word, index) => {
      if (word.length > 1 && word === word.toUpperCase()) return word;
      if (index > 0 && SMALL_WORDS.has(word.toLowerCase())) return word.toLowerCase();
      return (word[0]?.toUpperCase() ?? "") + word.slice(1);
    })
    .join(" ")
    .replace(/[^\p{L}\p{N} &-]/gu, "")
    .trim();
  return name || "Untitled project";
}

const SMALL_WORDS = new Set(["a", "an", "the", "for", "of", "to", "in", "on", "and", "or", "with"]);

function copyStarter(projectId: string, templateId: string | null): void {
  const workspace = workspaceFor(projectId);
  const base = path.join(startersDir(), "base");
  if (!fs.existsSync(base)) throw new Error(`Starter project not found at ${base}.`);
  workspace.copyFrom(base);
  if (templateId) {
    const overlay = path.join(startersDir(), "templates", templateId);
    if (!fs.existsSync(overlay)) throw new Error(`Template "${templateId}" has no starter files.`);
    workspace.copyFrom(overlay);
  }
}

function setPackageName(projectId: string, name: string): void {
  const file = path.join(workspaceFor(projectId).root, "package.json");
  if (!fs.existsSync(file)) return;
  const pkg = JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  pkg["name"] = projectsRepo.get(projectId)?.slug ?? "pulseui-app";
  fs.writeFileSync(file, `${JSON.stringify(pkg, null, 2)}\n`);
  const index = path.join(workspaceFor(projectId).root, "index.html");
  if (fs.existsSync(index)) {
    const html = fs
      .readFileSync(index, "utf8")
      .replace(/<title>[^<]*<\/title>/, `<title>${name.replace(/[<>&]/g, "")}</title>`);
    fs.writeFileSync(index, html);
  }
}

async function initialiseWorkspace(record: ProjectRecord, label: string): Promise<ProjectRecord> {
  const root = workspaceFor(record.id).root;
  const info = frameworkInfo(root, record.packageManager);
  const updated = projectsRepo.update(record.id, {
    framework: info.framework,
    packageManager: info.packageManager,
    metadata: {
      ...record.metadata,
      ...compact({
        installCommand: info.installCommand?.join(" "),
        devCommand: info.dev.argv(0, "host").join(" ").replace(" 0 ", " <port> ") || undefined,
        buildCommand: info.buildCommand?.join(" "),
      }),
    },
  });
  await workspaceGitInit(root, label);
  await createCheckpoint({ projectId: record.id, label, status: "ok" });
  return updated;
}

export async function createProject(input: {
  name?: string;
  prompt?: string;
  templateId?: string | null;
  description?: string;
}): Promise<ProjectRecord> {
  ensureBooted();
  const template = input.templateId ? getTemplate(input.templateId) : undefined;
  if (input.templateId && !template) throw new Error(`Unknown template "${input.templateId}".`);
  const name =
    input.name?.trim() ||
    template?.name ||
    (input.prompt ? nameFromPrompt(input.prompt) : "Untitled project");

  const record = projectsRepo.create({
    name,
    description: input.description ?? template?.description ?? input.prompt?.slice(0, 280) ?? "",
    templateId: template?.id ?? null,
    packageManager: preferredPackageManager(),
    metadata: input.prompt ? { initialPrompt: input.prompt.slice(0, 4000) } : {},
  });
  try {
    copyStarter(record.id, template?.id ?? null);
    setPackageName(record.id, name);
    const created = await initialiseWorkspace(
      record,
      template ? `Initial project from the ${template.name} template` : "Initial project",
    );
    log.info("project.created", { projectId: record.id, template: template?.id ?? null });
    return created;
  } catch (error) {
    await deleteProject(record.id).catch(() => undefined);
    throw error;
  }
}

const GITHUB_URL =
  /^https:\/\/github\.com\/([A-Za-z0-9_.-]{1,100})\/([A-Za-z0-9_.-]{1,100}?)(?:\.git)?\/?$/;

export function parseGitHubUrl(url: string): { owner: string; repo: string; cloneUrl: string } {
  const match = GITHUB_URL.exec(url.trim());
  if (!match?.[1] || !match[2]) {
    throw new Error("Enter a GitHub repository URL like https://github.com/owner/repo");
  }
  return {
    owner: match[1],
    repo: match[2],
    cloneUrl: `https://github.com/${match[1]}/${match[2]}.git`,
  };
}

export async function importFromGitHub(url: string, branch?: string): Promise<ProjectRecord> {
  ensureBooted();
  const { owner, repo, cloneUrl } = parseGitHubUrl(url);
  if (branch && !/^[\w./-]{1,100}$/.test(branch)) throw new Error("Invalid branch name.");

  const record = projectsRepo.create({
    name: repo,
    description: `Imported from github.com/${owner}/${repo}`,
    gitRepository: `https://github.com/${owner}/${repo}`,
    gitBranch: branch ?? null,
    packageManager: preferredPackageManager(),
    metadata: { importedFrom: `https://github.com/${owner}/${repo}` },
  });
  const root = workspaceFor(record.id).root;
  try {
    fs.mkdirSync(path.dirname(root), { recursive: true });
    const token = serverEnv().GITHUB_TOKEN;
    // A token (if configured) is passed as an HTTP header through env-based git
    // config, so it is never written to the clone's .git/config or argv.
    const authEnv: Record<string, string> = token
      ? {
          GIT_CONFIG_COUNT: "1",
          GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
          GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${Buffer.from(`x-access-token:${token}`).toString("base64")}`,
        }
      : {};
    const clone = await runGit(
      ["clone", "--depth", "1", ...(branch ? ["--branch", branch] : []), "--", cloneUrl, root],
      { cwd: dataPaths().workspaces, timeoutMs: 180_000, env: authEnv },
    );
    if (!clone.ok) {
      const detail = clone.stderr.replace(/AUTHORIZATION:[^\n]*/gi, "[redacted]").trim();
      throw new Error(
        /not found|could not read Username|Authentication failed/i.test(detail)
          ? `Repository not found or private. ${token ? "The configured GITHUB_TOKEN cannot access it." : "Private repositories require GITHUB_TOKEN to be configured."}`
          : `git clone failed: ${detail.slice(0, 400)}`,
      );
    }
    const head = await runGit(["rev-parse", "--abbrev-ref", "HEAD"], { cwd: root });
    projectsRepo.update(record.id, { gitBranch: head.ok ? head.stdout.trim() : (branch ?? null) });
    const created = await initialiseWorkspace(
      projectsRepo.get(record.id) ?? record,
      `Imported ${owner}/${repo}`,
    );
    log.info("project.imported", {
      projectId: record.id,
      repo: `${owner}/${repo}`,
      framework: created.framework,
    });
    return created;
  } catch (error) {
    await deleteProject(record.id).catch(() => undefined);
    throw error;
  }
}

export function updateProjectSettings(
  projectId: string,
  patch: { name?: string; description?: string; settings?: Partial<ProjectSettings> },
): ProjectRecord {
  const current = projectsRepo.get(projectId);
  if (!current) throw new Error("Project not found.");
  return projectsRepo.update(projectId, {
    ...(patch.name ? { name: patch.name } : {}),
    ...(patch.description !== undefined ? { description: patch.description } : {}),
    ...(patch.settings ? { settings: { ...current.settings, ...patch.settings } } : {}),
  });
}

export async function deleteProject(projectId: string): Promise<void> {
  const runId = activeRunId(projectId);
  if (runId) cancelRun(runId);
  await stopPreview(projectId);
  workspaceFor(projectId).destroy();
  deleteHistory(projectId);
  fs.rmSync(path.join(dataPaths().deployments, projectId), { recursive: true, force: true });
  projectsRepo.delete(projectId);
  log.info("project.deleted", { projectId });
}
