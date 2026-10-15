/**
 * Server-only helpers for the LLM component generation engine.
 * Never imported by client code directly (see *.functions.ts wrapper).
 */
import type { StreamFrame } from "./component-generation.types";
import { buildDesignAndUxBrief } from "./design-quality";

const AMBITION_BLOCK = [
  "",
  "SHORT PROMPT EXPANSION:",
  "Infer the minimum complete and coherent UI for the stated product, but do not invent integration capabilities.",
  "For sign-in, build labeled fields, validation, loading and error messages; label demo state honestly.",
  "For pricing, include a functional billing period toggle and accurate derived displayed prices.",
  "For dashboards, build real stateful tabs and filters over clearly labeled sample data.",
  "For checkout, include local cart state and totals; never claim to charge a card without an actual integration.",
  "For forms, implement working validation and submission feedback, not just decorative inputs.",
  "For landing pages, give each visible CTA a real destination, state transition or intentionally disabled explanation.",
  "Never add fabricated social proof, fake customer ratings or falsely claimed usage numbers as facts.",
  "Use purposeful SVG icons where needed; avoid unnecessary ornamental icons and large icon-card grids.",
  "Do not depend on external OAuth, backend services or network calls in the single-component sandbox.",
  "Follow the selected design recipe in the user prompt while honoring explicit user styling choices.",
].join("\n");

export const SYSTEM_PROMPT = [
  "You are PromptUI Studio's senior frontend engineer and accessibility-minded product designer.",
  "Produce EXACTLY ONE complete React function named GeneratedComponent and nothing else.",
  "Return raw JavaScript/JSX only: no markdown, no fences, no imports, no exports, no use client.",
  "React is globally available. Use React.useState/React.useEffect for local interactive behavior.",
  "Use self-contained markup and Tailwind v3-compatible utility classes for the current isolated component preview.",
  "No external component libraries, dynamic imports, arbitrary scripts, network requests, or dangerous HTML.",
  "Inline SVG is allowed when it materially improves comprehension; do not require CDN-hosted brand logos.",
  "Ensure keyboard usability, accessible names, sensible focus styles, semantic inputs, feedback and responsive layouts.",
  "Prefer product-appropriate information hierarchy, typography, layout and content over generic glowing cards.",
  "Do not add gradients, glassmorphism, hero sections, stock metrics or visual decorations without a design reason.",
  "Explicit user instructions about colors, fonts, style, density, mood and layout override inferred design recipes.",
  "Create context-appropriate original compositions, not repeated templates or random styling variation.",
  "Every visible interactive control must have a real React state transition, a meaningful destination or an explicitly disabled state.",
  "For single-component previews, represent missing backend functionality honestly. Never fake persisted authentication, checkout, data fetching, or deployment.",
  "Use realistic clearly marked sample data when data is unavailable; do not assert fabricated proof as fact.",
  "Mobile-first layouts; avoid fixed widths and horizontal overflow. Check 390px, 768px and desktop conceptually.",
  "Maintain code validity and predictable React state; do not use malformed JSX or undefined components.",
  "Follow the DESIGN AND UX CONTRACT included in the request; it is a design checklist, not a substitute for browser verification.",
  "Output must start with function GeneratedComponent().",
  AMBITION_BLOCK,
].join("\n");

export const PLAN_SYSTEM_PROMPT = `You are a senior UI/UX architect working with a developer. Your job is to PLAN components — never to build them.

Output ONLY a markdown plan. Use short bullet points grouped under clear section headings.

Cover these topics, in this order:
- Layout structure (top to bottom)
- Key sections, in the order they should appear
- Color palette and mood
- Typography scale (heading sizes, body, weights)
- Interactive elements and hover states
- Responsive behaviour (what stacks, what stays side-by-side)

STRICT RULES:
- NEVER output code.
- NEVER output JSX, HTML, or CSS.
- NEVER use triple backtick code blocks.
- Text and bullets only.

Keep it under 400 words. Be specific and concrete, not generic.`;

