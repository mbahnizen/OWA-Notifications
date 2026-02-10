# Panduan Instalasi Permanen (Signing)

Secara default, Firefox versi standar memblokir instalasi ekstensi yang belum ditandatangani (unsigned) demi keamanan. Mode `about:debugging` hanya bersifat sementara (hilang saat Firefox ditutup).

Agar bisa diinstal secara permanen, Anda perlu **menandatangani (sign)** ekstensi ini melalui Mozilla Add-ons (AMO). Gratis dan mudah.

## Langkah 1: Buat File ZIP
1.  Masuk ke folder `c:\Nizen\Project\Firefox OWA Extension\src`.
2.  Pilih **semua file** di dalamnya (`manifest.json`, `options.html`, folder `icons`, dll).
3.  Klik kanan -> **Sned to** -> **Compressed (zipped) folder**.
4.  Beri nama file, misalnya `owa-notifications.zip`.

> **PENTING**: Jangan men-zip folder `src` dari luar! Anda harus masuk ke dalam folder `src` lalu seleksi isinya, baru di-zip. Jika `manifest.json` tidak ada di root file ZIP, akan error.

## Langkah 2: Upload ke Mozilla (AMO)
1.  Buka [Mozilla Add-on Developer Hub](https://addons.mozilla.org/en-US/developers/).
2.  Login dengan akun Firefox Anda (atau buat baru).
3.  Klik **Submit a New Add-on**.
4.  Pilih **On your own** (Self-hosted). Ini artinya ekstensi tidak akan dipajang di toko publik, hanya untuk Anda unduh file `.xpi`-nya.
5.  Upload file `owa-notifications.zip` yang baru dibuat.
6.  Tunggu proses validasi otomatis. Jika hijau semua, klik **Sign Add-on**.

## Langkah 3: Download & Install
1.  Setelah selesai, Mozilla akan memberikan link download file `.xpi`.
2.  Download file tersebut.
3.  Buka Firefox, lalu drag-and-drop file `.xpi` ke jendela Firefox.
4.  Klik **Add** saat muncul konfirmasi.

Sekarang ekstensi terinstal permanen! 🎉

---
**Alternatif (Tanpa Signing):**
Jika Anda menggunakan **Firefox Developer Edition** atau **Firefox Nightly**, Anda bisa mematikan syarat signing:
1.  Ketik `about:config` di address bar.
2.  Cari `xpinstall.signatures.required`.
3.  Ubah menjadi `false`.
4.  Sekarang Anda bisa drag-and-drop file ZIP/XPI langsung tanpa signing.
*(Tidak disarankan untuk Firefox biasa karena mengurangi keamanan).*
