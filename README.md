# PesanRapi — Website Template Pesan Customer Service

> **PesanRapi** membantu tim *customer service* menyusun pesan penanganan kendala dan transaksi yang rapi, profesional, dan konsisten dari template pribadi tanpa mengetik ulang struktur kalimat yang sama.

Aplikasi ini dibangun dengan prinsip utama **Zero Customer Storage**: seluruh data transaksi dan isian pelanggan diproses murni di memori browser tanpa pernah disimpan ke database, log, query URL, storage, atau server.

---

## 🚀 Fitur Utama

- **Penyusunan Pesan Deterministik:** Penggantian token variabel secara instan berbasis AST parser lokal tanpa ketergantungan pada model AI eksternal atau latensi jaringan.
- **Dua Mode Output:** Mendukung format **WhatsApp** (dengan penanda bintang `*teks*` otomatis) dan **Teks Biasa (Plain)** untuk email atau tiket internal.
- **Formulir Dinamis Otomatis:** Formulir input digenerate otomatis menyesuaikan template aktif (mendukung kontrol `text`, `textarea`, `select`, dan `combobox` dengan isian bebas).
- **Isolasi Privasi Data (Zero-Storage):** 
  - Nilai pelanggan diklasifikasikan sebagai *Transient* (selalu dimulai kosong dan dibersihkan saat tombol "Pelanggan Baru" diklik, saat berpindah template, atau saat halaman di-refresh).
  - Nilai umum seperti nama toko diklasifikasikan sebagai *Configuration* yang dapat memiliki nilai bawaan template.
- **Template Builder Lengkap:** Pengguna dapat membuat dan mengedit template sendiri dengan toolbar bold, tombol sisip variabel kursor, validasi token real-time, dan pratinjau simulasi.
- **Proteksi Konflik Versi (Optimistic Locking):** Menggunakan mekanisme PostgreSQL *Compare-and-Swap (CAS)* untuk mendeteksi jika template telah diperbarui di tab/perangkat lain (mencegah penimpaan data tanpa sengaja).
- **Pencadangan Mandiri (Backup & Restore):** Ekspor dan impor berkas JSON resmi (`pesanrapi-template-backup` schema v1) dengan sanitasi total dari identitas akun dan data sensitif.
- **Offline Readiness:** Generator yang telah dimuat tetap dapat melakukan kalkulasi pesan dan salin clipboard meskipun koneksi internet terputus di tengah jalan.
- **Aksesibilitas & Keamanan Tinggi:** Dukungan navigasi keyboard penuh, modal focus trap, fallback salin manual, dan konfigurasi *Security Headers* (CSP, X-Frame-Options DENY, nosniff).

---

## 🛠️ Stack Teknologi

- **Frontend & Server Framework:** Next.js 16 (App Router, Turbopack, TS strict) & React 19
- **Styling:** Tailwind CSS v4 dengan token desain kustom sesuai PRD
- **Database & Autentikasi:** Supabase PostgreSQL dengan Row Level Security (RLS) & Supabase SSR
- **Validasi Data:** Zod & Custom AST Template Parser
- **Pengujian:** Vitest (58 Unit & Integration tests passing 100%)
- **Hosting Target:** Vercel & Supabase Free Plan

---

## 💻 Panduan Menjalankan di Komputer Lokal

### 1. Prasyarat
- Node.js versi 20.x atau lebih baru
- `pnpm` (disarankan v12+)

### 2. Kloning & Instalasi Dependensi
```bash
git clone <repository-url>
cd CSCentre
pnpm install
```

### 3. Konfigurasi Environment Variables
Salin file `.env.example` menjadi `.env.local`:
```bash
cp .env.example .env.local
```

Isi variabel berikut dengan kredensial dari dashboard Supabase Anda:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-publishable-key
```

*(Catatan: Mode pengembangan lokal menyediakan fallback otomatis jika kredensial belum diisi sehingga UI dan engine dapat diuji langsung).*

### 4. Menjalankan Server Development
```bash
pnpm run dev
```
Buka browser di [http://localhost:3000](http://localhost:3000).

---

## 🗄️ Panduan Database Supabase

### 1. Menjalankan Migrasi SQL
Struktur skema, tabel, indeks, validasi JSONB, dan fungsi optimistic locking tersimpan di file:
`supabase/migrations/20261020000000_init_pesanrapi.sql`

Langkah eksekusi:
1. Buka dashboard proyek Supabase Anda.
2. Masuk ke menu **SQL Editor**.
3. Buat query baru, salin seluruh isi file `20261020000000_init_pesanrapi.sql`, lalu klik **Run**.

Tabel yang akan dibuat:
- `public.templates`: Menyimpan body dan array fields definisi template per akun.
- `public.user_settings`: Menyimpan preferensi default format output per pengguna.
- Fungsi RPC `public.update_template_cas()` untuk optimistic locking.
- Fungsi trigger `public.validate_template_fields()` untuk validasi integritas JSONB di database.

### 2. Konfigurasi Supabase Auth & Redirect URL
1. Masuk ke **Authentication** $\rightarrow$ **URL Configuration**.
2. Atur **Site URL**: `http://localhost:3000` (atau domain produksi Anda di Vercel).
3. Tambahkan ke **Redirect URLs**:
   - `http://localhost:3000/auth/confirm`
   - `https://your-domain.vercel.app/auth/confirm`

