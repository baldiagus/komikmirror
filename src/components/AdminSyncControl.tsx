"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { triggerShinigamiSyncAction } from "@/actions/admin";

export function AdminSyncControl({
  intervalMinutes,
}: {
  intervalMinutes: number;
}) {
  const router = useRouter();
  const [busyMode, setBusyMode] = useState<"incremental" | "full" | null>(null);
  const [status, setStatus] = useState<{
    kind: "ok" | "error";
    text: string;
  } | null>(null);

  async function handleSync(mode: "incremental" | "full") {
    setBusyMode(mode);
    setStatus(null);
    try {
      const res = await triggerShinigamiSyncAction(mode);
      if (!res.ok) {
        setStatus({ kind: "error", text: res.error });
        return;
      }
      setStatus({ kind: "ok", text: res.message ?? "Sinkronisasi selesai." });
      router.refresh();
    } finally {
      setBusyMode(null);
    }
  }

  return (
    <section className="surface side" style={{ marginBottom: 16 }}>
      <div className="section-heading" style={{ marginBlock: 0 }}>
        <div>
          <h2 style={{ fontSize: 16, marginBottom: 4 }}>
            Sinkronisasi Otomatis Shinigami
          </h2>
          <p className="meta" style={{ margin: 0 }}>
            Worker menyinkronkan metadata &amp; chapter terbaru tiap{" "}
            {intervalMinutes} menit tanpa menyimpan file panel ke disk. Edit
            manual &amp; arsip admin tidak ditimpa.
          </p>
        </div>
        <div className="actions" style={{ marginBlock: 0 }}>
          <button
            type="button"
            className="chip"
            disabled={busyMode !== null}
            onClick={() => handleSync("incremental")}
          >
            {busyMode === "incremental"
              ? "Menyinkronkan..."
              : "Sync Update Terbaru"}
          </button>
          <button
            type="button"
            className="chip"
            disabled={busyMode !== null}
            onClick={() => handleSync("full")}
          >
            {busyMode === "full"
              ? "Memindai Katalog..."
              : "Sync Katalog Penuh"}
          </button>
        </div>
      </div>
      {status && (
        <div
          className={`alert ${status.kind}`}
          role={status.kind === "error" ? "alert" : "status"}
          style={{ marginTop: 12, marginBottom: 0 }}
        >
          {status.text}
        </div>
      )}
    </section>
  );
}
