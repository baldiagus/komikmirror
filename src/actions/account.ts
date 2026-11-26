"use server";

import { revalidatePath } from "next/cache";
import { updateOwnDisplayName } from "@/dal/account";
import { toActionError, type ActionResult } from "@/lib/errors";
import { requireUser } from "@/lib/session";

export async function updateProfileNameAction(
  formData: FormData,
): Promise<ActionResult<{ name: string }>> {
  try {
    const user = await requireUser();
    const rawName = String(formData.get("name") ?? "");
    const result = await updateOwnDisplayName(user.id, rawName);
    revalidatePath("/settings");
    revalidatePath("/");
    return {
      ok: true,
      data: result,
      message: "Nama tampilan berhasil diperbarui.",
    };
  } catch (err) {
    return toActionError(err);
  }
}
