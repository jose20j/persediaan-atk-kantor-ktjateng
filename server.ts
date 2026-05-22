import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

// --- Supabase Client ---
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Helper random ID
function genId(prefix: string) {
  return prefix + "-" + Math.random().toString(36).substr(2, 9);
}

// =============================================================
// AUTH LOGIN
// =============================================================
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  const { data, error } = await supabase
    .from("settings")
    .select("admin_username, admin_password")
    .single();

  if (error || !data) {
    // fallback default
    if (username === "admin" && password === "admin123") {
      return res.json({ success: true, token: "admin_session_token_xyz" });
    }
    return res.status(401).json({ success: false, message: "Username atau password salah!" });
  }

  if (username === data.admin_username && password === data.admin_password) {
    return res.json({ success: true, token: "admin_session_token_xyz" });
  }
  return res.status(401).json({ success: false, message: "Username atau password salah!" });
});

// =============================================================
// SETTINGS
// =============================================================
app.get("/api/settings", async (req, res) => {
  const { data, error } = await supabase
    .from("settings")
    .select("nomor_whatsapp_admin, nama_kantor")
    .single();

  if (error || !data) {
    return res.json({ nomor_whatsapp_admin: "6281234567890", nama_kantor: "Kantor ATK" });
  }
  res.json(data);
});

app.put("/api/settings", async (req, res) => {
  const { nomor_whatsapp_admin, nama_kantor, new_password } = req.body;
  const updates: any = {};
  if (nomor_whatsapp_admin) updates.nomor_whatsapp_admin = nomor_whatsapp_admin;
  if (nama_kantor) updates.nama_kantor = nama_kantor;
  if (new_password && new_password.trim() !== "") updates.admin_password = new_password;

  const { error } = await supabase.from("settings").update(updates).eq("id", 1);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: "Pengaturan berhasil diperbarui." });
});

// =============================================================
// ITEMS
// =============================================================
app.get("/api/items", async (req, res) => {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/items", async (req, res) => {
  const { nama_barang, kategori, satuan, stok, stok_minimum, gambar_url } = req.body;
  const newItem = {
    id: genId("itm"),
    nama_barang,
    kategori: kategori || "Umum",
    satuan: satuan || "Pcs",
    stok: parseInt(stok) || 0,
    stok_minimum: parseInt(stok_minimum) || 5,
    gambar_url: gambar_url || "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("items").insert(newItem).select().single();
  if (error) return res.status(500).json({ error: error.message });

  // Log history
  await supabase.from("stock_history").insert({
    id: genId("hst"),
    item_id: newItem.id,
    tipe: "restock",
    jumlah: newItem.stok,
    keterangan: `Stok awal barang baru: ${newItem.nama_barang}`,
    created_at: new Date().toISOString(),
  });

  res.status(201).json(data);
});

app.put("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const { nama_barang, kategori, satuan, stok, stok_minimum, gambar_url } = req.body;

  const { data: existing, error: fetchErr } = await supabase
    .from("items").select("*").eq("id", id).single();
  if (fetchErr || !existing) return res.status(404).json({ error: "Barang tidak ditemukan" });

  const newStock = stok !== undefined ? parseInt(stok) : existing.stok;
  const diff = newStock - existing.stok;

  const updates: any = { updated_at: new Date().toISOString() };
  if (nama_barang) updates.nama_barang = nama_barang;
  if (kategori) updates.kategori = kategori;
  if (satuan) updates.satuan = satuan;
  if (stok !== undefined) updates.stok = newStock;
  if (stok_minimum !== undefined) updates.stok_minimum = parseInt(stok_minimum);
  if (gambar_url !== undefined) updates.gambar_url = gambar_url;

  const { data, error } = await supabase.from("items").update(updates).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  if (diff !== 0) {
    await supabase.from("stock_history").insert({
      id: genId("hst"),
      item_id: id,
      tipe: diff > 0 ? "restock" : "pengurangan",
      jumlah: Math.abs(diff),
      keterangan: diff > 0
        ? `Penyesuaian: Tambah stok secara manual (${existing.nama_barang})`
        : `Penyesuaian: Kurangi stok secara manual (${existing.nama_barang})`,
      created_at: new Date().toISOString(),
    });
  }

  res.json(data);
});

