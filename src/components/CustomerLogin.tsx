import React, { useState, useEffect } from "react";
import kejaksaanLogo from "../assets/images/Kejaksaan_Agung_Republik_Indonesia_new_logo.png";
import { Customer, Bidang } from "../types";
import { loginCustomer, loginAdmin, registerCustomer, getDepartments, AccountNotActiveError } from "../api";
import { User, Lock, UserPlus, LogIn, Building, Layers, Phone, Clock } from "lucide-react";

interface CustomerLoginProps {
  officeName: string;
  onLogin: (customer: Customer) => void;
  onAdminLogin: () => void;
}

export default function CustomerLogin({ officeName, onLogin, onAdminLogin }: CustomerLoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [departments, setDepartments] = useState<Bidang[]>([]);

  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [noTelepon, setNoTelepon]     = useState("");
  const [bidangId, setBidangId]       = useState("");
  const [unitId, setUnitId]           = useState("");

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [pendingMsg, setPendingMsg] = useState("");

  // parent_id kosong = bidang (tingkat atas); terisi = unit di bawahnya
  const bidangList = departments.filter(d => !d.parent_id);
  const unitList   = departments.filter(d => d.parent_id === bidangId);

  const namaBidang = bidangList.find(b => b.id === bidangId)?.nama_bidang || "";
  const namaUnit   = unitList.find(u => u.id === unitId)?.nama_bidang || "";

  useEffect(() => {
    getDepartments().then(depts => {
      setDepartments(depts);
      const first = depts.find(d => !d.parent_id);
      if (first) setBidangId(first.id);
    }).catch(() => {});
  }, []);

  // Unit selalu ikut bidang yang dipilih — pilihan lama tidak boleh tertinggal
  // menempel pada bidang yang berbeda.
  useEffect(() => {
    const units = departments.filter(d => d.parent_id === bidangId);
    setUnitId(units.length > 0 ? units[0].id : "");
  }, [bidangId, departments]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    const u = username.trim();
    const p = password.trim();
    try {
      setLoading(true);
      setError("");

      // Employees are the overwhelming majority of logins, so try them first
      // and keep that path down to a single round trip. Admins pay one extra
      // request, which they hit far less often.
      try {
        const customer = await loginCustomer(u, p);
        localStorage.setItem("atk_customer", JSON.stringify(customer));
        onLogin(customer);
        return;
      } catch (customerErr: any) {
        // Only a genuinely wrong employee login should fall through to the
        // admin check. A pending/rejected account or a dead connection must
        // surface as itself, not as "wrong password".
        if (customerErr instanceof AccountNotActiveError) throw customerErr;
        if (/Server tidak tersedia/i.test(customerErr?.message || "")) throw customerErr;
      }

      // Not an employee account — check whether these are admin credentials.
      // A failed attempt stores no session, so this is safe to run.
      const admin = await loginAdmin(u, p);
      if (admin.success) {
        onAdminLogin();
        return;
      }

      setError("Username atau password salah.");
    } catch (err: any) {
      setError(err.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !namaLengkap.trim() || !namaBidang) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (unitList.length > 0 && !namaUnit) {
      setError("Pilih unit Anda pada bidang tersebut.");
      return;
    }
    const telp = noTelepon.replace(/[^0-9]/g, "");
    if (!/^08\d{7,13}$/.test(telp)) {
      setError("Nomor telepon harus diawali 08, contoh 081234567890.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const res = await registerCustomer({
        username: username.trim(),
        password: password.trim(),
        nama_lengkap: namaLengkap.trim(),
        bidang: namaBidang,
        unit: namaUnit || undefined,
        no_telepon: telp,
      });
      // Registering does not sign anyone in any more — the account waits.
      setPendingMsg(res.message || "Pendaftaran terkirim. Menunggu persetujuan Admin ATK.");
    } catch (err: any) {
      setError(err.message || "Pendaftaran gagal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-950 via-teal-900 to-slate-900 flex flex-col justify-center py-12 px-4 font-sans">
      {/* Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3 mb-8">
        <div className="mx-auto h-16 w-16 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20">
          <img src={kejaksaanLogo} className="h-10 w-10 object-contain" alt="Logo" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">{officeName}</h1>
        <p className="text-sm text-teal-300">Sistem Persediaan ATK Digital</p>
      </div>

      {/* Card */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100">
            {(["login", "register"] as const).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setPendingMsg(""); }}
                className={`py-4 text-sm font-bold transition-colors cursor-pointer flex items-center justify-center gap-2 ${
                  mode === m
                    ? "bg-teal-600 text-white"
                    : "text-slate-500 hover:bg-slate-50"
                }`}
              >
                {m === "login" ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                {m === "login" ? "Masuk" : "Daftar Akun"}
              </button>
            ))}
          </div>

          <div className="p-8 space-y-5">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 shrink-0" /> {error}
              </div>
            )}

            {/* Registration succeeded but the account is not usable yet —
                say so plainly instead of dropping the employee back on a
                login form that will refuse them. */}
            {pendingMsg && (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2 text-center">
                <div className="mx-auto h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <p className="text-sm font-bold text-amber-900">Menunggu Persetujuan</p>
                <p className="text-xs text-amber-800 leading-relaxed">{pendingMsg}</p>
                <p className="text-[11px] text-amber-700">
                  Anda belum bisa masuk sampai Admin ATK menyetujui akun ini.
                  Silakan coba masuk kembali setelah mendapat konfirmasi.
                </p>
                <button
                  onClick={() => { setPendingMsg(""); setMode("login"); }}
                  className="text-xs font-bold text-teal-700 hover:text-teal-900 underline cursor-pointer"
                >
                  Kembali ke halaman masuk
                </button>
              </div>
            )}

            {mode === "login" ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Masukkan username Anda"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Masukkan password Anda"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? "Memverifikasi..." : <><LogIn className="h-4 w-4" /> Masuk</>}
                </button>
              </form>
            ) : pendingMsg ? null : (
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Nama Lengkap</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text" value={namaLengkap} onChange={e => setNamaLengkap(e.target.value)}
                      placeholder="Nama lengkap Anda"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Nomor Telepon</label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="tel" inputMode="numeric" value={noTelepon}
                      onChange={e => setNoTelepon(e.target.value.replace(/[^0-9]/g, ""))}
                      placeholder="Contoh: 081234567890"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">Diawali <strong>08</strong>, bukan 62. Dipakai admin untuk menghubungi Anda.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Bidang</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={bidangId} onChange={e => setBidangId(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 appearance-none"
                      required
                    >
                      {bidangList.length === 0 && <option value="">Memuat daftar bidang…</option>}
                      {bidangList.map(b => <option key={b.id} value={b.id}>{b.nama_bidang}</option>)}
                    </select>
                  </div>
                </div>

                {/* Unit menyesuaikan bidang yang dipilih di atas */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Unit</label>
                  <div className="relative">
                    <Layers className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <select
                      value={unitId} onChange={e => setUnitId(e.target.value)}
                      disabled={unitList.length === 0}
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 appearance-none disabled:text-slate-400"
                      required={unitList.length > 0}
                    >
                      {unitList.length === 0
                        ? <option value="">Bidang ini belum punya unit</option>
                        : unitList.map(u => <option key={u.id} value={u.id}>{u.nama_bidang}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Username</label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text" value={username} onChange={e => setUsername(e.target.value)}
                      placeholder="Buat username unik Anda"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="password" value={password} onChange={e => setPassword(e.target.value)}
                      placeholder="Min. 6 karakter"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 focus:bg-white"
                      required minLength={6}
                    />
                  </div>
                </div>
                <button
                  type="submit" disabled={loading}
                  className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {loading ? "Mendaftarkan..." : <><UserPlus className="h-4 w-4" /> Buat Akun & Masuk</>}
                </button>
              </form>
            )}
          </div>

          {/* Footer */}
          <div className="px-8 pb-6">
            <p className="text-xs text-slate-400 text-center">Pegawai internal {officeName}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
