import type { IncomingMessage, ServerResponse } from "http";
// Import the already-bundled server (dist/index.cjs, produced by `npm run
// build` before Vercel processes this function) instead of the raw
// server/index.ts source. esbuild fully inlines every relative import
// (server/*, shared/*) into that single CJS file; importing the TS source
// directly here left those inner relative imports unresolved at runtime
// (Node's ESM loader needs explicit extensions, which this project's
// bundler-style tsconfig doesn't require at the source level).
// @ts-ignore -- dist/index.cjs only exists after `npm run build`; tsc runs before it in CI.
import { createApp } from "../dist/index.cjs";

// Vercel serverless entrypoint. All requests are rewritten here by
// vercel.json (only /api/*; the static frontend is served directly from
// the build output). Express apps are callable exactly like a plain Node
// request handler, so we just await the shared app setup and delegate.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { app } = await createApp();
  app(req, res);
}
