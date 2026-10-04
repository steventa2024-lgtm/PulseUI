/**
 * Pulse's action protocol.
 *
 * The model answers in prose plus a small set of tags:
 *
 *   <plan>…</plan>                          what it intends to do
 *   <action name="read_file">{"path":"src/App.tsx"}</action>   any tool, JSON args
 *   <write path="src/App.tsx">…file…</write>                   whole-file write
 *   <patch path="src/App.tsx">SEARCH/REPLACE blocks</patch>    targeted edit
 *   <done>summary</done>                    the work is finished
 *
 * Tags are used instead of JSON tool calls because file bodies stay raw text:
 * no escaping, which small local models get wrong constantly. Pure module.
 */

export type ParsedAction = {
  tool: string;
  args: Record<string, unknown>;
};

export type ParsedOutput = {
  prose: string;
  plan: string | null;
  actions: ParsedAction[];
  done: string | null;
  errors: string[];
};

const BLOCK =
  /<(plan|done)>([\s\S]*?)<\/\1>|<action\s+name="([a-z_]+)"\s*(?:\/>|>([\s\S]*?)<\/action>)|<(write|patch)\s+path="([^"]+)"\s*>([\s\S]*?)<\/\5>/g;

function stripFence(content: string): string {
  let body = content.replace(/^\r?\n/, "").replace(/\r?\n[ \t]*$/, "");
  const fenced = /^```[\w.+-]*\r?\n([\s\S]*?)\r?\n```$/.exec(body.trim());
  if (fenced?.[1] !== undefined) body = fenced[1];
  return body;
}

function parseArgs(
  raw: string | undefined,
  tool: string,
  errors: string[],
): Record<string, unknown> | null {
  const text = (raw ?? "").trim();
  if (!text) return {};
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    errors.push(`Arguments for ${tool} must be a JSON object.`);
    return null;
  } catch {
    errors.push(`Arguments for ${tool} were not valid JSON: ${text.slice(0, 120)}`);
    return null;
  }
}

const NEXT_TAG = /<(?:action\s|write\s|patch\s|done>|plan>)/;

/**
 * Models sometimes open <plan> or <done> and never close it (often running
 * straight into their first <write>). Close such a block before the next tag,
 * or at the end, so raw tags never leak into the chat and the actions after
 * it still run.
 */
export function closeDanglingBlocks(text: string): string {
  let out = text;
  for (const tag of ["plan", "done"] as const) {
    let from = 0;
    for (;;) {
      const open = out.indexOf(`<${tag}>`, from);
      if (open === -1) break;
      const bodyStart = open + tag.length + 2;
      const close = out.indexOf(`</${tag}>`, bodyStart);
      const next = NEXT_TAG.exec(out.slice(bodyStart));
      const nextAt = next ? bodyStart + next.index : -1;
      if (close !== -1 && (nextAt === -1 || close < nextAt)) {
        from = close;
        continue;
      }
      const insertAt = nextAt === -1 ? out.length : nextAt;
      out = `${out.slice(0, insertAt)}</${tag}>${out.slice(insertAt)}`;
      from = insertAt;
    }
  }
  return out;
}

export function parseAgentOutput(input: string): ParsedOutput {
  const text = closeDanglingBlocks(input);
  const actions: ParsedAction[] = [];
  const errors: string[] = [];
  let plan: string | null = null;
  let done: string | null = null;
  let prose = "";
  let cursor = 0;

  for (const match of text.matchAll(BLOCK)) {
    prose += text.slice(cursor, match.index);
    cursor = (match.index ?? 0) + match[0].length;

    const [, simpleTag, simpleBody, actionName, actionBody, fileTag, filePath, fileBody] = match;
    if (simpleTag === "plan") plan = (simpleBody ?? "").trim();
    else if (simpleTag === "done") done = (simpleBody ?? "").trim();
    else if (actionName) {
      const args = parseArgs(actionBody, actionName, errors);
      if (args) actions.push({ tool: actionName, args });
    } else if (fileTag === "write" && filePath) {
      actions.push({
        tool: "write_file",
        args: { path: filePath, content: stripFence(fileBody ?? "") },
      });
    } else if (fileTag === "patch" && filePath) {
      actions.push({ tool: "patch_file", args: { path: filePath, patch: fileBody ?? "" } });
    }
  }

  const rest = text.slice(cursor);
  const unclosed = /<(write|patch)\s+path="([^"]+)"\s*>/.exec(rest);
  if (unclosed) {
    errors.push(
      `The <${unclosed[1]}> block for ${unclosed[2]} was never closed (output may have been cut off). Re-send that file.`,
    );
    prose += rest.slice(0, unclosed.index);
  } else {
    prose += rest;
  }

  return { prose: prose.replace(/\n{3,}/g, "\n\n").trim(), plan, actions, done, errors };
}