app.post("/api/items/:id/restock", async (req, res) => {
  const { id } = req.params;
  const { jumlah, keterangan } = req.body;
  const amount = parseInt(jumlah) || 0;
  if (amount <= 0) return res.status(400).json({ error: "Jumlah restock harus lebih besar dari 0" });

  const { data: item, error: fetchErr } = await supabase.from("items").select("stok, nama_barang").eq("id", id).single();
  if (fetchErr || !item) return res.status(404).json({ error: "Barang tidak ditemukan" });

  const { data, error } = await supabase
    .from("items")
    .update({ stok: item.stok + amount, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("stock_history").insert({
    id: genId("hst"),
    item_id: id,
    tipe: "restock",
    jumlah: amount,
    keterangan: keterangan || "Restock manual oleh admin",
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, item: data });
});

app.delete("/api/items/:id", async (req, res) => {
  const { id } = req.params;
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: "Barang berhasil dihapus secara permanen" });
});

// =============================================================
// REQUESTS
// =============================================================
app.get("/api/requests", async (req, res) => {
  const { data, error } = await supabase
    .from("requests")
    .select("*, items(nama_barang, satuan)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const enhanced = data.map((r: any) => ({
    ...r,
    itemName: r.items?.nama_barang || "Barang Terhapus",
    itemSatuan: r.items?.satuan || "unit",
    items: undefined,
  }));
  res.json(enhanced);
});

app.post("/api/requests", async (req, res) => {
  const { item_id, nama_pemesan, bidang, jumlah_diminta, keterangan_customer, order_id } = req.body;

  const { data: itm, error: itmErr } = await supabase.from("items").select("*").eq("id", item_id).single();
  if (itmErr || !itm) return res.status(404).json({ error: "Barang tidak valid." });

  if ((itm.stok || 0) <= (itm.stok_minimum || 0)) {
    return res.status(400).json({ error: `Barang "${itm.nama_barang}" tidak dapat dipesan karena telah mencapai batas stok minimum.` });
  }

  const newRequest = {
    id: genId("req"),
    order_id: order_id || genId("ord"),
    item_id,
    nama_pemesan,
    bidang,
    jumlah_diminta: parseInt(jumlah_diminta) || 1,
    jumlah_disetujui: null,
    keterangan_customer: keterangan_customer || "",
    catatan_admin: "",
    status: "Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase.from("requests").insert(newRequest).select().single();
  if (error) return res.status(500).json({ error: error.message });

  res.status(201).json({ ...data, itemName: itm.nama_barang, itemSatuan: itm.satuan });
});

app.put("/api/requests/:id/process", async (req, res) => {
  const { id } = req.params;
  const { jumlah_disetujui, catatan_admin } = req.body;

  const { data: reqObj, error: rErr } = await supabase.from("requests").select("*").eq("id", id).single();
  if (rErr || !reqObj) return res.status(404).json({ error: "Permintaan tidak ditemukan" });

  const { data: itm, error: iErr } = await supabase.from("items").select("*").eq("id", reqObj.item_id).single();
  if (iErr || !itm) return res.status(400).json({ error: "Barang tidak ditemukan." });

  const apprvAmount = parseInt(jumlah_disetujui);
  if (isNaN(apprvAmount) || apprvAmount < 0) return res.status(400).json({ error: "Jumlah disetujui tidak valid." });
  if (apprvAmount > itm.stok) return res.status(400).json({ error: `Melebihi stok tersedia (${itm.stok}).` });
  if (apprvAmount > reqObj.jumlah_diminta) return res.status(400).json({ error: `Melebihi jumlah diminta (${reqObj.jumlah_diminta}).` });

  await supabase.from("items").update({ stok: itm.stok - apprvAmount, updated_at: new Date().toISOString() }).eq("id", itm.id);

  const { data, error } = await supabase.from("requests").update({
    jumlah_disetujui: apprvAmount,
    catatan_admin: catatan_admin || "",
    status: "Selesai",
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  }).eq("id", id).select().single();
  if (error) return res.status(500).json({ error: error.message });

  await supabase.from("stock_history").insert({
    id: genId("hst"),
    item_id: reqObj.item_id,
    tipe: "pengurangan",
    jumlah: apprvAmount,
    keterangan: `Disetujui untuk pemesan ${reqObj.nama_pemesan} (${reqObj.bidang}) - ID: ${id}`,
    created_at: new Date().toISOString(),
  });

  res.json({ success: true, request: data });
});

app.put("/api/requests/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { catatan_admin } = req.body;

  const { data, error } = await supabase.from("requests").update({
    status: "Ditolak",
    catatan_admin: catatan_admin || "Ditolak oleh admin",
    jumlah_disetujui: 0,
    updated_at: new Date().toISOString(),
    approved_at: new Date().toISOString(),
  }).eq("id", id).select().single();

  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, request: data });
});

