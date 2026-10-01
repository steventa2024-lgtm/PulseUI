import { useQuery } from "@tanstack/react-query";
import {
  Eye,
  EyeOff,
  FilePlus2,
  FolderPlus,
  Loader2,
  Lock,
  RefreshCw,
  Save,
  Search,
  TriangleAlert,
  X,
} from "lucide-react";
import {
  Suspense,
  lazy,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { errorMessage, keys, useFileTree, useQueryClient } from "@/lib/client/queries";
import type { FileNode } from "@/lib/domain/types";
import {
  createProjectEntry,
  deleteProjectEntry,
  readProjectFile,
  renameProjectEntry,
  searchProjectFiles,
  writeProjectFile,
} from "@/lib/server-fns/workspace.functions";
import { cn } from "@/lib/utils";
import { useBuilder } from "../BuilderContext";
import { FileTree } from "./FileTree";

const CodeEditor = lazy(() => import("./CodeEditor"));

type Buffer = { content: string; original: string; conflict: boolean };
type PathDialogState = { kind: "file" | "directory" | "rename"; initial: string } | null;

function defaultOpenFile(tree: FileNode | undefined): string | null {
  const files: string[] = [];
  const walk = (node: FileNode) => {
    if (node.type === "file") files.push(node.path);
    node.children?.forEach(walk);
  };
  if (tree) walk(tree);
  return (
    ["src/App.tsx", "src/App.jsx", "app/page.tsx", "index.html", "README.md"].find((path) =>
      files.includes(path),
    ) ??
    files[0] ??
    null
  );
}

export function CodeWorkspace() {
  const { projectId, busy } = useBuilder();
  const client = useQueryClient();
  const [showIgnored, setShowIgnored] = useState(false);
  const tree = useFileTree(projectId, showIgnored);
  const [tabs, setTabs] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [buffers, setBuffers] = useState<Record<string, Buffer>>({});
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set(["src"]));
  const [sidebar, setSidebar] = useState<"files" | "search">("files");
  const [searchText, setSearchText] = useState("");
  const deferredSearch = useDeferredValue(searchText.trim());
  const [pathDialog, setPathDialog] = useState<PathDialogState>(null);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<FileNode | null>(null);
  const [saving, setSaving] = useState(false);

  const file = useQuery({
    queryKey: keys.file(projectId, active ?? ""),
    queryFn: () => readProjectFile({ data: { projectId, path: active as string } }),
    enabled: Boolean(active),
    retry: false,
  });

  const search = useQuery({
    queryKey: ["code-search", projectId, deferredSearch],
    queryFn: () => searchProjectFiles({ data: { projectId, query: deferredSearch } }),
    enabled: sidebar === "search" && deferredSearch.length >= 2,
  });

  // Open a sensible first file.
  useEffect(() => {
    if (active || !tree.data) return;
    const first = defaultOpenFile(tree.data);
    if (first) {
      setTabs([first]);
      setActive(first);
    }
  }, [tree.data, active]);

  // Sync server content into buffers; never clobber unsaved edits.
  useEffect(() => {
    if (!file.data || !active || file.data.path !== active) return;
    const incoming = file.data.content;
    setBuffers((current) => {
      const existing = current[active];
      if (!existing)
        return { ...current, [active]: { content: incoming, original: incoming, conflict: false } };
      if (existing.original === incoming) return current;
      if (existing.content === existing.original) {
        return { ...current, [active]: { content: incoming, original: incoming, conflict: false } };
      }
      return { ...current, [active]: { ...existing, conflict: true } };
    });
  }, [file.data, active]);

  const dirty = useMemo(
    () =>
      new Set(
        Object.entries(buffers)
          .filter(([, buffer]) => buffer.content !== buffer.original)
          .map(([path]) => path),
      ),
    [buffers],
  );

  const openFile = useCallback((path: string) => {
    setTabs((current) => (current.includes(path) ? current : [...current, path]));
    setActive(path);
  }, []);

  const closeTab = (path: string) => {
    if (dirty.has(path) && !window.confirm(`${path} has unsaved changes. Close anyway?`)) return;
    setTabs((current) => {
      const next = current.filter((tab) => tab !== path);
      if (active === path) setActive(next.at(-1) ?? null);
      return next;
    });
    setBuffers((current) => {
      const { [path]: _removed, ...rest } = current;
      return rest;
    });
  };

  const save = useCallback(async () => {
    if (!active) return;
    const buffer = buffers[active];
    if (!buffer || buffer.content === buffer.original) return;
    setSaving(true);
    try {
      await writeProjectFile({ data: { projectId, path: active, content: buffer.content } });
      setBuffers((current) => ({
        ...current,
        [active]: { content: buffer.content, original: buffer.content, conflict: false },
      }));
      client.setQueryData(keys.file(projectId, active), { path: active, content: buffer.content });
      void client.invalidateQueries({ queryKey: keys.git(projectId) });
      toast.success(`Saved ${active}`, { duration: 1500 });
    } catch (error) {
      toast.error("Save failed", { description: errorMessage(error) });
    } finally {
      setSaving(false);
    }
  }, [active, buffers, client, projectId]);

  const refreshTree = () => void client.invalidateQueries({ queryKey: ["file-tree", projectId] });

  const submitPathDialog = async (value: string) => {
    if (!pathDialog) return;
    try {
      if (pathDialog.kind === "rename" && renaming) {
        await renameProjectEntry({ data: { projectId, from: renaming, to: value } });
        setTabs((current) => current.map((tab) => (tab === renaming ? value : tab)));
        if (active === renaming) setActive(value);
      } else {
        await createProjectEntry({
          data: {
            projectId,
            path: value,
            type: pathDialog.kind === "directory" ? "directory" : "file",
          },
        });
        if (pathDialog.kind === "file") openFile(value);
      }
      setPathDialog(null);
      setRenaming(null);
      refreshTree();
    } catch (error) {
      toast.error("Could not complete that", { description: errorMessage(error) });
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    try {
      await deleteProjectEntry({ data: { projectId, path: deleting.path } });
      setTabs((current) =>
        current.filter((tab) => tab !== deleting.path && !tab.startsWith(`${deleting.path}/`)),
      );
      if (active && (active === deleting.path || active.startsWith(`${deleting.path}/`)))
        setActive(null);
      refreshTree();
    } catch (error) {
      toast.error("Delete failed", { description: errorMessage(error) });
    } finally {
      setDeleting(null);
    }
  };

  const buffer = active ? buffers[active] : undefined;

  return (
    <div className="flex h-full min-h-0 bg-pulse-bg-deep">
      <aside className="flex w-60 shrink-0 flex-col border-r border-pulse-border bg-pulse-bg-elevated max-md:w-48">
        <div className="flex h-11 items-center gap-0.5 border-b border-pulse-border px-2">
          <button
            onClick={() => setSidebar("files")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider",
              sidebar === "files"
                ? "text-pulse-text"
                : "text-pulse-text-muted hover:text-pulse-text",
            )}
          >
            Files
          </button>
          <button
            onClick={() => setSidebar("search")}
            className={cn(
              "rounded px-2 py-1 text-[11px] font-semibold uppercase tracking-wider",
              sidebar === "search"
                ? "text-pulse-text"
                : "text-pulse-text-muted hover:text-pulse-text",
            )}
          >
            Search
          </button>
          {sidebar === "files" && (
            <div className="ml-auto flex items-center">
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New file"
                onClick={() => setPathDialog({ kind: "file", initial: "src/" })}
                disabled={busy}
              >
                <FilePlus2 />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="New folder"
                onClick={() => setPathDialog({ kind: "directory", initial: "src/" })}
                disabled={busy}
              >
                <FolderPlus />
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={showIgnored ? "Hide ignored folders" : "Show ignored folders"}
                aria-pressed={showIgnored}
                onClick={() => setShowIgnored(!showIgnored)}
              >
                {showIgnored ? <EyeOff /> : <Eye />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Refresh files"
                onClick={refreshTree}
              >
                <RefreshCw className={tree.isFetching ? "animate-spin" : ""} />
              </Button>
            </div>
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-1.5">
          {sidebar === "files" ? (
            tree.isLoading ? (
              <div className="space-y-1.5 p-2">
                {[0, 1, 2, 3, 4].map((index) => (
                  <div
                    key={index}
                    className="pulse-skeleton h-5"
                    style={{ width: `${80 - index * 8}%` }}
                  />
                ))}
              </div>
            ) : tree.data ? (
              <FileTree
                root={tree.data}
                activePath={active}
                dirty={dirty}
                expanded={expanded}
                onToggle={(path) =>
                  setExpanded((current) => {
                    const next = new Set(current);
                    if (next.has(path)) next.delete(path);
                    else next.add(path);
                    return next;
                  })
                }
                onOpen={openFile}
                onRename={(path) => {
                  setRenaming(path);
                  setPathDialog({ kind: "rename", initial: path });
                }}
                onDelete={setDeleting}
              />
            ) : (
              <p className="p-3 text-xs text-pulse-danger">{errorMessage(tree.error)}</p>
            )
          ) : (
            <div className="space-y-2 p-1">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-pulse-text-muted" />
                <Input
                  autoFocus
                  value={searchText}
                  onChange={(event) => setSearchText(event.target.value)}
                  placeholder="Search code"
                  className="h-8 pl-7 text-xs"
                  aria-label="Search project files"
                />
              </div>
              {search.isFetching && (
                <Loader2 className="mx-auto h-4 w-4 animate-spin text-pulse-text-muted" />
              )}
              {search.data && !search.data.length && (
                <p className="px-1 text-xs text-pulse-text-muted">No matches.</p>
              )}
              <ul className="space-y-0.5">
                {search.data?.map((match) => (
                  <li key={`${match.path}:${match.line}`}>
                    <button
                      onClick={() => openFile(match.path)}
                      className="w-full rounded px-1.5 py-1 text-left hover:bg-pulse-surface-hover"
                    >
                      <p className="truncate font-mono text-[10.5px] text-pulse-cyan">
                        {match.path}:{match.line}
                      </p>
                      <p className="truncate font-mono text-[11px] text-pulse-text-secondary">
                        {match.text}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div
          className="flex h-11 shrink-0 items-end overflow-x-auto border-b border-pulse-border bg-pulse-bg-elevated"
          role="tablist"
          aria-label="Open files"
        >
          {tabs.map((tab) => (
            <div
              key={tab}
              role="tab"
              aria-selected={tab === active}
              className={cn(
                "group flex h-full shrink-0 items-center gap-2 border-r border-pulse-border px-3 text-xs",
                tab === active
                  ? "bg-pulse-bg-deep text-pulse-text shadow-[inset_0_2px_0_var(--pulse-cyan)]"
                  : "text-pulse-text-muted hover:text-pulse-text",
              )}
            >
              <button onClick={() => setActive(tab)} className="max-w-[180px] truncate" title={tab}>
                {tab.split("/").pop()}
              </button>
              <button
                onClick={() => closeTab(tab)}
                className="rounded p-0.5 hover:bg-pulse-surface-hover"
                aria-label={`Close ${tab}`}
              >
                {dirty.has(tab) ? (
                  <span className="block h-2 w-2 rounded-full bg-pulse-warning group-hover:hidden" />
                ) : null}
                <X className={cn("h-3 w-3", dirty.has(tab) && "hidden group-hover:block")} />
              </button>
            </div>
          ))}
          <div className="ml-auto flex h-full items-center gap-2 px-3">
            {active && (
              <span className="hidden truncate font-mono text-[11px] text-pulse-text-muted lg:inline">
                {active}
              </span>
            )}
            <Button
              size="sm"
              variant={active && dirty.has(active) ? "default" : "ghost"}
              onClick={() => void save()}
              disabled={!active || !dirty.has(active) || saving || busy}
            >
              {saving ? <Loader2 className="animate-spin" /> : <Save />} Save
            </Button>
          </div>
        </div>

        {busy && (
          <p className="flex items-center gap-2 border-b border-pulse-border bg-pulse-cyan/[0.06] px-4 py-1.5 text-xs text-pulse-cyan">
            <Lock className="h-3.5 w-3.5" /> Pulse is editing this project — the editor is read-only
            until the run finishes.
          </p>
        )}
        {buffer?.conflict && active && (
          <div className="flex items-center gap-3 border-b border-pulse-warning/30 bg-pulse-warning/10 px-4 py-1.5 text-xs text-pulse-warning">
            <TriangleAlert className="h-3.5 w-3.5" /> This file changed on disk while you had
            unsaved edits.
            <button
              className="underline"
              onClick={() =>
                setBuffers((current) => ({
                  ...current,
                  [active]: {
                    content: file.data?.content ?? "",
                    original: file.data?.content ?? "",
                    conflict: false,
                  },
                }))
              }
            >
              Load disk version
            </button>
            <button
              className="underline"
              onClick={() =>
                setBuffers((current) => ({
                  ...current,
                  [active]: {
                    ...(current[active] as Buffer),
                    original: file.data?.content ?? "",
                    conflict: false,
                  },
                }))
              }
            >
              Keep mine
            </button>
          </div>
        )}

        <div className="min-h-0 flex-1">
          {!active ? (
            <div className="flex h-full items-center justify-center text-sm text-pulse-text-muted">
              Select a file to start editing.
            </div>
          ) : file.isError ? (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-pulse-text-secondary">
              {errorMessage(file.error)}
            </div>
          ) : !buffer ? (
            <div className="space-y-2 p-6">
              {[0, 1, 2, 3, 4, 5].map((index) => (
                <div
                  key={index}
                  className="pulse-skeleton h-3.5"
                  style={{ width: `${30 + ((index * 37) % 60)}%` }}
                />
              ))}
            </div>
          ) : (
            <Suspense
              fallback={
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-pulse-text-muted" />
                </div>
              }
            >
              <CodeEditor
                key={active}
                path={active}
                value={buffer.content}
                readOnly={busy}
                onSave={() => void save()}
                onChange={(value) =>
                  setBuffers((current) => ({
                    ...current,
                    [active]: { ...(current[active] as Buffer), content: value },
                  }))
                }
              />
            </Suspense>
          )}
        </div>
      </div>

      <PathDialog
        state={pathDialog}
        onCancel={() => {
          setPathDialog(null);
          setRenaming(null);
        }}
        onSubmit={submitPathDialog}
      />

      <AlertDialog open={Boolean(deleting)} onOpenChange={(open) => !open && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deleting?.type === "directory" ? "folder" : "file"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-mono">{deleting?.path}</span> will be removed from the
              workspace. You can bring it back by restoring an earlier version in History.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmDelete()}
              className="bg-pulse-danger text-white hover:bg-pulse-danger/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function PathDialog({
  state,
  onCancel,
  onSubmit,
}: {
  state: PathDialogState;
  onCancel: () => void;
  onSubmit: (value: string) => Promise<void>;
}) {
  const [value, setValue] = useState("");
  useEffect(() => setValue(state?.initial ?? ""), [state]);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value.trim()) void onSubmit(value.trim());
  };
  const title =
    state?.kind === "rename" ? "Rename" : state?.kind === "directory" ? "New folder" : "New file";
  return (
    <Dialog open={Boolean(state)} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <Input
            autoFocus
            value={value}
            onChange={(event) => setValue(event.target.value)}
            className="font-mono"
            aria-label="Path relative to the project root"
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit" disabled={!value.trim()}>
              {title}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
