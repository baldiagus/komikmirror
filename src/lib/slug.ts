export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export function formatChapterNumber(raw: string | number | null | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "0";
  const str = String(raw);
  if (!str.includes(".")) return str;
  return str.replace(/\.?0+$/, "");
}

export function formatDateShort(date: Date | string | null | undefined, fallback?: string | null): string {
  if (date) {
    const d = typeof date === "string" ? new Date(date) : date;
    if (!Number.isNaN(d.getTime())) {
      const diffMs = Date.now() - d.getTime();
      if (diffMs >= 0 && diffMs < 60_000) return "Baru saja";
      if (diffMs >= 0 && diffMs < 60 * 60_000) {
        return `${Math.floor(diffMs / 60_000)} mnt`;
      }
      if (diffMs >= 0 && diffMs < 24 * 60 * 60_000) {
        return `${Math.floor(diffMs / (60 * 60_000))} jam`;
      }
      if (diffMs >= 0 && diffMs < 7 * 24 * 60 * 60_000) {
        return `${Math.floor(diffMs / (24 * 60 * 60_000))} hr`;
      }
      if (diffMs >= 0 && diffMs < 28 * 24 * 60 * 60_000) {
        return `${Math.floor(diffMs / (7 * 24 * 60 * 60_000))} minggu`;
      }
      return d.toISOString().slice(0, 10);
    }
  }
  if (fallback && fallback.trim()) return fallback;
  return "Baru";
}
