export type Category = "Housing" | "Food" | "Transport" | "Fun" | "Health" | "Shopping" | "Income";

export type Entry = { id: string; label: string; amount: number; category: Category; date: string };

export const EXPENSE_CATEGORIES: Array<{ name: Exclude<Category, "Income">; color: string; budget: number }> = [
  { name: "Housing", color: "#6366f1", budget: 1600 },
  { name: "Food", color: "#f59e0b", budget: 550 },
  { name: "Transport", color: "#06b6d4", budget: 220 },
  { name: "Fun", color: "#ec4899", budget: 200 },
  { name: "Health", color: "#10b981", budget: 120 },
  { name: "Shopping", color: "#8b5cf6", budget: 250 },
];

export const monthKey = (date: string) => date.slice(0, 7);

export function seedEntries(): Entry[] {
  // Spread over the previous 28 days so nothing is dated in the future.
  const rows: Array<[string, number, Category, number]> = [
    ["Salary", 5200, "Income", 27],
    ["Rent", -1550, "Housing", 27],
    ["Groceries — Market Hall", -132.4, "Food", 24],
    ["Transit pass", -96, "Transport", 23],
    ["Dinner with friends", -64.8, "Fun", 20],
    ["Pharmacy", -23.5, "Health", 18],
    ["Groceries — Corner Shop", -58.9, "Food", 15],
    ["Running shoes", -129, "Shopping", 12],
    ["Freelance design", 640, "Income", 9],
    ["Electricity", -71.2, "Housing", 6],
    ["Concert tickets", -88, "Fun", 3],
    ["Coffee beans", -18.5, "Food", 1],
  ];
  return rows.map(([label, amount, category, daysAgo], index) => {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    return { id: `seed${index}`, label, amount, category, date: date.toISOString().slice(0, 10) };
  });
}

/** The month with the most entries — a sensible default view. */
export function busiestMonth(entries: Entry[]): string {
  const counts = new Map<string, number>();
  for (const entry of entries) counts.set(monthKey(entry.date), (counts.get(monthKey(entry.date)) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? new Date().toISOString().slice(0, 7);
}

export const money = (value: number) =>
  value.toLocaleString(undefined, { style: "currency", currency: "USD", minimumFractionDigits: 2 });
