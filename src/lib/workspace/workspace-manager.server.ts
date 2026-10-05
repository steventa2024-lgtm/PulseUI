/**
 * WorkspaceManager owns each project's directory on disk. Every operation is
 * scoped to one project root and validated with `resolveInside`, so neither
 * the agent nor the editor can touch anything outside it.
 */
import fs from "node:fs";
import path from "node:path";

import { dataPaths } from "../config/env.server";
import type { FileNode } from "../domain/types";
import {
  IGNORED_DIRECTORIES,
  WorkspaceBoundaryError,
  isSecretPath,
  normalizeRelative,
  resolveInside,
  toPosixRelative,
} from "./paths.server";

export const MAX_WRITE_BYTES = 1024 * 1024;
export const MAX_READ_BYTES = 512 * 1024;
const MAX_LISTED_FILES = 5000;

const PROJECT_ID = /^prj_[a-z0-9]{6,40}$/;

export function assertProjectId(projectId: string): void {
  if (!PROJECT_ID.test(projectId)) throw new WorkspaceBoundaryError("Invalid project id.");
}

export type SearchMatch = { path: string; line: number; text: string };

function isProbablyBinary(buffer: Buffer): boolean {
  const sample = buffer.subarray(0, 8000);
  return sample.includes(0);
}

export class Workspace {
  readonly root: string;

  constructor(root: string) {
    this.root = path.resolve(root);
  }

  resolve(relative: string): string {
    return resolveInside(this.root, relative);
  }

  exists(relative = ""): boolean {
    return fs.existsSync(this.resolve(relative));
  }

  ensure(): void {
    fs.mkdirSync(this.root, { recursive: true });
  }

  readFile(relative: string, maxBytes = MAX_READ_BYTES): string {
    const clean = normalizeRelative(relative);
    if (isSecretPath(clean)) {
      throw new WorkspaceBoundaryError(`${clean} may contain secrets and cannot be read.`);
    }
    const absolute = this.resolve(clean);
    const stat = fs.statSync(absolute, { throwIfNoEntry: false });
    if (!stat) throw new Error(`File not found: ${clean}`);
    if (stat.isDirectory()) throw new Error(`${clean} is a directory.`);
    if (stat.size > maxBytes) {
      throw new Error(
        `${clean} is ${stat.size} bytes, larger than the ${maxBytes}-byte read limit.`,
      );
    }
    const buffer = fs.readFileSync(absolute);
    if (isProbablyBinary(buffer)) throw new Error(`${clean} is a binary file.`);
    return buffer.toString("utf8");
  }

