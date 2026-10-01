import {
  ChevronRight,
  File,
  FileCode2,
  FileJson,
  FileText,
  Folder,
  FolderOpen,
  ImageIcon,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { FileNode } from "@/lib/domain/types";
import { cn } from "@/lib/utils";

function iconFor(name: string) {
  if (/\.(tsx?|jsx?|mjs|cjs|vue|astro|svelte)$/.test(name)) return FileCode2;
  if (/\.json$/.test(name)) return FileJson;
  if (/\.(md|txt)$/.test(name)) return FileText;
  if (/\.(png|jpe?g|gif|svg|webp|ico)$/.test(name)) return ImageIcon;
  return File;
}

type Props = {
  node: FileNode;
  depth: number;
  activePath: string | null;
  dirty: Set<string>;
  expanded: Set<string>;
  onToggle: (path: string) => void;
  onOpen: (path: string) => void;
  onRename: (path: string) => void;
  onDelete: (node: FileNode) => void;
};

function TreeRow({
  node,
  depth,
  activePath,
  dirty,
  expanded,
  onToggle,
  onOpen,
  onRename,
  onDelete,
}: Props) {
  const isDir = node.type === "directory";
  const open = expanded.has(node.path);
  const Icon = isDir ? (open ? FolderOpen : Folder) : iconFor(node.name);
  const active = activePath === node.path;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <li role="treeitem" aria-expanded={isDir ? open : undefined} aria-selected={active}>
      <div
        className={cn(
          "group flex h-7 items-center gap-1 rounded-[var(--pulse-radius-sm)] pr-1 text-[12.5px]",
          active
            ? "bg-pulse-blue/15 text-pulse-text"
            : "text-pulse-text-secondary hover:bg-pulse-surface-hover hover:text-pulse-text",
        )}
        style={{ paddingLeft: depth * 12 + 6 }}
      >
        <button
          type="button"
          onClick={() => (isDir ? onToggle(node.path) : onOpen(node.path))}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
        >
          {isDir ? (
            <ChevronRight
              className={cn("h-3 w-3 shrink-0 transition-transform", open && "rotate-90")}
            />
          ) : (
            <span className="w-3 shrink-0" />
          )}
          <Icon
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              isDir ? "text-pulse-blue" : "text-pulse-text-muted",
            )}
          />
          <span className="truncate">{node.name}</span>
          {dirty.has(node.path) && (
            <span
              className="ml-1 h-1.5 w-1.5 shrink-0 rounded-full bg-pulse-warning"
              aria-label="unsaved"
            />
          )}
        </button>
        <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
          <DropdownMenuTrigger
            className={cn(
              "rounded p-0.5 text-pulse-text-muted opacity-0 hover:bg-pulse-surface-overlay hover:text-pulse-text focus:opacity-100 group-hover:opacity-100",
              menuOpen && "opacity-100",
            )}
            aria-label={`Actions for ${node.name}`}
          >
            <MoreHorizontal className="h-3.5 w-3.5" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-40 border-pulse-border-strong bg-pulse-surface-raised"
          >
            <DropdownMenuItem className="gap-2 text-xs" onSelect={() => onRename(node.path)}>
              <Pencil className="h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem
              className="gap-2 text-xs text-pulse-danger focus:text-pulse-danger"
              onSelect={() => onDelete(node)}
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {isDir && open && node.children && node.children.length > 0 && (
        <ul role="group">
          {node.children.map((child) => (
            <TreeRow
              key={child.path}
              node={child}
              depth={depth + 1}
              activePath={activePath}
              dirty={dirty}
              expanded={expanded}
              onToggle={onToggle}
              onOpen={onOpen}
              onRename={onRename}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export function FileTree(props: Omit<Props, "node" | "depth"> & { root: FileNode }) {
  const { root, ...rest } = props;
  if (!root.children?.length)
    return <p className="px-3 py-4 text-xs text-pulse-text-muted">No files.</p>;
  return (
    <ul role="tree" aria-label="Project files" className="space-y-px">
      {root.children.map((child) => (
        <TreeRow key={child.path} node={child} depth={0} {...rest} />
      ))}
    </ul>
  );
}
