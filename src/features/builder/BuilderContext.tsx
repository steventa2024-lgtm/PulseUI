import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  errorMessage,
  keys,
  useConversation,
  useInvalidateProject,
  useProject,
  useQueryClient,
} from "@/lib/client/queries";
import { useRunStream, type RunView } from "@/lib/client/run-events";
import type { AgentMode, Attachment, Project } from "@/lib/domain/types";
import { cancelAgentRun, sendMessage } from "@/lib/server-fns/agent.functions";

type SendInput = {
  prompt: string;
  mode: AgentMode;
  modelId: string | null;
  attachments: Attachment[];
};

type BuilderContextValue = {
  projectId: string;
  project: Project | undefined;
  activeRunId: string | null;
  run: RunView | null;
  busy: boolean;
  send: (input: SendInput) => Promise<boolean>;
  stop: () => Promise<void>;
  /** Prefills a fix request (from build errors or preview logs) and sends it. */
  askToFix: (context: string) => void;
};

const Context = createContext<BuilderContextValue | null>(null);

export function useBuilder(): BuilderContextValue {
  const value = useContext(Context);
  if (!value) throw new Error("useBuilder must be used inside a project");
  return value;
}

export function BuilderProvider({
  projectId,
  children,
}: {
  projectId: string;
  children: ReactNode;
}) {
  const client = useQueryClient();
  const invalidate = useInvalidateProject();
  const conversation = useConversation(projectId);
  const [localRunId, setLocalRunId] = useState<string | null>(null);
  // Runs that already ended in this session: stale query data must not resubscribe to them.
  const [finishedRuns, setFinishedRuns] = useState<string[]>([]);
  const candidate = localRunId ?? conversation.data?.activeRunId ?? null;
  const activeRunId = candidate && !finishedRuns.includes(candidate) ? candidate : null;
  const project = useProject(projectId, { poll: Boolean(activeRunId) });
  const lastModel = useRef<string | null>(null);

  const onFinished = useCallback(
    (view: RunView) => {
      setFinishedRuns((current) => [...current, view.runId]);
      setLocalRunId(null);
      invalidate(projectId);
      if (view.state === "failed")
        toast.error("Pulse finished with errors", {
          description: view.error?.split("\n")[0] ?? undefined,
        });
    },
    [invalidate, projectId],
  );

  const run = useRunStream(activeRunId, onFinished);

  // Refresh file tree / project while the run writes files, without hammering.
  const fileEvents = run?.items.filter((item) => item.kind === "file").length ?? 0;
  useEffect(() => {
    if (!fileEvents) return;
    const timer = setTimeout(() => {
      void client.invalidateQueries({ queryKey: ["file-tree", projectId] });
    }, 400);
    return () => clearTimeout(timer);
  }, [fileEvents, client, projectId]);

  const send = useCallback(
    async (input: SendInput) => {
      try {
        lastModel.current = input.modelId;
        const { runId } = await sendMessage({
          data: {
            projectId,
            prompt: input.prompt,
            mode: input.mode,
            attachments: input.attachments,
            ...(input.modelId ? { modelId: input.modelId } : {}),
          },
        });
        setLocalRunId(runId);
        void client.invalidateQueries({ queryKey: keys.conversation(projectId) });
        return true;
      } catch (error) {
        toast.error("Pulse could not start", { description: errorMessage(error) });
        return false;
      }
    },
    [client, projectId],
  );

  const stop = useCallback(async () => {
    if (!activeRunId) return;
    try {
      await cancelAgentRun({ data: { runId: activeRunId } });
    } catch (error) {
      toast.error("Could not stop Pulse", { description: errorMessage(error) });
    }
  }, [activeRunId]);

  const askToFix = useCallback(
    (context: string) => {
      void send({
        prompt: `The project has an error. Find the root cause and fix it.\n\n${context.slice(-6000)}`,
        mode: "build",
        modelId: lastModel.current,
        attachments: [],
      });
    },
    [send],
  );

  const value = useMemo<BuilderContextValue>(
    () => ({
      projectId,
      project: project.data,
      activeRunId,
      run,
      busy: Boolean(activeRunId) && !(run?.finished ?? false),
      send,
      stop,
      askToFix,
    }),
    [projectId, project.data, activeRunId, run, send, stop, askToFix],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}
