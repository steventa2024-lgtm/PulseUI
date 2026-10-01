/**
 * Provider-neutral model interface. Pulse speaks to every model through this,
 * so adding a provider means writing one adapter.
 */

export type ImagePart = { mimeType: string; data: string };

export type ChatTurn = {
  role: "system" | "user" | "assistant";
  content: string;
  images?: ImagePart[];
};

export type GenerateRequest = {
  messages: ChatTurn[];
  signal?: AbortSignal;
  temperature?: number;
  maxTokens?: number;
};

export type ProviderCapabilities = {
  streaming: boolean;
  /** Native function calling. Pulse uses its text action protocol either way. */
  tools: boolean;
  vision: boolean;
  local: boolean;
};

export interface AIProvider {
  readonly id: string;
  readonly label: string;
  readonly model: string;
  readonly capabilities: ProviderCapabilities;
  generate(request: GenerateRequest): Promise<string>;
  /** Yields text deltas. Throws before the first delta for connection/auth failures. */
  stream(request: GenerateRequest): AsyncIterable<string>;
  supportsTools(): boolean;
  supportsVision(): boolean;
}

export class ProviderError extends Error {
  readonly retryable: boolean;
  constructor(message: string, retryable = false) {
    super(message);
    this.name = "ProviderError";
    this.retryable = retryable;
  }
}

/** Parse `data:` lines from an SSE byte stream into payload strings. */
export async function* sseData(
  body: ReadableStream<Uint8Array>,
  signal?: AbortSignal,
): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const onAbort = () => {
    reader.cancel().catch(() => undefined);
  };
  signal?.addEventListener("abort", onAbort, { once: true });
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
        yield payload;
      }
    }
    const tail = buffer.trim();
    if (tail.startsWith("data:")) {
      const payload = tail.slice(5).trim();
      if (payload && payload !== "[DONE]") yield payload;
    }
  } finally {
    signal?.removeEventListener("abort", onAbort);
    reader.releaseLock();
  }
}
