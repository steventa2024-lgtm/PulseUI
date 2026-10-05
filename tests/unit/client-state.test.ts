import { describe, expect, it } from "vitest";

import { emptyRun, reduceRun } from "@/lib/client/run-events";
import type { AgentEvent } from "@/lib/domain/types";
import { attachmentsSchema } from "@/lib/server-fns/validators";
import { parseUnifiedDiff } from "@/lib/versions/diff-parse";

const event = (
  seq: number,
  type: AgentEvent["type"],
  data: Record<string, unknown> = {},
): AgentEvent => ({
  runId: "run_test",
  seq,
  type,
  at: new Date().toISOString(),
  data,
});

describe("run event reducer", () => {
  it("builds a timeline from real events and ignores replays", () => {
    let view = emptyRun("run_test");
    const events = [
      event(1, "agent.started", { provider: "Mock", model: "pulse-mock", mode: "build" }),
      event(2, "agent.state", { state: "planning" }),
      event(3, "agent.delta", { text: "Reading " }),
      event(4, "agent.delta", { text: "files." }),
      event(5, "tool.started", { id: "tc_1", name: "read_file", args: { path: "src/App.tsx" } }),
      event(6, "tool.completed", {
        id: "tc_1",
        name: "read_file",
        ok: true,
        durationMs: 12,
        output: "…",
      }),
      event(7, "build.started"),
      event(8, "build.output", { text: "vite v7 building…" }),
      event(9, "agent.completed", {
        summary: "Done",
        filesChanged: { added: [], changed: ["a"], removed: [] },
      }),
    ];
    for (const item of events) view = reduceRun(view, item);
    view = reduceRun(view, events[3] as AgentEvent); // replayed duplicate

    expect(view.model).toBe("Mock · pulse-mock");
    expect(view.items[0]).toMatchObject({ kind: "text", text: "Reading files." });
    expect(view.items[1]).toMatchObject({ kind: "tool", status: "ok", durationMs: 12 });
    expect(view.buildOutput).toContain("building");
    expect(view.finished).toBe(true);
    expect(view.state).toBe("completed");
    expect(view.filesChanged?.changed).toEqual(["a"]);
  });
});

describe("diff parser", () => {
  it("parses files, hunks and line numbers", () => {
    const diff = [
      "diff --git a/src/App.tsx b/src/App.tsx",
      "index 111..222 100644",
      "--- a/src/App.tsx",
      "+++ b/src/App.tsx",
      "@@ -1,3 +1,3 @@",
      " const a = 1;",
      "-const color = 'blue';",
      "+const color = 'cyan';",
      " export {};",
      "diff --git a/src/New.tsx b/src/New.tsx",
      "new file mode 100644",
      "--- /dev/null",
      "+++ b/src/New.tsx",
      "@@ -0,0 +1 @@",
      "+export const x = 1;",
    ].join("\n");
    const files = parseUnifiedDiff(diff);
    expect(files.map((file) => [file.path, file.status, file.additions, file.deletions])).toEqual([
      ["src/App.tsx", "modified", 1, 1],
      ["src/New.tsx", "added", 1, 0],
    ]);
    const added = files[0]?.lines.find((line) => line.kind === "add");
    expect(added).toMatchObject({ text: "const color = 'cyan';", newNo: 2, oldNo: null });
  });
});

describe("attachment validation", () => {
  it("accepts images and source files within limits", () => {
    const parsed = attachmentsSchema.parse([
      { name: "shot.png", mimeType: "image/png", size: 3, kind: "image", data: "iVBORw0KGgo=" },
      { name: "notes.md", mimeType: "text/markdown", size: 5, kind: "text", data: "# Hi" },
    ]);
    expect(parsed).toHaveLength(2);
  });

  it("rejects unsupported types, oversize files and too many attachments", () => {
    expect(() =>
      attachmentsSchema.parse([
        { name: "a.exe", mimeType: "application/x-msdownload", size: 1, kind: "text", data: "x" },
      ]),
    ).toThrow(/unsupported/);
    expect(() =>
      attachmentsSchema.parse([
        { name: "a.svg", mimeType: "image/svg+xml", size: 1, kind: "image", data: "AAAA" },
      ]),
    ).toThrow(/unsupported image/);
    expect(() =>
      attachmentsSchema.parse([
        {
          name: "big.txt",
          mimeType: "text/plain",
          size: 1,
          kind: "text",
          data: "x".repeat(300_000),
        },
      ]),
    ).toThrow(/too large/);
    const seven = Array.from({ length: 7 }, (_, index) => ({
      name: `${index}.txt`,
      mimeType: "text/plain",
      size: 1,
      kind: "text" as const,
      data: "x",
    }));
    expect(() => attachmentsSchema.parse(seven)).toThrow();
  });
});