export const STYLE_MODIFIER_HINTS: Record<string, string> = {
  glassmorphism:
    "Use frosted glass surfaces: backdrop-blur, translucent white/black overlays, subtle inner borders.",
  "rounded-full":
    "Use very round geometry: rounded-full pills for buttons/badges, rounded-3xl cards.",
  gradients: "Use vibrant multi-stop gradients for backgrounds, text, and accent borders.",
  brutalist: "Use hard offset shadows, thick black borders, flat blocky color, no gradients.",
  minimal: "Use restrained neutral palette, generous whitespace, thin borders, no decoration.",
  dark: "Design for a dark background: dark surfaces, light text, luminous accents.",
  light: "Design for a light background: white surfaces, dark text, soft shadows.",
  animated: "Add tasteful transitions: hover scale, color transitions, subtle motion utilities.",
};

export function buildUserPrompt(prompt: string, modifiers: string[]): string {
  const hints = modifiers
    .map((modifier) => STYLE_MODIFIER_HINTS[modifier])
    .filter(Boolean)
    .map((hint) => "- " + hint)
    .join("\n");
  const isInternalRefinement = /^\s*(?:\[PLAN MODE\]|Here is the current component code:)/i.test(prompt);
  return [
    "Component request: " + prompt,
    hints ? "User-selected style modifiers:\n" + hints : "",
    isInternalRefinement ? "" : buildDesignAndUxBrief(prompt, modifiers),
    "Respond with the component source only.",
  ].filter(Boolean).join("\n\n");
}

