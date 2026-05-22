# Aplikasi Web Persediaan ATK Kantor dengan Integrasi WhatsApp

Sistem Manajemen Panduan dan Persediaan Alat Tulis Kantor (ATK) berbasis Web modern yang dikembangkan menggunakan **React.js (Vite)**, **Tailwind CSS**, **Node.js (Express)**, dan **TypeScript**.

Aplikasi ini mendukung **Dual-Mode Persistence Architecture** (Arsitektur Penyimpanan Ganda):
1. **Full-Stack Mode**: Menggunakan Express API backend dengan file-database (`database.json`) yang berjalan statis di server kontainer Node.js. Cocok untuk sinkronisasi multi-browser.
2. **Local Fallback Mode**: Jika dideploy di hosting statis murni seperti **Netlify**, **Vercel (Static)**, atau **Cloudflare Pages**, aplikasi otomatis beralih ke penyimpanan `localStorage` pada browser pengguna. Fitur tetap berfungsi 100% sempurna tanpa merusak API!

---

## 👥 Dua Jenis Pengguna (POV)

### 1. Customer (Pegawai Kantor - Tanpa Login)
- **Katalog ATK**: Melihat daftar seluruh ATK kantor dengan foto, kategori, dan unit satuan.
- **Proteksi Informasi Stok (Keamanan Data)**: Kuantitas stok riil disembunyikan dari pegawai. Hanya menampilkan badge status ketersediaan:
  - 🟢 **Tersedia** (Stok > 0)
  - 🔴 **Stok Kosong** (Stok = 0 - tombol "Pesan" dinonaktifkan otomatis).
- **Formulir Mandiri**: Melakukan pemesanan dengan memilih Bidang/Departemen, Nama Pemohon, Jumlah Diminta, serta Keterangan Tambahan.
- **Integrasi WhatsApp**: Setelah submit, pesanan langsung dicatat ke sistem dan pembeli diarahkan ke nomor WhatsApp Admin dengan draf pesan pesanan otomatis yang rapi dan terstruktur.

### 2. Admin (Perlu Login)
- **Kredensial Default**:
  - **Username**: `admin`
  - **Password**: `admin123`
- **Dashboard Statistik**: Menyajikan total jenis ATK, kuantitas stok, status permintaan masuk, diagram SVG rekapitulasi barang paling dicari, tren permintaan divisi, serta daftar barang kritis (butuh restock).
- **Notifikasi Stok Menipis**: Banner notifikasi khusus jika ada barang dengan stok &le; `stok_minimum`.
- **Manajemen Barang (CRUD)**:
  - Tambah, ubah, hapus ATK beserta foto/gambar opsional.
  - Tambah stok (Restock) manual yang mencatat log riwayat transaksi perubahan stok secara otomatis.
- **Logika Pemenuhan Parsial (PENTING)**:
  - Admin dapat menyetujui jumlah parsial (`jumlah_disetujui` &le; `jumlah_diminta`).
  - Mengurangi stok terpilih sesuai jumlah disetujui (bukan jumlah pemohon semula).
  - Pilihan Menolak Pesanan disertai alasan penolakan tanpa memengaruhi status stok riil.
  - Tampilan format di riwayat pesanan: `Diminta: 5 | Dikirim: 2`.
- **Pengaturan Global**: Konfigurasi nama kantor, memperbarui sandi login, mengubah nomor WhatsApp tujuan Admin (format internasional `628...`), kelola list departemen/bidang (tambah/hapus), serta tombol **Reset Database**.
- **Ekspor Dokumen Laporan**:
  - **Excel (.xlsx)** menggunakan library **SheetJS (xlsx)**.
  - **PDF (.pdf)** menggunakan library **jsPDF**.
  - Laporan yang didukung: Stok ATK saat ini, Riwayat permintaan (dengan filter rentang tanggal), Rekapitulasi kuantitas per bidang, Barang stok menipis, dan Analisis selisih pemenuhan.

---

## 📂 Struktur Folder Proyek

```bash
├── /database.json          # File database JSON persisten (Full-Stack mode)
├── /server.ts              # File server Node.js Express (Bundle CJS via esbuild)
├── /metadata.json          # Metadata perizinan aplikasi
├── /tsconfig.json          # Konfigurasi kompilasi TypeScript
├── /vite.config.ts         # Konfigurasi plugin React & Tailwind CSS
├── /src
│   ├── /components
│   │   ├── CustomerCatalog.tsx  # Katalog belanja customer & checkout WhatsApp
│   │   ├── AdminDashboard.tsx   # Dashboard analitik visual SVG
│   │   ├── AdminItems.tsx       # Manajemen pengelolaan detail ATK
│   │   ├── AdminRequests.tsx    # Antrean berkas & logika pemenuhan parsial
│   │   ├── AdminSettings.tsx    # Setelan nomor WA admin & bidang divis
│   │   └── ReportExport.tsx     # Ekspor ke format Excel & PDF
│   ├── App.tsx             # Shell router portal login & sidebar workspace
│   ├── api.ts              # API Driver & arsitektur penyimpanan ganda
│   ├── types.ts            # Registrasi tipe data/skema database TypeScript
│   ├── index.css           # Styling Tailwind CSS & load Font Google
│   └── main.tsx            # Entry point aplikasi
└── package.json            # Daftar dependensi & script pembangunan
```

---

## 🚀 Panduan Menjalankan Aplikasi Lokal

1. **Instalasi Dependensi**:
   Instal semua modul yang diperlukan oleh program:
   ```bash
   npm install
   ```

2. **Jalankan dalam Mode Pengembangan (Development)**:
   Perintah ini akan menyalakan server Node.js terintegrasi (port `3000`):
   ```bash
   npm run dev
   ```
   Buka alamat browser di `http://localhost:3000`.

3. **Pembangunan Produksi (Build & Compile)**:
   Untuk membuat bundel produksi akhir (Vite client build & bundling server backend via esbuild menjadi `dist/server.cjs`):
   ```bash
   npm run build
   ```

4. **Menjalankan Hasil Build (Start)**:
   ```bash
   npm run start
   ```

---

## 🌐 Panduan Deploy ke Hosting Gratis

### Opsi A: Deploy sebagai Client-Only Static di Netlify, Vercel, atau Cloudflare Pages
Karena arsitektur database dirancang memiliki **Local Fallback Mode**, Anda dapat mengunggah folder hasil build (`dist/`) langsung ke hosting statis gratis apa pun! Aplikasi akan otomatis berjalan penuh menggunakan database lokal (`localStorage`) pada browser:

1. Daftarkan proyek di layanan penyedia hosting (misal: **Netlify** atau **Vercel**).
2. Hubungkan repositori GitHub Anda.
3. Atur konfigurasi build sebagai berikut:
   - **Build Command**: `vite build`
   - **Publish/Output Directory**: `dist`
4. Deploy! Aplikasi siap digunakan oleh tim kantor Anda.

### Opsi B: Deploy Full-Stack menggunakan Render, Fly.io, atau Railway
Jika Anda membutuhkan sinkronisasi data yang persisten antar komputer pengguna yang berbeda, Anda harus mendeploy di server yang mendukung Node.js:

1. Pilih platform seperti **Render.com** (Web Service gratis mendukung Node.js).
2. Atur konfigurasi build sebagai berikut:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
3. Tambahkan environment variable yang dibutuhkan:
   - `NODE_ENV` = `production`
4. Deploy! Platform akan menyalakan server Express.js di `port 3000` dan mengelola penyimpanan `database.json`.
