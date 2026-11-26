"use client";

import React, { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toggleBookmarkAction, toggleQueueAction } from "@/actions/library";
import { Icon } from "@/components/Icons";
import {
  ensureGsapRegistered,
  gsap,
  prefersReducedMotion,
  useGSAP,
} from "@/lib/gsap";

ensureGsapRegistered();

export function LibraryAnimatedContainer({
  tabKey,
  className,
  children,
}: {
  tabKey: string;
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReducedMotion()) return;
      const cards = ref.current?.querySelectorAll("[data-lib-card]");
      if (!cards || cards.length === 0) return;
      gsap.from(cards, {
        opacity: 0,
        y: 12,
        duration: 0.32,
        stagger: 0.025,
        ease: "power2.out",
        clearProps: "transform,opacity",
      });
    },
    { dependencies: [tabKey], scope: ref },
  );

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function RemoveLibraryItemButton({
  kind,
  seriesId,
  title,
}: {
  kind: "bookmark" | "queue";
  seriesId: string;
  title: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRemove() {
    startTransition(async () => {
      if (kind === "bookmark") {
        await toggleBookmarkAction(seriesId);
      } else {
        await toggleQueueAction(seriesId);
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      className="lib-remove-btn"
      onClick={handleRemove}
      disabled={isPending}
      aria-label={`Hapus ${title} dari ${kind === "bookmark" ? "bookmark" : "antrean"}`}
      title={kind === "bookmark" ? "Hapus bookmark" : "Hapus dari antrean"}
    >
      <Icon name="trash" size={14} />
      <span>{isPending ? "..." : "Hapus"}</span>
    </button>
  );
}
