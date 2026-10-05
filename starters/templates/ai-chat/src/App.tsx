import { MessageSquare, Plus, Sparkles, Trash2 } from "lucide-react";

import { Composer } from "./components/Composer";
import { MessageList, type Message } from "./components/MessageList";
import { uid, usePersistentState } from "./lib/usePersistentState";

type Conversation = { id: string; title: string; messages: Message[] };

const SEED: Conversation[] = [
  {
    id: "launch",
    title: "Launch plan for Q3",
    messages: [
      { id: 1, role: "user", text: "Can you outline a launch plan for our new analytics feature?" },
      {
        id: 2,
        role: "assistant",
        text: "Absolutely. Here's a three-phase plan:\n\n1. Private beta with 20 design partners (2 weeks)\n2. Public beta with in-app announcement and docs\n3. GA launch with webinar, blog post and pricing update\n\nWant me to draft the announcement copy next?",
      },
    ],
  },
  {
    id: "auth",
    title: "Refactor auth flow",
    messages: [
      { id: 1, role: "user", text: "What's a clean way to structure session refresh?" },
      { id: 2, role: "assistant", text: "Keep short-lived access tokens in memory, a rotating refresh token in an httpOnly cookie, and refresh on 401 with a single in-flight request so parallel calls don't stampede." },
    ],
  },
];

/** Placeholder reply until this UI is connected to a model. */
function demoReply(text: string): string {
  return `You said: "${text.slice(0, 120)}"\n\nThis chat UI isn't connected to a model yet. Ask Pulse to wire it to an AI provider (for example through a small API route) and replies will stream here.`;
}

export default function App() {
  const [conversations, setConversations] = usePersistentState<Conversation[]>("chat.conversations", SEED);
  const [activeId, setActiveId] = usePersistentState<string>("chat.active", SEED[0]!.id);
  const active = conversations.find((c) => c.id === activeId) ?? conversations[0];

  function newChat() {
    const conversation: Conversation = { id: uid(), title: "New chat", messages: [] };
    setConversations((current) => [conversation, ...current]);
    setActiveId(conversation.id);
  }

  function send(text: string) {
    if (!active) {
      const id = uid();
      setConversations([{ id, title: text.slice(0, 40), messages: [{ id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: demoReply(text) }] }]);
      setActiveId(id);
      return;
    }
    setConversations((current) =>
      current.map((c) =>
        c.id === active.id
          ? {
              ...c,
              title: c.messages.length ? c.title : text.slice(0, 40),
              messages: [...c.messages, { id: Date.now(), role: "user", text }, { id: Date.now() + 1, role: "assistant", text: demoReply(text) }],
            }
          : c,
      ),
    );
  }

  function remove(id: string) {
    setConversations((current) => current.filter((c) => c.id !== id));
    if (id === activeId) setActiveId(conversations.find((c) => c.id !== id)?.id ?? "");
  }

  return (
    <div className="flex h-screen bg-[#0a0d14] text-slate-200">
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-[#0c1019] p-3 md:flex">
        <button onClick={newChat} className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm hover:bg-white/5">
          <Plus className="h-4 w-4" /> New chat
        </button>
        <p className="px-2 pb-2 text-xs uppercase tracking-wider text-slate-500">Recent</p>
        <div className="flex-1 space-y-0.5 overflow-y-auto">
          {conversations.map((conversation) => (
            <div key={conversation.id} className={`group flex items-center rounded-lg ${active?.id === conversation.id ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/5"}`}>
              <button onClick={() => setActiveId(conversation.id)} className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm">
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="truncate">{conversation.title}</span>
              </button>
              <button onClick={() => remove(conversation.id)} className="mr-1 rounded p-1 opacity-0 hover:text-rose-300 group-hover:opacity-100" aria-label={`Delete ${conversation.title}`}>
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/5 px-6 py-4">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h1 className="font-medium text-white">{active?.title ?? "New chat"}</h1>
          <button onClick={newChat} className="ml-auto rounded-lg border border-white/10 px-3 py-1.5 text-xs md:hidden">New chat</button>
        </header>
        {active?.messages.length ? (
          <MessageList messages={active.messages} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-500"><Sparkles className="h-6 w-6 text-white" /></div>
            <h2 className="mt-4 text-xl font-semibold text-white">How can I help today?</h2>
            <div className="mt-6 grid max-w-xl gap-2 sm:grid-cols-2">
              {["Summarize this week's metrics", "Draft a product announcement", "Explain a regex", "Plan a team offsite"].map((idea) => (
                <button key={idea} onClick={() => send(idea)} className="rounded-xl border border-white/10 px-4 py-3 text-left text-sm text-slate-300 hover:bg-white/5">{idea}</button>
              ))}
            </div>
          </div>
        )}
        <Composer onSend={send} />
      </main>
    </div>
  );
}
