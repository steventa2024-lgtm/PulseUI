import { describe, expect, it } from "vitest";

import {
  CommandPolicyError,
  parseCommand,
  truncateOutput,
  validateCommand,
} from "@/lib/commands/command-policy";

describe("parseCommand", () => {
  it("splits argv and honours quotes", () => {
    expect(parseCommand("npm run build")).toEqual(["npm", "run", "build"]);
    expect(parseCommand(`git commit -m "fix: a & b"`)).toEqual([
      "git",
      "commit",
      "-m",
      "fix: a & b",
    ]);
  });

  it.each([
    "npm run build && rm -rf /",
    "ls | sh",
    "echo $(whoami)",
    "cat a > b",
    "npm run build; reboot",
    "echo `id`",
  ])("rejects shell syntax: %s", (command) => {
    expect(() => parseCommand(command)).toThrow(CommandPolicyError);
  });
});

describe("validateCommand", () => {
  it.each([
    "bun install",
    "npm run build",
    "pnpm add zod",
    "yarn",
    "git status",
    "git diff HEAD",
    "tsc --noEmit -p .",
  ])("allows %s", (command) => {
    expect(() => validateCommand(command)).not.toThrow();
  });

  it.each([
    ["sudo rm -rf /", /not an allowed executable/],
    ["rm -rf .", /not an allowed executable/],
    ["curl http://x", /not an allowed executable/],
    ["shutdown now", /not an allowed executable/],
    ["npm install -g evil", /Global/],
    ["npm publish", /not allowed/],
    ["npm config set registry x", /not allowed/],
    ["git -c core.sshCommand=x status", /global options/],
    ["git push origin main", /not allowed/],
    ["git clone --upload-pack=x https://a", /not allowed/],
    ["node -e 1", /Inline code/],
    ["node /etc/passwd", /outside the project/],
    ["npm run build --prefix=../../", /outside the project/],
    ["tsc -p ../other", /outside the project/],
  ])("blocks %s", (command, message) => {
    expect(() => validateCommand(command)).toThrow(message);
  });
});

describe("truncateOutput", () => {
  it("keeps head and tail", () => {
    const text = `${"a".repeat(100)}${"z".repeat(100)}`;
    const result = truncateOutput(text, 50);
    expect(result.truncated).toBe(true);
    expect(result.text.startsWith("a".repeat(10))).toBe(true);
    expect(result.text.endsWith("z".repeat(40))).toBe(true);
  });
});
