import path from "node:path";

export function getAppOrigin(): string {
  return (
    process.env.APP_ORIGIN ??
    process.env.BETTER_AUTH_URL ??
    "http://127.0.0.1:3000"
  ).replace(/\/+$/, "");
}

export function isPublicSignupAllowed(): boolean {
  return process.env.ALLOW_PUBLIC_SIGNUP === "true";
}

export function getMediaRoot(): string {
  const dir = process.env.MEDIA_ROOT ?? "./tmp-media";
  return path.resolve(/*turbopackIgnore: true*/ dir);
}

export function getSnapshotDir(): string {
  const dir = process.env.SNAPSHOT_DIR ?? "./data";
  return path.resolve(/*turbopackIgnore: true*/ dir);
}
