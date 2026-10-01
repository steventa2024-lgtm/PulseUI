# PulseUI

**Build. Iterate. Deploy.**

PulseUI is an AI application development environment. You describe an app in
plain language and Pulse — PulseUI's software-engineering agent — turns it into
a real codebase on disk: it plans, writes and edits files, installs
dependencies, type-checks and builds the project, repairs its own build errors,
and boots the app in a live preview. You can then keep talking to Pulse, open
the code in a multi-file editor, roll back to any checkpoint, import an
existing repository from GitHub, and publish a production build.

Everything is real: the activity feed shows server-side tool calls as they
happen, previews are the project's own dev server, versions are actual file
snapshots, and nothing reports success unless the underlying command succeeded.

---

## Contents

- [Quick start](#quick-start)
- [AI providers](#ai-providers)
- [How it works](#how-it-works)
- [Project structure](#project-structure)
- [Security model](#security-model)
- [Development commands](#development-commands)
- [Current limitations](#current-limitations)

---

## Quick start

PulseUI uses **Bun** for its own dependencies (`bun.lock` is the only
lockfile) and runs on **Node.js 22.13+** or Bun. It also needs `git` on the
`PATH`.

```bash
bun install
cp .env.example .env.local     # then configure at least one AI provider
bun run dev                    # http://localhost:3000
```

Bun loads `.env.local` automatically. Running Vite through Node instead? Use
`node --env-file=.env.local ./node_modules/vite/bin/vite.js dev`.

Try it without any model at all: `AI_PROVIDER=mock bun run dev` starts PulseUI
with the deterministic test provider. It drives the real agent pipeline
(files, install, build, preview, history) with canned edits — useful for
exploring the UI and for CI, not for building real apps.

### Production

```bash
bun run build
bun run start      # vite preview serving the built SSR app
```

### Storage

All runtime data lives in `PULSEUI_DATA_DIR` (default `~/.pulseui`):

| Path                       | Contents                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| `pulseui.db`               | SQLite: projects, conversations, runs, events, tool calls, versions, deployments |
| `workspaces/<projectId>/`  | Each project's source tree (a normal git repository)                             |
| `history/<projectId>.git`  | Version checkpoints (a private "shadow" git repo)                                |
| `deployments/<projectId>/` | Published static builds                                                          |

SQLite comes from the runtime (`node:sqlite` on Node 22, `bun:sqlite` on Bun),
so there is no native module to compile and no database server to run.

---

## AI providers

Configure one or more in `.env.local` (see `.env.example` for every option).
Keys stay on the server; the browser only ever sees provider and model names.

| Provider          | Configuration                                                                 |
| ----------------- | ----------------------------------------------------------------------------- |
| Google Gemini     | `GEMINI_API_KEY` (or `GOOGLE_API_KEY`), optional `GEMINI_MODEL`               |
| OpenAI-compatible | `AI_BASE_URL` + `AI_MODEL` (+ `AI_API_KEY`)                                   |
| OpenRouter        | `OPENROUTER_API_KEY` + `OPENROUTER_MODEL`                                     |
| Ollama            | auto-detected on `127.0.0.1:11434`, or `LOCAL_AI_BASE_URL` / `LOCAL_AI_MODEL` |
| LM Studio         | auto-detected on `127.0.0.1:1234`, or `LOCAL_AI_BASE_URL` / `LOCAL_AI_MODEL`  |
| Mock (tests only) | `AI_PROVIDER=mock`                                                            |

`AI_PROVIDER` chooses the default when several are available. The composer's
model selector lists exactly the models PulseUI can reach; with nothing
configured it shows **Configure AI** instead.

### Local models with Ollama

```bash
ollama pull qwen2.5-coder:7b
echo "LOCAL_AI_MODEL=qwen2.5-coder:7b" >> .env.local
```

Agent runs send a system prompt, the file tree and a few source files, so give
the model room: start Ollama with a larger context, e.g.
`OLLAMA_CONTEXT_LENGTH=16384 ollama serve`. Code-tuned models of roughly 7B
parameters and up follow Pulse's action protocol reliably; smaller general
models often do not. When a hosted provider fails before it starts streaming,
PulseUI falls back to the configured local model automatically.

---

## How it works

```
prompt ─▶ project + workspace ─▶ Pulse agent ⇄ tools ─▶ install ─▶ typecheck ─▶ build
                                                                      │ fail
                                                    bounded repair ◀──┘
                                       ─▶ preview (real dev server) ─▶ version checkpoint
```

### Projects and workspaces

A new project starts from a known-good starter (`starters/base`: React 19,
TypeScript, Vite, Tailwind CSS v4, lucide-react) rather than asking the model
to invent `package.json`. Templates in the gallery are full starter projects
in `starters/templates/<id>` layered on top of the base; their card images in
`public/templates` are screenshots of those starters actually running
(`bun run templates:screenshots`).

Imported GitHub repositories are cloned (`--depth 1`), then framework
detection reads `package.json`, scripts, dependencies, config files and
lockfiles to decide the package manager and how to install, run and build
(React/Vite, Vite, Next.js, Astro, plain HTML and generic Node apps).

### The Pulse agent

`src/lib/agent/` contains the runtime. Each request becomes an **agent run**
with a persisted event stream. The model replies in prose plus a small tag
protocol:

```
<plan>…</plan>
<action name="read_file">{"path":"src/App.tsx"}</action>
<write path="src/components/Sidebar.tsx">…whole file…</write>
<patch path="src/App.tsx">
<<<<<<< SEARCH
exact existing lines
=======
replacement
>>>>>>> REPLACE
</patch>
<done>summary</done>
```

Tags keep file bodies as raw text, which small local models handle far more
reliably than JSON-escaped tool arguments. Every action runs through the
**tool registry** (`tools.server.ts`): typed zod input, an access level
(Plan mode only gets read tools), workspace scoping, structured output,
duration and status, all recorded in `tool_calls`.

Tools: `list_files`, `read_file`, `read_files`, `search_files`, `write_file`,
`replace_file`, `patch_file`, `create_directory`, `delete_file`,
`rename_file`, `install_dependencies`, `run_command`, `run_typecheck`,
`run_lint`, `run_tests`, `run_build`, `start_preview`, `restart_preview`,
`stop_preview`, `read_preview_logs`, `git_status`, `git_diff`, `git_log`.

Key behaviours:

- **Selective context.** Pulse gets project metadata, the file tree,
  `package.json`, the entry file, recent conversation and recently changed
  files — not the whole repository — and pulls more through tools.
- **Respecting manual edits.** Before a Build run, any manual edits are saved
  as their own version. Editing an existing file is refused unless Pulse read
  it during the run, and patches are preferred over full rewrites.
- **Validation and repair.** After Pulse finishes, PulseUI runs install (when
  dependencies changed), typecheck, build and lint. Real failures are sent back
  with the referenced files for up to `autoRepairAttempts` (default 3)
  repair rounds. A run whose build still fails is reported as failed.
- **Plan vs Build.** Plan mode can only read; Build mode can edit and run.
- **Concurrency.** One mutating run per project; other projects run in
  parallel. **Stop** aborts the model stream, any running command and preview
  start.
- **Streaming.** Events (`agent.delta`, `tool.started`, `tool.completed`,
  `file.updated`, `build.output`, `preview.ready`, `version.created`, …) are
  persisted and streamed over SSE (`/api/runs/:runId/events`), so a reloaded
  browser replays the run exactly.

### Preview

`PreviewManager` starts the project's real dev server (e.g. `vite --port N`)
as a child process in its own process group, allocates a port from
`PREVIEW_PORT_START`–`PREVIEW_PORT_END`, waits until it answers HTTP, keeps a
log buffer (streamed at `/api/projects/:projectId/preview-logs`) and kills
the whole process tree on stop or shutdown. The builder embeds it in a
sandboxed iframe with desktop / tablet (768px) / mobile (390px) frames. Vite
HMR means edits — Pulse's or yours — show up without a reload.

### Versions

Every Pulse change is a checkpoint in a per-project shadow git repository
outside the workspace, so the project's own git history stays yours. History
shows each version's real diff (or a diff against the current files) and
**Restore** rewrites the workspace to that snapshot — after first
checkpointing the current state, so restores are undoable.

### Git

Workspaces are ordinary git repositories. The History → Git tab shows branch,
status, the working-tree diff and recent commits, and can commit locally.

### Deployment

Deployments go through a `DeploymentProvider` interface
(`src/lib/deployment/`). The provider shipped today is **local static
hosting**: PulseUI runs the production build and serves the static output at
`/sites/<deploymentId>/` from the PulseUI server itself, with logs and
QUEUED → BUILDING → READY / FAILED / CANCELLED status. Hosted providers are
not implemented yet; the UI says so instead of pretending.

---

## Project structure

```
src/
├── routes/                     TanStack file routes
│   ├── __root.tsx              HTML shell, providers, error/404 boundaries
│   ├── _app.tsx                Sidebar layout (home, projects, templates, …)
│   ├── _app/*.tsx              /, /projects, /templates, /search, /connections, /settings
│   ├── projects.$projectId*.tsx   Builder layout + Build/Code/Preview/Data/History/Deploy/Settings
│   ├── api/                    SSE endpoints (run events, preview logs)
│   └── sites.$deploymentId.$.ts   Local static deployments
├── features/                   UI by domain
│   ├── shell/                  Sidebar, app shell, command palette (⌘K)
│   ├── home/                   Cyber Grid hero
│   ├── composer/               Pulse composer, attachments, model selector, GitHub import
│   ├── templates/  projects/  connections/
│   └── builder/                Agent panel, preview, editor, history/diff, deploy, data, settings
├── components/
│   ├── ui/                     Radix/shadcn primitives restyled for PulseUI
│   └── shared/                 Logo, empty states, page header, status dot
├── lib/
│   ├── ai/                     AIProvider interface, Gemini / OpenAI-compatible / mock, registry
│   ├── agent/                  Runtime, protocol parser, tools, context, prompt, event bus
│   ├── workspace/              WorkspaceManager, path security, framework detection, project commands
│   ├── commands/               Command policy (pure) and CommandRunner
│   ├── preview/                PreviewManager
│   ├── versions/               Checkpoints (shadow git), diff parser
│   ├── git/                    Git plumbing and workspace git
│   ├── persistence/            SQLite connection, migrations, repositories
│   ├── projects/  deployment/  connections/  templates/
│   ├── server-fns/             The server functions the browser calls (zod-validated)
│   ├── client/                 React Query hooks, SSE run-event reducer
│   └── domain/types.ts         Shared domain model
├── styles.css                  Design tokens (--pulse-*) and utilities
starters/                       Base starter + template starter projects
scripts/                        Template screenshot capture, static file server
tests/unit/                     Vitest unit tests
tests/e2e/                      Mock-provider end-to-end agent flow
```

Files ending in `.server.ts` hold privileged code and are only imported by
`*.functions.ts` server functions or server routes, never by components.

---

## Security model

Generated projects are treated as untrusted code.

- **Workspace boundaries.** Every path from the agent or the editor is
  normalized and checked lexically _and_ via `realpath`, rejecting `..`,
  absolute paths, NUL bytes and symlinks that escape. `.env*`, keys and
  `.git` internals cannot be read or written by tools.
- **No shell.** Commands are parsed into argv and spawned without a shell, so
  pipes, redirects, substitution and chaining are not expressible. Executables
  are allow-listed (`bun`, `npm`, `pnpm`, `yarn`, `npx`, `node`, `git`, `tsc`,
  `vite`, …), global installs, publishing, registry config, `git -c`, `node
-e` and arguments pointing outside the workspace are refused.
- **Scrubbed environment.** Child processes get an allow-list of variables
  (PATH, HOME, locale, proxy settings). AI keys, `GITHUB_TOKEN` and every other
  PulseUI secret are never passed to installs, builds or dev servers.
- **Limits.** Commands have timeouts and output caps, run in their own process
  group, and are killed as a tree on timeout, cancel or shutdown. File writes
  and reads are size-limited; attachments are validated for type, size and
  count.
- **Preview isolation.** Each preview runs in a separate process on its own
  port, i.e. a different browser origin from PulseUI, inside a sandboxed
  iframe. Published sites are served with a CSP sandbox.
- **Secrets.** Provider configuration is read server-side only; logs redact
  anything that looks like a credential.

This is **process isolation, not a container sandbox.** Generated code (and
its dependencies' install scripts) runs as the same OS user as PulseUI. For
anything beyond local, single-user use, run PulseUI inside a container or VM
— or put each workspace's commands in their own container with CPU/memory
limits and a network policy. The `CommandRunner`/`PreviewManager` split is the
seam where a Docker runner would plug in.

There is no authentication: PulseUI is designed as a local or single-tenant
tool. Do not expose it to untrusted networks.

---

## Development commands

| Command                         | What it does                                                          |
| ------------------------------- | --------------------------------------------------------------------- |
| `bun run dev`                   | Dev server on :3000                                                   |
| `bun run build`                 | Production build                                                      |
| `bun run start`                 | Serve the production build                                            |
| `bun run typecheck`             | `tsc --noEmit`                                                        |
| `bun run lint`                  | ESLint + Prettier check                                               |
| `bun run format`                | Prettier write                                                        |
| `bun run test`                  | Unit tests (Vitest)                                                   |
| `bun run test:e2e`              | Mock-provider end-to-end agent flow (needs npm registry access)       |
| `bun run check`                 | typecheck + lint + test + build                                       |
| `bun run templates:screenshots` | Re-capture template card images (needs Chromium; set `CHROMIUM_PATH`) |

The E2E suite creates a project from a prompt, lets the mock provider drive
real tool calls, installs dependencies, runs `tsc` and `vite build`, repairs a
deliberately broken build, waits for the preview dev server to serve the app,
applies a follow-up as a targeted patch, checks Plan mode cannot write,
restores an earlier version, and boots a template project — no paid model.

---

## Current limitations

- **Isolation** is per-process, not per-container (see Security model).
- **Deployment** supports local static hosting only; Vercel/Netlify/Cloudflare
  providers are not implemented. Server-rendered frameworks (e.g. Next.js
  without static export) cannot be published by the local provider.
- **Previews** are reached on their own port (`PREVIEW_PUBLIC_HOST:port`). If
  PulseUI runs on a remote host, those ports must be reachable from your
  browser; there is no reverse proxy yet.
- **Data tab** does not provision databases; generated apps are front-end
  projects and never receive server credentials.
- **Git**: status, diff, log and local commits work; push, branches and pull
  requests are not wired up.
- **Native tool calling** is not used yet: all providers go through the tag
  protocol (capability flags exist on providers for a future switch).
- **Vision** support for OpenAI-compatible models is inferred from the model
  name; if images are attached for a model without vision, PulseUI warns and
  does not send them.
- **No authentication** or multi-user support.
- One conversation per project.
