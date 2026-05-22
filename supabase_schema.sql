-- ============================================================
-- SCHEMA SUPABASE untuk Aplikasi Persediaan ATK Kantor
-- Jalankan di: Supabase Dashboard > SQL Editor > New Query
-- ============================================================

-- 1. Tabel ITEMS (Barang ATK)
CREATE TABLE IF NOT EXISTS items (
  id TEXT PRIMARY KEY,
  nama_barang TEXT NOT NULL,
  kategori TEXT DEFAULT 'Umum',
  satuan TEXT DEFAULT 'Pcs',
  stok INTEGER DEFAULT 0,
  stok_minimum INTEGER DEFAULT 5,
  gambar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabel REQUESTS (Permintaan ATK dari pegawai)
CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  order_id TEXT,                              -- ID grup order (semua item 1 keranjang punya order_id sama)
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  nama_pemesan TEXT NOT NULL,
  bidang TEXT NOT NULL,
  jumlah_diminta INTEGER NOT NULL,
  jumlah_disetujui INTEGER,
  keterangan_customer TEXT DEFAULT '',
  catatan_admin TEXT DEFAULT '',
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending','Diproses','Selesai','Ditolak')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  approved_at TIMESTAMPTZ
);

-- Jalankan ini jika tabel sudah ada (migrasi):
-- ALTER TABLE requests ADD COLUMN IF NOT EXISTS order_id TEXT;

-- 3. Tabel STOCK_HISTORY (Riwayat stok)
CREATE TABLE IF NOT EXISTS stock_history (
  id TEXT PRIMARY KEY,
  item_id TEXT REFERENCES items(id) ON DELETE SET NULL,
  tipe TEXT CHECK (tipe IN ('restock','pengurangan')),
  jumlah INTEGER NOT NULL,
  keterangan TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabel DEPARTMENTS (Bidang / Divisi)
CREATE TABLE IF NOT EXISTS departments (
  id TEXT PRIMARY KEY,
  nama_bidang TEXT UNIQUE NOT NULL
);

-- 5. Tabel SETTINGS (Pengaturan aplikasi - 1 baris saja)
CREATE TABLE IF NOT EXISTS settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  nomor_whatsapp_admin TEXT DEFAULT '6281234567890',
  nama_kantor TEXT DEFAULT 'Kantor ATK',
  admin_username TEXT DEFAULT 'admin',
  admin_password TEXT DEFAULT 'admin123',
  CONSTRAINT single_row CHECK (id = 1)
);

-- ============================================================
-- DATA AWAL (Seed)
-- ============================================================

-- Settings default
INSERT INTO settings (id, nomor_whatsapp_admin, nama_kantor, admin_username, admin_password)
VALUES (1, '6281234567890', 'Kejaksaan Tinggi Jawa Tengah', 'admin', 'admin123')
ON CONFLICT (id) DO NOTHING;

-- Departemen default
INSERT INTO departments (id, nama_bidang) VALUES
  ('bdg-1', 'IT'),
  ('bdg-2', 'HRD'),
  ('bdg-3', 'Keuangan'),
  ('bdg-4', 'Marketing'),
  ('bdg-5', 'Umum & Rumah Tangga'),
  ('bdg-6', 'Operasional')
ON CONFLICT (id) DO NOTHING;

-- Barang ATK contoh
INSERT INTO items (id, nama_barang, kategori, satuan, stok, stok_minimum, gambar_url, created_at, updated_at) VALUES
  ('itm-1','Kertas HVS Sinar Dunia A4 80gr','Kertas','Rim',15,5,'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60', NOW(), NOW()),
  ('itm-2','Kertas HVS Sinar Dunia F4 80gr','Kertas','Rim',12,5,'https://images.unsplash.com/photo-1512418490979-917ba593d887?w=500&auto=format&fit=crop&q=60', NOW(), NOW()),
  ('itm-3','Pulpen Gel Kenko Easy Gel 0.5mm','Alat Tulis','Lusin',8,3,'https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60', NOW(), NOW()),
  ('itm-4','Pensil Faber-Castell 2B Original','Alat Tulis','Pcs',42,10,'https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60', NOW(), NOW()),
  ('itm-5','Stapler MAX HD-10 Tokyo Original','Peralatan Kantor','Pcs',3,4,'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=60', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- ROW LEVEL SECURITY (RLS) - Nonaktifkan untuk service_role
-- Aktifkan jika pakai anon key di frontend langsung
-- ============================================================
-- ALTER TABLE items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE stock_history ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE settings ENABLE ROW LEVEL SECURITY;
