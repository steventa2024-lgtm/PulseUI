import { useNavigate } from "@tanstack/react-router";
import { Github, Loader2 } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage, useMutation } from "@/lib/client/queries";
import { importGitHubProject } from "@/lib/server-fns/projects.functions";

const REPO = /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/;

export function GitHubImportDialog({
  open,
  onOpenChange,
  initialUrl = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
}) {
  const navigate = useNavigate();
  const [url, setUrl] = useState(initialUrl);
  const [branch, setBranch] = useState("");

  useEffect(() => {
    if (open) setUrl(initialUrl);
  }, [open, initialUrl]);

  const mutation = useMutation({
    mutationFn: () =>
      importGitHubProject({
        data: { url: url.trim(), ...(branch.trim() ? { branch: branch.trim() } : {}) },
      }),
    onSuccess: ({ projectId }) => {
      onOpenChange(false);
      void navigate({ to: "/projects/$projectId", params: { projectId } });
    },
    onError: (error) => toast.error("Import failed", { description: errorMessage(error) }),
  });

  const valid = REPO.test(url.trim());

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (valid) mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !mutation.isPending && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" /> Import from GitHub
          </DialogTitle>
          <DialogDescription>
            PulseUI clones the repository, detects its stack, installs dependencies and starts a
            live preview. Public repositories work out of the box; private ones need{" "}
            <code className="font-mono text-xs">GITHUB_TOKEN</code> on the server.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-pulse-text-secondary">Repository URL</span>
            <Input
              autoFocus
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://github.com/owner/repo"
              aria-invalid={Boolean(url) && !valid}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-xs font-medium text-pulse-text-secondary">Branch (optional)</span>
            <Input
              value={branch}
              onChange={(event) => setBranch(event.target.value)}
              placeholder="default branch"
            />
          </label>
          {url && !valid && (
            <p className="text-xs text-pulse-warning">Use the form https://github.com/owner/repo</p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={mutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!valid || mutation.isPending}>
              {mutation.isPending ? <Loader2 className="animate-spin" /> : <Github />}
              {mutation.isPending ? "Cloning…" : "Import repository"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
