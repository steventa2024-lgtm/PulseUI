import { useEffect, useState } from "react";

const NAMES = ["pixelpanda", "speedy_sam", "lunar_owl", "byte_knight", "mira", "turbo_tim"];
const LINES = ["that skip was clean 🔥", "PB pace!", "hi from Brazil", "how many runs today?", "GG", "the music slaps"];
const COLORS = ["text-cyan-400", "text-pink-400", "text-amber-400", "text-emerald-400", "text-violet-400"];

type Line = { id: number; name: string; text: string; color: string };

export function ChatFeed({ live }: { live: boolean }) {
  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    if (!live) return;
    let id = 0;
    const timer = setInterval(() => {
      id += 1;
      setLines((current) => [
        ...current.slice(-40),
        {
          id,
          name: NAMES[id % NAMES.length]!,
          text: LINES[(id * 7) % LINES.length]!,
          color: COLORS[id % COLORS.length]!,
        },
      ]);
    }, 1200);
    return () => clearInterval(timer);
  }, [live]);

  return (
    <aside className="flex h-[600px] flex-col rounded-2xl border border-white/5 bg-white/[0.03]">
      <h2 className="border-b border-white/5 px-5 py-4 text-sm font-medium text-white">Stream chat</h2>
      <ul className="flex-1 space-y-2 overflow-y-auto p-5 text-sm">
        {lines.map((line) => (
          <li key={line.id}><span className={`font-semibold ${line.color}`}>{line.name}</span> <span className="text-slate-300">{line.text}</span></li>
        ))}
        {!lines.length && <li className="text-slate-500">{live ? "Waiting for messages…" : "Chat is paused while offline."}</li>}
      </ul>
      <div className="border-t border-white/5 p-3">
        <input placeholder="Send a message" className="w-full rounded-lg bg-white/5 px-3 py-2 text-sm outline-none" />
      </div>
    </aside>
  );
}
