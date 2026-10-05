import { Link } from "@tanstack/react-router";
import { FolderGit2 } from "lucide-react";

import { StatusDot } from "@/components/shared/StatusDot";
import type { ProjectSummary } from "@/lib/domain/types";
import { FRAMEWORK_LABELS, timeAgo } from "@/lib/format";
import { getTemplate } from "@/lib/templates/registry";

export function ProjectCard({ project }: { project: ProjectSummary }) {
  const template = project.templateId ? getTemplate(project.templateId) : undefined;
  return (
    <Link
      to="/projects/$projectId"
      params={{ projectId: project.id }}
      className="group pulse-interactive flex flex-col overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface hover:-translate-y-0.5 hover:border-pulse-cyan/40 hover:shadow-glow-blue focus-visible:outline-2 focus-visible:outline-pulse-cyan"
    >
      <div className="relative aspect-[16/9] overflow-hidden border-b border-pulse-border bg-pulse-bg-deep">
        {template ? (
          <img
            src={template.image}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover object-top opacity-80 transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_20%_20%,rgb(36_124_255/0.25),transparent_55%),radial-gradient(circle_at_85%_80%,rgb(199_44_255/0.22),transparent_55%)]">
            <span className="font-display text-3xl font-semibold text-pulse-text/80">
              {project.name.slice(0, 1).toUpperCase()}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-center gap-2">
          <StatusDot
            tone={
              project.status === "running"
                ? "running"
                : project.status === "error"
                  ? "error"
                  : "idle"
            }
          />
          <p className="truncate text-sm font-medium text-pulse-text">{project.name}</p>
        </div>
        {project.description && (
          <p className="line-clamp-2 text-xs text-pulse-text-secondary">{project.description}</p>
        )}
        <div className="mt-auto flex items-center gap-2 pt-2 text-[11px] text-pulse-text-muted">
          <FolderGit2 className="h-3 w-3" />{" "}
          {FRAMEWORK_LABELS[project.framework] ?? project.framework}
          <span>·</span>
          <span>Updated {timeAgo(project.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}

export function ProjectCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface">
      <div className="pulse-skeleton aspect-[16/9] rounded-none" />
      <div className="space-y-2 p-4">
        <div className="pulse-skeleton h-4 w-2/3" />
        <div className="pulse-skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}
