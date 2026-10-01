/**
 * Deployment abstraction. A DeploymentProvider builds a project and publishes
 * the result somewhere; PulseUI tracks status and logs per deployment.
 *
 * V1 ships one provider that can be implemented honestly in any environment:
 * "local-static", which runs the project's real production build and serves
 * the static output from this PulseUI instance at /sites/<deploymentId>/.
 * Hosted providers (Vercel, Netlify, Cloudflare Pages…) plug in by
 * implementing the same interface; until one is configured the UI says so.
 */
import fs from "node:fs";
import path from "node:path";

import { formatCommandResult, runCommand } from "../commands/command-runner.server";
import { dataPaths, serverEnv } from "../config/env.server";
import type { Deployment } from "../domain/types";
import { logger } from "../log.server";
import {
  deploymentsRepo,
  projectsRepo,
  type ProjectRecord,
} from "../persistence/repositories.server";
import {
  frameworkInfo,
  needsInstall,
  runProjectCommand,
} from "../workspace/project-commands.server";
import { workspaceFor } from "../workspace/workspace-manager.server";

const log = logger("deploy");

export interface DeploymentProvider {
  readonly id: string;
  readonly label: string;
  /** Short explanation shown in the UI. */
  readonly description: string;
  isConfigured(): boolean;
  deploy(
    project: ProjectRecord,
    deployment: Deployment,
    signal: AbortSignal,
  ): Promise<{ url: string }>;
}

type Active = Map<string, AbortController>;
const KEY = Symbol.for("pulseui.deployments");
function active(): Active {
  const store = globalThis as unknown as Record<symbol, Active | undefined>;
  store[KEY] ??= new Map();
  return store[KEY];
}

function append(deploymentId: string, text: string) {
  deploymentsRepo.update(deploymentId, { appendLog: text.endsWith("\n") ? text : `${text}\n` });
}

const STATIC_OUTPUT_DIRS = ["dist", "out", "build", "public"];

class LocalStaticProvider implements DeploymentProvider {
  readonly id = "local-static";
  readonly label = "Local static hosting";
  readonly description =
    "Runs the production build and serves the static output from this PulseUI server. Good for sharing on your network; not a public host.";

  isConfigured() {
    return true;
  }

  async deploy(
    project: ProjectRecord,
    deployment: Deployment,
    signal: AbortSignal,
  ): Promise<{ url: string }> {
    const root = workspaceFor(project.id).root;
    const info = frameworkInfo(root, project.packageManager);

    if (needsInstall(root)) {
      append(deployment.id, "$ install dependencies");
      const install = await runProjectCommand(root, "install", {
        packageManager: info.packageManager,
        signal,
        onOutput: (chunk) => append(deployment.id, chunk),
      });
      if (!install.skipped && !install.result.ok)
        throw new Error("Dependency installation failed.");
    }

    let outputDir: string;
    if (info.framework === "vite-react" || info.framework === "vite") {
      // Relative asset URLs so the site works under /sites/<id>/.
      const out = ".pulseui-deploy";
      const result = await runCommand(
        ["vite", "build", "--base", "./", "--outDir", out, "--emptyOutDir"],
        {
          cwd: root,
          timeoutMs: serverEnv().COMMAND_TIMEOUT_MS,
          signal,
          env: { NODE_ENV: "production" },
          onOutput: (chunk) => append(deployment.id, chunk),
        },
      );
      append(deployment.id, formatCommandResult({ ...result, stdout: "", stderr: "" }));
      if (!result.ok) throw new Error("Production build failed.");
      outputDir = path.join(root, out);
    } else if (info.framework === "static-html") {
      outputDir = root;
    } else {
      const build = await runProjectCommand(root, "build", {
        packageManager: info.packageManager,
        signal,
        onOutput: (chunk) => append(deployment.id, chunk),
      });
      if (build.skipped) throw new Error("This project has no build script.");
      if (!build.result.ok) throw new Error("Production build failed.");
      const found = STATIC_OUTPUT_DIRS.map((dir) => path.join(root, dir)).find((dir) =>
        fs.existsSync(path.join(dir, "index.html")),
      );
      if (!found) {
        throw new Error(
          `${info.label} did not produce static output (no index.html in ${STATIC_OUTPUT_DIRS.join(", ")}). Local static hosting supports static builds only.`,
        );
      }
      outputDir = found;
    }

    const target = path.join(dataPaths().deployments, project.id, deployment.id);
    fs.rmSync(target, { recursive: true, force: true });
    fs.mkdirSync(target, { recursive: true });
    fs.cpSync(outputDir, target, {
      recursive: true,
      filter: (src) => !src.includes(`${path.sep}node_modules`) && !src.includes(`${path.sep}.git`),
    });
    if (outputDir.endsWith(".pulseui-deploy"))
      fs.rmSync(outputDir, { recursive: true, force: true });
    append(deployment.id, `Published ${countFiles(target)} files.`);
    return { url: `/sites/${deployment.id}/` };
  }
}

