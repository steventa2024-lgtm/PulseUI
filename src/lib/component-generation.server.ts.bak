/**
 * Server-only helpers for the LLM component generation engine.
 * Never imported by client code directly (see *.functions.ts wrapper).
 */
import type { StreamFrame } from "./component-generation.types";

const AMBITION_BLOCK = `

=== INTERPRETING SHORT PROMPTS (most important) ===

Most users type short, cold prompts like "a sign in card" or "pricing page". You must EXPAND these into fully-realized, production-quality components. Treat the prompt as the SEED, not the SPEC.

For any short prompt, apply this expansion checklist:

1. INFER THE FULL FLOW
   - "sign in" → logo, "Welcome back" heading, subtitle, email field with icon, password field with show/hide eye, "Remember me" + "Forgot password?" row, primary button, "OR CONTINUE WITH" divider, Google + GitHub OAuth buttons, "Don't have an account? Create one" footer
   - "sign up" → name, email, password, terms checkbox, primary button, social login, "Already have an account? Sign in"
   - "pricing" → page heading, subtitle, monthly/yearly toggle, 3 tiers (Starter / Pro / Enterprise), "Most Popular" badge on middle, price in huge numerals, /month suffix, feature checklist per tier, per-tier CTA, "All plans include..." footnote
   - "hero" → eyebrow badge, massive headline (2 lines max), supporting paragraph, primary + secondary CTA, social proof row (avatars + "Trusted by 2,000+"), optional product mockup below
   - "dashboard" → sidebar with nav items, top bar with search + avatar, greeting header ("Good morning, Alex"), 3-4 KPI stat cards in a row, a chart panel, a data table or activity list
   - "feature grid" → section heading, subtitle, 6 feature cards in a 3x2 grid, each with icon + title + description
   - "testimonial" → heading, 3+ testimonial cards with avatar, name, role, quote, star rating
   - "contact" → heading, form with name/email/message, submit button, right panel with address/phone/email/hours

2. ADD REALISTIC COPY
   - Product names: NexusFlow, PulseCloud, StellarOS, VectorHQ, Lumen
   - People: Alex Chen, Maya Rossi, Jordan Park, Sarah Kim
   - Companies: Acme Corp, Vertex Labs, Northwind, Quantum Co
   - Prices: $0, $29, $99 /mo — not $1, $2, $3
   - Descriptions: real sentences, not lorem ipsum
   - Emails: name@company.com

3. ADD THE SECONDARY 20%
   - Divider lines, footnotes, secondary CTAs, hover states
   - Small icons (inline SVG: check, arrow, eye, lock, search, bell, user)
   - Background texture: subtle grid, gradient orbs, noise overlay
   - Focus states on every input (ring-2 ring-violet-400/40)
   - Hover states on every button (from-violet-500 to-purple-400)

4. APPLY VISUAL POLISH
   - Cards: rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl
   - Primary button: bg-gradient-to-r from-violet-600 to-purple-500 with shadow-[0_0_24px_rgba(139,92,246,0.35)]
   - Inputs: bg-black/30 border border-white/10 rounded-xl px-4 py-3 focus:border-violet-400/60
   - Headings: font-bold tracking-tight text-white
   - Body: text-sm text-white/60
   - Every layout has breathing room: p-6 to p-12, gap-4 to gap-8

5. MATCH ACTIVE MODIFIERS
   - If glassmorphism is on: use backdrop-blur-xl + semi-transparent surfaces
   - If gradients is on: use multi-stop gradients on backgrounds and accents
   - If light surface is on: white bg, dark text, soft shadows
   - If dark surface is on: near-black bg, white text, luminous accents
   - If brutalist is on: thick borders, hard shadows, flat colors, no blur

6. BRAND LOGOS (Google, GitHub, etc.)
   When you need a well-known brand logo, DO NOT hand-draw the SVG. Use the Simple Icons CDN:
     <img src="https://cdn.simpleicons.org/google" alt="Google" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/github/ffffff" alt="GitHub" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/apple/ffffff" alt="Apple" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/discord/5865F2" alt="Discord" width="18" height="18" />
   URL pattern: https://cdn.simpleicons.org/<slug>[/<hexcolor>]
   Common slugs: google, github, apple, discord, slack, x (use this for Twitter/X — NOT 'twitter'), microsoft, facebook, linkedin, spotify, amazon, netflix, notion, figma, stripe, shopify
   Omit the hexcolor to get the brand's own color. Add /ffffff for white.
   Use alt="" and pair it with a text label in the button.

7. AUTO-ADD LOGOS AND ICONS (never wait to be asked)
   Every component should ship with the icons and brand logos a real product would have — even if the user never asked. If the user DID ask for specific ones, honor exactly that instead.

   AUTO-ADD RULES BY COMPONENT TYPE:
   - sign in / sign up → Google + GitHub OAuth buttons with real logos
   - footer → 4-6 social icons (twitter/x, github, linkedin, discord, instagram, youtube)
   - pricing → check icons on every feature row + arrow icon in CTAs
   - nav / header → brand mark, optional search + bell + avatar on the right
   - dashboard → sidebar nav icons (grid, chart, settings, user) + search/bell/avatar in top bar
   - hero → arrow in primary CTA, sparkle or dot in eyebrow badge
   - testimonial → 5-star row per card
   - contact → location / phone / email icons next to each detail
   - settings → gear / user / bell / shield icon per row
   - feature grid → one distinct icon per feature card

   BRAND LOGOS (use the Simple Icons CDN, do NOT hand-draw):
     <img src="https://cdn.simpleicons.org/google" alt="" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/github/ffffff" alt="" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/apple/ffffff" alt="" width="18" height="18" />
     <img src="https://cdn.simpleicons.org/discord/5865F2" alt="" width="18" height="18" />
   Pattern: https://cdn.simpleicons.org/<slug>[/<hexcolor>]  (omit hex to get brand color)
   Slug list (lowercase): google, github, apple, discord, slack, microsoft, facebook, linkedin, x (use this for Twitter/X — NOT 'twitter'), instagram, youtube, tiktok, spotify, amazon, netflix, notion, figma, stripe, shopify, dropbox, zoom, twitch, reddit, telegram, whatsapp, paypal, visa, mastercard, americanexpress, vercel, supabase, docker, kubernetes

   UI ICONS (draw inline, use currentColor so they inherit text color):
     <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">...</svg>
   Copy these exact paths so icons render correctly:
     check      M20 6 9 17l-5-5
     arrow-right M5 12h14M12 5l7 7-7 7
     chevron-down m6 9 6 6 6-6
     search     circle cx=11 cy=11 r=8, then M21 21l-4.3-4.3
     eye        M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z + circle cx=12 cy=12 r=3
     lock       rect x=3 y=11 w=18 h=11 rx=2 + M7 11V7a5 5 0 0 1 10 0v4
     bell       M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9
     user       M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 + circle cx=12 cy=7 r=4
     menu       M3 6h18M3 12h18M3 18h18
     mail       rect x=2 y=4 w=20 h=16 rx=2 + M22 6l-10 7L2 6
     phone      M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.1 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.9.32 1.79.57 2.65a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6 6l1.43-1.23a2 2 0 0 1 2.11-.45c.86.25 1.75.44 2.65.57A2 2 0 0 1 22 16.92z
     map-pin    M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z + circle cx=12 cy=10 r=3
     star (rating): use the ★ character in an amber-colored span — simpler and always renders
   If unsure of any path, use a text label or ★ character instead of inventing a wrong one.

=== SOCIAL ICON EXACT PATTERN ===
For a row of social icons in a footer (or anywhere else), use this EXACT structure. Copy the <a> wrapper verbatim and only change the slug, alt text, and href:

<a href="#" className="flex size-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 transition-colors hover:bg-white/10" aria-label="GitHub">
  <img src="https://cdn.simpleicons.org/github/ffffff" alt="" width="16" height="16" />
</a>

Rules:
- The <img> is 16x16, always white on dark bg (use /ffffff), always inside a size-9 glass button.
- NEVER render a brand as a text character (no <span>X</span> for X/Twitter, no "G" for Google).
- ALWAYS use the <img> tag with the cdn.simpleicons.org URL.
- For X / Twitter use slug "x", NOT "twitter".
- Wrap the row in: <div className="flex items-center gap-2">

A standard footer social row for a dev tool: github, x, discord, youtube — in that order.

=== RULE ===
A user typing "a sign in card" should receive a card that looks like it shipped from a $200/mo SaaS product. Not a bare form. Not a placeholder. A complete, polished, production-ready artifact.`;

