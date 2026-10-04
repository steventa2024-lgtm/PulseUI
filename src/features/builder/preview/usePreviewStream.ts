import { useEffect, useState } from "react";

import type { PreviewStatus } from "@/lib/domain/types";

export type PreviewSnapshot = {
  status: PreviewStatus;
  port: number | null;
  url: string | null;
  error: string | null;
  startedAt: string | null;
  command: string | null;
};

/** Live preview status and dev-server output for a project (SSE). */
export function usePreviewStream(projectId: string) {
  const [info, setInfo] = useState<PreviewSnapshot | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    const source = new EventSource(`/api/projects/${projectId}/preview-logs`);
    source.addEventListener("status", (event) => {
      try {
        setInfo(JSON.parse((event as MessageEvent<string>).data) as PreviewSnapshot);
      } catch {
        // ignore
      }
    });
    source.addEventListener("logs", (event) => {
      try {
        setLogs(JSON.parse((event as MessageEvent<string>).data) as string[]);
      } catch {
        // ignore
      }
    });
    source.addEventListener("log", (event) => {
      try {
        const line = JSON.parse((event as MessageEvent<string>).data) as string;
        setLogs((current) => [...current.slice(-799), line]);
      } catch {
        // ignore
      }
    });
    return () => source.close();
  }, [projectId]);

  return { info, logs };
}
