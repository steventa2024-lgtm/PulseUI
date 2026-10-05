import { useState } from "react";

const CUSTOMERS = [
  { name: "Northwind Traders", plan: "Enterprise", mrr: 4200, status: "Active" },
  { name: "Atlas Labs", plan: "Growth", mrr: 980, status: "Active" },
  { name: "Brightside Health", plan: "Growth", mrr: 760, status: "Past due" },
  { name: "Juniper Studio", plan: "Starter", mrr: 49, status: "Trial" },
  { name: "Orbit Logistics", plan: "Enterprise", mrr: 3600, status: "Active" },
];

const STATUS: Record<string, string> = {
  Active: "bg-emerald-400/10 text-emerald-300",
  "Past due": "bg-amber-400/10 text-amber-300",
  Trial: "bg-sky-400/10 text-sky-300",
};

export function CustomersTable() {
  const [query, setQuery] = useState("");
  const rows = CUSTOMERS.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.03]">
      <div className="flex items-center justify-between p-5">
        <h2 className="font-medium text-white">Customers</h2>
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter customers" className="rounded-lg bg-white/5 px-3 py-1.5 text-sm outline-none" />
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-y border-white/5 text-xs uppercase text-slate-500">
          <tr><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Plan</th><th className="px-5 py-3">MRR</th><th className="px-5 py-3">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((c) => (
            <tr key={c.name} className="border-b border-white/5 last:border-0">
              <td className="px-5 py-3 text-white">{c.name}</td>
              <td className="px-5 py-3 text-slate-400">{c.plan}</td>
              <td className="px-5 py-3">${c.mrr.toLocaleString()}</td>
              <td className="px-5 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${STATUS[c.status]}`}>{c.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
