import path from "node:path";

export interface GoogleOAuthConfig {
  clientId: string;
  clientSecret: string;
  redirectURI?: string;
}

export function getAppOrigin(): string {
  return (
    process.env.APP_ORIGIN ??
    process.env.BETTER_AUTH_URL ??
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

export function getTrustedOrigins(): string[] {
  const origins = new Set<string>([getAppOrigin()]);
  const authUrl = process.env.BETTER_AUTH_URL?.trim();
  if (authUrl) {
    origins.add(authUrl.replace(/\/+$/, ""));
  }
  return Array.from(origins);
}

export function isPublicSignupAllowed(): boolean {
  return process.env.ALLOW_PUBLIC_SIGNUP === "true";
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;
  const redirectURI = process.env.GOOGLE_REDIRECT_URI?.trim() || undefined;
  return { clientId, clientSecret, redirectURI };
}

export function isGoogleAuthEnabled(): boolean {
  return getGoogleOAuthConfig() !== null;
}

export function isShinigamiRemotePanelsEnabled(): boolean {
  return process.env.SHINIGAMI_REMOTE_PANELS_ENABLED !== "false";
}

export interface ShinigamiSyncConfig {
  intervalMinutes: number;
  latestPages: number;
  requestDelayMs: number;
  chaptersPerSeries: number;
  maxSeriesChapterFetch: number;
}

export function getShinigamiSyncConfig(): ShinigamiSyncConfig {
  const intervalMinutes = Math.max(
    5,
    Number(process.env.SYNC_INTERVAL_MINUTES ?? 15) || 15,
  );
  const latestPages = Math.max(
    1,
    Math.min(10, Number(process.env.SYNC_LATEST_PAGES ?? 2) || 2),
  );
  const requestDelayMs = Math.max(
    100,
    Number(process.env.SYNC_REQUEST_DELAY_MS ?? 350) || 350,
  );
  const chaptersPerSeries = Math.max(
    10,
    Math.min(100, Number(process.env.SYNC_CHAPTERS_PER_SERIES ?? 100) || 100),
  );
  const maxSeriesChapterFetch = Math.max(
    1,
    Math.min(
      200,
      Number(process.env.SYNC_MAX_SERIES_CHAPTER_FETCH ?? 40) || 40,
    ),
  );
  return {
    intervalMinutes,
    latestPages,
    requestDelayMs,
    chaptersPerSeries,
    maxSeriesChapterFetch,
  };
}

export function getMediaRoot(): string {
  const dir = process.env.MEDIA_ROOT ?? "./tmp-media";
  return path.resolve(/*turbopackIgnore: true*/ dir);
}

export function getSnapshotDir(): string {
  const dir = process.env.SNAPSHOT_DIR ?? "./data";
  return path.resolve(/*turbopackIgnore: true*/ dir);
}
