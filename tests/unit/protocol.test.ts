import { describe, expect, it } from "vitest";

import { PatchError, applyPatch, parseAgentOutput, visibleProse } from "@/lib/agent/protocol";

describe("parseAgentOutput", () => {
  it("extracts plan, actions, writes, patches and done", () => {
    const text = [
      "Let me look.",
      "<plan>\n1. Read\n2. Edit\n</plan>",
      '<action name="read_file">{"path":"src/App.tsx"}</action>',
      '<action name="list_files"/>',
      '<write path="src/a.ts">\nexport const a = 1;\n</write>',
      '<patch path="src/b.ts">\n<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>> REPLACE\n</patch>',
      "<done>Changed things.</done>",
    ].join("\n");
    const parsed = parseAgentOutput(text);
    expect(parsed.prose).toBe("Let me look.");
    expect(parsed.plan).toBe("1. Read\n2. Edit");
    expect(parsed.done).toBe("Changed things.");
    expect(parsed.actions).toEqual([
      { tool: "read_file", args: { path: "src/App.tsx" } },
      { tool: "list_files", args: {} },
      { tool: "write_file", args: { path: "src/a.ts", content: "export const a = 1;" } },
      {
        tool: "patch_file",
        args: { path: "src/b.ts", patch: "\n<<<<<<< SEARCH\nold\n=======\nnew\n>>>>>>> REPLACE\n" },
      },
    ]);
    expect(parsed.errors).toEqual([]);
  });

  it("strips markdown fences inside writes", () => {
    const parsed = parseAgentOutput('<write path="a.ts">\n```ts\nconst x = 1;\n```\n</write>');
    expect(parsed.actions[0]?.args["content"]).toBe("const x = 1;");
  });

  it("reports invalid JSON and unclosed writes", () => {
    const parsed = parseAgentOutput(
      '<action name="read_file">{path: nope}</action>\n<write path="x.ts">\nconst a',
    );
    expect(parsed.actions).toEqual([]);
    expect(parsed.errors).toHaveLength(2);
    expect(parsed.errors[1]).toMatch(/never closed/);
  });
});

describe("visibleProse", () => {
  it("only ever grows while a stream arrives", () => {
    const full = 'Hello there. <write path="a.ts">\nsecret code\n</write> All done <done>ok</done>';
    let previous = "";
    for (let index = 1; index <= full.length; index += 1) {
      const visible = visibleProse(full.slice(0, index));
      expect(visible.startsWith(previous)).toBe(true);
      expect(visible).not.toContain("secret code");
      previous = visible;
    }
    expect(previous.trim()).toBe("Hello there.  All done");
  });
});

describe("applyPatch", () => {
  const source = "function a() {\n  return 1;\n}\n\nfunction b() {\n  return 2;\n}\n";

  it("applies an exact block", () => {
    const patched = applyPatch(
      source,
      "<<<<<<< SEARCH\n  return 1;\n=======\n  return 10;\n>>>>>>> REPLACE",
    );
    expect(patched).toContain("return 10;");
    expect(patched).toContain("return 2;");
  });

  it("applies multiple blocks in order", () => {
    const patch =
      "<<<<<<< SEARCH\nfunction a() {\n=======\nfunction alpha() {\n>>>>>>> REPLACE\n<<<<<<< SEARCH\nfunction b() {\n=======\nfunction beta() {\n>>>>>>> REPLACE";
    expect(applyPatch(source, patch)).toContain(
      "function alpha() {\n  return 1;\n}\n\nfunction beta()",
    );
  });

  it("falls back to whitespace-insensitive line matching", () => {
    const patched = applyPatch(
      source,
      "<<<<<<< SEARCH\nreturn 2;\n=======\n  return 20;\n>>>>>>> REPLACE",
    );
    expect(patched).toContain("return 20;");
  });

  it("rejects ambiguous and missing search text", () => {
    expect(() => applyPatch("x\nx\n", "<<<<<<< SEARCH\nx\n=======\ny\n>>>>>>> REPLACE")).toThrow(
      /2 times/,
    );
    expect(() => applyPatch(source, "<<<<<<< SEARCH\nnope\n=======\ny\n>>>>>>> REPLACE")).toThrow(
      /not found/,
    );
    expect(() => applyPatch(source, "just text")).toThrow(PatchError);
  });

  it("supports deleting lines with an empty replacement", () => {
    const patched = applyPatch(
      source,
      "<<<<<<< SEARCH\n\nfunction b() {\n  return 2;\n}\n=======\n>>>>>>> REPLACE",
    );
    expect(patched).not.toContain("function b");
  });
});
