# Shinigami Lab

Replika UI lokal independen untuk katalog dan pembaca komik. Jika tersedia, katalog, cover, dan panel memakai data publik Shinigami; tanpa data unduhan, aplikasi memakai konten demo.

## Jalankan

```sh
node server.mjs
```

Buka <http://127.0.0.1:4173/>. Tidak perlu instal dependensi. Server hanya mendengarkan di loopback; `PORT` dapat mengganti port default. `catalog.js` berisi katalog dan ilustrasi lokal, `pages.js` merender halaman, dan `app.js` menangani URL serta penyimpanan di browser.

`node scrape.mjs` memperbarui katalog dan mengunduh media. Cover baru disimpan sebagai WebP kualitas 75 dengan lebar maksimal 360 px, tanpa memperbesar cover kecil. Jalankan `node optimize-covers.mjs` untuk mengonversi cache cover lama tanpa mengunduh ulang; skrip baru menghapus cover lama setelah katalog menunjuk ke hasil konversi, dan tidak mengubah panel chapter. Kedua perintah membutuhkan `ffmpeg` dengan encoder `libwebp` di `PATH` dan dijalankan dari root proyek. Jangan jalankan scraper dan konversi cache secara bersamaan.

## Cakupan

| Alur | Rute lokal |
| --- | --- |
| Beranda, katalog, detail, dan pembaca | `/`, `/series`, `/series/:id`, `/chapter/:chapterId` |
| Bookmark, riwayat, dan antrean | `/library` |
| Komunitas, diskusi, dan obrolan lokal | `/community`, `/community/:id`, `/community/chat/:channel?/:messageId?`, `/chat/:roomId` |
| Profil, onboarding, dan klaim | `/user/:username`, `/onboarding/:step?`, `/claim` |
| Leaderboard, aura, panduan, dan notifikasi | `/leaderboard`, `/sistem-aura`, `/panduan/*`, `/notifikasi` |
| Paket dan pengaturan | `/premium`, `/settings`, `/settings/{akun,baca,notifikasi,privasi,selera,pembayaran}`, `/settings/akun/klaim`, `/settings/upgrade` |

Bookmark, riwayat, antrean, profil, preferensi, post, dan pesan tersimpan di browser yang membuka aplikasi. Tidak ada login, pembayaran, sinkronisasi antarpengguna, atau salinan data akun. Rute yang hanya terlihat pada deklarasi router publik memiliki implementasi lokal berdasarkan nama dan konteksnya.

## Referensi dan verifikasi

- REA merekam beranda publik di Chrome terisolasi: inspeksi `ev_21965b6fec461e1a125248a83f991b60de26bc74a349d550c16737fda5e2bb41`; tangkapan layar `ev_18c0c716687f99bb156bd98ed1575dab519ed998ace3b8f1ffde515c168a04a9`. Struktur rute juga diperiksa pada router JavaScript publik.
- Chrome DevTools memverifikasi 31 navigasi URL lokal, interaksi pencarian, katalog, pembaca, penyimpanan pustaka, diskusi, chat, paket, onboarding, dan pohon aksesibilitas beranda. Beranda diuji pada 320, 768, 1024, dan 1440 piksel; tidak ada overflow horizontal, peringatan atau error konsol, maupun permintaan jaringan lokal gagal selama skenario browser.
