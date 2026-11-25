import "dotenv/config";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/db";
import { user } from "../src/db/schema";

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  const role = (process.argv[3]?.trim() || "admin") as "admin" | "user";

  if (!email || !email.includes("@")) {
    console.error("Usage: npm run admin:promote -- <email> [admin|user]");
    process.exit(1);
  }
  if (role !== "admin" && role !== "user") {
    console.error("Role must be 'admin' or 'user'.");
    process.exit(1);
  }

  try {
    const [existing] = await db
      .select({ id: user.id, email: user.email, role: user.role })
      .from(user)
      .where(eq(user.email, email))
      .limit(1);

    if (!existing) {
      console.error(`User not found: ${email}`);
      process.exit(1);
    }

    await db
      .update(user)
      .set({ role, emailVerified: true })
      .where(eq(user.id, existing.id));

    console.log(
      JSON.stringify({
        ok: true,
        userId: existing.id,
        email: existing.email,
        previousRole: existing.role ?? "user",
        role,
      }),
    );
  } finally {
    await closeDb();
  }
}

main().catch((err) => {
  console.error("Failed to update user role:", err instanceof Error ? err.message : err);
  process.exit(1);
});
