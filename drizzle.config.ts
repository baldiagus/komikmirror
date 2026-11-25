import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const migrationUrl =
  process.env.MIGRATION_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "mysql://komik_migrator:dev_migrator_pw_change_me@127.0.0.1:3306/komik_mirror";

export default defineConfig({
  dialect: "mysql",
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dbCredentials: {
    url: migrationUrl,
  },
  strict: true,
  verbose: true,
});
