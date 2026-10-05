import { createFileRoute } from "@tanstack/react-router";

import { DeployView } from "@/features/builder/deploy/DeployView";

export const Route = createFileRoute("/projects/$projectId/deploy")({
  component: DeployView,
});
