import { createFileRoute } from "@tanstack/react-router";

import { BuilderLayout } from "@/features/builder/BuilderLayout";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({ meta: [{ title: "Builder · PulseUI" }] }),
  params: {
    parse: (params) => {
      if (!/^prj_[a-z0-9]{6,40}$/.test(params.projectId)) throw new Error("Invalid project id");
      return params;
    },
  },
  ssr: false,
  component: function ProjectRoute() {
    const { projectId } = Route.useParams();
    return <BuilderLayout projectId={projectId} />;
  },
});
