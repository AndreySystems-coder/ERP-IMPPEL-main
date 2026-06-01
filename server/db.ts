import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const useMemoryPreview = !process.env.DATABASE_URL && process.env.NODE_ENV === "development";

if (!process.env.DATABASE_URL && !useMemoryPreview) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = process.env.DATABASE_URL
  ? new Pool({ connectionString: process.env.DATABASE_URL })
  : (undefined as unknown as pg.Pool);

export const db = process.env.DATABASE_URL
  ? drizzle(pool, { schema })
  : (new Proxy({}, {
      get() {
        throw new Error("Banco indisponível no preview em memória.");
      },
    }) as ReturnType<typeof drizzle>);
