import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * Dependency-free JSX highlighter.
 *
 * Everything is matched in a single pass so the markup we emit is never fed
 * back through a later rule — chained `.replace()` passes end up recolouring
 * the class names inside their own spans and corrupt the output.
 */
const TOKEN =
  /(\/\*[\s\S]*?\*\/|\/\/[^\n]*)|("(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`)|(<\/?)([A-Za-z][\w.-]*)|([A-Za-z_][\w-]*)(?=\s*=[^=])|\b(function|const|let|var|return|if|else|for|while|new|class|true|false|null|undefined)\b/g;

function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function span(className: string, text: string): string {
  return `<span class="${className}">${escapeHtml(text)}</span>`;
}

function highlight(code: string): string {
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;

  TOKEN.lastIndex = 0;
  while ((match = TOKEN.exec(code)) !== null) {
    out += escapeHtml(code.slice(last, match.index));

    if (match[1]) out += span("text-syntax-comment", match[1]);
    else if (match[2]) out += span("text-syntax-string", match[2]);
    else if (match[3]) out += escapeHtml(match[3]) + span("text-syntax-tag", match[4] ?? "");
    else if (match[5]) out += span("text-syntax-attr", match[5]);
    else if (match[6]) out += span("text-syntax-keyword", match[6]);

    last = match.index + match[0].length;
  }

  return out + escapeHtml(code.slice(last));
}

/** A drop-in .jsx module rather than a bare function body. */
function toModule(code: string): string {
  return `import React from "react";\n\n${code}\n\nexport default GeneratedComponent;\n`;
}

export function CodeView({ code, streaming = false }: { code: string; streaming?: boolean }) {
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Follow the tail while tokens arrive, so the newest line stays in view.
  useEffect(() => {
    if (!streaming) return;
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [code, streaming]);

  const html = useMemo(() => highlight(code), [code]);
  const lineCount = useMemo(() => code.split("\n").length, [code]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied; leave the button in its idle state.
    }
  };

  const download = () => {
    const blob = new Blob([toModule(code)], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "GeneratedComponent.jsx";
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoking synchronously can cancel the download in some browsers.
    setTimeout(() => URL.revokeObjectURL(url), 0);
  };

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-border bg-code">
      <div className="absolute right-3 top-3 z-10 flex gap-2">
        <Button size="sm" variant="secondary" onClick={download} disabled={streaming}>
          <Download className="size-3.5" /> .jsx
        </Button>
        <Button size="sm" onClick={copy} disabled={streaming}>
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copied" : "Copy code"}
        </Button>
      </div>

      <div
        ref={scrollRef}
        className="scroll-slim h-full overflow-auto p-5 pt-16 font-mono text-[12.5px] leading-relaxed"
      >
        <div className="flex min-w-max gap-4">
          <div
            aria-hidden
            className="select-none whitespace-pre text-right text-muted-foreground/50"
          >
            {Array.from({ length: lineCount }, (_, i) => i + 1).join("\n")}
          </div>
          <pre className="whitespace-pre">
            <code dangerouslySetInnerHTML={{ __html: html }} />
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-2 animate-pulse bg-primary align-middle" />
            )}
          </pre>
        </div>
      </div>
    </div>
  );
}
