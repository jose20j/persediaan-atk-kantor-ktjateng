import express from "express";
import path from "path";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ override: true });

const app = express();
const PORT = 3000;

// Lazy Supabase init — tidak crash saat module load jika env var belum ada
let _supabase: any = null;
function getSupabase(): any {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

function genId(prefix: string) {
  return prefix + "-" + Math.random().toString(36).substr(2, 9);
}

// Health check — untuk diagnostik env vars di Vercel
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    node_env: process.env.NODE_ENV,
    vercel: !!process.env.VERCEL,
  });
});

// =============================================================
// AUTH LOGIN
// =============================================================
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data, error } = await getSupabase()
      .from("settings")
      .select("admin_username, admin_password")
      .single();

    if (error || !data) {
      if (username === "admin" && password === "admin123") {
        return res.json({ success: true, token: "admin_session_token_xyz" });
      }
      return res.status(401).json({ success: false, message: "Username atau password salah!" });
    }

    const d = data as any;
    if (username === d.admin_username && password === d.admin_password) {
      return res.json({ success: true, token: "admin_session_token_xyz" });
    }
    return res.status(401).json({ success: false, message: "Username atau password salah!" });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// =============================================================
// SETTINGS
// =============================================================
app.get("/api/settings", async (_req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("settings")
      .select("nomor_whatsapp_admin, nama_kantor")
      .single();

    if (error || !data) {
      return res.json({ nomor_whatsapp_admin: "6281234567890", nama_kantor: "Kantor ATK" });
    }
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { nomor_whatsapp_admin, nama_kantor, new_password } = req.body;
    const updates: any = {};
    if (nomor_whatsapp_admin) updates.nomor_whatsapp_admin = nomor_whatsapp_admin;
    if (nama_kantor) updates.nama_kantor = nama_kantor;
    if (new_password && new_password.trim() !== "") updates.admin_password = new_password;

    const { error } = await getSupabase().from("settings").update(updates).eq("id", 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: "Pengaturan berhasil diperbarui." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// ITEMS
// =============================================================
app.get("/api/items", async (_req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("items")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/items", async (req, res) => {
  try {
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

    const { data, error } = await getSupabase().from("items").insert(newItem).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await getSupabase().from("stock_history").insert({
      id: genId("hst"),
      item_id: newItem.id,
      tipe: "restock",
      jumlah: newItem.stok,
      keterangan: `Stok awal barang baru: ${newItem.nama_barang}`,
      created_at: new Date().toISOString(),
    });

    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_barang, kategori, satuan, stok, stok_minimum, gambar_url } = req.body;

    const { data: existing, error: fetchErr } = await getSupabase()
      .from("items").select("*").eq("id", id).single();
    if (fetchErr || !existing) return res.status(404).json({ error: "Barang tidak ditemukan" });

    const ex = existing as any;
    const newStock = stok !== undefined ? parseInt(stok) : ex.stok;
    const diff = newStock - ex.stok;

    const updates: any = { updated_at: new Date().toISOString() };
    if (nama_barang) updates.nama_barang = nama_barang;
    if (kategori) updates.kategori = kategori;
    if (satuan) updates.satuan = satuan;
    if (stok !== undefined) updates.stok = newStock;
    if (stok_minimum !== undefined) updates.stok_minimum = parseInt(stok_minimum);
    if (gambar_url !== undefined) updates.gambar_url = gambar_url;

    const { data, error } = await getSupabase().from("items").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    if (diff !== 0) {
      await getSupabase().from("stock_history").insert({
        id: genId("hst"),
        item_id: id,
        tipe: diff > 0 ? "restock" : "pengurangan",
        jumlah: Math.abs(diff),
        keterangan: diff > 0
          ? `Penyesuaian: Tambah stok secara manual (${ex.nama_barang})`
          : `Penyesuaian: Kurangi stok secara manual (${ex.nama_barang})`,
        created_at: new Date().toISOString(),
      });
    }

    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/items/:id/restock", async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah, keterangan } = req.body;
    const amount = parseInt(jumlah) || 0;
    if (amount <= 0) return res.status(400).json({ error: "Jumlah restock harus lebih besar dari 0" });

    const { data: item, error: fetchErr } = await getSupabase().from("items").select("stok, nama_barang").eq("id", id).single();
    if (fetchErr || !item) return res.status(404).json({ error: "Barang tidak ditemukan" });

    const itm = item as any;
    const { data, error } = await getSupabase()
      .from("items")
      .update({ stok: itm.stok + amount, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) return res.status(500).json({ error: error.message });

    await getSupabase().from("stock_history").insert({
      id: genId("hst"),
      item_id: id,
      tipe: "restock",
      jumlah: amount,
      keterangan: keterangan || "Restock manual oleh admin",
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, item: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const { error } = await getSupabase().from("items").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, message: "Barang berhasil dihapus secara permanen" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// REQUESTS
// =============================================================
app.get("/api/requests", async (_req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("requests")
      .select("*, items(nama_barang, satuan)")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const enhanced = (data as any[]).map((r) => ({
      ...r,
      itemName: r.items?.nama_barang || "Barang Terhapus",
      itemSatuan: r.items?.satuan || "unit",
      items: undefined,
    }));
    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/requests", async (req, res) => {
  try {
    const { item_id, nama_pemesan, bidang, jumlah_diminta, keterangan_customer, order_id } = req.body;

    const { data: itm, error: itmErr } = await getSupabase().from("items").select("*").eq("id", item_id).single();
    if (itmErr || !itm) return res.status(404).json({ error: "Barang tidak valid." });

    const item = itm as any;
    if ((item.stok || 0) <= (item.stok_minimum || 0)) {
      return res.status(400).json({ error: `Barang "${item.nama_barang}" tidak dapat dipesan karena telah mencapai batas stok minimum.` });
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

    const { data, error } = await getSupabase().from("requests").insert(newRequest).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ ...(data as any), itemName: item.nama_barang, itemSatuan: item.satuan });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/requests/:id/process", async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah_disetujui, catatan_admin } = req.body;

    const { data: reqObj, error: rErr } = await getSupabase().from("requests").select("*").eq("id", id).single();
    if (rErr || !reqObj) return res.status(404).json({ error: "Permintaan tidak ditemukan" });

    const ro = reqObj as any;
    const { data: itm, error: iErr } = await getSupabase().from("items").select("*").eq("id", ro.item_id).single();
    if (iErr || !itm) return res.status(400).json({ error: "Barang tidak ditemukan." });

    const item = itm as any;
    const apprvAmount = parseInt(jumlah_disetujui);
    if (isNaN(apprvAmount) || apprvAmount < 0) return res.status(400).json({ error: "Jumlah disetujui tidak valid." });
    if (apprvAmount > item.stok) return res.status(400).json({ error: `Melebihi stok tersedia (${item.stok}).` });
    if (apprvAmount > ro.jumlah_diminta) return res.status(400).json({ error: `Melebihi jumlah diminta (${ro.jumlah_diminta}).` });

    await getSupabase().from("items").update({ stok: item.stok - apprvAmount, updated_at: new Date().toISOString() }).eq("id", item.id);

    const { data, error } = await getSupabase().from("requests").update({
      jumlah_disetujui: apprvAmount,
      catatan_admin: catatan_admin || "",
      status: "Selesai",
      updated_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });

    await getSupabase().from("stock_history").insert({
      id: genId("hst"),
      item_id: ro.item_id,
      tipe: "pengurangan",
      jumlah: apprvAmount,
      keterangan: `Disetujui untuk pemesan ${ro.nama_pemesan} (${ro.bidang}) - ID: ${id}`,
      created_at: new Date().toISOString(),
    });

    res.json({ success: true, request: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan_admin } = req.body;

    const { data, error } = await getSupabase().from("requests").update({
      status: "Ditolak",
      catatan_admin: catatan_admin || "Ditolak oleh admin",
      jumlah_disetujui: 0,
      updated_at: new Date().toISOString(),
      approved_at: new Date().toISOString(),
    }).eq("id", id).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, request: data });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// STOCK HISTORY
// =============================================================
app.get("/api/stock-history", async (_req, res) => {
  try {
    const { data, error } = await getSupabase()
      .from("stock_history")
      .select("*, items(nama_barang)")
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });

    const enhanced = (data as any[]).map((h) => ({
      ...h,
      itemName: h.items?.nama_barang || "Barang Terhapus",
      items: undefined,
    }));
    res.json(enhanced);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// DEPARTMENTS
// =============================================================
app.get("/api/departments", async (_req, res) => {
  try {
    const { data, error } = await getSupabase().from("departments").select("*").order("nama_bidang");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/departments", async (req, res) => {
  try {
    const { nama_bidang } = req.body;
    if (!nama_bidang?.trim()) return res.status(400).json({ error: "Nama bidang tidak boleh kosong" });

    const { data: existing } = await getSupabase()
      .from("departments").select("id").ilike("nama_bidang", nama_bidang.trim()).single();
    if (existing) return res.status(400).json({ error: "Bidang sudah terdaftar." });

    const { data, error } = await getSupabase()
      .from("departments")
      .insert({ id: genId("bdg"), nama_bidang: nama_bidang.trim() })
      .select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/departments/:id", async (req, res) => {
  try {
    const { error } = await getSupabase().from("departments").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// STATS / DASHBOARD
// =============================================================
app.get("/api/stats", async (_req, res) => {
  try {
    const { data: items } = await getSupabase().from("items").select("stok, stok_minimum");
    const { data: requests } = await getSupabase().from("requests").select("created_at, bidang, item_id, jumlah_diminta, status");

    const totalItems = items?.length || 0;
    const totalStockAll = (items as any[])?.reduce((sum, i) => sum + (i.stok || 0), 0) || 0;
    const lowStockCount = (items as any[])?.filter(i => (i.stok || 0) <= (i.stok_minimum || 5)).length || 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(); startOfWeek.setDate(now.getDate() - 7);
    const startOfMonth = new Date(); startOfMonth.setMonth(now.getMonth() - 1);

    const reqs = (requests as any[]) || [];
    const todayReqCount = reqs.filter(r => new Date(r.created_at) >= startOfToday).length;
    const weekReqCount = reqs.filter(r => new Date(r.created_at) >= startOfWeek).length;
    const monthReqCount = reqs.filter(r => new Date(r.created_at) >= startOfMonth).length;

    const reqMap: { [id: string]: { name: string; count: number } } = {};
    const { data: itemsAll } = await getSupabase().from("items").select("id, nama_barang");
    reqs.filter(r => r.status !== "Ditolak").forEach(r => {
      const itm = (itemsAll as any[])?.find(i => i.id === r.item_id);
      const name = itm?.nama_barang || "Barang Terhapus";
      if (!reqMap[r.item_id]) reqMap[r.item_id] = { name, count: 0 };
      reqMap[r.item_id].count += r.jumlah_diminta || 0;
    });

    const mostRequestedItems = Object.values(reqMap).sort((a, b) => b.count - a.count).slice(0, 5);
    const requestTrendByBidang: { [b: string]: number } = {};
    reqs.forEach(r => {
      const b = r.bidang || "Lain-Lain";
      requestTrendByBidang[b] = (requestTrendByBidang[b] || 0) + 1;
    });

    res.json({ totalItems, totalStockAll, requestsCount: { today: todayReqCount, week: weekReqCount, month: monthReqCount }, mostRequestedItems, requestTrendByBidang, lowStockCount });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// =============================================================
// RESET DATABASE
// =============================================================
app.post("/api/db/reset", async (_req, res) => {
  try {
    await getSupabase().from("stock_history").delete().neq("id", "");
    await getSupabase().from("requests").delete().neq("id", "");
    await getSupabase().from("items").delete().neq("id", "");
    await getSupabase().from("departments").delete().neq("id", "");
    res.json({ success: true, message: "Database berhasil direset." });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
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
