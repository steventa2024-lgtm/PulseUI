import { createFileRoute } from "@tanstack/react-router";

import { isChannelOpen, subscribe } from "@/lib/agent/event-bus.server";
import { TERMINAL_STATES } from "@/lib/domain/types";
import { runsRepo } from "@/lib/persistence/repositories.server";

/**
 * Server-Sent Events for one agent run. Replays persisted events after
 * `?after=<seq>` and then streams live ones until the run ends, so a reloaded
 * browser picks up exactly where it left off.
 */
export const Route = createFileRoute("/api/runs/$runId/events")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!/^run_[a-z0-9]{6,40}$/.test(params.runId))
          return new Response("Invalid run id", { status: 400 });
        const run = runsRepo.get(params.runId);
        if (!run) return new Response("Run not found", { status: 404 });

        const after =
          Number.parseInt(new URL(request.url).searchParams.get("after") ?? "0", 10) || 0;
        const encoder = new TextEncoder();
        let cleanup = () => {};

        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            let closed = false;
            const close = () => {
              if (closed) return;
              closed = true;
              cleanup();
              try {
                controller.close();
              } catch {
                // Already closed by the client.
              }
            };
            const send = (chunk: string) => {
              if (closed) return;
              try {
                controller.enqueue(encoder.encode(chunk));
              } catch {
                close();
              }
            };

            const unsubscribe = subscribe(params.runId, after, (event) => {
              send(`id: ${event.seq}\nevent: agent\ndata: ${JSON.stringify(event)}\n\n`);
              if (
                event.type === "agent.completed" ||
                event.type === "agent.failed" ||
                event.type === "agent.cancelled"
              ) {
                send("event: end\ndata: {}\n\n");
                setTimeout(close, 20);
              }
            });
            const heartbeat = setInterval(() => send(": keep-alive\n\n"), 15_000);
            cleanup = () => {
              unsubscribe();
              clearInterval(heartbeat);
            };
            request.signal.addEventListener("abort", close);

            // A finished run whose channel is gone: everything was replayed above.
            const latest = runsRepo.get(params.runId);
            if (latest && TERMINAL_STATES.has(latest.state) && !isChannelOpen(params.runId)) {
              send("event: end\ndata: {}\n\n");
              setTimeout(close, 20);
            }
          },
          cancel() {
            cleanup();
          },
        });

        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            connection: "keep-alive",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
