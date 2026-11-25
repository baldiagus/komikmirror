# Rencana migrasi Komik Mirror: Next.js, MySQL, Better Auth

Status: usulan untuk disetujui; belum ada perubahan aplikasi atau lingkungan.

## Target

Pindahkan katalog dan pembaca dari Node/HTML/JavaScript ke Next.js tanpa mengganti logo, layout, atau URL publik yang sudah digunakan. CRUD berarti admin mengelola seri, chapter, cover, dan urutan panel; pembaca yang login mengelola pustaka dan riwayatnya sendiri. Katalog dan chapter berstatus terbit tetap publik. Tidak ada migrasi sesi Shinigami. Chat, komunitas multiuser, Aura, pembayaran, dan notifikasi tidak ikut dipindahkan pada paket CRUD ini. Jangan menutup server lama kalau ada halaman yang masih diperlukan pengguna tetapi belum dipindahkan.

### Peta kemampuan

| Modul | Tanggung jawab | Bergantung pada |
| --- | --- | --- |
| `runtime` | Compose, migrasi skema, secret, log, volume dan backup | — |
| `identity` | Login, logout, sesi, pemulihan akun, dan role | `runtime` |
| `library-catalog` | Baca katalog publik, kelola seri/chapter/media, impor snapshot | `runtime`; mutasi lewat `identity` |
| `reader-library` | Riwayat, bookmark, antrean milik akun | `identity`, `library-catalog` |

Urutan: `runtime` → `identity` → `library-catalog` → `reader-library` → cutover.

## Keputusan stack

| Pilihan | Keputusan |
| --- | --- |
| Next.js App Router + TypeScript | Gunakan versi stabil yang masih dipelihara, lockfile dan Node LTS yang kompatibel. Server Components memanggil DAL (`server-only`) langsung; Server Actions untuk formulir CRUD; Route Handlers untuk Better Auth dan streaming media. Tidak perlu REST/GraphQL terpisah untuk UI yang sama. |
| MySQL 8.4 LTS + `drizzle-orm`, `mysql2`, `drizzle-kit` | Pool `mysql2` pada runtime Node, migrator satu koneksi. Simpan migrasi SQL dalam Git, pakai `drizzle-kit generate` dan `migrate`, bukan `push` untuk deployment. |
| Better Auth + adapter Drizzle MySQL | Pasang handler di `/api/auth/[...all]`. Better Auth CLI menghasilkan skema yang sesuai opsi/plugin; Drizzle Kit menerapkan migrasinya bersama skema aplikasi. Kunci versi Better Auth, CLI, dan adapter yang saling kompatibel. |
| Zod | Validasi server untuk formulir, parameter filter, dan baris impor. Gunakan form bawaan React/Next.js terlebih dahulu. |
| Playwright Test | Uji browser untuk login, hak akses, CRUD, pembaca, dan verifikasi responsif. Uji integrasi memakai MySQL disposable, bukan SQLite atau volume pengguna. |
| Nodemailer + Mailpit | SMTP melalui Nodemailer untuk verifikasi/reset; Mailpit sebagai profil Compose lokal. Produksi memakai penyedia SMTP yang dipilih sebelum membuka pendaftaran. |
| FFmpeg `libwebp` | Pertahankan cover WebP maksimal 360 px, kualitas 75. FFmpeg ada di image job media, bukan DB atau proses server utama. |

Gunakan CSS/komponen yang ada. Jangan tambah Redis, object storage, Elasticsearch, tRPC, atau komponen UI baru sebelum kebutuhan terukur. Simpan media di filesystem satu host; evaluasi object storage bila ada lebih dari satu replika web atau kebutuhan backup media terpisah.

## Docker Compose

| Service | Berjalan kapan | Akses |
| --- | --- | --- |
| `db` | Selalu | MySQL di network DB privat, volume `mysql_data`, tanpa host port. Healthcheck melakukan query ringan yang terautentikasi. |
| `migrate` | Job saat deploy/start stack baru | Menunggu DB sehat, memakai kredensial migrasi terpisah. `web` menunggu `service_completed_successfully`. |
| `web` | Selalu | Next.js Node standalone pada produksi; mode dev terpisah untuk hot reload. Hanya `127.0.0.1:3000:3000` dipublikasikan lokal. Akses DB memakai akun terbatas, bukan root. |
| `import` | Job manual | Bind mount snapshot `data/` read-only, tulis volume `media_data` serta tabel katalog; FFmpeg hanya bila diperlukan. Keluar dengan laporan hasil dan status gagal untuk kegagalan fatal. |
| `mailpit` | Profil opsional dev | SMTP internal Compose; UI email di loopback lokal saja. |

`web` dan job impor mengakses `media_data` sesuai kebutuhan (web perlu tulis hanya jika admin mengunggah file); `db` tidak mengakses volume media. Tambahkan network biasa bagi service yang perlu SMTP atau CDN; jangan menaruh `db` di network tersebut. Jangan masukkan `.env`, secret, atau `data/` ke image. Dockerfile multi-stage dengan user non-root untuk runtime; salin `public` dan `.next/static` untuk output standalone. Compose project dan volume berbeda untuk dev, test, dan produksi. Pisahkan backup DB dan media sebagai satu set pemulihan; uji restore sebelum cutover, dan jangan pakai `docker compose down -v` untuk shutdown biasa.

Perintah target setelah implementasi (belum tersedia): `docker compose config -q`, `docker compose up --build -d web`, `docker compose run --rm import --dry-run`, `docker compose run --rm import`, `npm run test:integration`, `npm run test:e2e`.