/** Strip markdown bloat, imports/exports and unsafe constructs from the model output. */
export function sanitizeComponentCode(raw: string): string {
  let code = raw.trim();

  // Reasoning models (deepseek-r1 and friends) narrate inside <think> blocks
  // that can themselves contain fenced code, so drop them before anything else.
  code = code.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

  // An unterminated <think> means the model was still reasoning when it ran out
  // of tokens; nothing after it is component source.
  const dangling = code.indexOf("<think>");
  if (dangling !== -1) code = code.slice(0, dangling).trim();

  // Prefer the first fenced block when the model wraps its answer, then drop any
  // stray fence markers left behind by an unterminated block.
  const fence = code.match(/```(?:[a-zA-Z]*)\n([\s\S]*?)```/);
  if (fence?.[1]) code = fence[1];
  code = code.replace(/```[a-zA-Z]*/g, "").trim();

  // Drop module syntax and directives.
  code = code
    .replace(/^\s*["']use (client|server)["'];?\s*$/gm, "")
    .replace(/^\s*import\s[^\n]*;?\s*$/gm, "")
    .replace(/^\s*export\s+default\s+/gm, "")
    .replace(/^\s*export\s+/gm, "");

  // Remove constructs the preview sandbox must never run. The iframe is already
  // origin-isolated, so this is defence in depth rather than the only barrier.
  code = code
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/dangerouslySetInnerHTML=\{[\s\S]*?\}\}/g, "")
    .replace(/\bdocument\.cookie\b/g, "null")
    .replace(/\b(?:window\.)?(?:localStorage|sessionStorage)\b/g, "({})")
    .replace(/\b(?:window\.)?(?:fetch|XMLHttpRequest|WebSocket|EventSource)\s*\(/g, "(void 0)?.(")
    .replace(/\beval\s*\(/g, "(void 0)?.(")
    .replace(/\bnew\s+Function\s*\(/g, "(void 0)?.(");

  code = code.trim();

  // Normalise arrow-function components to the name the preview harness renders.
  if (!/function\s+GeneratedComponent/.test(code)) {
    const arrow = code.match(/(?:const|let|var)\s+([A-Z]\w*)\s*=\s*\(?\s*\)?\s*=>/);
    const named = code.match(/function\s+([A-Z]\w*)\s*\(/);
    const detected = arrow?.[1] ?? named?.[1];
    if (detected) code += `\n\nconst GeneratedComponent = ${detected};`;
  }

  return code;
}

/* ------------------------------------------------------------------ *
 * Providers
 *
 * Gemini 3.7 Flash is the studio's hosted model. A local OpenAI-compatible
 * model can take over when Gemini is unavailable. Both return raw model text
 * for sanitizeComponentCode to clean up.
 * ------------------------------------------------------------------ */

/** Direct Google AI Studio model id. */
export const GEMINI_MODEL = "gemini-3.7-flash";

export type ProviderId = "gemini" | "local";

export type Provider = {
  id: ProviderId;
  /** Short label for the studio header badge. */
  label: string;
  run: (systemPrompt: string, userPrompt: string) => Promise<string>;
  /** Emits NDJSON StreamFrame lines so the studio can render progressively. */
  stream: (systemPrompt: string, userPrompt: string) => Promise<ReadableStream<Uint8Array>>;
};

/** Attempts for transient Gemini failures (429 / 5xx), including the first try. */
const GEMINI_MAX_ATTEMPTS = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const encoder = new TextEncoder();

function encodeFrame(frame: StreamFrame): Uint8Array {
  return encoder.encode(`${JSON.stringify(frame)}\n`);
}

function geminiBody(systemPrompt: string, userPrompt: string): string {
  return JSON.stringify({
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: {
      maxOutputTokens: 16000,
      temperature: 0.6,
      // Thinking off. Measured on the pricing-table prompt: ~40s with the
      // default budget vs ~10s without, for equivalent component quality. A
      // live studio is judged on latency, and the build targets Cloudflare,
      // where a 40s request risks the platform timeout.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
}

type GeminiChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
};

function isBlocked(finishReason: string | undefined): boolean {
  return finishReason === "SAFETY" || finishReason === "PROHIBITED_CONTENT";
}

function chunkText(chunk: GeminiChunk): string {
  return (chunk.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

/**
 * POST to Gemini, retrying transient failures. Flash models return
 * `503 UNAVAILABLE` under load fairly often, so 429 and 5xx are retried with
 * backoff before the error reaches the user. Resolves only with an ok response.
 */
async function geminiFetch(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
  streaming: boolean,
): Promise<Response> {
  const endpoint = streaming ? "streamGenerateContent?alt=sse" : "generateContent";

  for (let attempt = 1; ; attempt += 1) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:${endpoint}`,
      {
        method: "POST",
        headers: {
          // Sent as a header rather than a ?key= query param so the secret never
          // lands in a URL that a proxy or access log could capture.
          "x-goog-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: geminiBody(systemPrompt, userPrompt),
      },
    );

    if (response.ok) return response;

    if (response.status === 401 || response.status === 403) {
      throw new Error("GEMINI_API_KEY was rejected. Check the key in your .env.local file.");
    }

    const detail = await response.text().catch(() => "");
    console.error("Gemini API error", response.status, detail);

    // 429 is a rate or quota limit. Google asks for tens of seconds before the
    // next attempt, so retrying on our backoff cannot succeed and would only
    // spend more of the caller's quota. Fail fast and let the user decide.
    if (response.status === 429) {
      throw new Error("Rate limit or daily quota reached. Try again later.");
    }

    // 5xx is transient: Flash models return 503 UNAVAILABLE under load fairly
    // often, and a retry usually lands.
    if (response.status >= 500) {
      if (attempt < GEMINI_MAX_ATTEMPTS) {
        await sleep(600 * attempt);
        continue;
      }
      throw new Error(`${GEMINI_MODEL} is busy right now. Try again in a moment.`);
    }

    throw new Error("The generation service failed. Please try again.");
  }
}

export async function generateWithGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<string> {
  const response = await geminiFetch(systemPrompt, userPrompt, apiKey, false);
  const payload = (await response.json()) as GeminiChunk;

  if (isBlocked(payload.candidates?.[0]?.finishReason)) {
    throw new Error("The model declined this request. Try rewording the prompt.");
  }

  const text = chunkText(payload);
  if (!text.trim()) throw new Error("The model returned an empty response.");
  return text;
}

