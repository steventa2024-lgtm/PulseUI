/**
 * OpenAI-compatible chat completions adapter. One implementation covers
 * OpenAI, OpenRouter, Ollama, LM Studio, llama.cpp and vLLM — they all expose
 * `/v1/chat/completions` with SSE streaming.
 */
import {
  ProviderError,
  sseData,
  type AIProvider,
  type ChatTurn,
  type GenerateRequest,
  type ProviderCapabilities,
} from "../types";

export type OpenAICompatibleConfig = {
  id: string;
  label: string;
  baseUrl: string;
  model: string;
  apiKey?: string;
  local: boolean;
  vision?: boolean;
  extraHeaders?: Record<string, string>;
};

export function trimBaseUrl(url: string): string {
  let value = url.trim();
  while (value.endsWith("/")) value = value.slice(0, -1);
  return value;
}

/** Heuristic only — used to decide whether attachments may be forwarded. */
export function modelLikelySupportsVision(model: string): boolean {
  return /(vision|vl\b|-vl|llava|gpt-4o|gpt-4\.1|gpt-5|claude|gemini|pixtral|gemma3|qwen2\.5vl|minicpm-v|llama3\.2-vision)/i.test(
    model,
  );
}

function toOpenAIMessage(turn: ChatTurn) {
  if (!turn.images?.length) return { role: turn.role, content: turn.content };
  return {
    role: turn.role,
    content: [
      { type: "text", text: turn.content },
      ...turn.images.map((image) => ({
        type: "image_url",
        image_url: { url: `data:${image.mimeType};base64,${image.data}` },
      })),
    ],
  };
}

export class OpenAICompatibleProvider implements AIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  private readonly baseUrl: string;

  constructor(
    private readonly config: OpenAICompatibleConfig,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {
    this.id = config.id;
    this.label = config.label;
    this.model = config.model;
    this.baseUrl = trimBaseUrl(config.baseUrl);
    this.capabilities = {
      streaming: true,
      tools: true,
      vision: config.vision ?? modelLikelySupportsVision(config.model),
      local: config.local,
    };
  }

  supportsTools() {
    return this.capabilities.tools;
  }

  supportsVision() {
    return this.capabilities.vision;
  }

  private async request(request: GenerateRequest, stream: boolean): Promise<Response> {
    let response: Response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
          ...this.config.extraHeaders,
        },
        body: JSON.stringify({
          model: this.model,
          stream,
          // Local models lose syntax balance far more readily at high temperature.
          temperature: request.temperature ?? (this.config.local ? 0.2 : 0.4),
          max_tokens: request.maxTokens ?? (this.config.local ? 8192 : 16_000),
          messages: request.messages.map(toOpenAIMessage),
        }),
        ...(request.signal ? { signal: request.signal } : {}),
      });
    } catch (error) {
      if (request.signal?.aborted) throw error;
      throw new ProviderError(
        this.config.local
          ? `No model server responded at ${this.baseUrl}. Start Ollama / LM Studio or fix LOCAL_AI_BASE_URL.`
          : `Could not reach ${this.label} at ${this.baseUrl}.`,
        true,
      );
    }

    if (response.ok) return response;
    if (response.status === 401 || response.status === 403) {
      throw new ProviderError(`${this.label} rejected the API key.`);
    }
    if (response.status === 404 && this.config.local) {
      throw new ProviderError(
        `Model "${this.model}" is not available. For Ollama run: ollama pull ${this.model}`,
      );
    }
    if (response.status === 429) {
      throw new ProviderError(`${this.label} rate limit reached. Try again later.`, true);
    }
    const detail = await response.text().catch(() => "");
    throw new ProviderError(
      `${this.label} request failed (${response.status}). ${detail.slice(0, 300)}`,
      response.status >= 500,
    );
  }

  async generate(request: GenerateRequest): Promise<string> {
    const response = await this.request(request, false);
    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = payload.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) throw new ProviderError(`${this.label} returned an empty response.`);
    return text;
  }

  async *stream(request: GenerateRequest): AsyncGenerator<string> {
    const response = await this.request(request, true);
    if (!response.body) throw new ProviderError(`${this.label} returned no response body.`);
    for await (const payload of sseData(response.body, request.signal)) {
      try {
        const chunk = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
          error?: { message?: string };
        };
        if (chunk.error?.message) throw new ProviderError(chunk.error.message);
        const choice = chunk.choices?.[0];
        const text = choice?.delta?.content ?? choice?.message?.content ?? "";
        if (text) yield text;
      } catch (error) {
        if (error instanceof ProviderError) throw error;
        // Partial or keep-alive frame.
      }
    }
  }
}

/** List models exposed by an OpenAI-compatible server (used for local discovery). */
export async function listOpenAIModels(
  baseUrl: string,
  options: { apiKey?: string; timeoutMs?: number; fetchImpl?: typeof fetch } = {},
): Promise<string[] | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeoutMs ?? 1500);
  try {
    const response = await (options.fetchImpl ?? fetch)(`${trimBaseUrl(baseUrl)}/models`, {
      headers: options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {},
      signal: controller.signal,
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { data?: Array<{ id?: string }> };
    return (payload.data ?? []).map((entry) => entry.id ?? "").filter(Boolean);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
