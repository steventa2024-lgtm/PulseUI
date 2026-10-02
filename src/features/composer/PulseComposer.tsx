import {
  ArrowUp,
  FileText,
  Github,
  ImagePlus,
  Loader2,
  Paperclip,
  Plus,
  Square,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
  type KeyboardEvent,
} from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ATTACHMENT_LIMITS,
  type AgentMode,
  type Attachment,
  type ModelOption,
} from "@/lib/domain/types";
import { useModels } from "@/lib/client/queries";
import { formatBytes } from "@/lib/format";
import { cn } from "@/lib/utils";
import { toPayload, useAttachments } from "./attachments";
import { GitHubImportDialog } from "./GitHubImportDialog";
import { ModelSelector } from "./ModelSelector";

export type ComposerSubmit = {
  prompt: string;
  mode: AgentMode;
  modelId: string | null;
  attachments: Attachment[];
};

const GITHUB_REPO = /https:\/\/github\.com\/[\w.-]+\/[\w.-]+/;
const ACCEPT = [...ATTACHMENT_LIMITS.imageTypes, ...ATTACHMENT_LIMITS.textExtensions].join(",");

type Props = {
  variant?: "hero" | "compact";
  placeholder?: string;
  busy?: boolean;
  /** Shown instead of the send button while Pulse is working. */
  onStop?: () => void;
  onSubmit: (input: ComposerSubmit) => Promise<boolean | void> | boolean | void;
  initialPrompt?: string;
  disabledReason?: string | null;
  allowGitHubImport?: boolean;
  autoFocus?: boolean;
};

