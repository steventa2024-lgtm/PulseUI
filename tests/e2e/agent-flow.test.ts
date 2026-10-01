/**
 * End-to-end agent flow with the deterministic mock provider. Exercises the
 * real runtime: workspace, tools, dependency install, typecheck, build,
 * repair loop, preview dev server, checkpoints and restore. No paid model.
 * Needs network access to the npm registry for the first install.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { subscribe } from "@/lib/agent/event-bus.server";
import { startAgentRun, startSetupRun } from "@/lib/agent/runtime.server";
import type { AgentEvent, AgentRun } from "@/lib/domain/types";
import {
  messagesRepo,
  conversationsRepo,
  runsRepo,
  versionsRepo,
} from "@/lib/persistence/repositories.server";
import { getPreview, stopAllPreviews } from "@/lib/preview/preview-manager.server";
import { createProject } from "@/lib/projects/project-service.server";
import { restoreVersion } from "@/lib/versions/checkpoints.server";
import { workspaceFor } from "@/lib/workspace/workspace-manager.server";
import { useTempDataDir } from "../helpers/env";

let env: ReturnType<typeof useTempDataDir>;

beforeAll(() => {
  env = useTempDataDir({
    AI_PROVIDER: "mock",
    PREVIEW_PORT_START: "4600",
    PREVIEW_PORT_END: "4699",
  });
});

afterAll(async () => {
  await stopAllPreviews();
  env.cleanup();
});

function waitForRun(runId: string): Promise<{ run: AgentRun; events: AgentEvent[] }> {
  return new Promise((resolve, reject) => {
    const events: AgentEvent[] = [];
    const timer = setTimeout(() => reject(new Error(`Run ${runId} did not finish`)), 280_000);
    const unsubscribe = subscribe(runId, 0, (event) => {
      events.push(event);
      if (
        event.type === "agent.completed" ||
        event.type === "agent.failed" ||
        event.type === "agent.cancelled"
      ) {
        clearTimeout(timer);
        setTimeout(() => {
          unsubscribe();
          resolve({ run: runsRepo.get(runId) as AgentRun, events });
        }, 50);
      }
    });
  });
}

async function fetchPreview(projectId: string): Promise<string> {
  const info = getPreview(projectId);
  expect(info.status).toBe("ready");
  const response = await fetch(`http://127.0.0.1:${info.port}/src/App.tsx`);
  expect(response.status).toBe(200);
  return response.text();
}

describe("Pulse agent end-to-end (mock provider)", () => {
  let projectId = "";

  it("creates a project from a prompt, builds it and starts a real preview", async () => {
    const prompt = "Build a CRM for my landscaping company with customers and invoices";
    const project = await createProject({ prompt });
    projectId = project.id;
    expect(project.name).toBe("CRM for Landscaping Company");
    expect(versionsRepo.list(project.id)).toHaveLength(1);

    const { runId } = await startAgentRun({ projectId: project.id, prompt, mode: "build" });
    await expect(
      startAgentRun({ projectId: project.id, prompt: "again", mode: "build" }),
    ).rejects.toThrow(/already working/);

    const { run, events } = await waitForRun(runId);
    const types = events.map((event) => event.type);
    expect(run.state, run.error ?? "").toBe("completed");
    expect(types).toContain("tool.started");
    expect(types).toContain("file.updated");
    expect(types).toContain("build.completed");
    expect(types).toContain("preview.ready");
    expect(types).toContain("version.created");

    const tools = events
      .filter((event) => event.type === "tool.completed")
      .map((event) => event.data["name"]);
    expect(tools).toEqual(
      expect.arrayContaining([
        "read_file",
        "write_file",
        "install_dependencies",
        "run_typecheck",
        "run_build",
      ]),
    );
    expect(run.filesChanged.added).toContain("src/components/PulseCard.tsx");
    expect(run.filesChanged.changed).toContain("src/App.tsx");

    const source = await fetchPreview(project.id);
    expect(source).toContain("CRM for my landscaping company");

    const conversation = conversationsRepo.primary(project.id);
    const messages = messagesRepo.list(conversation.id);
    expect(messages.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(versionsRepo.list(project.id)[0]?.label).toContain("Build a CRM");
  });

  it("applies follow-up requests as targeted patches, not regeneration", async () => {
    const before = workspaceFor(projectId).readFile("src/components/PulseCard.tsx");
    const { runId } = await startAgentRun({
      projectId,
      prompt: "Add a notifications panel",
      mode: "build",
    });
    const { run, events } = await waitForRun(runId);
    expect(run.state, run.error ?? "").toBe("completed");
    expect(
      events.some(
        (event) => event.type === "tool.completed" && event.data["name"] === "patch_file",
      ),
    ).toBe(true);
    expect(run.filesChanged).toEqual({ added: [], changed: ["src/App.tsx"], removed: [] });
    expect(workspaceFor(projectId).readFile("src/components/PulseCard.tsx")).toBe(before);
    expect(await fetchPreview(projectId)).toContain("Add a notifications panel");
  });

  it("repairs a real build failure within the attempt budget", async () => {
    const { runId } = await startAgentRun({
      projectId,
      prompt: "Add a broken widget [mock:break-build]",
      mode: "build",
    });
    const { run, events } = await waitForRun(runId);
    // Second write of App.tsx happens via patch (the app exists), then the broken file gets repaired.
    expect(run.state, run.error ?? "").toBe("completed");
    expect(
      events.some((event) => event.type === "agent.state" && event.data["state"] === "repairing"),
    ).toBe(true);
    const typechecks = events.filter(
      (event) => event.type === "tool.completed" && event.data["name"] === "run_typecheck",
    );
    expect(typechecks.map((event) => event.data["ok"])).toEqual([false, true]);
    expect(workspaceFor(projectId).readFile("src/components/PulseBroken.tsx")).toContain(
      "count: number = 1",
    );
  });

  it("plan mode never modifies files", async () => {
    const versionsBefore = versionsRepo.list(projectId).length;
    const { runId } = await startAgentRun({
      projectId,
      prompt: "Plan a settings page",
      mode: "plan",
    });
    const { run } = await waitForRun(runId);
    expect(run.state).toBe("completed");
    expect(run.summary).toContain("Here is a plan");
    expect(versionsRepo.list(projectId).length).toBe(versionsBefore);
  });

  it("restores an earlier version on disk and in the preview", async () => {
    const first = versionsRepo
      .list(projectId)
      .find((version) => version.label.startsWith("Build a CRM"));
    expect(first).toBeDefined();
    await restoreVersion(projectId, first!.id);
    const app = workspaceFor(projectId).readFile("src/App.tsx");
    expect(app).not.toContain("Add a notifications panel");
    expect(workspaceFor(projectId).exists("src/components/PulseBroken.tsx")).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(await fetchPreview(projectId)).not.toContain("Add a notifications panel");
  });

  it("creates a project from a real template and boots its preview", async () => {
    const project = await createProject({ templateId: "real-estate" });
    expect(project.templateId).toBe("real-estate");
    const { runId } = startSetupRun(project.id, "Real Estate Site");
    const { run } = await waitForRun(runId);
    expect(run.state, run.error ?? "").toBe("completed");
    expect(await fetchPreview(project.id)).toContain("ListingCard");
  });
});
