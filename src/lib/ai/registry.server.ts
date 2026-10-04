/**
 * Provider registry: turns server configuration into concrete providers and
 * the model list the composer shows. Only providers that are actually
 * configured (or a local server that actually answered) are listed.
 *
 * Environment (see .env.example):
 *   AI_PROVIDER   gemini | openai | openrouter | ollama | lmstudio | local | mock
 *   AI_MODEL      default model for AI_PROVIDER
 *   AI_BASE_URL   OpenAI-compatible base URL (AI_PROVIDER=openai)
 *   AI_API_KEY    key for AI_BASE_URL
 *   GEMINI_API_KEY / GOOGLE_API_KEY, GEMINI_MODEL
 *   OPENROUTER_API_KEY, OPENROUTER_MODEL
 *   LOCAL_AI_BASE_URL, LOCAL_AI_MODEL (legacy, still supported)
 */
import { serverEnv } from "../config/env.server";
import type { ModelOption } from "../domain/types";
import { DEFAULT_GEMINI_MODEL, GeminiProvider } from "./providers/gemini.server";
import { MockProvider } from "./providers/mock.server";
import {
  OpenAICompatibleProvider,
  listOpenAIModels,
  modelLikelySupportsVision,
  trimBaseUrl,
} from "./providers/openai-compatible.server";
import type { AIProvider } from "./types";

export const OLLAMA_BASE_URL = "http://127.0.0.1:11434/v1";
export const LMSTUDIO_BASE_URL = "http://127.0.0.1:1234/v1";
const OPENROUTER_BASE_URL = "https://openrouter.ai/api/v1";

type ProviderSpec = {
  id: string;
  label: string;
  local: boolean;
  models: string[];
  create: (model: string) => AIProvider;
};

function localLabel(baseUrl: string): string {
  if (baseUrl.includes(":11434")) return "Ollama";
  if (baseUrl.includes(":1234")) return "LM Studio";
  return "Local model";
}

/** Providers declared purely by configuration (no network). */
export function configuredProviderSpecs(): ProviderSpec[] {
  const env = serverEnv();
  const specs: ProviderSpec[] = [];
  const preferred = env.AI_PROVIDER?.toLowerCase();

  if (preferred === "mock") {
    specs.push({
      id: "mock",
      label: "Mock (test)",
      local: true,
      models: ["pulse-mock"],
      create: () => new MockProvider(),
    });
  }

  const geminiKey =
    env.GEMINI_API_KEY ??
    env.GOOGLE_API_KEY ??
    (preferred === "gemini" ? env.AI_API_KEY : undefined);
  if (geminiKey) {
    const model =
      env.GEMINI_MODEL ??
      (preferred === "gemini" ? env.AI_MODEL : undefined) ??
      DEFAULT_GEMINI_MODEL;
    specs.push({
      id: "gemini",
      label: "Gemini",
      local: false,
      models: [model],
      create: (chosen) => new GeminiProvider(geminiKey, chosen),
    });
  }

  if (
    env.AI_BASE_URL &&
    env.AI_MODEL &&
    (!preferred || preferred === "openai" || preferred === "custom")
  ) {
    const baseUrl = env.AI_BASE_URL;
    const apiKey = env.AI_API_KEY;
    specs.push({
      id: "openai",
      label: "OpenAI-compatible",
      local: /localhost|127\.0\.0\.1/.test(baseUrl),
      models: [env.AI_MODEL],
      create: (model) =>
        new OpenAICompatibleProvider({
          id: "openai",
          label: "OpenAI-compatible",
          baseUrl,
          model,
          ...(apiKey ? { apiKey } : {}),
          local: /localhost|127\.0\.0\.1/.test(baseUrl),
        }),
    });
  }

  const openRouterKey =
    env.OPENROUTER_API_KEY ?? (preferred === "openrouter" ? env.AI_API_KEY : undefined);
  const openRouterModel =
    env.OPENROUTER_MODEL ?? (preferred === "openrouter" ? env.AI_MODEL : undefined);
  if (openRouterKey && openRouterModel) {
    specs.push({
      id: "openrouter",
      label: "OpenRouter",
      local: false,
      models: [openRouterModel],
      create: (model) =>
        new OpenAICompatibleProvider({
          id: "openrouter",
          label: "OpenRouter",
          baseUrl:
            env.AI_BASE_URL && preferred === "openrouter" ? env.AI_BASE_URL : OPENROUTER_BASE_URL,
          model,
          apiKey: openRouterKey,
          local: false,
          extraHeaders: { "X-Title": "PulseUI" },
        }),
    });
  }

  const localModel =
    env.LOCAL_AI_MODEL ??
    (preferred === "ollama" || preferred === "lmstudio" || preferred === "local"
      ? env.AI_MODEL
      : undefined);
  if (localModel) {
    const baseUrl = trimBaseUrl(
      env.LOCAL_AI_BASE_URL ??
        (preferred === "lmstudio"
          ? LMSTUDIO_BASE_URL
          : preferred === "local" && env.AI_BASE_URL
            ? env.AI_BASE_URL
            : OLLAMA_BASE_URL),
    );
    specs.push(localSpec(baseUrl, [localModel]));
  }

  return specs;
}

