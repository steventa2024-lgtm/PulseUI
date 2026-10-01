import { formatDistanceToNowStrict } from "date-fns";

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return "";
  try {
    return `${formatDistanceToNowStrict(new Date(iso))} ago`;
  } catch {
    return "";
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export const FRAMEWORK_LABELS: Record<string, string> = {
  "vite-react": "React · Vite",
  vite: "Vite",
  nextjs: "Next.js",
  astro: "Astro",
  "static-html": "HTML",
  node: "Node",
  unknown: "Unknown",
};
