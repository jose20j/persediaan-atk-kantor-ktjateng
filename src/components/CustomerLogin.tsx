import React, { useState, useEffect } from "react";
import kejaksaanLogo from "../assets/images/kejaksaan_logo_1779373081640.png";
import { Customer, Bidang } from "../types";
import { loginCustomer, registerCustomer, getDepartments } from "../api";
import { User, Lock, ArrowRight, UserPlus, LogIn, Building } from "lucide-react";

interface CustomerLoginProps {
  officeName: string;
  onLogin: (customer: Customer) => void;
  onSwappedToAdmin: () => void;
}

export default function CustomerLogin({ officeName, onLogin, onSwappedToAdmin }: CustomerLoginProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [departments, setDepartments] = useState<Bidang[]>([]);

  const [username, setUsername]       = useState("");
  const [password, setPassword]       = useState("");
  const [namaLengkap, setNamaLengkap] = useState("");
  const [bidang, setBidang]           = useState("");

  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    getDepartments().then(depts => {
      setDepartments(depts);
      if (depts.length > 0) setBidang(depts[0].nama_bidang);
    }).catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Username dan password wajib diisi.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const customer = await loginCustomer(username.trim(), password.trim());
      localStorage.setItem("atk_customer", JSON.stringify(customer));
      onLogin(customer);
    } catch (err: any) {
      setError(err.message || "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim() || !namaLengkap.trim() || !bidang) {
      setError("Semua field wajib diisi.");
      return;
    }
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    try {
      setLoading(true);
      setError("");
      const customer = await registerCustomer({ username: username.trim(), password: password.trim(), nama_lengkap: namaLengkap.trim(), bidang });
      localStorage.setItem("atk_customer", JSON.stringify(customer));
      onLogin(customer);
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
                onClick={() => { setMode(m); setError(""); }}
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
            ) : (
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
                  <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-1.5">Bidang / Departemen</label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    {departments.length > 0 ? (
                      <select
                        value={bidang} onChange={e => setBidang(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500 appearance-none"
                        required
                      >
                        {departments.map(d => <option key={d.id} value={d.nama_bidang}>{d.nama_bidang}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text" value={bidang} onChange={e => setBidang(e.target.value)}
                        placeholder="Nama bidang Anda"
                        className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-teal-500"
                        required
                      />
                    )}
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

          {/* Footer links */}
          <div className="px-8 pb-6 flex items-center justify-between">
            <p className="text-xs text-slate-400">Pegawai internal {officeName}</p>
            <button
              onClick={onSwappedToAdmin}
              className="text-xs text-slate-400 hover:text-teal-600 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            >
              Portal Admin <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
