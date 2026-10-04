import { createFileRoute } from "@tanstack/react-router";

import { PreviewPanel } from "@/features/builder/preview/PreviewPanel";

/** Build tab: Pulse on the left (layout), the running app on the right. */
export const Route = createFileRoute("/projects/$projectId/")({
  component: PreviewPanel,
});
