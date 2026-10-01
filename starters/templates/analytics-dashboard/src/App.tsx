import { useMemo, useState } from "react";
import { Activity, BarChart3, Bell, DollarSign, LayoutDashboard, Search, Settings, Users } from "lucide-react";

import { ActivityFeed } from "./components/ActivityFeed";
import { KpiCard } from "./components/KpiCard";
import { TrafficChart } from "./components/TrafficChart";

const RANGES = { "7d": 7, "30d": 30, "90d": 90 } as const;
type Range = keyof typeof RANGES;

function series(days: number, seed: number) {
  return Array.from({ length: days }, (_, i) => {
    const wave = Math.sin((i + seed) / 3) * 18 + Math.cos((i * seed) / 7) * 9;
    return Math.round(120 + i * (90 / days) + wave);
  });
}

const NAV = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Reports", icon: BarChart3 },
  { label: "Audience", icon: Users },
  { label: "Revenue", icon: DollarSign },
  { label: "Settings", icon: Settings },
];

export default function App() {
  const [range, setRange] = useState<Range>("30d");
  const visits = useMemo(() => series(RANGES[range], 4), [range]);
  const total = visits.reduce((sum, v) => sum + v, 0);

  return (
    <div className="flex min-h-screen bg-[#0b0f17] text-slate-200">
      <aside className="hidden w-60 shrink-0 border-r border-white/5 bg-[#0d121c] p-5 md:block">
        <div className="mb-8 flex items-center gap-2 text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600">
            <Activity className="h-4 w-4" />
          </div>
          <span className="font-semibold">Metricly</span>
        </div>
        <nav className="space-y-1">
          {NAV.map(({ label, icon: Icon, active }) => (
            <a
              key={label}
              href="#"
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                active ? "bg-cyan-400/10 text-cyan-300" : "text-slate-400 hover:bg-white/5 hover:text-slate-200"
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </a>
          ))}
        </nav>
      </aside>

      <main className="flex-1 p-6 lg:p-8">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-slate-500">Good morning, Avery</p>
            <h1 className="text-2xl font-semibold text-white">Analytics overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-400">
              <Search className="h-4 w-4" />
              <input className="w-40 bg-transparent outline-none placeholder:text-slate-500" placeholder="Search reports" />
            </label>
            <button className="rounded-lg border border-white/10 bg-white/5 p-2 text-slate-400" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </button>
            <div className="flex rounded-lg border border-white/10 bg-white/5 p-1 text-sm">
              {(Object.keys(RANGES) as Range[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setRange(key)}
                  className={`rounded-md px-3 py-1 ${range === key ? "bg-cyan-400/15 text-cyan-300" : "text-slate-400"}`}
                >
                  {key}
                </button>
              ))}
            </div>
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Revenue" value={`$${(total * 3.2).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} delta={12.4} />
          <KpiCard label="Visitors" value={(total * 11).toLocaleString()} delta={8.1} />
          <KpiCard label="Conversion" value="3.84%" delta={-0.6} />
          <KpiCard label="Avg. order" value="$86.20" delta={4.2} />
        </section>

        <section className="mt-6 grid gap-6 xl:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#0f1520] p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-medium text-white">Traffic</h2>
              <span className="text-xs text-slate-500">Last {RANGES[range]} days</span>
            </div>
            <TrafficChart values={visits} />
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#0f1520] p-6">
            <h2 className="mb-4 font-medium text-white">Top channels</h2>
            {[
              ["Organic search", 42],
              ["Direct", 27],
              ["Social", 18],
              ["Referral", 13],
            ].map(([name, share]) => (
              <div key={name} className="mb-4">
                <div className="mb-1 flex justify-between text-sm">
                  <span className="text-slate-300">{name}</span>
                  <span className="text-slate-500">{share}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/5">
                  <div className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500" style={{ width: `${share}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6">
          <ActivityFeed />
        </section>
      </main>
    </div>
  );
}
