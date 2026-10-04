const EVENTS = [
  { who: "Maya Chen", what: "upgraded to the Growth plan", when: "2m ago", amount: "+$240" },
  { who: "Northwind Co.", what: "paid invoice #4821", when: "18m ago", amount: "+$1,920" },
  { who: "Leo Park", what: "started a trial", when: "1h ago", amount: "" },
  { who: "Atlas Labs", what: "added 12 seats", when: "3h ago", amount: "+$480" },
];

export function ActivityFeed() {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0f1520] p-6">
      <h2 className="mb-4 font-medium text-white">Recent activity</h2>
      <ul className="divide-y divide-white/5">
        {EVENTS.map((event) => (
          <li key={event.who} className="flex items-center justify-between py-3 text-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/15 text-xs font-medium text-blue-300">
                {event.who.split(" ").map((p) => p[0]).join("")}
              </div>
              <p>
                <span className="text-white">{event.who}</span> <span className="text-slate-400">{event.what}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-emerald-400">{event.amount}</p>
              <p className="text-xs text-slate-500">{event.when}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
