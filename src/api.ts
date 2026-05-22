import { Item, RequestOrder, Setting, StockHistory, Bidang, Stats } from "./types";

// Detect if we can communicate with node server or if we are deployed purely as static SPA
let useLocalFallback = false;

// Quick check if we are in static environment
async function checkBackend() {
  try {
    const res = await fetch("/api/settings", { signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      useLocalFallback = false;
    } else {
      useLocalFallback = true;
    }
  } catch (err) {
    useLocalFallback = true;
  }
}

// Check on load
checkBackend();

const DEFAULT_ITEMS: Item[] = [
  {
    id: "itm-1",
    nama_barang: "Kertas HVS Sinar Dunia A4 80gr",
    kategori: "Kertas",
    satuan: "Rim",
    stok: 15,
    stok_minimum: 5,
    gambar_url: "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-2",
    nama_barang: "Kertas HVS Sinar Dunia F4 80gr",
    kategori: "Kertas",
    satuan: "Rim",
    stok: 12,
    stok_minimum: 5,
    gambar_url: "https://images.unsplash.com/photo-1512418490979-917ba593d887?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-3",
    nama_barang: "Pulpen Gel Kenko Easy Gel 0.5mm",
    kategori: "Alat Tulis",
    satuan: "Lusin",
    stok: 8,
    stok_minimum: 3,
    gambar_url: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-4",
    nama_barang: "Pensil Faber-Castell 2B Original",
    kategori: "Alat Tulis",
    satuan: "Pcs",
    stok: 42,
    stok_minimum: 10,
    gambar_url: "https://images.unsplash.com/photo-1513542789411-b6a5d4f31634?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-5",
    nama_barang: "Stapler MAX HD-10 Tokyo Original",
    kategori: "Peralatan Kantor",
    satuan: "Pcs",
    stok: 3,
    stok_minimum: 4,
    gambar_url: "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-6",
    nama_barang: "Isi Staples MAX No. 10",
    kategori: "Peralatan Kantor",
    satuan: "Box",
    stok: 15,
    stok_minimum: 5,
    gambar_url: "https://images.unsplash.com/photo-1512418490979-917ba593d887?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-7",
    nama_barang: "Tinta HP Ink Tank GT53 Black",
    kategori: "Tinta & Toner",
    satuan: "Pcs",
    stok: 2,
    stok_minimum: 3,
    gambar_url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "itm-8",
    nama_barang: "Buku Memo Spiral Kayu A5",
    kategori: "Buku & Kertas",
    satuan: "Pcs",
    stok: 24,
    stok_minimum: 5,
    gambar_url: "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=500&auto=format&fit=crop&q=60",
    created_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_REQUESTS: RequestOrder[] = [
  {
    id: "req-1",
    item_id: "itm-1",
    nama_pemesan: "Budi Santoso",
    bidang: "IT",
    jumlah_diminta: 5,
    jumlah_disetujui: 2,
    keterangan_customer: "Untuk cetak dokumentasi modul sistem baru",
    catatan_admin: "Stok terbatas, dibagi rata dengan Divisi HRD",
    status: "Selesai",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "req-2",
    item_id: "itm-3",
    nama_pemesan: "Siti Rahma",
    bidang: "Keuangan",
    jumlah_diminta: 2,
    jumlah_disetujui: 2,
    keterangan_customer: "Untuk operasional pelaporan pajak bulanan",
    catatan_admin: "Permintaan disetujui penuh",
    status: "Selesai",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "req-3",
    item_id: "itm-5",
    nama_pemesan: "Wahyu",
    bidang: "HRD",
    jumlah_diminta: 1,
    jumlah_disetujui: null,
    keterangan_customer: "Butuh stapler tambahan di lobby penerimaan karyawan",
    catatan_admin: "",
    status: "Pending",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
];

const DEFAULT_SETTINGS: Setting & { admin_pass: string } = {
  nomor_whatsapp_admin: "6281234567890",
  nama_kantor: "Kejaksaan Tinggi Jawa Tengah",
  admin_pass: "admin123"
};

const DEFAULT_HISTORY: StockHistory[] = [
  {
    id: "hst-1",
    item_id: "itm-1",
    tipe: "restock",
    jumlah: 20,
    keterangan: "Stok awal server",
    created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "hst-2",
    item_id: "itm-1",
    tipe: "pengurangan",
    jumlah: 2,
    keterangan: "Disetujui untuk pesanan Budi Santoso (IT) - ID: req-1",
    created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: "hst-3",
    item_id: "itm-3",
    tipe: "pengurangan",
    jumlah: 2,
    keterangan: "Disetujui untuk pesanan Siti Rahma (Keuangan) - ID: req-2",
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  }
];

const DEFAULT_BIDANG: Bidang[] = [
  { id: "bdg-1", nama_bidang: "IT" },
  { id: "bdg-2", nama_bidang: "HRD" },
  { id: "bdg-3", nama_bidang: "Keuangan" },
  { id: "bdg-4", nama_bidang: "Marketing" },
  { id: "bdg-5", nama_bidang: "Umum & Rumah Tangga" },
  { id: "bdg-6", nama_bidang: "Operasional" }
];

// Local state helpers for LocalStorage
function getLocal<T>(key: string, fallback: T): T {
  const got = localStorage.getItem(key);
  if (!got) {
    localStorage.setItem(key, JSON.stringify(fallback));
    return fallback;
  }
  try {
    return JSON.parse(got);
  } catch (err) {
    return fallback;
  }
}

function setLocal<T>(key: string, val: T) {
  localStorage.setItem(key, JSON.stringify(val));
}

// Initialize LocalStorage elements if missing
export function initializeLocal() {
  getLocal("atk_items", DEFAULT_ITEMS);
  getLocal("atk_requests", DEFAULT_REQUESTS);
  getLocal("atk_settings", DEFAULT_SETTINGS);
  getLocal("atk_history", DEFAULT_HISTORY);
  getLocal("atk_bidang", DEFAULT_BIDANG);
}

// ----------------- EXPORTED CLIENT FUNCTIONS -----------------

export async function loginAdmin(username: string, password: string): Promise<{ success: boolean; message?: string }> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      if (res.ok) {
        localStorage.setItem("atk_admin_token", "logged_in");
        return { success: true };
      }
      const data = await res.json();
      return { success: false, message: data.message || "Login gagal" };
    } catch (e) {
      // fallback
    }
  }

  // Local Storage Auth
  const settings = getLocal("atk_settings", DEFAULT_SETTINGS);
  if (username === "admin" && password === (settings.admin_pass || "admin123")) {
    localStorage.setItem("atk_admin_token", "logged_in");
    return { success: true };
  }
  return { success: false, message: "Username atau password salah!" };
}

export function logoutAdmin() {
  localStorage.removeItem("atk_admin_token");
}

export function isAdminLoggedIn(): boolean {
  return localStorage.getItem("atk_admin_token") === "logged_in";
}

export async function getItems(): Promise<Item[]> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/items");
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  return getLocal("atk_items", DEFAULT_ITEMS);
}

