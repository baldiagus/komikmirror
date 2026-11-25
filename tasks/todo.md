# Checklist implementasi Komik Mirror

Rencana: [plan.md](plan.md). Semua item di bawah belum dikerjakan.

| Urutan | Task | Bergantung pada | Bukti lulus |
| --- | --- | --- | --- |
| 1 | Scaffold Next.js dan Compose (`db`, `migrate`, `web`) | — | `docker compose config -q` lulus; stack fresh menunggu DB & migrasi; host tidak bisa mengakses port MySQL; restart mempertahankan data. |
| 2 | Login/logout, verifikasi email, dan reset password | 1 | Playwright: login berhasil, logout memutus sesi, link verifikasi/reset sekali pakai melalui Mailpit; user publik tidak bisa menentukan role. |
| 3 | Admin dan CRUD seri | 2 | Admin bisa buat, ubah, terbitkan, arsipkan; pengunjung dan user biasa tidak bisa menjalankan mutasi, juga tanpa melalui UI. Draft tidak muncul di katalog. |
| 4 | Unggah cover dan CRUD chapter/panel | 3 | Urut ulang panel bertahan setelah reload; format/ukuran tidak valid ditolak; media draft tidak dapat dibaca pengunjung. |
| 5 | Impor katalog dan media | 4 | Dry run tidak menulis; dua kali impor tidak menduplikasi atau menghapus edit admin; angka fraksional, referensi media dan baris sintetis dilaporkan. |
| 6 | Sambungkan beranda, pencarian, detail, dan pembaca ke MySQL | 5 | Playwright: deep link lama valid, Project `Muat lainnya` dan filter tetap bekerja, chapter berikut/sebelumnya benar, kondisi tanpa panel jelas, layout tidak overflow pada 390 px. |
| 7 | Bookmark, antrean, riwayat dan impor data browser dengan persetujuan | 2, 6 | Dua akun tidak dapat melihat/mengubah data privat satu sama lain; impor ulang tidak menggandakan item, dan data tetap ada setelah restart. |
| 8 | Backup/restore, smoke release, cutover | 1–7 | Restore DB+media ke stack kosong membuktikan login, pembaca, dan CRUD; daftar rute yang masih dipakai disetujui; rollback sudah disimulasikan. |

- [ ] 1. Scaffold Next.js dan Compose
- [ ] 2. Login/logout, verifikasi email, dan reset password
- [ ] Gate A: stack isolasi dan autentikasi lulus
- [ ] 3. Admin dan CRUD seri
- [ ] 4. Unggah cover dan CRUD chapter/panel
- [ ] 5. Impor katalog dan media
- [ ] 6. Sambungkan UI publik ke MySQL
- [ ] Gate B: data dan pembaca lulus, CRUD admin dibatasi dengan benar
- [ ] 7. Pustaka per akun dan migrasi sukarela
- [ ] 8. Backup/restore, smoke release, cutover
- [ ] Gate C: privasi lintas akun, integritas DB/media, dan rollback terbukti