/**
 * Stream Gemini's output as NDJSON frames.
 *
 * Failures before the first byte throw out of `geminiFetch`, so the studio
 * surfaces them exactly as it did before streaming existed. Once the response
 * has started we can no longer throw, so anything after that point is reported
 * as an `error` frame instead.
 */
export async function streamWithGemini(
  systemPrompt: string,
  userPrompt: string,
  apiKey: string,
): Promise<ReadableStream<Uint8Array>> {
  const response = await geminiFetch(systemPrompt, userPrompt, apiKey, true);
  const body = response.body;
  if (!body) throw new Error("The generation service returned no response body.");

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = "";
      let blocked = false;

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let index: number;
          while ((index = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const chunk = JSON.parse(payload) as GeminiChunk;
              if (isBlocked(chunk.candidates?.[0]?.finishReason)) blocked = true;
              const text = chunkText(chunk);
              if (text) {
                raw += text;
                controller.enqueue(encodeFrame({ type: "delta", text }));
              }
            } catch {
              // Ignore partial or non-JSON keepalive frames.
            }
          }
        }

        if (blocked) {
          controller.enqueue(
            encodeFrame({
              type: "error",
              message: "The model declined this request. Try rewording the prompt.",
            }),
          );
        } else if (!raw.trim()) {
          controller.enqueue(
            encodeFrame({ type: "error", message: "The model returned an empty response." }),
          );
        } else {
          controller.enqueue(
            encodeFrame({ type: "done", code: sanitizeComponentCode(raw), model: GEMINI_MODEL }),
          );
        }
      } catch (error) {
        console.error("Gemini stream error", error);
        controller.enqueue(
          encodeFrame({
            type: "error",
            message: "The generation stream failed. Please try again.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * Streaming shim for providers that only return a finished string. They still
 * work in the studio; the whole component just arrives as a single delta.
 */
function streamFromRun(
  label: string,
  run: (systemPrompt: string, userPrompt: string) => Promise<string>,
): (systemPrompt: string, userPrompt: string) => Promise<ReadableStream<Uint8Array>> {
  return async (systemPrompt, userPrompt) => {
    const raw = await run(systemPrompt, userPrompt);
    return new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encodeFrame({ type: "delta", text: raw }));
        controller.enqueue(
          encodeFrame({ type: "done", code: sanitizeComponentCode(raw), model: label }),
        );
        controller.close();
      },
    });
  };
}

/* ------------------------------------------------------------------ *
 * Local models (Ollama / LM Studio / llama.cpp)
 *
 * Addressed through the OpenAI-compatible `/v1/chat/completions` surface that
 * all three expose, so one implementation covers every runtime. Opt in by
 * setting LOCAL_AI_MODEL; there is no default model, because guessing one that
 * is not pulled fails at generation time instead of at startup.
 * ------------------------------------------------------------------ */

/** Ollama's default OpenAI-compatible endpoint. */
export const LOCAL_BASE_URL_DEFAULT = "http://localhost:11434/v1";

export type LocalConfig = { baseUrl: string; model: string };

export function resolveLocalConfig(): LocalConfig | null {
  const model = process.env["LOCAL_AI_MODEL"];
  if (!model) return null;

  let baseUrl = process.env["LOCAL_AI_BASE_URL"] ?? LOCAL_BASE_URL_DEFAULT;
  while (baseUrl.endsWith("/")) baseUrl = baseUrl.slice(0, -1);

  return { baseUrl, model };
}

