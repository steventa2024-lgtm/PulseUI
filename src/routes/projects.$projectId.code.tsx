import { createFileRoute } from "@tanstack/react-router";

import { CodeWorkspace } from "@/features/builder/editor/CodeWorkspace";

export const Route = createFileRoute("/projects/$projectId/code")({
  component: CodeWorkspace,
});
