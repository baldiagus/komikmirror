import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import * as schema from "./schema";

declare global {
  var __komikMysqlPool: Pool | undefined;
  var __komikDb: MySql2Database<typeof schema> | undefined;
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL environment variable is required.");
  }
  return url;
}

export function getPool(): Pool {
  if (!globalThis.__komikMysqlPool) {
    globalThis.__komikMysqlPool = mysql.createPool({
      uri: getDatabaseUrl(),
      waitForConnections: true,
      connectionLimit: 10,
      maxIdle: 10,
      idleTimeout: 60_000,
      queueLimit: 0,
      timezone: "Z",
      decimalNumbers: false,
    });
  }
  return globalThis.__komikMysqlPool;
}

export function getDb(): MySql2Database<typeof schema> {
  if (!globalThis.__komikDb) {
    globalThis.__komikDb = drizzle(getPool(), { schema, mode: "default" });
  }
  return globalThis.__komikDb;
}

export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop, receiver) {
    return Reflect.get(getDb(), prop, receiver);
  },
});

export async function closeDb(): Promise<void> {
  if (globalThis.__komikMysqlPool) {
    await globalThis.__komikMysqlPool.end();
    globalThis.__komikMysqlPool = undefined;
    globalThis.__komikDb = undefined;
  }
}
