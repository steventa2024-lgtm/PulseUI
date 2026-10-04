/**
 * Workspace path containment. Every file operation an agent or user triggers
 * goes through `resolveInside`, which rejects anything that would land outside
 * the project root — `../`, absolute paths, NUL bytes, and symlinks whose real
 * target escapes.
 */
import fs from "node:fs";
import path from "node:path";

export class WorkspaceBoundaryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WorkspaceBoundaryError";
  }
}

/** Directories that are noise for both humans and the model. */
export const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".cache",
  ".next",
  ".astro",
  ".turbo",
  ".vite",
  "coverage",
  ".output",
  ".vercel",
]);

/** Files the agent must never read or write — they are where secrets live. */
const SECRET_FILE = /(^|\/)(\.env(\..*)?|.*\.pem|.*\.key|id_rsa.*|\.npmrc|\.netrc)$/i;

export function isSecretPath(relativePath: string): boolean {
  if (/(^|\/)\.env\.example$/i.test(relativePath)) return false;
  return SECRET_FILE.test(relativePath);
}

/**
 * Normalize a user/model supplied path into a clean POSIX relative path.
 * Throws for anything that is not plainly inside the root.
 */
export function normalizeRelative(input: string): string {
  if (typeof input !== "string") throw new WorkspaceBoundaryError("Path must be a string.");
  if (input.includes("\0")) throw new WorkspaceBoundaryError("Path contains a NUL byte.");
  const unified = input.trim().replace(/\\/g, "/");
  if (!unified || unified === "." || unified === "./") return "";
  if (unified.startsWith("/") || /^[a-zA-Z]:/.test(unified) || unified.startsWith("~")) {
    throw new WorkspaceBoundaryError(`Absolute paths are not allowed: ${input}`);
  }
  const normalized = path.posix.normalize(unified).replace(/\/+$/, "");
  if (normalized === ".." || normalized.startsWith("../")) {
    throw new WorkspaceBoundaryError(`Path escapes the project workspace: ${input}`);
  }
  if (normalized === ".") return "";
  return normalized;
}

function isWithin(root: string, target: string): boolean {
  const relative = path.relative(root, target);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

/** Nearest existing ancestor, so not-yet-created files can be checked too. */
function realpathOfNearestExisting(target: string): string {
  let current = target;
  for (;;) {
    try {
      return path.join(fs.realpathSync(current), path.relative(current, target));
    } catch {
      const parent = path.dirname(current);
      if (parent === current) return target;
      current = parent;
    }
  }
}

/**
 * Resolve `relative` inside `root`, following symlinks to make sure the real
 * location is still inside the real root.
 */
export function resolveInside(root: string, relative: string): string {
  const clean = normalizeRelative(relative);
  const absoluteRoot = path.resolve(root);
  const target = path.resolve(absoluteRoot, clean);
  if (!isWithin(absoluteRoot, target)) {
    throw new WorkspaceBoundaryError(`Path escapes the project workspace: ${relative}`);
  }
  const realRoot = fs.existsSync(absoluteRoot) ? fs.realpathSync(absoluteRoot) : absoluteRoot;
  const realTarget = realpathOfNearestExisting(target);
  if (!isWithin(realRoot, realTarget)) {
    throw new WorkspaceBoundaryError(
      `Path resolves outside the workspace via a symlink: ${relative}`,
    );
  }
  return target;
}

export function toPosixRelative(root: string, absolute: string): string {
  return path.relative(root, absolute).split(path.sep).join("/");
}
