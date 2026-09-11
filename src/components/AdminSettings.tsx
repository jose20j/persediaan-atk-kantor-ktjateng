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
  // "" = tambah sebagai bidang baru; berisi id = tambah sebagai unit di bawahnya
  const [newDeptParent, setNewDeptParent] = useState("");

  const [savingSettings, setSavingSettings] = useState(false);
  const [savingDept, setSavingDept] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  // The wipe control is kept out of the normal settings page: one stray click
  // destroys every item, order and stock record with no backup to restore from.
  // Reach it deliberately with ?dev=1 when seeding a fresh environment.
  const bidangList = departments.filter(d => !d.parent_id);

  const showMaintenance =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("dev") === "1";

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
      const added = await createDepartment(newDept, newDeptParent || null);
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
    // Menghapus bidang ikut menghapus seluruh unit di bawahnya (ON DELETE
    // CASCADE), jadi jumlahnya harus disebut sebelum admin menyetujui.
    const anakCount = departments.filter(d => d.parent_id === id).length;
    const isConfirmed = window.confirm(
      anakCount > 0
        ? `Hapus bidang "${name}" beserta ${anakCount} unit di bawahnya?\n\n` +
          `Akun pegawai yang sudah terdaftar tidak ikut terhapus, tetapi bidang ` +
          `dan unit mereka tidak akan lagi cocok dengan daftar ini.`
        : `Apakah Anda yakin ingin menghapus "${name}"?`
    );
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
    // The endpoint only deletes — it does not re-seed anything. The wording
    // here has to say that plainly: the old copy promised a restore to
    // factory defaults that never happens, which is how an admin could wipe
    // real data expecting sample data back.
    const isConfirmed = window.confirm(
      "⚠️ PERINGATAN: Tindakan ini MENGHAPUS PERMANEN seluruh data barang, " +
      "riwayat pesanan, riwayat stok, dan daftar bidang.\n\n" +
      "Data TIDAK diisi ulang — katalog akan benar-benar kosong setelahnya.\n" +
      "Tidak ada cadangan dan tindakan ini tidak bisa dibatalkan.\n\n" +
      "Akun admin dan akun pegawai tidak ikut terhapus.\n\n" +
      "Lanjutkan?"
    );
    if (!isConfirmed) return;

    try {
      setLoading(true);
      const ok = await resetDatabase();
      if (ok) {
        alert("Seluruh data barang, pesanan, riwayat stok, dan bidang telah dikosongkan.");
        loadSettingsData();
      }
    } catch (err) {
      console.error(err);
      alert("Gagal mengosongkan database.");
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
        <p className="text-sm text-slate-500">Konfigurasi profil kantor, nomor kontak pengelola, sandi admin, serta pengelolaan bidang</p>
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
                <Phone className="h-4 w-4 text-slate-400" /> Nomor WhatsApp Pengelola
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
                Tampil di footer portal pegawai sebagai kontak yang bisa dihubungi via WhatsApp.
              </p>
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
              <h3 className="font-extrabold text-slate-800 text-base">Manajemen Bidang &amp; Unit</h3>
            </div>

            {/* Two-level list: each bidang with its units nested beneath */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {bidangList.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Belum ada bidang terdaftar.</p>
              ) : (
                bidangList.map((bidang) => {
                  const units = departments.filter(d => d.parent_id === bidang.id);
                  return (
                    <div key={bidang.id}>
                      <div className="flex justify-between items-center p-2.5 bg-teal-50 rounded-xl border border-teal-100">
                        <span className="text-xs font-extrabold text-teal-900">
                          {bidang.nama_bidang}
                          <span className="ml-2 font-mono font-normal text-teal-600">{units.length} unit</span>
                        </span>
                        <button
                          onClick={() => handleDeleteDept(bidang.id, bidang.nama_bidang)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Hapus bidang beserta seluruh unitnya"
                        >
                          <Trash className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      {units.length > 0 && (
                        <div className="mt-1 ml-3 pl-3 border-l-2 border-slate-100 space-y-1">
                          {units.map(unit => (
                            <div
                              key={unit.id}
                              className="flex justify-between items-center py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-100"
                            >
                              <span className="text-[11px] font-semibold text-slate-600">{unit.nama_bidang}</span>
                              <button
                                onClick={() => handleDeleteDept(unit.id, unit.nama_bidang)}
                                className="text-rose-400 hover:text-rose-600 p-1 rounded-md hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Hapus unit"
                              >
                                <Trash className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Add — either a new bidang, or a unit under an existing one */}
            <form onSubmit={handleAddDept} className="pt-2 border-t border-slate-100 space-y-2">
              <select
                value={newDeptParent}
                onChange={(e) => setNewDeptParent(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-lg px-3 py-2 text-xs cursor-pointer"
              >
                <option value="">Tambah sebagai bidang baru</option>
                {bidangList.map(b => (
                  <option key={b.id} value={b.id}>Tambah unit di bawah: {b.nama_bidang}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDept}
                  onChange={(e) => setNewDept(e.target.value)}
                  placeholder={newDeptParent ? "Nama unit baru..." : "Nama bidang baru..."}
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

          {/* Destructive wipe — only rendered when opened with ?dev=1 */}
          {showMaintenance && (
            <div className="bg-white rounded-2xl border-2 border-rose-300 shadow-xs p-6 space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-rose-100">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600" />
                <h3 className="font-extrabold text-rose-700 text-base">Zona Berbahaya</h3>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Tombol ini <strong className="text-rose-700">menghapus permanen</strong> seluruh data
                barang, riwayat pesanan, riwayat stok, dan daftar bidang. Data
                <strong className="text-rose-700"> tidak diisi ulang</strong> — katalog akan kosong
                setelahnya, dan tidak ada cadangan untuk memulihkannya.
              </p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Akun admin dan akun pegawai tidak ikut terhapus.
              </p>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleResetDB}
                  className="w-full py-2.5 px-4 bg-rose-600 text-white hover:bg-rose-700 border border-rose-700 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Trash className="h-3.5 w-3.5" /> Kosongkan Seluruh Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
