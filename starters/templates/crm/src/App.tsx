import { useMemo, useState } from "react";
import { Briefcase, Mail, Phone, Plus, Search, Trash2, TrendingUp, Trophy, Users } from "lucide-react";

import { ContactForm, type ContactDraft } from "./components/ContactForm";
import { SEED, STAGE_STYLES, STAGES, money, type Contact, type Stage } from "./components/data";
import { uid, usePersistentState } from "./lib/usePersistentState";

export default function App() {
  const [contacts, setContacts] = usePersistentState<Contact[]>("crm.contacts", SEED);
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "All">("All");
  const [editing, setEditing] = useState<Contact | "new" | null>(null);

  const rows = useMemo(
    () =>
      contacts.filter(
        (contact) =>
          (stage === "All" || contact.stage === stage) &&
          `${contact.name} ${contact.company} ${contact.email}`.toLowerCase().includes(query.toLowerCase()),
      ),
    [contacts, query, stage],
  );

  const open = contacts.filter((c) => !["Won", "Lost"].includes(c.stage));
  const pipeline = open.reduce((sum, c) => sum + c.value, 0);
  const won = contacts.filter((c) => c.stage === "Won").reduce((sum, c) => sum + c.value, 0);
  const closed = contacts.filter((c) => c.stage === "Won" || c.stage === "Lost").length;
  const winRate = closed ? Math.round((contacts.filter((c) => c.stage === "Won").length / closed) * 100) : 0;

  function save(draft: ContactDraft) {
    const updated = new Date().toISOString().slice(0, 10);
    setContacts((current) =>
      editing && editing !== "new"
        ? current.map((c) => (c.id === editing.id ? { ...c, ...draft, updated } : c))
        : [{ ...draft, id: uid(), updated }, ...current],
    );
    setEditing(null);
  }

  function setContactStage(id: string, next: Stage) {
    setContacts((current) => current.map((c) => (c.id === id ? { ...c, stage: next, updated: new Date().toISOString().slice(0, 10) } : c)));
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white"><Briefcase className="h-5 w-5" /></div>
            <span className="text-lg font-semibold">Fieldbook CRM</span>
          </div>
          <button onClick={() => setEditing("new")} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500">
            <Plus className="h-4 w-4" /> New contact
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-6 py-8">
        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Contacts", value: String(contacts.length), icon: Users },
            { label: "Open pipeline", value: money(pipeline), icon: TrendingUp },
            { label: "Won revenue", value: money(won), icon: Trophy },
            { label: "Win rate", value: `${winRate}%`, icon: Briefcase },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between text-sm text-slate-500">{label}<Icon className="h-4 w-4 text-emerald-600" /></div>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-4 font-semibold">Pipeline</h2>
          <div className="grid gap-3 md:grid-cols-5">
            {STAGES.map((name) => {
              const items = contacts.filter((c) => c.stage === name);
              return (
                <button key={name} onClick={() => setStage(stage === name ? "All" : name)} className={`rounded-xl border p-3 text-left transition ${stage === name ? "border-emerald-500 bg-emerald-50" : "border-slate-200 hover:border-slate-300"}`}>
                  <div className="flex items-center justify-between">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_STYLES[name]}`}>{name}</span>
                    <span className="text-xs text-slate-500">{items.length}</span>
                  </div>
                  <p className="mt-3 text-lg font-semibold">{money(items.reduce((sum, c) => sum + c.value, 0))}</p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 p-4">
            <h2 className="font-semibold">Contacts</h2>
            {stage !== "All" && (
              <button onClick={() => setStage("All")} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{stage} ×</button>
            )}
            <label className="ml-auto flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
              <Search className="h-4 w-4 text-slate-400" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search contacts" className="w-48 outline-none" />
            </label>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr><th className="px-4 py-3">Name</th><th className="px-4 py-3">Contact</th><th className="px-4 py-3">Value</th><th className="px-4 py-3">Stage</th><th className="px-4 py-3">Updated</th><th /></tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50">
                    <td className="cursor-pointer px-4 py-3" onClick={() => setEditing(contact)}>
                      <p className="font-medium">{contact.name}</p>
                      <p className="text-xs text-slate-500">{contact.company}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      <a href={`mailto:${contact.email}`} className="flex items-center gap-1 hover:text-emerald-700"><Mail className="h-3 w-3" />{contact.email}</a>
                      <span className="mt-1 flex items-center gap-1"><Phone className="h-3 w-3" />{contact.phone}</span>
                    </td>
                    <td className="px-4 py-3 font-medium">{money(contact.value)}</td>
                    <td className="px-4 py-3">
                      <select value={contact.stage} onChange={(e) => setContactStage(contact.id, e.target.value as Stage)} className={`rounded-full px-2 py-1 text-xs font-medium ${STAGE_STYLES[contact.stage]}`} aria-label={`Stage for ${contact.name}`}>
                        {STAGES.map((s) => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{contact.updated}</td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => setContacts((current) => current.filter((c) => c.id !== contact.id))} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" aria-label={`Delete ${contact.name}`}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!rows.length && <p className="p-10 text-center text-sm text-slate-500">No contacts match.</p>}
          </div>
        </section>
      </main>

      {editing && (
        <ContactForm initial={editing === "new" ? undefined : editing} onSave={save} onClose={() => setEditing(null)} />
      )}
    </div>
  );
}
