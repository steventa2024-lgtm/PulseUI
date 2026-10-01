import { Link, createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { FolderKanban, LayoutTemplate, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { useCreateFromTemplate } from "@/features/templates/useCreateFromTemplate";
import { timeAgo } from "@/lib/format";
import { searchEverything } from "@/lib/server-fns/projects.functions";

export const Route = createFileRoute("/_app/search")({
  head: () => ({ meta: [{ title: "Search · PulseUI" }] }),
  component: SearchPage,
});

function SearchPage() {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query.trim());
  const results = useQuery({
    queryKey: ["search", deferred],
    queryFn: () => searchEverything({ data: { query: deferred } }),
  });
  const create = useCreateFromTemplate();

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6">
      <PageHeader
        title="Search"
        description="Find projects and templates. Inside a project, use the Code tab to search source files."
      />
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-pulse-text-muted" />
        <Input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search projects and templates"
          className="h-12 rounded-[var(--pulse-radius-lg)] pl-12 text-base"
          aria-label="Search projects and templates"
        />
      </div>

      <section aria-labelledby="search-projects" className="mb-10">
        <h2
          id="search-projects"
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted"
        >
          Projects
        </h2>
        {results.isPending ? (
          <div className="space-y-2">
            {[0, 1].map((index) => (
              <div key={index} className="pulse-skeleton h-14" />
            ))}
          </div>
        ) : results.data?.projects.length ? (
          <ul className="divide-y divide-pulse-border overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface">
            {results.data.projects.map((project) => (
              <li key={project.id}>
                <Link
                  to="/projects/$projectId"
                  params={{ projectId: project.id }}
                  className="pulse-interactive flex items-center gap-3 px-4 py-3 hover:bg-pulse-surface-hover"
                >
                  <FolderKanban className="h-4 w-4 text-pulse-cyan" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-pulse-text">{project.name}</p>
                    <p className="truncate text-xs text-pulse-text-muted">{project.description}</p>
                  </div>
                  <span className="text-xs text-pulse-text-muted">
                    {timeAgo(project.updatedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={FolderKanban} title="No projects found" className="py-8" />
        )}
      </section>

      <section aria-labelledby="search-templates">
        <h2
          id="search-templates"
          className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted"
        >
          Templates
        </h2>
        {results.data?.templates.length ? (
          <ul className="divide-y divide-pulse-border overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface">
            {results.data.templates.map((template) => (
              <li key={template.id}>
                <button
                  onClick={() => create.mutate(template.id)}
                  disabled={create.isPending}
                  className="pulse-interactive flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-pulse-surface-hover"
                >
                  <LayoutTemplate className="h-4 w-4 text-pulse-magenta" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-pulse-text">{template.name}</p>
                    <p className="truncate text-xs text-pulse-text-muted">{template.description}</p>
                  </div>
                  <span className="text-xs text-pulse-cyan">
                    {create.isPending && create.variables === template.id
                      ? "Creating…"
                      : "Use template"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          !results.isPending && (
            <EmptyState icon={LayoutTemplate} title="No templates match" className="py-8" />
          )
        )}
      </section>
    </div>
  );
}