function openAIBody(model: string, systemPrompt: string, userPrompt: string, stream: boolean) {
  return JSON.stringify({
    model,
    stream,
    // Low temperature: local models lose JSX balance far more readily than the
    // hosted ones, and sampling variance is where that usually starts.
    temperature: 0.3,
    max_tokens: 8000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
}

async function openAIFetch(
  config: LocalConfig,
  systemPrompt: string,
  userPrompt: string,
  stream: boolean,
): Promise<Response> {
  let response: Response;
  try {
    response = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: openAIBody(config.model, systemPrompt, userPrompt, stream),
    });
  } catch {
    throw new Error(
      `No local model server responded at ${config.baseUrl}. Start Ollama (or set LOCAL_AI_BASE_URL).`,
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Local model "${config.model}" is not pulled. Run: ollama pull ${config.model}`,
    );
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("Local model error", response.status, detail);
    throw new Error("The local model failed to generate. Check its server logs.");
  }

  return response;
}

/** Pull the assistant text out of one OpenAI-style SSE payload. */
function openAIDelta(payload: string): string {
  const chunk = JSON.parse(payload) as {
    choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
  };
  const choice = chunk.choices?.[0];
  return choice?.delta?.content ?? choice?.message?.content ?? "";
}

export async function generateWithLocal(
  systemPrompt: string,
  userPrompt: string,
  config: LocalConfig,
): Promise<string> {
  const response = await openAIFetch(config, systemPrompt, userPrompt, false);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const text = payload.choices?.[0]?.message?.content ?? "";
  if (!text.trim()) throw new Error("The local model returned an empty response.");
  return text;
}

/**
 * Stream an OpenAI-compatible server as NDJSON frames. Same contract as
 * streamWithGemini: pre-stream failures throw, later failures become frames.
 */
export async function streamWithLocal(
  systemPrompt: string,
  userPrompt: string,
  config: LocalConfig,
): Promise<ReadableStream<Uint8Array>> {
  const response = await openAIFetch(config, systemPrompt, userPrompt, true);
  const body = response.body;
  if (!body) throw new Error("The local model returned no response body.");

  return new ReadableStream<Uint8Array>({
    async start(controller) {
      const reader = body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let raw = "";

      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          let index: number;
          while ((index = buffer.indexOf("\n")) !== -1) {
            const line = buffer.slice(0, index).trim();
            buffer = buffer.slice(index + 1);
            if (!line.startsWith("data:")) continue;
            const payload = line.slice(5).trim();
            if (!payload || payload === "[DONE]") continue;

            try {
              const text = openAIDelta(payload);
              if (text) {
                raw += text;
                controller.enqueue(encodeFrame({ type: "delta", text }));
              }
            } catch {
              // Ignore partial or non-JSON keepalive frames.
            }
          }
        }

        if (!raw.trim()) {
          controller.enqueue(
            encodeFrame({ type: "error", message: "The local model returned an empty response." }),
          );
        } else {
          controller.enqueue(
            encodeFrame({ type: "done", code: sanitizeComponentCode(raw), model: config.model }),
          );
        }
      } catch (error) {
        console.error("Local model stream error", error);
        controller.enqueue(
          encodeFrame({
            type: "error",
            message: "The local model stream failed. Please try again.",
          }),
        );
      } finally {
        controller.close();
      }
    },
  });
}

export function localProvider(config: LocalConfig): Provider {
  return {
    id: "local",
    label: config.model,
    run: (system, user) => generateWithLocal(system, user, config),
    stream: (system, user) => streamWithLocal(system, user, config),
  };
}

/**
 * Pick a provider from the environment. Gemini is preferred and a configured
 * local model is used when no Gemini key is available.
 */
export function resolveProvider(): Provider {
  const geminiKey = process.env["GEMINI_API_KEY"] ?? process.env["GOOGLE_API_KEY"];
  if (geminiKey) {
    return {
      id: "gemini",
      label: GEMINI_MODEL,
      run: (system, user) => generateWithGemini(system, user, geminiKey),
      stream: (system, user) => streamWithGemini(system, user, geminiKey),
    };
  }

  const local = resolveLocalConfig();
  if (local) return localProvider(local);

  throw new Error(
    "No AI provider configured. Set GEMINI_API_KEY (or LOCAL_AI_MODEL) in your .env.local file.",
  );
}

/**
 * The provider to retry with when the primary fails before streaming starts.
 *
 * This is what makes a local model useful as a safety net: the hosted tiers run
 * out of quota, and a model on your own machine does not. Returns null when the
 * local model is unset or is already the primary.
 */
export function resolveFallbackProvider(primary: ProviderId): Provider | null {
  if (primary === "local") return null;
  const local = resolveLocalConfig();
  return local ? localProvider(local) : null;
}
