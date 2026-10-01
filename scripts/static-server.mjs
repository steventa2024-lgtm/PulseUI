#!/usr/bin/env node
// Minimal static file server used to preview plain-HTML projects and local
// static deployments. Runs as a child process, never inside PulseUI itself.
// Usage: static-server.mjs <directory> <port> [host]
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const [, , dirArg = ".", portArg = "4100", host = "127.0.0.1"] = process.argv;
const root = fs.realpathSync(path.resolve(dirArg));
const port = Number.parseInt(portArg, 10);

const TYPES = {
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

function resolveSafe(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0] ?? "/");
  const target = path.resolve(root, `.${decoded}`);
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  try {
    const real = fs.realpathSync(target);
    if (real !== root && !real.startsWith(root + path.sep)) return null;
    return real;
  } catch {
    return target;
  }
}

const server = http.createServer((req, res) => {
  let file = resolveSafe(req.url ?? "/");
  if (!file) {
    res.writeHead(403).end("Forbidden");
    return;
  }
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file)) {
    // SPA fallback.
    const index = path.join(root, "index.html");
    if (fs.existsSync(index) && !path.extname(req.url ?? "")) file = index;
    else {
      res.writeHead(404, { "content-type": "text/plain" }).end("Not found");
      return;
    }
  }
  res.writeHead(200, {
    "content-type": TYPES[path.extname(file).toLowerCase()] ?? "application/octet-stream",
    "cache-control": "no-cache",
  });
  fs.createReadStream(file).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Static server ready at http://${host}:${port}/`);
});
