/**
 * project-builder.server.ts
 * Takes a master prompt, plans files, generates each, writes to disk.
 */

import { promises as fs } from "fs";
import path from "path";
import { planProject, type ProjectPlan } from "./plan.server";
import { generateFile } from "./generate-file.server";

const OUTPUT_ROOT = path.join(process.env.HOME || "/tmp", "ai_codespace", "generated");

export type BuildResult = {
  projectDir: string;
  plan: ProjectPlan;
  files: { path: string; bytes: number }[];
  errors: { path: string; error: string }[];
};

export async function buildProject(masterPrompt: string): Promise<BuildResult> {
  const plan = await planProject(masterPrompt);
  const projectDir = path.join(OUTPUT_ROOT, plan.projectName);

  // Clean and recreate the project directory
  await fs.rm(projectDir, { recursive: true, force: true });
  await fs.mkdir(projectDir, { recursive: true });

  const results: BuildResult["files"] = [];
  const errors: BuildResult["errors"] = [];

  for (const file of plan.files) {
    try {
      const code = await generateFile(file, masterPrompt);
      const fullPath = path.join(projectDir, file.path);
      await fs.mkdir(path.dirname(fullPath), { recursive: true });
      await fs.writeFile(fullPath, code, "utf8");
      results.push({ path: file.path, bytes: code.length });
      console.log(`✓ ${file.path} (${code.length} chars)`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push({ path: file.path, error: message });
      console.error(`✗ ${file.path}: ${message}`);
    }
  }

  return { projectDir, plan, files: results, errors };
}