export async function createItem(item: Omit<Item, "id" | "created_at" | "updated_at">): Promise<Item> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const newItem: Item = {
    ...item,
    id: "itm-" + Math.random().toString(36).substr(2, 9),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  items.push(newItem);
  setLocal("atk_items", items);

  // Add stock history log
  const history = getLocal("atk_history", DEFAULT_HISTORY);
  history.push({
    id: "hst-" + Math.random().toString(36).substr(2, 9),
    item_id: newItem.id,
    tipe: "restock",
    jumlah: newItem.stok,
    keterangan: `Stok awal barang baru: ${newItem.nama_barang}`,
    created_at: new Date().toISOString()
  });
  setLocal("atk_history", history);

  return newItem;
}

export async function updateItem(id: string, item: Partial<Item>): Promise<Item> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    const oldStock = items[idx].stok || 0;
    const newStock = item.stok !== undefined ? item.stok : oldStock;
    const diff = newStock - oldStock;

    items[idx] = {
      ...items[idx],
      ...item,
      updated_at: new Date().toISOString()
    };
    setLocal("atk_items", items);

    if (diff !== 0) {
      const history = getLocal("atk_history", DEFAULT_HISTORY);
      history.push({
        id: "hst-" + Math.random().toString(36).substr(2, 9),
        item_id: id,
        tipe: diff > 0 ? "restock" : "pengurangan",
        jumlah: Math.abs(diff),
        keterangan: diff > 0 
          ? `Penyesuaian: Tambah stok secara manual (${items[idx].nama_barang})` 
          : `Penyesuaian: Kurangi stok secara manual (${items[idx].nama_barang})`,
        created_at: new Date().toISOString()
      });
      setLocal("atk_history", history);
    }

    return items[idx];
  }
  throw new Error("Item tidak ditemukan.");
}

