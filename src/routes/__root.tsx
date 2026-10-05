import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  HeadContent,
  Link,
  Outlet,
  Scripts,
  createRootRouteWithContext,
  useRouter,
} from "@tanstack/react-router";
import { RotateCcw, TriangleAlert } from "lucide-react";
import { type ReactNode } from "react";

import { PulseMark } from "@/components/shared/PulseLogo";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CommandPaletteProvider } from "@/features/shell/command-palette";
import appCss from "../styles.css?url";

const DESCRIPTION =
  "PulseUI is an AI application development environment: describe an app, and Pulse builds real, editable, runnable code with live preview, version history and deployment.";

function NotFoundComponent() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-pulse-bg px-4">
      <div className="max-w-md text-center">
        <PulseMark className="mx-auto mb-6 h-12 w-12" />
        <p className="font-mono text-sm text-pulse-cyan">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-pulse-text">
          This page does not exist
        </h1>
        <p className="mt-2 text-sm text-pulse-text-secondary">
          The link may be outdated, or the project was deleted.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">Back to PulseUI</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-pulse-bg px-4">
      <div className="pulse-panel max-w-lg p-8">
        <div className="mb-4 flex items-center gap-2 text-pulse-danger">
          <TriangleAlert className="h-5 w-5" />
          <h1 className="font-display text-lg font-semibold text-pulse-text">
            This view failed to load
          </h1>
        </div>
        <pre className="max-h-48 overflow-auto rounded-md border border-pulse-border bg-pulse-bg-deep p-3 font-mono text-xs text-pulse-text-secondary whitespace-pre-wrap">
          {error.message}
        </pre>
        <div className="mt-6 flex gap-2">
          <Button
            onClick={() => {
              void router.invalidate();
              reset();
            }}
          >
            <RotateCcw /> Try again
          </Button>
          <Button variant="outline" asChild>
            <a href="/">Go home</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "PulseUI — Build. Iterate. Deploy." },
      { name: "description", content: DESCRIPTION },
      { name: "theme-color", content: "#04070d" },
      { property: "og:title", content: "PulseUI — AI application builder" },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider delayDuration={250}>
        <CommandPaletteProvider>
          {/* Required: nested routes render here. */}
          <Outlet />
        </CommandPaletteProvider>
      </TooltipProvider>
      <Toaster position="bottom-right" />
    </QueryClientProvider>
  );
}
