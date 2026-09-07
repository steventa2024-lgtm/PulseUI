import { useMemo } from "react";

type PreviewFrameProps = {
  code: string;
  surface: "dark" | "light";
};

/**
 * Embed the component source as a JS string literal rather than inlining it as
 * script text. Escaping every "<" means a stray "</script>" in the generated
 * code can never terminate the harness element, and it lets us wrap compilation
 * in a real try/catch so syntax errors surface instead of blanking the preview.
 */
function toStringLiteral(code: string): string {
  return JSON.stringify(code).replace(/</g, "\\u003c");
}

function buildDocument(code: string, surface: "dark" | "light") {
  const body = surface === "dark" ? "#0f1115" : "#ffffff";

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script src="https://cdn.tailwindcss.com"></script>
    <script crossorigin src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    <script src="https://unpkg.com/@babel/standalone@7/babel.min.js"></script>
    <style>
      html, body { margin: 0; background: ${body}; }
      #root { min-height: 100vh; }
      .preview-error {
        font-family: ui-monospace, monospace; color: #ff8080; background: #1a0f12;
        padding: 16px; font-size: 12px; white-space: pre-wrap; line-height: 1.6;
      }
    </style>
  </head>
  <body>
    <div id="root"></div>
    <script>
      (function () {
        var SOURCE = ${toStringLiteral(code)};
        var root = document.getElementById("root");

        function fail(label, error) {
          var detail = error && error.message ? error.message : String(error);
          var box = document.createElement("div");
          box.className = "preview-error";
          box.textContent = label + "\\n\\n" + detail;
          root.replaceChildren(box);
        }

        if (typeof Babel === "undefined" || typeof React === "undefined") {
          return fail(
            "Preview libraries did not load.",
            new Error("Check your network connection and reload."),
          );
        }

        var compiled;
        try {
          // Pin the classic runtime: the automatic runtime emits an import of
          // react/jsx-runtime, which cannot resolve inside new Function().
          compiled = Babel.transform(SOURCE, {
            presets: [["react", { runtime: "classic" }]],
            filename: "GeneratedComponent.jsx",
          }).code;
        } catch (error) {
          return fail("The generated code did not compile.", error);
        }

        var Component;
        try {
          var factory = new Function(
            "React",
            compiled +
              "\\nreturn typeof GeneratedComponent !== 'undefined' ? GeneratedComponent : null;",
          );
          Component = factory(React);
        } catch (error) {
          return fail("The generated code threw while loading.", error);
        }

        if (typeof Component !== "function") {
          return fail(
            "No GeneratedComponent was found in the output.",
            new Error("The model returned code without a top-level component function."),
          );
        }

        class ErrorBoundary extends React.Component {
          constructor(props) {
            super(props);
            this.state = { error: null };
          }
          static getDerivedStateFromError(error) {
            return { error: error };
          }
          render() {
            if (this.state.error) {
              var detail = this.state.error.message || String(this.state.error);
              return React.createElement(
                "div",
                { className: "preview-error" },
                "The component crashed while rendering.\\n\\n" + detail,
              );
            }
            return this.props.children;
          }
        }

        try {
          ReactDOM.createRoot(root).render(
            React.createElement(ErrorBoundary, null, React.createElement(Component)),
          );
        } catch (error) {
          fail("The component failed to render.", error);
        }
      })();
    </script>
  </body>
</html>`;
}

/** Cheap stable key so each new component gets a fresh iframe document. */
function hash(value: string): number {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) {
    h = (Math.imul(31, h) + value.charCodeAt(i)) | 0;
  }
  return h;
}

export function PreviewFrame({ code, surface }: PreviewFrameProps) {
  const srcDoc = useMemo(() => buildDocument(code, surface), [code, surface]);

  return (
    <iframe
      key={`${surface}-${hash(code)}`}
      title="Live component preview"
      className="h-full w-full rounded-xl border border-border bg-code"
      sandbox="allow-scripts"
      srcDoc={srcDoc}
    />
  );
}
