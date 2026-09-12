import React, { useState, useEffect, useRef } from "react";
import kejaksaanLogo from "./assets/images/Kejaksaan_Agung_Republik_Indonesia_new_logo.png";
import CustomerLogin from "./components/CustomerLogin";
import CustomerCatalog from "./components/CustomerCatalog";
import CustomerPortal from "./components/CustomerPortal";
import AdminDashboard from "./components/AdminDashboard";
import AdminItems from "./components/AdminItems";
import AdminRequests from "./components/AdminRequests";
import AdminSettings from "./components/AdminSettings";
import AdminCustomers from "./components/AdminCustomers";
import ReportExport from "./components/ReportExport";
import { Customer } from "./types";
import { initializeLocal, isAdminLoggedIn, loginAdmin, logoutAdmin, getSettings, getBackendStatus, getCounts, clearCustomerSession, getCurrentCustomer } from "./api";
import {
  LayoutDashboard, Package, FileText, Sliders, Users,
  Settings, LogOut, ArrowLeft, Bell, X as XIcon
} from "lucide-react";

type Pov = "customer_login" | "customer_catalog" | "customer_portal" | "admin_login" | "admin_portal";

export default function App() {
  const [pov, setPov] = useState<Pov>("customer_login");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [officeName, setOfficeName] = useState("Portal ATK Kantor");

  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);

  const [pendingCount, setPendingCount] = useState(0);
  const [pendingAccounts, setPendingAccounts] = useState(0);
  const [showNewOrderNotif, setShowNewOrderNotif] = useState(false);
  const prevPendingCount = useRef(0);
  const [backendStatus, setBackendStatus] = useState<"ok" | "supabase_missing" | "function_failed" | "offline">("offline");

  useEffect(() => {
    initializeLocal();

    // Restore the employee session only when a token backs it. Without
    // one every action would 401, leaving them on a catalog that refuses
    // to do anything.
    const saved = localStorage.getItem("atk_customer");
    const savedToken = localStorage.getItem("atk_customer_token");
    if (saved && savedToken) {
      try {
        const c: Customer = JSON.parse(saved);
        setCustomer(c);
        setPov("customer_catalog");
        // Show the catalogue immediately, then confirm with the server. A
        // dead token sends them back to the login screen instead of letting
        // them fill a cart the server will refuse; a fresh record also picks
        // up a bidang the admin has since corrected.
        getCurrentCustomer().then(fresh => {
          if (!fresh) {
            setCustomer(null);
            setPov("customer_login");
            return;
          }
          setCustomer(fresh);
          localStorage.setItem("atk_customer", JSON.stringify(fresh));
        });
      } catch {}
    }

    // Fallback entry point for the admin portal: ?admin=1
    // The normal way in is the shared login form, which routes admins
    // automatically. This stays as a way back in if that ever breaks.
    if (new URLSearchParams(window.location.search).get("admin") === "1") {
      setPov(isAdminLoggedIn() ? "admin_portal" : "admin_login");
    }

    getSettings().then(s => setOfficeName(s.nama_kantor)).catch(() => {});
  }, []);

  // Keep the sidebar badges current while the admin portal is open.
  // Deliberately a counts-only call: this used to pull every order and
  // every account twice a minute purely to count them, which grew without
  // bound as the office kept using the system.
  useEffect(() => {
    if (pov !== "admin_portal") return;
    const poll = async () => {
      try {
        const { pendingOrders, pendingAccounts } = await getCounts();
        setBackendStatus(getBackendStatus());
        if (prevPendingCount.current > 0 && pendingOrders > prevPendingCount.current) {
          setShowNewOrderNotif(true);
        }
        prevPendingCount.current = pendingOrders;
        setPendingCount(pendingOrders);
        setPendingAccounts(pendingAccounts);
      } catch {
        setBackendStatus(getBackendStatus());
      }
    };
    poll();
    const interval = setInterval(poll, 30000);
    return () => clearInterval(interval);
  }, [pov]);

  const handleCustomerLogin = (c: Customer) => {
    setCustomer(c);
    setPov("customer_catalog");
  };

  const handleCustomerLogout = () => {
    clearCustomerSession();
    setCustomer(null);
    setPov("customer_login");
  };

  const handleAdminLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword.trim()) {
      setLoginError("Mohon isi seluruh bidang!");
      return;
    }
    try {
      setLoading(true);
      setLoginError("");
      const resp = await loginAdmin(adminUsername, adminPassword);
      if (resp.success) {
        setPov("admin_portal");
        setActiveTab(1);
        setAdminUsername("");
        setAdminPassword("");
      } else {
        setLoginError(resp.message || "Nama pengguna atau sandi keliru.");
      }
    } catch {
      setLoginError("Gagal berkoordinasi dengan server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    // Return to customer catalog if customer is logged in, else login
    if (customer) setPov("customer_catalog");
    else setPov("customer_login");
  };

  // ── CUSTOMER LOGIN ────────────────────────────────────────────
  if (pov === "customer_login") {
    return (
      <CustomerLogin
        officeName={officeName}
        onLogin={handleCustomerLogin}
        onAdminLogin={() => {
          setPov("admin_portal");
          setActiveTab(1);
        }}
      />
    );
  }

  // ── CUSTOMER CATALOG ──────────────────────────────────────────
  if (pov === "customer_catalog" && customer) {
    return (
      <CustomerCatalog
        customer={customer}
        onViewOrders={() => setPov("customer_portal")}
        onLogout={handleCustomerLogout}
      />
    );
  }

  // ── CUSTOMER PORTAL (order history) ──────────────────────────
  if (pov === "customer_portal" && customer) {
    return (
      <CustomerPortal
        customer={customer}
        officeName={officeName}
        onLogout={handleCustomerLogout}
        onBrowseCatalog={() => setPov("customer_catalog")}
      />
    );
  }

  // ── ADMIN LOGIN ───────────────────────────────────────────────
  if (pov === "admin_login") {
    return (
      <div id="login_screen" className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="absolute top-5 left-5">
          <button
            onClick={() => customer ? setPov("customer_catalog") : setPov("customer_login")}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <div className="mx-auto h-14 w-14 flex items-center justify-center">
            <img src={kejaksaanLogo} className="h-12 w-12 object-contain" alt="Logo Kejaksaan" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">Portal Admin ATK</h2>
          <p className="text-xs sm:text-sm text-slate-500 max-w-xs mx-auto">
            Masukkan akun kredensial Anda untuk verifikasi sistem manajemen
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
          <div className="bg-white py-8 px-6 sm:px-10 rounded-3xl border border-slate-200 shadow-xl space-y-6">
            {loginError && (
              <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold leading-relaxed flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" /> {loginError}
              </div>
            )}
            <form onSubmit={handleAdminLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Nama Pengguna (Username)
                </label>
                <input
                  type="text" value={adminUsername}
                  onChange={e => setAdminUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                  Kata Sandi (Password)
                </label>
                <input
                  type="password" value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Masukkan sandi..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>
              <div className="pt-2">
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-sm cursor-pointer"
                >
                  {loading ? "Memverifikasi..." : "Verifikasi Masuk →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // ── ADMIN PORTAL ──────────────────────────────────────────────
  return (
    <div id="admin_portal_layout" className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      <nav className="w-full md:w-64 bg-slate-900 text-slate-400 shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              <img src={kejaksaanLogo} className="h-8 w-8 object-contain" alt="Logo Kejaksaan" />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight">Admin ATK</h2>
              <p className="text-[10px] text-teal-400 font-mono">Workspace Terbuka</p>
            </div>
          </div>
          <div className="p-4 space-y-1.5">
            {[
              { id: 1, label: "Statistik Ringkasan",  icon: LayoutDashboard, badge: 0 },
              { id: 2, label: "Manajemen Barang",     icon: Package,         badge: 0 },
              { id: 3, label: "Permintaan Masuk",     icon: FileText,        badge: pendingCount },
              { id: 6, label: "Akun Pegawai",         icon: Users,           badge: pendingAccounts },
              { id: 4, label: "Export Laporan",       icon: Sliders,         badge: 0 },
              { id: 5, label: "Pengaturan & Kontrol", icon: Settings,        badge: 0 },
            ].map(tab => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-xs font-bold flex items-center gap-3 cursor-pointer ${
                    isSelected ? "bg-teal-600 text-white shadow-sm" : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <IconComp className={`h-4.5 w-4.5 shrink-0 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge > 0 && (
                    <span className="bg-rose-500 text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/40">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/40 rounded-xl">
            <div className="bg-emerald-500 h-2.5 w-2.5 rounded-full ring-4 ring-emerald-500/20 animate-pulse" />
            <div className="truncate">
              <p className="text-xs font-bold text-white leading-none">Petugas Admin</p>
              <span className="text-[10px] text-slate-500 font-mono block mt-0.5">Sesi: Aktif</span>
            </div>
          </div>
          <button
            onClick={handleLogoutAdmin}
            className="w-full px-4 py-2.5 bg-slate-800 hover:bg-rose-950 hover:text-rose-200 border border-slate-700/55 text-slate-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogOut className="h-4 w-4 text-slate-400" /> Keluar Sesi Admin
          </button>
        </div>
      </nav>

      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-400 font-mono italic">
              Kantor aktif: {officeName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg">
              {new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
            </span>
          </div>
        </header>

        {backendStatus !== "ok" && backendStatus !== "offline" && (
          <div className="bg-rose-50 border-b border-rose-200 px-6 py-3 flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0 animate-pulse" />
            <p className="text-xs font-semibold text-rose-700 flex-1">
              {backendStatus === "supabase_missing"
                ? "⚠️ Database belum terhubung. Tambahkan SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel Dashboard → Settings → Environment Variables, lalu redeploy."
                : "⚠️ Server tidak dapat dijangkau. Data mungkin tidak tersinkron antar perangkat."}
            </p>
          </div>
        )}

        {showNewOrderNotif && (
          <div className="fixed top-4 right-4 z-[100] bg-white border border-amber-200 shadow-2xl rounded-2xl p-4 flex items-center gap-3 max-w-sm">
            <div className="bg-amber-100 p-2.5 rounded-xl shrink-0">
              <Bell className="h-5 w-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-slate-800 text-sm">Pesanan Baru Masuk!</p>
              <p className="text-xs text-slate-500 mt-0.5">{pendingCount} pesanan menunggu konfirmasi admin.</p>
            </div>
            <button onClick={() => { setShowNewOrderNotif(false); setActiveTab(3); }} className="text-xs font-bold text-teal-600 hover:text-teal-800 shrink-0 cursor-pointer">Lihat</button>
            <button onClick={() => setShowNewOrderNotif(false)} className="text-slate-400 hover:text-slate-600 shrink-0 cursor-pointer">
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        <main className="p-6 sm:p-8 flex-1">
          {activeTab === 1 && (
            <AdminDashboard
              onNavigateToRequests={() => setActiveTab(3)}
              onNavigateToItems={() => setActiveTab(2)}
              onNavigateToReports={() => setActiveTab(4)}
            />
          )}
          {activeTab === 2 && <AdminItems />}
          {activeTab === 3 && <AdminRequests />}
          {activeTab === 4 && <ReportExport />}
          {activeTab === 5 && <AdminSettings />}
          {activeTab === 6 && <AdminCustomers onPendingChange={setPendingAccounts} />}
        </main>
      </div>
    </div>
  );
}