function countFiles(dir: string): number {
  let count = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    count += entry.isDirectory() ? countFiles(path.join(dir, entry.name)) : 1;
  }
  return count;
}

const PROVIDERS: DeploymentProvider[] = [new LocalStaticProvider()];

export function deploymentProviders(): Array<{
  id: string;
  label: string;
  description: string;
  configured: boolean;
}> {
  return PROVIDERS.map((provider) => ({
    id: provider.id,
    label: provider.label,
    description: provider.description,
    configured: provider.isConfigured(),
  }));
}

export function startDeployment(projectId: string, providerId: string): Deployment {
  const project = projectsRepo.get(projectId);
  if (!project) throw new Error("Project not found.");
  const provider = PROVIDERS.find((candidate) => candidate.id === providerId);
  if (!provider || !provider.isConfigured()) throw new Error("Deployment provider not configured.");
  if (
    [...deploymentsRepo.list(projectId)].some(
      (d) => d.status === "QUEUED" || d.status === "BUILDING",
    )
  ) {
    throw new Error("A deployment is already in progress for this project.");
  }

  const deployment = deploymentsRepo.create({
    projectId,
    versionId: project.activeVersionId,
    provider: provider.id,
  });
  const controller = new AbortController();
  active().set(deployment.id, controller);
  log.info("deploy.start", { projectId, deploymentId: deployment.id, provider: provider.id });

  void (async () => {
    deploymentsRepo.update(deployment.id, { status: "BUILDING" });
    try {
      const { url } = await provider.deploy(project, deployment, controller.signal);
      deploymentsRepo.update(deployment.id, { status: "READY", url });
      log.info("deploy.ready", { deploymentId: deployment.id });
    } catch (error) {
      const cancelled = controller.signal.aborted;
      append(
        deployment.id,
        cancelled
          ? "Cancelled."
          : `ERROR: ${error instanceof Error ? error.message : String(error)}`,
      );
      deploymentsRepo.update(deployment.id, { status: cancelled ? "CANCELLED" : "FAILED" });
      log.warn("deploy.failed", { deploymentId: deployment.id, cancelled });
    } finally {
      active().delete(deployment.id);
    }
  })();
  return deployment;
}

export function cancelDeployment(deploymentId: string): boolean {
  const controller = active().get(deploymentId);
  if (!controller) return false;
  controller.abort();
  return true;
}

/** Resolve a file inside a published local-static deployment (path-traversal safe). */
export function resolveSiteFile(deploymentId: string, requestPath: string): string | null {
  if (!/^dpl_[a-z0-9]+$/.test(deploymentId)) return null;
  const deployment = deploymentsRepo.get(deploymentId);
  if (!deployment || deployment.status !== "READY" || deployment.provider !== "local-static")
    return null;
  const root = path.join(dataPaths().deployments, deployment.projectId, deployment.id);
  const clean = path.posix
    .normalize(`/${decodeURIComponent(requestPath || "")}`)
    .replace(/^\/+/, "");
  let target = path.resolve(root, clean);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  if (fs.existsSync(target) && fs.statSync(target).isDirectory())
    target = path.join(target, "index.html");
  if (fs.existsSync(target)) return target;
  // SPA fallback for extension-less routes.
  const index = path.join(root, "index.html");
  return !path.extname(clean) && fs.existsSync(index) ? index : null;
}
