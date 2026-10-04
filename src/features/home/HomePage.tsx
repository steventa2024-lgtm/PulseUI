import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { toast } from "sonner";

import { editorUrl } from "@/features/composer/OpenInMenu";
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
    onSuccess: ({ projectId, workspacePath, error }, input) => {
      void client.invalidateQueries({ queryKey: ["projects"] });
      // Optionally hand the folder to a desktop editor via its URL handler.
      const editorLink = editorUrl(input.openIn, workspacePath);
      if (editorLink) {
        const anchor = document.createElement("a");
        anchor.href = editorLink;
        anchor.rel = "noreferrer";
        anchor.click();
      }
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
        <div className="relative z-10 mx-auto flex max-w-[880px] flex-col items-center px-4 pb-[52px] pt-24 text-center sm:px-6 sm:pt-28 lg:pt-[118px]">
          <p className="text-[13px] font-semibold uppercase tracking-[0.24em] text-[#3fb2ff] [text-shadow:0_0_18px_rgb(36_150_255/0.55)] sm:text-[15px]">
            AI Powered App Builder
          </p>
          <h1 className="mt-5 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.035em] text-white [text-shadow:0_0_28px_rgb(200_220_255/0.35)] sm:text-6xl lg:whitespace-nowrap lg:text-[72px]">
            Build. Iterate. <span className="pulse-text-deploy [text-shadow:none]">Deploy.</span>
          </h1>
          <p className="mt-4 max-w-xl text-lg text-[#b9c3d6] sm:text-[22px]">
            From idea to live app in minutes with PulseUI.
          </p>
          <div className="mt-14 w-full text-left">
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
        className="relative z-10 px-4 pb-14 sm:px-6 lg:px-7"
        aria-labelledby="popular-templates"
      >
        <div className="mb-5 flex items-end justify-between">
          <h2
            id="popular-templates"
            className="font-display text-[22px] font-semibold tracking-[-0.01em] text-white"
          >
            Popular Templates
          </h2>
          <Link
            to="/templates"
            className="pulse-interactive group flex items-center gap-1.5 text-[17px] font-medium text-[#2f8cff] hover:text-[#5aa6ff]"
          >
            View all{" "}
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          {POPULAR.map((template, index) => (
            <TemplateCard
              key={template.id}
              template={template}
              accent={index}
              pending={fromTemplate.isPending && fromTemplate.variables === template.id}
              disabled={fromTemplate.isPending}
              onSelect={(selected) => fromTemplate.mutate(selected.id)}
            />
          ))}
        </div>
      </section>

      {Boolean(projects.data?.length) && (
        <section className="px-4 pb-20 sm:px-6 lg:px-7" aria-labelledby="recent-projects">
          <div className="mb-5 flex items-end justify-between">
            <h2 id="recent-projects" className="font-display text-[22px] font-semibold text-white">
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
