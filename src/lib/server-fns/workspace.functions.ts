import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { activeRunId } from "../agent/runtime.server";
import {
  workspaceGitCommit,
  workspaceGitDiff,
  workspaceGitLog,
  workspaceGitStatus,
} from "../git/git.server";
import { projectsRepo } from "../persistence/repositories.server";
import {
  getPreview,
  previewLogs,
  restartPreview,
  startPreview,
  stopPreview,
} from "../preview/preview-manager.server";
import { workspaceFor } from "../workspace/workspace-manager.server";
import { projectIdSchema, relativePathSchema } from "./validators";

function projectWorkspace(projectId: string) {
  const project = projectsRepo.get(projectId);
  if (!project) throw new Error("Project not found.");
  return { project, workspace: workspaceFor(projectId) };
}

function assertNotBuilding(projectId: string) {
  if (activeRunId(projectId)) {
    throw new Error(
      "Pulse is editing this project right now. Wait for the run to finish or stop it before editing files.",
    );
  }
}

/* ---------------------------- files ---------------------------- */

export const getFileTree = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, includeIgnored: z.boolean().optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { workspace } = projectWorkspace(data.projectId);
    return workspace.tree({ includeIgnored: data.includeIgnored ?? false });
  });

export const readProjectFile = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, path: relativePathSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    const { workspace } = projectWorkspace(data.projectId);
    return { path: data.path, content: workspace.readFile(data.path) };
  });

export const writeProjectFile = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        projectId: projectIdSchema,
        path: relativePathSchema,
        content: z.string().max(1_000_000),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertNotBuilding(data.projectId);
    const { workspace } = projectWorkspace(data.projectId);
    const result = workspace.writeFile(data.path, data.content);
    projectsRepo.touch(data.projectId);
    const { logger } = await import("../log.server");
    logger("editor").info("file.save", { projectId: data.projectId, path: result.path });
    return result;
  });

export const createProjectEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        projectId: projectIdSchema,
        path: relativePathSchema,
        type: z.enum(["file", "directory"]),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertNotBuilding(data.projectId);
    const { workspace } = projectWorkspace(data.projectId);
    if (workspace.exists(data.path)) throw new Error(`${data.path} already exists.`);
    if (data.type === "directory") return { path: workspace.createDirectory(data.path) };
    return { path: workspace.writeFile(data.path, "").path };
  });

export const deleteProjectEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, path: relativePathSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    assertNotBuilding(data.projectId);
    const { workspace } = projectWorkspace(data.projectId);
    return workspace.delete(data.path);
  });

export const renameProjectEntry = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ projectId: projectIdSchema, from: relativePathSchema, to: relativePathSchema })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertNotBuilding(data.projectId);
    const { workspace } = projectWorkspace(data.projectId);
    return workspace.rename(data.from, data.to);
  });

export const searchProjectFiles = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, query: z.string().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const { workspace } = projectWorkspace(data.projectId);
    return workspace.search(data.query, { limit: 300 });
  });

/* ---------------------------- preview ---------------------------- */

export const getPreviewState = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => ({
    ...getPreview(data.projectId),
    logs: previewLogs(data.projectId, 200),
  }));

export const controlPreview = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ projectId: projectIdSchema, action: z.enum(["start", "restart", "stop"]) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { project } = projectWorkspace(data.projectId);
    const options = { packageManager: project.packageManager };
    // Starting can take a while (install + boot); return immediately and let
    // the client follow status through polling / the log stream.
    if (data.action === "stop") return stopPreview(project.id);
    const task =
      data.action === "start"
        ? startPreview(project.id, options)
        : restartPreview(project.id, options);
    void task.then((info) => {
      if (info.port) projectsRepo.update(project.id, { previewPort: info.port });
    });
    await new Promise((resolve) => setTimeout(resolve, 150));
    return getPreview(project.id);
  });

/* ---------------------------- git ---------------------------- */

export const getGitState = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const { workspace } = projectWorkspace(data.projectId);
    const [status, logEntries] = await Promise.all([
      workspaceGitStatus(workspace.root),
      workspaceGitLog(workspace.root, 25),
    ]);
    return { status, log: logEntries };
  });

export const getGitDiff = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, path: relativePathSchema.optional() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { workspace } = projectWorkspace(data.projectId);
    return { diff: await workspaceGitDiff(workspace.root, data.path) };
  });

export const commitGitChanges = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ projectId: projectIdSchema, message: z.string().trim().min(1).max(500) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    assertNotBuilding(data.projectId);
    const { workspace } = projectWorkspace(data.projectId);
    return workspaceGitCommit(workspace.root, data.message);
  });
