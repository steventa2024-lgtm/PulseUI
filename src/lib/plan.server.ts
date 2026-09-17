/**
 * plan.server.ts
 * Takes a master prompt, asks the local Qwen model for a JSON file plan.
 */

const LOCAL_API = "http://127.0.0.1:8083/v1/chat/completions";
const MODEL = "qwen-9b-coder";

export type PlannedFile = {
  path: string;
  purpose: string;
  language: "tsx" | "ts" | "css" | "json" | "md";
};

export type ProjectPlan = {
  projectName: string;
  summary: string;
  files: PlannedFile[];
};

const SYSTEM_PROMPT = `You are a senior frontend architect. Given a master prompt, output ONLY a JSON object describing the files needed.

Format:
{
  "projectName": "kebab-case-name",
  "summary": "one sentence",
  "files": [
    { "path": "src/App.tsx", "purpose": "what this file contains", "language": "tsx" }
  ]
}

Rules:
- Maximum 8 files.
- Use Next.js 14 App Router conventions when relevant.
- Every path must be relative and end with a valid extension.
- Only include files that need to be created.
- Output raw JSON only. No markdown. No code fences. No explanations.`;

export async function planProject(masterPrompt: string): Promise<ProjectPlan> {
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
        { role: "user", content: masterPrompt },
      ],
      temperature: 0.4,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error(`Planner request failed: ${response.status}`);
  }

  const data = await response.json();
  const raw: string = data.choices?.[0]?.message?.content ?? "";

  // Strip markdown fences if the model added them anyway
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  // Find the first { and last } to be extra safe
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  const jsonOnly = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;

  try {
    const plan = JSON.parse(jsonOnly) as ProjectPlan;
    if (!plan.files || !Array.isArray(plan.files)) {
      throw new Error("Plan missing 'files' array");
    }
    return plan;
  } catch (err) {
    throw new Error(
      "Planner returned invalid JSON. Raw output: " + raw.slice(0, 300)
    );
  }
}
