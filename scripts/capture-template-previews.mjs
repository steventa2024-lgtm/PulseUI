#!/usr/bin/env node
// Renders every starter template for real and saves a screenshot as its
// gallery card image (public/templates/<id>.jpg). Run after changing a
// template:  bun run templates:screenshots
//
// Needs Chromium: set CHROMIUM_PATH, or install Playwright's browsers.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { chromium } from "playwright-core";

const root = path.resolve(import.meta.dirname, "..");
const startersDir = path.join(root, "starters");
const outDir = path.join(root, "public", "templates");
const templates = fs.readdirSync(path.join(startersDir, "templates"));
const work = fs.mkdtempSync(path.join(os.tmpdir(), "pulseui-templates-"));
const port = 4790;

fs.cpSync(path.join(startersDir, "base"), work, { recursive: true });
console.log(`Installing starter dependencies in ${work}…`);
execFileSync(hasBun() ? "bun" : "npm", ["install"], { cwd: work, stdio: "inherit" });

function hasBun() {
  try {
    execFileSync("bun", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

async function waitFor(url, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
fs.mkdirSync(outDir, { recursive: true });

for (const id of templates) {
  fs.rmSync(path.join(work, "src"), { recursive: true, force: true });
  fs.cpSync(path.join(startersDir, "base", "src"), path.join(work, "src"), { recursive: true });
  fs.cpSync(path.join(startersDir, "templates", id, "src"), path.join(work, "src"), {
    recursive: true,
  });

  const server = spawn(
    path.join(work, "node_modules", ".bin", "vite"),
    ["--port", String(port), "--strictPort"],
    {
      cwd: work,
      stdio: "ignore",
      detached: true,
    },
  );
  try {
    await waitFor(`http://127.0.0.1:${port}/`);
    const page = await browser.newPage({
      viewport: { width: 1280, height: 800 },
      deviceScaleFactor: 1,
    });
    await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, `${id}.jpg`), type: "jpeg", quality: 82 });
    await page.close();
    console.log(`✓ ${id}`);
  } finally {
    process.kill(-server.pid, "SIGTERM");
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
}

await browser.close();
fs.rmSync(work, { recursive: true, force: true });
