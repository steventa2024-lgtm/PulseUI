import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCommand, sandboxEnv } from "@/lib/commands/command-runner.server";

let dir: string;
beforeAll(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "pulse-cmd-"));
  fs.writeFileSync(path.join(dir, "env.js"), "console.log(JSON.stringify(process.env));");
  fs.writeFileSync(path.join(dir, "fail.js"), "console.error('boom'); process.exit(3);");
  fs.writeFileSync(path.join(dir, "sleep.js"), "setTimeout(() => console.log('late'), 60000);");
});
afterAll(() => fs.rmSync(dir, { recursive: true, force: true }));

describe("CommandRunner", () => {
  it("captures stdout and exit code", async () => {
    const result = await runCommand("node --version", { cwd: dir, timeoutMs: 10_000 });
    expect(result.ok).toBe(true);
    expect(result.stdout).toMatch(/^v\d+/);
  });

  it("reports failures with stderr", async () => {
    const result = await runCommand("node fail.js", { cwd: dir, timeoutMs: 10_000 });
    expect(result.ok).toBe(false);
    expect(result.exitCode).toBe(3);
    expect(result.stderr).toContain("boom");
  });

  it("never passes secrets to child processes", async () => {
    process.env["GEMINI_API_KEY"] = "should-not-leak";
    process.env["GITHUB_TOKEN"] = "should-not-leak";
    const result = await runCommand("node env.js", { cwd: dir, timeoutMs: 10_000 });
    const childEnv = JSON.parse(result.stdout) as Record<string, string>;
    expect(childEnv["GEMINI_API_KEY"]).toBeUndefined();
    expect(childEnv["GITHUB_TOKEN"]).toBeUndefined();
    expect(childEnv["CI"]).toBe("1");
    expect(Object.keys(sandboxEnv())).not.toContain("GEMINI_API_KEY");
    delete process.env["GEMINI_API_KEY"];
    delete process.env["GITHUB_TOKEN"];
  });

  it("times out and kills the process", async () => {
    const result = await runCommand("node sleep.js", { cwd: dir, timeoutMs: 500 });
    expect(result.timedOut).toBe(true);
    expect(result.ok).toBe(false);
  });

  it("can be aborted", async () => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), 200);
    const result = await runCommand("node sleep.js", {
      cwd: dir,
      timeoutMs: 30_000,
      signal: controller.signal,
    });
    expect(result.aborted).toBe(true);
  });

  it("rejects disallowed commands before spawning", async () => {
    await expect(runCommand("rm -rf .", { cwd: dir, timeoutMs: 1000 })).rejects.toThrow(
      /not an allowed/,
    );
  });
});
