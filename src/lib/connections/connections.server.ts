/**
 * Connection status derived from real server configuration and live probes.
 * Nothing here is hardcoded as "connected": each card reflects an env var
 * that is actually set or a local server that actually answered.
 */
import { OLLAMA_BASE_URL, LMSTUDIO_BASE_URL, configuredProviderSpecs } from "../ai/registry.server";
import { listOpenAIModels } from "../ai/providers/openai-compatible.server";
import { serverEnv } from "../config/env.server";
import type { ConnectionInfo } from "../domain/types";

export async function listConnections(): Promise<ConnectionInfo[]> {
  const env = serverEnv();
  const specs = configuredProviderSpecs();
  const [ollama, lmstudio] = await Promise.all([
    listOpenAIModels(
      env.LOCAL_AI_BASE_URL?.includes(":11434") ? env.LOCAL_AI_BASE_URL : OLLAMA_BASE_URL,
      { timeoutMs: 900 },
    ),
    listOpenAIModels(
      env.LOCAL_AI_BASE_URL?.includes(":1234") ? env.LOCAL_AI_BASE_URL : LMSTUDIO_BASE_URL,
      { timeoutMs: 900 },
    ),
  ]);

  const gemini = specs.find((spec) => spec.id === "gemini");
  const openai = specs.find((spec) => spec.id === "openai");
  const openrouter = specs.find((spec) => spec.id === "openrouter");
  const mock = specs.find((spec) => spec.id === "mock");

  const connections: ConnectionInfo[] = [
    {
      id: "github",
      name: "GitHub",
      category: "source",
      state: env.GITHUB_TOKEN ? "connected" : "not_connected",
      detail: env.GITHUB_TOKEN
        ? "GITHUB_TOKEN is set — private repositories can be imported."
        : "Public repositories can be imported without a token. Set GITHUB_TOKEN for private repositories.",
      envVars: ["GITHUB_TOKEN"],
    },
    {
      id: "gemini",
      name: "Google Gemini",
      category: "ai",
      state: gemini ? "connected" : "not_connected",
      detail: gemini
        ? `Model: ${gemini.models.join(", ")}`
        : "Set GEMINI_API_KEY (or GOOGLE_API_KEY).",
      envVars: ["GEMINI_API_KEY", "GEMINI_MODEL"],
    },
    {
      id: "openai",
      name: "OpenAI-compatible",
      category: "ai",
      state: openai ? "connected" : "not_connected",
      detail: openai
        ? `Model: ${openai.models.join(", ")} via ${env.AI_BASE_URL}`
        : "Set AI_BASE_URL, AI_MODEL and AI_API_KEY for any OpenAI-compatible endpoint.",
      envVars: ["AI_BASE_URL", "AI_MODEL", "AI_API_KEY"],
    },
    {
      id: "openrouter",
      name: "OpenRouter",
      category: "ai",
      state: openrouter ? "connected" : "not_connected",
      detail: openrouter
        ? `Model: ${openrouter.models.join(", ")}`
        : "Set OPENROUTER_API_KEY and OPENROUTER_MODEL.",
      envVars: ["OPENROUTER_API_KEY", "OPENROUTER_MODEL"],
    },
    {
      id: "ollama",
      name: "Ollama",
      category: "ai",
      state: ollama ? "local" : "unavailable",
      detail: ollama
        ? ollama.length
          ? `Running locally with ${ollama.length} model(s): ${ollama.slice(0, 4).join(", ")}${ollama.length > 4 ? "…" : ""}`
          : "Running, but no models are pulled. Try: ollama pull qwen2.5-coder:7b"
        : "Not running on 127.0.0.1:11434.",
      envVars: ["LOCAL_AI_BASE_URL", "LOCAL_AI_MODEL"],
    },
    {
      id: "lmstudio",
      name: "LM Studio",
      category: "ai",
      state: lmstudio ? "local" : "unavailable",
      detail: lmstudio
        ? `Server running with ${lmstudio.length} model(s).`
        : "Local server not running on 127.0.0.1:1234.",
      envVars: ["LOCAL_AI_BASE_URL", "LOCAL_AI_MODEL"],
    },
    {
      id: "supabase",
      name: "Supabase",
      category: "backend",
      state: env.SUPABASE_URL ? "connected" : "not_connected",
      detail: env.SUPABASE_URL
        ? "SUPABASE_URL is set on the server. PulseUI does not inject it into generated apps automatically."
        : "Set SUPABASE_URL to record your project. Generated apps never receive server secrets.",
      envVars: ["SUPABASE_URL"],
    },
    {
      id: "stripe",
      name: "Stripe",
      category: "payments",
      state: env.STRIPE_SECRET_KEY ? "connected" : "not_connected",
      detail: env.STRIPE_SECRET_KEY
        ? "STRIPE_SECRET_KEY is set on the server. It is never exposed to generated apps."
        : "Set STRIPE_SECRET_KEY to make Stripe available to future server-side integrations.",
      envVars: ["STRIPE_SECRET_KEY"],
    },
    {
      id: "resend",
      name: "Resend",
      category: "email",
      state: env.RESEND_API_KEY ? "connected" : "not_connected",
      detail: env.RESEND_API_KEY
        ? "RESEND_API_KEY is set on the server."
        : "Set RESEND_API_KEY for transactional email.",
      envVars: ["RESEND_API_KEY"],
    },
  ];

  if (mock) {
    connections.unshift({
      id: "mock",
      name: "Mock provider",
      category: "ai",
      state: "local",
      detail: "AI_PROVIDER=mock — deterministic test provider. Not a real model.",
      envVars: ["AI_PROVIDER"],
    });
  }
  return connections;
}
