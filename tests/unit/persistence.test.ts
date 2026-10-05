import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  conversationsRepo,
  eventsRepo,
  messagesRepo,
  projectsRepo,
  runsRepo,
  slugify,
  versionsRepo,
} from "@/lib/persistence/repositories.server";
import { useTempDataDir } from "../helpers/env";

let env: ReturnType<typeof useTempDataDir>;
beforeAll(() => {
  env = useTempDataDir();
});
afterAll(() => env.cleanup());

describe("repositories", () => {
  it("creates, updates, lists and deletes projects", () => {
    const project = projectsRepo.create({ name: "CRM for Landscaping", packageManager: "bun" });
    expect(project.id).toMatch(/^prj_/);
    expect(project.slug).toBe("crm-for-landscaping");
    expect(project.settings.autoRepairAttempts).toBe(3);

    const updated = projectsRepo.update(project.id, {
      status: "running",
      settings: { ...project.settings, autoRepairAttempts: 1 },
    });
    expect(updated.status).toBe("running");
    expect(updated.settings.autoRepairAttempts).toBe(1);
    expect(projectsRepo.list({ query: "Landscap" })).toHaveLength(1);

    projectsRepo.delete(project.id);
    expect(projectsRepo.get(project.id)).toBeNull();
  });

  it("stores conversations, messages, runs, events and versions", () => {
    const project = projectsRepo.create({ name: "Dashboard" });
    const conversation = conversationsRepo.primary(project.id);
    expect(conversationsRepo.primary(project.id).id).toBe(conversation.id);

    messagesRepo.add({
      conversationId: conversation.id,
      projectId: project.id,
      role: "user",
      content: "hello",
      attachments: [{ name: "a.png", mimeType: "image/png", size: 3, kind: "image", data: "AAA" }],
    });
    const messages = messagesRepo.list(conversation.id);
    expect(messages).toHaveLength(1);
    expect(messages[0]?.attachments[0]).toEqual({
      name: "a.png",
      mimeType: "image/png",
      size: 3,
      kind: "image",
    });

    const run = runsRepo.create({
      projectId: project.id,
      conversationId: conversation.id,
      kind: "agent",
      mode: "build",
    });
    expect(runsRepo.active(project.id)?.id).toBe(run.id);
    eventsRepo.append(run.id, 1, "agent.started", { a: 1 });
    eventsRepo.append(run.id, 2, "agent.delta", { text: "x" });
    expect(eventsRepo.list(run.id, 1).map((event) => event.type)).toEqual(["agent.delta"]);
    runsRepo.update(run.id, { state: "completed", finished: true });
    expect(runsRepo.active(project.id)).toBeNull();

    const v1 = versionsRepo.create({
      projectId: project.id,
      label: "Initial",
      sha: "abc1234",
      changedFiles: { added: ["a"], changed: [], removed: [] },
      status: "ok",
    });
    const v2 = versionsRepo.create({
      projectId: project.id,
      label: "Next",
      sha: "def5678",
      changedFiles: { added: [], changed: ["a"], removed: [] },
      status: "ok",
    });
    expect([v1.number, v2.number]).toEqual([1, 2]);
    expect(versionsRepo.list(project.id).map((version) => version.number)).toEqual([2, 1]);
    expect(projectsRepo.get(project.id)?.activeVersionId).toBe(v2.id);
  });

  it("marks interrupted runs as failed on boot", () => {
    const project = projectsRepo.create({ name: "Boot" });
    const conversation = conversationsRepo.primary(project.id);
    const run = runsRepo.create({
      projectId: project.id,
      conversationId: conversation.id,
      kind: "agent",
      mode: "build",
    });
    projectsRepo.resetTransientState();
    expect(runsRepo.get(run.id)?.state).toBe("failed");
  });

  it("slugifies safely", () => {
    expect(slugify("  Hello, World!! ")).toBe("hello-world");
    expect(slugify("💥")).toBe("project");
  });
});
