import { Fragment, type ReactNode } from "react";

/**
 * Minimal, safe Markdown subset for chat messages: paragraphs, bullet and
 * numbered lists, fenced code, inline code and bold. Renders React nodes only,
 * never raw HTML.
 */
function inline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*)/g;
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0;
    if (index > last) parts.push(text.slice(last, index));
    const token = match[0];
    if (token.startsWith("`")) {
      parts.push(
        <code
          key={index}
          className="rounded bg-pulse-surface-overlay px-1 py-0.5 font-mono text-[0.85em] text-pulse-cyan"
        >
          {token.slice(1, -1)}
        </code>,
      );
    } else {
      parts.push(
        <strong key={index} className="font-semibold text-pulse-text">
          {token.slice(2, -2)}
        </strong>,
      );
    }
    last = index + token.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

export function MessageText({ text }: { text: string }) {
  const blocks = text.split(/```[\w.+-]*\n?/);
  return (
    <div className="space-y-2 text-[13.5px] leading-relaxed text-pulse-text-secondary">
      {blocks.map((block, blockIndex) => {
        if (blockIndex % 2 === 1) {
          return (
            <pre
              key={blockIndex}
              className="overflow-x-auto rounded-md border border-pulse-border bg-pulse-bg-deep p-3 font-mono text-xs text-pulse-text"
            >
              {block.replace(/\n$/, "")}
            </pre>
          );
        }
        const paragraphs = block.split(/\n{2,}/).filter((paragraph) => paragraph.trim());
        return (
          <Fragment key={blockIndex}>
            {paragraphs.map((paragraph, index) => {
              const lines = paragraph.split("\n");
              if (lines.every((line) => /^\s*([-*]|\d+\.)\s/.test(line))) {
                const ordered = /^\s*\d+\./.test(lines[0] ?? "");
                const List = ordered ? "ol" : "ul";
                return (
                  <List
                    key={index}
                    className={ordered ? "list-decimal space-y-1 pl-5" : "list-disc space-y-1 pl-5"}
                  >
                    {lines.map((line, lineIndex) => (
                      <li key={lineIndex}>{inline(line.replace(/^\s*([-*]|\d+\.)\s/, ""))}</li>
                    ))}
                  </List>
                );
              }
              return (
                <p key={index} className="whitespace-pre-wrap">
                  {inline(paragraph)}
                </p>
              );
            })}
          </Fragment>
        );
      })}
    </div>
  );
}
