import { BarChart3, CheckCircle2, Circle, LayoutDashboard, Search, Settings, Users, type LucideIcon } from "lucide-react";

export type ProductMockupProps = {
  /** Shown in the fake window's title bar. */
  title?: string;
  /** Sidebar entries; the first is shown as active. */
  nav?: { icon: LucideIcon; label: string }[];
  /** Headline metrics across the top. */
  stats?: { label: string; value: string; delta?: string }[];
  /** Rows of the list panel. */
  tasks?: { title: string; done?: boolean; tag?: string }[];
};

const DEFAULT_NAV = [
  { icon: LayoutDashboard, label: "Overview" },
  { icon: BarChart3, label: "Analytics" },
  { icon: Users, label: "Team" },
  { icon: Settings, label: "Settings" },
];

/**
 * A believable app screenshot made of real markup (no image files): window
 * chrome, sidebar, KPIs, a bar chart and a task list. Use as a hero visual.
 */
export function ProductMockup({
  title = "app.example.com",
  nav = DEFAULT_NAV,
  stats = [
    { label: "Revenue", value: "$48.2k", delta: "+12%" },
    { label: "Active users", value: "2,914", delta: "+8%" },
    { label: "Conversion", value: "4.6%", delta: "+0.9%" },
  ],
  tasks = [
    { title: "Review Q3 roadmap", done: true, tag: "Planning" },
    { title: "Ship onboarding flow", tag: "Design" },
    { title: "Sync with sales team", tag: "Ops" },
  ],
}: ProductMockupProps) {
  const bars = [38, 52, 44, 68, 58, 80, 72, 92, 76, 88, 96, 84];
  return (
    <div className="relative">
      <div aria-hidden className="absolute -inset-4 -z-10 rounded-[2rem] bg-gradient-primary opacity-20 blur-2xl" />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl shadow-primary/10 ring-1 ring-border/50">
        <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
          <span className="size-3 rounded-full bg-red-400/80" />
          <span className="size-3 rounded-full bg-amber-400/80" />
          <span className="size-3 rounded-full bg-emerald-400/80" />
          <div className="mx-auto flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
            <Search className="size-3" /> {title}
          </div>
        </div>
        <div className="grid grid-cols-[auto_1fr] text-left">
          <aside className="hidden w-44 border-r p-3 sm:block">
            {nav.map(({ icon: Icon, label }, index) => (
              <div
                key={label}
                className={
                  index === 0
                    ? "mb-1 flex items-center gap-2 rounded-lg bg-primary/10 px-3 py-2 text-sm font-medium text-primary"
                    : "mb-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground"
                }
              >
                <Icon className="size-4" /> {label}
              </div>
            ))}
          </aside>
          <div className="space-y-4 p-4 sm:p-5">
            <div className="grid grid-cols-3 gap-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-xl border bg-background p-3">
                  <p className="truncate text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-lg font-bold tracking-tight sm:text-xl">{stat.value}</p>
                  {stat.delta && <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{stat.delta}</p>}
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-5">
              <div className="rounded-xl border bg-background p-4 md:col-span-3">
                <p className="mb-3 text-sm font-semibold">Performance</p>
                <div className="flex h-28 items-end gap-1.5">
                  {bars.map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-md bg-gradient-to-t from-primary/60 to-primary"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-xl border bg-background p-4 md:col-span-2">
                <p className="mb-3 text-sm font-semibold">Today</p>
                <ul className="space-y-2.5">
                  {tasks.map((task) => (
                    <li key={task.title} className="flex items-center gap-2 text-sm">
                      {task.done ? (
                        <CheckCircle2 className="size-4 shrink-0 text-primary" />
                      ) : (
                        <Circle className="size-4 shrink-0 text-muted-foreground" />
                      )}
                      <span className={task.done ? "truncate text-muted-foreground line-through" : "truncate"}>
                        {task.title}
                      </span>
                      {task.tag && (
                        <span className="ml-auto hidden rounded-full bg-secondary px-2 py-0.5 text-[10px] text-secondary-foreground lg:inline">
                          {task.tag}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
