/**
 * Parse `git diff`/`git show` unified output into files and hunks for the
 * diff viewer. Pure and client-safe.
 */

export type DiffLine = {
  kind: "add" | "del" | "ctx" | "meta";
  text: string;
  oldNo: number | null;
  newNo: number | null;
};
export type DiffFile = {
  path: string;
  oldPath: string | null;
  status: "added" | "deleted" | "modified" | "renamed";
  additions: number;
  deletions: number;
  binary: boolean;
  lines: DiffLine[];
};

export function parseUnifiedDiff(diff: string): DiffFile[] {
  const files: DiffFile[] = [];
  let current: DiffFile | null = null;
  let oldNo = 0;
  let newNo = 0;

  for (const raw of diff.split("\n")) {
    if (raw.startsWith("diff --git ")) {
      const match = /^diff --git a\/(.+?) b\/(.+)$/.exec(raw);
      current = {
        path: match?.[2] ?? raw.slice(11),
        oldPath: match?.[1] ?? null,
        status: "modified",
        additions: 0,
        deletions: 0,
        binary: false,
        lines: [],
      };
      files.push(current);
      continue;
    }
    if (!current) continue;
    if (raw.startsWith("new file mode")) current.status = "added";
    else if (raw.startsWith("deleted file mode")) current.status = "deleted";
    else if (raw.startsWith("rename from ")) {
      current.status = "renamed";
      current.oldPath = raw.slice(12);
    } else if (raw.startsWith("Binary files")) current.binary = true;
    else if (raw.startsWith("@@")) {
      const match = /^@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@(.*)$/.exec(raw);
      oldNo = Number(match?.[1] ?? 0);
      newNo = Number(match?.[2] ?? 0);
      current.lines.push({ kind: "meta", text: raw, oldNo: null, newNo: null });
    } else if (
      raw.startsWith("+++") ||
      raw.startsWith("---") ||
      raw.startsWith("index ") ||
      raw.startsWith("similarity")
    ) {
      continue;
    } else if (raw.startsWith("+")) {
      current.additions += 1;
      current.lines.push({ kind: "add", text: raw.slice(1), oldNo: null, newNo: newNo++ });
    } else if (raw.startsWith("-")) {
      current.deletions += 1;
      current.lines.push({ kind: "del", text: raw.slice(1), oldNo: oldNo++, newNo: null });
    } else if (raw.startsWith(" ")) {
      current.lines.push({ kind: "ctx", text: raw.slice(1), oldNo: oldNo++, newNo: newNo++ });
    } else if (raw.startsWith("\\")) {
      current.lines.push({ kind: "meta", text: raw, oldNo: null, newNo: null });
    }
  }
  return files;
}
