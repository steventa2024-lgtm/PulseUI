/**
 * Every starter template must install, type-check and build on top of the
 * base starter — exactly what PulseUI does when a user picks it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { TEMPLATES } from "@/lib/templates/registry";

const starters = path.resolve("starters");
let work = "";

function run(bin: string, args: string[]) {
  try {
    execFileSync(path.join(work, "node_modules", ".bin", bin), args, { cwd: work, stdio: "pipe" });
    return "";
  } catch (error) {
    const failure = error as { stdout?: Buffer; stderr?: Buffer };
    return `${failure.stdout?.toString() ?? ""}${failure.stderr?.toString() ?? ""}`;
  }
}

beforeAll(() => {
  work = fs.mkdtempSync(path.join(os.tmpdir(), "pulseui-templates-"));
  fs.cpSync(path.join(starters, "base"), work, { recursive: true });
  let pm = "npm";
  try {
    execFileSync("bun", ["--version"], { stdio: "ignore" });
    pm = "bun";
  } catch {
    // npm fallback
  }
  execFileSync(pm, ["install"], { cwd: work, stdio: "ignore" });
});

afterAll(() => {
  fs.rmSync(work, { recursive: true, force: true });
});

describe("starter templates", () => {
  it("registry entries all have starter files and preview images", () => {
    for (const template of TEMPLATES) {
      expect(
        fs.existsSync(path.join(starters, "templates", template.id, "src", "App.tsx")),
        template.id,
      ).toBe(true);
      expect(fs.existsSync(path.join("public", template.image)), template.image).toBe(true);
    }
  });

  it("the base starter (shadcn/ui, router, design tokens) type-checks and builds", () => {
    fs.rmSync(path.join(work, "src"), { recursive: true, force: true });
    fs.cpSync(path.join(starters, "base", "src"), path.join(work, "src"), { recursive: true });
    expect(run("tsc", ["--noEmit", "-p", "."])).toBe("");
    expect(run("vite", ["build", "--logLevel", "error"])).toBe("");
  });

  it.each(TEMPLATES.map((template) => template.id))("%s type-checks and builds", (id) => {
    fs.rmSync(path.join(work, "src"), { recursive: true, force: true });
    fs.cpSync(path.join(starters, "base", "src"), path.join(work, "src"), { recursive: true });
    fs.cpSync(path.join(starters, "templates", id, "src"), path.join(work, "src"), {
      recursive: true,
    });
    expect(run("tsc", ["--noEmit", "-p", "."])).toBe("");
    expect(run("vite", ["build", "--logLevel", "error"])).toBe("");
  });
});
