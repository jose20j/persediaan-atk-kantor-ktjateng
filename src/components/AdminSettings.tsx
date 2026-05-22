import React, { useState, useEffect } from "react";
import { Setting, Bidang } from "../types";
import { getSettings, updateSettings, getDepartments, createDepartment, deleteDepartment, resetDatabase } from "../api";
import {
  Settings,
  Phone,
  Building,
  Lock,
  Plus,
  Trash2,
  Trash,
  HelpCircle,
  Database,
  RefreshCw,
  Sliders,
  Sparkles,
  ShieldAlert,
  CheckCircle2
} from "lucide-react";

export default function AdminSettings() {
  const [settings, setSettings] = useState<Setting>({ nomor_whatsapp_admin: "", nama_kantor: "" });
  const [departments, setDepartments] = useState<Bidang[]>([]);
  const [loading, setLoading] = useState(true);

  // Form states
  const [waNum, setWaNum] = useState("");
  const [officeName, setOfficeName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newDept, setNewDept] = useState("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingDept, setSavingDept] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const loadSettingsData = async () => {
    try {
      setLoading(true);
      const [fetchedSettings, fetchedDepts] = await Promise.all([getSettings(), getDepartments()]);
      setSettings(fetchedSettings);
      setWaNum(fetchedSettings.nomor_whatsapp_admin);
      setOfficeName(fetchedSettings.nama_kantor);
      setDepartments(fetchedDepts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waNum.trim()) {
      alert("Nomor WhatsApp wa admin wajib terisi!");
      return;
    }
    // Validation on format
    const cleanedPhone = waNum.replace(/[^0-9]/g, "");
    if (!cleanedPhone.startsWith("62")) {
      alert("Nomor WA harus dimulai dengan format internasional '62' (tanpa +), contoh: 628123456789");
      return;
    }

    try {
      setSavingSettings(true);
      const success = await updateSettings({
        nomor_whatsapp_admin: cleanedPhone,
        nama_kantor: officeName.trim() || "Kantor ATK",
        new_password: newPassword.trim() ? newPassword.trim() : undefined
      });

      if (success) {
        setSuccessMsg("Pengaturan profil kantor, nomor WA, dan keamanan sandi berhasil disimpan!");
        setNewPassword(""); // reset
        loadSettingsData();
        setTimeout(() => setSuccessMsg(""), 4000);
      } else {
        alert("Gagal memperbarui pengaturan.");
      }
    } catch (err) {
      console.error(err);
      alert("Kesalahan tak terduga saat menyimpan.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddDept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDept.trim()) return;

    try {
      setSavingDept(true);
      const added = await createDepartment(newDept);
      if (added) {
        setNewDept("");
        loadSettingsData();
      }
    } catch (err: any) {
      alert(err.message || "Gagal menambahkan bidang.");
    } finally {
      setSavingDept(false);
    }
  };

  const handleDeleteDept = async (id: string, name: string) => {
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus bidang "${name}"?`);
    if (!isConfirmed) return;

    try {
      await deleteDepartment(id);
      loadSettingsData();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus bidang.");
    }
  };

  const handleResetDB = async () => {
    const isConfirmed = window.confirm(
      "⚠️ PERINGATAN KRITIS: Apakah Anda yakin ingin mengosongkan seluruh data transaksi dan memulihkan pengaturan default sistem? Semua data saat ini akan terhapus total!"
    );
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const ok = await resetDatabase();
      if (ok) {
        alert("Database berhasil dipulihkan ke pengaturan awal standard.");
        loadSettingsData();
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mereset database.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-500 mt-4">Menyelaraskan panel kontrol...</p>
      </div>
    );
  }

  return (
    <div id="admin_settings_grid" className="space-y-8 font-sans">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Pengaturan & Kontrol Sistem</h2>
        <p className="text-sm text-slate-500">Konfigurasi profile kantor, nomor telepon admin penerima, kelola bidang, serta pemulihan server</p>
      </div>

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
          <p className="text-sm font-semibold">{successMsg}</p>
        </div>
      )}

      {/* Grid structure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Column 1: WA and Profile settings */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-6 lg:col-span-2">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
            <Sliders className="h-5 w-5 text-teal-600" />
            <h3 className="font-extrabold text-slate-800 text-base">Konfigurasi Profil & Gateway</h3>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4">
            {/* Office name input */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Building className="h-4 w-4 text-slate-400" /> Nama Kantor / Perusahaan
              </label>
              <input
                type="text"
                value={officeName}
                onChange={(e) => setOfficeName(e.target.value)}
                placeholder="Contoh: Kantor Utama Maju Bersama"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
                required
              />
            </div>

            {/* Admin WhatsApp number input format: 628xxxxxxxxxx */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Phone className="h-4 w-4 text-slate-400" /> Nomor Wa Admin (Format Penerima)
              </label>
              <input
                type="text"
                value={waNum}
                onChange={(e) => setWaNum(e.target.value)}
                placeholder="Contoh: 628123456789"
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono"
                required
              />
              <p className="text-[11px] text-slate-400 mt-1">
                ⚠️ WAJIB menggunakan format kode negara saja (tanpa tanda + / angka 0 di depan). Mulai dari <strong>628...</strong>
              </p>
            </div>

            {/* Change Password settings */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                <Lock className="h-4 w-4 text-slate-400" /> Sandi Baru (Ubah jika diisi)
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Isi untuk memperbarui sandi login admin..."
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Kosongkan input ini jika tidak berencana mengubah sandi masuk (default: admin123).
              </p>
            </div>

            {/* Submit settings */}
            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={savingSettings}
                className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-bold shadow-sm shadow-teal-100 cursor-pointer transition-all"
              >
                {savingSettings ? "Menyimpan..." : "Simpan Berkas Pengaturan"}
              </button>
            </div>
          </form>
        </div>

        {/* Column 2: Fields/departments List */}
        <div className="space-y-8">
          {/* Bidang/Departemen Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="h-4.5 w-4.5 text-teal-600" />
              <h3 className="font-extrabold text-slate-800 text-base">Manajemen Bidang</h3>
            </div>

            {/* List of current departments */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
              {departments.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada bidang terdaftar.</p>
              ) : (
                departments.map((dept) => (
                  <div
                    key={dept.id}
                    className="flex justify-between items-center p-2.5 bg-slate-50 rounded-xl border border-slate-100"
                  >
                    <span className="text-xs font-bold text-slate-700">{dept.nama_bidang}</span>
                    <button
                      onClick={() => handleDeleteDept(dept.id, dept.nama_bidang)}
                      className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors"
                      title="Hapus Bidang"
                    >
                      <Trash className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add department form */}
            <form onSubmit={handleAddDept} className="pt-2 border-t border-slate-100">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder="Nama bidang baru..."
                  className="flex-1 bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs"
                  required
                />
                <button
                  type="submit"
                  disabled={savingDept}
                  className="px-3 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-lg cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Database Control Card (Seed / Factory format) */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Database className="h-4.5 w-4.5 text-rose-600" />
              <h3 className="font-extrabold text-slate-800 text-base">Pemeliharaan Server</h3>
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Gunakan kontrol di bawah ini untuk mengembalikan setelan bawaan pabrik serta mengisi file dengan dummy item ATK awal.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleResetDB}
                className="w-full py-2.5 px-4 bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <RefreshCw className="h-3.5 w-3.5 text-rose-600" /> Reset & Seed Dummy Awal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
