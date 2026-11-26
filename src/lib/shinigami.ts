export const SHINIGAMI_API_BASE = "https://api.shinigami.io";
export const SHINIGAMI_SITE_ORIGIN = "https://s1.shinigami.mx";

export const SHINIGAMI_SOURCES = new Set([
  "shinigami-snapshot",
  "shinigami-sync",
]);

const UUID_RE = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i;

const ALLOWED_IMAGE_SUFFIXES = [
  "shinigami.gg",
  "shinigami.io",
  "shinigami.id",
  "shinigami.mx",
  "shngm.id",
  "shngm.io",
  "cloudimg.io",
];

const UPSTREAM_HEADERS: Record<string, string> = {
  Accept: "application/json",
  Origin: SHINIGAMI_SITE_ORIGIN,
  Referer: `${SHINIGAMI_SITE_ORIGIN}/`,
};

export interface UpstreamShinigamiManga {
  manga_id: string;
  title: string;
  country_id?: string | null;
  status?: number | null;
  rank?: number | null;
  bookmark_count?: number | null;
  user_rate?: number | string | null;
  description?: string | null;
  latest_chapter_number?: number | string | null;
  latest_chapter_time?: string | null;
  updated_at?: string | null;
  cover_portrait_url?: string | null;
  cover_image_url?: string | null;
  taxonomy?: {
    Genre?: { name?: string | null }[] | null;
  } | null;
}

export interface UpstreamShinigamiChapter {
  chapter_id: string;
  chapter_number?: number | string | null;
  chapter_title?: string | null;
  release_date?: string | null;
  created_at?: string | null;
}

export interface RemotePanelItem {
  id: string;
  url: string;
  position: number;
}

export function isShinigamiSource(source: string | null | undefined): boolean {
  return Boolean(source && SHINIGAMI_SOURCES.has(source));
}

export function isUuid(value: string | null | undefined): value is string {
  return Boolean(value && UUID_RE.test(value));
}

export function isSafeRemoteImageUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== "https:") return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      host.endsWith(".internal") ||
      /^\d{1,3}(\.\d{1,3}){3}$/.test(host) ||
      host.includes(":")
    ) {
      return false;
    }
    return ALLOWED_IMAGE_SUFFIXES.some(
      (suffix) => host === suffix || host.endsWith(`.${suffix}`),
    );
  } catch {
    return false;
  }
}

export function normalizeShinigamiType(
  countryId: string | null | undefined,
): "Manhwa" | "Manhua" | "Manga" {
  if (countryId === "CN") return "Manhua";
  if (countryId === "JP") return "Manga";
  return "Manhwa";
}

export function normalizeShinigamiStatus(
  status: number | null | undefined,
): "Ongoing" | "Completed" | "Hiatus" {
  if (status === 2) return "Completed";
  if (status === 3) return "Hiatus";
  return "Ongoing";
}

export function normalizeDecimalNumber(
  value: number | string | null | undefined,
): string | null {
  if (value === null || value === undefined || value === "") return null;
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0 || num >= 100_000_000) return null;
  return num.toFixed(2);
}

export function normalizeRating(
  value: number | string | null | undefined,
): string {
  const num = Number(value ?? 0);
  if (!Number.isFinite(num) || num < 0) return "0.0";
  return Math.min(10, num).toFixed(1);
}

