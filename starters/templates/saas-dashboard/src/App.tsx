import { useState } from "react";
import { CreditCard, Gauge, LifeBuoy, PanelLeftClose, PanelLeftOpen, Users, Zap } from "lucide-react";

import { CustomersTable } from "./components/CustomersTable";
import { MrrChart } from "./components/MrrChart";

const NAV = [
  { label: "Dashboard", icon: Gauge },
  { label: "Customers", icon: Users },
  { label: "Billing", icon: CreditCard },
  { label: "Support", icon: LifeBuoy },
];

export default function App() {
  const [collapsed, setCollapsed] = useState(false);
  const [active, setActive] = useState("Dashboard");

  return (
    <div className="flex min-h-screen bg-[#0a0f1a] text-slate-200">
      <aside className={`flex flex-col border-r border-white/5 bg-[#0c1220] p-3 transition-all ${collapsed ? "w-16" : "w-60"}`}>
        <div className="mb-6 flex items-center justify-between px-2 py-2">
          {!collapsed && <span className="flex items-center gap-2 font-semibold text-white"><Zap className="h-5 w-5 text-blue-400" /> Stackline</span>}
          <button onClick={() => setCollapsed(!collapsed)} className="text-slate-500 hover:text-white" aria-label="Toggle sidebar">
            {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>
        {NAV.map(({ label, icon: Icon }) => (
          <button
            key={label}
            onClick={() => setActive(label)}
            title={label}
            className={`mb-1 flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
              active === label ? "bg-blue-500/15 text-blue-300" : "text-slate-400 hover:bg-white/5"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" /> {!collapsed && label}
          </button>
        ))}
      </aside>
      <main className="flex-1 p-6 lg:p-8">
        <h1 className="text-2xl font-semibold text-white">{active}</h1>
        <p className="text-sm text-slate-500">Subscription health at a glance</p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          {[
            ["MRR", "$84,210", "+6.2%"],
            ["Active customers", "1,284", "+38"],
            ["Churn", "1.9%", "-0.3%"],
            ["ARPA", "$65.60", "+$2.10"],
          ].map(([label, value, delta]) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <p className="text-sm text-slate-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
              <p className="mt-1 text-xs text-emerald-400">{delta}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 xl:col-span-2">
            <h2 className="mb-4 font-medium text-white">MRR growth</h2>
            <MrrChart />
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-6">
            <h2 className="mb-4 font-medium text-white">Plans</h2>
            {[["Starter", 48, "bg-sky-400"], ["Growth", 36, "bg-blue-500"], ["Enterprise", 16, "bg-indigo-500"]].map(([plan, pct, color]) => (
              <div key={plan as string} className="mb-4">
                <div className="mb-1 flex justify-between text-sm"><span>{plan}</span><span className="text-slate-500">{pct}%</span></div>
                <div className="h-2 rounded-full bg-white/5"><div className={`h-2 rounded-full ${color}`} style={{ width: `${pct}%` }} /></div>
              </div>
            ))}
          </div>
        </div>
        <CustomersTable />
      </main>
    </div>
  );
}
