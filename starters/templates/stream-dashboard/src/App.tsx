import { useEffect, useState } from "react";
import { Eye, Heart, Radio, Users, Video } from "lucide-react";

import { ChatFeed } from "./components/ChatFeed";
import { ViewerGraph } from "./components/ViewerGraph";

export default function App() {
  const [live, setLive] = useState(true);
  const [viewers, setViewers] = useState<number[]>(() => Array.from({ length: 40 }, (_, i) => 900 + Math.round(Math.sin(i / 4) * 120 + i * 12)));

  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      setViewers((current) => [...current.slice(1), Math.max(200, (current.at(-1) ?? 1000) + Math.round((Math.random() - 0.45) * 80))]);
    }, 1500);
    return () => clearInterval(timer);
  }, [live]);

  const now = viewers.at(-1) ?? 0;

  return (
    <div className="min-h-screen bg-[#0e0b16] p-6 text-slate-200">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600"><Video className="h-5 w-5 text-white" /></div>
          <div>
            <h1 className="text-lg font-semibold text-white">Creator Studio</h1>
            <p className="text-xs text-slate-500">Speedrun Saturday · Retro Classics</p>
          </div>
        </div>
        <button
          onClick={() => setLive(!live)}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${live ? "bg-rose-600 text-white" : "bg-white/10"}`}
        >
          <Radio className="h-4 w-4" /> {live ? "End stream" : "Go live"}
        </button>
      </header>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <div className="relative aspect-video overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_40%,rgba(168,85,247,0.35),transparent_50%)]" />
            {live && <span className="absolute left-4 top-4 rounded bg-rose-600 px-2 py-0.5 text-xs font-bold text-white">LIVE</span>}
            <span className="absolute bottom-4 left-4 flex items-center gap-1 rounded bg-black/50 px-2 py-1 text-xs"><Eye className="h-3 w-3" /> {now.toLocaleString()}</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Current viewers", value: now.toLocaleString(), icon: Eye },
              { label: "New followers", value: "+312", icon: Heart },
              { label: "Subscribers", value: "4,826", icon: Users },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
                <Icon className="mb-3 h-4 w-4 text-purple-400" />
                <p className="text-2xl font-semibold text-white">{value}</p>
                <p className="text-xs text-slate-500">{label}</p>
              </div>
            ))}
          </div>
          <div className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
            <h2 className="mb-3 text-sm font-medium text-white">Viewers (live)</h2>
            <ViewerGraph values={viewers} />
          </div>
        </div>
        <ChatFeed live={live} />
      </div>
    </div>
  );
}
