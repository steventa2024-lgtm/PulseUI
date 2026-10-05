import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { availableProviderSpecs, defaultModelId, modelOptionsFrom } from "../ai/registry.server";
import { activeRunId, cancelRun, startAgentRun } from "../agent/runtime.server";
import {
  conversationsRepo,
  messagesRepo,
  projectsRepo,
  runsRepo,
  settingsRepo,
  toolCallsRepo,
} from "../persistence/repositories.server";
import { ensureBooted } from "../projects/project-service.server";
import {
  attachmentsSchema,
  modeSchema,
  modelIdSchema,
  projectIdSchema,
  promptSchema,
  runIdSchema,
} from "./validators";

export const sendMessage = createServerFn({ method: "POST" })
  .validator((data: unknown) =>
    z
      .object({
        projectId: projectIdSchema,
        prompt: promptSchema,
        mode: modeSchema,
        modelId: modelIdSchema.optional(),
        attachments: attachmentsSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    ensureBooted();
    const { runId } = await startAgentRun({
      projectId: data.projectId,
      prompt: data.prompt,
      mode: data.mode,
      modelId: data.modelId ?? null,
      attachments: data.attachments,
    });
    return { runId };
  });

export const cancelAgentRun = createServerFn({ method: "POST" })
  .validator((data: unknown) => z.object({ runId: runIdSchema }).parse(data))
  .handler(async ({ data }) => ({ cancelled: cancelRun(data.runId) }));

export const getConversation = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ projectId: projectIdSchema }).parse(data))
  .handler(async ({ data }) => {
    ensureBooted();
    if (!projectsRepo.get(data.projectId)) throw new Error("Project not found.");
    const conversation = conversationsRepo.primary(data.projectId);
    const runs = runsRepo.listForProject(data.projectId, 100);
    return {
      conversationId: conversation.id,
      messages: messagesRepo.list(conversation.id),
      runs,
      activeRunId: activeRunId(data.projectId),
    };
  });

export const getRunDetails = createServerFn({ method: "GET" })
  .validator((data: unknown) => z.object({ runId: runIdSchema }).parse(data))
  .handler(async ({ data }) => {
    const run = runsRepo.get(data.runId);
    if (!run) throw new Error("Run not found.");
    return { run, toolCalls: toolCallsRepo.list(run.id) };
  });

/** Real, currently available models — configured providers plus local servers that answered. */
export const getModels = createServerFn({ method: "GET" }).handler(async () => {
  const specs = await availableProviderSpecs();
  const models = modelOptionsFrom(specs);
  const preferred = settingsRepo.get<string | null>("defaultModelId", null);
  const fallback = defaultModelId(specs);
  return {
    models,
    defaultModelId:
      preferred && models.some((model) => model.id === preferred) ? preferred : fallback,
    configured: models.length > 0,
  };
});
