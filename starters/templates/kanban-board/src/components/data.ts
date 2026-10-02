export type ColumnId = "backlog" | "todo" | "doing" | "done";
export type Priority = "Low" | "Medium" | "High";

export type Card = {
  id: string;
  title: string;
  description: string;
  tag: string;
  priority: Priority;
  column: ColumnId;
};

export const COLUMNS: Array<{ id: ColumnId; title: string; dot: string }> = [
  { id: "backlog", title: "Backlog", dot: "bg-slate-500" },
  { id: "todo", title: "To do", dot: "bg-sky-400" },
  { id: "doing", title: "In progress", dot: "bg-amber-400" },
  { id: "done", title: "Done", dot: "bg-emerald-400" },
];

export const TAGS = ["Feature", "Bug", "Design", "Research", "Ops"];

export const SEED: Card[] = [
  { id: "c1", title: "Onboarding checklist", description: "Guide new users through their first project.", tag: "Feature", priority: "High", column: "doing" },
  { id: "c2", title: "Fix flaky export on Safari", description: "CSV export sometimes downloads an empty file.", tag: "Bug", priority: "High", column: "todo" },
  { id: "c3", title: "Pricing page refresh", description: "New tiers and annual discount.", tag: "Design", priority: "Medium", column: "todo" },
  { id: "c4", title: "Interview 5 power users", description: "Collect feedback on the reporting workflow.", tag: "Research", priority: "Medium", column: "backlog" },
  { id: "c5", title: "Dark mode", description: "Respect system preference, add a toggle.", tag: "Feature", priority: "Low", column: "backlog" },
  { id: "c6", title: "Upgrade database", description: "Move to the new managed cluster.", tag: "Ops", priority: "Medium", column: "done" },
  { id: "c7", title: "Team invites", description: "Invite teammates by email with roles.", tag: "Feature", priority: "High", column: "done" },
];

export const PRIORITY_STYLES: Record<Priority, string> = {
  Low: "bg-slate-500/15 text-slate-300",
  Medium: "bg-amber-400/15 text-amber-300",
  High: "bg-rose-500/15 text-rose-300",
};

export const TAG_STYLES: Record<string, string> = {
  Feature: "text-indigo-300",
  Bug: "text-rose-300",
  Design: "text-pink-300",
  Research: "text-sky-300",
  Ops: "text-emerald-300",
};