// =============================================================
// STOCK HISTORY
// =============================================================
app.get("/api/stock-history", async (req, res) => {
  const { data, error } = await supabase
    .from("stock_history")
    .select("*, items(nama_barang)")
    .order("created_at", { ascending: false });
  if (error) return res.status(500).json({ error: error.message });

  const enhanced = data.map((h: any) => ({
    ...h,
    itemName: h.items?.nama_barang || "Barang Terhapus",
    items: undefined,
  }));
  res.json(enhanced);
});

// =============================================================
// DEPARTMENTS
// =============================================================
app.get("/api/departments", async (req, res) => {
  const { data, error } = await supabase.from("departments").select("*").order("nama_bidang");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

app.post("/api/departments", async (req, res) => {
  const { nama_bidang } = req.body;
  if (!nama_bidang?.trim()) return res.status(400).json({ error: "Nama bidang tidak boleh kosong" });

  const { data: existing } = await supabase
    .from("departments").select("id").ilike("nama_bidang", nama_bidang.trim()).single();
  if (existing) return res.status(400).json({ error: "Bidang sudah terdaftar." });

  const { data, error } = await supabase
    .from("departments")
    .insert({ id: genId("bdg"), nama_bidang: nama_bidang.trim() })
    .select().single();
  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

app.delete("/api/departments/:id", async (req, res) => {
  const { error } = await supabase.from("departments").delete().eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

// =============================================================
// STATS / DASHBOARD
// =============================================================
app.get("/api/stats", async (req, res) => {
  const { data: items } = await supabase.from("items").select("stok, stok_minimum");
  const { data: requests } = await supabase.from("requests").select("created_at, bidang, item_id, jumlah_diminta, status");

  const totalItems = items?.length || 0;
  const totalStockAll = items?.reduce((sum, i) => sum + (i.stok || 0), 0) || 0;
  const lowStockCount = items?.filter(i => (i.stok || 0) <= (i.stok_minimum || 5)).length || 0;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(); startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date(); startOfMonth.setMonth(now.getMonth() - 1);

  const todayReqCount = requests?.filter(r => new Date(r.created_at) >= startOfToday).length || 0;
  const weekReqCount = requests?.filter(r => new Date(r.created_at) >= startOfWeek).length || 0;
  const monthReqCount = requests?.filter(r => new Date(r.created_at) >= startOfMonth).length || 0;

  const reqMap: { [id: string]: { name: string; count: number } } = {};
  const { data: itemsAll } = await supabase.from("items").select("id, nama_barang");
  requests?.filter(r => r.status !== "Ditolak").forEach(r => {
    const itm = itemsAll?.find(i => i.id === r.item_id);
    const name = itm?.nama_barang || "Barang Terhapus";
    if (!reqMap[r.item_id]) reqMap[r.item_id] = { name, count: 0 };
    reqMap[r.item_id].count += r.jumlah_diminta || 0;
  });

  const mostRequestedItems = Object.values(reqMap).sort((a, b) => b.count - a.count).slice(0, 5);
  const requestTrendByBidang: { [b: string]: number } = {};
  requests?.forEach(r => {
    const b = r.bidang || "Lain-Lain";
    requestTrendByBidang[b] = (requestTrendByBidang[b] || 0) + 1;
  });

  res.json({ totalItems, totalStockAll, requestsCount: { today: todayReqCount, week: weekReqCount, month: monthReqCount }, mostRequestedItems, requestTrendByBidang, lowStockCount });
});

// =============================================================
// RESET DATABASE
// =============================================================
app.post("/api/db/reset", async (req, res) => {
  await supabase.from("stock_history").delete().neq("id", "");
  await supabase.from("requests").delete().neq("id", "");
  await supabase.from("items").delete().neq("id", "");
  await supabase.from("departments").delete().neq("id", "");
  res.json({ success: true, message: "Database berhasil direset." });
});

// =============================================================
// SERVER START
// =============================================================
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => res.sendFile(path.join(distPath, "index.html")));
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Persediaan ATK] Server berjalan di port ${PORT}`);
  });
}

export { app };

if (!process.env.VERCEL) {
  startServer();
}
