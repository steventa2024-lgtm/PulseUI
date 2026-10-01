/**
 * Central server-side configuration. Every environment variable PulseUI reads
 * is resolved here, validated once, and never shipped to the browser.
 */
import os from "node:os";
import path from "node:path";
import { z } from "zod";

const intFromEnv = (fallback: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((value) => {
      const parsed = value ? Number.parseInt(value, 10) : Number.NaN;
      if (Number.isNaN(parsed)) return fallback;
      return Math.min(max, Math.max(min, parsed));
    });

const optionalString = z
  .string()
  .optional()
  .transform((value) => (value && value.trim() ? value.trim() : undefined));

const envSchema = z.object({
  PULSEUI_DATA_DIR: optionalString,
  PULSEUI_STARTERS_DIR: optionalString,

  AI_PROVIDER: optionalString,
  AI_MODEL: optionalString,
  AI_BASE_URL: optionalString,
  AI_API_KEY: optionalString,

  GEMINI_API_KEY: optionalString,
  GOOGLE_API_KEY: optionalString,
  GEMINI_MODEL: optionalString,

  OPENROUTER_API_KEY: optionalString,
  OPENROUTER_MODEL: optionalString,

  LOCAL_AI_BASE_URL: optionalString,
  LOCAL_AI_MODEL: optionalString,

  AGENT_MAX_STEPS: intFromEnv(16, 2, 64),
  AGENT_MAX_REPAIR_ATTEMPTS: intFromEnv(3, 0, 10),

  PREVIEW_HOST: optionalString,
  PREVIEW_PUBLIC_HOST: optionalString,
  PREVIEW_PORT_START: intFromEnv(4100, 1024, 65000),
  PREVIEW_PORT_END: intFromEnv(4999, 1025, 65535),
  PREVIEW_READY_TIMEOUT_MS: intFromEnv(90_000, 5_000, 600_000),

  COMMAND_TIMEOUT_MS: intFromEnv(300_000, 5_000, 1_800_000),
  INSTALL_TIMEOUT_MS: intFromEnv(600_000, 10_000, 3_600_000),

  GITHUB_TOKEN: optionalString,

  SUPABASE_URL: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  RESEND_API_KEY: optionalString,
});

export type ServerEnv = z.infer<typeof envSchema>;

let cached: ServerEnv | undefined;

export function serverEnv(): ServerEnv {
  if (!cached) cached = envSchema.parse(process.env);
  return cached;
}

/** Tests flip env vars between cases; this drops the memoized copy. */
export function resetServerEnvCache(): void {
  cached = undefined;
}

export type DataPaths = {
  root: string;
  database: string;
  workspaces: string;
  history: string;
  deployments: string;
};

/**
 * Runtime storage lives OUTSIDE the PulseUI source tree by default. Generated
 * projects nested inside this repo would otherwise resolve missing packages
 * from PulseUI's own node_modules and "work" only on this machine.
 */
export function dataPaths(): DataPaths {
  const root = path.resolve(serverEnv().PULSEUI_DATA_DIR ?? path.join(os.homedir(), ".pulseui"));
  return {
    root,
    database: path.join(root, "pulseui.db"),
    workspaces: path.join(root, "workspaces"),
    history: path.join(root, "history"),
    deployments: path.join(root, "deployments"),
  };
}

export function startersDir(): string {
  return path.resolve(serverEnv().PULSEUI_STARTERS_DIR ?? path.join(process.cwd(), "starters"));
}
