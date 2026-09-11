-- ============================================================
-- MIGRASI: Bidang 2 tingkat (Bidang -> Unit)
-- Kejaksaan Tinggi Jawa Tengah — 8 bidang, 38 unit
--
-- Jalankan sekali di: Supabase Dashboard > SQL Editor > New Query
-- Aman dijalankan ulang (idempoten).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Struktur: departments jadi dua tingkat
-- ------------------------------------------------------------

-- parent_id NULL  = baris ini sebuah BIDANG (tingkat atas)
-- parent_id terisi = baris ini sebuah UNIT di bawah bidang tsb
ALTER TABLE departments
  ADD COLUMN IF NOT EXISTS parent_id TEXT REFERENCES departments(id) ON DELETE CASCADE;

-- Constraint lama melarang nama kembar di SELURUH tabel — terlalu ketat
-- untuk struktur pohon. Dengan aturan itu, dua bidang berbeda tidak boleh
-- punya unit bernama sama (misal "Sub Bagian Umum" di dua bidang), dan
-- sebuah unit tidak boleh senama dengan bidang induknya.
ALTER TABLE departments DROP CONSTRAINT IF EXISTS departments_nama_bidang_key;

-- Penggantinya: nama cukup unik di dalam lingkupnya masing-masing.
-- Dua bidang tidak boleh senama; dua unit dalam satu bidang tidak boleh
-- senama; selain itu bebas.
DROP INDEX IF EXISTS departments_unik_bidang;
DROP INDEX IF EXISTS departments_unik_unit;
CREATE UNIQUE INDEX departments_unik_bidang
  ON departments (nama_bidang) WHERE parent_id IS NULL;
CREATE UNIQUE INDEX departments_unik_unit
  ON departments (parent_id, nama_bidang) WHERE parent_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS departments_parent_idx ON departments (parent_id);

-- ------------------------------------------------------------
-- 2. Simpan unit pada akun pegawai dan pada tiap permintaan
--    (teks, sejalan dengan kolom `bidang` yang sudah ada —
--     riwayat lama tidak ikut berubah saat nama diperbarui)
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE requests  ADD COLUMN IF NOT EXISTS unit TEXT;

-- ------------------------------------------------------------
-- 3. Bersihkan data uji
-- ------------------------------------------------------------
DELETE FROM stock_history;
DELETE FROM requests;
DELETE FROM departments;

-- ------------------------------------------------------------
-- 4. Isi struktur resmi — 8 BIDANG
-- ------------------------------------------------------------
INSERT INTO departments (id, nama_bidang, parent_id) VALUES
  ('bid-pembinaan',      'Pembinaan',                        NULL),
  ('bid-intelijen',      'Intelijen',                        NULL),
  ('bid-pidum',          'Tindak Pidana Umum',               NULL),
  ('bid-pidsus',         'Tindak Pidana Khusus',             NULL),
  ('bid-pidmil',         'Pidana Militer',                   NULL),
  ('bid-datun',          'Perdata dan Tata Usaha Negara',    NULL),
  ('bid-pengawasan',     'Pengawasan',                       NULL),
  ('bid-pemulihan-aset', 'Pemulihan Aset',                   NULL)
ON CONFLICT (id) DO UPDATE
  SET nama_bidang = EXCLUDED.nama_bidang, parent_id = EXCLUDED.parent_id;

