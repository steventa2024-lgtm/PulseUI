import fs from "node:fs";
import path from "node:path";

import { createFileRoute } from "@tanstack/react-router";

import { resolveSiteFile } from "@/lib/deployment/deployment.server";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
};

/** Serves sites published by the "local static hosting" deployment provider. */
export const Route = createFileRoute("/sites/$deploymentId/$")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const file = resolveSiteFile(params.deploymentId, params._splat ?? "");
        if (!file) return new Response("Not found", { status: 404 });
        return new Response(fs.readFileSync(file), {
          headers: {
            "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
            "cache-control": "no-cache",
            // Published apps are untrusted: keep them from scripting PulseUI's origin.
            "content-security-policy":
              "sandbox allow-scripts allow-forms allow-popups allow-modals",
            "x-content-type-options": "nosniff",
            // The sandbox gives the page an opaque origin, so its module scripts load cross-origin.
            "access-control-allow-origin": "*",
          },
        });
      },
    },
  },
});
