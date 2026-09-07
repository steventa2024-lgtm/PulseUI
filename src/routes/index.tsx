import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Boxes,
  Code2,
  Eye,
  History,
  Loader2,
  Monitor,
  Smartphone,
  Sparkles,
  Trash2,
  Wand2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { CodeView } from "@/components/studio/CodeView";
import { PreviewFrame } from "@/components/studio/PreviewFrame";
import { MODIFIERS, PRESETS } from "@/lib/presets";
import { streamComponent, getGeneratorInfo } from "@/lib/component-generation.functions";
import type { StreamFrame } from "@/lib/component-generation.types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PromptUI Studio — AI Tailwind & React Component Generator" },
      {
        name: "description",
        content:
          "Describe any UI block and get production-ready React + Tailwind CSS code with a live interactive preview, style modifiers and one-click copy.",
      },
      { property: "og:title", content: "PromptUI Studio — AI Component Generator" },
      {
        property: "og:description",
        content:
          "Generate production-ready React + Tailwind components from natural language, with live preview and clean code view.",
      },
    ],
  }),
  component: Studio,
});

type HistoryItem = { id: string; prompt: string; code: string; at: string };

const HISTORY_KEY = "promptui-studio:history";
const HISTORY_LIMIT = 20;

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((item): item is HistoryItem => {
        const candidate = item as Partial<HistoryItem> | null;
        return (
          !!candidate &&
          typeof candidate.id === "string" &&
          typeof candidate.prompt === "string" &&
          typeof candidate.code === "string" &&
          typeof candidate.at === "string"
        );
      })
      .slice(0, HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const WELCOME = `function GeneratedComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0f1115] p-10">
      <div className="max-w-md text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-lime-300">PromptUI Studio</p>
        <h1 className="mt-4 text-3xl font-semibold text-white">Your component renders here</h1>
        <p className="mt-3 text-sm text-white/50">
          Describe a UI block on the left, or start from a preset, and watch it come alive.
        </p>
      </div>
    </div>
  );
}`;

function Studio() {
  const [prompt, setPrompt] = useState("");
  const [modifiers, setModifiers] = useState<string[]>(["dark", "gradients"]);
  const [code, setCode] = useState(WELCOME);
  // Raw text as it streams in. The preview keeps rendering the last finished
  // component until a generation completes, since partial JSX cannot compile.
  const [streamText, setStreamText] = useState("");
  const [tab, setTab] = useState<"preview" | "code">("preview");
  const [viewport, setViewport] = useState<"desktop" | "mobile">("desktop");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [historyReady, setHistoryReady] = useState(false);

  // Read after mount: reading during render would desync SSR and hydration.
  useEffect(() => {
    setHistory(loadHistory());
    setHistoryReady(true);
  }, []);

  useEffect(() => {
    if (!historyReady) return;
    try {
      window.localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    } catch {
      // Storage can be full or blocked; history stays in memory for this session.
    }
  }, [history, historyReady]);

  const generate = useServerFn(streamComponent);
  const readInfo = useServerFn(getGeneratorInfo);

  const info = useQuery({
    queryKey: ["generator-info"],
    queryFn: () => readInfo(),
    staleTime: Infinity,
  });

  const mutation = useMutation({
    mutationFn: async (input: { prompt: string; modifiers: string[] }) => {
      setStreamText("");
      // Show the code pane while tokens arrive; the preview has nothing to show
      // until the component is complete.
      setTab("code");

      const result = await generate({ data: input });
      // The RPC layer hands back a plain ReadableStream even though the server
      // signature says RawStream, so the cast reflects what actually arrives.
      const stream = result.stream as unknown as ReadableStream<Uint8Array>;

      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let finished: { code: string; model: string } | null = null;
      let failure: string | null = null;

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let index: number;
        while ((index = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, index).trim();
          buffer = buffer.slice(index + 1);
          if (!line) continue;

          let frame: StreamFrame;
          try {
            frame = JSON.parse(line) as StreamFrame;
          } catch {
            continue;
          }

          if (frame.type === "delta") {
            text += frame.text;
            setStreamText(text);
          } else if (frame.type === "done") {
            finished = { code: frame.code, model: frame.model };
          } else {
            failure = frame.message;
          }
        }
      }

      if (failure) throw new Error(failure);
      if (!finished) throw new Error("The generation stream ended before the component was done.");
      return finished;
    },
    onSuccess: (result, input) => {
      setCode(result.code);
      setStreamText("");
      setTab("preview");
      setHistory((prev) =>
        [
          {
            id: newId(),
            prompt: input.prompt,
            code: result.code,
            at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          },
          ...prev,
        ].slice(0, HISTORY_LIMIT),
      );
    },
    onError: (error: Error) => {
      setStreamText("");
      toast.error(error.message || "Generation failed");
    },
  });

  const run = (value: string) => {
    const text = value.trim();
    if (text.length < 3) {
      toast.error("Describe the component you want first.");
      return;
    }
    mutation.mutate({ prompt: text, modifiers });
  };

  const toggleModifier = (id: string) =>
    setModifiers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const surface: "dark" | "light" = modifiers.includes("light") ? "light" : "dark";
  const unconfigured = info.data?.configured === false;

  return (
    <div className="studio-grid flex h-screen flex-col bg-background">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight">PromptUI Studio</h1>
            <p className="font-mono text-[11px] text-muted-foreground">
              AI component &amp; Tailwind generator
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1.5 font-mono text-[11px] text-muted-foreground">
          <Sparkles className="size-3 text-primary" />
          {info.data?.model ?? (unconfigured ? "not configured" : "connecting…")}
        </Badge>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Left: prompt + controls + history */}
        <aside className="scroll-slim flex w-full shrink-0 flex-col gap-5 overflow-y-auto border-b border-border bg-panel p-5 lg:w-[380px] lg:border-b-0 lg:border-r">
          {unconfigured && (
            <div className="flex gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2.5">
              <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
              <p className="text-xs leading-relaxed text-foreground">
                No AI provider is configured. Add{" "}
                <code className="font-mono text-[11px] text-destructive">GEMINI_API_KEY</code> to
                your <code className="font-mono text-[11px] text-destructive">.env.local</code> and
                restart the dev server.
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            <label
              htmlFor="prompt"
              className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground"
            >
              Prompt
            </label>
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) run(prompt);
              }}
              placeholder="Build a modern pricing card with 3 tiers and a toggle for annual billing…"
              className="min-h-32 resize-none bg-elevated font-mono text-[13px]"
            />
            <Button className="w-full" disabled={mutation.isPending} onClick={() => run(prompt)}>
              {mutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Wand2 className="size-4" />
              )}
              {mutation.isPending ? "Generating…" : "Generate component"}
            </Button>
            <p className="text-center font-mono text-[10px] text-muted-foreground">⌘ / Ctrl + ↵</p>
          </div>

          <div className="space-y-2.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Style modifiers
            </p>
            <div className="flex flex-wrap gap-1.5">
              {MODIFIERS.map((m) => {
                const active = modifiers.includes(m.id);
                return (
                  <button
                    key={m.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => toggleModifier(m.id)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-elevated text-muted-foreground hover:border-primary/50 hover:text-foreground",
                    )}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <p className="font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
              Presets
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={mutation.isPending}
                  onClick={() => {
                    setPrompt(preset.prompt);
                    run(preset.prompt);
                  }}
                  className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-left text-xs font-medium transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
                <History className="size-3" /> History
              </p>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground transition-colors hover:text-destructive"
                >
                  <Trash2 className="size-3" /> Clear
                </button>
              )}
            </div>
            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-4 text-xs text-muted-foreground">
                Generated components appear here for one-click restore.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {history.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => setCode(item.code)}
                      className="w-full rounded-lg border border-border bg-elevated px-3 py-2 text-left transition-colors hover:border-primary/60"
                    >
                      <span className="line-clamp-2 text-xs text-foreground">{item.prompt}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{item.at}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>

        {/* Right: workspace */}
        <main className="flex min-h-0 flex-1 flex-col p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="flex rounded-lg border border-border bg-panel p-1">
              {(
                [
                  { id: "preview", label: "Live Preview", icon: Eye },
                  { id: "code", label: "Code", icon: Code2 },
                ] as const
              ).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3.5 py-1.5 text-xs font-medium transition-colors",
                    tab === id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="size-3.5" />
                  {label}
                </button>
              ))}
            </div>

            {mutation.isPending && (
              <span className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin text-primary" />
                {streamText
                  ? `Streaming… ${streamText.length.toLocaleString()} chars`
                  : `Waiting for ${info.data?.model ?? "the model"}…`}
              </span>
            )}

            {tab === "preview" && (
              <div className="flex rounded-lg border border-border bg-panel p-1">
                {(
                  [
                    { id: "desktop", icon: Monitor },
                    { id: "mobile", icon: Smartphone },
                  ] as const
                ).map(({ id, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    aria-label={`${id} viewport`}
                    aria-pressed={viewport === id}
                    onClick={() => setViewport(id)}
                    className={cn(
                      "rounded-md px-2.5 py-1.5 transition-colors",
                      viewport === id
                        ? "bg-elevated text-primary"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    <Icon className="size-3.5" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="relative min-h-0 flex-1">
            {mutation.isPending && tab === "preview" && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-background/70 backdrop-blur-sm">
                <div className="flex items-center gap-2 rounded-full border border-border bg-panel px-4 py-2 text-xs">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  Composing your component…
                </div>
              </div>
            )}

            {tab === "preview" ? (
              <div className="flex h-full justify-center">
                <div
                  className={cn(
                    "h-full transition-all",
                    viewport === "mobile" ? "w-[390px]" : "w-full",
                  )}
                >
                  <PreviewFrame code={code} surface={surface} />
                </div>
              </div>
            ) : (
              <CodeView
                code={mutation.isPending ? streamText : code}
                streaming={mutation.isPending}
              />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