-- ------------------------------------------------------------
-- 5. Isi 38 UNIT di bawah masing-masing bidang
-- ------------------------------------------------------------
INSERT INTO departments (id, nama_bidang, parent_id) VALUES
  -- Pembinaan (8)
  ('unt-pmb-klinik',     'Klinik Adhyaksa',                                    'bid-pembinaan'),
  ('unt-pmb-apotek',     'Apotek Adhyaksa',                                    'bid-pembinaan'),
  ('unt-pmb-umum',       'Sub Bagian Umum',                                    'bid-pembinaan'),
  ('unt-pmb-keuangan',   'Sub Bagian Keuangan',                                'bid-pembinaan'),
  ('unt-pmb-kepeg',      'Sub Bagian Kepegawaian',                             'bid-pembinaan'),
  ('unt-pmb-rencana',    'Sub Bagian Perencanaan',                             'bid-pembinaan'),
  ('unt-pmb-sekre',      'Sekretaris Asisten Pembinaan',                       'bid-pembinaan'),
  ('unt-pmb-daskrimti',  'Daskrimti dan Perpustakaan',                         'bid-pembinaan'),

  -- Intelijen (7)
  ('unt-int-kasi1',      'Kasi 1',                                             'bid-intelijen'),
  ('unt-int-kasi2',      'Kasi 2',                                             'bid-intelijen'),
  ('unt-int-kasi3',      'Kasi 3',                                             'bid-intelijen'),
  ('unt-int-kasi4',      'Kasi 4',                                             'bid-intelijen'),
  ('unt-int-kasi5',      'Kasi 5',                                             'bid-intelijen'),
  ('unt-int-sekre',      'Sekretaris Asisten Intelijen',                       'bid-intelijen'),
  ('unt-int-penkum',     'Penerangan Hukum',                                   'bid-intelijen'),

  -- Tindak Pidana Umum (5)
  ('unt-pidum-a',        'Kasi A',                                             'bid-pidum'),
  ('unt-pidum-b',        'Kasi B',                                             'bid-pidum'),
  ('unt-pidum-c',        'Kasi C',                                             'bid-pidum'),
  ('unt-pidum-d',        'Kasi D',                                             'bid-pidum'),
  ('unt-pidum-sekre',    'Sekretaris Asisten Tindak Pidana Umum',              'bid-pidum'),

  -- Tindak Pidana Khusus (5)
  ('unt-pidsus-sidik',   'Kasi Penyidikan',                                    'bid-pidsus'),
  ('unt-pidsus-tut',     'Kasi Penuntutan',                                    'bid-pidsus'),
  ('unt-pidsus-dalops',  'Kasi Pengendalian Operasi',                          'bid-pidsus'),
  ('unt-pidsus-uhlbee',  'Kasi UHLBEE',                                        'bid-pidsus'),
  ('unt-pidsus-sekre',   'Sekretaris Asisten Tindak Pidana Khusus',            'bid-pidsus'),

  -- Pidana Militer (4)
  ('unt-pidmil-sekre',   'Sekretaris Asisten Pidana Militer',                  'bid-pidmil'),
  ('unt-pidmil-dakan',   'Seksi Penindakan',                                   'bid-pidmil'),
  ('unt-pidmil-tut',     'Seksi Penuntutan',                                   'bid-pidmil'),
  ('unt-pidmil-eksekusi','Seksi Eksekusi',                                     'bid-pidmil'),

  -- Perdata dan Tata Usaha Negara (4)
  ('unt-datun-perdata',  'Perdata',                                            'bid-datun'),
  ('unt-datun-tun',      'Tata Usaha Negara',                                  'bid-datun'),
  ('unt-datun-timkum',   'Pertimbangan Hukum',                                 'bid-datun'),
  ('unt-datun-sekre',    'Sekretaris Asisten Perdata dan Tata Usaha Negara',   'bid-datun'),

  -- Pengawasan (2)
  ('unt-was-auditor',    'Auditor',                                            'bid-pengawasan'),
  ('unt-was-sekre',      'Sekretaris Asisten Pengawasan',                      'bid-pengawasan'),

  -- Pemulihan Aset (3)
  ('unt-pa-manajemen',   'Subbidang Manajemen Pengelolaan Aset',               'bid-pemulihan-aset'),
  ('unt-pa-penelusuran', 'Subbidang Penelusuran dan Perampasan Aset',          'bid-pemulihan-aset'),
  ('unt-pa-penyelesaian','Subbidang Penyelesaian Aset',                        'bid-pemulihan-aset')
ON CONFLICT (id) DO UPDATE
  SET nama_bidang = EXCLUDED.nama_bidang, parent_id = EXCLUDED.parent_id;

-- ------------------------------------------------------------
-- 6. Akun pegawai yang sudah ada
--    Akun `jose` masih ber-bidang "Operasional" (bidang dummy yang
--    sudah dihapus). Ganti kedua nilai di bawah dengan penempatan
--    yang sebenarnya, lalu jalankan barisnya.
-- ------------------------------------------------------------
-- UPDATE customers
--   SET bidang = 'Pembinaan',
--       unit   = 'Sub Bagian Umum'
--   WHERE username = 'jose';

-- ------------------------------------------------------------
-- 7. Periksa hasilnya
-- ------------------------------------------------------------
SELECT b.nama_bidang AS bidang, COUNT(u.id) AS jumlah_unit
FROM departments b
LEFT JOIN departments u ON u.parent_id = b.id
WHERE b.parent_id IS NULL
GROUP BY b.nama_bidang
ORDER BY b.nama_bidang;
