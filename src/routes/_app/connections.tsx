import { createFileRoute } from "@tanstack/react-router";
import { Plug, RefreshCw } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/features/connections/ConnectionCard";
import { useConnections, useModels } from "@/lib/client/queries";

export const Route = createFileRoute("/_app/connections")({
  head: () => ({ meta: [{ title: "Connections · PulseUI" }] }),
  component: ConnectionsPage,
});

const GROUPS = [
  { id: "ai", title: "AI providers" },
  { id: "source", title: "Source control" },
  { id: "backend", title: "Backend & services" },
] as const;

function ConnectionsPage() {
  const connections = useConnections();
  const models = useModels();
  const noProvider = models.data && !models.data.configured;

  return (
    <div className="mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 lg:px-10">
      <PageHeader
        eyebrow="Integrations"
        title="Connections"
        description="Status comes from the server's real configuration and live checks of local model servers. Secrets stay in the server environment (.env.local) — they are never sent to the browser or to generated apps."
        actions={
          <Button
            variant="outline"
            onClick={() => {
              void connections.refetch();
              void models.refetch();
            }}
            disabled={connections.isFetching}
          >
            <RefreshCw className={connections.isFetching ? "animate-spin" : ""} /> Re-check
          </Button>
        }
      />

      {noProvider && (
        <EmptyState
          icon={Plug}
          className="mb-8"
          title="No provider configured"
          description={
            <>
              Add <code className="font-mono text-xs">GEMINI_API_KEY</code>, an OpenAI-compatible
              endpoint, or run Ollama / LM Studio locally, then restart PulseUI. See{" "}
              <code className="font-mono text-xs">.env.example</code>.
            </>
          }
        />
      )}

      {connections.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <div key={index} className="pulse-skeleton h-40 rounded-[var(--pulse-radius-lg)]" />
          ))}
        </div>
      ) : (
        GROUPS.map((group) => {
          const items = (connections.data ?? []).filter((connection) =>
            group.id === "backend"
              ? ["backend", "payments", "email"].includes(connection.category)
              : connection.category === group.id,
          );
          if (!items.length) return null;
          return (
            <section key={group.id} className="mb-10" aria-labelledby={`group-${group.id}`}>
              <h2
                id={`group-${group.id}`}
                className="mb-4 text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted"
              >
                {group.title}
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
