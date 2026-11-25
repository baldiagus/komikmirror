# Panduan Cutover, Backup/Restore, dan Rollback Komik Mirror

Dokumen ini merangkum pemetaan rute antara server lama (`server.mjs`, port `4173`) dan aplikasi Next.js + MySQL (`web`, port `3000`), prosedur backup/restore terverifikasi, serta simulasi rollback sebelum cutover produksi.

> **Penting:** Implementasi paket CRUD ini **tidak** memotong trafik pengguna, **tidak** menghapus `data/` lokal, dan **tidak** memakai secret produksi.

## 1. Status rute (migrasi vs server lama)

| Kelompok rute | Status di Next.js (`127.0.0.1:3000`) | Catatan |
| --- | --- | --- |
| `/`, `/series`, `/series/[id]`, `/chapter/[chapterId]` | **Dipindahkan ke Next.js + MySQL** | Mempertahankan logo, CSS, deep link ID lama, filter, `Muat lainnya`, dan nomor chapter desimal. Chapter tanpa panel menampilkan status jujur tanpa panel palsu. |
| `/library` | **Dipindahkan ke Next.js + MySQL** | Terisolasi per akun login (`user_bookmarks`, `user_queue`, `user_history`) dengan opsi impor data browser (`shinigami-lab-v1` atau file JSON lintas origin) atas persetujuan pengguna. |
| `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/api/auth/[...all]` | **Baru (Better Auth + SMTP)** | Pendaftaran publik mati secara default (`ALLOW_PUBLIC_SIGNUP=false`) sampai SMTP & rate limit produksi terverifikasi. Role awal hanya lewat perintah operator `npm run admin:promote`. |
| `/admin/series`, `/admin/series/new`, `/admin/series/[id]`, `/admin/series/[id]/chapters/[chapterId]` | **Baru (CRUD Admin)** | Dilindungi pemeriksaan sesi & role di layout dan setiap Server Action. Tombol hapus mengarsipkan seri/chapter. |
| `/api/media/[id]`, `/api/health` | **Baru (Media & Health)** | Media draft/arsip hanya dapat dibaca admin; media terbit publik. Tidak ada fetch URL klien oleh server. |
| `/community*`, `/chat/*`, `/user/*`, `/leaderboard`, `/sistem-aura`, `/panduan*`, `/notifikasi`, `/premium`, `/settings*`, `/onboarding*`, `/claim` | **Tetap di server lama (`server.mjs`, port `4173`)** | Di luar cakupan paket CRUD ini. Jangan mematikan server lama bila pengguna masih memerlukan rute-rute tersebut. |

## 2. Backup dan Restore (DB + Media sebagai satu set)

Gunakan project Compose terpisah untuk `dev`, `test`, dan `prod`. Jangan gunakan `docker compose down -v` untuk shutdown biasa karena perintah tersebut menghapus volume `mysql_data` dan `media_data`.

### Membuat set backup

```sh
node scripts/backup.mjs --project <compose_project> --env-file <env_file> --out backups/<label>
```

Keluaran backup set terdiri dari:
- `db.sql` — dump konsisten MySQL (`mysqldump --single-transaction --routines --triggers --no-tablespaces`)
- `media.tar.gz` — arsip isi volume `media_data`
- `manifest.json` — timestamp + checksum SHA-256 untuk kedua berkas

### Memulihkan set backup ke stack kosong

1. Siapkan stack kosong (`db` sehat dan volume `media_data` terdaftar Compose):
   ```sh
   docker compose -p <target_project> --env-file <env_file> up -d --wait db
   docker compose -p <target_project> --env-file <env_file> create web
   ```
2. Pulihkan DB + volume media (memverifikasi checksum SHA-256 terlebih dahulu):
   ```sh
   node scripts/restore.mjs --project <target_project> --env-file <env_file> --from backups/<label>
   ```
3. Jalankan `web` dan verifikasi login, pembaca, dan CRUD:
   ```sh
   docker compose -p <target_project> --env-file <env_file> up -d web
   ```

## 3. Checklist pra-cutover & simulasi rollback

1. **Baseline sebelum cutover:** Simpan arsip `data/catalog.json` + `data/media/` dan jalankan `scripts/backup.mjs` pada stack Next.js.
2. **Smoke test paralel:** Jalankan Next.js di port `3000` sementara server lama tetap berjalan di port `4173` (`node server.mjs`). Pastikan kedua layanan hidup tanpa konflik dan data `data/` tidak berubah.
3. **Verifikasi prasyarat produksi:**
   - Ganti seluruh secret placeholder di `.env` (`BETTER_AUTH_SECRET`, password MySQL root/migrator/app).
   - Aktifkan HTTPS di reverse proxy dengan `BETTER_AUTH_URL=https://...` dan `APP_ORIGIN=https://...`.
   - Konfigurasikan SMTP produksi sebelum mengubah `ALLOW_PUBLIC_SIGNUP=true`.
4. **Prosedur rollback:**
   - Arahkan reverse proxy kembali ke server lama (`127.0.0.1:4173`) dan hentikan trafik penulisan ke `web` (`docker compose stop web`, **bukan** `down -v`).
   - Pertahankan volume `mysql_data` dan `media_data` untuk audit/rekonsiliasi.
   - Catatan jujur: perubahan CRUD admin atau pustaka akun yang dibuat saat cutover di MySQL **tidak** otomatis muncul di server JSON lama (`data/catalog.json`); lakukan rekonsiliasi sebelum membuka kembali penulisan.