export async function restockItem(id: string, jumlah: number, keterangan: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/items/${id}/restock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah, keterangan })
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const idx = items.findIndex(i => i.id === id);
  if (idx !== -1) {
    items[idx].stok += jumlah;
    items[idx].updated_at = new Date().toISOString();
    setLocal("atk_items", items);

    const history = getLocal("atk_history", DEFAULT_HISTORY);
    history.push({
      id: "hst-" + Math.random().toString(36).substr(2, 9),
      item_id: id,
      tipe: "restock",
      jumlah,
      keterangan: keterangan || "Restock manual",
      created_at: new Date().toISOString()
    });
    setLocal("atk_history", history);
    return true;
  }
  return false;
}

export async function deleteItem(id: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/items/${id}`, { method: "DELETE" });
      if (res.ok) return true;
    } catch (e) {}
  }

  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const filtered = items.filter(i => i.id !== id);
  setLocal("atk_items", filtered);
  return true;
}

export async function getRequests(): Promise<RequestOrder[]> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/requests");
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const requests = getLocal("atk_requests", DEFAULT_REQUESTS);
  const items = getLocal("atk_items", DEFAULT_ITEMS);

  return requests.map(r => {
    const itm = items.find(i => i.id === r.item_id);
    return {
      ...r,
      itemName: itm ? itm.nama_barang : "Barang Terhapus",
      itemSatuan: itm ? itm.satuan : "unit"
    };
  });
}

export async function createRequest(order: Omit<RequestOrder, "id" | "jumlah_disetujui" | "status" | "created_at" | "updated_at" | "catatan_admin">): Promise<RequestOrder> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(order)
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const requests = getLocal("atk_requests", DEFAULT_REQUESTS);
  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const itm = items.find(i => i.id === order.item_id);

  const newReq: RequestOrder = {
    ...order,
    id: "req-" + Math.random().toString(36).substr(2, 9),
    jumlah_disetujui: null,
    status: "Pending",
    catatan_admin: "",
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  requests.unshift(newReq);
  setLocal("atk_requests", requests);

  return {
    ...newReq,
    itemName: itm ? itm.nama_barang : "Barang",
    itemSatuan: itm ? itm.satuan : "pcs"
  };
}

export async function processRequest(id: string, jumlah_disetujui: number, catatan_admin: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/requests/${id}/process`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jumlah_disetujui, catatan_admin })
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  const requests = getLocal("atk_requests", DEFAULT_REQUESTS);
  const items = getLocal("atk_items", DEFAULT_ITEMS);

  const reqIdx = requests.findIndex(r => r.id === id);
  if (reqIdx === -1) return false;

  const reqObj = requests[reqIdx];
  const itemIdx = items.findIndex(i => i.id === reqObj.item_id);
  if (itemIdx === -1) return false;

  // Deduct stock
  items[itemIdx].stok -= jumlah_disetujui;
  items[itemIdx].updated_at = new Date().toISOString();
  setLocal("atk_items", items);

  // Update request
  requests[reqIdx].jumlah_disetujui = jumlah_disetujui;
  requests[reqIdx].catatan_admin = catatan_admin;
  requests[reqIdx].status = "Selesai";
  requests[reqIdx].updated_at = new Date().toISOString();
  requests[reqIdx].approved_at = new Date().toISOString();
  setLocal("atk_requests", requests);

  // Add stock log
  const history = getLocal("atk_history", DEFAULT_HISTORY);
  history.push({
    id: "hst-" + Math.random().toString(36).substr(2, 9),
    item_id: reqObj.item_id,
    tipe: "pengurangan",
    jumlah: jumlah_disetujui,
    keterangan: `Disetujui untuk pemesan ${reqObj.nama_pemesan} (${reqObj.bidang}) - ID: ${id}`,
    created_at: new Date().toISOString()
  });
  setLocal("atk_history", history);

  return true;
}

