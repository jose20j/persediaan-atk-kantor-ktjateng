import { Item, RequestOrder, Setting, StockHistory, Bidang, Stats, Customer } from "./types";

type BackendStatus = "ok" | "supabase_missing" | "function_failed" | "offline";
let _backendStatus: BackendStatus = "offline";
let useLocalFallback = true;

async function checkBackend() {
  try {
    const res = await fetch("/api/health", { signal: AbortSignal.timeout(4000) });
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.has_supabase_url && data.has_supabase_key) {
        _backendStatus = "ok";
        useLocalFallback = false;
      } else {
        _backendStatus = "supabase_missing";
        useLocalFallback = true;
      }
    } else {
      _backendStatus = "function_failed";
      useLocalFallback = true;
    }
  } catch {
    _backendStatus = "offline";
    useLocalFallback = true;
  }
}

export function getBackendStatus(): BackendStatus {
  return _backendStatus;
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
        const data = await res.json();
        // The server-issued token is what actually opens the admin
        // endpoints; storing anything else just hides the UI.
        if (data.token) localStorage.setItem("atk_admin_token", data.token);
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
    localStorage.setItem("atk_admin_token", "local");
    return { success: true };
  }
  return { success: false, message: "Username atau password salah!" };
}

export function logoutAdmin() {
  localStorage.removeItem("atk_admin_token");
}

export function isAdminLoggedIn(): boolean {
  const t = localStorage.getItem("atk_admin_token");
  if (!t) return false;
  if (t === "local") return true;              // jalur cadangan tanpa server
  // The token is "<kedaluwarsa>.<tanda tangan>". Reading the expiry here only
  // avoids restoring a session the server will refuse anyway — the signature
  // is still what actually decides, and only the server can check that.
  const exp = Number(t.split(".")[0]);
  return Number.isFinite(exp) && exp > Date.now();
}

/** Headers for the admin-only endpoints. Without these the server answers 401. */
function adminHeaders(withJson = false): Record<string, string> {
  const h: Record<string, string> = {};
  const token = localStorage.getItem("atk_admin_token");
  if (token) h["Authorization"] = "Bearer " + token;
  if (withJson) h["Content-Type"] = "application/json";
  return h;
}

/**
 * Every admin call goes through here. An expired session must not fall
 * through to the local sample data — an admin would then be looking at
 * fictional orders believing they are real. Fail loudly instead.
 */
export class AdminSessionError extends Error {
  constructor() { super("Sesi admin telah berakhir. Silakan masuk kembali."); }
}

async function adminFetch(url: string, init: RequestInit = {}, withJson = false): Promise<Response> {
  const res = await fetch(url, { ...init, headers: { ...adminHeaders(withJson), ...(init.headers || {}) } });
  if (res.status === 401) {
    localStorage.removeItem("atk_admin_token");
    throw new AdminSessionError();
  }
  return res;
}

/** Re-throw a rejected session; every other failure may still fall back. */
function rethrowSession(e: unknown) {
  if (e instanceof AdminSessionError) throw e;
}

// ── Employee session ────────────────────────────────────────────
export class CustomerSessionError extends Error {
  constructor() { super("Sesi Anda telah berakhir. Silakan masuk kembali."); }
}

export function setCustomerToken(token: string) {
  localStorage.setItem("atk_customer_token", token);
}
export function clearCustomerSession() {
  localStorage.removeItem("atk_customer_token");
  localStorage.removeItem("atk_customer");
}

