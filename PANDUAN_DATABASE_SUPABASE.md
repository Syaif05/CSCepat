# Panduan Setup Database & Kredensial Supabase — PesanRapi

Dokumen ini menjelaskan langkah mudah untuk menghubungkan proyek **PesanRapi** dengan database **Supabase** Anda.

---

## 1. Lokasi Penyimpanan Kunci (Environment Keys)

File konfigurasi database telah disediakan di root proyek:

📄 **[`.env.local`](file:///Users/syaifulloh/Documents/Pemrograman/Web/CSCentre/.env.local)**

Isi dari file tersebut adalah sebagai berikut:
```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.YOUR_ANON_KEY
APP_URL=http://localhost:3000
```

> **Catatan Keamanan:** File `.env.local` sudah otomatis dikecualikan dari Git pada [`.gitignore`](file:///Users/syaifulloh/Documents/Pemrograman/Web/CSCentre/.gitignore), sehingga kredensial Anda aman dan tidak akan terunggah ke repositori publik.

---

## 2. Cara Mendapatkan URL & Key dari Supabase

1. Buka [Dashboard Supabase](https://supabase.com/dashboard) dan buat proyek baru (atau pilih proyek yang sudah ada).
2. Masuk ke menu **Project Settings** (ikon gerigi di kiri bawah) &rarr; pilih menu **API**.
3. Di bagian **Project URL**, salin URL proyek Anda (misal: `https://xyzabc.supabase.co`) dan tempelkan ke `NEXT_PUBLIC_SUPABASE_URL`.
4. Di bagian **Project API Keys**, cari key berlabel **`anon` / `public`**, salin string kuncinya dan tempelkan ke `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
5. Simpan file [`.env.local`](file:///Users/syaifulloh/Documents/Pemrograman/Web/CSCentre/.env.local).

---

## 3. Menjalankan Migrasi Database (1 Langkah Mudah)

File migrasi SQL lengkap yang mencakup tabel, validasi JSONB anti-bocor, kebijakan Row Level Security (RLS), dan fungsi concurrency telah disiapkan di:

📄 **[`supabase/migrations/20261020000000_init_pesanrapi.sql`](file:///Users/syaifulloh/Documents/Pemrograman/Web/CSCentre/supabase/migrations/20261020000000_init_pesanrapi.sql)**

### Langkah Menjalankan di Supabase Dashboard:
1. Buka menu **SQL Editor** pada panel kiri dashboard Supabase Anda.
2. Klik tombol **+ New Query**.
3. Salin seluruh isi file [`20261020000000_init_pesanrapi.sql`](file:///Users/syaifulloh/Documents/Pemrograman/Web/CSCentre/supabase/migrations/20261020000000_init_pesanrapi.sql).
4. Tempelkan ke dalam editor SQL, lalu klik tombol **Run** (atau tekan `Ctrl+Enter` / `Cmd+Enter`).
5. Selesai! Pesan `Success. No rows returned` akan muncul, menandakan tabel `templates`, `user_settings`, dan RLS telah aktif.

---

## 4. Konfigurasi Auth & Redirect URL di Supabase

Untuk memastikan email konfirmasi pendaftaran dan reset password dapat kembali ke aplikasi lokal Anda dengan aman:

1. Di dashboard Supabase, buka menu **Authentication** &rarr; **URL Configuration**.
2. Pada **Site URL**, isi dengan: `http://localhost:3000`
3. Pada **Redirect URLs**, tambahkan:
   - `http://localhost:3000/auth/confirm`
   - `http://localhost:3000/**`
4. Klik **Save**.