  /** Returns whether the file was newly created. */
  writeFile(relative: string, content: string): { created: boolean; path: string } {
    const clean = normalizeRelative(relative);
    if (!clean) throw new WorkspaceBoundaryError("A file path is required.");
    if (isSecretPath(clean)) {
      throw new WorkspaceBoundaryError(`${clean} is a secrets file and cannot be written.`);
    }
    if (clean.split("/").some((segment) => segment === ".git" || segment === "node_modules")) {
      throw new WorkspaceBoundaryError(`Writing inside ${clean.split("/")[0]} is not allowed.`);
    }
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_WRITE_BYTES) {
      throw new Error(`Refusing to write ${bytes} bytes to ${clean}; limit is ${MAX_WRITE_BYTES}.`);
    }
    const absolute = this.resolve(clean);
    const created = !fs.existsSync(absolute);
    if (!created && fs.statSync(absolute).isDirectory())
      throw new Error(`${clean} is a directory.`);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content, "utf8");
    return { created, path: clean };
  }

  createDirectory(relative: string): string {
    const clean = normalizeRelative(relative);
    if (!clean) throw new WorkspaceBoundaryError("A directory path is required.");
    fs.mkdirSync(this.resolve(clean), { recursive: true });
    return clean;
  }

  delete(relative: string): { path: string; wasDirectory: boolean } {
    const clean = normalizeRelative(relative);
    if (!clean) throw new WorkspaceBoundaryError("Refusing to delete the workspace root.");
    if (clean === ".git" || clean.startsWith(".git/")) {
      throw new WorkspaceBoundaryError("The .git directory cannot be deleted.");
    }
    const absolute = this.resolve(clean);
    const stat = fs.lstatSync(absolute, { throwIfNoEntry: false });
    if (!stat) throw new Error(`Not found: ${clean}`);
    // rm on a symlink removes the link itself, never its target.
    fs.rmSync(absolute, { recursive: true, force: true });
    return { path: clean, wasDirectory: stat.isDirectory() };
  }

  rename(from: string, to: string): { from: string; to: string } {
    const source = normalizeRelative(from);
    const target = normalizeRelative(to);
    if (!source || !target) throw new WorkspaceBoundaryError("Both paths are required.");
    if (isSecretPath(target)) throw new WorkspaceBoundaryError(`${target} is a secrets path.`);
    const absoluteSource = this.resolve(source);
    const absoluteTarget = this.resolve(target);
    if (!fs.existsSync(absoluteSource)) throw new Error(`Not found: ${source}`);
    if (fs.existsSync(absoluteTarget)) throw new Error(`${target} already exists.`);
    fs.mkdirSync(path.dirname(absoluteTarget), { recursive: true });
    fs.renameSync(absoluteSource, absoluteTarget);
    return { from: source, to: target };
  }

  /** Flat, sorted list of relative file paths. */
  listFiles(options: { includeIgnored?: boolean; directory?: string } = {}): string[] {
    const start = this.resolve(options.directory ?? "");
    const files: string[] = [];
    const walk = (directory: string) => {
      if (files.length >= MAX_LISTED_FILES) return;
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
      } catch {
        return;
      }
      entries.sort((a, b) => a.name.localeCompare(b.name));
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const absolute = path.join(directory, entry.name);
        if (entry.isDirectory()) {
          if (!options.includeIgnored && IGNORED_DIRECTORIES.has(entry.name)) continue;
          walk(absolute);
        } else if (entry.isFile()) {
          files.push(toPosixRelative(this.root, absolute));
          if (files.length >= MAX_LISTED_FILES) return;
        }
      }
    };
    walk(start);
    return files;
  }

  tree(options: { includeIgnored?: boolean } = {}): FileNode {
    const build = (directory: string, depth: number): FileNode[] => {
      if (depth > 12) return [];
      let entries: fs.Dirent[];
      try {
        entries = fs.readdirSync(directory, { withFileTypes: true });
      } catch {
        return [];
      }
      const nodes: FileNode[] = [];
      for (const entry of entries) {
        if (entry.isSymbolicLink()) continue;
        const absolute = path.join(directory, entry.name);
        const relative = toPosixRelative(this.root, absolute);
        if (entry.isDirectory()) {
          if (!options.includeIgnored && IGNORED_DIRECTORIES.has(entry.name)) continue;
          // node_modules is listed but never expanded: it can hold 100k files.
          const children = entry.name === "node_modules" ? [] : build(absolute, depth + 1);
          nodes.push({ name: entry.name, path: relative, type: "directory", children });
        } else if (entry.isFile()) {
          let size = 0;
          try {
            size = fs.statSync(absolute).size;
          } catch {
            // Raced with a delete; list it anyway.
          }
          nodes.push({ name: entry.name, path: relative, type: "file", size });
        }
      }
      return nodes.sort((a, b) =>
        a.type === b.type ? a.name.localeCompare(b.name) : a.type === "directory" ? -1 : 1,
      );
    };
    return {
      name: path.basename(this.root),
      path: "",
      type: "directory",
      children: build(this.root, 0),
    };
  }

  search(query: string, options: { regex?: boolean; limit?: number } = {}): SearchMatch[] {
    if (!query.trim()) return [];
    const limit = options.limit ?? 200;
    let matcher: (line: string) => boolean;
    if (options.regex) {
      const pattern = new RegExp(query, "i");
      matcher = (line) => pattern.test(line);
    } else {
      const needle = query.toLowerCase();
      matcher = (line) => line.toLowerCase().includes(needle);
    }
    const matches: SearchMatch[] = [];
    for (const file of this.listFiles()) {
      if (isSecretPath(file)) continue;
      let content: string;
      try {
        content = this.readFile(file, 256 * 1024);
      } catch {
        continue;
      }
      const lines = content.split("\n");
      for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index] ?? "";
        if (matcher(line)) {
          matches.push({ path: file, line: index + 1, text: line.trim().slice(0, 240) });
          if (matches.length >= limit) return matches;
        }
      }
    }
    return matches;
  }

  /** Copy a starter directory into this (empty) workspace. */
  copyFrom(source: string): void {
    this.ensure();
    fs.cpSync(source, this.root, {
      recursive: true,
      filter: (src) => {
        const name = path.basename(src);
        return (
          !IGNORED_DIRECTORIES.has(name) && !name.endsWith(".lock") && name !== "package-lock.json"
        );
      },
    });
  }

  destroy(): void {
    fs.rmSync(this.root, { recursive: true, force: true });
  }
}

export function workspaceRootFor(projectId: string): string {
  assertProjectId(projectId);
  return path.join(dataPaths().workspaces, projectId);
}

export function workspaceFor(projectId: string): Workspace {
  return new Workspace(workspaceRootFor(projectId));
}
