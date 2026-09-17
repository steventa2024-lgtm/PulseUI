import { createServerFn } from "@tanstack/react-start";
import { buildProject } from "./project-builder.server";

export const buildProjectFn = createServerFn({ method: "POST" })
  .inputValidator((data: { masterPrompt: string }) => data)
  .handler(async ({ data }) => {
    const result = await buildProject(data.masterPrompt);
    return {
      projectDir: result.projectDir,
      projectName: result.plan.projectName,
      summary: result.plan.summary,
      files: result.files,
      errors: result.errors,
    };
  });