async function sleep(ms: number): Promise<void> {
  if (ms <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchShinigamiJson<T>(
  pathWithQuery: string,
  options?: { retries?: number; timeoutMs?: number },
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const retries = options?.retries ?? 3;
  const timeoutMs = options?.timeoutMs ?? 12_000;
  const url = `${SHINIGAMI_API_BASE}${pathWithQuery}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: UPSTREAM_HEADERS,
        signal: AbortSignal.timeout(timeoutMs),
        cache: "no-store",
      });
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          const retryAfterSec = Number(res.headers.get("retry-after") ?? 0);
          const backoffMs =
            retryAfterSec > 0
              ? Math.min(retryAfterSec * 1000, 10_000)
              : 1500 * attempt;
          await sleep(backoffMs);
          continue;
        }
        return { ok: false, status: res.status, data: null };
      }
      if (!res.ok) {
        return { ok: false, status: res.status, data: null };
      }
      const json = (await res.json()) as T;
      return { ok: true, status: res.status, data: json };
    } catch {
      if (attempt < retries) {
        await sleep(1000 * attempt);
        continue;
      }
      return { ok: false, status: 0, data: null };
    }
  }
  return { ok: false, status: 0, data: null };
}

export async function fetchShinigamiMangaPage(
  offset: number,
  limit = 100,
  sortOrder: "desc" | "asc" = "desc",
): Promise<{
  ok: boolean;
  status: number;
  items: UpstreamShinigamiManga[];
  hasNext: boolean;
}> {
  const safeLimit = Math.max(1, Math.min(100, limit));
  const safeOffset = Math.max(0, Math.min(999, offset));
  const res = await fetchShinigamiJson<{
    data?: UpstreamShinigamiManga[];
    meta?: { has_next?: boolean };
  }>(
    `/v1/manga/list?sort=latest&sort_order=${sortOrder}&offset=${safeOffset}&limit=${safeLimit}`,
  );
  return {
    ok: res.ok,
    status: res.status,
    items: Array.isArray(res.data?.data) ? res.data.data : [],
    hasNext: Boolean(res.data?.meta?.has_next),
  };
}

export async function fetchShinigamiChapters(
  mangaExternalId: string,
  options?: { limit?: number; maxPages?: number; delayMs?: number },
): Promise<{ ok: boolean; chapters: UpstreamShinigamiChapter[] }> {
  if (!isUuid(mangaExternalId)) return { ok: false, chapters: [] };
  const limit = Math.max(1, Math.min(100, options?.limit ?? 100));
  const maxPages = Math.max(1, Math.min(50, options?.maxPages ?? 1));
  const delayMs = options?.delayMs ?? 250;

  const collected: UpstreamShinigamiChapter[] = [];
  const seen = new Set<string>();
  let cursor: string | null = null;

  for (let page = 0; page < maxPages; page++) {
    if (page > 0) await sleep(delayMs);
    const qs: string = cursor
      ? `limit=${limit}&cursor=${encodeURIComponent(cursor)}`
      : `limit=${limit}`;
    const res = await fetchShinigamiJson<{
      data?: UpstreamShinigamiChapter[];
      meta?: { has_next?: boolean; next_cursor?: string | null };
    }>(`/v1/chapter/${mangaExternalId}/list?${qs}`);

    if (!res.ok) {
      return { ok: collected.length > 0, chapters: collected };
    }
    const batch = Array.isArray(res.data?.data) ? res.data.data : [];
    for (const ch of batch) {
      if (ch?.chapter_id && isUuid(ch.chapter_id) && !seen.has(ch.chapter_id)) {
        seen.add(ch.chapter_id);
        collected.push(ch);
      }
    }
    const nextCursor: string | null = res.data?.meta?.next_cursor ?? null;
    if (!res.data?.meta?.has_next || !nextCursor || batch.length === 0) {
      break;
    }
    cursor = nextCursor;
  }

  return { ok: true, chapters: collected };
}

// Short-lived in-memory TTL cache for remote chapter panel URLs (zero disk writes)
const PANEL_CACHE_TTL_MS = 15 * 60 * 1000;
const PANEL_CACHE_MAX = 500;

declare global {
  var __komikRemotePanelCache:
    | Map<string, { expiresAt: number; panels: RemotePanelItem[] }>
    | undefined;
}

function getPanelCache() {
  if (!globalThis.__komikRemotePanelCache) {
    globalThis.__komikRemotePanelCache = new Map();
  }
  return globalThis.__komikRemotePanelCache;
}

export function clearRemotePanelCache() {
  getPanelCache().clear();
}

export async function fetchShinigamiChapterPanels(
  chapterExternalId: string,
): Promise<RemotePanelItem[]> {
  if (!isUuid(chapterExternalId)) return [];

  const cache = getPanelCache();
  const cached = cache.get(chapterExternalId);
  const now = Date.now();
  if (cached && cached.expiresAt > now) {
    return cached.panels;
  }

  const res = await fetchShinigamiJson<{
    data?: {
      base_url?: string | null;
      chapter?: {
        path?: string | null;
        data?: string[] | null;
      } | null;
    } | null;
  }>(`/v1/chapter/detail/${chapterExternalId}`, { retries: 2, timeoutMs: 8_000 });

  if (!res.ok || !res.data?.data) {
    return [];
  }

  const baseRaw = res.data.data.base_url?.trim();
  const pathPrefix = (res.data.data.chapter?.path ?? "").replace(/^\/+/, "");
  const files = res.data.data.chapter?.data;

  if (!baseRaw || !Array.isArray(files) || files.length === 0) {
    return [];
  }

  const normalizedBase = baseRaw.replace(/\/?$/, "/");
  const panels: RemotePanelItem[] = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    if (typeof file !== "string" || !file.trim()) continue;
    try {
      const fullUrl = new URL(pathPrefix + file.trim(), normalizedBase).href;
      if (isSafeRemoteImageUrl(fullUrl)) {
        panels.push({
          id: `remote-${chapterExternalId}-${i + 1}`,
          url: fullUrl,
          position: i + 1,
        });
      }
    } catch {
      // Skip malformed entry
    }
  }

  if (panels.length > 0) {
    if (cache.size >= PANEL_CACHE_MAX) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }
    cache.set(chapterExternalId, {
      expiresAt: now + PANEL_CACHE_TTL_MS,
      panels,
    });
  }

  return panels;
}
