import React, { useState, useEffect } from "react";
import { Item, StockHistory } from "../types";
import { getItems, createItem, updateItem, deleteItem, getStockHistory } from "../api";
import {
  Plus,
  Edit2,
  Trash2,
  TrendingUp,
  Search,
  Filter,
  Package,
  AlertTriangle,
  History,
  X,
  PlusCircle,
  Archive,
  Image,
  CheckCircle2,
  SlidersHorizontal
} from "lucide-react";

export default function AdminItems() {
  const [items, setItems] = useState<Item[]>([]);
  const [history, setHistory] = useState<StockHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter/Search states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [categories, setCategories] = useState<string[]>([]);

  // Modal active states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Form payload states
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [itemForm, setItemForm] = useState({
    nama_barang: "",
    kategori: "",
    satuan: "",
    stok: 0,
    stok_minimum: 5,
    gambar_url: ""
  });

  // Load Database Items & Logs
  const loadItemsData = async () => {
    try {
      setLoading(true);
      const [fetchedItems, fetchedLogs] = await Promise.all([getItems(), getStockHistory()]);
      setItems(fetchedItems);
      setHistory(fetchedLogs);

      const uniqueCategories = Array.from(new Set(fetchedItems.map(item => item.kategori)));
      setCategories(["Semua", ...uniqueCategories]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItemsData();
  }, []);

  // Filter Logic
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || item.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleOpenAdd = () => {
    setSelectedItem(null);
    setItemForm({
      nama_barang: "",
      kategori: "Kertas",
      satuan: "Rim",
      stok: 0,
      stok_minimum: 5,
      gambar_url: ""
    });
    setIsAddEditOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setSelectedItem(item);
    setItemForm({
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      satuan: item.satuan,
      stok: item.stok, // Read-only or editable for custom manual tweak
      stok_minimum: item.stok_minimum,
      gambar_url: item.gambar_url || ""
    });
    setIsAddEditOpen(true);
  };



  // Submit Add / Edit
  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemForm.nama_barang.trim()) {
      alert("Nama barang wajib diisi!");
      return;
    }

    try {
      if (selectedItem) {
        // Edit Item
        await updateItem(selectedItem.id, {
          nama_barang: itemForm.nama_barang,
          kategori: itemForm.kategori,
          satuan: itemForm.satuan,
          stok: itemForm.stok,
          stok_minimum: itemForm.stok_minimum,
          gambar_url: itemForm.gambar_url
        });
      } else {
        // Create Item
        await createItem({
          nama_barang: itemForm.nama_barang,
          kategori: itemForm.kategori,
          satuan: itemForm.satuan,
          stok: itemForm.stok,
          stok_minimum: itemForm.stok_minimum,
          gambar_url: itemForm.gambar_url
        });
      }

      setIsAddEditOpen(false);
      loadItemsData();
    } catch (err) {
      console.error(err);
      alert("Gagal menyimpan barang ATK!");
    }
  };



  // Handle Delete
  const handleDeleteItem = async (itemId: string, namaBarang: string) => {
    const isConfirmed = window.confirm(`Apakah Anda yakin ingin menghapus barang "${namaBarang}" secara permanen? Serta seluruh logs yang terkait?`);
    if (!isConfirmed) return;

    try {
      await deleteItem(itemId);
      loadItemsData();
    } catch (err) {
      console.error(err);
      alert("Gagal menghapus barang.");
    }
  };

  return (
    <div id="admin_atk_management" className="space-y-6">
      {/* Top Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-800">Manajemen ATK Kantor</h2>
          <p className="text-sm text-slate-500">Kelola master data barang, katalog, unit satuan, serta penambahan stok (restocking)</p>
        </div>
        <div className="flex flex-wrap gap-2.5 w-full md:w-auto">
          <button
            onClick={() => setIsHistoryOpen(true)}
            className="flex-1 md:flex-initial px-4 py-2.5 border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 rounded-xl transition-all font-semibold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <History className="h-4 w-4" /> Log Riwayat Restock
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl transition-all font-bold text-sm inline-flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-teal-100"
          >
            <Plus className="h-4.5 w-4.5" /> Tambah Barang Baru
          </button>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari barang atau kategori..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100 text-slate-800"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1.5 text-xs text-slate-400 font-bold uppercase mr-1">
              <Filter className="h-4 w-4" /> Kategori:
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-sm py-2.5 px-4 rounded-xl focus:border-teal-500 focus:bg-white"
            >
              <option value="Semua">Semua Kategori</option>
              {categories.filter(c => c !== "Semua").map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table for ATK Items */}
      {loading ? (
        <div className="py-16 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-sm font-medium text-slate-500 mt-4">Menyiapkan inventaris kantor...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <Package className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">Tidak Ada ATK</h3>
          <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
            Inventaris kosong atau tidak ada item yang cocok dengan pencarian "{searchTerm}".
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-slate-600 text-sm">
              <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-4 px-6 text-center w-16">No</th>
                  <th className="py-4 px-6">Informasi ATK</th>
                  <th className="py-4 px-6">Kategori</th>
                  <th className="py-4 px-6 font-mono">Stok Tersedia</th>
                  <th className="py-4 px-6 font-mono text-center">Batas Minimum</th>
                  <th className="py-4 px-6 text-right">Opsi Operasional</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item, idx) => {
                  const isLow = item.stok <= item.stok_minimum;
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 text-center text-slate-400 font-medium font-mono">{idx + 1}</td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          {item.gambar_url ? (
                            <img
                              src={item.gambar_url}
                              alt={item.nama_barang}
                              className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-teal-50 flex items-center justify-center text-teal-600 border border-teal-100 shrink-0">
                              <Package className="h-6 w-6" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-slate-800 text-sm leading-tight">{item.nama_barang}</p>
                            <span className="text-[10px] text-slate-400 font-mono tracking-wider font-bold block mt-0.5 uppercase">
                              ID: {item.id} | Satuan: {item.satuan}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 text-slate-600 bg-slate-100 border border-slate-200/50 rounded-md text-[11px] font-bold uppercase tracking-wider">
                          {item.kategori}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-base font-extrabold ${isLow ? "text-rose-600" : "text-slate-800"}`}>
                            {item.stok}
                          </span>
                          <span className="text-slate-400 text-xs font-medium font-mono">({item.satuan})</span>
                          {isLow && (
                            <span className="inline-flex items-center justify-center h-5 px-1.5 text-[9px] font-bold rounded-lg bg-rose-100 text-rose-700 uppercase animate-pulse">
                              Stok Minim
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-center font-bold text-slate-500">
                        {item.stok_minimum} {item.satuan}
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenEdit(item)}
                            title="Edit Data ATK"
                            className="bg-teal-50 text-teal-700 hover:bg-teal-100 border border-teal-200/50 p-2 rounded-xl transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-4.5 w-4.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteItem(item.id, item.nama_barang)}
                            title="Hapus Barang Permanen"
                            className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200/50 p-2 rounded-xl transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL 1: ADD / EDIT DIALOG */}
      {isAddEditOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-105">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Archive className="h-5 w-5 text-teal-400" />
                <h3 className="font-bold text-lg font-display">
                  {selectedItem ? "Ubah Data ATK Kantor" : "Tambah ATK Baru"}
                </h3>
              </div>
              <button
                onClick={() => setIsAddEditOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <form onSubmit={handleSaveItem}>
              <div className="p-6 space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                    Nama Barang ATK <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={itemForm.nama_barang}
                    onChange={(e) => setItemForm({ ...itemForm, nama_barang: e.target.value })}
                    placeholder="Contoh: Kertas HVS Sinar Dunia F4"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100"
                    required
                  />
                </div>

                {/* Grid Category & Unit fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      Kategori <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemForm.kategori}
                      onChange={(e) => setItemForm({ ...itemForm, kategori: e.target.value })}
                      placeholder="Kertas / Alat Tulis / Tinta dll"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      Satuan / Unit <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={itemForm.satuan}
                      onChange={(e) => setItemForm({ ...itemForm, satuan: e.target.value })}
                      placeholder="Rim / Lusin / Box / Pcs"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
                      required
                    />
                  </div>
                </div>

                {/* Stock values fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      {selectedItem ? "Stok Saat Ini" : "Stok Awal"} <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.stok}
                      onChange={(e) => setItemForm({ ...itemForm, stok: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                      Stok Batas Minimum <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={itemForm.stok_minimum}
                      onChange={(e) => setItemForm({ ...itemForm, stok_minimum: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono"
                      required
                    />
                  </div>
                </div>

                {/* Optional Image Url */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                    <Image className="h-3.5 w-3.5 text-slate-400" /> Link Gambar / Foto Barang <span className="text-slate-400 italic">(Opsional)</span>
                  </label>
                  <input
                    type="url"
                    value={itemForm.gambar_url}
                    onChange={(e) => setItemForm({ ...itemForm, gambar_url: e.target.value })}
                    placeholder="Contoh: https://images.unsplash.com/..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono"
                  />
                </div>
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-bold shadow-sm shadow-teal-100 cursor-pointer"
                >
                  {selectedItem ? "Perbarui ATK" : "Simpan ATK"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* MODAL 3: STOCK HISTORY LOG DIALOG */}
      {isHistoryOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-105">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-5 w-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-lg font-display">Log Pembukuan & Perubahan Stok</h3>
                  <p className="text-xs text-slate-400 font-mono">Riwayat Restock dan Pengurangan</p>
                </div>
              </div>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            <div className="p-6 max-h-[500px] overflow-y-auto space-y-4">
              {history.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm italic">
                  Belum ada log perubahan stok dalam database.
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((log) => {
                    const isRestock = log.tipe === "restock";
                    return (
                      <div
                        key={log.id}
                        className={`p-3.5 rounded-xl border flex justify-between items-start gap-4 ${
                          isRestock ? "bg-emerald-50/50 border-emerald-100" : "bg-rose-50/50 border-rose-100"
                        }`}
                      >
                        <div className="space-y-1">
                          <p className="font-bold text-slate-800 text-sm leading-tight">{log.itemName}</p>
                          <p className="text-slate-600 text-xs">{log.keterangan}</p>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            Tanggal: {new Date(log.created_at).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`inline-block py-1 px-2.5 rounded-lg text-xs font-extrabold font-mono ${
                              isRestock ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                            }`}
                          >
                            {isRestock ? "+" : "-"} {log.jumlah}
                          </span>
                          <span className="text-[9px] text-slate-400 font-mono block mt-1 uppercase">
                            {log.tipe}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-end border-t border-slate-100">
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="px-5 py-2 bg-slate-800 text-white rounded-xl text-sm font-semibold hover:bg-slate-700 cursor-pointer"
              >
                Tutup Dokumen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
