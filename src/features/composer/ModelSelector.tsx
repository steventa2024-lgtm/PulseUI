import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Cpu, Eye, Settings2, Sparkles } from "lucide-react";
import { useEffect, useMemo } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModels } from "@/lib/client/queries";
import type { ModelOption } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "pulseui.model";

export function readStoredModel(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Lists only models the server can actually use: configured providers plus
 * local servers that answered. With nothing configured it becomes a
 * "Configure AI" link instead of pretending.
 */
export function ModelSelector({
  value,
  onChange,
  className,
  autoSelect = true,
}: {
  value: string | null;
  onChange: (id: string, option: ModelOption) => void;
  className?: string;
  /** Pick the stored/default model automatically when nothing is selected. */
  autoSelect?: boolean;
}) {
  const models = useModels();
  const options = useMemo(() => models.data?.models ?? [], [models.data]);
  const selected = options.find((option) => option.id === value) ?? null;

  useEffect(() => {
    if (!autoSelect || !models.data || selected) return;
    const stored = readStoredModel();
    const pick =
      options.find((option) => option.id === stored) ??
      options.find((option) => option.id === models.data?.defaultModelId) ??
      options[0];
    if (pick) onChange(pick.id, pick);
  }, [autoSelect, models.data, selected, options, onChange]);

  if (models.isPending) return <div className={cn("pulse-skeleton h-8 w-32", className)} />;

  if (!options.length) {
    return (
      <Link
        to="/connections"
        className={cn(
          "pulse-interactive flex h-8 items-center gap-1.5 rounded-[var(--pulse-radius-sm)] border border-pulse-warning/30 bg-pulse-warning/10 px-2.5 text-xs font-medium text-pulse-warning hover:bg-pulse-warning/15",
          className,
        )}
      >
        <Settings2 className="h-3.5 w-3.5" /> Configure AI
      </Link>
    );
  }

  const groups = new Map<string, ModelOption[]>();
  for (const option of options)
    groups.set(option.providerLabel, [...(groups.get(option.providerLabel) ?? []), option]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "pulse-interactive flex h-8 max-w-[220px] items-center gap-1.5 rounded-[var(--pulse-radius-sm)] px-2.5 text-xs text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text focus-visible:outline-2 focus-visible:outline-pulse-cyan",
          className,
        )}
        aria-label="Choose model"
      >
        {selected?.local ? (
          <Cpu className="h-3.5 w-3.5 text-pulse-cyan" />
        ) : (
          <Sparkles className="h-3.5 w-3.5 text-pulse-cyan" />
        )}
        <span className="truncate">{selected ? selected.model : "Choose model"}</span>
        <ChevronDown className="h-3 w-3 opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-80 w-72 overflow-y-auto border-pulse-border-strong bg-pulse-surface-raised"
      >
        {[...groups.entries()].map(([label, items], index) => (
          <div key={label}>
            {index > 0 && <DropdownMenuSeparator />}
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-pulse-text-muted">
              {label} {items[0]?.local ? "· local" : ""}
            </DropdownMenuLabel>
            {items.map((option) => (
              <DropdownMenuItem
                key={option.id}
                onSelect={() => {
                  try {
                    window.localStorage.setItem(STORAGE_KEY, option.id);
                  } catch {
                    // ignore
                  }
                  onChange(option.id, option);
                }}
                className="gap-2 text-xs"
              >
                <Check
                  className={cn(
                    "h-3.5 w-3.5",
                    option.id === value ? "opacity-100 text-pulse-cyan" : "opacity-0",
                  )}
                />
                <span className="flex-1 truncate">{option.model}</span>
                {option.supportsVision && (
                  <Eye className="h-3 w-3 text-pulse-text-muted" aria-label="Supports images" />
                )}
              </DropdownMenuItem>
            ))}
          </div>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="text-xs">
          <Link to="/connections">
            <Settings2 className="h-3.5 w-3.5" /> Manage providers
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
