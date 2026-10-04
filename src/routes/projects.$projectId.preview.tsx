import { createFileRoute } from "@tanstack/react-router";

import { PreviewPanel } from "@/features/builder/preview/PreviewPanel";

/** Maximized preview (the layout hides the agent panel on this tab). */
export const Route = createFileRoute("/projects/$projectId/preview")({
  component: PreviewPanel,
});
