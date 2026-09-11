import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

let _supabase: any = null;
function db(): any {
  if (!_supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY belum dikonfigurasi.");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

function genId(prefix: string) {
  return prefix + "-" + Math.random().toString(36).substr(2, 9);
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    has_supabase_url: !!process.env.SUPABASE_URL,
    has_supabase_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    vercel: !!process.env.VERCEL,
  });
});

// CUSTOMER AUTH
app.post("/api/auth/customer/register", async (req, res) => {
  try {
    const { username, password, nama_lengkap, bidang, unit } = req.body;
    if (!username?.trim() || !password?.trim() || !nama_lengkap?.trim() || !bidang?.trim())
      return res.status(400).json({ error: "Semua field wajib diisi." });
    const { data: existing } = await db().from("customers").select("id").eq("username", username.trim()).maybeSingle();
    if (existing) return res.status(409).json({ error: "Username sudah digunakan, pilih username lain." });
    const newCustomer = {
      id: genId("cus"), username: username.trim(), password: password.trim(),
      nama_lengkap: nama_lengkap.trim(), bidang: bidang.trim(), unit: unit?.trim() || null,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await db().from("customers").insert(newCustomer).select("id, username, nama_lengkap, bidang, unit, created_at").single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/auth/customer/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username dan password wajib diisi." });
    const { data, error } = await db().from("customers")
      .select("id, username, nama_lengkap, bidang, unit, created_at")
      .eq("username", username.trim())
      .eq("password", password.trim())
      .maybeSingle();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(401).json({ error: "Username atau password salah." });
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get("/api/customer/orders", async (req, res) => {
  try {
    const { customer_id } = req.query;
    if (!customer_id) return res.status(400).json({ error: "customer_id diperlukan." });
    const { data, error } = await db().from("requests")
      .select("*, items(nama_barang, satuan)")
      .eq("customer_id", customer_id)
      .order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json((data || []).map((r: any) => ({
      ...r, itemName: r.items?.nama_barang || "Barang Terhapus", itemSatuan: r.items?.satuan || "unit", items: undefined,
    })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ADMIN AUTH
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const { data, error } = await db().from("settings").select("admin_username, admin_password").single();
    if (error || !data) {
      return username === "admin" && password === "admin123"
        ? res.json({ success: true })
        : res.status(401).json({ success: false, message: "Username atau password salah!" });
    }
    return username === data.admin_username && password === data.admin_password
      ? res.json({ success: true })
      : res.status(401).json({ success: false, message: "Username atau password salah!" });
  } catch (e: any) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// SETTINGS
app.get("/api/settings", async (_req, res) => {
  try {
    const { data, error } = await db().from("settings").select("nomor_whatsapp_admin, nama_kantor").single();
    if (error || !data) return res.json({ nomor_whatsapp_admin: "6281234567890", nama_kantor: "Kantor ATK" });
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/settings", async (req, res) => {
  try {
    const { nomor_whatsapp_admin, nama_kantor, new_password } = req.body;
    const updates: any = {};
    if (nomor_whatsapp_admin) updates.nomor_whatsapp_admin = nomor_whatsapp_admin;
    if (nama_kantor) updates.nama_kantor = nama_kantor;
    if (new_password?.trim()) updates.admin_password = new_password;
    const { error } = await db().from("settings").update(updates).eq("id", 1);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// ITEMS
app.get("/api/items", async (_req, res) => {
  try {
    const { data, error } = await db().from("items").select("*").order("created_at", { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/items", async (req, res) => {
  try {
    const { nama_barang, kategori, satuan, stok, stok_minimum, gambar_url } = req.body;
    const newItem = {
      id: genId("itm"), nama_barang,
      kategori: kategori || "Umum", satuan: satuan || "Pcs",
      stok: parseInt(stok) || 0, stok_minimum: parseInt(stok_minimum) || 5,
      gambar_url: gambar_url || "",
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data, error } = await db().from("items").insert(newItem).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await db().from("stock_history").insert({
      id: genId("hst"), item_id: newItem.id, tipe: "restock", jumlah: newItem.stok,
      keterangan: `Stok awal barang baru: ${newItem.nama_barang}`, created_at: new Date().toISOString(),
    });
    res.status(201).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/items/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { nama_barang, kategori, satuan, stok, stok_minimum, gambar_url } = req.body;
    const { data: existing, error: fetchErr } = await db().from("items").select("*").eq("id", id).single();
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
    const { data, error } = await db().from("items").update(updates).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (diff !== 0) {
      await db().from("stock_history").insert({
        id: genId("hst"), item_id: id,
        tipe: diff > 0 ? "restock" : "pengurangan", jumlah: Math.abs(diff),
        keterangan: diff > 0 ? `Tambah stok manual (${existing.nama_barang})` : `Kurangi stok manual (${existing.nama_barang})`,
        created_at: new Date().toISOString(),
      });
    }
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/items/:id/restock", async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah, keterangan } = req.body;
    const amount = parseInt(jumlah) || 0;
    if (amount <= 0) return res.status(400).json({ error: "Jumlah harus > 0" });
    const { data: item, error: fetchErr } = await db().from("items").select("stok, nama_barang").eq("id", id).single();
    if (fetchErr || !item) return res.status(404).json({ error: "Barang tidak ditemukan" });
    const { data, error } = await db().from("items").update({ stok: item.stok + amount, updated_at: new Date().toISOString() }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await db().from("stock_history").insert({
      id: genId("hst"), item_id: id, tipe: "restock", jumlah: amount,
      keterangan: keterangan || "Restock manual oleh admin", created_at: new Date().toISOString(),
    });
    res.json({ success: true, item: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/items/:id", async (req, res) => {
  try {
    const { error } = await db().from("items").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// REQUESTS
app.get("/api/requests", async (_req, res) => {
  try {
    const { data, error } = await db().from("requests").select("*, items(nama_barang, satuan)").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map((r: any) => ({ ...r, itemName: r.items?.nama_barang || "Barang Terhapus", itemSatuan: r.items?.satuan || "unit", items: undefined })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/requests", async (req, res) => {
  try {
    const { item_id, nama_pemesan, bidang, unit, jumlah_diminta, keterangan_customer, order_id, customer_id } = req.body;
    const { data: itm, error: itmErr } = await db().from("items").select("*").eq("id", item_id).single();
    if (itmErr || !itm) return res.status(404).json({ error: "Barang tidak valid." });
    if ((itm.stok || 0) <= (itm.stok_minimum || 0)) return res.status(400).json({ error: `Barang "${itm.nama_barang}" stok minimum tercapai.` });
    const newRequest = {
      id: genId("req"), order_id: order_id || genId("ord"),
      item_id, nama_pemesan, bidang, unit: unit || null,
      jumlah_diminta: parseInt(jumlah_diminta) || 1,
      jumlah_disetujui: null, keterangan_customer: keterangan_customer || "",
      catatan_admin: "", status: "Pending",
      customer_id: customer_id || null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
    };
    const { data, error } = await db().from("requests").insert(newRequest).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json({ ...data, itemName: itm.nama_barang, itemSatuan: itm.satuan });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/requests/:id/process", async (req, res) => {
  try {
    const { id } = req.params;
    const { jumlah_disetujui, catatan_admin } = req.body;
    const { data: reqObj, error: rErr } = await db().from("requests").select("*").eq("id", id).single();
    if (rErr || !reqObj) return res.status(404).json({ error: "Permintaan tidak ditemukan" });
    if (reqObj.status !== "Pending") return res.status(400).json({ error: "Pesanan bukan dalam status Pending." });
    const { data: itm, error: iErr } = await db().from("items").select("*").eq("id", reqObj.item_id).single();
    if (iErr || !itm) return res.status(400).json({ error: "Barang tidak ditemukan." });
    const apprvAmount = parseInt(jumlah_disetujui);
    if (isNaN(apprvAmount) || apprvAmount < 0) return res.status(400).json({ error: "Jumlah tidak valid." });
    if (apprvAmount > itm.stok) return res.status(400).json({ error: `Melebihi stok (${itm.stok}).` });
    if (apprvAmount > reqObj.jumlah_diminta) return res.status(400).json({ error: `Melebihi jumlah diminta (${reqObj.jumlah_diminta}).` });
    await db().from("items").update({ stok: itm.stok - apprvAmount, updated_at: new Date().toISOString() }).eq("id", itm.id);
    await db().from("stock_history").insert({
      id: genId("hst"), item_id: reqObj.item_id, tipe: "pengurangan", jumlah: apprvAmount,
      keterangan: `Disetujui untuk ${reqObj.nama_pemesan} (${reqObj.bidang}) - ID: ${id}`,
      created_at: new Date().toISOString(),
    });
    const { data, error } = await db().from("requests").update({
      jumlah_disetujui: apprvAmount, catatan_admin: catatan_admin || "",
      status: "Diproses", updated_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, request: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/requests/:id/complete", async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await db().from("requests").update({
      status: "Selesai", updated_at: new Date().toISOString(), approved_at: new Date().toISOString(),
    }).eq("id", id).in("status", ["Diproses"]).select().single();
    if (error) return res.status(500).json({ error: error.message });
    if (!data) return res.status(400).json({ error: "Pesanan tidak dalam status Diproses." });
    res.json({ success: true, request: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put("/api/requests/:id/reject", async (req, res) => {
  try {
    const { id } = req.params;
    const { catatan_admin } = req.body;
    const { data, error } = await db().from("requests").update({
      status: "Ditolak", catatan_admin: catatan_admin || "Ditolak oleh admin",
      jumlah_disetujui: 0, updated_at: new Date().toISOString(), approved_at: new Date().toISOString(),
    }).eq("id", id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true, request: data });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// STOCK HISTORY
app.get("/api/stock-history", async (_req, res) => {
  try {
    const { data, error } = await db().from("stock_history").select("*, items(nama_barang)").order("created_at", { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data.map((h: any) => ({ ...h, itemName: h.items?.nama_barang || "Barang Terhapus", items: undefined })));
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// DEPARTMENTS
app.get("/api/departments", async (_req, res) => {
  try {
    const { data, error } = await db().from("departments").select("*").order("nama_bidang");
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post("/api/departments", async (req, res) => {
  try {
    const { nama_bidang, parent_id } = req.body;
    if (!nama_bidang?.trim()) return res.status(400).json({ error: "Nama tidak boleh kosong" });
    // Nama hanya perlu unik dalam lingkupnya: antar bidang, atau antar unit
    // dalam satu bidang. Sebuah unit boleh senama dengan bidang induknya —
    // "Pemulihan Aset" memang begitu di struktur kantor.
    let dupe = db().from("departments").select("id").ilike("nama_bidang", nama_bidang.trim());
    dupe = parent_id ? dupe.eq("parent_id", parent_id) : dupe.is("parent_id", null);
    const { data: existing } = await dupe.maybeSingle();
    if (existing) return res.status(400).json({ error: parent_id ? "Unit sudah terdaftar di bidang ini." : "Bidang sudah terdaftar." });
    const { data, error } = await db().from("departments").insert({ id: genId(parent_id ? "unt" : "bid"), nama_bidang: nama_bidang.trim(), parent_id: parent_id || null }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete("/api/departments/:id", async (req, res) => {
  try {
    const { error } = await db().from("departments").delete().eq("id", req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// STATS
app.get("/api/stats", async (_req, res) => {
  try {
    const { data: items } = await db().from("items").select("stok, stok_minimum");
    const { data: requests } = await db().from("requests").select("created_at, bidang, item_id, jumlah_diminta, status");
    const { data: itemsAll } = await db().from("items").select("id, nama_barang");
    const reqs: any[] = requests || [];
    const itms: any[] = items || [];
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const week = new Date(); week.setDate(now.getDate() - 7);
    const month = new Date(); month.setMonth(now.getMonth() - 1);
    const reqMap: any = {};
    reqs.filter(r => r.status !== "Ditolak").forEach(r => {
      const itm = (itemsAll as any[])?.find(i => i.id === r.item_id);
      if (!reqMap[r.item_id]) reqMap[r.item_id] = { name: itm?.nama_barang || "Terhapus", count: 0 };
      reqMap[r.item_id].count += r.jumlah_diminta || 0;
    });
    const trendByBidang: any = {};
    reqs.forEach(r => { const b = r.bidang || "Lain-Lain"; trendByBidang[b] = (trendByBidang[b] || 0) + 1; });
    res.json({
      totalItems: itms.length,
      totalStockAll: itms.reduce((s, i) => s + (i.stok || 0), 0),
      lowStockCount: itms.filter(i => (i.stok || 0) <= (i.stok_minimum || 5)).length,
      requestsCount: {
        today: reqs.filter(r => new Date(r.created_at) >= today).length,
        week: reqs.filter(r => new Date(r.created_at) >= week).length,
        month: reqs.filter(r => new Date(r.created_at) >= month).length,
      },
      mostRequestedItems: Object.values(reqMap).sort((a: any, b: any) => b.count - a.count).slice(0, 5),
      requestTrendByBidang: trendByBidang,
    });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

// RESET DB
app.post("/api/db/reset", async (_req, res) => {
  try {
    await db().from("stock_history").delete().neq("id", "");
    await db().from("requests").delete().neq("id", "");
    await db().from("items").delete().neq("id", "");
    await db().from("departments").delete().neq("id", "");
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

export default app;
