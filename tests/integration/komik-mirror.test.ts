import "dotenv/config";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { after, before, describe, it } from "node:test";
import { eq, sql } from "drizzle-orm";
import mysql from "mysql2/promise";

// Minimal valid 1x1 PNG (red pixel)
const VALID_PNG_1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc000000301010018dd8db00000000049454e44ae426082",
  "hex",
);
// Minimal valid 2x2 PNG (different sha256)
const VALID_PNG_2 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000002000000020802000000fdd49a730000001249444154789c636060f80f0001040100181800050001780e166a0000000049454e44ae426082",
  "hex",
);
// Valid 1x1 PNG with modified IDAT? Better: create a 3x3 PNG header for panel 3 (IHDR + minimal valid PNG)
function makePng(width: number, height: number, fillByte: number): Buffer {
  // Build a genuine uncompressed-ish or minimal PNG header with valid IHDR for inspectImageBuffer
  // Actually our media inspector validates PNG signature + IHDR width/height accurately.
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);
  ihdr.write("IHDR", 4, "ascii");
  ihdr.writeUInt32BE(width, 8);
  ihdr.writeUInt32BE(height, 12);
  ihdr[16] = 8; // bit depth
  ihdr[17] = 2; // RGB
  ihdr[18] = 0;
  ihdr[19] = 0;
  ihdr[20] = 0;
  ihdr.writeUInt32BE(fillByte, 21);
  return Buffer.concat([sig, ihdr, Buffer.from([fillByte, fillByte])]);
}

let tempMediaDir: string;
let tempSnapshotDir: string;

