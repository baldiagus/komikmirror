const PALETTES: [string, string][] = [
  ["#59202e", "#e2b8c2"],
  ["#6e2d18", "#f0be73"],
  ["#3c344a", "#d7b568"],
  ["#4a1d2d", "#ebd0d5"],
  ["#324222", "#efd08a"],
  ["#322949", "#b8b9e8"],
  ["#223e4e", "#a9d7db"],
  ["#463137", "#ebc09f"],
];

function hashIndex(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return h;
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => {
    const map: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[c] ?? c;
  });
}

export function fallbackCoverDataUri(title: string, seed: string): string {
  const idx = hashIndex(seed);
  const [base, ink] = PALETTES[idx % PALETTES.length];
  const horizon = 170 + ((idx * 41) % 155);
  const moon = 56 + ((idx * 41) % 188);
  const words = title.trim().split(/\s+/).slice(0, 8);
  const mid = Math.ceil(words.length / 2);
  const line1 = escapeXml(words.slice(0, mid).join(" "));
  const line2 = escapeXml(words.slice(mid).join(" "));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 450"><defs><linearGradient id="sky" x2=".65" y2="1" gradientUnits="objectBoundingBox"><stop stop-color="${base}"/><stop offset="1" stop-color="#101016"/></linearGradient><linearGradient id="shade" x2="0" y2="1"><stop stop-color="#0a0a0d" stop-opacity="0"/><stop offset="1" stop-color="#0a0a0d"/></linearGradient></defs><path fill="url(#sky)" d="M0 0h300v450H0z"/><circle cx="${moon}" cy="108" r="64" fill="${ink}" opacity=".16"/><circle cx="${moon}" cy="108" r="44" fill="${ink}" opacity=".72"/><path d="M0 ${horizon} 45 224 82 184 130 232 182 164 217 193 261 144 300 173V450H0Z" fill="#101017" opacity=".63"/><path d="M9 9h282v432H9z" fill="none" stroke="${ink}" stroke-opacity=".45"/><path d="M0 315h300v135H0z" fill="url(#shade)"/><g text-anchor="middle" font-family="Georgia,serif" font-size="22" font-weight="bold" fill="${ink}" stroke="#14111a" stroke-width="2" paint-order="stroke"><text x="150" y="366">${line1}</text><text x="150" y="398">${line2}</text></g></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}