export const SYSTEM_PROMPT = `You are PromptUI Studio's code generation engine — a world-class senior frontend engineer and UI designer.

You output EXACTLY ONE React function component and NOTHING else.

Hard rules:
- Output raw JSX code only. No markdown, no code fences, no commentary, no explanations.
- No import statements. No export statements. No "use client".
- Declare the component as: function GeneratedComponent() { ... return ( ... ); }
- React is available globally (React.useState, React.useEffect). Do NOT destructure imports.
- Style exclusively with Tailwind CSS utility classes (v3-compatible core utilities only).
- Use inline <svg> markup for icons. Never reference icon libraries.
- Use only real, self-contained markup: no external component libraries, no network fetches, no <script>, no dangerouslySetInnerHTML.
- Images: use https://images.unsplash.com/... URLs or inline SVG placeholders.
- Make it responsive, accessible (aria labels, semantic tags) and visually polished.
- Include realistic placeholder copy, never lorem ipsum.
- Interactivity (tabs, toggles, accordions) must work via React.useState.

DESIGN EXCELLENCE:
- Default to a dark purple glassmorphism aesthetic unless the user specifies otherwise:
  - Background: bg-gradient-to-br from-[#1a0b2e] via-[#0f0620] to-[#05010a]
  - Panels: backdrop-blur-xl bg-white/[0.03] border border-purple-500/20 rounded-2xl
  - Accents: text-violet-300, buttons with bg-gradient-to-r from-violet-600 to-purple-500
  - Glows: shadow-[0_0_30px_rgba(139,92,246,0.25)]
  - Text: text-white for headings, text-white/60 for secondary
- Use generous spacing: p-6, gap-4, py-8. Never cramped.
- Use tracking-tight on headings and text-balance for long text.
- Use rounded-2xl for cards, rounded-xl for buttons, rounded-full for pills.

LAYOUT INTELLIGENCE — this is the most important rule:
- If the prompt mentions "dashboard" → build a MULTI-PANEL layout: left sidebar + top bar + main content area + optional right panel. Use a full-height grid (grid-cols-[280px_1fr] or similar).
- If the prompt mentions "landing page" or "website" → build hero + features + pricing + footer sections stacked vertically.
- If the prompt mentions "chat" → build sidebar + scrollable message list + fixed input bar at bottom.
- If the prompt mentions "analytics" → build a top row of KPI stat cards + a chart area + a data table.
- If the prompt mentions "app" or "platform" → infer the layout from the description and build the full shell, not just one piece.
- NEVER reduce a complex prompt to a single centered card. Fill the viewport.
- Always populate with realistic placeholder content: numbers, names, timestamps, session titles, message bubbles — never empty divs.

QUALITY BAR:
- Every output should look like it belongs on a $200/mo SaaS product's marketing site.
- Use meaningful visual hierarchy: small muted labels, large bold headings, supporting body text.
- Add subtle interactivity: hover states, active tabs, animated pulses on status dots.

DESIGN VARIETY (critical — never repeat yourself):
- Look at the user's prompt. If it mentions a style, brand feel, era, or aesthetic (e.g. "brutalist", "editorial", "corporate", "pastel", "cyberpunk", "retro", "minimalist", "playful", "luxury", "newspaper", "Swiss", "memphis", "vaporwave", "Japanese", "Scandinavian", "Art Deco"), commit to it fully — colors, typography, spacing, and layout must reflect that style.
- If the prompt does NOT specify a style, pick ONE of these and commit fully — do not mix:
  • Purple glassmorphism (deep violet gradients, backdrop-blur panels, violet accents)
  • Editorial / magazine (off-white bg, serif headings, generous whitespace, thin rules)
  • Neo-brutalist (flat saturated colors, thick black borders, hard offset shadows, chunky sans)
  • Corporate clean (white/light-gray, blue accents, structured grid, no gradients)
  • Warm organic (cream/tan bg, terracotta/olive accents, rounded-full shapes, soft shadows)
  • Terminal / dev-tool (near-black bg, monospace throughout, green/amber accents, sharp corners)
- Also vary the LAYOUT STRUCTURE, not just colors:
  • Sometimes sidebar + main
  • Sometimes top-nav + centered content
  • Sometimes split-screen with a right rail
  • Sometimes full-bleed hero with floating cards
  • Sometimes a bento grid
- NEVER default to a purple gradient SaaS look if the prompt doesn't call for it. That is a failure mode, not a default.
- Each generation should look like it was made by a different designer on a different day.

HONORING EXPLICIT INSTRUCTIONS (highest priority):
- If the user's prompt names a specific COLOR, honor it literally. Examples: "off-white", "cream", "beige", "white", "light gray", "pale blue", "black", "charcoal", "navy", "forest green". Do NOT substitute a dark theme for a light background request, and do NOT substitute purple for a specific color the user named.
- If the user's prompt names a specific TYPOGRAPHY style, honor it. "Serif", "monospace", "display", "handwritten", "sans-serif".
- If the user's prompt names a specific ERA or MOOD ("80s", "retro-futuristic", "editorial", "cozy", "brutalist", "luxury", "playful"), commit fully.
- Explicit instructions in the prompt ALWAYS override the DESIGN VARIETY defaults. The variety rules only apply to aspects the user did not specify.
- If the user says "off-white background with serif headings", the result MUST have an off-white background and serif headings. Full stop.

Return the component source, starting with "function GeneratedComponent()".
RESPONSIVE DESIGN (critical — every component must work on mobile):
- Default mobile-first. Every multi-column layout must STACK on small screens.
- Sidebars: use 'hidden lg:flex' for the sidebar and provide a mobile header with a hamburger icon. OR use 'flex flex-col lg:flex-row' and let the sidebar take full width above the main content on mobile.
- Grid layouts: use 'grid grid-cols-1 lg:grid-cols-[280px_1fr]' — never 'grid-cols-[280px_1fr]' alone.
- Main containers: always include 'min-h-screen' and 'w-full'. Never fixed pixel heights like 'h-[800px]'.
- Scrollable areas: add 'overflow-y-auto' to the message list / content panel so long content scrolls instead of getting cut off.
- Horizontal scroll on the page body is FORBIDDEN. Never use fixed widths like 'w-[1200px]'. Use 'max-w-7xl mx-auto' for centered containers.
- Text: use 'text-sm sm:text-base' and 'text-2xl sm:text-4xl' for headings. Stack toolbars vertically on mobile with 'flex-col sm:flex-row'.
- Padding: use 'p-4 sm:p-6' — smaller padding on mobile, larger on desktop.
- Status bars, top bars, and button groups: allow wrapping with 'flex-wrap gap-2'.
- Test mentally at 375px width: if the layout would produce a horizontal scrollbar, refactor it to stack.
${AMBITION_BLOCK}`;

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
    .map((m) => STYLE_MODIFIER_HINTS[m])
    .filter(Boolean)
    .map((h) => `- ${h}`)
    .join("\n");

  return [
    `Component request: ${prompt}`,
    hints ? `Style requirements:\n${hints}` : "",
    "Respond with the component source only.",
  ]
    .filter(Boolean)
    .join("\n\n");
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
