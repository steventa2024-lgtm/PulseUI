import { Link, createFileRoute } from "@tanstack/react-router";
import { FolderKanban, Plus, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProjectCard, ProjectCardSkeleton } from "@/features/projects/ProjectCard";
import { useProjects } from "@/lib/client/queries";

export const Route = createFileRoute("/_app/projects/")({
  head: () => ({ meta: [{ title: "Projects · PulseUI" }] }),
  component: ProjectsPage,
});

function ProjectsPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const projects = useProjects(deferred || undefined);

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Workspace"
        title="Projects"
        description="Every project is a real codebase on disk with its own conversation, version history and preview."
        actions={
          <Button asChild>
            <Link to="/">
              <Plus /> New project
            </Link>
          </Button>
        }
      />
      <label className="mb-6 flex max-w-md items-center gap-2">
        <span className="sr-only">Filter projects</span>
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-pulse-text-muted" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter projects"
            className="pl-9"
          />
        </div>
      </label>

      {projects.isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[0, 1, 2, 3].map((index) => (
            <ProjectCardSkeleton key={index} />
          ))}
        </div>
      ) : projects.data?.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {projects.data.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : deferred ? (
        <EmptyState
          icon={Search}
          title="No matching projects"
          description={`Nothing matches “${deferred}”.`}
        />
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No projects yet."
          description="Describe an app and Pulse will build your first project."
          action={
            <Button asChild>
              <Link to="/">
                <Plus /> Start building
              </Link>
            </Button>
          }
        />
      )}
    </div>
  );
}
