"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { clearHistoryAction } from "@/actions/library";

export function ClearHistoryButton() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onClear() {
    setMessage(null);
    startTransition(async () => {
      const res = await clearHistoryAction();
      if (res.ok) {
        setMessage(res.message ?? "Riwayat dihapus.");
        router.refresh();
      } else {
        setMessage(res.error);
      }
    });
  }

  return (
    <div className="actions" style={{ marginBlock: 0 }}>
      <button
        type="button"
        className="danger-btn"
        onClick={onClear}
        disabled={isPending}
      >
        {isPending ? "Menghapus..." : "Hapus semua riwayat baca"}
      </button>
      {message && <span className="meta">{message}</span>}
    </div>
  );
}
