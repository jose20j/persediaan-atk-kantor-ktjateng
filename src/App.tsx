import React, { useState, useEffect } from "react";
import CustomerCatalog from "./components/CustomerCatalog";
import AdminDashboard from "./components/AdminDashboard";
import AdminItems from "./components/AdminItems";
import AdminRequests from "./components/AdminRequests";
import AdminSettings from "./components/AdminSettings";
import ReportExport from "./components/ReportExport";
import { initializeLocal, isAdminLoggedIn, loginAdmin, logoutAdmin, getSettings } from "./api";
import {
  LayoutDashboard,
  Package,
  FileText,
  Sliders,
  Settings,
  LogOut,
  UserCheck,
  Lock,
  ArrowLeft,
  Briefcase,
  Layers,
  Send,
  Building,
  CheckCircle,
  HelpCircle,
  FolderMinus,
  Sparkles
} from "lucide-react";

export default function App() {
  // POV check state
  // "customer" | "admin_login" | "admin_portal"
  const [pov, setPov] = useState<"customer" | "admin_login" | "admin_portal">("customer");
  
  // Current admin active tab
  // 1: Dashboard, 2: Items, 3: Requests, 4: Reports, 5: Settings
  const [activeTab, setActiveTab] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Admin login credentials state
  const [adminUsername, setAdminUsername] = useState("");
  const [adminPassword, setAdminPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loading, setLoading] = useState(false);
  const [officeName, setOfficeName] = useState("Portal ATK Kantor");

  useEffect(() => {
    // Populate dynamic local datasets
    initializeLocal();
    
    // Check if admin is currently authenticated
    if (isAdminLoggedIn()) {
      setPov("customer"); // Keep Customer Catalog as starting landing view, let them choose admin manually
    }

    // Load office name
    const fetchOffice = async () => {
      try {
        const set = await getSettings();
        setOfficeName(set.nama_kantor);
      } catch (err) {}
    };
    fetchOffice();
  }, []);

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
        setActiveTab(1); // Default to Dashboard
        // Clear inputs
        setAdminUsername("");
        setAdminPassword("");
      } else {
        setLoginError(resp.message || "Nama pengguna atau sandi keliru.");
      }
    } catch (err) {
      setLoginError("Gagal berkoordinasi dengan server.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogoutAdmin = () => {
    logoutAdmin();
    setPov("customer");
  };

  const handleNavigateToRequests = () => {
    setActiveTab(3); // Requests tab
  };

  const handleNavigateToItems = () => {
    setActiveTab(2); // Items tab
  };

  const handleNavigateToReports = () => {
    setActiveTab(4); // Reports tab
  };

  // Render Customer catalogue
  if (pov === "customer") {
    return (
      <CustomerCatalog
        onSwappedToAdmin={() => {
          if (isAdminLoggedIn()) {
            setPov("admin_portal");
            setActiveTab(1);
          } else {
            setPov("admin_login");
          }
        }}
      />
    );
  }

  // Render Admin Simple Login Form
  if (pov === "admin_login") {
    return (
      <div id="login_screen" className="min-h-screen bg-slate-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
        <div className="absolute top-5 left-5">
          <button
            onClick={() => setPov("customer")}
            className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold text-xs inline-flex items-center gap-1.5 hover:bg-slate-50 cursor-pointer transition-all shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" /> Kembali ke Katalog
          </button>
        </div>

        <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
          <div className="mx-auto h-14 w-14 flex items-center justify-center">
            <img
              src="/src/assets/images/kejaksaan_logo_1779373081640.png"
              referrerPolicy="no-referrer"
              className="h-12 w-12 object-contain"
              alt="Logo Kejaksaan"
            />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-display">Portal Admin ATK</h2>
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
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5Unified">
                  Nama Pengguna (Username)
                </label>
                <input
                  type="text"
                  value={adminUsername}
                  onChange={(e) => setAdminUsername(e.target.value)}
                  placeholder="Contoh: admin"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5Unified">
                  Kata Sandi (Password)
                </label>
                <input
                  type="password"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="Masukkan sandi..."
                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white"
                  required
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-bold transition-all shadow-sm shadow-teal-100 cursor-pointer"
                >
                  {loading ? "Memverifikasi..." : "Verifikasi Masuk Secara Aman &rarr;"}
                </button>
              </div>
            </form>

            <div className="pt-4 border-t border-slate-100 text-center space-y-1 bg-slate-50/50 -mx-6 -mb-8 p-6 rounded-b-3xl">
              <p className="text-[11px] text-slate-400">Akun default uji coba:</p>
              <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded border text-slate-600">
                admin / admin123
              </code>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Full-Stack Admin Workspace Portal (pov === "admin_portal")
  return (
    <div id="admin_portal_layout" className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR FOR VIEWPORT LARGE */}
      <nav className="w-full md:w-64 bg-slate-900 text-slate-400 shrink-0 flex flex-col justify-between border-r border-slate-800">
        <div>
          {/* Logo Brand Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="h-8 w-8 flex items-center justify-center shrink-0">
              <img
                src="/src/assets/images/kejaksaan_logo_1779373081640.png"
                referrerPolicy="no-referrer"
                className="h-8 w-8 object-contain"
                alt="Logo Kejaksaan"
              />
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-white leading-tight font-display">Admin ATK</h2>
              <p className="text-[10px] text-teal-400 font-mono">Workspace Terbuka</p>
            </div>
          </div>

          {/* Navigation Items list */}
          <div className="p-4 space-y-1.5">
            {[
              { id: 1, label: "Statistik Ringkasan", icon: LayoutDashboard },
              { id: 2, label: "Manajemen Barang", icon: Package },
              { id: 3, label: "Permintaan Masuk", icon: FileText },
              { id: 4, label: "Export Laporan", icon: Sliders },
              { id: 5, label: "Pengaturan & Kontrol", icon: Settings }
            ].map((tab) => {
              const IconComp = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full text-left px-4 py-3 rounded-xl transition-all text-xs font-bold font-sans flex items-center gap-3 cursor-pointer ${
                    isSelected
                      ? "bg-teal-600 text-white shadow-sm"
                      : "hover:bg-slate-800 hover:text-slate-200"
                  }`}
                >
                  <IconComp className={`h-4.5 w-4.5 ${isSelected ? "text-white" : "text-slate-400"}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* User Session bottom actions */}
        <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/40">
          <div className="flex items-center gap-3 px-3 py-2 bg-slate-800/40 rounded-xl border border-slate-850">
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
            <LogOut className="h-4 w-4 text-slate-400 group-hover:text-rose-400" /> Keluar Sesi Admin
          </button>
        </div>
      </nav>

      {/* MAIN VIEWPORT PANELS */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200 py-4 px-6 sm:px-8 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-xs font-medium text-slate-400 font-mono italic">
              Kantor aktif: {officeName}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 px-2.5 py-1 rounded-lg">
              UTC: {new Date().toISOString().split("T")[0]}
            </span>
          </div>
        </header>

        {/* Workspace Central Views */}
        <main className="p-6 sm:p-8 flex-1">
          {activeTab === 1 && (
            <AdminDashboard
              onNavigateToRequests={handleNavigateToRequests}
              onNavigateToItems={handleNavigateToItems}
              onNavigateToReports={handleNavigateToReports}
            />
          )}
          {activeTab === 2 && <AdminItems />}
          {activeTab === 3 && <AdminRequests />}
          {activeTab === 4 && <ReportExport />}
          {activeTab === 5 && <AdminSettings />}
        </main>
      </div>
    </div>
  );
}
