-- ============================================================
-- MIGRASI: Indeks untuk menjaga kecepatan saat data menumpuk
--
-- Tabel `requests` selama ini hanya punya kunci utama, sehingga setiap
-- pencarian per pegawai, per status, atau pengurutan per tanggal memaksa
-- Postgres memindai seluruh tabel. Tidak terasa saat kosong, terasa sekali
-- setelah puluhan ribu baris.
--
-- Jalankan sekali di: Supabase Dashboard > SQL Editor > New Query
-- Aman dijalankan ulang. Tidak mengubah satu baris data pun.
-- ============================================================

-- Dipakai halaman "Pesanan Saya" milik tiap pegawai
CREATE INDEX IF NOT EXISTS requests_customer_idx ON requests (customer_id);

-- Dipakai pengurutan "terbaru dulu" di Permintaan Masuk dan laporan
CREATE INDEX IF NOT EXISTS requests_created_idx ON requests (created_at DESC);

-- Dipakai penghitung pesanan menunggu dan penyaringan status
CREATE INDEX IF NOT EXISTS requests_status_idx ON requests (status);

-- Dipakai pengelompokan beberapa barang dalam satu pesanan
CREATE INDEX IF NOT EXISTS requests_order_idx ON requests (order_id);

-- Riwayat stok: dicari per barang dan diurutkan per tanggal
CREATE INDEX IF NOT EXISTS stock_history_item_idx ON stock_history (item_id);
CREATE INDEX IF NOT EXISTS stock_history_created_idx ON stock_history (created_at DESC);

-- ------------------------------------------------------------
-- Periksa hasilnya
-- ------------------------------------------------------------
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('requests', 'stock_history')
ORDER BY tablename, indexname;
