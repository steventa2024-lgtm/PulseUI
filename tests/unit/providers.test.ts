import { afterEach, describe, expect, it } from "vitest";

import { mockRespond } from "@/lib/ai/providers/mock.server";
import { GeminiProvider, geminiBody } from "@/lib/ai/providers/gemini.server";
import { OpenAICompatibleProvider } from "@/lib/ai/providers/openai-compatible.server";
import {
  configuredProviderSpecs,
  defaultModelId,
  modelOptionsFrom,
  resolveProvider,
} from "@/lib/ai/registry.server";
import { resetServerEnvCache } from "@/lib/config/env.server";

const AI_VARS = [
  "AI_PROVIDER",
  "AI_MODEL",
  "AI_BASE_URL",
  "AI_API_KEY",
  "GEMINI_API_KEY",
  "GOOGLE_API_KEY",
  "GEMINI_MODEL",
  "OPENROUTER_API_KEY",
  "OPENROUTER_MODEL",
  "LOCAL_AI_MODEL",
  "LOCAL_AI_BASE_URL",
];

function withEnv(vars: Record<string, string>) {
  for (const key of AI_VARS) delete process.env[key];
  Object.assign(process.env, vars);
  resetServerEnvCache();
}

afterEach(() => withEnv({}));

function sse(lines: string[]): Response {
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) controller.enqueue(new TextEncoder().encode(`data: ${line}\n\n`));
      controller.close();
    },
  });
  return new Response(body, { status: 200 });
}

async function collect(stream: AsyncIterable<string>) {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}

describe("GeminiProvider", () => {
  it("maps system/user/assistant turns and images", () => {
    const body = JSON.parse(
      geminiBody({
        messages: [
          { role: "system", content: "sys" },
          { role: "user", content: "hi", images: [{ mimeType: "image/png", data: "AAA" }] },
          { role: "assistant", content: "hello" },
        ],
      }),
    );
    expect(body.system_instruction.parts[0].text).toBe("sys");
    expect(body.contents[0].role).toBe("user");
    expect(body.contents[0].parts[0].inline_data.mime_type).toBe("image/png");
    expect(body.contents[1].role).toBe("model");
  });

  it("streams text and sends the key in a header", async () => {
    let headers: Headers | undefined;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      headers = new Headers(init.headers);
      return sse([
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "Hel" }] } }] }),
        JSON.stringify({ candidates: [{ content: { parts: [{ text: "lo" }] } }] }),
      ]);
    }) as unknown as typeof fetch;
    const provider = new GeminiProvider("secret-key", "gemini-test", fakeFetch);
    expect(await collect(provider.stream({ messages: [{ role: "user", content: "x" }] }))).toBe(
      "Hello",
    );
    expect(headers?.get("x-goog-api-key")).toBe("secret-key");
  });

  it("fails fast on auth errors", async () => {
    const fakeFetch = (async () => new Response("no", { status: 403 })) as unknown as typeof fetch;
    const provider = new GeminiProvider("bad", "m", fakeFetch);
    await expect(provider.generate({ messages: [{ role: "user", content: "x" }] })).rejects.toThrow(
      /rejected/,
    );
  });
});

describe("OpenAICompatibleProvider", () => {
  it("streams deltas and ignores keep-alives", async () => {
    let body: { model: string; messages: unknown[] } | undefined;
    const fakeFetch = (async (_url: string, init: RequestInit) => {
      body = JSON.parse(String(init.body));
      return sse([
        JSON.stringify({ choices: [{ delta: { content: "A" } }] }),
        ": keepalive",
        JSON.stringify({ choices: [{ delta: { content: "B" } }] }),
        "[DONE]",
      ]);
    }) as unknown as typeof fetch;
    const provider = new OpenAICompatibleProvider(
      {
        id: "ollama",
        label: "Ollama",
        baseUrl: "http://127.0.0.1:11434/v1/",
        model: "qwen2.5-coder:7b",
        local: true,
      },
      fakeFetch,
    );
    expect(await collect(provider.stream({ messages: [{ role: "user", content: "x" }] }))).toBe(
      "AB",
    );
    expect(body?.model).toBe("qwen2.5-coder:7b");
    expect(provider.supportsVision()).toBe(false);
  });

  it("explains missing local models", async () => {
    const fakeFetch = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const provider = new OpenAICompatibleProvider(
      { id: "ollama", label: "Ollama", baseUrl: "http://x/v1", model: "missing", local: true },
      fakeFetch,
    );
    await expect(provider.generate({ messages: [] })).rejects.toThrow(/ollama pull missing/);
  });
});

describe("provider registry", () => {
  it("lists nothing when nothing is configured", () => {
    withEnv({});
    expect(configuredProviderSpecs()).toEqual([]);
  });

  it("prefers Gemini and keeps the legacy local model as an option", () => {
    withEnv({ GEMINI_API_KEY: "k", LOCAL_AI_MODEL: "qwen2.5-coder:7b" });
    const specs = configuredProviderSpecs();
    expect(specs.map((spec) => spec.id)).toEqual(["gemini", "ollama"]);
    expect(defaultModelId(specs)).toBe("gemini:gemini-3.7-flash");
    const options = modelOptionsFrom(specs);
    expect(options.map((option) => option.id)).toContain("ollama:qwen2.5-coder:7b");
  });

  it("honours AI_PROVIDER for LM Studio", () => {
    withEnv({ AI_PROVIDER: "lmstudio", AI_MODEL: "qwen/qwen3-coder" });
    const specs = configuredProviderSpecs();
    expect(specs[0]?.id).toBe("lmstudio");
    expect(defaultModelId(specs)).toBe("lmstudio:qwen/qwen3-coder");
  });

  it("resolves model ids containing colons", async () => {
    withEnv({ LOCAL_AI_MODEL: "qwen2.5-coder:7b" });
    const provider = await resolveProvider("ollama:qwen2.5-coder:7b");
    expect(provider.model).toBe("qwen2.5-coder:7b");
  });

  it("resolves the mock provider only when explicitly enabled", async () => {
    withEnv({ AI_PROVIDER: "mock" });
    expect((await resolveProvider()).id).toBe("mock");
  });
});

describe("mock provider", () => {
  it("reads first, then writes, then finishes", () => {
    const first = mockRespond([{ role: "user", content: "## Request\nBuild a CRM" }]);
    expect(first).toContain('<action name="read_file">');
    const second = mockRespond([
      { role: "user", content: "## Request\nBuild a CRM" },
      { role: "assistant", content: first },
      { role: "user", content: "<tool_results>export default function App() {}</tool_results>" },
    ]);
    expect(second).toContain('<write path="src/App.tsx">');
    expect(second).toContain("Build a CRM");
  });

  it("patches instead of rewriting when the app exists", () => {
    const second = mockRespond([
      { role: "user", content: "## Request\nAdd notifications" },
      { role: "assistant", content: "x" },
      { role: "user", content: '<tool_results><main data-pulse-mock="true"></tool_results>' },
    ]);
    expect(second).toContain('<patch path="src/App.tsx">');
    expect(second).not.toContain("<write");
  });
});