export function PulseComposer({
  variant = "hero",
  placeholder = "Ask Pulse to build your app...",
  busy = false,
  onStop,
  onSubmit,
  initialPrompt = "",
  disabledReason = null,
  allowGitHubImport = true,
  autoFocus = false,
}: Props) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [mode, setMode] = useState<AgentMode>("build");
  const [model, setModel] = useState<{ id: string; option: ModelOption } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [githubOpen, setGithubOpen] = useState(false);
  const attachments = useAttachments();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const hero = variant === "hero";
  const models = useModels();
  // Never let a prompt go nowhere: with no provider, say so instead of creating a dead run.
  const blockedReason =
    disabledReason ??
    (models.data && !models.data.configured
      ? "Connect an AI provider (Connections page) to start building. Templates still work without one."
      : null);

  useEffect(() => {
    if (initialPrompt) setPrompt(initialPrompt);
  }, [initialPrompt]);

  // Auto-grow the textarea up to a cap.
  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, hero ? 280 : 220)}px`;
  }, [prompt, hero]);

  const onModelChange = useCallback(
    (id: string, option: ModelOption) => setModel({ id, option }),
    [],
  );

  const githubUrl = GITHUB_REPO.exec(prompt)?.[0] ?? null;
  const images = attachments.items.filter((item) => item.kind === "image");
  const visionWarning = images.length > 0 && model && !model.option.supportsVision;
  const canSubmit = prompt.trim().length >= 2 && !busy && !blockedReason;

  const submit = async () => {
    if (!canSubmit) return;
    const result = await onSubmit({
      prompt: prompt.trim(),
      mode,
      modelId: model?.id ?? null,
      attachments: toPayload(attachments.items),
    });
    if (result !== false) {
      setPrompt("");
      attachments.clear();
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void submit();
    }
  };

  const onPaste = (event: ClipboardEvent<HTMLTextAreaElement>) => {
    const files = Array.from(event.clipboardData.files);
    if (files.length) {
      event.preventDefault();
      void attachments.add(files);
    }
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length) void attachments.add(event.dataTransfer.files);
  };

  return (
    <div className="w-full">
      <div
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        data-active={dragging || undefined}
        className={cn(
          "pulse-border-glow relative rounded-[var(--pulse-radius-xl)] transition-shadow duration-[var(--pulse-duration-panel)]",
          hero
            ? "bg-[color-mix(in_oklab,var(--pulse-surface)_82%,transparent)] shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_60px_-20px_rgb(36_124_255/0.35)] backdrop-blur-xl focus-within:shadow-[0_30px_80px_-30px_rgb(0_0_0/0.9),0_0_70px_-16px_rgb(0_207_255/0.45)]"
            : "bg-pulse-surface-raised",
        )}
      >
        {dragging && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-[inherit] bg-pulse-bg/80 text-sm text-pulse-cyan">
            Drop images or source files to attach
          </div>
        )}

        {attachments.items.length > 0 && (
          <ul
            className={cn("flex flex-wrap gap-2", hero ? "px-5 pt-4" : "px-3 pt-3")}
            aria-label="Attachments"
          >
            {attachments.items.map((item) => (
              <li
                key={item.id}
                className="flex items-center gap-2 rounded-[var(--pulse-radius-md)] border border-pulse-border-strong bg-pulse-surface-overlay py-1 pl-1 pr-2 text-xs text-pulse-text-secondary"
              >
                {item.previewUrl ? (
                  <img src={item.previewUrl} alt="" className="h-7 w-7 rounded object-cover" />
                ) : (
                  <span className="flex h-7 w-7 items-center justify-center rounded bg-pulse-surface-hover">
                    <FileText className="h-3.5 w-3.5" />
                  </span>
                )}
                <span className="max-w-[140px] truncate">{item.name}</span>
                <span className="text-pulse-text-muted">{formatBytes(item.size)}</span>
                <button
                  type="button"
                  onClick={() => attachments.remove(item.id)}
                  className="rounded p-0.5 text-pulse-text-muted hover:bg-pulse-surface-hover hover:text-pulse-text"
                  aria-label={`Remove ${item.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <label htmlFor={`composer-${variant}`} className="sr-only">
          Message Pulse
        </label>
        <textarea
          id={`composer-${variant}`}
          ref={textareaRef}
          value={prompt}
          autoFocus={autoFocus}
          onChange={(event) => setPrompt(event.target.value)}
          onKeyDown={onKeyDown}
          onPaste={onPaste}
          placeholder={placeholder}
          rows={hero ? 3 : 2}
          maxLength={50_000}
          className={cn(
            "block w-full resize-none bg-transparent text-pulse-text placeholder:text-pulse-text-muted focus:outline-none",
            hero
              ? "min-h-[96px] px-5 pt-5 text-[15px] leading-relaxed sm:text-base"
              : "min-h-[56px] px-3.5 pt-3 text-sm",
          )}
        />

        {githubUrl && allowGitHubImport && (
          <div className={cn("flex items-center gap-2 text-xs", hero ? "px-5" : "px-3.5")}>
            <button
              type="button"
              onClick={() => setGithubOpen(true)}
              className="pulse-interactive flex items-center gap-1.5 rounded-full border border-pulse-cyan/30 bg-pulse-cyan/10 px-2.5 py-1 text-pulse-cyan hover:bg-pulse-cyan/15"
            >
              <Github className="h-3.5 w-3.5" /> Import{" "}
              {githubUrl.replace("https://github.com/", "")} as a project
            </button>
          </div>
        )}

        <div
          className={cn(
            "flex items-center gap-1",
            hero ? "px-3 pb-3 pt-2 sm:px-4" : "px-2 pb-2 pt-1",
          )}
        >
          <DropdownMenu>
            <DropdownMenuTrigger
              className="pulse-interactive flex h-8 items-center gap-1.5 rounded-[var(--pulse-radius-sm)] px-2.5 text-xs text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text"
              aria-label="Add context"
            >
              <Plus className="h-3.5 w-3.5" />
              {hero && <span className="hidden sm:inline">Add Context</span>}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="w-56 border-pulse-border-strong bg-pulse-surface-raised"
            >
              <DropdownMenuItem
                onSelect={() => imageRef.current?.click()}
                className="gap-2 text-xs"
              >
                <ImagePlus className="h-3.5 w-3.5" /> Screenshot or image
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => fileRef.current?.click()} className="gap-2 text-xs">
                <FileText className="h-3.5 w-3.5" /> Source, text or JSON file
              </DropdownMenuItem>
              {allowGitHubImport && (
                <DropdownMenuItem onSelect={() => setGithubOpen(true)} className="gap-2 text-xs">
                  <Github className="h-3.5 w-3.5" /> Import from GitHub
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="pulse-interactive flex h-8 items-center gap-1.5 rounded-[var(--pulse-radius-sm)] px-2.5 text-xs text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text"
                aria-label="Attach files"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {hero && <span className="hidden sm:inline">Attach</span>}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              Images, screenshots, text, Markdown, JSON or source files
            </TooltipContent>
          </Tooltip>

          {allowGitHubImport && hero && (
            <button
              type="button"
              onClick={() => setGithubOpen(true)}
              className="pulse-interactive hidden h-8 items-center gap-1.5 rounded-[var(--pulse-radius-sm)] px-2.5 text-xs text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text sm:flex"
            >
              <Github className="h-3.5 w-3.5" /> GitHub
            </button>
          )}

          <div className="ml-auto flex items-center gap-1">
            <div
              role="radiogroup"
              aria-label="Mode"
              className="flex h-8 items-center rounded-[var(--pulse-radius-sm)] border border-pulse-border bg-pulse-bg-deep/50 p-0.5 text-xs"
            >
              {(["plan", "build"] as const).map((option) => (
                <Tooltip key={option}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="radio"
                      aria-checked={mode === option}
                      onClick={() => setMode(option)}
                      className={cn(
                        "pulse-interactive h-full rounded-[5px] px-2.5 capitalize",
                        mode === option
                          ? option === "build"
                            ? "bg-pulse-cyan/15 text-pulse-cyan"
                            : "bg-pulse-magenta/15 text-[color-mix(in_oklab,var(--pulse-magenta)_65%,white)]"
                          : "text-pulse-text-muted hover:text-pulse-text",
                      )}
                    >
                      {option}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {option === "plan"
                      ? "Plan: Pulse investigates and proposes, without changing files"
                      : "Build: Pulse edits files, builds and previews"}
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
            <ModelSelector
              value={model?.id ?? null}
              onChange={onModelChange}
              className="hidden sm:flex"
            />
            {busy && onStop ? (
              <button
                type="button"
                onClick={onStop}
                className="pulse-interactive ml-1 flex h-9 w-9 items-center justify-center rounded-full border border-pulse-danger/40 bg-pulse-danger/15 text-pulse-danger hover:bg-pulse-danger/25"
                aria-label="Stop Pulse"
              >
                <Square className="h-3.5 w-3.5 fill-current" />
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => void submit()}
                    disabled={!canSubmit}
                    className={cn(
                      "pulse-interactive ml-1 flex h-9 w-9 items-center justify-center rounded-full text-primary-foreground disabled:cursor-not-allowed disabled:opacity-35",
                      "bg-[image:var(--pulse-gradient-accent)] shadow-glow-blue hover:brightness-110",
                    )}
                    aria-label={mode === "plan" ? "Send to Pulse (plan)" : "Build with Pulse"}
                  >
                    {busy ? (
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                    ) : (
                      <ArrowUp className="h-4 w-4 text-white" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {blockedReason ?? (
                    <span>
                      Send <kbd className="font-mono">⌘/Ctrl ↵</kbd> · newline{" "}
                      <kbd className="font-mono">⇧↵</kbd>
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          multiple
          accept={ACCEPT}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void attachments.add(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          ref={imageRef}
          type="file"
          multiple
          accept={ATTACHMENT_LIMITS.imageTypes.join(",")}
          className="hidden"
          onChange={(event) => {
            if (event.target.files) void attachments.add(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      <div
        className={cn(
          "mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs",
          hero ? "px-2" : "px-1",
        )}
      >
        <ModelSelector value={model?.id ?? null} onChange={onModelChange} className="sm:hidden" />
        {visionWarning && (
          <span className="flex items-center gap-1.5 text-pulse-warning">
            <TriangleAlert className="h-3.5 w-3.5" /> {model?.option.model} cannot see images —
            choose a vision model or the images will not be sent.
          </span>
        )}
        {attachments.errors.map((error) => (
          <span key={error} className="flex items-center gap-1.5 text-pulse-danger">
            <TriangleAlert className="h-3.5 w-3.5" /> {error}
          </span>
        ))}
        {blockedReason && <span className="text-pulse-text-muted">{blockedReason}</span>}
      </div>

      <GitHubImportDialog
        open={githubOpen}
        onOpenChange={setGithubOpen}
        initialUrl={githubUrl ?? ""}
      />
    </div>
  );
}