### 3. Konfigurasi SMTP untuk Pengiriman Email
Pada Supabase Free Plan, kuota email bawaan dibatasi (sekitar 3–4 email per jam). Untuk penggunaan produksi:
1. Masuk ke **Project Settings** $\rightarrow$ **Authentication** $\rightarrow$ **SMTP Settings**.
2. Aktifkan **Enable Custom SMTP**.
3. Hubungkan layanan SMTP terpercaya (seperti Resend, SendGrid, Amazon SES, atau Mailgun) dengan port `587`.
4. Isi Sender Name ("PesanRapi") dan Sender Email yang valid.

---

## ☁️ Panduan Deployment ke Vercel

1. Hubungkan repository GitHub privat Anda ke [Vercel](https://vercel.com).
2. Pada menu **Environment Variables**, tambahkan:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Gunakan build command standar: `next build` (sudah terkonfigurasi secara otomatis).
4. Klik **Deploy**.

> **Penting Mengenai Lisensi Vercel:**  
> Vercel Hobby diperuntukkan bagi proyek non-komersial personal. Jika PesanRapi digunakan sebagai alat kerja operasional tim CS perusahaan, gunakan paket Vercel Pro sesuai ketentuan layanan.

---

## ⚠️ Mitigasi Batasan Supabase Free Plan

- **Inactivity Pause:** Proyek Supabase pada paket gratis dapat mengalami *pause* otomatis jika tidak ada request selama 7 hari berturut-turut. Jika terjadi, buka dashboard Supabase dan klik **Restore Project** (data tidak hilang).
- **Kapasitas Database:** Batas 500 MB sangat lebih dari cukup untuk ratusan ribu template berbasis teks karena nilai pelanggan tidak disimpan sama sekali.

---

## 🧪 Menjalankan Pengujian

Jalankan seluruh rangkaian pengujian unit dan integrasi:
```bash
# Menjalankan 58 test suite lengkap (Engine, Parser, Builder, Generator, Backup, QA Hardening)
pnpm test

# Pemeriksaan tipe TypeScript ketat
pnpm run typecheck

# Pemeriksaan linter ESLint
pnpm run lint

# Pengujian build produksi
pnpm run build
```

---

## 🔒 Laporan Kepatuhan Definition of Done (PRD Bagian 23)

| Kriteria DoD | Status | Keterangan |
| :--- | :---: | :--- |
| **Auth & Recovery** | ✅ Lulus | Email/password, verifikasi email, lupa password, reset password. |
| **Isolasi RLS Database** | ✅ Lulus | Seluruh mutasi dan query dibatasi secara ketat `auth.uid() = owner_id`. |
| **Template Builder 6-Input** | ✅ Lulus | Pembuatan template tanpa sentuh kode/JSON, urutan field dinamis. |
| **Penyimpanan Atomik & CAS** | ✅ Lulus | Body & fields tersimpan dalam 1 row; versi diverifikasi via `update_template_cas`. |
| **Zero Customer Storage** | ✅ Lulus | Tidak ada nilai pelanggan di DB, request jaringan, storage, log, atau backup. |
| **Dua Mode Output & Fallback** | ✅ Lulus | Format WhatsApp (`*teks*`) & Plain, dialog manual copy saat izin clipboard ditolak. |
| **Backup JSON Resmi** | ✅ Lulus | Ekspor & impor item-by-item dengan sanitasi kepemilikan dan validasi skema v1. |
| **UI/UX & Desain Responsif** | ✅ Lulus | Sesuai referensi visual, kartu putih pada latar abu-abu terang, tombol kapsul biru. |
| **Build & Test Bersih** | ✅ Lulus | 58 test passing 100%, 0 TypeScript error, 0 ESLint warning. |

---

Lisensi: Privat / All rights reserved.
