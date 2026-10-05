import { createFileRoute } from "@tanstack/react-router";

import { DataView } from "@/features/builder/data/DataView";

export const Route = createFileRoute("/projects/$projectId/data")({
  component: DataView,
});
