# Checklist implementasi Komik Mirror

Rencana: [plan.md](plan.md). Implementasi CRUD selesai dan terverifikasi pada stack Docker/MySQL/Better Auth/Playwright; cutover trafik pengguna dan secret produksi belum dijalankan.

| Urutan | Task | Bergantung pada | Bukti lulus |
| --- | --- | --- | --- |
| 1 | Scaffold Next.js dan Compose (`db`, `migrate`, `web`) | — | `docker compose --env-file .env.example config -q` lulus (exit 0); stack fresh `db` healthy -> `migrate` selesai -> `web` healthy; `db` tanpa host port dan hanya di `db_net` (`Internal=true`); `web` user non-root `node` tanpa `ffmpeg`; restart mempertahankan 1.000 seri / 4.162 chapter / 1.421 media. |
| 2 | Login/logout, verifikasi email, dan reset password | 1 | Playwright Chromium: signup API dengan `role:"admin"` ditolak (`400 FIELD_NOT_ALLOWED`), verifikasi email & reset password sekali pakai via Mailpit (klik ulang ditolak), login & logout memutus sesi; `ALLOW_PUBLIC_SIGNUP=false` menolak signup (`400 EMAIL_PASSWORD_SIGN_UP_DISABLED`). |
| 3 | Admin dan CRUD seri | 2 | Integrasi MySQL & Playwright: admin buat/ubah/terbitkan/arsipkan seri; pengunjung dan user biasa diblokir (403 UI & `FORBIDDEN` langsung di DAL); draft & arsip tidak muncul di katalog publik; arsip mempertahankan baris DB. |
| 4 | Unggah cover dan CRUD chapter/panel | 3 | Integrasi MySQL & Playwright: format/dimensi tidak valid ditolak (`VALIDATION_ERROR`), nomor chapter fraksional (`1.5`, `12.5`) tersimpan sebagai `DECIMAL(10,2)`, urut ulang panel transaksional bertahan setelah reload, media draft mengembalikan 404 untuk pengunjung dan 200 setelah terbit. |
| 5 | Impor katalog dan media | 4 | `docker compose run --rm import --dry-run` (0 tulis DB) dan 2x `import`: 1.000 seri, 4.162 chapter, 710 sintetis tidak diterbitkan, 16 fraksional, 995 cover lokal, 5 cover non-lokal dilaporkan terpisah, 426 panel; impor kedua 0 duplikat dan tidak menimpa edit admin atau arsip. |
| 6 | Sambungkan beranda, pencarian, detail, dan pembaca ke MySQL | 5 | Playwright & HTTP: deep link `/series/3b1cbf24-...` dan `/chapter/724577b5-...` mengembalikan 200, Project `Muat lainnya` memuat batch tambahan, filter/pencarian `/series` bekerja, navigasi chapter berikut/sebelumnya benar, chapter tanpa panel menampilkan status jujur tanpa panel palsu, 0 overflow horizontal pada 390 px. |
| 7 | Bookmark, antrean, riwayat dan impor data browser dengan persetujuan | 2, 6 | Integrasi MySQL & Playwright: dua akun terisolasi penuh (akun B melihat 0 item milik akun A), impor `shinigami-lab-v1` atas persetujuan idempoten tanpa duplikasi, cadangan `localStorage` tidak dihapus otomatis. |
| 8 | Backup/restore, smoke release, cutover | 1–7 | `scripts/backup.mjs` + `scripts/restore.mjs` memulihkan DB (2,64 MB) + media (371 MB) ke stack kosong `komik_mirror_restore` (SHA-256 cocok; health 200, media WebP 200, login admin 200); `server.mjs` (port 4173) & `data/catalog.json` (1.000 seri) tetap utuh selama simulasi rollback (`stop web`). |

- [x] 1. Scaffold Next.js dan Compose
- [x] 2. Login/logout, verifikasi email, dan reset password
- [x] Gate A: stack isolasi dan autentikasi lulus
- [x] 3. Admin dan CRUD seri
- [x] 4. Unggah cover dan CRUD chapter/panel
- [x] 5. Impor katalog dan media
- [x] 6. Sambungkan UI publik ke MySQL
- [x] Gate B: data dan pembaca lulus, CRUD admin dibatasi dengan benar
- [x] 7. Pustaka per akun dan migrasi sukarela
- [x] 8. Backup/restore, smoke release, persiapan & simulasi rollback (cutover produksi belum dieksekusi)
- [x] Gate C: privasi lintas akun, integritas DB/media, dan rollback terbukti

## Bukti verifikasi aktual

Catatan: `server.mjs` pada hasil verifikasi historis di bawah sekarang berada di `legacy/server.mjs`; jalankan `npm run legacy:dev`.

- `docker compose --env-file .env.example config -q` → exit `0`.
- `npm run auth:schema` (`auth@1.7.28`) → menghasilkan `src/db/schema/auth.ts`; `npm run db:generate` (`drizzle-kit@0.31.11`) → menghasilkan `drizzle/0000_nostalgic_speed_demon.sql` (11 tabel).
- `npm run typecheck` (`tsc --noEmit`) & `npm run build` (`next build` standalone) → exit `0`, 0 error, 0 warning.
- `npm run db:migrate` + `npm run test:integration` pada MySQL 8.4 disposable (`docker-compose.test.yml`, akun aplikasi `komik_app` terbatas): **6/6 lulus** (termasuk verifikasi `komik_app` ditolak menjalankan DDL, proteksi DAL non-admin, validasi media & draft isolation, reorder transaksional, dry-run/idempotensi/proteksi edit admin importer, isolasi pustaka lintas akun).
- `docker compose --env-file tmp-verify.env --profile dev up --build -d --wait`: `db` healthy (0 host ports, hanya `db_net` `Internal=true`), `migrate` exit 0, `web` healthy (non-root `node` uid 1000, `NO_FFMPEG`), `mailpit` healthy.
- `docker compose --env-file tmp-verify.env run --rm --build import --dry-run` → `totalSnapshotSeries: 1000`, `totalSnapshotChapters: 4162`, `syntheticChaptersNotPublished: 710`, `fractionalChaptersCount: 16`, `coversImported: 995`, `nonLocalCovers: 5`, `panelsImported: 426`, `validationErrors: []`.
- `docker compose --env-file tmp-verify.env run --rm import` (2x): run #1 menciptakan 1.000 seri, 4.162 chapter, 995 cover, 426 panel; run #2 menciptakan `0` seri, `0` chapter, `0` cover (`995` reused), `0` panel (`426` reused). Restart `db` + `web` mempertahankan 1.000 seri / 4.162 chapter / 1.421 media.
- `npm run test:e2e` (Playwright Chromium terhadap Docker `web` + `db` + `mailpit`): **4/4 lulus** (7,4 dtk).
- `node scripts/backup.mjs` + `node scripts/restore.mjs` ke stack kosong `komik_mirror_restore` (port `3006`, `ALLOW_PUBLIC_SIGNUP=false`): checksum SHA-256 terverifikasi, `/api/health` 200, `/api/media/<coverId>` 200 (`image/webp`), login admin 200, signup publik ditolak 400 (`EMAIL_PASSWORD_SIGN_UP_DISABLED`), server legacy `node server.mjs` (port `4173`) tetap melayani 200 dengan 1.000 item `data/catalog.json` setelah simulasi rollback `stop web`.
