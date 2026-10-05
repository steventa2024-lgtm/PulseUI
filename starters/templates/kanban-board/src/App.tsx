import { useMemo, useState } from "react";
import { KanbanSquare, Plus, Search } from "lucide-react";

import { CardDialog, type Draft } from "./components/CardDialog";
import { Column } from "./components/Column";
import { COLUMNS, SEED, type Card, type ColumnId } from "./components/data";
import { uid, usePersistentState } from "./lib/usePersistentState";

export default function App() {
  const [cards, setCards] = usePersistentState<Card[]>("kanban.cards", SEED);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  const visible = useMemo(
    () => cards.filter((card) => `${card.title} ${card.tag}`.toLowerCase().includes(query.toLowerCase())),
    [cards, query],
  );

  function move(id: string, column: ColumnId) {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, column } : card)));
  }

  function save(draft: Draft) {
    setCards((current) =>
      draft.id
        ? current.map((card) => (card.id === draft.id ? { ...card, ...draft, id: card.id } : card))
        : [...current, { ...draft, id: uid() }],
    );
    setEditing(null);
  }

  const done = cards.filter((card) => card.column === "done").length;

  return (
    <div className="min-h-screen bg-[#0d1117] text-slate-200">
      <header className="border-b border-white/5 bg-[#0f141c]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-500">
              <KanbanSquare className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-semibold text-white">Product Roadmap</h1>
              <p className="text-xs text-slate-500">
                {done} of {cards.length} tasks done
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter tasks"
                className="w-44 bg-transparent outline-none placeholder:text-slate-500"
              />
            </label>
            <button
              onClick={() => setEditing({ title: "", description: "", tag: "Feature", priority: "Medium", column: "todo" })}
              className="flex items-center gap-2 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400"
            >
              <Plus className="h-4 w-4" /> New task
            </button>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6 pb-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all"
              style={{ width: `${cards.length ? (done / cards.length) * 100 : 0}%` }}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-5 overflow-x-auto px-6 py-6 md:grid-cols-2 xl:grid-cols-4">
        {COLUMNS.map((column) => (
          <Column
            key={column.id}
            column={column}
            cards={visible.filter((card) => card.column === column.id)}
            onDrop={(id) => move(id, column.id)}
            onOpen={(card) => setEditing(card)}
            onAdd={() =>
              setEditing({ title: "", description: "", tag: "Feature", priority: "Medium", column: column.id })
            }
          />
        ))}
      </main>

      {editing && (
        <CardDialog
          draft={editing}
          onCancel={() => setEditing(null)}
          onSave={save}
          onDelete={(id) => {
            setCards((current) => current.filter((card) => card.id !== id));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
