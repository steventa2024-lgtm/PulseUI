import { useState } from "react";
import { GripVertical, Plus } from "lucide-react";

import { PRIORITY_STYLES, TAG_STYLES, type Card, type COLUMNS } from "./data";

type Props = {
  column: (typeof COLUMNS)[number];
  cards: Card[];
  onDrop: (id: string) => void;
  onOpen: (card: Card) => void;
  onAdd: () => void;
};

export function Column({ column, cards, onDrop, onOpen, onAdd }: Props) {
  const [over, setOver] = useState(false);
  return (
    <section
      onDragOver={(event) => {
        event.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setOver(false);
        const id = event.dataTransfer.getData("text/plain");
        if (id) onDrop(id);
      }}
      className={`flex min-h-[420px] min-w-[260px] flex-col rounded-2xl border p-3 transition ${
        over ? "border-indigo-400/60 bg-indigo-500/5" : "border-white/5 bg-white/[0.02]"
      }`}
      aria-label={column.title}
    >
      <header className="mb-3 flex items-center gap-2 px-1">
        <span className={`h-2 w-2 rounded-full ${column.dot}`} />
        <h2 className="text-sm font-medium text-white">{column.title}</h2>
        <span className="rounded-full bg-white/5 px-2 text-xs text-slate-400">{cards.length}</span>
        <button onClick={onAdd} className="ml-auto rounded p-1 text-slate-500 hover:bg-white/5 hover:text-white" aria-label={`Add task to ${column.title}`}>
          <Plus className="h-4 w-4" />
        </button>
      </header>
      <div className="flex flex-1 flex-col gap-2.5">
        {cards.map((card) => (
          <article
            key={card.id}
            draggable
            onDragStart={(event) => event.dataTransfer.setData("text/plain", card.id)}
            onClick={() => onOpen(card)}
            className="group cursor-pointer rounded-xl border border-white/5 bg-[#161b24] p-3.5 shadow-sm transition hover:border-indigo-400/40 hover:shadow-lg active:cursor-grabbing"
          >
            <div className="flex items-start gap-2">
              <p className="flex-1 text-sm font-medium text-white">{card.title}</p>
              <GripVertical className="h-4 w-4 text-slate-600 opacity-0 group-hover:opacity-100" />
            </div>
            {card.description && <p className="mt-1 line-clamp-2 text-xs text-slate-400">{card.description}</p>}
            <div className="mt-3 flex items-center justify-between text-[11px]">
              <span className={`font-medium ${TAG_STYLES[card.tag] ?? "text-slate-300"}`}>#{card.tag}</span>
              <span className={`rounded-full px-2 py-0.5 ${PRIORITY_STYLES[card.priority]}`}>{card.priority}</span>
            </div>
          </article>
        ))}
        {!cards.length && (
          <p className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-slate-500">
            Drop tasks here
          </p>
        )}
      </div>
    </section>
  );
}
