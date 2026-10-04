import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  WorkspaceBoundaryError,
  isSecretPath,
  normalizeRelative,
  resolveInside,
} from "@/lib/workspace/paths.server";
import { Workspace } from "@/lib/workspace/workspace-manager.server";

let root: string;
let outside: string;

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), "pulse-ws-"));
  outside = fs.mkdtempSync(path.join(os.tmpdir(), "pulse-outside-"));
  fs.writeFileSync(path.join(outside, "secret.txt"), "top secret");
});

afterEach(() => {
  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

describe("normalizeRelative", () => {
  it("cleans ordinary relative paths", () => {
    expect(normalizeRelative("src/App.tsx")).toBe("src/App.tsx");
    expect(normalizeRelative("./src//components/../App.tsx")).toBe("src/App.tsx");
    expect(normalizeRelative("src\\App.tsx")).toBe("src/App.tsx");
    expect(normalizeRelative(".")).toBe("");
  });

  it.each([
    "../etc/passwd",
    "../../x",
    "src/../../x",
    "/etc/passwd",
    "C:\\Windows",
    "~/secret",
    "a\0b",
  ])("rejects %s", (input) => {
    expect(() => normalizeRelative(input)).toThrow(WorkspaceBoundaryError);
  });
});

describe("resolveInside", () => {
  it("resolves inside the root", () => {
    expect(resolveInside(root, "src/a.ts")).toBe(path.join(root, "src/a.ts"));
  });

  it("rejects symlinks that point outside the workspace", () => {
    fs.symlinkSync(outside, path.join(root, "escape"));
    expect(() => resolveInside(root, "escape/secret.txt")).toThrow(/symlink/);
    expect(() => resolveInside(root, "escape/new-file.txt")).toThrow(/symlink/);
  });

  it("allows symlinks that stay inside", () => {
    fs.mkdirSync(path.join(root, "real"));
    fs.symlinkSync(path.join(root, "real"), path.join(root, "alias"));
    expect(() => resolveInside(root, "alias/file.txt")).not.toThrow();
  });
});

describe("secret files", () => {
  it("flags env files and keys but not .env.example", () => {
    expect(isSecretPath(".env")).toBe(true);
    expect(isSecretPath(".env.local")).toBe(true);
    expect(isSecretPath("config/server.pem")).toBe(true);
    expect(isSecretPath(".env.example")).toBe(false);
    expect(isSecretPath("src/env.ts")).toBe(false);
  });
});

describe("Workspace", () => {
  it("writes, reads, renames, lists, searches and deletes", () => {
    const ws = new Workspace(root);
    expect(ws.writeFile("src/App.tsx", "export const a = 1;\n").created).toBe(true);
    expect(ws.writeFile("src/App.tsx", "export const a = 2;\n").created).toBe(false);
    expect(ws.readFile("src/App.tsx")).toContain("a = 2");

    ws.writeFile("node_modules/x/index.js".replace("node_modules/", "lib/"), "x");
    expect(ws.listFiles()).toEqual(["lib/x/index.js", "src/App.tsx"]);

    ws.rename("src/App.tsx", "src/Main.tsx");
    expect(ws.exists("src/App.tsx")).toBe(false);
    expect(ws.search("a = 2")).toEqual([
      { path: "src/Main.tsx", line: 1, text: "export const a = 2;" },
    ]);

    const tree = ws.tree();
    expect(tree.children?.map((node) => node.name)).toEqual(["lib", "src"]);

    ws.delete("src");
    expect(ws.exists("src")).toBe(false);
  });

  it("refuses escapes, secrets, .git and the root", () => {
    const ws = new Workspace(root);
    expect(() => ws.writeFile("../evil.txt", "x")).toThrow(WorkspaceBoundaryError);
    expect(() => ws.writeFile(".env", "KEY=1")).toThrow(/secrets/);
    expect(() => ws.writeFile(".git/config", "x")).toThrow(/not allowed/);
    expect(() => ws.delete("")).toThrow(/root/);
    fs.writeFileSync(path.join(root, ".env"), "KEY=1");
    expect(() => ws.readFile(".env")).toThrow(/secrets/);
    expect(() => ws.rename(".env", "../stolen")).toThrow(WorkspaceBoundaryError);
  });

  it("ignores noisy directories when listing", () => {
    const ws = new Workspace(root);
    fs.mkdirSync(path.join(root, "node_modules/react"), { recursive: true });
    fs.writeFileSync(path.join(root, "node_modules/react/index.js"), "");
    fs.mkdirSync(path.join(root, "dist"));
    fs.writeFileSync(path.join(root, "dist/a.js"), "");
    ws.writeFile("index.html", "<html></html>");
    expect(ws.listFiles()).toEqual(["index.html"]);
    expect(ws.listFiles({ includeIgnored: true })).toContain("node_modules/react/index.js");
  });
});
