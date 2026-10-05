import fs from "node:fs";
import path from "node:path";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { projectsRepo, versionsRepo } from "@/lib/persistence/repositories.server";
import {
  createCheckpoint,
  diffAgainstWorkspace,
  pendingChanges,
  restoreVersion,
  versionDiff,
} from "@/lib/versions/checkpoints.server";
import { workspaceFor } from "@/lib/workspace/workspace-manager.server";
import { useTempDataDir } from "../helpers/env";

let env: ReturnType<typeof useTempDataDir>;
beforeAll(() => {
  env = useTempDataDir();
});
afterAll(() => env.cleanup());

describe("checkpoints", () => {
  it("snapshots, diffs and restores real files", async () => {
    const project = projectsRepo.create({ name: "History" });
    const ws = workspaceFor(project.id);
    ws.ensure();
    ws.writeFile("src/App.tsx", "export const color = 'blue';\n");
    ws.writeFile("README.md", "# hi\n");
    fs.mkdirSync(path.join(ws.root, "node_modules/x"), { recursive: true });
    fs.writeFileSync(path.join(ws.root, "node_modules/x/index.js"), "ignored");

    const v1 = await createCheckpoint({ projectId: project.id, label: "Initial" });
    expect(v1?.number).toBe(1);
    expect(v1?.changedFiles.added.sort()).toEqual(["README.md", "src/App.tsx"]);

    expect(await createCheckpoint({ projectId: project.id, label: "Nothing" })).toBeNull();

    ws.writeFile("src/App.tsx", "export const color = 'cyan';\n");
    ws.writeFile("src/Notifications.tsx", "export function N() { return null; }\n");
    ws.delete("README.md");
    expect(await pendingChanges(project.id)).toEqual({
      added: ["src/Notifications.tsx"],
      changed: ["src/App.tsx"],
      removed: ["README.md"],
    });
    const v2 = await createCheckpoint({ projectId: project.id, label: "Cyan + notifications" });
    expect(v2?.number).toBe(2);

    const diff = await versionDiff(project.id, v2!.sha);
    expect(diff).toContain("-export const color = 'blue';");
    expect(diff).toContain("+export const color = 'cyan';");

    const restored = await restoreVersion(project.id, v1!.id);
    expect(restored.status).toBe("restored");
    expect(ws.readFile("src/App.tsx")).toContain("blue");
    expect(ws.exists("src/Notifications.tsx")).toBe(false);
    expect(ws.readFile("README.md")).toBe("# hi\n");
    expect(fs.existsSync(path.join(ws.root, "node_modules/x/index.js"))).toBe(true);
    expect(await diffAgainstWorkspace(project.id, v1!.sha)).toBe("");

    expect(versionsRepo.list(project.id).map((version) => version.number)).toEqual([3, 2, 1]);
  });
});
