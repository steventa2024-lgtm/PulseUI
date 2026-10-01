import { useState, type FormEvent } from "react";
import { ArrowUp, Paperclip } from "lucide-react";

export function Composer({ onSend }: { onSend: (text: string) => void }) {
  const [text, setText] = useState("");

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText("");
  }

  return (
    <form onSubmit={submit} className="border-t border-white/5 p-4">
      <div className="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-2 focus-within:border-violet-400/50">
        <button type="button" className="p-2 text-slate-500 hover:text-slate-300" aria-label="Attach file">
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) submit(event);
          }}
          rows={1}
          placeholder="Message the assistant…"
          className="max-h-40 flex-1 resize-none bg-transparent py-2 text-sm outline-none placeholder:text-slate-500"
        />
        <button className="rounded-xl bg-violet-500 p-2 text-white disabled:opacity-40" disabled={!text.trim()} aria-label="Send">
          <ArrowUp className="h-4 w-4" />
        </button>
      </div>
    </form>
  );
}