/**
 * The user-visible prose of a partial stream. Completed blocks are removed,
 * an open block hides everything after it, and a trailing partial tag is held
 * back. The result only ever grows as more text arrives, so callers can emit
 * the new suffix as a delta.
 */
export function visibleProse(partial: string): string {
  let text = partial.replace(BLOCK, "");
  const open = /<(plan|done|action|write|patch)\b/.exec(text);
  if (open) text = text.slice(0, open.index);
  const lastLt = text.lastIndexOf("<");
  if (lastLt !== -1 && !text.slice(lastLt).includes(">") && text.length - lastLt < 40) {
    text = text.slice(0, lastLt);
  }
  return text;
}

/* ------------------------------------------------------------------ *
 * SEARCH/REPLACE patches
 * ------------------------------------------------------------------ */

export class PatchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PatchError";
  }
}

type PatchBlock = { search: string; replace: string };

export function parsePatchBlocks(patch: string): PatchBlock[] {
  const blocks: PatchBlock[] = [];
  const pattern =
    /<{5,9} ?SEARCH[^\n]*\r?\n([\s\S]*?)\r?\n?={5,9}\r?\n([\s\S]*?)\r?\n?>{5,9} ?REPLACE/g;
  for (const match of patch.matchAll(pattern)) {
    blocks.push({ search: match[1] ?? "", replace: match[2] ?? "" });
  }
  if (!blocks.length) {
    throw new PatchError(
      "No SEARCH/REPLACE blocks found. Use:\n<<<<<<< SEARCH\nexact existing lines\n=======\nnew lines\n>>>>>>> REPLACE",
    );
  }
  return blocks;
}

function countOccurrences(haystack: string, needle: string): number {
  let count = 0;
  let index = haystack.indexOf(needle);
  while (index !== -1) {
    count += 1;
    index = haystack.indexOf(needle, index + needle.length);
  }
  return count;
}

/** Fallback: match line-by-line ignoring leading/trailing whitespace. */
function fuzzyLineReplace(content: string, search: string, replace: string): string | null {
  const lines = content.split("\n");
  const needle = search.split("\n").map((line) => line.trim());
  while (needle.length && !needle[needle.length - 1]) needle.pop();
  while (needle.length && !needle[0]) needle.shift();
  if (!needle.length) return null;

  const hits: number[] = [];
  for (let start = 0; start + needle.length <= lines.length; start += 1) {
    let ok = true;
    for (let offset = 0; offset < needle.length; offset += 1) {
      if ((lines[start + offset] ?? "").trim() !== needle[offset]) {
        ok = false;
        break;
      }
    }
    if (ok) hits.push(start);
  }
  if (hits.length !== 1) return null;
  const start = hits[0] ?? 0;
  return [
    ...lines.slice(0, start),
    ...replace.split("\n"),
    ...lines.slice(start + needle.length),
  ].join("\n");
}

export function applyPatch(original: string, patch: string): string {
  let content = original;
  const blocks = parsePatchBlocks(patch);
  blocks.forEach((block, index) => {
    if (!block.search.trim()) {
      throw new PatchError(`Block ${index + 1}: SEARCH must contain existing lines from the file.`);
    }
    const occurrences = countOccurrences(content, block.search);
    if (occurrences === 1) {
      content = content.replace(block.search, () => block.replace);
      return;
    }
    if (occurrences > 1) {
      throw new PatchError(
        `Block ${index + 1}: SEARCH text appears ${occurrences} times. Include more surrounding lines so it is unique.`,
      );
    }
    const fuzzy = fuzzyLineReplace(content, block.search, block.replace);
    if (fuzzy === null) {
      throw new PatchError(
        `Block ${index + 1}: SEARCH text was not found in the file. Re-read the file and copy the lines exactly.`,
      );
    }
    content = fuzzy;
  });
  return content;
}
