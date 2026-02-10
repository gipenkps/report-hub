
# Aplikasi Form Laporkan Masalah

## Gambaran Umum
Website form pelaporan masalah dengan desain modern minimalis, dilengkapi panel admin untuk mengelola laporan. Menggunakan Lovable Cloud (Supabase) sebagai backend.

---

## 1. Halaman Frontend - Form Laporan
Tampilan form pelaporan dengan desain bersih dan profesional, berisi:
- **Header** dengan logo dan judul "Laporkan Masalah"
- **Username** (input teks wajib)
- **Nomor WA** (input nomor wajib, format validasi nomor telepon)
- **Tanggal Kendala** (date picker/kalender)
- **Kendala** (judul kendala, input teks)
- **Nama Website** (dropdown pilihan, data dari database, dikelola admin)
- **Isi Kendala** (textarea untuk penjelasan detail)
- **Status** (dropdown pilihan, data dari database, dikelola admin)
- **Upload Gambar** (upload file gambar sebagai bukti)
- **Tombol "Kirim"**
- Setiap laporan otomatis mendapatkan **ID unik** sebagai penanda

## 2. Panel Admin - Login
- Halaman login admin dengan email dan password
- Proteksi route admin hanya untuk user dengan role admin
- Sistem autentikasi menggunakan Supabase Auth

## 3. Panel Admin - Dashboard
- Tabel daftar semua laporan masuk dengan **ID laporan**, username, tanggal, kendala, status, dll
- **Filter berdasarkan tanggal** (rentang tanggal)
- **Export data** ke CSV/Excel berdasarkan filter tanggal yang dipilih
- Bisa melihat detail setiap laporan termasuk gambar yang diupload

## 4. Panel Admin - Kelola Website
- CRUD daftar nama website yang muncul di dropdown form pelaporan
- Tambah, edit, dan hapus nama website

## 5. Panel Admin - Kelola Status
- CRUD daftar status yang muncul di dropdown form pelaporan
- Tambah, edit, dan hapus status (contoh: Normal, Urgent, Selesai, dll)

## 6. Panel Admin - Pengaturan SEO & Tampilan
- **Title website** (judul halaman)
- **Favicon** (upload gambar)
- **Background** (upload gambar)
- **Logo** (upload gambar)

## 7. Backend (Lovable Cloud / Supabase)
- Database untuk menyimpan laporan, daftar website, daftar status, dan pengaturan SEO
- Storage bucket untuk upload gambar (bukti laporan, favicon, background, logo)
- Authentication untuk admin login
- Row Level Security untuk keamanan data
