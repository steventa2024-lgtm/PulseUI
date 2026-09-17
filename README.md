# PromptUI Studio

An AI-powered component and Tailwind CSS code generator. Describe a UI block in
natural language, and the studio returns production-ready React + Tailwind JSX
with a live interactive preview beside the code.

Built with [Lovable](https://lovable.dev) on TanStack Start.

---

## Stack

| Layer     | Choice                                                       |
| --------- | ------------------------------------------------------------ |
| Framework | TanStack Start (Vite, file-based routing, SSR)               |
| UI        | React 19, Tailwind CSS v4, shadcn/ui, Lucide icons           |
| Server    | TanStack server functions (the equivalent of server actions) |
| AI        | Gemini 3.7 Flash, with a local Ollama model as fallback      |
| Data      | Supabase (provisioned, not yet used by the studio)           |

---

## Project structure

```
src/
├── components/
│   ├── studio/
│   │   ├── CodeView.tsx        Syntax-highlighted code pane, copy + .jsx download
│   │   └── PreviewFrame.tsx    Sandboxed iframe that compiles and renders the output
│   └── ui/                     shadcn/ui primitives
├── integrations/
│   └── supabase/               Client, auth middleware, generated types
├── lib/
│   ├── component-generation.server.ts     System prompt, sanitizer, providers
│   ├── component-generation.functions.ts  Server functions the client calls
│   ├── presets.ts              Quick-action UI blocks and style modifiers
│   └── utils.ts                cn() helper
├── routes/
│   ├── __root.tsx              HTML shell, providers, error + 404 boundaries
│   └── index.tsx               The split-screen studio
├── router.tsx                  Router + React Query wiring
├── server.ts                   SSR entry with an error wrapper
├── start.ts                    Server middleware (CSRF, Supabase auth, errors)
└── styles.css                  Dark-first design tokens
```

**The `.server.ts` / `.functions.ts` split matters.** Anything holding an API
key lives in `component-generation.server.ts` and is never imported by a
component. `component-generation.functions.ts` wraps it in server functions,
which are the only thing the client touches.

---

## Local development

This project uses **Bun** (see `bun.lock` / `bunfig.toml`). Bun also loads
`.env` and `.env.local` into `process.env` automatically, which the AI provider
lookup depends on.

```bash
bun install
```

Add your Gemini key to **`.env.local`** — not `.env`, which is committed to
this repository and syncs back to Lovable. Create one at
[aistudio.google.com/apikey](https://aistudio.google.com/apikey):

```bash
echo "GEMINI_API_KEY=..." >> .env.local
```

Then start the dev server:

```bash
bun run dev
```

The studio is at `http://localhost:3000`. The header badge shows the model
actually in use. If it reads "not configured", the server found none of
`GEMINI_API_KEY`, `LOVABLE_API_KEY` or `ANTHROPIC_API_KEY`.

<details>
<summary>Using npm/Node instead of Bun</summary>

Node does not read `.env` files on its own, so pass one explicitly:

```bash
npm install
node --env-file=.env.local ./node_modules/vite/bin/vite.js dev
```

Bun is the supported path; this is a convenience fallback.

</details>

### Other commands

```bash
bun run build     # production build
bun run lint      # eslint
bun run format    # prettier
```

---

## How generation works

1. **`src/routes/index.tsx`** collects the prompt plus any active style
   modifiers and calls the `streamComponent` server function.
2. **`resolveProvider()`** takes the first key present in this order:
   `GEMINI_API_KEY` (direct Google AI Studio) → `LOVABLE_API_KEY` (same Gemini
   model via the gateway) → `ANTHROPIC_API_KEY` → `LOCAL_AI_MODEL` (a local
   Ollama / LM Studio model). No key ever reaches the browser.
3. The **system prompt** forces a single `function GeneratedComponent()`
   declaration styled only with Tailwind utilities — no markdown, no imports,
   no external libraries.
4. The provider **streams**. `streamWithGemini()` reads Gemini's SSE response
   and re-emits it as NDJSON `StreamFrame` lines — `delta` per token batch,
   then a single `done`. The server function hands that back as a `RawStream`,
   which the RPC layer multiplexes and the client receives as a plain
   `ReadableStream`.
5. **`sanitizeComponentCode()`** strips code fences, `import`/`export`
   statements, `use client` directives, `<script>` blocks, `dangerouslySetInnerHTML`,
   storage and network access, then normalises arrow-function components to the
   expected name. This runs once on the complete output and ships in the `done`
   frame — `delta` text is raw, and is only ever used for progressive display.
6. **`PreviewFrame`** embeds the result as a JS string literal, compiles it with
   Babel standalone inside a `sandbox="allow-scripts"` iframe, and renders it
   behind an error boundary. Compile errors, load errors and render crashes each
   surface as readable text instead of a blank pane.

### Streaming

The code pane fills in live while the component generates; the preview only
swaps once a generation completes, because partial JSX cannot compile. The
studio switches to the Code tab on submit and back to Live Preview on success,
and copy/download stay disabled until the component is whole so you can never
walk away with half a file.

Providers that cannot stream (`generateWithGateway`, `generateWithAnthropic`)
go through `streamFromRun()`, which delivers the finished component as a single
delta. They keep working; they just do not fill in progressively. Gemini and the
local provider both stream for real.

## Local model fallback

Set `LOCAL_AI_MODEL` and the studio gains a safety net. When the hosted provider
fails _before the first byte_ — quota, rate limit, an outage — the server
function transparently retries against the local model and streams that instead.
Nothing has reached the browser at that point, so the switch is invisible apart
from the model name on the finished component.

```bash
ollama pull qwen2.5-coder:7b
echo "LOCAL_AI_MODEL=qwen2.5-coder:7b" >> .env.local
```

`LOCAL_AI_BASE_URL` points at any OpenAI-compatible server and defaults to
Ollama's `http://localhost:11434/v1`; LM Studio is `http://localhost:1234/v1`.

**Model choice matters more than it looks.** Each result below was parsed with
Babel exactly as the preview does, over repeated runs of the pricing-table
preset:

| Model                 | Time   | Valid JSX | Notes                          |
| --------------------- | ------ | --------- | ------------------------------ |
| `qwen2.5-coder:7b`    | 6-18s  | **8/8**   | recommended default            |
| `gpt-oss:120b-cloud`  | 23s    | yes       | cloud-routed, not local        |
| `jarvis-coder:6.7b`   | 23-66s | **1/3**   | unterminated strings, bad JSX  |
| `llama3.2:3b`         | 18s    | no        | closes the root element early  |
| `phi3:mini`           | 6s     | no        | adjacent elements in a ternary |
| `deepseek-coder:6.7b` | 8s     | -         | emitted no Tailwind at all     |

Small general-purpose models lose track of JSX nesting on output this long. Use
a code-tuned model of at least ~7B; `qwen2.5-coder:7b` was the only local model
tested that was reliable.

The failures are genuinely the model, not the pipeline: comparing raw model
output against sanitized output over the same generations, parse errors appear
at identical positions in both, so `sanitizeComponentCode` never turns valid
code invalid.

A broken generation is not fatal either way — `PreviewFrame` catches the compile
error and prints it with the offending line instead of blanking the pane.

Reasoning models (`deepseek-r1` and friends) are handled: `sanitizeComponentCode`
strips `<think>` blocks, including an unterminated one, before anything else.

The preview iframe has no `allow-same-origin`, so it runs on an opaque origin
with no access to the parent page, its cookies, or its storage. The sanitizer is
defence in depth on top of that, not the only barrier.

### Changing the model

All three model IDs live at the top of the providers block in
`src/lib/component-generation.server.ts`:

```ts
export const GEMINI_MODEL = "gemini-3.7-flash";
export const GATEWAY_MODEL = "google/gemini-3.7-flash";
export const ANTHROPIC_MODEL = "claude-opus-5";
```

`GEMINI_MODEL` and `GATEWAY_MODEL` are the same model reached by two different
routes, so change them together.

Latency is tuned for a live studio. All three paths run with reasoning off or
low: Gemini sets `thinkingConfig: { thinkingBudget: 0 }`, the gateway sets
`reasoning_effort: "none"`, and Anthropic uses `effort: "low"`.

This matters more than it looks. Measured on the pricing-table prompt,
`gemini-3.7-flash` took **~40s** with its default thinking budget and **~10s**
with thinking off, for equivalent component quality. The build targets
Cloudflare via nitro, where a 40s request risks the platform timeout.

To trade latency back for more considered output, raise the budget in
`generateWithGemini()`:

```ts
thinkingConfig: {
  thinkingBudget: 4096;
}
```

### Rate limits and retries

Flash models return `503 UNAVAILABLE` under load fairly often, so 5xx responses
are retried up to `GEMINI_MAX_ATTEMPTS` times with backoff before the error
reaches the user.

`429` is deliberately **not** retried. Google answers it with a `retryDelay` in
the tens of seconds, so retrying on our backoff cannot succeed and would only
spend more quota.

Watch the quota: the Gemini API free tier allows **20 requests per day** for
`gemini-3.7-flash` (`GenerateRequestsPerDayPerProjectPerModel-FreeTier`). That
is enough to try the studio out, not to develop against it — enable billing on
the Google Cloud project behind the key if you are iterating.

---

## Contributors

- [void58429-creator](https://github.com/void58429-creator)
- [steventa2024-lgtm](https://github.com/steventa2024-lgtm)