## Model dan batas akses

| Entitas / aksinya | Aturan |
| --- | --- |
| Seri | PK internal stabil; slug unik untuk entri baru dan pertahankan URL berbasis ID lama. Simpan `source` + `external_id` unik untuk data impor. Status `draft`/`published`/`archived`; tombol hapus mengarsipkan alih-alih menghapus permanen. |
| Chapter | FK seri; nomor `DECIMAL`, bukan integer atau float, dan jangan jadikan nomor kunci identitas. Simpan urutan per seri. ID publik lama tetap dapat dipetakan. Chapter hanya publik bila seri dan chapter terbit. |
| Media | Metadata (storage key, MIME, ukuran byte/dimensi) di DB, file di volume; panel punya posisi unik per chapter. Reorder transaksional. Unggah memvalidasi batas byte, format aktual serta dimensi/pixel count; storage key buatan server. Jangan jadikan URL/path dari browser sebagai input fetch yang dijalankan oleh server. Untuk konten draft, endpoint media menegakkan akses yang sama dengan chapter. |
| Pustaka | Bookmark dan urutan baca unik per `(user_id, series_id)`; simpan chapter/progres dan timestamp untuk riwayat. FK ke pengguna dan katalog; pembatasan selalu menggunakan ID sesi di server, bukan `user_id` yang dikirim klien. |
| Akun | Better Auth mengelola user/account/session/verification dan role. Pengunjung baca publik; pengguna menulis data sendiri; admin memutasi katalog. Role awal lewat perintah operator eksplisit, bukan email atau role dari form publik. |

`/admin/series`, `/admin/series/[id]` dan form chapter menjadi antarmuka admin. Setiap Server Action memeriksa sesi dan role/ownership lagi meski halaman sudah dijaga. Hanya DTO yang dibutuhkan UI keluar dari DAL. Pisahkan error validasi, akses, dan konflik; jangan ekspor SQL/secret. Gunakan sesi cookie Better Auth, origin yang dikonfigurasi, HTTPS di lingkungan publik, verifikasi email/reset dan rate limit login. Pendaftaran publik tetap ditutup sampai pengiriman email dan pembatasan login diuji. Aksi publish memeriksa file terdaftar ada; file ditulis dulu ke staging, kemudian dipublikasikan dan dicatat secara terkendali, sehingga kegagalan tidak mempublikasikan objek parsial.

## Migrasi snapshot dan rollback

- Inventaris lokal yang benar-benar dibaca: `data/catalog.json` berisi **1.000 seri unik dan 4.162 baris chapter unik**. **710** memakai pola fallback sintetis `<seriesId>-1`; jangan terbitkan sebagai chapter asli. **16** nomor chapter fraksional; pertahankan. **5** cover tidak menunjuk ke media lokal; laporkan terpisah. Daftar chapter asal belum lengkap; scraper lama mengambil paling banyak satu respons daftar chapter per seri.
- Simpan baseline JSON/cache sebelum perubahan. Importer streaming/dengan batch kecil: dry run, validasi dan upsert dari `(source, external_id)`, diulang tidak membuat duplikat. Jangan timpa edit admin atau terbitkan ulang entri yang diarsipkan. Catat apa yang baru, dilewati, gagal, atau tidak punya file. Pertahankan URL detail/reader yang valid; chapter tanpa panel memunculkan status yang jujur, bukan panel palsu. Gunakan media yang memang diizinkan untuk dipakai.
- `localStorage` adalah data per browser, bukan akun yang bisa dikonversi otomatis. Setelah login, tawarkan satu kali impor dengan persetujuan untuk bookmark, antrean dan riwayat yang ID-nya dapat dipetakan; jangan impor cookie/token. Browser storage terikat origin, jadi perpindahan port membutuhkan ekspor lalu impor berkas, atau migrasi di origin yang sama. Cadangan lokal jangan dihapus otomatis.
- Jalankan Next.js di port berbeda sampai smoke test dan restore lulus. Saat cutover, hentikan penulisan pada jalur lama, catat baseline dan snapshot. Bila rollback diperlukan, arahkan trafik ke versi lama, simpan DB/media baru, dan jangan berpura-pura bahwa perubahan selama cutover terbaca oleh server JSON lama. Rekonsiliasi perubahan sebelum melanjutkan penulisan.

## Urutan kerja dan kriteria lulus

Lihat [checklist implementasi](todo.md). Gate utama: (1) stack bersih siap dan auth benar; (2) katalog lama terbaca dan admin bisa CRUD; (3) pustaka akun terisolasi dan restore terbukti. Jangan menjalankan implementasi sebelum cakupan dan asumsi di atas disetujui.

## Rujukan teknis

Dokumentasi diambil via Context7 untuk [Next.js DAL dan Server Actions](https://nextjs.org/docs/app/guides/data-security), [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), [Better Auth Next.js](https://better-auth.com/docs/integrations/next), [Drizzle + MySQL](https://orm.drizzle.team/docs/get-started/mysql-existing) dan [urutan startup Docker Compose](https://docs.docker.com/compose/how-tos/startup-order/). Rujukan resmi tambahan: [Better Auth Drizzle](https://better-auth.com/docs/adapters/drizzle), [Better Auth Admin](https://better-auth.com/docs/plugins/admin), [MySQL LTS](https://dev.mysql.com/doc/refman/8.4/en/mysql-releases.html), [Zod](https://zod.dev/basics), [Playwright](https://playwright.dev/docs/test-webserver).
