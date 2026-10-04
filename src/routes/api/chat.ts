import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { NoProviderError, resolveProvider } from "@/lib/ai/registry.server";
import { logger } from "@/lib/log.server";

const log = logger("chat");

const bodySchema = z.object({
  modelId: z.string().max(240).nullable().optional(),
  messages: z
    .array(
      z.object({ role: z.enum(["user", "assistant"]), content: z.string().min(1).max(20_000) }),
    )
    .min(1)
    .max(40),
});

const SYSTEM = `You are Pulse, the assistant inside PulseUI — an AI app builder where users describe an app and an agent builds a real React + TypeScript + Vite project with live preview, version history and deployment.
In this chat you answer questions: product ideas, architecture, tech choices, how to phrase a build request, how PulseUI works. You cannot see or change the user's projects from here; when they want something built, suggest a concise prompt they can paste into the "Ask Pulse to build your app" composer.
Be concise and practical. Use short paragraphs or lists.`;

/**
 * General-purpose chat with the configured model (no tools, no project
 * access). Streams plain text. Same-origin only, since it spends model quota.
 */
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const origin = request.headers.get("origin");
        if (origin && new URL(origin).host !== new URL(request.url).host) {
          return new Response("Cross-origin requests are not allowed", { status: 403 });
        }
        let body: z.infer<typeof bodySchema>;
        try {
          body = bodySchema.parse(await request.json());
        } catch {
          return new Response("Invalid request", { status: 400 });
        }

        let provider;
        try {
          provider = await resolveProvider(body.modelId ?? null);
        } catch (error) {
          const message =
            error instanceof NoProviderError ? error.message : "No AI provider is available.";
          return new Response(message, { status: 503 });
        }

        const encoder = new TextEncoder();
        const controller = new AbortController();
        request.signal.addEventListener("abort", () => controller.abort());

        const stream = new ReadableStream<Uint8Array>({
          async start(sink) {
            try {
              for await (const delta of provider.stream({
                messages: [{ role: "system", content: SYSTEM }, ...body.messages],
                signal: controller.signal,
                maxTokens: 2000,
              })) {
                sink.enqueue(encoder.encode(delta));
              }
            } catch (error) {
              if (!controller.signal.aborted) {
                log.warn("chat.error", {
                  error: error instanceof Error ? error.message : String(error),
                });
                sink.enqueue(
                  encoder.encode(
                    `\n\n[Error: ${error instanceof Error ? error.message : "the model failed"}]`,
                  ),
                );
              }
            } finally {
              sink.close();
            }
          },
          cancel() {
            controller.abort();
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-cache",
            "x-pulse-model": `${provider.label} · ${provider.model}`,
          },
        });
      },
    },
  },
});
