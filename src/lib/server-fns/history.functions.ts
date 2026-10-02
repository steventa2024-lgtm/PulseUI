import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { activeRunId } from "../agent/runtime.server";
import { serverEnv, dataPaths } from "../config/env.server";
import { listConnections } from "../connections/connections.server";
import {
  cancelDeployment,
  deploymentProviders,
  startDeployment,
} from "../deployment/deployment.server";
import {
  deploymentsRepo,
  projectsRepo,
  settingsRepo,
  versionsRepo,
} from "../persistence/repositories.server";
import {
  createCheckpoint,
  diffAgainstWorkspace,
  restoreVersion,
  versionDiff,
} from "../versions/checkpoints.server";
import { deploymentIdSchema, modelIdSchema, projectIdSchema, versionIdSchema } from "./validators";

/* ---------------------------- versions ---------------------------- */

export const listVersions = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => versionsRepo.list(data.projectId));

export const getVersionDiff = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z
      .object({
        projectId: projectIdSchema,
        versionId: versionIdSchema,
        against: z.enum(["parent", "current"]).default("parent"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const version = versionsRepo.get(data.versionId);
    if (!version || version.projectId !== data.projectId) throw new Error("Version not found.");
    const diff =
      data.against === "current"
        ? await diffAgainstWorkspace(data.projectId, version.sha)
        : await versionDiff(data.projectId, version.sha);
    return { version, diff };
  });

export const restoreProjectVersion = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, versionId: versionIdSchema }).parse(data),
  )
  .handler(async ({ data }) => {
    if (activeRunId(data.projectId))
      throw new Error("Stop the active Pulse run before restoring a version.");
    const version = await restoreVersion(data.projectId, data.versionId);
    const { logger } = await import("../log.server");
    logger("history").info("version.restore", {
      projectId: data.projectId,
      versionId: data.versionId,
    });
    return version;
  });

export const createManualCheckpoint = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, label: z.string().trim().min(1).max(200) }).parse(data),
  )
  .handler(async ({ data }) => {
    const version = await createCheckpoint({
      projectId: data.projectId,
      label: data.label,
      status: "manual",
    });
    return { version };
  });

/* ---------------------------- deployments ---------------------------- */

export const getDeployments = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => ({
    providers: deploymentProviders(),
    deployments: deploymentsRepo.list(data.projectId),
  }));

export const deployProject = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z.object({ projectId: projectIdSchema, providerId: z.string().max(60) }).parse(data),
  )
  .handler(async ({ data }) => startDeployment(data.projectId, data.providerId));

export const cancelProjectDeployment = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ deploymentId: deploymentIdSchema }).parse(data))
  .handler(async ({ data }) => ({ cancelled: cancelDeployment(data.deploymentId) }));

/* ---------------------------- connections & settings ---------------------------- */

export const getConnections = createServerFn({ method: "GET" }).handler(async () =>
  listConnections(),
);

export const getAppSettings = createServerFn({ method: "GET" }).handler(async () => {
  const env = serverEnv();
  return {
    defaultModelId: settingsRepo.get<string | null>("defaultModelId", null),
    displayName: settingsRepo.get<string>("displayName", ""),
    editor: settingsRepo.get<"cursor" | "vscode" | "none">("editor", "cursor"),
    dataDirectory: dataPaths().root,
    projectCount: projectsRepo.list({ limit: 10_000 }).length,
    agent: { maxSteps: env.AGENT_MAX_STEPS, maxRepairAttempts: env.AGENT_MAX_REPAIR_ATTEMPTS },
    preview: {
      host: env.PREVIEW_HOST ?? "localhost",
      publicHost: env.PREVIEW_PUBLIC_HOST ?? "localhost",
      portRange: `${env.PREVIEW_PORT_START}–${env.PREVIEW_PORT_END}`,
    },
  };
});

export const updateAppSettings = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        defaultModelId: modelIdSchema.nullable().optional(),
        displayName: z.string().trim().max(60).optional(),
        editor: z.enum(["cursor", "vscode", "none"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    if (data.defaultModelId !== undefined) settingsRepo.set("defaultModelId", data.defaultModelId);
    if (data.displayName !== undefined) settingsRepo.set("displayName", data.displayName);
    if (data.editor !== undefined) settingsRepo.set("editor", data.editor);
    return { ok: true };
  });
