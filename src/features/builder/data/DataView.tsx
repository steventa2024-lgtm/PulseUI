import { Link } from "@tanstack/react-router";
import { Database, Sparkles } from "lucide-react";

import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { ConnectionCard } from "@/features/connections/ConnectionCard";
import { useConnections } from "@/lib/client/queries";
import { useBuilder } from "../BuilderContext";

export function DataView() {
  const { send, busy } = useBuilder();
  const connections = useConnections();
  const backends = (connections.data ?? []).filter((connection) =>
    ["backend", "payments", "email"].includes(connection.category),
  );

  return (
    <div className="h-full overflow-y-auto bg-pulse-bg p-5 sm:p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <h2 className="font-display text-xl font-semibold text-pulse-text">Data</h2>
          <p className="mt-1 text-sm text-pulse-text-secondary">
            Databases and backend services available to this project.
          </p>
        </div>
        <EmptyState
          icon={Database}
          title="No database is attached to this project"
          description="PulseUI does not provision databases yet. Generated apps run as front-end projects; server credentials are never injected into them."
          action={
            <Button
              variant="outline"
              disabled={busy}
              onClick={() =>
                void send({
                  prompt:
                    "Add a small typed data layer that persists this app's data to localStorage, with seed data and a reset option.",
                  mode: "build",
                  modelId: null,
                  attachments: [],
                })
              }
            >
              <Sparkles /> Ask Pulse to add local persistence
            </Button>
          }
        />
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-pulse-text-muted">
              Server integrations
            </h3>
            <Link to="/connections" className="text-xs text-pulse-cyan hover:underline">
              Manage connections
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {connections.isLoading
              ? [0, 1, 2].map((index) => <div key={index} className="pulse-skeleton h-36" />)
              : backends.map((connection) => (
                  <ConnectionCard key={connection.id} connection={connection} />
                ))}
          </div>
        </section>
      </div>
    </div>
  );
}
