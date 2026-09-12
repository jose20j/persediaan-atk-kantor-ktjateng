-- ============================================================
-- MIGRASI: Persetujuan akun pegawai + nomor telepon
--
-- Jalankan sekali di: Supabase Dashboard > SQL Editor > New Query
-- Aman dijalankan ulang (idempoten).
-- ============================================================

-- ------------------------------------------------------------
-- 1. Nomor telepon pegawai (format 08..., bukan 62...)
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS no_telepon TEXT;

-- ------------------------------------------------------------
-- 2. Status persetujuan
--    Akun baru masuk sebagai 'Menunggu' dan belum bisa memesan
--    sampai admin menyetujuinya.
-- ------------------------------------------------------------
ALTER TABLE customers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'Menunggu';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS alasan_ditolak TEXT;

-- Akun yang sudah ada sebelum migrasi ini dianggap sah — jangan sampai
-- pegawai yang sudah dipakai mendadak terkunci. Baris di bawah hanya
-- mengenai akun lama, karena belum ada pendaftaran baru saat migrasi jalan.
UPDATE customers
   SET status = 'Disetujui',
       approved_at = COALESCE(approved_at, NOW())
 WHERE status IS NULL OR status = 'Menunggu';

-- Batasi nilainya setelah data lama dirapikan, supaya UPDATE di atas
-- tidak tertolak constraint.
ALTER TABLE customers DROP CONSTRAINT IF EXISTS customers_status_check;
ALTER TABLE customers ADD CONSTRAINT customers_status_check
  CHECK (status IN ('Menunggu','Disetujui','Ditolak'));

CREATE INDEX IF NOT EXISTS customers_status_idx ON customers (status);

-- ------------------------------------------------------------
-- 3. Periksa hasilnya
-- ------------------------------------------------------------
SELECT status, COUNT(*) AS jumlah
FROM customers
GROUP BY status
ORDER BY status;
