import { describe, expect, it } from "vitest";

import { filesFromErrors } from "@/lib/agent/context.server";
import { parseNameStatus } from "@/lib/versions/checkpoints.server";
import { parsePorcelainStatus } from "@/lib/git/git.server";

describe("build output parsing", () => {
  it("finds project files referenced by compiler errors", () => {
    const output = [
      "src/components/Header.tsx(42,7): error TS2322: Type 'string' is not assignable to type 'number'.",
      "/abs/path/project/src/App.tsx:12:3: ERROR: Unexpected token",
      "node_modules/react/index.d.ts: noise",
    ].join("\n");
    expect(filesFromErrors(output, ["src/App.tsx", "src/components/Header.tsx"])).toEqual([
      "src/components/Header.tsx",
      "src/App.tsx",
    ]);
  });
});

describe("git output parsing", () => {
  it("parses name-status including renames", () => {
    expect(parseNameStatus("A\tnew.ts\nM\tsrc/App.tsx\nD\told.ts\nR100\ta.ts\tb.ts\n")).toEqual({
      added: ["new.ts", "b.ts"],
      changed: ["src/App.tsx"],
      removed: ["old.ts", "a.ts"],
    });
  });

  it("parses porcelain status with branch info", () => {
    const parsed = parsePorcelainStatus(
      "## main...origin/main [ahead 2]\n M src/App.tsx\n?? src/New.tsx\n",
    );
    expect(parsed.branch).toBe("main");
    expect(parsed.ahead).toBe(2);
    expect(parsed.entries).toEqual([
      { path: "src/App.tsx", index: " ", worktree: "M" },
      { path: "src/New.tsx", index: "?", worktree: "?" },
    ]);
  });
});
