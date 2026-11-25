import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { user } from "../src/db/schema";
import { auth } from "../src/lib/auth";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const password = process.argv[3];
  const name = process.argv[4]?.trim() || "Operator";
  const role = (process.argv[5]?.trim() || "user") as "admin" | "user";

  if (!email || !password || password.length < 8) {
    console.error(
      "Usage: npm run admin:create-user -- <email> <password(min 8)> [name] [admin|user]",
    );
    process.exit(1);
  }
  if (role !== "admin" && role !== "user") {
    console.error("Role must be 'admin' or 'user'.");
    process.exit(1);
  }

  try {
    const [existing] = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (existing) {
      await db
        .update(user)
        .set({ role, emailVerified: true, name })
        .where(eq(user.id, existing.id));
      console.log(
        JSON.stringify({ ok: true, created: false, userId: existing.id, email, role }),
      );
      return;
    }

    const res = await auth.api.createUser({
      body: {
        email,
        password,
        name,
        role,
      },
    });

    await db
      .update(user)
      .set({ emailVerified: true, role })
      .where(eq(user.id, res.user.id));

    console.log(
      JSON.stringify({
        ok: true,
        created: true,
        userId: res.user.id,
        email: res.user.email,
        role,
      }),
    );
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Failed to create user:", err instanceof Error ? err.message : err);
  process.exit(1);
});
