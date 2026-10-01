import { useState } from "react";
import { MessageSquare, Plus, Sparkles } from "lucide-react";

import { Composer } from "./components/Composer";
import { MessageList, type Message } from "./components/MessageList";

const CONVERSATIONS = ["Launch plan for Q3", "Refactor auth flow", "Recipe ideas", "Trip to Lisbon"];

const INITIAL: Message[] = [
  { id: 1, role: "user", text: "Can you outline a launch plan for our new analytics feature?" },
  {
    id: 2,
    role: "assistant",
    text: "Absolutely. Here's a three-phase plan:\n\n1. Private beta with 20 design partners (2 weeks)\n2. Public beta with in-app announcement and docs\n3. GA launch with webinar, blog post and pricing update\n\nWant me to draft the announcement copy next?",
  },
];

export default function App() {
  const [messages, setMessages] = useState<Message[]>(INITIAL);
  const [active, setActive] = useState(CONVERSATIONS[0]);

  function send(text: string) {
    const id = Date.now();
    setMessages((current) => [
      ...current,
      { id, role: "user", text },
      {
        id: id + 1,
        role: "assistant",
        text: "This demo is not connected to a model yet. Ask Pulse to wire this composer to your AI provider of choice.",
      },
    ]);
  }

  return (
    <div className="flex h-screen bg-[#0a0d14] text-slate-200">
      <aside className="hidden w-64 flex-col border-r border-white/5 bg-[#0c1019] p-3 md:flex">
        <button className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-white/10 py-2 text-sm hover:bg-white/5">
          <Plus className="h-4 w-4" /> New chat
        </button>
        <p className="px-2 pb-2 text-xs uppercase tracking-wider text-slate-500">Recent</p>
        {CONVERSATIONS.map((title) => (
          <button
            key={title}
            onClick={() => setActive(title)}
            className={`flex items-center gap-2 truncate rounded-lg px-3 py-2 text-left text-sm ${
              active === title ? "bg-violet-500/15 text-violet-200" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <MessageSquare className="h-4 w-4 shrink-0" /> {title}
          </button>
        ))}
      </aside>
      <main className="flex flex-1 flex-col">
        <header className="flex items-center gap-2 border-b border-white/5 px-6 py-4">
          <Sparkles className="h-4 w-4 text-violet-400" />
          <h1 className="font-medium text-white">{active}</h1>
        </header>
        <MessageList messages={messages} />
        <Composer onSend={send} />
      </main>
    </div>
  );
}
