import { describe, expect, it } from "vitest";

import { detectFromProbe } from "@/lib/workspace/framework-detect.server";

const probe = (pkg: object | null, files: string[] = []) => ({
  packageJson: pkg,
  files: new Set([...(pkg ? ["package.json"] : []), ...files]),
});

describe("detectFromProbe", () => {
  it("detects React + Vite with bun lockfile", () => {
    const info = detectFromProbe(
      probe(
        {
          scripts: { build: "vite build", typecheck: "tsc" },
          dependencies: { react: "19", vite: "7" },
        },
        ["bun.lock"],
      ),
    );
    expect(info.framework).toBe("vite-react");
    expect(info.packageManager).toBe("bun");
    expect(info.installCommand).toEqual(["bun", "install"]);
    expect(info.buildCommand).toEqual(["bun", "run", "build"]);
    expect(info.typecheckCommand).toEqual(["bun", "run", "typecheck"]);
    expect(info.dev.argv(4100, "127.0.0.1")).toEqual([
      "vite",
      "--port",
      "4100",
      "--strictPort",
      "--host",
      "127.0.0.1",
    ]);
  });

  it("detects Next.js with pnpm", () => {
    const info = detectFromProbe(
      probe({ dependencies: { next: "15" }, scripts: { build: "next build" } }, ["pnpm-lock.yaml"]),
    );
    expect(info.framework).toBe("nextjs");
    expect(info.packageManager).toBe("pnpm");
    expect(info.dev.argv(5000, "0.0.0.0")).toEqual(["next", "dev", "-p", "5000", "-H", "0.0.0.0"]);
  });

  it("detects Astro and npm", () => {
    const info = detectFromProbe(probe({ devDependencies: { astro: "5" } }, ["package-lock.json"]));
    expect(info.framework).toBe("astro");
    expect(info.packageManager).toBe("npm");
    expect(info.buildCommand).toBeNull();
  });

  it("detects plain HTML", () => {
    const info = detectFromProbe(probe(null, ["index.html"]));
    expect(info.framework).toBe("static-html");
    expect(info.installCommand).toBeNull();
  });

  it("falls back to a node dev script with PORT env", () => {
    const info = detectFromProbe(probe({ scripts: { dev: "node server.js" } }, ["yarn.lock"]));
    expect(info.framework).toBe("node");
    expect(info.dev.argv(1, "h")).toEqual(["yarn", "dev"]);
    expect(info.dev.env?.(4100, "127.0.0.1")).toEqual({ PORT: "4100", HOST: "127.0.0.1" });
  });

  it("uses the preferred package manager when nothing is pinned", () => {
    const info = detectFromProbe(probe({ dependencies: { vite: "7", react: "19" } }), "bun");
    expect(info.packageManager).toBe("bun");
  });

  it("ignores the default npm test placeholder", () => {
    const info = detectFromProbe(
      probe({ scripts: { test: 'echo "Error: no test specified" && exit 1' } }),
    );
    expect(info.testCommand).toBeNull();
  });
});
