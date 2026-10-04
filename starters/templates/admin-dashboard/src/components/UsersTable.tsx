import { useMemo, useState, type FormEvent } from "react";
import { Search, Trash2, UserPlus, X } from "lucide-react";

import { usePersistentState } from "../lib/usePersistentState";

type User = { id: number; name: string; email: string; role: "Admin" | "Editor" | "Viewer"; status: "Active" | "Suspended" | "Invited" };

const SEED: User[] = [
  { id: 1, name: "Priya Natarajan", email: "priya@acme.io", role: "Admin", status: "Active" },
  { id: 2, name: "Marcus Webb", email: "marcus@acme.io", role: "Editor", status: "Active" },
  { id: 3, name: "Sofia Lindqvist", email: "sofia@acme.io", role: "Viewer", status: "Invited" },
  { id: 4, name: "Kenji Watanabe", email: "kenji@acme.io", role: "Editor", status: "Suspended" },
  { id: 5, name: "Amara Okafor", email: "amara@acme.io", role: "Viewer", status: "Active" },
  { id: 6, name: "Lucas Moreau", email: "lucas@acme.io", role: "Admin", status: "Active" },
];

const BADGE = { Active: "bg-emerald-400/10 text-emerald-300", Suspended: "bg-rose-400/10 text-rose-300", Invited: "bg-sky-400/10 text-sky-300" };

export function UsersTable() {
  const [users, setUsers] = usePersistentState<User[]>("admin.users", SEED);
  const [inviting, setInviting] = useState(false);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const rows = useMemo(
    () => users.filter((u) => (role === "All" || u.role === role) && `${u.name} ${u.email}`.toLowerCase().includes(query.toLowerCase())),
    [users, query, role],
  );

  function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setUsers((current) => [
      {
        id: Date.now(),
        name: String(form.get("name")),
        email: String(form.get("email")),
        role: form.get("role") as User["role"],
        status: "Invited",
      },
      ...current,
    ]);
    setInviting(false);
  }

  function changeRole(id: number, role: User["role"]) {
    setUsers((current) => current.map((u) => (u.id === id ? { ...u, role } : u)));
  }

  function toggle(id: number) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.03]">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <label className="flex flex-1 items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-sm">
          <Search className="h-4 w-4 text-slate-500" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or email" className="w-full bg-transparent outline-none" />
        </label>
        <select value={role} onChange={(e) => setRole(e.target.value)} className="rounded-lg bg-white/5 px-3 py-2 text-sm">
          {["All", "Admin", "Editor", "Viewer"].map((r) => <option key={r} className="bg-slate-900">{r}</option>)}
        </select>
        <button onClick={() => setInviting(true)} className="flex items-center gap-2 rounded-lg bg-emerald-500 px-3 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">
          <UserPlus className="h-4 w-4" /> Invite user
        </button>
        <button
          disabled={!selected.size}
          onClick={() => { setUsers((u) => u.filter((x) => !selected.has(x.id))); setSelected(new Set()); }}
          className="flex items-center gap-2 rounded-lg bg-rose-500/15 px-3 py-2 text-sm text-rose-300 disabled:opacity-40"
        >
          <Trash2 className="h-4 w-4" /> Remove {selected.size || ""}
        </button>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="border-y border-white/5 text-xs uppercase text-slate-500">
          <tr><th className="w-10 px-4 py-3" /><th className="px-4 py-3">Name</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th></tr>
        </thead>
        <tbody>
          {rows.map((u) => (
            <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
              <td className="px-4 py-3"><input type="checkbox" checked={selected.has(u.id)} onChange={() => toggle(u.id)} aria-label={`Select ${u.name}`} /></td>
              <td className="px-4 py-3"><p className="text-white">{u.name}</p><p className="text-xs text-slate-500">{u.email}</p></td>
              <td className="px-4 py-3">
                <select value={u.role} onChange={(e) => changeRole(u.id, e.target.value as User["role"])} className="rounded-md bg-white/5 px-2 py-1 text-sm text-slate-300" aria-label={`Role for ${u.name}`}>
                  {(["Admin", "Editor", "Viewer"] as const).map((r) => <option key={r} className="bg-slate-900">{r}</option>)}
                </select>
              </td>
              <td className="px-4 py-3"><span className={`rounded-full px-2 py-0.5 text-xs ${BADGE[u.status]}`}>{u.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      {!rows.length && <p className="p-8 text-center text-sm text-slate-500">No users match these filters.</p>}
      {inviting && (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/60 p-4" onClick={() => setInviting(false)}>
          <form onSubmit={invite} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-xl border border-white/10 bg-[#11151e] p-6" aria-label="Invite user">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-white">Invite a user</h2>
              <button type="button" onClick={() => setInviting(false)} aria-label="Close"><X className="h-4 w-4 text-slate-400" /></button>
            </div>
            <input name="name" required placeholder="Full name" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <input name="email" type="email" required placeholder="Email address" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none focus:border-emerald-400" />
            <select name="role" defaultValue="Viewer" className="w-full rounded-lg border border-white/10 bg-[#161b25] px-3 py-2 text-sm">
              <option>Admin</option><option>Editor</option><option>Viewer</option>
            </select>
            <button className="w-full rounded-lg bg-emerald-500 py-2 text-sm font-medium text-slate-950 hover:bg-emerald-400">Send invite</button>
          </form>
        </div>
      )}
    </div>
  );
}
