export type WorkoutType = "Run" | "Strength" | "Cycling" | "Yoga" | "Swim" | "HIIT";

export type Workout = { id: string; type: WorkoutType; minutes: number; calories: number; date: string; note: string };

export const TYPES: Array<{ type: WorkoutType; emoji: string; perMinute: number; color: string }> = [
  { type: "Run", emoji: "🏃", perMinute: 11, color: "bg-orange-400/20" },
  { type: "Strength", emoji: "🏋️", perMinute: 7, color: "bg-violet-400/20" },
  { type: "Cycling", emoji: "🚴", perMinute: 9, color: "bg-sky-400/20" },
  { type: "Yoga", emoji: "🧘", perMinute: 4, color: "bg-emerald-400/20" },
  { type: "Swim", emoji: "🏊", perMinute: 10, color: "bg-cyan-400/20" },
  { type: "HIIT", emoji: "⚡", perMinute: 13, color: "bg-rose-400/20" },
];

export const dayKey = (date: Date) => date.toISOString().slice(0, 10);

export function lastDays(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (count - 1 - index));
    return dayKey(date);
  });
}

export function seedWorkouts(): Workout[] {
  const days = lastDays(7);
  const plan: Array<[number, WorkoutType, number]> = [[0, "Run", 32], [1, "Strength", 45], [2, "Yoga", 30], [3, "Cycling", 50], [4, "Run", 28], [5, "HIIT", 25], [5, "Yoga", 15]];
  return plan.map(([day, type, minutes], index) => ({
    id: `seed${index}`,
    type,
    minutes,
    calories: Math.round(minutes * (TYPES.find((t) => t.type === type)?.perMinute ?? 8)),
    date: days[day]!,
    note: "",
  }));
}
