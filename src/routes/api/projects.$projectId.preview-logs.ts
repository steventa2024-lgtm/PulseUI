import { createFileRoute } from "@tanstack/react-router";

import { getPreview, previewLogs, subscribePreview } from "@/lib/preview/preview-manager.server";

/** Server-Sent Events: preview status changes and dev-server output for a project. */
export const Route = createFileRoute("/api/projects/$projectId/preview-logs")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!/^prj_[a-z0-9]{6,40}$/.test(params.projectId))
          return new Response("Invalid project id", { status: 400 });
        const encoder = new TextEncoder();
        let cleanup = () => {};
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            let closed = false;
            const send = (event: string, data: unknown) => {
              if (closed) return;
              try {
                controller.enqueue(
                  encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`),
                );
              } catch {
                closed = true;
                cleanup();
              }
            };
            send("status", getPreview(params.projectId));
            send("logs", previewLogs(params.projectId, 300));
            const unsubscribe = subscribePreview(params.projectId, {
              onLog: (line) => send("log", line),
              onStatus: (info) => send("status", info),
            });
            const heartbeat = setInterval(() => {
              if (!closed) controller.enqueue(encoder.encode(": keep-alive\n\n"));
            }, 15_000);
            cleanup = () => {
              unsubscribe();
              clearInterval(heartbeat);
            };
            request.signal.addEventListener("abort", () => {
              closed = true;
              cleanup();
              try {
                controller.close();
              } catch {
                // ignore
              }
            });
          },
          cancel() {
            cleanup();
          },
        });
        return new Response(stream, {
          headers: {
            "content-type": "text/event-stream; charset=utf-8",
            "cache-control": "no-cache, no-transform",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
