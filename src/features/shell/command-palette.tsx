import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Code2,
  FolderKanban,
  History,
  LayoutTemplate,
  Monitor,
  Plug,
  Plus,
  Rocket,
  Search,
  Settings,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useProjects } from "@/lib/client/queries";

type PaletteContext = { open: () => void };
const Context = createContext<PaletteContext>({ open: () => {} });

export function useCommandPalette() {
  return useContext(Context);
}

const PROJECT_ROUTE = /^\/projects\/(prj_[a-z0-9]+)/;

export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const projectId = PROJECT_ROUTE.exec(pathname)?.[1] ?? null;
  // Only fetch while open: the provider hydrates before code-split routes, and an early
  // fetch would make their first client render differ from the server HTML.
  const projects = useProjects(undefined, { enabled: isOpen });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (to: string) => {
      setOpen(false);
      void navigate({ to });
    },
    [navigate],
  );

  const value = useMemo(() => ({ open: () => setOpen(true) }), []);

  return (
    <Context.Provider value={value}>
      {children}
      <CommandDialog open={isOpen} onOpenChange={setOpen}>
        <CommandInput placeholder="Search projects or jump to…" />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          <CommandGroup heading="General">
            <CommandItem onSelect={() => go("/")}>
              <Plus /> New project
            </CommandItem>
            <CommandItem onSelect={() => go("/search")}>
              <Search /> Search
            </CommandItem>
            <CommandItem onSelect={() => go("/templates")}>
              <LayoutTemplate /> Templates
            </CommandItem>
            <CommandItem onSelect={() => go("/projects")}>
              <FolderKanban /> All projects
            </CommandItem>
            <CommandItem onSelect={() => go("/connections")}>
              <Plug /> Connections
            </CommandItem>
            <CommandItem onSelect={() => go("/settings")}>
              <Settings /> Settings
            </CommandItem>
          </CommandGroup>
          {projectId && (
            <>
              <CommandSeparator />
              <CommandGroup heading="This project">
                <CommandItem onSelect={() => go(`/projects/${projectId}`)}>
                  <Sparkles /> Open Build
                </CommandItem>
                <CommandItem onSelect={() => go(`/projects/${projectId}/code`)}>
                  <Code2 /> Open Code
                </CommandItem>
                <CommandItem onSelect={() => go(`/projects/${projectId}/preview`)}>
                  <Monitor /> Open Preview
                </CommandItem>
                <CommandItem onSelect={() => go(`/projects/${projectId}/history`)}>
                  <History /> History
                </CommandItem>
                <CommandItem onSelect={() => go(`/projects/${projectId}/deploy`)}>
                  <Rocket /> Deploy
                </CommandItem>
                <CommandItem onSelect={() => go(`/projects/${projectId}/settings`)}>
                  <SlidersHorizontal /> Project settings
                </CommandItem>
              </CommandGroup>
            </>
          )}
          {Boolean(projects.data?.length) && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Open project">
                {projects.data?.slice(0, 12).map((project) => (
                  <CommandItem
                    key={project.id}
                    value={`project ${project.name} ${project.id}`}
                    onSelect={() => go(`/projects/${project.id}`)}
                  >
                    <FolderKanban /> {project.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>
      </CommandDialog>
    </Context.Provider>
  );
}
