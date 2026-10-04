/**
 * Google Gemini adapter (AI Studio REST API).
 *
 * Carried over from the original generator: transient 5xx are retried with
 * backoff, 429 fails fast (Google asks for a long wait, retrying only burns
 * quota), and the key travels in a header so it never lands in a URL or log.
 */
import {
  ProviderError,
  sseData,
  type AIProvider,
  type ChatTurn,
  type GenerateRequest,
} from "../types";

export const DEFAULT_GEMINI_MODEL = "gemini-3.7-flash";
const MAX_ATTEMPTS = 3;

type GeminiChunk = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function isBlocked(reason: string | undefined) {
  return reason === "SAFETY" || reason === "PROHIBITED_CONTENT";
}

function chunkText(chunk: GeminiChunk): string {
  return (chunk.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? "").join("");
}

export function geminiBody(request: GenerateRequest): string {
  const system = request.messages
    .filter((turn) => turn.role === "system")
    .map((turn) => turn.content)
    .join("\n\n");
  const contents = request.messages
    .filter((turn): turn is ChatTurn & { role: "user" | "assistant" } => turn.role !== "system")
    .map((turn) => ({
      role: turn.role === "assistant" ? "model" : "user",
      parts: [
        ...(turn.images ?? []).map((image) => ({
          inline_data: { mime_type: image.mimeType, data: image.data },
        })),
        { text: turn.content },
      ],
    }));
  return JSON.stringify({
    ...(system ? { system_instruction: { parts: [{ text: system }] } } : {}),
    contents,
    generationConfig: {
      maxOutputTokens: request.maxTokens ?? 32_000,
      temperature: request.temperature ?? 0.4,
      // Thinking off: measured ~4x faster for equivalent output quality on
      // this model, and an interactive builder is judged on latency.
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
}

export class GeminiProvider implements AIProvider {
  readonly id = "gemini";
  readonly label = "Google Gemini";
  readonly capabilities = { streaming: true, tools: true, vision: true, local: false };

  constructor(
    private readonly apiKey: string,
    readonly model: string = DEFAULT_GEMINI_MODEL,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  supportsTools() {
    return this.capabilities.tools;
  }

  supportsVision() {
    return this.capabilities.vision;
  }

  private async request(request: GenerateRequest, streaming: boolean): Promise<Response> {
    const endpoint = streaming ? "streamGenerateContent?alt=sse" : "generateContent";
    for (let attempt = 1; ; attempt += 1) {
      let response: Response;
      try {
        response = await this.fetchImpl(
          `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:${endpoint}`,
          {
            method: "POST",
            headers: { "x-goog-api-key": this.apiKey, "Content-Type": "application/json" },
            body: geminiBody(request),
            ...(request.signal ? { signal: request.signal } : {}),
          },
        );
      } catch (error) {
        if (request.signal?.aborted) throw error;
        throw new ProviderError(
          "Could not reach the Gemini API. Check your network connection.",
          true,
        );
      }
      if (response.ok) return response;
      if (response.status === 401 || response.status === 403) {
        throw new ProviderError(
          "GEMINI_API_KEY was rejected. Check the key in your .env.local file.",
        );
      }
      if (response.status === 429) {
        throw new ProviderError("Gemini rate limit or daily quota reached. Try again later.", true);
      }
      if (response.status >= 500 && attempt < MAX_ATTEMPTS) {
        await sleep(600 * attempt);
        continue;
      }
      if (response.status >= 500) {
        throw new ProviderError(`${this.model} is busy right now. Try again in a moment.`, true);
      }
      const detail = await response.text().catch(() => "");
      throw new ProviderError(
        `Gemini request failed (${response.status}). ${detail.slice(0, 300)}`,
      );
    }
  }

  async generate(request: GenerateRequest): Promise<string> {
    const response = await this.request(request, false);
    const payload = (await response.json()) as GeminiChunk;
    if (isBlocked(payload.candidates?.[0]?.finishReason)) {
      throw new ProviderError("The model declined this request. Try rewording the prompt.");
    }
    const text = chunkText(payload);
    if (!text.trim()) throw new ProviderError("The model returned an empty response.");
    return text;
  }

  async *stream(request: GenerateRequest): AsyncGenerator<string> {
    const response = await this.request(request, true);
    if (!response.body) throw new ProviderError("Gemini returned no response body.");
    let blocked = false;
    for await (const payload of sseData(response.body, request.signal)) {
      try {
        const chunk = JSON.parse(payload) as GeminiChunk;
        if (isBlocked(chunk.candidates?.[0]?.finishReason)) blocked = true;
        const text = chunkText(chunk);
        if (text) yield text;
      } catch {
        // Partial or keep-alive frame.
      }
    }
    if (blocked)
      throw new ProviderError("The model declined this request. Try rewording the prompt.");
  }
}
