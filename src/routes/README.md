# Routes

TanStack Start uses **file-based routing**. `routeTree.gen.ts` is generated —
don't edit it by hand. The only root layout is `__root.tsx`.

| File                                                                  | URL                                |
| --------------------------------------------------------------------- | ---------------------------------- |
| `_app.tsx`                                                            | pathless layout: sidebar app shell |
| `_app/index.tsx`                                                      | `/` — home / new project           |
| `_app/projects.index.tsx`                                             | `/projects`                        |
| `_app/templates.tsx`                                                  | `/templates`                       |
| `_app/search.tsx`                                                     | `/search`                          |
| `_app/connections.tsx`                                                | `/connections`                     |
| `_app/settings.tsx`                                                   | `/settings`                        |
| `projects.$projectId.tsx`                                             | builder layout (client-rendered)   |
| `projects.$projectId.index.tsx`                                       | `/projects/:id` — Build            |
| `projects.$projectId.{code,preview,data,history,deploy,settings}.tsx` | builder tabs                       |
| `api/runs.$runId.events.ts`                                           | SSE: agent run events              |
| `api/projects.$projectId.preview-logs.ts`                             | SSE: preview status + logs         |
| `sites.$deploymentId.$.ts`                                            | local static deployments           |

Routes orchestrate; UI lives in `src/features`, server logic in `src/lib`.
Dynamic segments use a bare `$` (`$projectId`), splats read `_splat`.
