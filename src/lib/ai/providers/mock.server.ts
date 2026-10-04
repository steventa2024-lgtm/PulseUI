/**
 * Deterministic test provider. Enabled only with AI_PROVIDER=mock and always
 * labelled as such in the UI. It speaks the real Pulse action protocol, so a
 * test run exercises the true agent loop end to end — tool calls, file writes,
 * targeted patches, install, build, repair and preview — without a paid model.
 *
 * Special prompt flags (tests only):
 *   [mock:break-build]  first write includes a TypeScript error, so the
 *                       repair loop has something real to fix.
 *   [mock:stall]        after streaming its edits the reply goes silent, so
 *                       the stream idle timeout has something to catch.
 */
import type { AIProvider, ChatTurn, GenerateRequest } from "../types";

const RUN_MARKER = "## Request";

function lastIndexWhere<T>(items: T[], predicate: (item: T) => boolean): number {
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (predicate(items[index] as T)) return index;
  }
  return -1;
}

function safeText(text: string): string {
  return text
    .replace(/[^\p{L}\p{N} .,:;!?'()-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 140);
}

function extractRequest(turn: ChatTurn | undefined): string {
  if (!turn) return "";
  const match = /## Request\n([\s\S]*?)(\n## |$)/.exec(turn.content);
  return (match?.[1] ?? "").trim();
}

function appSource(title: string): string {
  return `import { PulseCard } from "./components/PulseCard";

export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-slate-100" data-pulse-mock="true">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cyan-400">Built by Pulse (mock provider)</p>
        <h1 className="mt-3 text-4xl font-semibold tracking-tight">{${JSON.stringify(title)}}</h1>
        <PulseCard />
        <ul className="mt-8 space-y-2 text-sm text-slate-300">
          {/* pulse:items */}
        </ul>
      </div>
    </main>
  );
}
`;
}

const CARD_SOURCE = `export function PulseCard() {
  return (
    <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
      <h2 className="text-lg font-medium">Generated with the deterministic mock provider</h2>
      <p className="mt-2 text-sm text-slate-400">
        Configure a real model (Gemini, OpenAI-compatible or a local Ollama model) to build real apps.
      </p>
    </section>
  );
}
`;

const BROKEN_SOURCE = `export function PulseBroken() {
  const count: number = "not a number";
  return <span>{count}</span>;
}
`;

const FIXED_BROKEN_SOURCE = `export function PulseBroken() {
  const count: number = 1;
  return <span>{count}</span>;
}
`;

export function mockRespond(messages: ChatTurn[]): string {
  const runStart = lastIndexWhere(
    messages,
    (turn) => turn.role === "user" && turn.content.includes(RUN_MARKER),
  );
  if (runStart === -1) {
    // Plain chat (not an agent run).
    return "I'm the deterministic mock provider used for tests, so I can't really chat. Configure Gemini, an OpenAI-compatible endpoint or a local Ollama model to talk to Pulse.";
  }
  const request = extractRequest(messages[runStart]);
  const planMode = messages[runStart]?.content.includes("MODE: PLAN") ?? false;
  const last = messages[messages.length - 1];

  if (last?.role === "user" && last.content.startsWith("## Build failed")) {
    return [
      "The build failed on a type error in PulseBroken.tsx. Fixing the assignment.",
      `<write path="src/components/PulseBroken.tsx">\n${FIXED_BROKEN_SOURCE}</write>`,
      "<done>Fixed the type error in src/components/PulseBroken.tsx.</done>",
    ].join("\n\n");
  }

  const step = messages.slice(runStart + 1).filter((turn) => turn.role === "assistant").length;

  if (planMode) {
    if (step === 0)
      return 'Let me look at the project first.\n\n<action name="list_files">{}</action>';
    return [
      `Here is a plan for: ${safeText(request)}`,
      "<plan>\n1. Update src/App.tsx with the new layout\n2. Add focused components under src/components\n3. Run the build and refresh the preview\n</plan>",
      "<done>Plan ready. Switch to Build mode to apply it.</done>",
    ].join("\n\n");
  }

  if (step === 0) {
    return [
      "I'll inspect the current entry component before editing.",
      "<plan>\n1. Read src/App.tsx\n2. Apply the requested change\n3. Validate with a build\n</plan>",
      '<action name="read_file">{"path":"src/App.tsx"}</action>',
    ].join("\n\n");
  }

  if (step === 1) {
    const previous = last?.content ?? "";
    const title = safeText(request) || "New PulseUI project";
    const breakBuild = request.includes("[mock:break-build]");
    if (previous.includes("data-pulse-mock")) {
      const parts = [
        "The app already exists, so I'll make a targeted change instead of rewriting it.",
        `<patch path="src/App.tsx">\n<<<<<<< SEARCH\n          {/* pulse:items */}\n=======\n          <li>{${JSON.stringify(title)}}</li>\n          {/* pulse:items */}\n>>>>>>> REPLACE\n</patch>`,
      ];
      if (breakBuild)
        parts.push(`<write path="src/components/PulseBroken.tsx">\n${BROKEN_SOURCE}</write>`);
      return parts.join("\n\n");
    }
    const parts = [
      "Writing the application files.",
      `<write path="src/App.tsx">\n${appSource(title)}</write>`,
      `<write path="src/components/PulseCard.tsx">\n${CARD_SOURCE}</write>`,
    ];
    if (breakBuild)
      parts.push(`<write path="src/components/PulseBroken.tsx">\n${BROKEN_SOURCE}</write>`);
    return parts.join("\n\n");
  }

  return "<done>Updated the app according to the request.</done>";
}

export class MockProvider implements AIProvider {
  readonly id = "mock";
  readonly label = "Mock (deterministic test provider)";
  readonly model = "pulse-mock";
  readonly capabilities = { streaming: true, tools: true, vision: false, local: true };

  supportsTools() {
    return true;
  }

  supportsVision() {
    return false;
  }

  async generate(request: GenerateRequest): Promise<string> {
    return mockRespond(request.messages);
  }

  async *stream(request: GenerateRequest): AsyncGenerator<string> {
    const text = mockRespond(request.messages);
    for (let index = 0; index < text.length; index += 48) {
      if (request.signal?.aborted) return;
      yield text.slice(index, index + 48);
      await new Promise((resolve) => setTimeout(resolve, 2));
    }
    const stall =
      /<(write|patch) /.test(text) &&
      request.messages.some(
        (turn) => turn.role === "user" && turn.content.includes("[mock:stall]"),
      );
    if (stall && request.signal && !request.signal.aborted) {
      const signal = request.signal;
      await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
    }
  }
}
