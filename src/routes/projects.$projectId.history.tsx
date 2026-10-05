import { createFileRoute } from "@tanstack/react-router";

import { HistoryView } from "@/features/builder/history/HistoryView";

export const Route = createFileRoute("/projects/$projectId/history")({
  component: HistoryView,
});
