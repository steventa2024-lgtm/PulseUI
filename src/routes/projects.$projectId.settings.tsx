import { createFileRoute } from "@tanstack/react-router";

import { ProjectSettingsView } from "@/features/builder/settings/ProjectSettingsView";

export const Route = createFileRoute("/projects/$projectId/settings")({
  component: ProjectSettingsView,
});