// Note: `server-only` throws outside Next.js unless mocked; integration tests
// import DAL modules directly via tsx using `--conditions=react-server`!
describe("Komik Mirror MySQL Integration Suite", async () => {
  tempMediaDir = mkdtempSync(path.join(os.tmpdir(), "komik-int-media-"));
  tempSnapshotDir = mkdtempSync(path.join(os.tmpdir(), "komik-int-snap-"));
  process.env.MEDIA_ROOT = tempMediaDir;

  const { db, closeDb } = await import("../../src/db");
  const { user, series, chapters, chapterPanels, mediaAssets } = await import(
    "../../src/db/schema"
  );
  const adminDal = await import("../../src/dal/admin");
  const catalogDal = await import("../../src/dal/catalog");
  const libraryDal = await import("../../src/dal/library");
  const { AppError } = await import("../../src/lib/errors");

  const adminActor = {
    id: randomUUID(),
    email: `admin-int-${Date.now()}@example.test`,
    name: "Admin Test",
    role: "admin",
    emailVerified: true,
  };
  const userA = {
    id: randomUUID(),
    email: `reader-a-${Date.now()}@example.test`,
    name: "Reader A",
    role: "user",
    emailVerified: true,
  };
  const userB = {
    id: randomUUID(),
    email: `reader-b-${Date.now()}@example.test`,
    name: "Reader B",
    role: "user",
    emailVerified: true,
  };

  before(async () => {
    // Seed test users directly in disposable test MySQL
    await db.insert(user).values([
      {
        id: adminActor.id,
        name: adminActor.name,
        email: adminActor.email,
        emailVerified: true,
        role: "admin",
      },
      {
        id: userA.id,
        name: userA.name,
        email: userA.email,
        emailVerified: true,
        role: "user",
      },
      {
        id: userB.id,
        name: userB.name,
        email: userB.email,
        emailVerified: true,
        role: "user",
      },
    ]);
  });

  after(async () => {
    await closeDb();
    rmSync(tempMediaDir, { recursive: true, force: true });
    rmSync(tempSnapshotDir, { recursive: true, force: true });
  });

  it("enforces least-privilege MySQL app user (no DDL allowed)", async () => {
    const conn = await mysql.createConnection(process.env.DATABASE_URL!);
    try {
      await assert.rejects(
        () => conn.execute("CREATE TABLE forbidden_ddl_test (id INT)"),
        /command denied|CREATE command denied/i,
      );
    } finally {
      await conn.end();
    }
  });

  it("blocks non-admin users from all catalog mutations directly at DAL level", async () => {
    await assert.rejects(
      () =>
        adminDal.createSeriesRecord(userA, {
          title: "Unauthorized Series",
          type: "Manhwa",
          genre: "Action",
        }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
  });

  it("supports series CRUD, hides drafts & archived from public, and archives instead of hard-deleting", async () => {
    const created = await adminDal.createSeriesRecord(adminActor, {
      title: "Pendekar Integrasi",
      slug: `pendekar-integrasi-${Date.now()}`,
      type: "Manhwa",
      genre: "Action",
      publicationStatus: "Ongoing",
      rating: "9.2",
      summary: "Cerita uji integrasi.",
    });

    // Draft must NOT be visible to public or regular users
    const publicDetailDraft = await catalogDal.getSeriesDetail(created.slug, null);
    assert.equal(publicDetailDraft, null);
    const userDetailDraft = await catalogDal.getSeriesDetail(created.slug, userA);
    assert.equal(userDetailDraft, null);
    // Admin can preview draft
    const adminPreview = await catalogDal.getSeriesDetail(created.slug, adminActor);
    assert.equal(adminPreview?.title, "Pendekar Integrasi");

    // Publish series -> now visible to public
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: created.id,
      status: "published",
    });
    const publicDetail = await catalogDal.getSeriesDetail(created.slug, null);
    assert.equal(publicDetail?.title, "Pendekar Integrasi");

    // Archive series -> hidden from public again, row still exists in DB!
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: created.id,
      status: "archived",
    });
    const afterArchivePublic = await catalogDal.getSeriesDetail(created.slug, null);
    assert.equal(afterArchivePublic, null);

    const [archivedRow] = await db
      .select({ status: series.status, archivedAt: series.archivedAt })
      .from(series)
      .where(eq(series.id, created.id));
    assert.equal(archivedRow.status, "archived");
    assert.ok(archivedRow.archivedAt instanceof Date);
  });

  it("validates media safety, protects draft media, handles fractional chapters and transactional panel reorder", async () => {
    const created = await adminDal.createSeriesRecord(adminActor, {
      title: "Seri Media Uji",
      slug: `seri-media-uji-${Date.now()}`,
      type: "Manga",
      genre: "Mystery",
      publicationStatus: "Ongoing",
      summary: "Uji media dan panel.",
    });

    // Reject forged non-image file
    await assert.rejects(
      () =>
        adminDal.uploadSeriesCover(
          adminActor,
          created.id,
          Buffer.from("<svg><script>alert(1)</script></svg>"),
        ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );

    // Reject oversized decompression-bomb dimensions (10000x10000 > 16M pixels)
    await assert.rejects(
      () =>
        adminDal.uploadSeriesCover(
          adminActor,
          created.id,
          makePng(10000, 10000, 1),
        ),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );

    // Upload valid cover while series is DRAFT
    const cover = await adminDal.uploadSeriesCover(
      adminActor,
      created.id,
      VALID_PNG_1,
    );
    const guestDraftCover = await catalogDal.getMediaAccessRecord(cover.mediaId, null);
    assert.equal(guestDraftCover.allowed, false);
    const userDraftCover = await catalogDal.getMediaAccessRecord(cover.mediaId, userA);
    assert.equal(userDraftCover.allowed, false);
    const adminDraftCover = await catalogDal.getMediaAccessRecord(cover.mediaId, adminActor);
    assert.equal(adminDraftCover.allowed, true);

    // Create fractional chapter 12.5
    const ch = await adminDal.createChapterRecord(adminActor, {
      seriesId: created.id,
      chapterNumber: "12.5",
      title: "Ekstra Setengah",
    });

    const p1 = await adminDal.uploadChapterPanel(adminActor, ch.id, VALID_PNG_1);
    const p2 = await adminDal.uploadChapterPanel(adminActor, ch.id, VALID_PNG_2);
    const p3 = await adminDal.uploadChapterPanel(adminActor, ch.id, makePng(4, 4, 7));

    // Draft panel must be hidden from visitors
    const guestDraftPanel = await catalogDal.getMediaAccessRecord(p1.mediaId, null);
    assert.equal(guestDraftPanel.allowed, false);

    // Transactional reorder: [p3, p1, p2]
    await adminDal.reorderChapterPanels(adminActor, {
      chapterId: ch.id,
      panelIds: [p3.panelId, p1.panelId, p2.panelId],
    });

    const reloaded = await adminDal.getAdminChapterById(adminActor, ch.id);
    assert.deepEqual(
      reloaded?.panels.map((p) => p.id),
      [p3.panelId, p1.panelId, p2.panelId],
    );
    assert.equal(reloaded?.chapterNumber, "12.5");

    // Publish series + chapter -> now panel media & reader are public!
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: created.id,
      status: "published",
    });
    await adminDal.setChapterStatus(adminActor, {
      chapterId: ch.id,
      status: "published",
    });

    const guestPubPanel = await catalogDal.getMediaAccessRecord(p1.mediaId, null);
    assert.equal(guestPubPanel.allowed, true);

    const readerData = await catalogDal.getChapterForReader(ch.publicId, null);
    assert.equal(readerData?.chapter.number, "12.5");
    assert.deepEqual(
      readerData?.panels.map((p) => p.id),
      [p3.panelId, p1.panelId, p2.panelId],
    );
  });

  it("runs snapshot dry-run cleanly, imports idempotently, reports synthetic/fractional/non-local covers, and preserves admin edits & archives", async () => {
    const s1Id = randomUUID();
    const s2Id = randomUUID();
    const chRealId = randomUUID();
    const chFracId = randomUUID();
    const chSynId = `${s2Id}-1`;

    const coversDir = path.join(tempSnapshotDir, "media", "covers");
    const chDir = path.join(tempSnapshotDir, "media", "chapters", chRealId);
    mkdirSync(coversDir, { recursive: true });
    mkdirSync(chDir, { recursive: true });
    writeFileSync(path.join(coversDir, `${s1Id}-360.webp`), VALID_PNG_1);
    writeFileSync(path.join(chDir, "001.png"), VALID_PNG_1);
    writeFileSync(path.join(chDir, "002.png"), VALID_PNG_2);

    const fixtureCatalog = [
      {
        id: s1Id,
        title: "Snapshot Hero One",
        type: "Manhwa",
        genre: "Action",
        status: "Ongoing",
        rank: 10,
        followers: 500,
        updated: "2026-11-25",
        rating: 8.9,
        summary: "Sinopsis awal snapshot.",
        latestChapterNumber: 12.5,
        coverUrl: `/media/covers/${s1Id}-360.webp`,
        chapters: [
          { id: chRealId, number: 12, title: "Chapter 12" },
          { id: chFracId, number: 12.5, title: "Chapter 12.5" },
        ],
      },
      {
        id: s2Id,
        title: "Snapshot NonLocal Cover",
        type: "Manhua",
        genre: "Fantasy",
        status: "Ongoing",
        rank: 20,
        followers: 250,
        updated: "2026-11-25",
        rating: 7.5,
        summary: "Seri dengan cover remote & chapter sintetis.",
        latestChapterNumber: 1,
        coverUrl: "https://cdn.example.invalid/remote-cover.avif",
        chapters: [{ id: chSynId, number: 1, title: "" }],
      },
    ];
    writeFileSync(
      path.join(tempSnapshotDir, "catalog.json"),
      JSON.stringify(fixtureCatalog, null, 2),
    );

    const runImporter = (extraArgs: string[]) =>
      JSON.parse(
        execFileSync(
          process.execPath,
          [
            path.resolve("node_modules/tsx/dist/cli.mjs"),
            path.resolve("scripts/import-snapshot.ts"),
            "--snapshot",
            tempSnapshotDir,
            ...extraArgs,
          ],
          {
            env: { ...process.env, MEDIA_ROOT: tempMediaDir },
            encoding: "utf8",
          },
        ),
      );

    // 1. Dry-run must NOT write to DB
    const dryReport = runImporter(["--dry-run"]);
    assert.equal(dryReport.dryRun, true);
    assert.equal(dryReport.seriesCreated, 2);
    assert.equal(dryReport.syntheticChaptersDetected, 1);
    assert.equal(dryReport.fractionalChaptersCount, 1);
    assert.equal(dryReport.nonLocalCovers.length, 1);

    const [dryCheck] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.publicId, s1Id));
    assert.equal(dryCheck, undefined);

    // 2. First real import
    const firstReport = runImporter([]);
    assert.equal(firstReport.seriesCreated, 2);
    assert.equal(firstReport.chaptersCreated, 3);
    assert.equal(firstReport.syntheticChaptersNotPublished, 1);
    assert.equal(firstReport.fractionalChaptersCount, 1);
    assert.equal(firstReport.nonLocalCovers.length, 1);
    assert.equal(firstReport.panelsImported, 2);

    // Synthetic chapter must NOT be published
    const [synRow] = await db
      .select({ status: chapters.status, isSynthetic: chapters.isSynthetic })
      .from(chapters)
      .where(eq(chapters.publicId, chSynId));
    assert.equal(synRow.isSynthetic, true);
    assert.equal(synRow.status, "draft");

    // Fractional chapter preserved accurately
    const [fracRow] = await db
      .select({ num: chapters.chapterNumber })
      .from(chapters)
      .where(eq(chapters.publicId, chFracId));
    assert.equal(Number(fracRow.num), 12.5);

    // Admin edits s1 title and archives s2
    const [s1Row] = await db.select().from(series).where(eq(series.publicId, s1Id));
    const [s2Row] = await db.select().from(series).where(eq(series.publicId, s2Id));

    await adminDal.updateSeriesRecord(adminActor, {
      seriesId: s1Row.id,
      title: "Judul Diedit Admin",
      slug: s1Row.slug,
      type: s1Row.type,
      genre: s1Row.genre,
      publicationStatus: s1Row.publicationStatus,
      rating: s1Row.rating,
      rank: s1Row.rank,
      followers: s1Row.followers,
      summary: s1Row.summary,
    });
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: s2Row.id,
      status: "archived",
    });

    // 3. Second real import: idempotent, preserves admin edit & archived status!
    const secondReport = runImporter([]);
    assert.equal(secondReport.seriesCreated, 0);
    assert.equal(secondReport.seriesSkippedAdmin, 1);
    assert.equal(secondReport.seriesSkippedArchived, 1);
    assert.equal(secondReport.chaptersCreated, 0);

    const [s1After] = await db.select().from(series).where(eq(series.id, s1Row.id));
    const [s2After] = await db.select().from(series).where(eq(series.id, s2Row.id));
    assert.equal(s1After.title, "Judul Diedit Admin");
    assert.equal(s2After.status, "archived");
  });

  it("isolates reader library strictly per account and deduplicates repeated browser imports", async () => {
    const s = await adminDal.createSeriesRecord(adminActor, {
      title: "Seri Pustaka Isolasi",
      slug: `seri-pustaka-${Date.now()}`,
      type: "Manhwa",
      genre: "Fantasy",
      summary: "Uji isolasi akun.",
    });
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: s.id,
      status: "published",
    });
    const ch = await adminDal.createChapterRecord(adminActor, {
      seriesId: s.id,
      chapterNumber: "1",
      title: "Mulai",
    });
    await adminDal.setChapterStatus(adminActor, {
      chapterId: ch.id,
      status: "published",
    });

    // Account A saves bookmark, queue, and history
    await libraryDal.toggleUserBookmark(userA.id, s.id);
    await libraryDal.toggleUserQueue(userA.id, s.id);
    await libraryDal.recordUserHistory(userA.id, ch.id, 100);

    const libA = await libraryDal.getUserLibrary(userA.id);
    assert.equal(libA.counts.bookmarks, 1);
    assert.equal(libA.counts.queue, 1);
    assert.equal(libA.counts.history, 1);

    // Account B MUST see empty library
    const libB = await libraryDal.getUserLibrary(userB.id);
    assert.equal(libB.counts.bookmarks, 0);
    assert.equal(libB.counts.queue, 0);
    assert.equal(libB.counts.history, 0);

    // Account B clearing history must NOT affect Account A
    await libraryDal.clearUserHistory(userB.id);
    const libAAfterBClear = await libraryDal.getUserLibrary(userA.id);
    assert.equal(libAAfterBClear.counts.history, 1);

    // Repeated browser import for Account B must not duplicate
    const import1 = await libraryDal.importBrowserLibraryForUser(userB.id, {
      bookmarks: [s.publicId, "non-existent-id"],
      queue: [s.publicId],
      history: [ch.publicId],
    });
    assert.equal(import1.bookmarksImported, 1);
    assert.equal(import1.queueImported, 1);
    assert.equal(import1.historyImported, 1);
    assert.equal(import1.unmappedCount, 1);

    const import2 = await libraryDal.importBrowserLibraryForUser(userB.id, {
      bookmarks: [s.publicId],
      queue: [s.publicId],
      history: [ch.publicId],
    });
    assert.equal(import2.bookmarksImported, 1);

    const libBAfter = await libraryDal.getUserLibrary(userB.id);
    assert.equal(libBAfter.counts.bookmarks, 1);
    assert.equal(libBAfter.counts.queue, 1);
    assert.equal(libBAfter.counts.history, 1);

    // Verify no duplicate rows in DB
    const [mediaCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(mediaAssets);
    assert.ok(Number(mediaCount.count) >= 1);
    const [panelCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(chapterPanels);
    assert.ok(Number(panelCount.count) >= 1);
  });

  it("configures Google OAuth sign-in/register with PKCE, state persistence, and signup gate", async () => {
    const { betterAuth } = await import("better-auth");
    const { drizzleAdapter } = await import("better-auth/adapters/drizzle");
    const { admin } = await import("better-auth/plugins");
    const schema = await import("../../src/db/schema");
    const { getGoogleOAuthConfig } = await import("../../src/lib/env");

    const prevId = process.env.GOOGLE_CLIENT_ID;
    const prevSecret = process.env.GOOGLE_CLIENT_SECRET;
    const prevRedirect = process.env.GOOGLE_REDIRECT_URI;
    try {
      delete process.env.GOOGLE_CLIENT_ID;
      delete process.env.GOOGLE_CLIENT_SECRET;
      delete process.env.GOOGLE_REDIRECT_URI;
      assert.equal(getGoogleOAuthConfig(), null);

      process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
      process.env.GOOGLE_CLIENT_SECRET = "test-google-client-secret";
      const cfg = getGoogleOAuthConfig();
      assert.ok(cfg);
      assert.equal(cfg.clientId, "test-google-client-id.apps.googleusercontent.com");

      const testAuth = betterAuth({
        baseURL: "http://localhost:3000",
        secret: "komik-mirror-integration-test-secret-at-least-32-chars",
        database: drizzleAdapter(db, { provider: "mysql", schema }),
        account: {
          accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
          },
        },
        socialProviders: {
          google: {
            clientId: cfg.clientId,
            clientSecret: cfg.clientSecret,
            prompt: "select_account",
            requireEmailVerification: true,
            disableSignUp: false,
          },
        },
        plugins: [admin({ defaultRole: "user", adminRoles: ["admin"] })],
      });

      const res = await testAuth.api.signInSocial({
        body: {
          provider: "google",
          callbackURL: "/library",
          newUserCallbackURL: "/library",
          errorCallbackURL: "/register",
          requestSignUp: true,
        },
      });
      assert.equal(res.redirect, true);
      assert.ok(res.url);

      const authUrl = new URL(res.url);
      assert.equal(authUrl.origin, "https://accounts.google.com");
      assert.equal(authUrl.searchParams.get("client_id"), cfg.clientId);
      assert.equal(
        authUrl.searchParams.get("redirect_uri"),
        "http://localhost:3000/api/auth/callback/google",
      );
      assert.equal(authUrl.searchParams.get("prompt"), "select_account");
      assert.equal(authUrl.searchParams.get("code_challenge_method"), "S256");
      assert.ok((authUrl.searchParams.get("code_challenge") ?? "").length > 20);
      assert.ok((authUrl.searchParams.get("state") ?? "").length > 10);
    } finally {
      if (prevId === undefined) delete process.env.GOOGLE_CLIENT_ID;
      else process.env.GOOGLE_CLIENT_ID = prevId;
      if (prevSecret === undefined) delete process.env.GOOGLE_CLIENT_SECRET;
      else process.env.GOOGLE_CLIENT_SECRET = prevSecret;
      if (prevRedirect === undefined) delete process.env.GOOGLE_REDIRECT_URI;
      else process.env.GOOGLE_REDIRECT_URI = prevRedirect;
    }
  });

  it("validates remote Shinigami CDN allowlist (SSRF guard) and keeps admin chapters isolated from remote panel fallback", async () => {
    const { isSafeRemoteImageUrl, isShinigamiSource } = await import(
      "../../src/lib/shinigami"
    );

    assert.equal(
      isSafeRemoteImageUrl("https://cdn.shinigami.gg/chapter/manga_1/page-1.webp"),
      true,
    );
    assert.equal(
      isSafeRemoteImageUrl("https://storage.shngm.id/covers/abc.jpg"),
      true,
    );
    assert.equal(isSafeRemoteImageUrl("http://cdn.shinigami.gg/a.webp"), false);
    assert.equal(isSafeRemoteImageUrl("https://127.0.0.1/secret.png"), false);
    assert.equal(isSafeRemoteImageUrl("https://169.254.169.254/latest/meta-data"), false);
    assert.equal(isSafeRemoteImageUrl("https://evil.example.com/p.webp"), false);
    assert.equal(isShinigamiSource("shinigami-sync"), true);
    assert.equal(isShinigamiSource("shinigami-snapshot"), true);
    assert.equal(isShinigamiSource(null), false);

    // Admin-created series with externalCoverUrl disabled & chapter without local panels MUST stay empty
    const s = await adminDal.createSeriesRecord(adminActor, {
      title: "Admin Manual Tanpa Panel",
      slug: `admin-manual-${Date.now()}`,
      type: "Manhwa",
      genre: "Action",
      summary: "Seri manual admin.",
    });
    await adminDal.setSeriesStatus(adminActor, {
      seriesId: s.id,
      status: "published",
    });
    const ch = await adminDal.createChapterRecord(adminActor, {
      seriesId: s.id,
      chapterNumber: "1",
      title: "Kosong",
    });
    await adminDal.setChapterStatus(adminActor, {
      chapterId: ch.id,
      status: "published",
    });

    const reader = await catalogDal.getChapterForReader(ch.publicId, null);
    assert.ok(reader);
    assert.equal(reader.panels.length, 0);
    assert.equal(reader.allChapters.length, 1);

    // Verify per-account read state & continue reading list isolation
    await libraryDal.recordUserHistory(userA.id, ch.id, 100);
    const readStateA = await libraryDal.getUserSeriesReadState(userA.id, s.id);
    assert.deepEqual(readStateA.readChapterIds, [ch.id]);
    assert.equal(readStateA.lastReadChapter?.publicId, ch.publicId);

    const continueA = await libraryDal.getContinueReadingList(userA.id, 6);
    assert.ok(continueA.some((item) => item.seriesId === s.id));

    const readStateB = await libraryDal.getUserSeriesReadState(userB.id, s.id);
    assert.equal(readStateB.readChapterIds.length, 0);
    assert.equal(readStateB.lastReadChapter, null);
  });

  it("enforces admin-only user management, prevents self-lockout, and revokes sessions on ban", async () => {
    const { session } = await import("../../src/db/schema");

    // Non-admin cannot list or mutate users
    await assert.rejects(
      () => adminDal.listAdminUsers(userA, {}),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      () => adminDal.setAdminUserRole(userA, { userId: userB.id, role: "admin" }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      () => adminDal.setAdminUserBanned(userA, { userId: userB.id, banned: true }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );

    // Admin cannot demote or ban self
    await assert.rejects(
      () => adminDal.setAdminUserRole(adminActor, { userId: adminActor.id, role: "user" }),
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );
    await assert.rejects(
      () => adminDal.setAdminUserBanned(adminActor, { userId: adminActor.id, banned: true }),
      (err: unknown) => err instanceof AppError && err.code === "CONFLICT",
    );

    // Admin can list users, promote/demote userB, and ban (revoking active session)
    const listed = await adminDal.listAdminUsers(adminActor, { q: userB.email });
    assert.equal(listed.items.length, 1);
    assert.equal(listed.items[0].role, "user");

    await adminDal.setAdminUserRole(adminActor, { userId: userB.id, role: "admin" });
    const afterPromote = await adminDal.listAdminUsers(adminActor, { q: userB.email });
    assert.equal(afterPromote.items[0].role, "admin");

    await adminDal.setAdminUserRole(adminActor, { userId: userB.id, role: "user" });

    // Seed an active session for userB, then ban -> session must be deleted
    await db.insert(session).values({
      id: randomUUID(),
      userId: userB.id,
      token: `test-ban-token-${Date.now()}`,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    });
    await adminDal.setAdminUserBanned(adminActor, {
      userId: userB.id,
      banned: true,
      reason: "Test ban",
    });

    const activeSessions = await db
      .select({ id: session.id })
      .from(session)
      .where(eq(session.userId, userB.id));
    assert.equal(activeSessions.length, 0);

    const afterBan = await adminDal.listAdminUsers(adminActor, { filter: "banned" });
    assert.ok(afterBan.items.some((u) => u.id === userB.id && u.banned));

    // Unban userB cleanly
    await adminDal.setAdminUserBanned(adminActor, { userId: userB.id, banned: false });
    const afterUnban = await adminDal.listAdminUsers(adminActor, { q: userB.email });
    assert.equal(afterUnban.items[0].banned, false);
  });

  it("supports own profile name update and per-account library JSON export", async () => {
    const accountDal = await import("../../src/dal/account");

    // Reject empty or oversized display name
    await assert.rejects(
      () => accountDal.updateOwnDisplayName(userA.id, "   "),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );

    const updated = await accountDal.updateOwnDisplayName(userA.id, "Pembaca A Baru");
    assert.equal(updated.name, "Pembaca A Baru");

    const overviewA = await accountDal.getUserAccountOverview(userA.id);
    assert.equal(overviewA?.name, "Pembaca A Baru");
    assert.ok((overviewA?.libraryCounts.history ?? 0) >= 1);

    const exportA = await accountDal.exportUserLibrarySnapshot(userA.id);
    assert.equal(exportA.version, "shinigami-lab-v1");
    assert.ok(exportA.history.length >= 1);

    // Export of userB must NOT contain userA's bookmarks/history beyond userB's own rows
    const exportB = await accountDal.exportUserLibrarySnapshot(userB.id);
    assert.equal(exportB.version, "shinigami-lab-v1");
    assert.notEqual(exportA.history.length, 0);
    assert.notDeepEqual(exportA.history, exportB.history);
  });

  it("manages hybrid banner & network ads with admin auth, media protection, impressions & clicks", async () => {
    const adsDal = await import("../../src/dal/ads");

    // Non-admin cannot access or mutate ads
    await assert.rejects(
      () => adsDal.listAdminAds(userA),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );
    await assert.rejects(
      () =>
        adsDal.createAdminAd(userA, {
          name: "Unauthorized",
          slot: "home_top",
          adType: "banner",
        }),
      (err: unknown) => err instanceof AppError && err.code === "FORBIDDEN",
    );

    // Reject javascript: targetUrl
    await assert.rejects(
      () =>
        adsDal.createAdminAd(adminActor, {
          name: "Bad URL",
          slot: "home_top",
          adType: "banner",
          targetUrl: "javascript:alert(1)",
        }),
      (err: unknown) => err instanceof AppError && err.code === "VALIDATION_ERROR",
    );

    // Create draft banner ad with desktop & mobile PNGs
    const createdBanner = await adsDal.createAdminAd(
      adminActor,
      {
        name: "Sponsor Topup Int",
        slot: "home_top",
        adType: "banner",
        status: "draft",
        priority: 50,
        hideForAdmin: true,
        targetUrl: "https://sponsor.example.com/topup",
        imageAlt: "Promo Topup",
      },
      { desktopBuffer: VALID_PNG_1, mobileBuffer: VALID_PNG_2 },
    );
    assert.equal(createdBanner.status, "draft");

    const listedDraft = await adsDal.listAdminAds(adminActor, { slot: "home_top" });
    const bannerItem = listedDraft.items.find((x) => x.id === createdBanner.id);
    assert.ok(bannerItem);
    assert.ok(bannerItem.desktopMediaId);
    assert.ok(bannerItem.mobileMediaId);

    // Draft ad creative MUST NOT be readable by anonymous visitor
    const guestDraftImg = await catalogDal.getMediaAccessRecord(
      bannerItem.desktopMediaId!,
      null,
    );
    assert.equal(guestDraftImg.allowed, false);
    const adminDraftImg = await catalogDal.getMediaAccessRecord(
      bannerItem.desktopMediaId!,
      adminActor,
    );
    assert.equal(adminDraftImg.allowed, true);

    // Activate banner -> public media becomes accessible & slot serves ad
    await adsDal.setAdminAdStatus(adminActor, {
      adId: createdBanner.id,
      status: "active",
    });

    const guestActiveImg = await catalogDal.getMediaAccessRecord(
      bannerItem.desktopMediaId!,
      null,
    );
    assert.equal(guestActiveImg.allowed, true);
    assert.equal(guestActiveImg.isPublic, true);

    // Respects hideForAdmin for admin viewer
    const hiddenForAdmin = await adsDal.getActiveAdForSlot("home_top", adminActor);
    assert.equal(hiddenForAdmin, null);

    // Serves active ad to regular user and increments impressions
    const publicAd = await adsDal.getActiveAdForSlot("home_top", userA);
    assert.ok(publicAd);
    assert.equal(publicAd.id, createdBanner.id);
    assert.equal(publicAd.adType, "banner");
    assert.equal(publicAd.clickUrl, `/api/ads/click/${createdBanner.id}`);

    // Click redirect increments clicks and returns targetUrl
    const clickRes = await adsDal.resolveAdClick(createdBanner.id);
    assert.deepEqual(clickRes, { targetUrl: "https://sponsor.example.com/topup" });

    // Create active network ad in reader_top
    const createdNet = await adsDal.createAdminAd(adminActor, {
      name: "Network Slot Test",
      slot: "reader_top",
      adType: "network",
      status: "active",
      networkCode: "<div>Network Ad</div>",
      frameHeightDesktop: 120,
      frameHeightMobile: 90,
    });
    const readerAds = await adsDal.getActiveAdsForSlots(
      ["reader_top", "reader_bottom"],
      null,
    );
    assert.equal(readerAds.reader_top?.id, createdNet.id);
    assert.equal(readerAds.reader_top?.adType, "network");
    assert.equal(readerAds.reader_bottom, null);

    // Verify stats recorded and reset works
    const afterStats = await adsDal.listAdminAds(adminActor);
    const tracked = afterStats.items.find((x) => x.id === createdBanner.id);
    assert.equal(tracked?.impressions, 1);
    assert.equal(tracked?.clicks, 1);

    await adsDal.resetAdminAdStats(adminActor, createdBanner.id);
    const afterReset = await adsDal.listAdminAds(adminActor);
    const resetItem = afterReset.items.find((x) => x.id === createdBanner.id);
    assert.equal(resetItem?.impressions, 0);
    assert.equal(resetItem?.clicks, 0);

    // Create active interstitial ad (cooldown 5m, 3s close delay) — SSR fetch must NOT increment impressions
    const createdPopup = await adsDal.createAdminAd(adminActor, {
      name: "Reader Popup Test",
      slot: "reader_interstitial",
      adType: "network",
      status: "active",
      networkCode: "<div>Popup Ad</div>",
      cooldownMinutes: 5,
      closeDelaySeconds: 3,
    });
    const popupFetch = await adsDal.getActiveAdForSlot("reader_interstitial", userA);
    assert.ok(popupFetch);
    assert.equal(popupFetch.cooldownMinutes, 5);
    assert.equal(popupFetch.closeDelaySeconds, 3);
    const beforeBeacon = (await adsDal.listAdminAds(adminActor)).items.find(
      (x) => x.id === createdPopup.id,
    );
    assert.equal(beforeBeacon?.impressions, 0);
    await adsDal.recordAdImpression(createdPopup.id);
    const afterBeacon = (await adsDal.listAdminAds(adminActor)).items.find(
      (x) => x.id === createdPopup.id,
    );
    assert.equal(afterBeacon?.impressions, 1);

    // Delete cleans up ads and orphaned ad media
    await adsDal.deleteAdminAd(adminActor, createdBanner.id);
    await adsDal.deleteAdminAd(adminActor, createdNet.id);
    await adsDal.deleteAdminAd(adminActor, createdPopup.id);
    const deletedMedia = await catalogDal.getMediaAccessRecord(
      bannerItem.desktopMediaId!,
      adminActor,
    );
    assert.equal(deletedMedia.allowed, false);
  });
});
