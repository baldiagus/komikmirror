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
  if (fallback && fallback.trim()) return fallback;
  if (!date) return "Baru";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "Baru";
  return d.toISOString().slice(0, 10);
}
