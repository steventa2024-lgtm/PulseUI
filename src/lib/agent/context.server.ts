/**
 * Selective context for a run. Instead of sending the repository, Pulse gets
 * project metadata, the file tree, package.json, a few entry files, recent
 * conversation and recent changes — and pulls anything else through tools.
 */
import type { Attachment, ChatMessage, Version } from "../domain/types";
import type { ProjectRecord } from "../persistence/repositories.server";
import type { FrameworkInfo } from "../workspace/framework-detect.server";
import type { Workspace } from "../workspace/workspace-manager.server";

const ENTRY_CANDIDATES = [
  "src/App.tsx",
  "src/App.jsx",
  "src/main.tsx",
  "app/page.tsx",
  "src/pages/index.astro",
  "index.html",
];
const MAX_TREE_FILES = 250;
const MAX_ENTRY_BYTES = 9000;

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}\n… [truncated]` : text;
}

export type ContextInput = {
  project: ProjectRecord;
  info: FrameworkInfo;
  workspace: Workspace;
  history: ChatMessage[];
  latestVersion: Version | null;
  request: string;
  mode: "plan" | "build";
  attachments: Attachment[];
  visionSupported: boolean;
};

export function buildRunContext(input: ContextInput): { text: string; seen: string[] } {
  const { project, info, workspace } = input;
  const files = workspace.listFiles();
  const seen: string[] = [];
  const sections: string[] = [];

  sections.push(
    [
      "## Project",
      `Name: ${project.name}`,
      project.description ? `Description: ${project.description}` : "",
      `Stack: ${info.label} (package manager: ${info.packageManager})`,
      `Build: ${info.buildCommand?.join(" ") ?? "none"} · Typecheck: ${info.typecheckCommand?.join(" ") ?? "none"}`,
      `MODE: ${input.mode.toUpperCase()}`,
    ]
      .filter(Boolean)
      .join("\n"),
  );

  sections.push(
    `## Files (${files.length}${files.length > MAX_TREE_FILES ? `, first ${MAX_TREE_FILES}` : ""})\n${files
      .slice(0, MAX_TREE_FILES)
      .join("\n")}`,
  );

  const included = new Set<string>();
  const addFile = (path: string) => {
    if (included.has(path) || !files.includes(path)) return;
    try {
      const content = workspace.readFile(path, 256 * 1024);
      sections.push(`## ${path}\n${truncate(content, MAX_ENTRY_BYTES)}`);
      included.add(path);
      if (content.length <= MAX_ENTRY_BYTES) seen.push(path);
    } catch {
      // Unreadable (binary/too large) — the agent can still ask.
    }
  };

  addFile("package.json");
  const entry = ENTRY_CANDIDATES.find((candidate) => files.includes(candidate));
  if (entry) addFile(entry);
  // Design tokens and the home page shape almost every UI request.
  for (const path of ["src/index.css", "src/pages/Index.tsx"]) addFile(path);

  const kit = uiKit(workspace, files);
  if (kit) sections.push(kit);

  // Files touched by the most recent version are the likeliest follow-up targets.
  const recent = input.latestVersion
    ? [...input.latestVersion.changedFiles.changed, ...input.latestVersion.changedFiles.added]
    : [];
  if (recent.length) {
    sections.push(`## Recently changed files\n${recent.slice(0, 30).join("\n")}`);
  }

  const conversation = input.history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-8)
    .map(
      (message) =>
        `${message.role === "user" ? "User" : "Pulse"}: ${truncate(message.content, 1200)}`,
    );
  if (conversation.length) sections.push(`## Recent conversation\n${conversation.join("\n\n")}`);

  const textAttachments = input.attachments.filter(
    (attachment) => attachment.kind === "text" && attachment.data,
  );
  const images = input.attachments.filter((attachment) => attachment.kind === "image");
  if (textAttachments.length) {
    sections.push(
      `## Attachments\n${textAttachments
        .map(
          (attachment) => `=== ${attachment.name} ===\n${truncate(attachment.data ?? "", 20_000)}`,
        )
        .join("\n\n")}`,
    );
  }
  if (images.length) {
    sections.push(
      input.visionSupported
        ? `## Images\nThe user attached ${images.length} image(s): ${images.map((image) => image.name).join(", ")}. They are included with this message.`
        : `## Images\nThe user attached ${images.length} image(s), but the selected model cannot view images. Tell the user and work from the text.`,
    );
  }

  sections.push(`## Request\n${input.request}`);
  return { text: sections.join("\n\n"), seen };
}

/**
 * The project's shadcn/ui components and what each exports, so the model can
 * import them correctly without reading every file first.
 */
function uiKit(workspace: Workspace, files: string[]): string | null {
  const components = files.filter((file) => /^src\/components\/ui\/[\w-]+\.tsx$/.test(file));
  if (!components.length) return null;
  const lines = components.map((file) => {
    let names: string[] = [];
    try {
      const source = workspace.readFile(file, 64 * 1024);
      for (const match of source.matchAll(/export\s*\{([^}]+)\}/g)) {
        names.push(
          ...(match[1] ?? "")
            .split(",")
            .map((name) => name.trim().replace(/^type\s+/, ""))
            .filter(Boolean),
        );
      }
    } catch {
      names = [];
    }
    const id = file.slice("src/components/ui/".length, -".tsx".length);
    return `@/components/ui/${id}: ${names.join(", ")}`;
  });
  return `## UI kit (shadcn/ui, already installed; import, don't recreate)\n${lines.join("\n")}`;
}

/** Pull "src/foo.tsx:12" style references out of compiler output. */
export function filesFromErrors(output: string, files: string[]): string[] {
  const found = new Set<string>();
  const known = new Set(files);
  const pattern = /([\w@./-]+\.(?:tsx?|jsx?|css|json|mjs|cjs|astro|html|vue|svelte))(?=[:(\s]|$)/g;
  for (const match of output.matchAll(pattern)) {
    let candidate = (match[1] ?? "").replace(/^\.\//, "");
    if (!known.has(candidate)) {
      const suffixHit = files.find(
        (file) => candidate.endsWith(`/${file}`) || candidate.endsWith(file),
      );
      if (!suffixHit) continue;
      candidate = suffixHit;
    }
    if (!candidate.includes("node_modules")) found.add(candidate);
    if (found.size >= 5) break;
  }
  return [...found];
}
