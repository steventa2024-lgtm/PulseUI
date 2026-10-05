/**
 * CodeMirror 6 editor with PulseUI's IDE theme. Imported lazily by the Code
 * tab so none of this ships on the home page.
 */
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { javascript } from "@codemirror/lang-javascript";
import { json } from "@codemirror/lang-json";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView, keymap } from "@codemirror/view";
import { tags } from "@lezer/highlight";
import CodeMirror from "@uiw/react-codemirror";
import { useMemo } from "react";

function languageFor(path: string) {
  const lower = path.toLowerCase();
  if (/\.(tsx|jsx)$/.test(lower))
    return javascript({ jsx: true, typescript: lower.endsWith(".tsx") });
  if (/\.(ts|mts|cts)$/.test(lower)) return javascript({ typescript: true });
  if (/\.(js|mjs|cjs)$/.test(lower)) return javascript();
  if (lower.endsWith(".css")) return css();
  if (/\.(html|htm|svg|astro|vue)$/.test(lower)) return html();
  if (lower.endsWith(".json")) return json();
  if (/\.(md|markdown|mdx)$/.test(lower)) return markdown();
  return null;
}

const pulseTheme = EditorView.theme(
  {
    "&": {
      backgroundColor: "var(--pulse-bg-deep)",
      color: "var(--pulse-text)",
      height: "100%",
      fontSize: "13px",
    },
    ".cm-content": {
      fontFamily: "var(--font-mono)",
      caretColor: "var(--pulse-cyan)",
      padding: "10px 0",
    },
    ".cm-scroller": { fontFamily: "var(--font-mono)", lineHeight: "1.6" },
    ".cm-gutters": {
      backgroundColor: "var(--pulse-bg-deep)",
      color: "var(--pulse-text-muted)",
      border: "none",
      borderRight: "1px solid var(--pulse-border)",
    },
    ".cm-activeLine": { backgroundColor: "rgb(36 124 255 / 0.06)" },
    ".cm-activeLineGutter": {
      backgroundColor: "rgb(36 124 255 / 0.08)",
      color: "var(--pulse-text-secondary)",
    },
    ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--pulse-cyan)" },
    "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, ::selection": {
      backgroundColor: "rgb(0 207 255 / 0.18) !important",
    },
    ".cm-searchMatch": {
      backgroundColor: "rgb(199 44 255 / 0.25)",
      outline: "1px solid rgb(199 44 255 / 0.5)",
    },
    ".cm-panels": {
      backgroundColor: "var(--pulse-surface-raised)",
      color: "var(--pulse-text)",
      borderColor: "var(--pulse-border)",
    },
    ".cm-panels input, .cm-panels button": { fontFamily: "var(--font-sans)", fontSize: "12px" },
    ".cm-foldPlaceholder": {
      backgroundColor: "var(--pulse-surface-overlay)",
      border: "none",
      color: "var(--pulse-text-secondary)",
    },
    ".cm-tooltip": {
      backgroundColor: "var(--pulse-surface-raised)",
      border: "1px solid var(--pulse-border-strong)",
    },
  },
  { dark: true },
);

const pulseHighlight = HighlightStyle.define([
  { tag: [tags.keyword, tags.controlKeyword, tags.moduleKeyword], color: "#c792ff" },
  { tag: [tags.string, tags.special(tags.string)], color: "#7ee0b5" },
  { tag: [tags.number, tags.bool, tags.null], color: "#ffb86b" },
  {
    tag: [tags.comment, tags.lineComment, tags.blockComment],
    color: "#5d6c84",
    fontStyle: "italic",
  },
  { tag: [tags.typeName, tags.className], color: "#5ad7ff" },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: "#82aaff" },
  { tag: [tags.tagName], color: "#ff7aa8" },
  { tag: [tags.attributeName, tags.propertyName], color: "#9fd3ff" },
  { tag: [tags.operator, tags.punctuation], color: "#8fa0bb" },
  { tag: [tags.heading], color: "#ffffff", fontWeight: "600" },
  { tag: [tags.link, tags.url], color: "#00cfff", textDecoration: "underline" },
]);

export default function CodeEditor({
  path,
  value,
  onChange,
  onSave,
  readOnly,
}: {
  path: string;
  value: string;
  onChange: (value: string) => void;
  onSave: () => void;
  readOnly: boolean;
}) {
  const extensions = useMemo(() => {
    const language = languageFor(path);
    return [
      pulseTheme,
      syntaxHighlighting(pulseHighlight),
      EditorView.lineWrapping,
      keymap.of([
        {
          key: "Mod-s",
          preventDefault: true,
          run: () => {
            onSave();
            return true;
          },
        },
      ]),
      ...(language ? [language] : []),
    ];
  }, [path, onSave]);

  return (
    <CodeMirror
      value={value}
      onChange={onChange}
      extensions={extensions}
      readOnly={readOnly}
      theme="none"
      height="100%"
      className="h-full"
      basicSetup={{
        highlightActiveLine: true,
        foldGutter: true,
        searchKeymap: true,
        autocompletion: true,
        tabSize: 2,
      }}
      aria-label={`Editor for ${path}`}
    />
  );
}
