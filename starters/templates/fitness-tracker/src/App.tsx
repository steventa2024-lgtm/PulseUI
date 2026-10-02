import { useMemo, useState, type FormEvent } from "react";
import { Activity, Flame, Plus, Target, Timer, Trash2, Trophy } from "lucide-react";

import { TYPES, dayKey, lastDays, seedWorkouts, type Workout, type WorkoutType } from "./components/data";
import { uid, usePersistentState } from "./lib/usePersistentState";

export default function App() {
  const [workouts, setWorkouts] = usePersistentState<Workout[]>("fitness.workouts", seedWorkouts);
  const [goal, setGoal] = usePersistentState<number>("fitness.goal", 180);
  const [type, setType] = useState<WorkoutType>("Run");
  const [minutes, setMinutes] = useState(30);
  const [date, setDate] = useState(dayKey(new Date()));
  const [note, setNote] = useState("");

  const week = useMemo(() => lastDays(7), []);
  const byDay = useMemo(
    () => week.map((day) => ({ day, minutes: workouts.filter((w) => w.date === day).reduce((s, w) => s + w.minutes, 0) })),
    [workouts, week],
  );
  const weekMinutes = byDay.reduce((s, d) => s + d.minutes, 0);
  const weekCalories = workouts.filter((w) => week.includes(w.date)).reduce((s, w) => s + w.calories, 0);
  const streak = useMemo(() => {
    // A streak survives until the end of today, so start from yesterday if today is still empty.
    const cursor = new Date();
    if (!workouts.some((w) => w.date === dayKey(cursor))) cursor.setDate(cursor.getDate() - 1);
    let count = 0;
    while (workouts.some((w) => w.date === dayKey(cursor))) {
      count += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return count;
  }, [workouts]);
  const max = Math.max(60, ...byDay.map((d) => d.minutes));
  const progress = Math.min(100, Math.round((weekMinutes / goal) * 100));

  function log(event: FormEvent) {
    event.preventDefault();
    const perMinute = TYPES.find((t) => t.type === type)?.perMinute ?? 8;
    setWorkouts((current) => [{ id: uid(), type, minutes, calories: Math.round(minutes * perMinute), date, note }, ...current]);
    setNote("");
  }

  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-200">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2 text-white">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-lime-300 to-emerald-500 text-slate-900"><Activity className="h-5 w-5" /></div>
          <span className="text-lg font-semibold">Pulsefit</span>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-400">
          Weekly goal
          <input type="number" min={30} step={15} value={goal} onChange={(e) => setGoal(Math.max(30, Number(e.target.value) || 30))} className="w-20 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-white" aria-label="Weekly goal in minutes" />
          min
        </label>
      </header>

      <main className="mx-auto grid max-w-6xl gap-6 px-6 pb-12 lg:grid-cols-3">
        <section className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:grid-cols-4">
          {[
            { label: "Active minutes (7d)", value: weekMinutes, icon: Timer },
            { label: "Calories (7d)", value: weekCalories.toLocaleString(), icon: Flame },
            { label: "Day streak", value: `${streak} 🔥`, icon: Trophy },
            { label: "Goal progress", value: `${progress}%`, icon: Target },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-2xl border border-white/5 bg-white/[0.03] p-5">
              <Icon className="h-5 w-5 text-lime-300" />
              <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 lg:col-span-2">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="font-semibold text-white">This week</h2>
            <span className="text-sm text-slate-400">{weekMinutes} / {goal} min</span>
          </div>
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-white/5">
            <div className="h-full rounded-full bg-gradient-to-r from-lime-300 to-emerald-400 transition-all" style={{ width: `${progress}%` }} />
          </div>
          <div className="flex h-48 items-end gap-3">
            {byDay.map(({ day, minutes: value }) => (
              <div key={day} className="flex h-full flex-1 flex-col items-center gap-2">
                <span className="text-[11px] text-slate-500">{value || ""}</span>
                <div className="flex w-full flex-1 items-end">
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-600 to-lime-300 transition-all" style={{ height: `${(value / max) * 100}%`, minHeight: value ? 6 : 2, opacity: value ? 1 : 0.15 }} />
                </div>
                <span className="text-xs text-slate-400">{new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { weekday: "short" })}</span>
              </div>
            ))}
          </div>
        </section>

        <form onSubmit={log} className="space-y-4 rounded-2xl border border-white/5 bg-white/[0.03] p-6">
          <h2 className="font-semibold text-white">Log a workout</h2>
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((option) => (
              <button type="button" key={option.type} onClick={() => setType(option.type)} className={`rounded-xl border px-2 py-3 text-center text-xs transition ${type === option.type ? "border-lime-300 bg-lime-300/10 text-white" : "border-white/10 text-slate-400 hover:border-white/20"}`}>
                <span className="block text-xl">{option.emoji}</span>{option.type}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <label className="space-y-1"><span className="text-slate-400">Minutes</span>
              <input type="number" min={1} max={600} value={minutes} onChange={(e) => setMinutes(Math.max(1, Number(e.target.value) || 1))} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white" />
            </label>
            <label className="space-y-1"><span className="text-slate-400">Date</span>
              <input type="date" value={date} max={dayKey(new Date())} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white [color-scheme:dark]" />
            </label>
          </div>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white" />
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-lime-300 py-2.5 font-medium text-slate-900 hover:bg-lime-200">
            <Plus className="h-4 w-4" /> Log workout
          </button>
        </form>

        <section className="rounded-2xl border border-white/5 bg-white/[0.03] p-6 lg:col-span-3">
          <h2 className="mb-4 font-semibold text-white">History</h2>
          <ul className="divide-y divide-white/5">
            {sorted.map((workout) => {
              const meta = TYPES.find((t) => t.type === workout.type);
              return (
                <li key={workout.id} className="flex items-center gap-4 py-3">
                  <span className={`flex h-10 w-10 items-center justify-center rounded-xl text-lg ${meta?.color ?? "bg-slate-500"}`}>{meta?.emoji}</span>
                  <div className="flex-1">
                    <p className="text-sm text-white">{workout.type} · {workout.minutes} min</p>
                    <p className="text-xs text-slate-500">{new Date(`${workout.date}T12:00:00`).toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}{workout.note ? ` · ${workout.note}` : ""}</p>
                  </div>
                  <span className="text-sm text-lime-300">{workout.calories} kcal</span>
                  <button onClick={() => setWorkouts((current) => current.filter((w) => w.id !== workout.id))} className="rounded p-1.5 text-slate-500 hover:bg-white/5 hover:text-rose-300" aria-label="Delete workout"><Trash2 className="h-4 w-4" /></button>
                </li>
              );
            })}
            {!sorted.length && <li className="py-8 text-center text-sm text-slate-500">No workouts yet — log your first one.</li>}
          </ul>
        </section>
      </main>
    </div>
  );
}