export async function rejectRequest(id: string, catatan_admin: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/requests/${id}/reject`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ catatan_admin })
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  const requests = getLocal("atk_requests", DEFAULT_REQUESTS);
  const reqIdx = requests.findIndex(r => r.id === id);
  if (reqIdx === -1) return false;

  requests[reqIdx].status = "Ditolak";
  requests[reqIdx].catatan_admin = catatan_admin || "Ditolak admin";
  requests[reqIdx].jumlah_disetujui = 0;
  requests[reqIdx].updated_at = new Date().toISOString();
  requests[reqIdx].approved_at = new Date().toISOString();
  setLocal("atk_requests", requests);

  return true;
}

export async function getSettings(): Promise<Setting> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  const full = getLocal("atk_settings", DEFAULT_SETTINGS);
  return {
    nomor_whatsapp_admin: full.nomor_whatsapp_admin,
    nama_kantor: full.nama_kantor
  };
}

export async function updateSettings(settings: Partial<Setting & { new_password?: string }>): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (res.ok) return true;
    } catch (e) {}
  }

  const current = getLocal("atk_settings", DEFAULT_SETTINGS);
  if (settings.nomor_whatsapp_admin) current.nomor_whatsapp_admin = settings.nomor_whatsapp_admin;
  if (settings.nama_kantor) current.nama_kantor = settings.nama_kantor;
  if (settings.new_password) current.admin_pass = settings.new_password;
  setLocal("atk_settings", current);
  return true;
}

export async function getDepartments(): Promise<Bidang[]> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/departments");
      if (res.ok) return await res.json();
    } catch (e) {}
  }
  return getLocal("atk_bidang", DEFAULT_BIDANG);
}

export async function createDepartment(nama_bidang: string): Promise<Bidang> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nama_bidang })
      });
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const dps = getLocal("atk_bidang", DEFAULT_BIDANG);
  const newDept: Bidang = {
    id: "bdg-" + Math.random().toString(36).substr(2, 9),
    nama_bidang: nama_bidang.trim()
  };
  dps.push(newDept);
  setLocal("atk_bidang", dps);
  return newDept;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch(`/api/departments/${id}`, { method: "DELETE" });
      if (res.ok) return true;
    } catch (e) {}
  }

  const dps = getLocal("atk_bidang", DEFAULT_BIDANG);
  const filtered = dps.filter(d => d.id !== id);
  setLocal("atk_bidang", filtered);
  return true;
}

export async function getStockHistory(): Promise<StockHistory[]> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/stock-history");
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const hist = getLocal("atk_history", DEFAULT_HISTORY);
  const items = getLocal("atk_items", DEFAULT_ITEMS);
  return hist.map(h => {
    const itm = items.find(i => i.id === h.item_id);
    return {
      ...h,
      itemName: itm ? itm.nama_barang : "Barang Terhapus"
    };
  }).sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export async function getStats(): Promise<Stats> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) return await res.json();
    } catch (e) {}
  }

  const items = getLocal("atk_items", DEFAULT_ITEMS);
  const requests = getLocal("atk_requests", DEFAULT_REQUESTS);

  const totalItems = items.length;
  const totalStockAll = items.reduce((s, i) => s + i.stok, 0);
  const lowStockCount = items.filter(i => i.stok <= i.stok_minimum).length;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(); 
  startOfWeek.setDate(now.getDate() - 7);
  const startOfMonth = new Date();
  startOfMonth.setMonth(now.getMonth() - 1);

  const today = requests.filter(r => new Date(r.created_at) >= startOfToday).length;
  const week = requests.filter(r => new Date(r.created_at) >= startOfWeek).length;
  const month = requests.filter(r => new Date(r.created_at) >= startOfMonth).length;

  // Most requested items
  const reqMap: { [id: string]: { name: string; count: number } } = {};
  requests.forEach(r => {
    if (r.status !== "Ditolak") {
      const itm = items.find(i => i.id === r.item_id);
      const name = itm ? itm.nama_barang : "Barang Terhapus";
      const amt = r.jumlah_diminta;
      if (!reqMap[r.item_id]) {
        reqMap[r.item_id] = { name, count: 0 };
      }
      reqMap[r.item_id].count += amt;
    }
  });
  const mostRequestedItems = Object.values(reqMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Stats: Trend per departemen
  const requestTrendByBidang: { [bidang: string]: number } = {};
  requests.forEach((r: any) => {
    const bName = r.bidang || "Lain-Lain";
    requestTrendByBidang[bName] = (requestTrendByBidang[bName] || 0) + 1;
  });

  return {
    totalItems,
    totalStockAll,
    requestsCount: { today, week, month },
    mostRequestedItems,
    requestTrendByBidang,
    lowStockCount
  };
}

export async function resetDatabase(): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await fetch("/api/db/reset", { method: "POST" });
      if (res.ok) return true;
    } catch (e) {}
  }
  localStorage.removeItem("atk_items");
  localStorage.removeItem("atk_requests");
  localStorage.removeItem("atk_settings");
  localStorage.removeItem("atk_history");
  localStorage.removeItem("atk_bidang");
  initializeLocal();
  return true;
}
