import { Outlet, createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/features/shell/AppShell";

/** Layout for the non-builder screens: sidebar, top bar, command palette trigger. */
export const Route = createFileRoute("/_app")({
  component: () => (
    <AppShell>
      <Outlet />
    </AppShell>
  ),
});