function localSpec(baseUrl: string, models: string[]): ProviderSpec {
  const label = localLabel(baseUrl);
  const id = label === "Ollama" ? "ollama" : label === "LM Studio" ? "lmstudio" : "local";
  return {
    id,
    label,
    local: true,
    models,
    create: (model) => new OpenAICompatibleProvider({ id, label, baseUrl, model, local: true }),
  };
}

/**
 * Configured providers plus local servers discovered on their default ports.
 * Discovery is what lets the selector show "only local Qwen" when that is all
 * there is, without anyone typing a model name.
 */
export async function availableProviderSpecs(): Promise<ProviderSpec[]> {
  const specs = configuredProviderSpecs();
  const probes = [OLLAMA_BASE_URL, LMSTUDIO_BASE_URL];
  const configuredLocal = specs.find(
    (spec) => spec.local && spec.id !== "mock" && spec.id !== "openai",
  );
  const results = await Promise.all(probes.map((url) => listOpenAIModels(url, { timeoutMs: 800 })));

  probes.forEach((url, index) => {
    const models = results[index];
    if (!models?.length) return;
    const spec = localSpec(url, models);
    const existing = specs.find((candidate) => candidate.id === spec.id);
    if (existing) {
      existing.models = [...new Set([...existing.models, ...models])];
    } else if (!configuredLocal || configuredLocal.id !== spec.id) {
      specs.push(spec);
    }
  });
  return specs;
}

export function modelOptionsFrom(specs: ProviderSpec[]): ModelOption[] {
  return specs.flatMap((spec) =>
    spec.models.map((model) => ({
      id: `${spec.id}:${model}`,
      providerId: spec.id,
      providerLabel: spec.label,
      model,
      local: spec.local,
      supportsVision:
        spec.id === "gemini" || (spec.id !== "mock" && modelLikelySupportsVision(model)),
    })),
  );
}

export function defaultModelId(specs: ProviderSpec[]): string | null {
  const preferred = serverEnv().AI_PROVIDER?.toLowerCase();
  const first =
    specs.find((spec) => spec.id === preferred) ??
    specs.find((spec) => (preferred === "local" ? spec.local : false)) ??
    specs[0];
  const model = first?.models[0];
  return first && model ? `${first.id}:${model}` : null;
}

export class NoProviderError extends Error {
  constructor() {
    super(
      "No AI provider is configured. Set GEMINI_API_KEY, AI_BASE_URL + AI_MODEL, OPENROUTER_API_KEY, or LOCAL_AI_MODEL (Ollama / LM Studio) in .env.local.",
    );
    this.name = "NoProviderError";
  }
}

/** Resolve "providerId:model" (or the default) into a provider instance. */
export async function resolveProvider(modelId?: string | null): Promise<AIProvider> {
  const configured = configuredProviderSpecs();
  const specs =
    modelId && !configured.some((spec) => modelId.startsWith(`${spec.id}:`))
      ? await availableProviderSpecs()
      : configured.length
        ? configured
        : await availableProviderSpecs();
  const target = modelId ?? defaultModelId(specs);
  if (!target) throw new NoProviderError();
  const separator = target.indexOf(":");
  const providerId = separator === -1 ? target : target.slice(0, separator);
  const model = separator === -1 ? "" : target.slice(separator + 1);
  const spec = specs.find((candidate) => candidate.id === providerId);
  if (!spec) {
    const fallback = defaultModelId(specs);
    if (!fallback || fallback === target) throw new NoProviderError();
    return resolveProvider(fallback);
  }
  return spec.create(model || spec.models[0] || "");
}

/** Local fallback when a hosted provider fails before streaming starts. */
export function resolveFallbackProvider(primaryId: string): AIProvider | null {
  if (primaryId === "mock") return null;
  const local = configuredProviderSpecs().find(
    (spec) => spec.local && spec.id !== primaryId && spec.id !== "mock",
  );
  const model = local?.models[0];
  return local && model ? local.create(model) : null;
}
