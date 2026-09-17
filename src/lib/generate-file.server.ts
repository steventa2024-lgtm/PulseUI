/**
 * generate-file.server.ts
 * Given a single file from the plan, ask Qwen to write its contents.
 */

import type { PlannedFile } from "./plan.server";

const LOCAL_API = "http://127.0.0.1:8083/v1/chat/completions";
const MODEL = "qwen-9b-coder";

const SYSTEM_PROMPT = `You are an elite frontend engineer. Output ONLY the raw contents of the requested file.

Rules:
- No markdown fences (no \`\`\`).
- No explanation before or after.
- No comments like "// file: X".
- Use TypeScript, React, and Tailwind CSS.
- Dark glassmorphism aesthetic: backdrop-blur-xl, bg-white/5, border-white/10, rounded-2xl.
- Use Tailwind's palette only — no arbitrary hex values.
- If the file is CSS, output valid Tailwind v4 CSS.
- If the file is JSX/TSX, it must be a valid React component with a default export.`;

export async function generateFile(
  file: PlannedFile,
  projectContext: string
): Promise<string> {
  const userMessage = `Project context: ${projectContext}

Now generate this file:
Path: ${file.path}
Purpose: ${file.purpose}
Language: ${file.language}

Output ONLY the file contents. Nothing else.`;

  const response = await fetch(LOCAL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer local",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.5,
      max_tokens: 4096,
    }),
  });

  if (!response.ok) {
    throw new Error(`Generator failed for ${file.path}: ${response.status}`);
  }

  const data = await response.json();
  let content: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if model added them
  content = content
    .replace(/^```(?:tsx?|jsx?|css|json|md)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  return content;
}
