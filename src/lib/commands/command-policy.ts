/**
 * What the agent is allowed to execute. Commands are parsed into argv and run
 * WITHOUT a shell, so pipes, redirects, substitution and chaining are simply
 * not expressible. On top of that, executables are allow-listed and a few
 * dangerous sub-commands/flags are refused.
 *
 * Pure module: no Node APIs, unit-tested in isolation.
 */

export class CommandPolicyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CommandPolicyError";
  }
}

export const STATIC_SERVER_EXECUTABLE = "@pulseui/static-server";

export const ALLOWED_EXECUTABLES = new Set([
  "bun",
  "bunx",
  "npm",
  "npx",
  "pnpm",
  "yarn",
  "node",
  "git",
  "tsc",
  "vite",
  "eslint",
  "prettier",
  "vitest",
  "next",
  "astro",
  STATIC_SERVER_EXECUTABLE,
]);

const SHELL_METACHARACTERS = /[;&|<>`$(){}\n\r\\*?!]/;

/** Split a command string into argv. Supports simple single/double quoting only. */
export function parseCommand(command: string): string[] {
  const trimmed = command.trim();
  if (!trimmed) throw new CommandPolicyError("Command is empty.");
  if (trimmed.length > 2000) throw new CommandPolicyError("Command is too long.");

  const argv: string[] = [];
  let current = "";
  let quote: '"' | "'" | null = null;
  let hasToken = false;
  for (const char of trimmed) {
    if (quote) {
      if (char === quote) quote = null;
      else current += char;
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      hasToken = true;
      continue;
    }
    if (/\s/.test(char)) {
      if (hasToken) argv.push(current);
      current = "";
      hasToken = false;
      continue;
    }
    if (SHELL_METACHARACTERS.test(char)) {
      throw new CommandPolicyError(
        `Shell syntax "${char}" is not supported. Commands run without a shell; run one command at a time.`,
      );
    }
    current += char;
    hasToken = true;
  }
  if (quote) throw new CommandPolicyError("Unterminated quote in command.");
  if (hasToken) argv.push(current);
  return argv;
}

const PACKAGE_MANAGERS = new Set(["bun", "npm", "pnpm", "yarn"]);
const FORBIDDEN_PM_SUBCOMMANDS = new Set([
  "publish",
  "unpublish",
  "login",
  "logout",
  "adduser",
  "token",
  "owner",
  "access",
  "deprecate",
  "config",
  "set",
  "whoami",
  "link",
  "global",
  "upgrade",
  "self-update",
]);
const ALLOWED_GIT_SUBCOMMANDS = new Set([
  "status",
  "diff",
  "log",
  "show",
  "add",
  "commit",
  "init",
  "branch",
  "checkout",
  "switch",
  "rev-parse",
  "ls-files",
  "restore",
  "stash",
  "tag",
]);

function isEscapingPath(arg: string): boolean {
  const value = arg.includes("=") && arg.startsWith("-") ? arg.slice(arg.indexOf("=") + 1) : arg;
  if (value.startsWith("/") || value.startsWith("~") || /^[a-zA-Z]:[\\/]/.test(value)) return true;
  const segments = value.split(/[\\/]/);
  let depth = 0;
  for (const segment of segments) {
    if (segment === "..") depth -= 1;
    else if (segment && segment !== ".") depth += 1;
    if (depth < 0) return true;
  }
  return false;
}

/** Validate argv; throws CommandPolicyError with an explanation the model can act on. */
export function validateArgv(argv: string[]): void {
  const [executable, ...args] = argv;
  if (!executable) throw new CommandPolicyError("Command is empty.");
  if (!ALLOWED_EXECUTABLES.has(executable)) {
    throw new CommandPolicyError(
      `"${executable}" is not an allowed executable. Allowed: ${[...ALLOWED_EXECUTABLES]
        .filter((name) => name !== STATIC_SERVER_EXECUTABLE)
        .join(", ")}.`,
    );
  }

  for (const [index, arg] of args.entries()) {
    if (arg.includes("\0")) throw new CommandPolicyError("Arguments may not contain NUL bytes.");
    if (/^(https?|git|ssh|file):/i.test(arg)) continue;
    // Vite's --base is a public URL path (e.g. /sites/<id>/), never read from disk.
    if (executable === "vite" && (args[index - 1] === "--base" || arg.startsWith("--base=")))
      continue;
    if (isEscapingPath(arg)) {
      throw new CommandPolicyError(`Argument "${arg}" points outside the project workspace.`);
    }
  }

  if (
    args.some(
      (arg) =>
        arg === "-g" || arg === "--global" || arg === "--system" || arg === "--location=global",
    )
  ) {
    throw new CommandPolicyError(
      "Global or system-level installs and configuration are not allowed.",
    );
  }

  if (PACKAGE_MANAGERS.has(executable)) {
    const sub = args.find((arg) => !arg.startsWith("-"));
    if (sub && FORBIDDEN_PM_SUBCOMMANDS.has(sub)) {
      throw new CommandPolicyError(`"${executable} ${sub}" is not allowed inside PulseUI.`);
    }
  }

  if (executable === "git") {
    const first = args[0];
    if (!first) throw new CommandPolicyError("git needs a sub-command.");
    if (first.startsWith("-")) {
      throw new CommandPolicyError("git global options (like -c or --git-dir) are not allowed.");
    }
    if (!ALLOWED_GIT_SUBCOMMANDS.has(first)) {
      throw new CommandPolicyError(
        `"git ${first}" is not allowed. Allowed: ${[...ALLOWED_GIT_SUBCOMMANDS].join(", ")}.`,
      );
    }
    if (args.some((arg) => /^--(upload-pack|receive-pack|exec)/.test(arg))) {
      throw new CommandPolicyError("git transport overrides are not allowed.");
    }
  }

  if (executable === "node") {
    if (
      args.some((arg) =>
        ["-e", "--eval", "-p", "--print", "-r", "--require", "--import"].includes(arg),
      )
    ) {
      throw new CommandPolicyError(
        "Inline code evaluation with node is not allowed; run a script file instead.",
      );
    }
  }
}

export function validateCommand(command: string | string[]): string[] {
  const argv = Array.isArray(command) ? command : parseCommand(command);
  validateArgv(argv);
  return argv;
}

/** Keep the tail of long output, which is where errors usually are. */
export function truncateOutput(
  text: string,
  maxChars: number,
): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  const head = Math.floor(maxChars * 0.2);
  const tail = maxChars - head;
  return {
    text: `${text.slice(0, head)}\n\n… [${text.length - maxChars} characters truncated] …\n\n${text.slice(-tail)}`,
    truncated: true,
  };
}
