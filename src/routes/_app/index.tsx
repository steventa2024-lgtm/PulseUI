import { createFileRoute } from "@tanstack/react-router";

import { HomePage } from "@/features/home/HomePage";

export const Route = createFileRoute("/_app/")({
  head: () => ({ meta: [{ title: "PulseUI — Build. Iterate. Deploy." }] }),
  component: HomePage,
});
