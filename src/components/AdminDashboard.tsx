import React, { useState, useEffect } from "react";
import { Stats, Item } from "../types";
import { getStats, getItems } from "../api";
import {
  Package,
  Layers,
  Calendar,
  AlertTriangle,
  Flame,
  PieChart,
  TrendingUp,
  RefreshCw,
  Bell,
  CheckCircle,
  FileText
} from "lucide-react";

interface AdminDashboardProps {
  onNavigateToRequests: () => void;
  onNavigateToItems: () => void;
  onNavigateToReports: () => void;
}

export default function AdminDashboard({
  onNavigateToRequests,
  onNavigateToItems,
  onNavigateToReports
}: AdminDashboardProps) {
  const [stats, setStats] = useState<Stats | null>(null);
  const [lowStockItems, setLowStockItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      const [fetchedStats, fetchedItems] = await Promise.all([getStats(), getItems()]);
      setStats(fetchedStats);

      // Find low stock items (stok <= stok_minimum)
      const lowStock = fetchedItems.filter(item => item.stok <= item.stok_minimum);
      setLowStockItems(lowStock);
    } catch (err) {
      console.error("Gagal mendapatkan statistik dashboard", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent align-[-0.125em]" />
        <p className="text-sm font-medium text-slate-500 mt-4">Merangkum statistik dan tren per divisi...</p>
      </div>
    );
  }

  const mostRequested = stats?.mostRequestedItems || [];
  const maxRequestedCount = mostRequested.length > 0 ? Math.max(...mostRequested.map(m => m.count)) : 1;

  // Render trend per bidang
  const trendBidang = stats?.requestTrendByBidang || {};
  const trendBidangEntries: [string, number][] = Object.entries(trendBidang).map(
    ([k, v]) => [k, Number(v)] as [string, number]
  ).sort((a, b) => b[1] - a[1]);
  const maxTrendBidang = trendBidangEntries.length > 0 ? Math.max(...trendBidangEntries.map(e => e[1])) : 1;

  return (
    <div id="admin_dashboard" className="space-y-8 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 leading-tight">Dashboard Ringkasan</h2>
          <p className="text-sm text-slate-500 mt-0.5">Analisis ketersediaan stok, tren permintaan divisi, dan mutasi ATK</p>
        </div>
        <button
          onClick={loadDashboardStats}
          className="px-4 py-2 border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-colors text-sm font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
        >
          <RefreshCw className="h-4 w-4" /> Segarkan Data
        </button>
      </div>

      {/* Banner Notifikasi Stok Menipis (⚠️ Banner alert) */}
      {lowStockItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-rose-600 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row items-center justify-between gap-4 animate-in fade-in duration-300">
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="bg-white/20 p-3 rounded-xl border border-white/10 shrink-0">
              <AlertTriangle className="h-6 w-6 text-yellow-100 animate-pulse" />
            </div>
            <div>
              <h3 className="font-extrabold text-lg">⚠️ Perhatian! Ada {lowStockItems.length} Barang Stok Menipis</h3>
              <p className="text-sm text-white/95 mt-0.5 max-w-2xl">
                Beberapa ATK telah berada di bawah batas stok minimum yang ditentukan. Segera lakukan restock di menu Manajemen Barang untuk kelancaran operasional.
              </p>
            </div>
          </div>
          <button
            onClick={onNavigateToItems}
            className="px-5 py-2.5 bg-white text-rose-700 hover:bg-slate-100 rounded-xl font-bold text-sm transition-all shadow-md shrink-0 cursor-pointer"
          >
            Selesaikan Stok Menipis
          </button>
        </div>
      )}

      {/* Top Level Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Total ATK Jenis */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jenis Barang</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats?.totalItems || 0}</h3>
            <p className="text-xs text-slate-500">Barang terdaftar</p>
          </div>
          <div className="bg-teal-50 p-4 rounded-xl text-teal-600">
            <Package className="h-7 w-7" />
          </div>
        </div>

        {/* Card 2: Total Keseluruhan Stok */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Stok Keseluruhan</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats?.totalStockAll || 0}</h3>
            <p className="text-xs text-slate-500">Pcs / Rim / Unit tersedia</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-xl text-indigo-600">
            <Layers className="h-7 w-7" />
          </div>
        </div>

        {/* Card 3: Permintaan Hari Ini */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Permintaan Hari Ini</p>
            <h3 className="text-3xl font-extrabold text-slate-800">{stats?.requestsCount.today || 0}</h3>
            <p className="text-xs text-slate-500">Menunggu respons admin</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-xl text-emerald-600">
            <Calendar className="h-7 w-7" />
          </div>
        </div>

        {/* Card 4: Limit / Low Items warning */}
        <div
          className={`p-6 rounded-2xl border shadow-xs flex items-center justify-between transition-colors ${
            lowStockItems.length > 0
              ? "bg-rose-50/50 border-rose-100 text-rose-900"
              : "bg-white border-slate-100 text-slate-800"
          }`}
        >
          <div className="space-y-1">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Barang Minim/Kritis</p>
            <h3 className={`text-3xl font-extrabold ${lowStockItems.length > 0 ? "text-rose-600" : "text-slate-800"}`}>
              {lowStockItems.length}
            </h3>
            <p className="text-xs text-slate-500">Stok &le; Stok Minimum</p>
          </div>
          <div
            className={`p-4 rounded-xl ${
              lowStockItems.length > 0 ? "bg-rose-100 text-rose-600" : "bg-slate-100 text-slate-600"
            }`}
          >
            <AlertTriangle className="h-7 w-7" />
          </div>
        </div>
      </div>

      {/* Grid for Charts & Stats Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Chart Section 1: Most requested items */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Flame className="h-5 w-5 text-rose-500" />
              <h3 className="font-extrabold text-slate-800 text-lg">ATK Paling Sering Diminta</h3>
            </div>
            <p className="text-xs text-slate-500">Jumlah kuantitas ATK yang diajukan divisi/bidang (diluar status Ditolak)</p>
          </div>

          <div className="space-y-4 mt-6 flex-1 flex flex-col justify-center">
            {mostRequested.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                Belum ada data permintaan barang yang diproses.
              </div>
            ) : (
              mostRequested.map((item, idx) => {
                const percentage = Math.round((item.count / maxRequestedCount) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{item.name}</span>
                      <span className="font-mono text-slate-500">
                        {item.count} unit diminta
                      </span>
                    </div>
                    {/* Visual Bar progress indicator */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="bg-teal-600 h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-teal-55 to-teal-600"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Chart Section 2: Request Trend by bidang (Departments) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <PieChart className="h-5 w-5 text-teal-600" />
              <h3 className="font-extrabold text-slate-800 text-lg">Tren Permintaan Per Bidang</h3>
            </div>
            <p className="text-xs text-slate-500">Frekuensi pengajuan dokumen transaksi baru berdasarkan departemen terkait</p>
          </div>

          <div className="space-y-4 mt-6 flex-1 flex flex-col justify-center">
            {trendBidangEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm italic">
                Belum ada berkas transaksi masuk dari bidang lain.
              </div>
            ) : (
              trendBidangEntries.map(([bidang, count], idx) => {
                const percentage = Math.round((count / maxTrendBidang) * 100);
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-slate-700">{bidang}</span>
                      <span className="font-mono text-teal-600 font-bold">
                        {count} pesanan
                      </span>
                    </div>
                    {/* Visual bar tracker */}
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${percentage}%` }}
                        className="bg-emerald-600 h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-emerald-500 to-teal-600"
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Low Stock Detailed Checklist Summary */}
      {lowStockItems.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs">
          <div className="flex items-center gap-2 mb-4">
            <Bell className="h-5 w-5 text-amber-500 animate-swing" />
            <h3 className="font-extrabold text-slate-800 text-lg">Daftar ATK Butuh Restock Segera</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="text-xs font-bold text-slate-400 uppercase bg-slate-50 rounded-lg">
                <tr>
                  <th className="py-3 px-4">Nama Barang</th>
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4 font-mono">Stok Saat Ini</th>
                  <th className="py-3 px-4 font-mono">Batas Minimum</th>
                  <th className="py-3 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {lowStockItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">{item.nama_barang}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px] font-medium text-slate-600 uppercase">
                        {item.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-rose-600 font-bold">
                      {item.stok} {item.satuan}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500">
                      {item.stok_minimum} {item.satuan}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="px-2.5 py-1 rounded bg-rose-100 text-rose-700 text-xs font-bold">
                        {item.stok === 0 ? "HABIS" : "KRITIS"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Admin Action Shortcuts panel */}
      <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
        <div>
          <h3 className="text-lg font-extrabold text-white">Butuh Laporan Rekapitulasi Berkas?</h3>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Sistem menyediakan export data lengkap dalam bentuk Spreadsheet Excel (.xlsx) dan Dokumen Cetak (.pdf) termasuk visual rekapitulasi selisih parsial ATK.
          </p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button
            onClick={onNavigateToReports}
            className="flex-1 sm:flex-initial px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all shadow-sm cursor-pointer inline-flex items-center justify-center gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" /> Buka Laporan Kantor
          </button>
        </div>
      </div>
    </div>
  );
}
