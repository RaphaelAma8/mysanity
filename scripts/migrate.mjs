import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const url = process.env.DATABASE_URL ?? "";
if (!/^postgres(ql)?:\/\//.test(url)) {
  console.log("DATABASE_URL is not set. Skipping migrations. The game still runs fully single-player.");
  process.exit(0);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql);
await migrate(db, { migrationsFolder: "./drizzle" });
await sql.end();
console.log("Migrations applied.");
