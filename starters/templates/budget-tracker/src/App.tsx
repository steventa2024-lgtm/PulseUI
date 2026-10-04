import { useMemo, useState, type FormEvent } from "react";
import { ArrowDownRight, ArrowUpRight, Download, PiggyBank, Plus, Trash2, Wallet } from "lucide-react";

import { Donut } from "./components/Donut";
import { EXPENSE_CATEGORIES, busiestMonth, money, monthKey, seedEntries, type Category, type Entry } from "./components/data";
import { uid, usePersistentState } from "./lib/usePersistentState";

export default function App() {
  const [entries, setEntries] = usePersistentState<Entry[]>("budget.entries", seedEntries);
  const months = useMemo(() => [...new Set(entries.map((e) => monthKey(e.date)))].sort().reverse(), [entries]);
  const [month, setMonth] = useState(() => busiestMonth(entries));
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [category, setCategory] = useState<Category>("Food");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  const inMonth = entries.filter((e) => monthKey(e.date) === month).sort((a, b) => b.date.localeCompare(a.date));
  const income = inMonth.filter((e) => e.amount > 0).reduce((s, e) => s + e.amount, 0);
  const spent = -inMonth.filter((e) => e.amount < 0).reduce((s, e) => s + e.amount, 0);
  const byCategory = EXPENSE_CATEGORIES.map((c) => ({
    ...c,
    spent: -inMonth.filter((e) => e.category === c.name && e.amount < 0).reduce((s, e) => s + e.amount, 0),
  }));

  function add(event: FormEvent) {
    event.preventDefault();
    const value = Math.abs(Number(amount));
    if (!label.trim() || !value) return;
    setEntries((current) => [
      { id: uid(), label: label.trim(), amount: kind === "expense" ? -value : value, category: kind === "income" ? "Income" : category, date },
      ...current,
    ]);
    setMonth(monthKey(date));
    setLabel("");
    setAmount("");
  }

  function exportCsv() {
    const rows = [["Date", "Label", "Category", "Amount"], ...inMonth.map((e) => [e.date, e.label, e.category, e.amount.toFixed(2)])];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    link.download = `budget-${month}.csv`;
    link.click();
  }

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <span className="flex items-center gap-2 text-lg font-semibold"><Wallet className="h-5 w-5" /> Tally</span>
            <div className="flex items-center gap-2">
              <select value={month} onChange={(e) => setMonth(e.target.value)} className="rounded-lg bg-white/15 px-3 py-2 text-sm" aria-label="Month">
                {[...new Set([month, ...months])].map((m) => (
                  <option key={m} value={m} className="text-slate-900">{new Date(`${m}-01T12:00:00`).toLocaleDateString(undefined, { month: "long", year: "numeric" })}</option>
                ))}
              </select>
              <button onClick={exportCsv} className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm hover:bg-white/25"><Download className="h-4 w-4" /> Export CSV</button>
            </div>
          </div>
          <p className="mt-10 text-sm text-indigo-100">Balance this month</p>
          <p className="text-5xl font-semibold tracking-tight">{money(income - spent)}</p>
        </div>
      </header>

      <main className="mx-auto -mt-16 grid max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-3 lg:col-span-3">
          {[
            { label: "Income", value: money(income), icon: ArrowUpRight, tone: "text-emerald-600" },
            { label: "Spent", value: money(spent), icon: ArrowDownRight, tone: "text-rose-600" },
            { label: "Saved", value: `${income ? Math.max(0, Math.round(((income - spent) / income) * 100)) : 0}%`, icon: PiggyBank, tone: "text-indigo-600" },
          ].map(({ label: name, value, icon: Icon, tone }) => (
            <div key={name} className="rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between text-sm text-slate-500">{name}<Icon className={`h-4 w-4 ${tone}`} /></div>
              <p className="mt-2 text-2xl font-semibold">{value}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="mb-4 font-semibold">Budgets</h2>
          <div className="flex flex-col items-center gap-6 sm:flex-row">
            <Donut slices={byCategory.filter((c) => c.spent > 0).map((c) => ({ value: c.spent, color: c.color, label: c.name }))} />
            <ul className="w-full flex-1 space-y-3">
              {byCategory.map((c) => {
                const pct = Math.min(100, (c.spent / c.budget) * 100);
                const over = c.spent > c.budget;
                return (
                  <li key={c.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} />{c.name}</span>
                      <span className={over ? "font-medium text-rose-600" : "text-slate-500"}>{money(c.spent)} / {money(c.budget)}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, background: over ? "#e11d48" : c.color }} />
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        <form onSubmit={add} className="space-y-3 rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-semibold">Add transaction</h2>
          <div className="grid grid-cols-2 rounded-lg bg-slate-100 p-1 text-sm">
            {(["expense", "income"] as const).map((option) => (
              <button type="button" key={option} onClick={() => setKind(option)} className={`rounded-md py-1.5 capitalize ${kind === option ? "bg-white shadow" : "text-slate-500"}`}>{option}</button>
            ))}
          </div>
          <input required value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Description" className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input required type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          </div>
          {kind === "expense" && (
            <select value={category} onChange={(e) => setCategory(e.target.value as Category)} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm">
              {EXPENSE_CATEGORIES.map((c) => <option key={c.name}>{c.name}</option>)}
            </select>
          )}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"><Plus className="h-4 w-4" /> Add</button>
        </form>

        <section className="rounded-2xl bg-white p-6 shadow-sm lg:col-span-3">
          <h2 className="mb-3 font-semibold">Transactions</h2>
          <ul className="divide-y divide-slate-100">
            {inMonth.map((entry) => (
              <li key={entry.id} className="flex items-center gap-4 py-3 text-sm">
                <span className="w-24 text-slate-500">{entry.date}</span>
                <span className="flex-1">{entry.label}</span>
                <span className="hidden rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 sm:inline">{entry.category}</span>
                <span className={`w-28 text-right font-medium ${entry.amount > 0 ? "text-emerald-600" : ""}`}>{entry.amount > 0 ? "+" : ""}{money(entry.amount)}</span>
                <button onClick={() => setEntries((current) => current.filter((e) => e.id !== entry.id))} className="rounded p-1 text-slate-400 hover:text-rose-600" aria-label={`Delete ${entry.label}`}><Trash2 className="h-4 w-4" /></button>
              </li>
            ))}
            {!inMonth.length && <li className="py-8 text-center text-sm text-slate-500">No transactions this month.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
