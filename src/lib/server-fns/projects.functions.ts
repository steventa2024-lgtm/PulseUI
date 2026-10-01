import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { startAgentRun, startSetupRun } from "../agent/runtime.server";
import { compact, projectSettingsSchema } from "../domain/types";
import { projectsRepo } from "../persistence/repositories.server";
import {
  createProject,
  deleteProject,
  ensureBooted,
  importFromGitHub,
  toProject,
  toSummary,
  updateProjectSettings,
} from "../projects/project-service.server";
import { TEMPLATES, getTemplate } from "../templates/registry";
import {
  attachmentsSchema,
  modeSchema,
  modelIdSchema,
  projectIdSchema,
  promptSchema,
} from "./validators";

export const listProjects = createServerFn({ method: "GET" })
  .validator((data: unknown) =>
    z.object({ query: z.string().max(200).optional() }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    ensureBooted();
    return projectsRepo.list(data.query ? { query: data.query } : {}).map(toSummary);
  });

export const getProject = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => {
    ensureBooted();
    const record = projectsRepo.get(data.projectId);
    if (!record) throw new Error("Project not found.");
    return toProject(record);
  });

/** Home composer: create a project and immediately start Pulse on the prompt. */
export const createProjectFromPrompt = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        prompt: promptSchema,
        mode: modeSchema,
        modelId: modelIdSchema.optional(),
        attachments: attachmentsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const project = await createProject({ prompt: data.prompt });
    try {
      const { runId } = await startAgentRun({
        projectId: project.id,
        prompt: data.prompt,
        mode: data.mode,
        modelId: data.modelId ?? null,
        attachments: data.attachments,
      });
      return { projectId: project.id, runId, error: null as string | null };
    } catch (error) {
      // The project exists; let the builder show why Pulse could not start.
      return {
        projectId: project.id,
        runId: null,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  });

export const createProjectFromTemplate = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ templateId: z.string().max(80) }).parse(data))
  .handler(async ({ data }) => {
    const template = getTemplate(data.templateId);
    if (!template) throw new Error("Unknown template.");
    const project = await createProject({ templateId: template.id });
    const { runId } = startSetupRun(project.id, template.name);
    return { projectId: project.id, runId };
  });

export const importGitHubProject = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({ url: z.string().url().max(300), branch: z.string().max(100).optional() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const project = await importFromGitHub(data.url, data.branch);
    const { runId } = startSetupRun(project.id, project.name);
    return { projectId: project.id, runId };
  });

export const updateProject = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        projectId: projectIdSchema,
        name: z.string().trim().min(1).max(120).optional(),
        description: z.string().max(2000).optional(),
        settings: projectSettingsSchema.partial().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const record = updateProjectSettings(data.projectId, {
      ...(data.name ? { name: data.name } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.settings ? { settings: compact(data.settings) } : {}),
    });
    return toProject(record);
  });

export const removeProject = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => {
    await deleteProject(data.projectId);
    return { ok: true };
  });

export const searchEverything = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ query: z.string().max(200) }).parse(data))
  .handler(async ({ data }) => {
    ensureBooted();
    const query = data.query.trim().toLowerCase();
    const projects = projectsRepo.list(query ? { query, limit: 20 } : { limit: 20 }).map(toSummary);
    const templates = TEMPLATES.filter(
      (template) =>
        !query ||
        template.name.toLowerCase().includes(query) ||
        template.category.toLowerCase().includes(query) ||
        template.description.toLowerCase().includes(query),
    );
    return { projects, templates };
  });
