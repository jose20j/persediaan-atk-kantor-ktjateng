import React, { useState, useEffect } from "react";
import { Customer } from "../types";
import { getCustomers, approveCustomer, rejectCustomer, deleteCustomer } from "../api";
import {
  Users, Clock, CheckCircle2, XCircle, Phone, Building, Layers,
  Trash, Search, ShieldCheck
} from "lucide-react";

type Tab = "Menunggu" | "Disetujui" | "Ditolak";

export default function AdminCustomers({ onPendingChange }: { onPendingChange?: (n: number) => void }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("Menunggu");
  const [search, setSearch] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCustomers();
      setCustomers(data);
      onPendingChange?.(data.filter(c => c.status === "Menunggu").length);
    } catch (e: any) {
      setError(e?.message || "Gagal memuat daftar akun.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const counts = {
    Menunggu:  customers.filter(c => c.status === "Menunggu").length,
    Disetujui: customers.filter(c => c.status === "Disetujui").length,
    Ditolak:   customers.filter(c => c.status === "Ditolak").length,
  };

  const shown = customers
    .filter(c => (c.status || "Disetujui") === tab)
    .filter(c => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return [c.nama_lengkap, c.username, c.bidang, c.unit, c.no_telepon]
        .some(v => (v || "").toLowerCase().includes(q));
    });

  const act = async (id: string, fn: () => Promise<void>) => {
    try {
      setBusyId(id);
      await fn();
      await load();
    } catch (e: any) {
      alert(e?.message || "Tindakan gagal.");
    } finally {
      setBusyId("");
    }
  };

  const handleApprove = (c: Customer) =>
    act(c.id, () => approveCustomer(c.id));

  const handleReject = (c: Customer) => {
    const alasan = window.prompt(
      `Tolak pendaftaran "${c.nama_lengkap}"?\n\nAlasan (opsional, akan ditampilkan ke pegawai saat mencoba masuk):`,
      ""
    );
    if (alasan === null) return;   // dibatalkan
    act(c.id, () => rejectCustomer(c.id, alasan));
  };

  const handleDelete = (c: Customer) => {
    if (!window.confirm(
      `Hapus permanen akun "${c.nama_lengkap}" (${c.username})?\n\n` +
      `Riwayat pesanan yang pernah dibuat tetap tersimpan, tetapi tidak lagi terhubung ke akun ini.`
    )) return;
    act(c.id, () => deleteCustomer(c.id));
  };

  if (loading) {
    return <div className="p-8 text-sm text-slate-500">Memuat daftar akun pegawai...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight font-display">Akun Pegawai</h1>
        <p className="text-sm text-slate-500">
          Setujui pendaftaran pegawai dan pastikan bidang serta unitnya benar sebelum mereka dapat memesan ATK
        </p>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-semibold">
          {error}
        </div>
      )}

      {/* Tabs + search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-4 flex flex-col lg:flex-row gap-3 lg:items-center lg:justify-between">
        <div className="flex gap-2 flex-wrap">
          {([
            ["Menunggu",  Clock,        "amber"],
            ["Disetujui", CheckCircle2, "emerald"],
            ["Ditolak",   XCircle,      "rose"],
          ] as const).map(([label, Icon, tone]) => {
            const on = tab === label;
            return (
              <button
                key={label}
                onClick={() => setTab(label)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 border ${
                  on
                    ? tone === "amber"   ? "bg-amber-600 text-white border-amber-700"
                    : tone === "emerald" ? "bg-emerald-600 text-white border-emerald-700"
                    :                      "bg-rose-600 text-white border-rose-700"
                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span className={`px-1.5 rounded-md font-mono ${on ? "bg-white/25" : "bg-slate-100"}`}>
                  {counts[label]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative lg:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama, username, bidang, unit..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* List */}
      {shown.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center">
          <Users className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">
            {tab === "Menunggu" ? "Tidak ada pendaftaran yang menunggu" : `Belum ada akun berstatus ${tab}`}
          </p>
          {tab === "Menunggu" && (
            <p className="text-xs text-slate-400 mt-1">Pendaftaran baru dari pegawai akan muncul di sini.</p>
          )}
        </div>
      ) : (
        <div className="grid gap-3">
          {shown.map(c => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 flex flex-col lg:flex-row lg:items-center gap-4"
            >
              <div className="h-11 w-11 rounded-full bg-teal-600 text-white flex items-center justify-center font-extrabold shrink-0">
                {c.nama_lengkap.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-bold text-slate-800 text-sm">{c.nama_lengkap}</p>
                <p className="text-[11px] font-mono text-slate-400">@{c.username}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[11px] text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Building className="h-3 w-3 text-teal-600 shrink-0" /> {c.bidang}
                  </span>
                  {c.unit && (
                    <span className="inline-flex items-center gap-1.5">
                      <Layers className="h-3 w-3 text-teal-600 shrink-0" /> {c.unit}
                    </span>
                  )}
                  {c.no_telepon && (
                    <a
                      href={`https://wa.me/62${c.no_telepon.replace(/^0/, "")}`}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 hover:text-emerald-600 transition-colors"
                    >
                      <Phone className="h-3 w-3 text-teal-600 shrink-0" /> {c.no_telepon}
                    </a>
                  )}
                </div>
                {c.status === "Ditolak" && c.alasan_ditolak && (
                  <p className="text-[11px] text-rose-600 mt-1.5">Alasan: {c.alasan_ditolak}</p>
                )}
                <p className="text-[10px] text-slate-400 mt-1.5 font-mono">
                  Daftar: {new Date(c.created_at).toLocaleString("id-ID")}
                </p>
              </div>

              <div className="flex gap-2 shrink-0 flex-wrap">
                {c.status !== "Disetujui" && (
                  <button
                    disabled={busyId === c.id}
                    onClick={() => handleApprove(c)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <ShieldCheck className="h-3.5 w-3.5" /> Setujui
                  </button>
                )}
                {c.status !== "Ditolak" && (
                  <button
                    disabled={busyId === c.id}
                    onClick={() => handleReject(c)}
                    className="px-4 py-2 bg-white hover:bg-rose-50 disabled:opacity-50 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <XCircle className="h-3.5 w-3.5" /> Tolak
                  </button>
                )}
                <button
                  disabled={busyId === c.id}
                  onClick={() => handleDelete(c)}
                  title="Hapus akun permanen"
                  className="px-3 py-2 bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-400 hover:text-rose-600 border border-slate-200 rounded-xl transition-all cursor-pointer"
                >
                  <Trash className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
