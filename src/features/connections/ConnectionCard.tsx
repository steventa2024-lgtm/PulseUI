import { Bot, CreditCard, Database, Github, Mail, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import type { ConnectionInfo } from "@/lib/domain/types";

const ICONS: Record<ConnectionInfo["category"], LucideIcon> = {
  ai: Bot,
  source: Github,
  backend: Database,
  payments: CreditCard,
  email: Mail,
};

const STATE = {
  connected: { label: "Connected", variant: "success" },
  local: { label: "Local", variant: "default" },
  not_connected: { label: "Not connected", variant: "secondary" },
  unavailable: { label: "Unavailable", variant: "outline" },
} as const;

export function ConnectionCard({ connection }: { connection: ConnectionInfo }) {
  const Icon = ICONS[connection.category];
  const state = STATE[connection.state];
  return (
    <article className="flex flex-col rounded-[var(--pulse-radius-lg)] border border-pulse-border bg-pulse-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-pulse-border-strong bg-pulse-surface-raised text-pulse-text-secondary">
            <Icon className="h-5 w-5" />
          </span>
          <div>
            <h3 className="text-sm font-medium text-pulse-text">{connection.name}</h3>
            <p className="text-[11px] uppercase tracking-wider text-pulse-text-muted">
              {connection.category}
            </p>
          </div>
        </div>
        <Badge variant={state.variant}>{state.label}</Badge>
      </div>
      <p className="flex-1 text-xs leading-relaxed text-pulse-text-secondary">
        {connection.detail}
      </p>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {connection.envVars.map((name) => (
          <code
            key={name}
            className="rounded border border-pulse-border bg-pulse-bg-deep px-1.5 py-0.5 font-mono text-[10px] text-pulse-text-muted"
          >
            {name}
          </code>
        ))}
      </div>
    </article>
  );
}
