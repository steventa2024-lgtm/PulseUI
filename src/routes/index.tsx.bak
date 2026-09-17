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
      { title: "PulseUi Studio — AI Tailwind & React Component Generator" },
      {
        name: "description",
        content:
          "Describe any UI block and get production-ready React + Tailwind CSS code with a live interactive preview, style modifiers and one-click copy.",
      },
      { property: "og:title", content: "PulseUi Studio — AI Component Generator" },
      {
        property: "og:description",
        content:
          "Generate production-ready React + Tailwind components from natural language, with live preview and clean code view.",
      },
    ],
  }),
  component: Studio,
});

type HistoryItem = { id: string; prompt: string; code: string; at: string; messages: { role: "user" | "assistant"; content: string; code?: string }[] };

const HISTORY_KEY = "promptui-studio:history";
const HISTORY_LIMIT = 20;

const HIST = [
  { id: "1", prompt: "Build a pricing card with 3 tiers and toggle for annual billing" },
  { id: "2", prompt: "Create a hero section with gradient background and CTA buttons" },
  { id: "3", prompt: "Design a modal dialog with form validation" },
];

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
        <p className="text-xs uppercase tracking-widest text-violet-300/70">PulseUi Studio</p>
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
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; content: string; code?: string }[]>([]);
  const [historyReady, setHistoryReady] = useState(false);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [activeNav, setActiveNav] = useState<"dashboard" | "search" | "connectors" | "settings" | "projects" | "chat">("chat");
  const [searchQuery, setSearchQuery] = useState("");

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
      const newMessages = [
        ...messages,
        { role: "assistant" as const, content: "Generated a component for: " + input.prompt.slice(0, 60) + (input.prompt.length > 60 ? "…" : ""), code: result.code },
      ];
      setMessages(newMessages);
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
            messages: newMessages,
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
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    mutation.mutate({ prompt: text, modifiers });
  };

  const toggleModifier = (id: string) =>
    setModifiers((prev) => (prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]));

  const surface: "dark" | "light" = modifiers.includes("light") ? "light" : "dark";
  const unconfigured = info.data?.configured === false;

  return (
    <div className="gradient-hero studio-grid flex h-screen flex-col bg-gradient-to-br from-[#1a0b2e] via-[#0f0620] to-[#05010a]">
      <header className="flex items-center justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Boxes className="size-4" />
          </span>
          <div className="leading-tight">
            <h1 className="text-sm font-semibold tracking-tight">PulseUi Studio</h1>
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

      <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)] h-screen w-full">
        {/* LEFT SIDEBAR — placeholder */}
        <aside className="hidden lg:flex flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl overflow-y-auto">
          <div className="flex flex-col h-full">
            {/* Nav */}
            <nav className="flex flex-col gap-0.5 p-2">
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "dashboard"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("dashboard")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /></svg>
                Dashboard
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "search"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("search")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
                Search
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "connectors"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("connectors")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>
                Connectors
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "settings"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("settings")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
                Settings
              </button>
            </nav>

            {/* Projects */}
            <div className="border-t border-white/5 px-2 py-3">
              <div className="px-3 pb-2 text-[10px] font-medium uppercase tracking-wider text-white/40">Projects</div>
              <button className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm text-white/70 transition-colors hover:bg-white/5 hover:text-white">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 6a2 2 0 0 1 2-2h5l2 2h9a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" /></svg>
                All projects
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "projects"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("projects")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                My projects
              </button>
              <button
                className={cn(
                  "flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                  activeNav === "projects"
                    ? "bg-violet-500/15 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white",
                )}
                onClick={() => setActiveNav("projects")}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
                Shared projects
              </button>
            </div>

            {/* Recent chats */}
            <div className="flex-1 overflow-y-auto border-t border-white/5 px-2 py-3">
              <div className="px-3 pb-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search chats…"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs text-white placeholder:text-white/30 focus:border-violet-400/40 focus:outline-none"
                />
              </div>
              <div className="flex items-center justify-between px-3 pb-2">
                <span className="text-[10px] font-medium uppercase tracking-wider text-white/40">Recent</span>
                <button
                  type="button"
                  onClick={() => {
                    setMessages([]);
                    setPrompt("");
                    setCode(WELCOME);
                    setStreamText("");
                    setActiveChatId(null);
                    setTab("preview");
                  }}
                  className="rounded-md px-2 py-0.5 text-[10px] font-medium text-white/50 transition-colors hover:bg-white/10 hover:text-white"
                >
                  + New
                </button>
              </div>
              {history
                .filter((item) =>
                  !searchQuery.trim() ||
                  item.prompt.toLowerCase().includes(searchQuery.trim().toLowerCase()),
                )
                .map((item) => (
                <div key={item.id} className="group relative mb-0.5">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      setPrompt(item.prompt);
                      setActiveChatId(item.id);
                      setMessages([]);
                    }}
                    className={`block w-full rounded-lg px-3 py-2 pr-8 text-left text-xs transition-colors cursor-pointer ${
                      activeChatId === item.id
                        ? "bg-violet-500/15 border border-violet-400/30 text-white"
                        : "text-white/60 hover:bg-white/5 hover:text-white/90"
                    }`}
                  >
                    <div className="line-clamp-2 leading-snug">{item.prompt}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setHistory((prev) => prev.filter((h) => h.id !== item.id));
                      if (activeChatId === item.id) {
                        setMessages([]);
                        setPrompt("");
                        setCode(WELCOME);
                        setActiveChatId(null);
                      }
                    }}
                    className="absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded-md px-1.5 py-0.5 text-xs text-white/40 transition-colors hover:bg-red-500/20 hover:text-red-300 group-hover:block"
                    aria-label="Delete chat"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

          </div>
        </aside>

        {/* MIDDLE — prompt + controls + history */}
        {activeNav === "chat" && (
          <section className="flex flex-col min-h-0 overflow-hidden border-r border-white/10">
            <div className="flex flex-1 flex-col overflow-y-auto p-5">
              {messages.length > 0 && (
                <div className="mb-5 space-y-3 border-b border-white/5 pb-5">
                  {messages.map((m, i) => (
                    <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                      {m.role === "user" ? (
                        <div className="max-w-[85%] rounded-2xl border border-violet-400/30 bg-violet-500/20 px-4 py-2.5 text-sm text-white">
                          {m.content}
                        </div>
                      ) : (
                        <div className="max-w-[85%] space-y-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white/80">
                          <div>{m.content}</div>
                          {m.code && (
                            <>
                              <details className="rounded-lg border border-white/10 bg-black/30">
                                <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-white/70 hover:text-white">
                                  View code
                                </summary>
                                <pre className="max-h-64 overflow-y-auto px-3 py-2 text-xs text-white/70">
                                  <code>{m.code}</code>
                                </pre>
                              </details>
                              <div className="flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCode(m.code || "");
                                    setTab("preview");
                                  }}
                                  className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-1.5 text-xs font-medium text-violet-200 hover:bg-violet-500/20"
                                >
                                  Show in Preview →
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (m.code) navigator.clipboard.writeText(m.code);
                                  }}
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                  Copy code
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!m.code) return;
                                    const blob = new Blob([m.code], { type: "text/plain" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = "component.tsx";
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white/70 hover:bg-white/10 hover:text-white"
                                >
                                  Download .tsx
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
              <Button className="w-full hover-glow" disabled={mutation.isPending} onClick={() => run(prompt)}>
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
                    }}
                    className="rounded-lg border border-border bg-elevated px-3 py-2.5 text-left text-xs font-medium transition-colors hover:border-primary/60 hover:text-primary disabled:opacity-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

          </div>
            </section>

            )}
            {activeNav !== "chat" && (
              <section className="flex flex-col min-h-0 overflow-hidden border-r border-white/10">
                <div className="flex flex-1 flex-col overflow-y-auto p-5">
                  <div className="flex flex-1 items-center justify-center">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-white">{activeNav.charAt(0).toUpperCase() + activeNav.slice(1)}</p>
                      <p className="mt-2 text-sm text-white/50">Coming soon</p>
                    </div>
                  </div>
                </div>
              </section>
            )}

        {/* RIGHT — Live Preview / Code panel */}
        <section className="flex flex-col min-h-0 overflow-hidden">
          <div className="flex flex-1 flex-col p-4">
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
                      "h-full transition-all bg-black/30 backdrop-blur-xl border border-white/10 rounded-2xl",
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
          </div>
        </section>
      </div>
    </div>
  );
}
