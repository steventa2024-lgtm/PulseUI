import { FileMinus2, FilePen, FilePlus2 } from "lucide-react";
import { useMemo, useState } from "react";

import { parseUnifiedDiff } from "@/lib/versions/diff-parse";
import { cn } from "@/lib/utils";

/** File list + unified diff with line numbers, built from real git output. */
export default function DiffViewer({ diff }: { diff: string }) {
  const files = useMemo(() => parseUnifiedDiff(diff), [diff]);
  const [selected, setSelected] = useState(0);
  const file = files[selected];

  if (!files.length)
    return <p className="p-6 text-sm text-pulse-text-muted">No file changes in this version.</p>;

  return (
    <div className="flex h-full min-h-0 max-md:flex-col">
      <ul
        className="w-64 shrink-0 overflow-y-auto border-r border-pulse-border p-2 max-md:max-h-40 max-md:w-full max-md:border-b max-md:border-r-0"
        aria-label="Changed files"
      >
        {files.map((entry, index) => (
          <li key={`${entry.path}-${index}`}>
            <button
              onClick={() => setSelected(index)}
              aria-current={index === selected}
              className={cn(
                "flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs",
                index === selected
                  ? "bg-pulse-surface-hover text-pulse-text"
                  : "text-pulse-text-secondary hover:bg-pulse-surface-raised",
              )}
            >
              {entry.status === "added" ? (
                <FilePlus2 className="h-3.5 w-3.5 shrink-0 text-pulse-success" />
              ) : entry.status === "deleted" ? (
                <FileMinus2 className="h-3.5 w-3.5 shrink-0 text-pulse-danger" />
              ) : (
                <FilePen className="h-3.5 w-3.5 shrink-0 text-pulse-cyan" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono">{entry.path}</span>
              <span className="shrink-0 font-mono text-[10px]">
                <span className="text-pulse-success">+{entry.additions}</span>{" "}
                <span className="text-pulse-danger">−{entry.deletions}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className="min-h-0 min-w-0 flex-1 overflow-auto bg-pulse-bg-deep">
        {file?.binary ? (
          <p className="p-6 text-sm text-pulse-text-muted">Binary file changed.</p>
        ) : (
          <table className="w-full border-collapse font-mono text-[12px] leading-[1.55]">
            <tbody>
              {file?.lines.map((line, index) => (
                <tr
                  key={index}
                  className={cn(
                    line.kind === "add" && "bg-pulse-success/[0.09]",
                    line.kind === "del" && "bg-pulse-danger/[0.09]",
                    line.kind === "meta" && "bg-pulse-blue/[0.07] text-pulse-text-muted",
                  )}
                >
                  <td className="w-12 select-none border-r border-pulse-border px-2 text-right text-pulse-text-muted/70">
                    {line.oldNo ?? ""}
                  </td>
                  <td className="w-12 select-none border-r border-pulse-border px-2 text-right text-pulse-text-muted/70">
                    {line.newNo ?? ""}
                  </td>
                  <td
                    className={cn(
                      "w-5 select-none text-center",
                      line.kind === "add"
                        ? "text-pulse-success"
                        : line.kind === "del"
                          ? "text-pulse-danger"
                          : "",
                    )}
                  >
                    {line.kind === "add" ? "+" : line.kind === "del" ? "−" : ""}
                  </td>
                  <td className="whitespace-pre-wrap break-all pr-4 text-pulse-text-secondary">
                    {line.text || " "}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
