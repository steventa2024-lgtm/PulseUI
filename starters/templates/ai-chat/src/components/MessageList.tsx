import { Bot, User } from "lucide-react";

export type Message = { id: number; role: "user" | "assistant"; text: string };

export function MessageList({ messages }: { messages: Message[] }) {
  return (
    <div className="flex-1 overflow-y-auto px-6 py-8">
      <div className="mx-auto max-w-3xl space-y-6">
        {messages.map((message) => (
          <div key={message.id} className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
            <div
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                message.role === "user" ? "bg-slate-700" : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
              }`}
            >
              {message.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4 text-white" />}
            </div>
            <div
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                message.role === "user" ? "bg-violet-500/15 text-violet-50" : "border border-white/5 bg-white/[0.03]"
              }`}
            >
              {message.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
