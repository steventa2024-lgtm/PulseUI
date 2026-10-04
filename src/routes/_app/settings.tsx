import { createFileRoute } from "@tanstack/react-router";
import { Check } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHeader } from "@/components/shared/PageHeader";
import { Input } from "@/components/ui/input";
import { ModelSelector } from "@/features/composer/ModelSelector";
import { EDITOR_LABELS, type EditorTarget } from "@/features/composer/OpenInMenu";
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
  const [name, setName] = useState("");
  useEffect(() => setName(data?.displayName ?? ""), [data?.displayName]);
  const saveProfile = async (patch: { displayName?: string; editor?: EditorTarget }) => {
    try {
      await updateAppSettings({ data: patch });
      void client.invalidateQueries({ queryKey: keys.appSettings });
      toast.success("Profile saved", { duration: 1500 });
    } catch (error) {
      toast.error("Could not save", { description: errorMessage(error) });
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-4 pb-16 pt-24 sm:px-6">
      <PageHeader
        title="Settings"
        description="Application preferences. Provider credentials are configured in the server environment, not here."
      />
      <section
        className="mb-8 overflow-hidden rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface"
        aria-label="Profile"
      >
        <h2 className="border-b border-pulse-border px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted">
          Profile
        </h2>
        <Row
          label="Your name"
          hint="Shown as the avatar initial. PulseUI has no accounts; this stays on this server."
        >
          <form
            className="flex items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              void saveProfile({ displayName: name });
            }}
          >
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={60}
              className="w-48"
              aria-label="Your name"
            />
            <button
              type="submit"
              className="rounded-md border border-pulse-border-strong px-3 py-1.5 text-xs hover:bg-pulse-surface-hover"
            >
              Save
            </button>
          </form>
        </Row>
        <Row
          label="Desktop editor"
          hint="Where new projects open in addition to the PulseUI builder (via the editor's URL handler)."
        >
          <select
            value={data?.editor ?? "cursor"}
            onChange={(event) => void saveProfile({ editor: event.target.value as EditorTarget })}
            className="rounded-md border border-pulse-border-strong bg-pulse-bg-deep px-2 py-1.5 text-sm text-pulse-text"
            aria-label="Desktop editor"
          >
            {(Object.keys(EDITOR_LABELS) as EditorTarget[]).map((key) => (
              <option key={key} value={key}>
                {key === "none"
                  ? "None (PulseUI only)"
                  : EDITOR_LABELS[key].replace("Open in ", "")}
              </option>
            ))}
          </select>
        </Row>
      </section>
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
