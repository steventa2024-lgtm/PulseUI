import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useCallback } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { ModelSelector } from "@/features/composer/ModelSelector";
import {
  errorMessage,
  keys,
  useAppSettings,
  useMutation,
  useQueryClient,
} from "@/lib/client/queries";
import { updateAppSettings } from "@/lib/server-fns/history.functions";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({ meta: [{ title: "Settings · PulseUI" }] }),
  component: SettingsPage,
});

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-pulse-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm text-pulse-text">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-pulse-text-muted">{hint}</p>}
      </div>
      <div className="text-sm text-pulse-text-secondary">{children}</div>
    </div>
  );
}

function SettingsPage() {
  const settings = useAppSettings();
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: (defaultModelId: string) => updateAppSettings({ data: { defaultModelId } }),
    onSuccess: () => {
      toast.success("Default model saved");
      void client.invalidateQueries({ queryKey: keys.appSettings });
      void client.invalidateQueries({ queryKey: keys.models });
    },
    onError: (error) => toast.error("Could not save", { description: errorMessage(error) }),
  });
  const onChange = useCallback(
    (id: string) => {
      if (id !== settings.data?.defaultModelId) save.mutate(id);
    },
    [save, settings.data?.defaultModelId],
  );

  const data = settings.data;
  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6">
      <PageHeader
        title="Settings"
        description="Application preferences. Provider credentials are configured in the server environment, not here."
      />
      <section
        className="mb-8 overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface"
        aria-label="AI"
      >
        <h2 className="border-b border-pulse-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted">
          AI
        </h2>
        <Row
          label="Default model"
          hint="Used for new projects unless you pick another model in the composer."
        >
          <div className="flex items-center gap-2">
            {data && (
              <ModelSelector value={data.defaultModelId} onChange={onChange} autoSelect={false} />
            )}
            {save.isSuccess && <Check className="h-4 w-4 text-pulse-success" />}
          </div>
        </Row>
        <Row
          label="Agent step limit"
          hint="Maximum model ⇄ tool rounds per request (AGENT_MAX_STEPS)."
        >
          {data?.agent.maxSteps ?? "…"}
        </Row>
        <Row
          label="Automatic repair attempts"
          hint="Upper bound for build-error repair loops (AGENT_MAX_REPAIR_ATTEMPTS)."
        >
          {data?.agent.maxRepairAttempts ?? "…"}
        </Row>
      </section>
      <section
        className="overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface"
        aria-label="Runtime"
      >
        <h2 className="border-b border-pulse-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted">
          Runtime
        </h2>
        <Row
          label="Data directory"
          hint="Database, project workspaces, version history and deployments (PULSEUI_DATA_DIR)."
        >
          <code className="break-all font-mono text-xs">{data?.dataDirectory ?? "…"}</code>
        </Row>
        <Row label="Projects">{data?.projectCount ?? "…"}</Row>
        <Row
          label="Preview servers"
          hint="Each project's dev server binds here (PREVIEW_HOST / PREVIEW_PUBLIC_HOST / PREVIEW_PORT_START–END)."
        >
          <span className="font-mono text-xs">
            {data
              ? `${data.preview.host} → ${data.preview.publicHost} · ports ${data.preview.portRange}`
              : "…"}
          </span>
        </Row>
      </section>
    </div>
  );
}
