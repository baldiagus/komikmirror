import React from "react";
import type { PublicAdDTO } from "@/dal/ads";

function buildSandboxedAdDoc(rawCode: string): string {
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

export function AdSlot({ ad }: { ad: PublicAdDTO | null }) {
  if (!ad) return null;

  if (ad.adType === "network") {
    if (!ad.networkCode) return null;
    const style = {
      "--ad-h-desktop": `${ad.frameHeightDesktop}px`,
      "--ad-h-mobile": `${ad.frameHeightMobile}px`,
    } as React.CSSProperties;

    return (
      <aside
        className="ad-slot ad-slot-network"
        data-ad-slot={ad.slot}
        data-ad-id={ad.id}
        aria-label={`Iklan ${ad.name}`}
      >
        <span className="ad-label" aria-hidden="true">
          Iklan
        </span>
        <div className="ad-network-wrap" style={style}>
          <iframe
            className="ad-network-frame"
            title={`Iklan: ${ad.name}`}
            srcDoc={buildSandboxedAdDoc(ad.networkCode)}
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            referrerPolicy="no-referrer"
            loading="lazy"
          />
        </div>
      </aside>
    );
  }

  const fallbackImg = ad.desktopImageUrl ?? ad.mobileImageUrl;
  if (!fallbackImg) return null;

  return (
    <aside
      className="ad-slot ad-slot-banner"
      data-ad-slot={ad.slot}
      data-ad-id={ad.id}
      aria-label={`Iklan ${ad.imageAlt}`}
    >
      <span className="ad-label" aria-hidden="true">
        Iklan
      </span>
      <a
        className="ad-banner-link"
        href={ad.clickUrl}
        target={ad.openInNewTab ? "_blank" : undefined}
        rel={ad.openInNewTab ? "noopener noreferrer sponsored" : "sponsored"}
      >
        <picture>
          {ad.mobileImageUrl && (
            <source media="(max-width: 640px)" srcSet={ad.mobileImageUrl} />
          )}
          <img
            className="ad-banner-img"
            src={fallbackImg}
            alt={ad.imageAlt}
            loading="lazy"
            decoding="async"
          />
        </picture>
      </a>
    </aside>
  );
}
