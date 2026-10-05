import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Settings2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AgentMode, ModelOption } from "@/lib/domain/types";
import { cn } from "@/lib/utils";
import { storeModel } from "./ModelSelector";

export type EditorTarget = "cursor" | "vscode" | "none";

export const EDITOR_LABELS: Record<EditorTarget, string> = {
  cursor: "Open in Cursor",
  vscode: "Open in VS Code",
  none: "Open in PulseUI",
};

/** Deep link that opens a local folder in the chosen desktop editor. */
export function editorUrl(target: EditorTarget, folder: string): string | null {
  if (target === "none") return null;
  const scheme = target === "cursor" ? "cursor" : "vscode";
  return `${scheme}://file${folder.startsWith("/") ? "" : "/"}${encodeURI(folder.replace(/\\/g, "/"))}`;
}

function Item({
  checked,
  onSelect,
  children,
}: {
  checked: boolean;
  onSelect: () => void;
  children: React.ReactNode;
}) {
  return (
    <DropdownMenuItem onSelect={onSelect} className="gap-2 text-[13px]">
      <Check className={cn("h-3.5 w-3.5", checked ? "text-pulse-cyan" : "opacity-0")} />
      {children}
    </DropdownMenuItem>
  );
}

/**
 * The hero composer's destination pill: where the new project opens (the
 * PulseUI builder always opens; Cursor / VS Code are opened in addition via
 * their URL handlers), plus the model and Plan/Build mode.
 */
export function OpenInMenu({
  target,
  onTarget,
  mode,
  onMode,
  options,
  modelId,
  onModel,
  className,
}: {
  target: EditorTarget;
  onTarget: (target: EditorTarget) => void;
  mode: AgentMode;
  onMode: (mode: AgentMode) => void;
  options: ModelOption[];
  modelId: string | null;
  onModel: (id: string, option: ModelOption) => void;
  className?: string;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "pulse-interactive flex h-12 items-center gap-3 rounded-2xl border border-white/[0.09] bg-white/[0.03] px-4 text-[15px] text-pulse-text-secondary hover:border-white/20 hover:text-white focus-visible:outline-2 focus-visible:outline-pulse-cyan",
          className,
        )}
        aria-label={`${EDITOR_LABELS[target]}, model and mode`}
      >
        <span>{EDITOR_LABELS[target]}</span>
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="max-h-[70vh] w-72 overflow-y-auto border-pulse-border-strong bg-pulse-surface-raised"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-pulse-text-muted">
          After creating the project
        </DropdownMenuLabel>
        {(Object.keys(EDITOR_LABELS) as EditorTarget[]).map((key) => (
          <Item key={key} checked={target === key} onSelect={() => onTarget(key)}>
            {key === "none" ? "Open in the PulseUI builder only" : `${EDITOR_LABELS[key]} too`}
          </Item>
        ))}
        <p className="px-2 pb-1.5 pt-0.5 text-[11px] leading-snug text-pulse-text-muted">
          Desktop editors open via their URL handler and only work when PulseUI runs on this
          computer.
        </p>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-pulse-text-muted">
          Mode
        </DropdownMenuLabel>
        <Item checked={mode === "build"} onSelect={() => onMode("build")}>
          Build — edit files, build and preview
        </Item>
        <Item checked={mode === "plan"} onSelect={() => onMode("plan")}>
          Plan — investigate and propose only
        </Item>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-pulse-text-muted">
          Model
        </DropdownMenuLabel>
        {options.length ? (
          options.map((option) => (
            <Item
              key={option.id}
              checked={option.id === modelId}
              onSelect={() => {
                storeModel(option.id);
                onModel(option.id, option);
              }}
            >
              <span className="truncate">{option.model}</span>
              <span className="ml-auto text-[10px] text-pulse-text-muted">
                {option.providerLabel}
              </span>
            </Item>
          ))
        ) : (
          <DropdownMenuItem asChild className="gap-2 text-[13px] text-pulse-warning">
            <Link to="/connections">
              <Settings2 className="h-3.5 w-3.5" /> Configure AI
            </Link>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
