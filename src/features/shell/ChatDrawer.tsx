import { ArrowUp, Loader2, MessageSquareText, Sparkles, Square, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { MessageText } from "@/features/builder/agent/MessageText";
import { ModelSelector, readStoredModel } from "@/features/composer/ModelSelector";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "assistant"; content: string };

/**
 * "Chat with AI": a plain conversation with the configured model for
 * questions and planning. It has no tools and cannot change projects.
 */
export function ChatDrawer({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [modelId, setModelId] = useState<string | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!modelId) setModelId(readStoredModel());
  }, [modelId]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [turns]);

  const send = async (event?: FormEvent) => {
    event?.preventDefault();
    const text = input.trim();
    if (!text || streaming) return;
    const history: Turn[] = [...turns, { role: "user", content: text }];
    setTurns([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setStreaming(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ modelId, messages: history }),
        signal: controller.signal,
      });
      if (!response.ok || !response.body) throw new Error(await response.text());
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        setTurns((current) => {
          const next = [...current];
          const last = next[next.length - 1];
          if (last) next[next.length - 1] = { ...last, content: last.content + chunk };
          return next;
        });
      }
    } catch (caught) {
      if (!controller.signal.aborted) {
        setError(caught instanceof Error ? caught.message : String(caught));
        setTurns((current) => (current.at(-1)?.content ? current : current.slice(0, -1)));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-pulse-border bg-pulse-bg-elevated p-0 sm:max-w-md"
      >
        <div className="flex items-center gap-2 border-b border-pulse-border px-4 py-3 pr-12">
          <MessageSquareText className="h-4 w-4 text-pulse-cyan" />
          <SheetTitle className="text-sm font-semibold text-pulse-text">Chat with AI</SheetTitle>
          <SheetDescription className="sr-only">
            Ask Pulse questions. This chat cannot change your projects.
          </SheetDescription>
          {turns.length > 0 && (
            <button
              onClick={() => setTurns([])}
              className="ml-auto rounded p-1 text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text"
              aria-label="Clear conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <div
          ref={listRef}
          className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          aria-live="polite"
        >
          {!turns.length && (
            <div className="rounded-[var(--pulse-radius-lg)] border border-dashed border-pulse-border-strong p-5 text-center">
              <Sparkles className="mx-auto mb-2 h-5 w-5 text-pulse-cyan" />
              <p className="text-sm text-pulse-text">Ask anything before you build.</p>
              <p className="mt-1 text-xs text-pulse-text-secondary">
                Brainstorm features, pick a stack or refine a prompt. To build, use the main
                composer — this chat can't edit projects.
              </p>
            </div>
          )}
          {turns.map((turn, index) =>
            turn.role === "user" ? (
              <p
                key={index}
                className="ml-auto max-w-[88%] whitespace-pre-wrap rounded-[var(--pulse-radius-lg)] rounded-br-sm border border-pulse-blue/25 bg-pulse-blue/10 px-3.5 py-2.5 text-[13.5px] text-pulse-text"
              >
                {turn.content}
              </p>
            ) : (
              <div key={index} className="max-w-[95%]">
                {turn.content ? (
                  <MessageText text={turn.content} />
                ) : (
                  <Loader2
                    className="h-4 w-4 animate-spin text-pulse-cyan"
                    aria-label="Pulse is replying"
                  />
                )}
              </div>
            ),
          )}
          {error && (
            <p className="rounded-md bg-pulse-danger/10 px-3 py-2 text-xs text-pulse-danger">
              {error}
            </p>
          )}
        </div>
        <form onSubmit={send} className="border-t border-pulse-border p-3">
          <div className="rounded-[var(--pulse-radius-lg)] border border-pulse-border-strong bg-pulse-surface focus-within:border-pulse-cyan/60">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void send();
                }
              }}
              rows={2}
              placeholder="Message Pulse…"
              aria-label="Message"
              className="block w-full resize-none bg-transparent px-3 pt-2.5 text-sm text-pulse-text placeholder:text-pulse-text-muted focus:outline-none"
            />
            <div className="flex items-center justify-between px-2 pb-2">
              <ModelSelector value={modelId} onChange={(id) => setModelId(id)} />
              {streaming ? (
                <button
                  type="button"
                  onClick={() => abortRef.current?.abort()}
                  className="flex h-8 w-8 items-center justify-center rounded-lg bg-pulse-danger/15 text-pulse-danger"
                  aria-label="Stop"
                >
                  <Square className="h-3 w-3 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg bg-[#1e7bff] text-white disabled:opacity-40",
                  )}
                  aria-label="Send"
                >
                  <ArrowUp className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
