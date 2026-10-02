import { useState, type FormEvent } from "react";
import { X } from "lucide-react";

import { STAGES, type Contact, type Stage } from "./data";

export type ContactDraft = Omit<Contact, "id" | "updated">;

const EMPTY: ContactDraft = { name: "", company: "", email: "", phone: "", value: 0, stage: "Lead", notes: "" };

export function ContactForm({
  initial,
  onSave,
  onClose,
}: {
  initial?: Contact;
  onSave: (draft: ContactDraft) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<ContactDraft>(initial ?? EMPTY);
  const set = <K extends keyof ContactDraft>(key: K, value: ContactDraft[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  function submit(event: FormEvent) {
    event.preventDefault();
    onSave(form);
  }

  const field = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

  return (
    <div className="fixed inset-0 z-30 flex justify-end bg-slate-900/30" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(event) => event.stopPropagation()}
        className="flex h-full w-full max-w-md flex-col gap-4 overflow-y-auto bg-white p-6 shadow-2xl"
        aria-label={initial ? "Edit contact" : "New contact"}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{initial ? "Edit contact" : "New contact"}</h2>
          <button type="button" onClick={onClose} aria-label="Close"><X className="h-5 w-5 text-slate-400" /></button>
        </div>
        <label className="space-y-1 text-sm"><span className="text-slate-600">Full name</span>
          <input required className={field} value={form.name} onChange={(e) => set("name", e.target.value)} />
        </label>
        <label className="space-y-1 text-sm"><span className="text-slate-600">Company</span>
          <input required className={field} value={form.company} onChange={(e) => set("company", e.target.value)} />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm"><span className="text-slate-600">Email</span>
            <input type="email" className={field} value={form.email} onChange={(e) => set("email", e.target.value)} />
          </label>
          <label className="space-y-1 text-sm"><span className="text-slate-600">Phone</span>
            <input className={field} value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="space-y-1 text-sm"><span className="text-slate-600">Deal value ($)</span>
            <input type="number" min={0} className={field} value={form.value} onChange={(e) => set("value", Number(e.target.value) || 0)} />
          </label>
          <label className="space-y-1 text-sm"><span className="text-slate-600">Stage</span>
            <select className={field} value={form.stage} onChange={(e) => set("stage", e.target.value as Stage)}>
              {STAGES.map((stage) => <option key={stage}>{stage}</option>)}
            </select>
          </label>
        </div>
        <label className="space-y-1 text-sm"><span className="text-slate-600">Notes</span>
          <textarea rows={4} className={field} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </label>
        <button className="mt-auto rounded-lg bg-emerald-600 py-2.5 text-sm font-medium text-white hover:bg-emerald-500">
          {initial ? "Save changes" : "Add contact"}
        </button>
      </form>
    </div>
  );
}
