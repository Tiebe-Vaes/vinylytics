// Applies the committed migrations in ./drizzle. Runs before `next build`
// on Vercel and before `next start` in Docker.
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set; nothing to migrate.");
  process.exit(1);
}

const client = postgres(url, { max: 1, prepare: false });
await migrate(drizzle(client), { migrationsFolder: "./drizzle" });
await client.end();
console.log("migrations applied");
