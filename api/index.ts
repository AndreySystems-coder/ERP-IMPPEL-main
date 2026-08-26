import type { IncomingMessage, ServerResponse } from "http";
import { createApp } from "../server/index";

// Vercel serverless entrypoint. All requests are rewritten here by
// vercel.json (only /api/*; the static frontend is served directly from
// the build output). Express apps are callable exactly like a plain Node
// request handler, so we just await the shared app setup and delegate.
export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const { app } = await createApp();
  app(req, res);
}
