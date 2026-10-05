/**
 * Figures out how to install, run and build a project from what is on disk:
 * package.json, scripts, dependencies, config files and lockfiles. Detectors
 * are an ordered list so new frameworks can be added without touching callers.
 */
import fs from "node:fs";
import path from "node:path";

import type { Framework, PackageManager } from "../domain/types";

export type PackageJson = {
  name?: string;
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  packageManager?: string;
};

export type ProjectProbe = {
  packageJson: PackageJson | null;
  files: Set<string>;
};

export type DevServerSpec = {
  /** argv; the first entry is resolved against node_modules/.bin when present. */
  argv: (port: number, host: string) => string[];
  /** Extra env for the dev server (e.g. PORT for frameworks that read it). */
  env?: (port: number, host: string) => Record<string, string>;
};

export type FrameworkInfo = {
  framework: Framework;
  label: string;
  packageManager: PackageManager;
  installCommand: string[] | null;
  buildCommand: string[] | null;
  typecheckCommand: string[] | null;
  lintCommand: string[] | null;
  testCommand: string[] | null;
  dev: DevServerSpec;
};

type Detector = {
  framework: Framework;
  label: string;
  matches: (probe: ProjectProbe) => boolean;
  dev: (probe: ProjectProbe, pm: PackageManager) => DevServerSpec;
};

const hasDep = (pkg: PackageJson | null, name: string) =>
  Boolean(pkg?.dependencies?.[name] ?? pkg?.devDependencies?.[name]);

const hasAnyFile = (probe: ProjectProbe, names: string[]) =>
  names.some((name) => probe.files.has(name));

function runScript(pm: PackageManager, script: string, extra: string[] = []): string[] {
  if (pm === "npm") return ["npm", "run", script, ...(extra.length ? ["--", ...extra] : [])];
  if (pm === "yarn") return ["yarn", script, ...extra];
  return [pm, "run", script, ...extra];
}

const DETECTORS: Detector[] = [
  {
    framework: "nextjs",
    label: "Next.js",
    matches: (probe) =>
      hasDep(probe.packageJson, "next") ||
      hasAnyFile(probe, ["next.config.js", "next.config.mjs", "next.config.ts"]),
    dev: () => ({ argv: (port, host) => ["next", "dev", "-p", String(port), "-H", host] }),
  },
  {
    framework: "astro",
    label: "Astro",
    matches: (probe) =>
      hasDep(probe.packageJson, "astro") ||
      hasAnyFile(probe, ["astro.config.mjs", "astro.config.ts", "astro.config.js"]),
    dev: () => ({ argv: (port, host) => ["astro", "dev", "--port", String(port), "--host", host] }),
  },
  {
    framework: "vite-react",
    label: "React + Vite",
    matches: (probe) => hasDep(probe.packageJson, "vite") && hasDep(probe.packageJson, "react"),
    dev: () => ({
      argv: (port, host) => ["vite", "--port", String(port), "--strictPort", "--host", host],
    }),
  },
  {
    framework: "vite",
    label: "Vite",
    matches: (probe) =>
      hasDep(probe.packageJson, "vite") ||
      hasAnyFile(probe, ["vite.config.ts", "vite.config.js", "vite.config.mjs"]),
    dev: () => ({
      argv: (port, host) => ["vite", "--port", String(port), "--strictPort", "--host", host],
    }),
  },
  {
    framework: "node",
    label: "Node app",
    matches: (probe) =>
      Boolean(probe.packageJson?.scripts?.["dev"] ?? probe.packageJson?.scripts?.["start"]),
    dev: (probe, pm) => {
      const script = probe.packageJson?.scripts?.["dev"] ? "dev" : "start";
      return {
        argv: () => runScript(pm, script),
        env: (port, host) => ({ PORT: String(port), HOST: host }),
      };
    },
  },
  {
    framework: "static-html",
    label: "Static HTML",
    matches: (probe) => probe.files.has("index.html"),
    // Served by PulseUI's bundled static server script (see scripts/static-server.mjs).
    dev: () => ({ argv: (port, host) => ["@pulseui/static-server", ".", String(port), host] }),
  },
];

export function detectPackageManager(probe: ProjectProbe): PackageManager {
  const declared = probe.packageJson?.packageManager?.split("@")[0];
  if (declared === "bun" || declared === "pnpm" || declared === "yarn" || declared === "npm") {
    return declared;
  }
  if (probe.files.has("bun.lock") || probe.files.has("bun.lockb")) return "bun";
  if (probe.files.has("pnpm-lock.yaml")) return "pnpm";
  if (probe.files.has("yarn.lock")) return "yarn";
  if (probe.files.has("package-lock.json")) return "npm";
  return "npm";
}

function installCommand(pm: PackageManager): string[] {
  if (pm === "yarn") return ["yarn", "install"];
  return [pm, "install"];
}

export function detectFromProbe(probe: ProjectProbe, preferred?: PackageManager): FrameworkInfo {
  const detector =
    DETECTORS.find((candidate) => candidate.matches(probe)) ??
    ({
      framework: "unknown",
      label: "Unknown",
      matches: () => true,
      dev: () => ({ argv: () => [] }),
    } satisfies Detector);

  const lockfileDecided =
    probe.files.has("bun.lock") ||
    probe.files.has("bun.lockb") ||
    probe.files.has("pnpm-lock.yaml") ||
    probe.files.has("yarn.lock") ||
    probe.files.has("package-lock.json") ||
    Boolean(probe.packageJson?.packageManager);
  const pm = lockfileDecided || !preferred ? detectPackageManager(probe) : preferred;
  const scripts = probe.packageJson?.scripts ?? {};
  const hasTsconfig = probe.files.has("tsconfig.json");

  return {
    framework: detector.framework,
    label: detector.label,
    packageManager: pm,
    installCommand: probe.packageJson ? installCommand(pm) : null,
    buildCommand: scripts["build"] ? runScript(pm, "build") : null,
    typecheckCommand: scripts["typecheck"]
      ? runScript(pm, "typecheck")
      : hasTsconfig && hasDep(probe.packageJson, "typescript")
        ? ["tsc", "--noEmit", "-p", "."]
        : null,
    lintCommand: scripts["lint"] ? runScript(pm, "lint") : null,
    testCommand:
      scripts["test"] && !/no test specified/.test(scripts["test"]) ? runScript(pm, "test") : null,
    dev: detector.dev(probe, pm),
  };
}

const PROBE_FILES = [
  "package.json",
  "bun.lock",
  "bun.lockb",
  "pnpm-lock.yaml",
  "yarn.lock",
  "package-lock.json",
  "tsconfig.json",
  "index.html",
  "vite.config.ts",
  "vite.config.js",
  "vite.config.mjs",
  "next.config.js",
  "next.config.mjs",
  "next.config.ts",
  "astro.config.mjs",
  "astro.config.ts",
  "astro.config.js",
];

export function probeDirectory(root: string): ProjectProbe {
  const files = new Set(PROBE_FILES.filter((name) => fs.existsSync(path.join(root, name))));
  let packageJson: PackageJson | null = null;
  if (files.has("package.json")) {
    try {
      packageJson = JSON.parse(
        fs.readFileSync(path.join(root, "package.json"), "utf8"),
      ) as PackageJson;
    } catch {
      packageJson = null;
    }
  }
  return { packageJson, files };
}

export function detectProject(root: string, preferred?: PackageManager): FrameworkInfo {
  return detectFromProbe(probeDirectory(root), preferred);
}
