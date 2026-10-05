import { Shield } from "lucide-react";

import { UsersTable } from "./components/UsersTable";

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0e14] text-slate-200">
      <header className="border-b border-white/5 bg-[#0d1119]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <span className="flex items-center gap-2 font-semibold text-white"><Shield className="h-5 w-5 text-emerald-400" /> Console</span>
          <nav className="flex gap-6 text-sm text-slate-400"><a className="text-white" href="#">Users</a><a href="#">Teams</a><a href="#">Audit log</a><a href="#">Settings</a></nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-white">Users</h1>
          <p className="text-sm text-slate-500">Manage access, roles and account status.</p>
        </div>
        <div className="mb-6 grid gap-4 sm:grid-cols-3">
          {[["Total users", "2,418"], ["Admins", "14"], ["Pending invites", "27"]].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
        <UsersTable />
      </main>
    </div>
  );
}
