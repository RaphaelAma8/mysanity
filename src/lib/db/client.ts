import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import { databaseConfigured } from "@/lib/social/guard";

type DB = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { mysanitySql?: ReturnType<typeof postgres> };

/** Null when DATABASE_URL is missing, so the game keeps working single-player. */
export function getDb(): DB | null {
  if (!databaseConfigured()) return null;
  const url = process.env.DATABASE_URL as string;
  if (!globalForDb.mysanitySql) {
    globalForDb.mysanitySql = postgres(url, { max: 1, idle_timeout: 20, connect_timeout: 10 });
  }
  return drizzle(globalForDb.mysanitySql, { schema });
}
