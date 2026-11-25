import "dotenv/config";
import path from "node:path";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";

async function runMigrations() {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "MIGRATION_DATABASE_URL (or DATABASE_URL) is required to run migrations.",
    );
  }

  // Single connection per Drizzle MySQL DDL migration best practice.
  const connection = await mysql.createConnection({
    uri: url,
    multipleStatements: false,
    timezone: "Z",
  });

  try {
    const db = drizzle(connection);
    const migrationsFolder = path.resolve(process.cwd(), "drizzle");
    console.log(`Applying SQL migrations from ${migrationsFolder}...`);
    await migrate(db, { migrationsFolder });
    console.log("Database migrations applied successfully.");
  } finally {
    await connection.end();
  }
}

runMigrations().catch((error) => {
  console.error("Migration failed:", error instanceof Error ? error.message : error);
  process.exit(1);
});
