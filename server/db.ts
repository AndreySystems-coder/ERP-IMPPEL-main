import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";
import { loadEnvFile } from "node:process";

try {
  loadEnvFile();
} catch {
  // Environment variables can still be provided by the host platform.
}

const { Pool } = pg;

const useMemoryPreview = !process.env.DATABASE_URL && process.env.NODE_ENV === "development";

if (!process.env.DATABASE_URL && !useMemoryPreview) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      // Kept small on purpose: in serverless (Vercel), each function instance
      // opens its own pool, so a high per-instance max can exhaust the
      // database's total connection limit under concurrency. Use the
      // provider's pooled (PgBouncer/Neon) connection string in production.
      max: 3,
    })
  : (undefined as unknown as pg.Pool);

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : (new Proxy({}, {
      get() {
        throw new Error("Banco indisponível no preview em memória.");
      },
    }) as ReturnType<typeof drizzle>);
