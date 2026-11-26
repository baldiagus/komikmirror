"use client";

import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icons";
import type { PublicAdDTO } from "@/dal/ads";

const STORAGE_KEY = "komik-reader-interstitial-v1";

interface InterstitialState {
  lastShownAt: number;
  lastChapterId: string;
}

function readStoredState(): InterstitialState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<InterstitialState>;
    if (
      typeof parsed.lastShownAt === "number" &&
      Number.isFinite(parsed.lastShownAt) &&
      typeof parsed.lastChapterId === "string"
    ) {
      return {
        lastShownAt: parsed.lastShownAt,
        lastChapterId: parsed.lastChapterId,
      };
    }
  } catch {
    // Ignore storage read errors
  }
  return null;
}

function writeStoredState(state: InterstitialState) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore storage write errors
  }
}

function buildSandboxedInterstitialDoc(rawCode: string): string {
  return [
    "<!doctype html>",
    "<html>",
    "<head>",
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<base target="_blank">',
    "<style>",
    "html,body{margin:0;padding:0;width:100%;height:100%;background:transparent;overflow:hidden;display:flex;align-items:center;justify-content:center;font-family:system-ui,-apple-system,sans-serif;color:#ededed;}",
    "img,iframe{max-width:100%;}",
    "</style>",
    "</head>",
    "<body>",
    rawCode,
    "</body>",
    "</html>",
  ].join("");
}

export function ReaderInterstitialAd({
  ad,
  chapterPublicId,
}: {
  ad: PublicAdDTO | null;
  chapterPublicId: string;
}) {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState(0);
  const reportedRef = useRef<string | null>(null);

  // Trigger ONLY on chapter open / navigation to a new chapter (never mid-reading!)
  useEffect(() => {
    if (!ad) {
      setOpen(false);
      return;
    }

    const now = Date.now();
    const cooldownMs = Math.max(1, ad.cooldownMinutes) * 60_000;
    const prev = readStoredState();

    const shouldShow =
      !prev ||
      (prev.lastChapterId !== chapterPublicId &&
        now - prev.lastShownAt >= cooldownMs);

    if (!shouldShow) {
      setOpen(false);
      return;
    }

    const delay = Math.max(0, Math.min(15, ad.closeDelaySeconds));
    writeStoredState({ lastShownAt: now, lastChapterId: chapterPublicId });
    setRemaining(delay);
    setOpen(true);

    // Record real popup impression once per chapter open
    const reportKey = `${ad.id}:${chapterPublicId}`;
    if (reportedRef.current !== reportKey) {
      reportedRef.current = reportKey;
      const url = `/api/ads/impression/${ad.id}`;
      if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
        navigator.sendBeacon(url);
      } else {
        void fetch(url, { method: "POST", keepalive: true }).catch(() => {});
      }
    }
  }, [ad, chapterPublicId]);

  // Countdown tick (1s interval until 0)
  useEffect(() => {
    if (!open || remaining <= 0) return;
    const timer = window.setTimeout(() => {
      setRemaining((s) => Math.max(0, s - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [open, remaining]);

  // Lock page scroll while popup is open & allow Escape once countdown finishes
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && remaining === 0) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, remaining]);

  if (!open || !ad) return null;

  const canClose = remaining === 0;
  const fallbackImg = ad.desktopImageUrl ?? ad.mobileImageUrl;

  return (
    <div
      className="ad-interstitial-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Iklan ${ad.name}`}
      data-ad-interstitial={ad.id}
      onClick={(e) => {
        if (canClose && e.target === e.currentTarget) {
          setOpen(false);
        }
      }}
    >
      <div className="surface ad-interstitial-dialog">
        <div className="ad-interstitial-head">
          <span className="ad-label">Iklan</span>
          {canClose ? (
            <button
              type="button"
              className="ad-interstitial-close"
              onClick={() => setOpen(false)}
              aria-label="Tutup iklan"
              title="Tutup iklan"
              data-ad-interstitial-close
            >
              <Icon name="close" size={18} />
            </button>
          ) : (
            <span
              className="ad-interstitial-countdown num"
              aria-live="polite"
              data-ad-interstitial-countdown
            >
              Tutup dalam {remaining} dtk
            </span>
          )}
        </div>

        <div className="ad-interstitial-body">
          {ad.adType === "network" && ad.networkCode ? (
            <div
              className="ad-interstitial-network-wrap"
              style={
                {
                  "--ad-h-desktop": `${Math.max(220, ad.frameHeightDesktop)}px`,
                  "--ad-h-mobile": `${Math.max(220, ad.frameHeightMobile)}px`,
                } as React.CSSProperties
              }
            >
              <iframe
                className="ad-network-frame"
                title={`Iklan: ${ad.name}`}
                srcDoc={buildSandboxedInterstitialDoc(ad.networkCode)}
                sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : fallbackImg ? (
            <a
              className="ad-interstitial-link"
              href={ad.clickUrl}
              target={ad.openInNewTab ? "_blank" : undefined}
              rel={
                ad.openInNewTab
                  ? "noopener noreferrer sponsored"
                  : "sponsored"
              }
            >
              <picture>
                {ad.mobileImageUrl && (
                  <source
                    media="(max-width: 640px)"
                    srcSet={ad.mobileImageUrl}
                  />
                )}
                <img
                  className="ad-interstitial-img"
                  src={fallbackImg}
                  alt={ad.imageAlt}
                />
              </picture>
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}