async function customerFetch(url: string, init: RequestInit = {}, withJson = false): Promise<Response> {
  const token = localStorage.getItem("atk_customer_token");
  const headers: Record<string, string> = { ...(init.headers as any || {}) };
  if (token) headers["Authorization"] = "Bearer " + token;
  if (withJson) headers["Content-Type"] = "application/json";
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    clearCustomerSession();
    throw new CustomerSessionError();
  }
  return res;
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
      const res = await adminFetch("/api/items", {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify(item)
      });
      if (res.ok) return await res.json();
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch(`/api/items/${id}`, {
        method: "PUT",
        headers: adminHeaders(true),
        body: JSON.stringify(item)
      });
      if (res.ok) return await res.json();
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch(`/api/items/${id}/restock`, {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({ jumlah, keterangan })
      });
      if (res.ok) return true;
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch(`/api/items/${id}`, { method: "DELETE", headers: adminHeaders() });
      if (res.ok) return true;
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch("/api/requests", { headers: adminHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { rethrowSession(e); }
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

/**
 * Nama pemesan, bidang dan unit sengaja TIDAK dikirim: server mengambilnya
 * dari akun yang ditunjuk token, supaya tidak bisa dipalsukan dari browser.
 */
export async function createRequest(order: {
  item_id: string; jumlah_diminta: number;
  keterangan_customer?: string; order_id?: string;
}): Promise<RequestOrder> {
  await checkBackend();
  if (useLocalFallback) {
    if (_backendStatus === "supabase_missing") {
      throw new Error("Database belum dikonfigurasi di server. Hubungi administrator untuk menambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel.");
    }
    throw new Error("Server tidak dapat dijangkau. Periksa koneksi internet Anda dan coba lagi.");
  }
  const res = await customerFetch("/api/requests", {
    method: "POST",
    body: JSON.stringify(order)
  }, true);
  if (res.ok) return await res.json();
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.error || "Gagal mengirim pesanan ke server.");
}

/** Registering no longer signs anyone in — the account waits for approval. */
export async function registerCustomer(data: {
  username: string; password: string; nama_lengkap: string;
  bidang: string; unit?: string; no_telepon: string;
}): Promise<{ pending: true; message: string }> {
  await checkBackend();
  if (useLocalFallback) throw new Error("Server tidak tersedia. Pendaftaran membutuhkan koneksi server.");
  const res = await fetch("/api/auth/customer/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || "Pendaftaran gagal.");
  return json;
}

/**
 * The sidebar badge numbers. Cheap on purpose — see /api/counts.
 * Never fall back to sample data here: a wrong badge is worse than none.
 */
export async function getCounts(): Promise<{ pendingOrders: number; pendingAccounts: number; lastActivity: string | null }> {
  await checkBackend();
  if (useLocalFallback) return { pendingOrders: 0, pendingAccounts: 0, lastActivity: null };
  const res = await adminFetch("/api/counts");
  if (!res.ok) throw new Error("Gagal memuat ringkasan.");
  return await res.json();
}

// ── Employee accounts, admin side ───────────────────────────────
export async function getCustomers(): Promise<Customer[]> {
  await checkBackend();
  if (useLocalFallback) return [];
  const res = await adminFetch("/api/customers");
  if (!res.ok) throw new Error("Gagal memuat daftar akun pegawai.");
  return await res.json();
}

export async function approveCustomer(id: string): Promise<void> {
  const res = await adminFetch(`/api/customers/${id}/approve`, { method: "PUT" });
  if (!res.ok) throw new Error("Gagal menyetujui akun.");
}

export async function rejectCustomer(id: string, alasan?: string): Promise<void> {
  const res = await adminFetch(`/api/customers/${id}/reject`, {
    method: "PUT", body: JSON.stringify({ alasan: alasan || "" }),
  }, true);
  if (!res.ok) throw new Error("Gagal menolak akun.");
}

export async function deleteCustomer(id: string): Promise<void> {
  const res = await adminFetch(`/api/customers/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Gagal menghapus akun.");
}

/**
 * The credentials matched but the account is not cleared for use — waiting
 * for approval, or rejected. Distinct from a wrong password, because the
 * shared login form must stop here instead of going on to try the admin
 * credentials and then reporting "wrong password".
 */
export class AccountNotActiveError extends Error {}

export async function loginCustomer(username: string, password: string): Promise<Customer> {
  await checkBackend();
  if (useLocalFallback) throw new Error("Server tidak tersedia. Login membutuhkan koneksi server.");
  const res = await fetch("/api/auth/customer/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const json = await res.json();
  if (res.status === 403) throw new AccountNotActiveError(json.error || "Akun belum aktif.");
  if (!res.ok) throw new Error(json.error || "Login gagal.");
  // The token is what proves who this is on later calls; without it the
  // server refuses to show orders or accept one.
  if (json.token) setCustomerToken(json.token);
  const { token, ...customer } = json;
  return customer as Customer;
}

/** Null means the stored session is no longer usable. */
export async function getCurrentCustomer(): Promise<Customer | null> {
  await checkBackend();
  if (useLocalFallback) return null;
  try {
    const res = await customerFetch("/api/customer/me");
    if (!res.ok) { clearCustomerSession(); return null; }
    return await res.json();
  } catch {
    clearCustomerSession();
    return null;
  }
}

export async function getCustomerOrders(): Promise<RequestOrder[]> {
  await checkBackend();
  if (useLocalFallback) throw new Error("Server tidak tersedia.");
  const res = await customerFetch("/api/customer/orders");
  if (res.ok) return await res.json();
  throw new Error("Gagal memuat pesanan.");
}

export async function processRequest(id: string, jumlah_disetujui: number, catatan_admin: string): Promise<boolean> {
  await checkBackend();
  if (useLocalFallback) {
    throw new Error("Server tidak tersedia. Tidak dapat memproses pesanan.");
  }
  const res = await adminFetch(`/api/requests/${id}/process`, {
    method: "PUT",
    headers: adminHeaders(true),
    body: JSON.stringify({ jumlah_disetujui, catatan_admin })
  });
  if (res.ok) return true;
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.error || "Gagal memproses pesanan.");
}

export async function completeRequest(id: string): Promise<boolean> {
  await checkBackend();
  if (useLocalFallback) throw new Error("Server tidak tersedia.");
  const res = await adminFetch(`/api/requests/${id}/complete`, { method: "PUT", headers: adminHeaders() });
  if (res.ok) return true;
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.error || "Gagal menyelesaikan pesanan.");
}

export async function rejectRequest(id: string, catatan_admin: string): Promise<boolean> {
  await checkBackend();
  if (useLocalFallback) {
    throw new Error("Server tidak tersedia. Tidak dapat menolak pesanan.");
  }
  const res = await adminFetch(`/api/requests/${id}/reject`, {
    method: "PUT",
    headers: adminHeaders(true),
    body: JSON.stringify({ catatan_admin })
  });
  if (res.ok) return true;
  const errData = await res.json().catch(() => ({}));
  throw new Error(errData.error || "Gagal menolak pesanan.");
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
      const res = await adminFetch("/api/settings", {
        method: "PUT",
        headers: adminHeaders(true),
        body: JSON.stringify(settings)
      });
      if (res.ok) return true;
    } catch (e) { rethrowSession(e); }
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

export async function createDepartment(nama_bidang: string, parent_id?: string | null): Promise<Bidang> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await adminFetch("/api/departments", {
        method: "POST",
        headers: adminHeaders(true),
        body: JSON.stringify({ nama_bidang, parent_id: parent_id || null })
      });
      if (res.ok) return await res.json();
      const err = await res.json().catch(() => null);
      throw new Error(err?.error || "Gagal menambahkan.");
    } catch (e: any) {
      if (e instanceof Error && e.message !== "Failed to fetch") throw e;
    }
  }

  const dps = getLocal("atk_bidang", DEFAULT_BIDANG);
  const newDept: Bidang = {
    id: (parent_id ? "unt-" : "bid-") + Math.random().toString(36).substr(2, 9),
    nama_bidang: nama_bidang.trim(),
    parent_id: parent_id || null
  };
  dps.push(newDept);
  setLocal("atk_bidang", dps);
  return newDept;
}

export async function deleteDepartment(id: string): Promise<boolean> {
  await checkBackend();
  if (!useLocalFallback) {
    try {
      const res = await adminFetch(`/api/departments/${id}`, { method: "DELETE", headers: adminHeaders() });
      if (res.ok) return true;
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch("/api/stock-history", { headers: adminHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch("/api/stats", { headers: adminHeaders() });
      if (res.ok) return await res.json();
    } catch (e) { rethrowSession(e); }
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
      const res = await adminFetch("/api/db/reset", { method: "POST", headers: adminHeaders() });
      if (res.ok) return true;
    } catch (e) { rethrowSession(e); }
  }
  localStorage.removeItem("atk_items");
  localStorage.removeItem("atk_requests");
  localStorage.removeItem("atk_settings");
  localStorage.removeItem("atk_history");
  localStorage.removeItem("atk_bidang");
  initializeLocal();
  return true;
}
