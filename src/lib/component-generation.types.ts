/**
 * Wire format for the generation stream, shared by the server engine and the
 * studio. It lives outside `component-generation.server.ts` so the client can
 * import it without dragging the provider code — and its API keys — into the
 * browser bundle.
 */
export type StreamFrame =
  | { type: "delta"; text: string }
  | { type: "done"; code: string; model: string }
  | { type: "error"; message: string };
