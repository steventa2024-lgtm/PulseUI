import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";

import { PageHeader } from "@/components/shared/PageHeader";
import { TemplateCard } from "@/features/templates/TemplateCard";
import { useCreateFromTemplate } from "@/features/templates/useCreateFromTemplate";
import { TEMPLATES, type TemplateCategory } from "@/lib/templates/registry";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/templates")({
  head: () => ({ meta: [{ title: "Templates · PulseUI" }] }),
  component: TemplatesPage,
});

const CATEGORIES: Array<"All" | TemplateCategory> = [
  "All",
  "Dashboard",
  "Business",
  "Productivity",
  "Commerce",
  "Marketing",
  "AI",
  "Personal",
];

function TemplatesPage() {
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const create = useCreateFromTemplate();
  const visible = TEMPLATES.filter(
    (template) => category === "All" || template.category === category,
  );

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Starters"
        title="Templates"
        description="Each template is a real React + TypeScript + Vite project. Pick one and PulseUI creates the project, installs dependencies and boots its live preview — then Pulse can reshape it."
      />
      <div role="tablist" aria-label="Template categories" className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((name) => (
          <button
            key={name}
            role="tab"
            aria-selected={category === name}
            onClick={() => setCategory(name)}
            className={cn(
              "pulse-interactive rounded-full border px-3.5 py-1.5 text-xs font-medium",
              category === name
                ? "border-pulse-cyan/40 bg-pulse-cyan/10 text-pulse-cyan"
                : "border-pulse-border-strong text-pulse-text-secondary hover:border-pulse-cyan/30 hover:text-pulse-text",
            )}
          >
            {name}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            size="lg"
            pending={create.isPending && create.variables === template.id}
            disabled={create.isPending}
            onSelect={(selected) => create.mutate(selected.id)}
          />
        ))}
      </div>
    </div>
  );
}
