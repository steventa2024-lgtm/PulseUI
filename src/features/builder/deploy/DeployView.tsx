import { ExternalLink, Loader2, Rocket, ScrollText, Square } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { EmptyState } from "@/components/shared/EmptyState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { errorMessage, useDeployments, useVersions } from "@/lib/client/queries";
import type { Deployment, DeploymentStatus } from "@/lib/domain/types";
import { timeAgo } from "@/lib/format";
import { cancelProjectDeployment, deployProject } from "@/lib/server-fns/history.functions";
import { useBuilder } from "../BuilderContext";

const STATUS: Record<
  DeploymentStatus,
  "secondary" | "default" | "success" | "destructive" | "outline"
> = {
  QUEUED: "secondary",
  BUILDING: "default",
  READY: "success",
  FAILED: "destructive",
  CANCELLED: "outline",
};

function DeploymentRow({
  deployment,
  versionNumber,
  latest,
}: {
  deployment: Deployment;
  versionNumber: number | null;
  latest: boolean;
}) {
  const [logs, setLogs] = useState(latest && deployment.status !== "READY");
  const active = deployment.status === "QUEUED" || deployment.status === "BUILDING";
  return (
    <li className="rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface">
      <div className="flex flex-wrap items-center gap-3 p-4">
        <Badge variant={STATUS[deployment.status]}>
          {active && <Loader2 className="h-3 w-3 animate-spin" />} {deployment.status}
        </Badge>
        <div className="min-w-0 flex-1 text-xs text-pulse-text-secondary">
          <p className="text-pulse-text">
            {versionNumber ? `Version ${versionNumber}` : "Current files"} · {deployment.provider}
          </p>
          <p className="text-pulse-text-muted">Created {timeAgo(deployment.createdAt)}</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => setLogs(!logs)} aria-expanded={logs}>
            <ScrollText /> {logs ? "Hide logs" : "View Logs"}
          </Button>
          {active && (
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                void cancelProjectDeployment({ data: { deploymentId: deployment.id } }).catch(
                  (error) => toast.error(errorMessage(error)),
                )
              }
            >
              <Square className="h-3 w-3" /> Cancel
            </Button>
          )}
          {deployment.status === "READY" && deployment.url && (
            <Button size="sm" asChild>
              <a href={deployment.url} target="_blank" rel="noreferrer">
                <ExternalLink /> Open Site
              </a>
            </Button>
          )}
        </div>
      </div>
      {logs && (
        <pre className="max-h-72 overflow-auto border-t border-pulse-border bg-pulse-bg-deep p-3 font-mono text-[11px] leading-relaxed text-pulse-text-secondary whitespace-pre-wrap">
          {deployment.logs || "Waiting for output…"}
        </pre>
      )}
    </li>
  );
}

export function DeployView() {
  const { projectId, busy } = useBuilder();
  const deployments = useDeployments(projectId);
  const versions = useVersions(projectId);
  const [deploying, setDeploying] = useState(false);
  const list = deployments.data?.deployments ?? [];
  const providers = deployments.data?.providers ?? [];
  const configured = providers.filter((provider) => provider.configured);
  const inProgress = list.some(
    (deployment) => deployment.status === "QUEUED" || deployment.status === "BUILDING",
  );

  const deploy = async (providerId: string) => {
    setDeploying(true);
    try {
      await deployProject({ data: { projectId, providerId } });
      void deployments.refetch();
    } catch (error) {
      toast.error("Deployment could not start", { description: errorMessage(error) });
    } finally {
      setDeploying(false);
    }
  };

  const versionNumber = (id: string | null) =>
    versions.data?.find((version) => version.id === id)?.number ?? null;

  return (
    <div className="h-full overflow-y-auto bg-pulse-bg p-5 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-pulse-text">
            <span className="pulse-text-deploy">Deploy</span>
          </h2>
          <p className="mt-1 text-sm text-pulse-text-secondary">
            Build the project for production and publish it.
          </p>
        </div>

        {deployments.isPending ? (
          <div className="pulse-skeleton h-28" />
        ) : !configured.length ? (
          <EmptyState
            icon={Rocket}
            title="Deployment provider not configured."
            description="No deployment target is available on this server."
          />
        ) : (
          configured.map((provider) => (
            <div
              key={provider.id}
              className="rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-5"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-md">
                  <p className="text-sm font-medium text-pulse-text">{provider.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-pulse-text-secondary">
                    {provider.description}
                  </p>
                </div>
                <Button
                  variant="accent"
                  onClick={() => void deploy(provider.id)}
                  disabled={deploying || inProgress || busy}
                >
                  {deploying || inProgress ? <Loader2 className="animate-spin" /> : <Rocket />}
                  {list.length ? "Redeploy" : "Deploy"}
                </Button>
              </div>
              <p className="mt-4 text-[11px] text-pulse-text-muted">
                Hosted providers (Vercel, Netlify, Cloudflare Pages) are not connected yet — they
                plug into the same deployment interface.
              </p>
            </div>
          ))
        )}

        <section aria-labelledby="deployments-heading">
          <h3
            id="deployments-heading"
            className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted"
          >
            Deployments
          </h3>
          {list.length ? (
            <ul className="space-y-3">
              {list.map((deployment, index) => (
                <DeploymentRow
                  key={deployment.id}
                  deployment={deployment}
                  versionNumber={versionNumber(deployment.versionId)}
                  latest={index === 0}
                />
              ))}
            </ul>
          ) : (
            !deployments.isPending && (
              <EmptyState icon={Rocket} title="No deployments yet." className="py-10" />
            )
          )}
        </section>
      </div>
    </div>
  );
}
