import { expect, test } from "@playwright/test";

const MAILPIT_URL = process.env.E2E_MAILPIT_URL ?? "http://127.0.0.1:8026";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? "admin-e2e@komik-mirror.local";
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? "AdminPass123!";
const USER_B_EMAIL = process.env.E2E_USER_B_EMAIL ?? "reader-b@komik-mirror.local";
const USER_B_PASSWORD = process.env.E2E_USER_B_PASSWORD ?? "ReaderBPass123!";

// Minimal valid 1x1 and 2x2 PNGs
const PNG_1 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de0000000c49444154789c63f8cfc000000301010018dd8db00000000049454e44ae426082",
  "hex",
);
const PNG_2 = Buffer.from(
  "89504e470d0a1a0a0000000d4948445200000002000000020802000000fdd49a730000001249444154789c636060f80f0001040100181800050001780e166a0000000049454e44ae426082",
  "hex",
);

async function waitForMailLink(
  recipient: string,
  subjectPart: string,
  afterTimestamp = 0,
): Promise<string> {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    const listRes = await fetch(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:${recipient}`)}`,
    );
    if (listRes.ok) {
      const data = (await listRes.json()) as {
        messages?: { ID: string; Subject: string; Created: string }[];
      };
      const match = (data.messages ?? []).find((m) => {
        const created = new Date(m.Created).getTime();
        return (
          m.Subject.toLowerCase().includes(subjectPart.toLowerCase()) &&
          created >= afterTimestamp - 2000
        );
      });
      if (match) {
        const msgRes = await fetch(`${MAILPIT_URL}/api/v1/message/${match.ID}`);
        const msg = (await msgRes.json()) as { Text?: string; HTML?: string };
        const body = `${msg.Text ?? ""} ${msg.HTML ?? ""}`;
        const urlMatch = body.match(/https?:\/\/[^\s"'<>]+/);
        if (urlMatch) return urlMatch[0];
      }
    }
    await new Promise((r) => setTimeout(r, 350));
  }
  throw new Error(`Timed out waiting for Mailpit email (${subjectPart}) to ${recipient}`);
}

test.describe.serial("Komik Mirror End-to-End CRUD, Auth, Reader & Isolation", () => {
  const uniqueSuffix = Date.now();
  const userAEmail = `reader-a-${uniqueSuffix}@komik-mirror.local`;
  const userAPassword = "ReaderAPass123!";
  const userANewPassword = "ReaderANewPass456!";

  let createdSeriesSlug = `e2e-komik-${uniqueSuffix}`;
  let createdSeriesPublicId = createdSeriesSlug;
  let createdChapterPublicId = "";
  let draftPanelMediaUrl = "";

  test("Task 2: Signup cannot escalate role, Mailpit verification & password reset are one-time, logout terminates session", async ({
    page,
    request,
  }) => {
    const startTs = Date.now();

    // Attempt direct API signup with role="admin" — server MUST reject role escalation!
    const origin = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3005";
    const forgedSignup = await request.post("/api/auth/sign-up/email", {
      headers: { Origin: origin },
      data: {
        name: "Reader E2E A",
        email: userAEmail,
        password: userAPassword,
        role: "admin",
        callbackURL: "/verify-email?verified=1",
      },
    });
    expect(forgedSignup.status()).toBe(400);
    const forgedBody = await forgedSignup.json();
    expect(forgedBody.code).toBe("FIELD_NOT_ALLOWED");

    // Legitimate signup via UI creates regular user (no role input)
    await page.goto("/register");
    await expect(page.locator('[data-google-auth="register"]')).toBeVisible();
    await page.locator('input[name="name"]').fill("Reader E2E A");
    await page.locator('input[name="email"]').fill(userAEmail);
    await page.locator('input[name="password"]').fill(userAPassword);
    await page.getByRole("button", { name: "Buat akun" }).click();
    await expect(page.getByRole("status")).toContainText(/Pendaftaran berhasil/i);

    // Verify Google OAuth error mapping on login & register pages
    await page.goto("/login?error=signup_disabled");
    await expect(page.locator('[data-google-auth="login"]')).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toContainText(
      /Pendaftaran akun baru saat ini ditutup/i,
    );
    await page.goto("/register?error=access_denied");
    await expect(page.locator("main").getByRole("alert")).toContainText(
      /Akses Google dibatalkan/i,
    );

    // If Google OAuth credentials are configured in the E2E server, verify redirect URL generation
    if (process.env.E2E_GOOGLE_ENABLED === "true") {
      const socialRes = await request.post("/api/auth/sign-in/social", {
        headers: { Origin: origin },
        data: {
          provider: "google",
          callbackURL: "/library",
          newUserCallbackURL: "/library",
          errorCallbackURL: "/register",
          requestSignUp: true,
          disableRedirect: true,
        },
      });
      expect(socialRes.status()).toBe(200);
      const socialJson = (await socialRes.json()) as { url?: string; redirect?: boolean };
      expect(socialJson.url).toMatch(/^https:\/\/accounts\.google\.com\/o\/oauth2\/v2\/auth\?/);
      const parsedGoogle = new URL(socialJson.url!);
      expect(parsedGoogle.searchParams.get("prompt")).toBe("select_account");
      expect(parsedGoogle.searchParams.get("code_challenge_method")).toBe("S256");
    }

    // Fetch verification link from Mailpit and verify email
    const verifyUrl = await waitForMailLink(userAEmail, "Verifikasi email", startTs);
    await page.goto(verifyUrl);
    await expect(page).toHaveURL(/\/verify-email/);

    // Visiting same verification token a second time must fail/show error (one-time token)
    const secondVerify = await page.goto(verifyUrl);
    expect(secondVerify?.url()).toMatch(/error=/i);

    // Log out first (autoSignInAfterVerification may have signed in)
    await page.goto("/");
    const menu = page.locator("details.user-menu");
    if (await menu.count()) {
      await menu.locator("summary").click();
      await Promise.all([
        page.waitForLoadState("networkidle"),
        page.getByRole("button", { name: "Keluar" }).click(),
      ]);
      await expect(page.locator("header").getByRole("link", { name: "Masuk" })).toBeVisible();
    }

    // Login via UI
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(userAEmail);
    await page.locator('input[name="password"]').fill(userAPassword);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.locator("details.user-menu")).toBeVisible();

    // Regular user CANNOT access /admin/series (must see 403)
    await page.goto("/admin/series");
    await expect(page.getByRole("heading", { name: /Akses Ditolak/i })).toBeVisible();

    // Logout terminates session
    await page.locator("details.user-menu summary").click();
    await Promise.all([
      page.waitForURL((u) => u.pathname === "/"),
      page.getByRole("button", { name: "Keluar" }).click(),
    ]);
    await expect(page.locator("header").getByRole("link", { name: "Masuk" })).toBeVisible();
    await page.goto("/library");
    await expect(page.getByRole("heading", { name: /Masuk untuk membuka Pustaka/i })).toBeVisible();

    // Forgot password -> Mailpit one-time reset link -> set new password
    const resetTs = Date.now();
    await page.goto("/forgot-password");
    await page.locator('input[name="email"]').fill(userAEmail);
    await page.getByRole("button", { name: "Kirim tautan reset" }).click();
    await expect(page.getByRole("status")).toContainText(/tautan reset/i);

    const resetUrl = await waitForMailLink(userAEmail, "Reset kata sandi", resetTs);
    await page.goto(resetUrl);
    await expect(page).toHaveURL(/\/reset-password\?token=/);
    const parsedReset = new URL(page.url());
    const resetToken = parsedReset.searchParams.get("token") ?? "";
    expect(resetToken.length).toBeGreaterThan(8);

    await page.locator('input[name="password"]').fill(userANewPassword);
    await page.locator('input[name="confirm"]').fill(userANewPassword);
    await page.getByRole("button", { name: "Simpan kata sandi" }).click();
    await expect(page.getByRole("status")).toContainText(/berhasil diperbarui/i);

    // Reusing the same reset token MUST fail (single-use)
    const reuseRes = await request.post("/api/auth/reset-password", {
      headers: { Origin: origin },
      data: { token: resetToken, newPassword: "AnotherPassword789!" },
    });
    expect(reuseRes.ok()).toBeFalsy();

    // Login with new password succeeds
    await page.goto("/login");
    await page.locator('input[name="email"]').fill(userAEmail);
    await page.locator('input[name="password"]').fill(userANewPassword);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await expect(page.locator("details.user-menu")).toBeVisible();
  });

  test("Tasks 3 & 4: Admin CRUD series, cover upload, fractional chapter, panel validation/reorder & draft media protection", async ({
    browser,
    page,
  }) => {
    // Login as Admin
    await page.goto("/login?next=/admin/series");
    await page.locator('input[name="email"]').fill(ADMIN_EMAIL);
    await page.locator('input[name="password"]').fill(ADMIN_PASSWORD);
    await page.getByRole("button", { name: "Masuk", exact: true }).click();
    await page.waitForURL((u) => u.pathname === "/admin/series");

    // Create new draft series
    await page.getByRole("link", { name: /Buat Seri Baru/i }).first().click();
    await page.locator('input[name="title"]').fill(`Komik E2E ${uniqueSuffix}`);
    await page.locator('input[name="slug"]').fill(createdSeriesSlug);
    await page.locator('select[name="type"]').selectOption("Manhwa");
    await page.locator('select[name="genre"]').selectOption("Action");
    await page.locator('textarea[name="summary"]').fill("Sinopsis komik E2E.");
    await page.getByRole("button", { name: /Simpan sebagai Draft/i }).click();
    await expect(page).toHaveURL(/\/admin\/series\/[0-9a-f-]{36}$/);

    // Draft series MUST NOT be visible to an anonymous visitor
    const guestContext = await browser.newContext();
    const guestPage = await guestContext.newPage();
    const draftPublicRes = await guestPage.goto(`/series/${createdSeriesSlug}`);
    expect(draftPublicRes?.status()).toBe(404);

    // Reject invalid cover file format
    await page.locator('input[name="cover"]').setInputFiles({
      name: "bad.png",
      mimeType: "image/png",
      buffer: Buffer.from("not-a-real-png-file"),
    });
    await page.getByRole("button", { name: "Unggah Cover", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(/Format gambar tidak valid/i);

    // Upload valid cover PNG
    await page.locator('input[name="cover"]').setInputFiles({
      name: "cover.png",
      mimeType: "image/png",
      buffer: PNG_1,
    });
    await page.getByRole("button", { name: "Unggah Cover", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(/Cover berhasil diunggah/i);

    // Create fractional chapter 1.5
    await page.locator('input[name="chapterNumber"]').fill("1.5");
    await page.getByRole("textbox", { name: /Judul Chapter/i }).fill("Awal Fraksional");
    await page.getByRole("button", { name: /Buat Chapter Draft/i }).click();
    await expect(page).toHaveURL(/\/chapters\/[0-9a-f-]{36}$/);

    // Capture chapter public URL from preview link
    const previewHref = await page
      .getByRole("link", { name: "Pratinjau Pembaca" })
      .getAttribute("href");
    expect(previewHref).toMatch(/^\/chapter\/[0-9a-f-]{36}$/);
    createdChapterPublicId = previewHref!.replace("/chapter/", "");

    // Upload two valid panels
    await page.locator('input[name="panels"]').setInputFiles([
      { name: "p1.png", mimeType: "image/png", buffer: PNG_1 },
      { name: "p2.png", mimeType: "image/png", buffer: PNG_2 },
    ]);
    await page.getByRole("button", { name: "Unggah Panel", exact: true }).click();
    await expect(page.getByRole("status")).toContainText(/2 panel berhasil diunggah/i);

    const panelRows = page.locator("[data-panel-id]");
    await expect(panelRows).toHaveCount(2);
    const firstBefore = await panelRows.nth(0).getAttribute("data-panel-id");
    const secondBefore = await panelRows.nth(1).getAttribute("data-panel-id");
    const firstMediaId = await panelRows.nth(0).getAttribute("data-media-id");
    draftPanelMediaUrl = `/api/media/${firstMediaId}`;

    // Draft panel media MUST NOT be readable by anonymous visitor (404)
    const guestDraftMedia = await guestContext.request.get(draftPanelMediaUrl);
    expect(guestDraftMedia.status()).toBe(404);

    // Reorder: move panel #2 up to position #1
    await page.getByRole("button", { name: "Naikkan panel 2" }).click();
    await expect(page.getByRole("status")).toContainText(/Urutan panel diperbarui/i);

    // Reload page and confirm panel order persisted in MySQL!
    await page.reload();
    await expect(panelRows.nth(0)).toHaveAttribute("data-panel-id", secondBefore!);
    await expect(panelRows.nth(1)).toHaveAttribute("data-panel-id", firstBefore!);

    // Publish chapter and then publish parent series
    await page.getByRole("button", { name: "Terbitkan Chapter" }).click();
    await expect(page.getByRole("status")).toContainText(/Chapter diterbitkan/i);

    await page.getByRole("link", { name: /Kembali ke Komik E2E/i }).click();
    await page.getByRole("button", { name: "Terbitkan Seri" }).click();
    await expect(page.getByRole("status")).toContainText(/Seri diterbitkan/i);

    // Create a second published chapter with NO panels to verify honest empty state & next/prev nav
    await page.locator('input[name="chapterNumber"]').fill("2");
    await page.getByRole("textbox", { name: /Judul Chapter/i }).fill("Tanpa Panel");
    await page.getByRole("button", { name: /Buat Chapter Draft/i }).click();
    await expect(page).toHaveURL(/\/chapters\/[0-9a-f-]{36}$/);
    await page.getByRole("button", { name: "Terbitkan Chapter" }).click();
    await expect(page.getByRole("status")).toContainText(/Chapter diterbitkan/i);

    // Now anonymous visitor CAN access series, reader, and published panel media (200)
    const guestPubMedia = await guestContext.request.get(draftPanelMediaUrl);
    expect(guestPubMedia.status()).toBe(200);
    await guestPage.goto(`/chapter/${createdChapterPublicId}`);
    await expect(guestPage.locator("#chapter-panels img")).toHaveCount(2);

    // Next chapter link goes to Chapter 2 (no panels -> honest empty state, no fake panels!)
    await guestPage.getByRole("link", { name: /Berikutnya \(Ch\. 2\)/i }).first().click();
    await expect(guestPage.locator("#chapter-panels-empty")).toBeVisible();
    await expect(guestPage.locator("#chapter-panels")).toHaveCount(0);

    await guestContext.close();
  });

  test("Task 6: Public home, Project Muat lainnya, catalog search/filter, and 390px responsive check", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator(".brand-logo").first()).toBeVisible();

    const gridTiles = page.locator("[data-project-grid] .tile");
    const initialCount = await gridTiles.count();
    expect(initialCount).toBeGreaterThan(0);

    const loadMoreBtn = page.locator("[data-load-more]");
    if (await loadMoreBtn.isVisible()) {
      await loadMoreBtn.click();
      await expect(gridTiles).toHaveCount(initialCount + 20);
    }

    // Catalog search finds our published E2E series
    await page.goto(`/series?q=${encodeURIComponent(`Komik E2E ${uniqueSuffix}`)}`);
    await expect(
      page.getByRole("link", { name: new RegExp(`Komik E2E ${uniqueSuffix}`) }),
    ).toBeVisible();

    // Responsive 390px overflow check across key public routes
    await page.setViewportSize({ width: 390, height: 844 });
    for (const route of [
      "/",
      "/series",
      `/series/${createdSeriesPublicId}`,
      `/chapter/${createdChapterPublicId}`,
      "/library",
      "/login",
      "/register",
    ]) {
      await page.goto(route);
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(overflow, `Horizontal overflow on ${route} at 390px`).toBeLessThanOrEqual(1);
    }
  });

  test("Task 7: Cross-account library isolation and opt-in idempotent browser import", async ({
    browser,
  }) => {
    // Context A: User A logs in, seeds localStorage legacy data, imports with consent
    const ctxA = await browser.newContext();
    const pageA = await ctxA.newPage();

    await pageA.goto("/login?next=/library");
    await pageA.locator('input[name="email"]').fill(userAEmail);
    await pageA.locator('input[name="password"]').fill(userANewPassword);
    await pageA.getByRole("button", { name: "Masuk", exact: true }).click();
    await pageA.waitForURL((u) => u.pathname === "/library");

    // Seed legacy browser storage key `shinigami-lab-v1`
    await pageA.evaluate(
      ({ sid, cid }) => {
        localStorage.setItem(
          "shinigami-lab-v1",
          JSON.stringify({
            bookmarks: [sid],
            queue: [sid],
            history: [cid],
          }),
        );
      },
      { sid: createdSeriesPublicId, cid: createdChapterPublicId },
    );

    await pageA.reload();
    await expect(
      pageA.getByRole("button", { name: /Setujui & Impor ke Akun Saya/i }),
    ).toBeVisible();

    // First import
    await pageA.getByRole("button", { name: /Setujui & Impor ke Akun Saya/i }).click();
    await expect(pageA.getByRole("status")).toContainText(/Impor selesai: 1 bookmark, 1 antrean, 1 riwayat/i);

    // Local backup MUST NOT be deleted automatically
    const localStillPresent = await pageA.evaluate(() =>
      Boolean(localStorage.getItem("shinigami-lab-v1")),
    );
    expect(localStillPresent).toBe(true);

    // Second import MUST NOT duplicate counts
    await pageA.getByRole("button", { name: /Setujui & Impor ke Akun Saya/i }).click();
    await expect(pageA.getByRole("link", { name: /Bookmark 1/i })).toBeVisible();
    await expect(pageA.getByRole("link", { name: /Riwayat 1/i })).toBeVisible();
    await expect(pageA.getByRole("link", { name: /Antrean 1\/30/i })).toBeVisible();

    // Context B: User B logs in — MUST see ZERO of User A's items!
    const ctxB = await browser.newContext();
    const pageB = await ctxB.newPage();
    await pageB.goto("/login?next=/library");
    await pageB.locator('input[name="email"]').fill(USER_B_EMAIL);
    await pageB.locator('input[name="password"]').fill(USER_B_PASSWORD);
    await pageB.getByRole("button", { name: "Masuk", exact: true }).click();
    await pageB.waitForURL((u) => u.pathname === "/library");

    await expect(pageB.getByRole("link", { name: /Bookmark 0/i })).toBeVisible();
    await expect(pageB.getByRole("link", { name: /Riwayat 0/i })).toBeVisible();
    await expect(pageB.getByRole("link", { name: /Antrean 0\/30/i })).toBeVisible();

    await ctxA.close();
    await ctxB.close();
  });
});
