import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { PulseComposer, type ComposerSubmit } from "@/features/composer/PulseComposer";
import { ProjectCard } from "@/features/projects/ProjectCard";
import { TemplateCard } from "@/features/templates/TemplateCard";
import { useCreateFromTemplate } from "@/features/templates/useCreateFromTemplate";
import { errorMessage, useMutation, useProjects, useQueryClient } from "@/lib/client/queries";
import { createProjectFromPrompt } from "@/lib/server-fns/projects.functions";
import { TEMPLATES } from "@/lib/templates/registry";
import { CyberGridBackground } from "./CyberGridBackground";

const POPULAR = TEMPLATES.filter((template) => template.popular).slice(0, 5);

export function HomePage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const projects = useProjects();
  const fromTemplate = useCreateFromTemplate();

  const create = useMutation({
    mutationFn: (input: ComposerSubmit) =>
      createProjectFromPrompt({
        data: {
          prompt: input.prompt,
          mode: input.mode,
          attachments: input.attachments,
          ...(input.modelId ? { modelId: input.modelId } : {}),
        },
      }),
    onSuccess: ({ projectId, error }) => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      if (error) toast.error("Pulse could not start", { description: error });
      void navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (error) =>
      toast.error("Could not create the project", { description: errorMessage(error) }),
  });

  return (
    <div className="relative">
      <section className="relative isolate overflow-hidden">
        <CyberGridBackground />
        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-4 pb-14 pt-24 text-center sm:px-6 sm:pt-32 lg:pt-36">
          <p className="mb-5 inline-flex items-center gap-2 rounded-full border border-pulse-cyan/25 bg-pulse-cyan/[0.06] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-pulse-cyan shadow-[0_0_30px_-10px_rgb(0_207_255/0.6)]">
            <span className="h-1.5 w-1.5 rounded-full bg-pulse-cyan shadow-[0_0_8px_var(--pulse-cyan)]" />
            AI Powered App Builder
          </p>
          <h1 className="font-display text-[44px] font-semibold leading-[1.02] tracking-[-0.035em] text-pulse-text sm:text-6xl lg:text-7xl">
            Build. Iterate. <span className="pulse-text-deploy">Deploy.</span>
          </h1>
          <p className="mt-5 max-w-xl text-base text-pulse-text-secondary sm:text-lg">
            From idea to live app in minutes with PulseUI.
          </p>
          <div className="mt-10 w-full max-w-3xl text-left">
            <PulseComposer
              variant="hero"
              autoFocus
              busy={create.isPending}
              onSubmit={async (input) => {
                await create.mutateAsync(input).catch(() => undefined);
                return false;
              }}
            />
          </div>
        </div>
      </section>

      <section
        className="relative z-10 mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-10"
        aria-labelledby="popular-templates"
      >
        <div className="mb-5 flex items-end justify-between">
          <h2 id="popular-templates" className="font-display text-lg font-semibold text-pulse-text">
            Popular Templates
          </h2>
          <Link
            to="/templates"
            className="pulse-interactive group flex items-center gap-1 text-sm text-pulse-text-secondary hover:text-pulse-cyan"
          >
            View all{" "}
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {POPULAR.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              pending={fromTemplate.isPending && fromTemplate.variables === template.id}
              disabled={fromTemplate.isPending}
              onSelect={(selected) => fromTemplate.mutate(selected.id)}
            />
          ))}
        </div>
      </section>

      {Boolean(projects.data?.length) && (
        <section
          className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-10"
          aria-labelledby="recent-projects"
        >
          <div className="mb-5 flex items-end justify-between">
            <h2 id="recent-projects" className="font-display text-lg font-semibold text-pulse-text">
              Continue building
            </h2>
            <Link
              to="/projects"
              className="pulse-interactive flex items-center gap-1 text-sm text-pulse-text-secondary hover:text-pulse-cyan"
            >
              All projects <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {projects.data?.slice(0, 4).map((project) => (
              <ProjectCard key={project.id} project={project} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
