/**
 * React Query bindings for PulseUI's server functions. Components use these
 * hooks; they never call fetch or touch server modules directly.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getConversation, getModels, getRunDetails } from "../server-fns/agent.functions";
import {
  getAppSettings,
  getConnections,
  getDeployments,
  listVersions,
} from "../server-fns/history.functions";
import { getProject, listProjects } from "../server-fns/projects.functions";
import { getFileTree, getGitState, getPreviewState } from "../server-fns/workspace.functions";

export const keys = {
  projects: (query?: string) => ["projects", query ?? ""] as const,
  project: (projectId: string) => ["project", projectId] as const,
  conversation: (projectId: string) => ["conversation", projectId] as const,
  run: (runId: string) => ["run", runId] as const,
  models: ["models"] as const,
  fileTree: (projectId: string, includeIgnored: boolean) =>
    ["file-tree", projectId, includeIgnored] as const,
  file: (projectId: string, path: string) => ["file", projectId, path] as const,
  preview: (projectId: string) => ["preview", projectId] as const,
  versions: (projectId: string) => ["versions", projectId] as const,
  git: (projectId: string) => ["git", projectId] as const,
  deployments: (projectId: string) => ["deployments", projectId] as const,
  connections: ["connections"] as const,
  appSettings: ["app-settings"] as const,
};

export function useProjects(query?: string, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: keys.projects(query),
    queryFn: () => listProjects({ data: query ? { query } : {} }),
    staleTime: 5_000,
    enabled: options.enabled ?? true,
  });
}

export function useProject(projectId: string, options: { poll?: boolean } = {}) {
  return useQuery({
    queryKey: keys.project(projectId),
    queryFn: () => getProject({ data: { projectId } }),
    refetchInterval: options.poll ? 4_000 : false,
  });
}

export function useConversation(projectId: string) {
  return useQuery({
    queryKey: keys.conversation(projectId),
    queryFn: () => getConversation({ data: { projectId } }),
  });
}

export function useRunDetails(runId: string | null, enabled: boolean) {
  return useQuery({
    queryKey: keys.run(runId ?? "none"),
    queryFn: () => getRunDetails({ data: { runId: runId as string } }),
    enabled: Boolean(runId) && enabled,
  });
}

export function useModels() {
  return useQuery({ queryKey: keys.models, queryFn: () => getModels(), staleTime: 30_000 });
}

export function useFileTree(projectId: string, includeIgnored = false) {
  return useQuery({
    queryKey: keys.fileTree(projectId, includeIgnored),
    queryFn: () => getFileTree({ data: { projectId, includeIgnored } }),
  });
}

export function usePreviewState(projectId: string) {
  return useQuery({
    queryKey: keys.preview(projectId),
    queryFn: () => getPreviewState({ data: { projectId } }),
  });
}

export function useVersions(projectId: string) {
  return useQuery({
    queryKey: keys.versions(projectId),
    queryFn: () => listVersions({ data: { projectId } }),
  });
}

export function useGitState(projectId: string) {
  return useQuery({
    queryKey: keys.git(projectId),
    queryFn: () => getGitState({ data: { projectId } }),
  });
}

export function useDeployments(projectId: string) {
  return useQuery({
    queryKey: keys.deployments(projectId),
    queryFn: () => getDeployments({ data: { projectId } }),
    // Poll only while a deployment is queued or building.
    refetchInterval: (query) =>
      query.state.data?.deployments.some((d) => d.status === "QUEUED" || d.status === "BUILDING")
        ? 1500
        : false,
  });
}

export function useConnections() {
  return useQuery({
    queryKey: keys.connections,
    queryFn: () => getConnections(),
    staleTime: 15_000,
  });
}

export function useAppSettings() {
  return useQuery({ queryKey: keys.appSettings, queryFn: () => getAppSettings() });
}

/** Invalidate everything that a finished agent run may have changed. */
export function useInvalidateProject() {
  const client = useQueryClient();
  return (projectId: string) => {
    void client.invalidateQueries({ queryKey: keys.project(projectId) });
    void client.invalidateQueries({ queryKey: keys.conversation(projectId) });
    void client.invalidateQueries({ queryKey: ["file-tree", projectId] });
    void client.invalidateQueries({ queryKey: ["file", projectId] });
    void client.invalidateQueries({ queryKey: keys.preview(projectId) });
    void client.invalidateQueries({ queryKey: keys.versions(projectId) });
    void client.invalidateQueries({ queryKey: keys.git(projectId) });
    void client.invalidateQueries({ queryKey: ["projects"] });
  };
}

export { useMutation, useQueryClient };

export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return "Something unexpected happened.";
}
