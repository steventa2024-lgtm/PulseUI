import { useNavigate } from "@tanstack/react-router";
import { Loader2, Save, Trash2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { errorMessage, keys, useQueryClient } from "@/lib/client/queries";
import { FRAMEWORK_LABELS } from "@/lib/format";
import { removeProject, updateProject } from "@/lib/server-fns/projects.functions";
import { useBuilder } from "../BuilderContext";

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[220px_1fr] sm:items-start">
      <div>
        <p className="text-sm text-pulse-text">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-pulse-text-muted">{hint}</p>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function ProjectSettingsView() {
  const { project, projectId, busy } = useBuilder();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [repairs, setRepairs] = useState(3);
  const [typecheck, setTypecheck] = useState(true);
  const [lint, setLint] = useState(true);
  const [autoPreview, setAutoPreview] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!project) return;
    setName(project.name);
    setDescription(project.description);
    setRepairs(project.settings.autoRepairAttempts);
    setTypecheck(project.settings.runTypecheck);
    setLint(project.settings.runLint);
    setAutoPreview(project.settings.autoStartPreview);
  }, [project]);

  if (!project)
    return (
      <div className="p-6">
        <div className="pulse-skeleton h-40" />
      </div>
    );

  const save = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await updateProject({
        data: {
          projectId,
          name: name.trim() || project.name,
          description,
          settings: {
            autoRepairAttempts: repairs,
            runTypecheck: typecheck,
            runLint: lint,
            autoStartPreview: autoPreview,
          },
        },
      });
      void client.invalidateQueries({ queryKey: keys.project(projectId) });
      void client.invalidateQueries({ queryKey: ["projects"] });
      toast.success("Project settings saved");
    } catch (error) {
      toast.error("Could not save", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  };

  const destroy = async () => {
    setDeleting(true);
    try {
      await removeProject({ data: { projectId } });
      void client.invalidateQueries({ queryKey: ["projects"] });
      toast.success(`Deleted ${project.name}`);
      void navigate({ to: "/projects" });
    } catch (error) {
      toast.error("Delete failed", { description: errorMessage(error) });
      setDeleting(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-pulse-bg p-5 sm:p-6">
      <form onSubmit={save} className="mx-auto max-w-3xl space-y-8">
        <div>
          <h2 className="font-display text-xl font-semibold text-pulse-text">Project settings</h2>
          <p className="mt-1 text-sm text-pulse-text-secondary">
            How Pulse validates and previews this project.
          </p>
        </div>
        <section className="space-y-5 rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-5">
          <Field label="Name">
            <Input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} />
          </Field>
          <Field label="Description">
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              maxLength={2000}
            />
          </Field>
        </section>
        <section className="space-y-5 rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-5">
          <Field
            label="Automatic repair attempts"
            hint="How many times Pulse may try to fix a failing build on its own (0–10)."
          >
            <Input
              type="number"
              min={0}
              max={10}
              value={repairs}
              onChange={(event) =>
                setRepairs(Math.max(0, Math.min(10, Number(event.target.value) || 0)))
              }
              className="w-24"
            />
          </Field>
          <Field label="Run type checker" hint="Run the project's typecheck before the build.">
            <Switch
              checked={typecheck}
              onCheckedChange={setTypecheck}
              aria-label="Run type checker"
            />
          </Field>
          <Field
            label="Run lint"
            hint="Report lint findings (non-blocking) when a lint script exists."
          >
            <Switch checked={lint} onCheckedChange={setLint} aria-label="Run lint" />
          </Field>
          <Field
            label="Start preview automatically"
            hint="Boot the dev server after Pulse changes files."
          >
            <Switch
              checked={autoPreview}
              onCheckedChange={setAutoPreview}
              aria-label="Start preview automatically"
            />
          </Field>
        </section>
        <section className="space-y-3 rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-5 text-xs">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-pulse-text-muted">
            Detected stack
          </p>
          <dl className="grid gap-2 sm:grid-cols-[180px_1fr]">
            <dt className="text-pulse-text-muted">Framework</dt>
            <dd className="text-pulse-text">
              {FRAMEWORK_LABELS[project.framework] ?? project.framework}
            </dd>
            <dt className="text-pulse-text-muted">Package manager</dt>
            <dd className="text-pulse-text">{project.packageManager}</dd>
            <dt className="text-pulse-text-muted">Install</dt>
            <dd className="font-mono text-pulse-text-secondary">
              {project.metadata.installCommand ?? "—"}
            </dd>
            <dt className="text-pulse-text-muted">Dev server</dt>
            <dd className="font-mono text-pulse-text-secondary">
              {project.metadata.devCommand ?? "—"}
            </dd>
            <dt className="text-pulse-text-muted">Build</dt>
            <dd className="font-mono text-pulse-text-secondary">
              {project.metadata.buildCommand ?? "—"}
            </dd>
            {project.gitRepository && (
              <>
                <dt className="text-pulse-text-muted">Imported from</dt>
                <dd className="text-pulse-text-secondary">
                  {project.gitRepository} {project.gitBranch ? `(${project.gitBranch})` : ""}
                </dd>
              </>
            )}
            <dt className="text-pulse-text-muted">Workspace</dt>
            <dd className="break-all font-mono text-pulse-text-secondary">
              {project.workspacePath}
            </dd>
          </dl>
        </section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="text-pulse-danger hover:bg-pulse-danger/10 hover:text-pulse-danger"
                disabled={deleting}
              >
                <Trash2 /> Delete project
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {project.name}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This removes the workspace, version history, conversation and deployments. It
                  cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void destroy()}
                  className="bg-pulse-danger text-white hover:bg-pulse-danger/90"
                >
                  Delete project
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <Button type="submit" disabled={saving || busy}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />} Save settings
          </Button>
        </div>
      </form>
    </div>
  );
}
