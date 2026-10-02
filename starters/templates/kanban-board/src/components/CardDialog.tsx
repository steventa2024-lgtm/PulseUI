import { useState, type FormEvent } from "react";
import { Trash2, X } from "lucide-react";

import { COLUMNS, TAGS, type Card, type Priority } from "./data";

export type Draft = Omit<Card, "id"> & { id?: string };

export function CardDialog({
  draft,
  onCancel,
  onSave,
  onDelete,
}: {
  draft: Draft;
  onCancel: () => void;
  onSave: (draft: Draft) => void;
  onDelete: (id: string) => void;
}) {
  const [form, setForm] = useState<Draft>(draft);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setForm((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    if (form.title.trim()) onSave({ ...form, title: form.title.trim() });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onCancel}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-[#141a23] p-6 shadow-2xl"
        role="dialog"
        aria-label={draft.id ? "Edit task" : "New task"}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white">{draft.id ? "Edit task" : "New task"}</h2>
          <button type="button" onClick={onCancel} className="text-slate-500 hover:text-white" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <input
          autoFocus
          required
          value={form.title}
          onChange={(event) => set("title", event.target.value)}
          placeholder="Task title"
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
        />
        <textarea
          value={form.description}
          onChange={(event) => set("description", event.target.value)}
          placeholder="Description"
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm outline-none focus:border-indigo-400"
        />
        <div className="grid grid-cols-3 gap-3 text-sm">
          <select value={form.tag} onChange={(event) => set("tag", event.target.value)} className="rounded-lg border border-white/10 bg-[#1b222d] px-2 py-2">
            {TAGS.map((tag) => <option key={tag}>{tag}</option>)}
          </select>
          <select value={form.priority} onChange={(event) => set("priority", event.target.value as Priority)} className="rounded-lg border border-white/10 bg-[#1b222d] px-2 py-2">
            {(["Low", "Medium", "High"] as const).map((priority) => <option key={priority}>{priority}</option>)}
          </select>
          <select value={form.column} onChange={(event) => set("column", event.target.value as Draft["column"])} className="rounded-lg border border-white/10 bg-[#1b222d] px-2 py-2">
            {COLUMNS.map((column) => <option key={column.id} value={column.id}>{column.title}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-between pt-2">
          {draft.id ? (
            <button type="button" onClick={() => onDelete(draft.id as string)} className="flex items-center gap-1.5 text-sm text-rose-300 hover:text-rose-200">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          ) : <span />}
          <button className="rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">
            {draft.id ? "Save changes" : "Create task"}
          </button>
        </div>
      </form>
    </div>
  );
}
