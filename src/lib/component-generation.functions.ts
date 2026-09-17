import { createServerFn, RawStream } from "@tanstack/react-start";
import { z } from "zod";

import {
  SYSTEM_PROMPT,
  PLAN_SYSTEM_PROMPT,
  buildUserPrompt,
  resolveFallbackProvider,
  resolveProvider,
} from "./component-generation.server";

const inputSchema = z.object({
  prompt: z.string().trim().min(3).max(50000),
  modifiers: z.array(z.string().max(40)).max(8).default([]),
  mode: z.enum(["build", "plan"]).default("build"),
});

/**
 * Streams the generated component as NDJSON `StreamFrame` lines.
 *
 * Provider failures that happen before the first byte throw from here, so the
 * studio surfaces them as an ordinary server-function error. Once frames start
 * flowing the response is already committed, so later problems arrive as an
 * `error` frame instead.
 */
export const streamComponent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }) => {
    const provider = resolveProvider();
    const userPrompt = buildUserPrompt(data.prompt, data.modifiers);
    const systemPrompt = data.mode === "plan" ? PLAN_SYSTEM_PROMPT : SYSTEM_PROMPT;

    let stream: ReadableStream<Uint8Array>;
    let model = provider.label;

    try {
      stream = await provider.stream(systemPrompt, userPrompt);
    } catch (error) {
      // Nothing has been sent yet, so we are still free to try someone else.
      // This is the point of the local fallback: hosted tiers run out of quota,
      // a model on your own machine does not.
      const fallback = resolveFallbackProvider(provider.id);
      if (!fallback) throw error;

      console.warn(
        `${provider.label} failed (${error instanceof Error ? error.message : String(error)}); falling back to ${fallback.label}.`,
      );
      stream = await fallback.stream(systemPrompt, userPrompt);
      model = fallback.label;
    }

    // RawStream tells the RPC layer to multiplex this as binary frames rather
    // than serialize it. The client receives a plain ReadableStream back.
    return { stream: new RawStream(stream), model };
  });

/**
 * Which provider the server will actually use. Lets the studio show the real
 * model in its header, and warn up front when no key is configured instead of
 * failing on the user's first generation.
 */
export const getGeneratorInfo = createServerFn({ method: "GET" }).handler(async () => {
  try {
    const provider = resolveProvider();
    return { configured: true as const, model: provider.label, providerId: provider.id };
  } catch {
    return { configured: false as const, model: null, providerId: null };
  }
});
