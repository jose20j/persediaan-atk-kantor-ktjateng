import React, { useState, useEffect } from "react";
import kejaksaanLogo from "../assets/images/kejaksaan_logo_1779373081640.png";
import { Item, Setting, Bidang } from "../types";
import { Search, Filter, ShoppingBag, Send, AlertTriangle, Sparkles, Building, BookOpen, Check, Trash2, Plus, Minus } from "lucide-react";
import { getItems, createRequest, getSettings, getDepartments } from "../api";
import { jsPDF } from "jspdf";

function generateOrderReceiptPDF(
  cartItems: { item: Item; quantity: number }[],
  formData: { nama_pemesan: string; bidang: string; keterangan_customer: string },
  officeName: string,
  orderId: string
) {
  const doc = new jsPDF("p", "pt", "a4");
  const pw = 595;
  const ml = 40;
  const mr = 40;
  const cw = pw - ml - mr;
  const now = new Date();

  const teal: [number, number, number] = [13, 78, 74];
  const white: [number, number, number] = [255, 255, 255];
  const dark: [number, number, number] = [15, 23, 42];
  const mid: [number, number, number] = [71, 85, 105];
  const light: [number, number, number] = [226, 232, 240];

  let y = 0;

  // HEADER
  doc.setFillColor(...teal);
  doc.rect(0, 0, pw, 70, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text((officeName || "Portal ATK Kantor").toUpperCase(), ml, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Formulir Pesanan ATK Digital", ml, 46);
  doc.setFontSize(8);
  doc.text(
    now.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }),
    pw - mr, 28, { align: "right" }
  );

  y = 94;

  // TITLE
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("BUKTI PERMINTAAN ATK", ml, y);
  y += 24;

  // Badge
  doc.setFillColor(209, 250, 229);
  doc.rect(ml, y, 172, 18, "F");
  doc.setTextColor(4, 120, 87);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("Pesanan Diterima Admin", ml + 6, y + 13);
  y += 28;

  // Timestamp
  doc.setTextColor(...mid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text(
    `Diterima pada: ${now.toLocaleString("id-ID", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    ml, y
  );
  y += 18;

  // Divider
  doc.setDrawColor(...light);
  doc.line(ml, y, pw - mr, y);
  y += 18;

  // INFO TABLE
  const infoRows: [string, string][] = [
    ["Nama Pemesan", formData.nama_pemesan],
    ["Bidang / Departemen", formData.bidang || "Umum"],
    ["Tanggal Permintaan", now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ["Keterangan", formData.keterangan_customer || "-"],
  ];

  const lw = 145;
  infoRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...mid);
    doc.text(label, ml, y);
    doc.text(":", ml + lw - 4, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(val, cw - lw - 10);
    doc.text(lines, ml + lw + 8, y);
    y += Math.max(16, lines.length * 12);
  });

  y += 16;

  // ITEMS TABLE HEADER
  doc.setFillColor(...teal);
  doc.rect(ml, y, cw, 24, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);

  const col0x = ml + 6;
  const col1x = ml + 34;
  const col2x = ml + cw - 150;
  const col3x = ml + cw - 58;

  doc.text("No", col0x, y + 16);
  doc.text("Nama Barang", col1x, y + 16);
  doc.text("Satuan", col2x, y + 16);
  doc.text("Jumlah", col3x, y + 16);
  y += 24;

  // ITEM ROWS
  cartItems.forEach((ci, idx) => {
    doc.setFillColor(...(idx % 2 === 0 ? ([248, 250, 252] as [number, number, number]) : ([255, 255, 255] as [number, number, number])));
    doc.rect(ml, y, cw, 22, "F");
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(String(idx + 1), col0x, y + 15);
    const name = ci.item.nama_barang.length > 38 ? ci.item.nama_barang.slice(0, 35) + "..." : ci.item.nama_barang;
    doc.text(name, col1x, y + 15);
    doc.text(ci.item.satuan, col2x, y + 15);
    doc.text(String(ci.quantity), col3x, y + 15);
    y += 22;
  });

  doc.setDrawColor(...light);
  doc.rect(ml, y - cartItems.length * 22 - 24, cw, cartItems.length * 22 + 24, "S");

  y += 28;

  // SIGNATURE BOX (right-aligned)
  const sigX = pw - mr - 200;
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text(
    `Semarang, ${now.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}`,
    sigX, y
  );
  y += 14;
  doc.text("Pemesan,", sigX, y);
  y += 55;
  doc.setFont("helvetica", "bold");
  doc.text(formData.nama_pemesan, sigX, y);
  y += 14;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...mid);
  doc.text(formData.bidang || "Umum", sigX, y);

  // FOOTER
  doc.setDrawColor(...light);
  doc.line(ml, 800, pw - mr, 800);
  doc.setTextColor(...mid);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.text("Dokumen ini diterbitkan secara otomatis oleh Sistem Persediaan ATK Kantor.", ml, 814);
  doc.text(`Dicetak pada: ${now.toLocaleString("id-ID")}  |  ID Pesanan: ${orderId}`, ml, 826);

  doc.save(`bukti_pesanan_ATK_${now.toISOString().split("T")[0]}.pdf`);
}

interface CustomerCatalogProps {
  onSwappedToAdmin: () => void;
}

export default function CustomerCatalog({ onSwappedToAdmin }: CustomerCatalogProps) {
  const [items, setItems] = useState<Item[]>([]);
  const [settings, setSettings] = useState<Setting>({ nomor_whatsapp_admin: "", nama_kantor: "" });
  const [bidangs, setBidangs] = useState<Bidang[]>([]);
  const [loading, setLoading] = useState(true);

  // States for search and filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Semua");
  const [categories, setCategories] = useState<string[]>(["Semua"]);

  // Cart and Modal States
  const [cart, setCart] = useState<{ item: Item; quantity: number }[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderForm, setOrderForm] = useState({
    nama_pemesan: "",
    bidang: "",
    keterangan_customer: ""
  });
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Load Data
  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedItems, fetchedSettings, fetchedBidangs] = await Promise.all([
        getItems(),
        getSettings(),
        getDepartments()
      ]);
      setItems(fetchedItems);
      setSettings(fetchedSettings);
      setBidangs(fetchedBidangs);

      // Process Categories
      const uniqueCategories = Array.from(new Set(fetchedItems.map(item => item.kategori)));
      setCategories(["Semua", ...uniqueCategories]);

      if (fetchedBidangs.length > 0) {
        setOrderForm(prev => ({ ...prev, bidang: fetchedBidangs[0].nama_bidang }));
      }
    } catch (err) {
      console.error("Gagal memuat katalog", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter Items
  const filteredItems = items.filter(item => {
    const matchesSearch = item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          item.kategori.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Semua" || item.kategori === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Cart Helper Operations
  const handleAddToCart = (item: Item) => {
    const isAvailable = (item.stok || 0) > (item.stok_minimum || 0);
    if (!isAvailable) {
      alert(`Maaf, barang ${item.nama_barang} tidak dapat dipesan karena telah mencapai batas stok minimum.`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(c => c.item.id === item.id);
      if (existing) {
        return prev.map(c => c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleUpdateCartQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart(prev => prev.filter(c => c.item.id !== itemId));
    } else {
      setCart(prev => prev.map(c => c.item.id === itemId ? { ...c, quantity } : c));
    }
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart(prev => prev.filter(c => c.item.id !== itemId));
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      alert("Keranjang belanja Anda kosong!");
      return;
    }
    if (!orderForm.nama_pemesan.trim()) {
      alert("Silakan masukkan nama pemesan!");
      return;
    }

    try {
      setSubmittingOrder(true);

      const orderId = "ord-" + Math.random().toString(36).substr(2, 9);
      const requestPayloads = cart.map(itemCart => ({
        order_id: orderId,
        item_id: itemCart.item.id,
        nama_pemesan: orderForm.nama_pemesan,
        bidang: orderForm.bidang || "Umum",
        jumlah_diminta: itemCart.quantity,
        keterangan_customer: orderForm.keterangan_customer
      }));

      await Promise.all(requestPayloads.map(payload => createRequest(payload)));

      try {
        generateOrderReceiptPDF(
          cart,
          { ...orderForm },
          settings.nama_kantor || "Portal ATK Kantor",
          orderId
        );
      } catch (pdfErr) {
        console.error("Gagal menghasilkan PDF:", pdfErr);
      }

      setCart([]);
      setShowCartModal(false);
      setOrderForm(prev => ({ ...prev, nama_pemesan: "", keterangan_customer: "" }));
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
      loadData();
    } catch (err: any) {
      alert(err?.message || "Gagal meletakkan pesanan ATK!");
    } finally {
      setSubmittingOrder(false);
    }
  };

  return (
    <div id="customer_portal" className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Dynamic Success Alert Toast */}
      {showSuccessToast && (
        <div className="fixed bottom-5 right-5 z-50 max-w-sm bg-emerald-600 text-white rounded-xl shadow-2xl p-4 flex items-start gap-3 border border-emerald-500/30 animate-bounce">
          <div className="bg-white/20 p-2 rounded-lg">
            <Check className="h-5 w-5 text-white" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Pesanan Berhasil Dikirim!</h4>
            <p className="text-xs text-white/80 mt-1">Pesanan Anda telah diterima dan sedang menunggu konfirmasi admin.</p>
          </div>
        </div>
      )}

      {/* Modern Professional Header */}
      <header className="bg-teal-950 text-white shadow-lg border-b border-teal-900">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1 rounded-xl border border-white/20 shadow-inner flex items-center justify-center shrink-0 w-11 h-11 bg-white/20">
              <img
                src={kejaksaanLogo}
                referrerPolicy="no-referrer"
                className="h-8 w-8 object-contain"
                alt="Logo Kejaksaan"
              />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display">{settings.nama_kantor || "Port ATK Kantor"}</h1>
              <p className="text-xs sm:text-sm text-teal-200 mt-0.5">Formulir Pesanan ATK Digital</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <button
              onClick={() => setShowCartModal(true)}
              className="relative px-5 py-2.5 bg-teal-600 hover:bg-teal-500 border border-teal-500 text-white rounded-xl font-bold text-sm transition-all shadow-md focus:ring-2 focus:ring-teal-400 cursor-pointer w-full sm:w-auto text-center flex items-center justify-center gap-2"
            >
              <ShoppingBag className="h-4 w-4" />
              Keranjang Pesanan
              {cart.length > 0 && (
                <span className="bg-rose-500 text-white rounded-full text-[10px] sm:text-xs px-2 py-0.5 min-w-[20px] font-bold">
                  {cart.reduce((total, c) => total + c.quantity, 0)}
                </span>
              )}
            </button>
            <button
              onClick={onSwappedToAdmin}
              className="px-5 py-2.5 bg-teal-750/30 hover:bg-teal-750/60 border border-teal-500/30 text-teal-100 rounded-xl font-medium text-sm transition-all focus:ring-2 focus:ring-teal-400 cursor-pointer w-full sm:w-auto text-center"
            >
              Masuk Portal Admin ⚖️
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 flex-1">
        {/* Help Banner card */}
        <div className="bg-white rounded-2xl border border-teal-100 shadow-xs p-6 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-48 h-48 bg-teal-50/50 rounded-full -z-10" />
          <div className="flex items-start gap-4">
            <div className="bg-teal-55 bg-teal-50 p-3 rounded-xl text-teal-700 mt-1 shrink-0">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800">Bagaimana Cara Memesan ATK?</h2>
              <p className="text-sm text-slate-600 mt-1 max-w-2xl">
                Cari kertas, pulpen, atau alat perkantoran lainnya pada katalog di bawah ini. Masukkan beberapa barang yang Anda butuhkan ke <strong className="text-teal-700">Keranjang Pesanan</strong>, klik ikon keranjang untuk menyesuaikan jumlahnya, lalu kirim sekaligus. Admin akan memproses permintaan Anda dan mengonfirmasi jumlah yang dapat dipenuhi.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" /> Terintegrasi Sistem ATK
            </span>
          </div>
        </div>

        {/* Filter and Search Panel */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5 mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-stretch gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Cari ATK berdasarkan nama barang atau kategori..."
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100 transition-all text-slate-800"
              />
            </div>

            {/* Category Filter */}
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5 mr-1">
                <Filter className="h-3 w-3" /> Kategori:
              </span>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 text-xs font-medium rounded-lg transition-all border cursor-pointer ${
                      selectedCategory === cat
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm shadow-teal-200"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        {loading ? (
          <div className="py-20 text-center">
            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent align-[-0.125em]" />
            <p className="text-sm font-medium text-slate-500 mt-4">Memuat katalog ATK terbaru...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 px-4 text-center">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
            <h3 className="font-bold text-slate-700 text-lg">Stok ATK Tidak Ditemukan</h3>
            <p className="text-slate-500 text-sm mt-1 max-w-md mx-auto">
              Tidak ada barang ATK yang cocok dengan pencarian "{searchTerm}" atau kategori filter Anda. Coba kata kunci lainnya.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const isAvailable = (item.stok || 0) > (item.stok_minimum || 0);
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200/80 hover:border-teal-200 hover:shadow-lg hover:shadow-slate-100 transition-all duration-300 flex flex-col justify-between overflow-hidden relative group"
                >
                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3 z-10">
                    <span className="px-2.5 py-1 bg-slate-900/70 text-white text-[10px] font-bold rounded-md backdrop-blur-xs uppercase tracking-wider">
                      {item.kategori}
                    </span>
                  </div>

                  {/* Thumbnail Image */}
                  <div className="w-full h-44 bg-slate-100 overflow-hidden relative">
                    {item.gambar_url ? (
                      <img
                        src={item.gambar_url}
                        alt={item.nama_barang}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        onError={(e) => {
                          // Fallback to stock illustration colors
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : null}
                    {/* fallback or primary background pattern */}
                    <div className="absolute inset-0 bg-gradient-to-tr from-teal-700/5 to-transparent flex items-center justify-center -z-10">
                      <ShoppingBag className="h-12 w-12 text-slate-300" />
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      {/* Status Badges only - NO STOCK QUANTITY FOR CUSTOMERS */}
                      <div className="flex justify-between items-center mb-2.5">
                        <span className="text-[11px] font-mono text-slate-400 font-semibold uppercase">
                          Satuan: {item.satuan}
                        </span>
                        {isAvailable ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Tersedia
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold shadow-xs animate-pulse">
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                            Tidak Tersedia
                          </span>
                        )}
                      </div>

                      {/* Item Name */}
                      <h4 className="font-bold text-slate-800 text-base leading-snug group-hover:text-teal-700 transition-colors">
                        {item.nama_barang}
                      </h4>
                    </div>

                    {/* Footer Order Triggers */}
                    <div className="mt-5 pt-3 border-t border-slate-100">
                      {!isAvailable ? (
                        <button
                          disabled
                          className="w-full py-2.5 px-4 bg-slate-100 text-slate-400 border border-slate-200 rounded-xl text-sm font-semibold cursor-not-allowed flex items-center justify-center gap-2"
                        >
                          Tidak Tersedia / Kontak Admin <AlertTriangle className="h-3.5 w-3.5" />
                        </button>
                      ) : (() => {
                        const itemInCart = cart.find(c => c.item.id === item.id);
                        if (itemInCart) {
                          return (
                            <div className="flex items-center justify-between bg-teal-50 border border-teal-200 rounded-xl p-1 gap-2 w-full">
                              <button
                                onClick={() => handleUpdateCartQuantity(item.id, itemInCart.quantity - 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="font-bold text-teal-900 font-mono text-xs sm:text-sm">
                                {itemInCart.quantity} {item.satuan}
                              </span>
                              <button
                                onClick={() => handleUpdateCartQuantity(item.id, itemInCart.quantity + 1)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold transition-colors cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          );
                        }
                        return (
                          <button
                            onClick={() => handleAddToCart(item)}
                            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shadow-teal-100 flex items-center justify-center gap-2 cursor-pointer group-hover:translate-y-[-2px] duration-300"
                          >
                            Pesan ATK <Plus className="h-3.5 w-3.5 transition-transform group-hover:scale-110" />
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Sticky Cart Indicator */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-teal-950 border border-teal-850 text-white px-5 py-4 rounded-2xl shadow-2xl flex items-center justify-between gap-5 sm:gap-12 max-w-lg w-[calc(100%-2rem)] animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-2.5 rounded-xl border border-white/10 shadow-inner">
              <ShoppingBag className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-bold text-xs sm:text-sm">{cart.length} Jenis Barang Terpilih</h4>
              <p className="text-[10px] sm:text-xs text-teal-200 mt-0.5 animate-pulse">
                Total unit: {cart.reduce((sum, c) => sum + c.quantity, 0)}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowCartModal(true)}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            Lanjut Pesan <Send className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Customer Footer */}
      <footer className="bg-slate-900 text-slate-400 py-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs">&copy; Kejaksaan Tinggi Jawa Tengah - Jose Juan Sebastian, S.M.</p>
          <div className="flex gap-4 text-xs font-medium text-slate-500">
            <p>Sistem Persediaan ATK v1.3</p>
          </div>
        </div>
      </footer>

      {/* ORDER FORM MODAL (SHOPPING CART) */}
      {showCartModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-teal-800 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-lg font-display">Formulir Permintaan ATK</h3>
                  <p className="text-xs text-teal-200 mt-0.5">Input detail pesanan {cart.length} item barang</p>
                </div>
              </div>
              <button
                onClick={() => setShowCartModal(false)}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors text-xl font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleSubmitOrder}>
              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
                {/* Cart Items List */}
                <div className="space-y-2">
                  <span className="block text-xs font-bold text-slate-500 uppercase tracking-wider">
                    📋 Barang yang Dipesan
                  </span>
                  
                  {cart.length === 0 ? (
                    <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-slate-500 text-sm">
                      Keranjang kosong. Silakan cari dan pilih barang terlebih dahulu.
                    </div>
                  ) : (
                    <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl divide-y divide-slate-200 max-h-48 overflow-y-auto space-y-2">
                      {cart.map((cartItem) => (
                        <div key={cartItem.item.id} className="pt-2 first:pt-0 flex items-center justify-between gap-4">
                          <div className="min-w-0 flex-1">
                            <h5 className="font-bold text-slate-800 text-xs truncate">{cartItem.item.nama_barang}</h5>
                            <span className="text-[10px] text-slate-400 font-mono block">Satuan: {cartItem.item.satuan}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 shrink-0">
                            {/* Stepper Inside Modal */}
                            <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm">
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(cartItem.item.id, cartItem.quantity - 1)}
                                className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-l-lg transition-colors cursor-pointer"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2 text-xs font-bold font-mono text-slate-700 min-w-[20px] text-center">
                                {cartItem.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateCartQuantity(cartItem.item.id, cartItem.quantity + 1)}
                                className="p-1 text-slate-500 hover:text-teal-600 hover:bg-slate-50 rounded-r-lg transition-colors cursor-pointer"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                            
                            <button
                              type="button"
                              onClick={() => handleRemoveFromCart(cartItem.item.id)}
                              className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Hapus barang"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown Select Division/Bidang */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                    <Building className="h-3.5 w-3.5 text-teal-600" /> Bidang / Departemen <span className="text-rose-500">*</span>
                  </label>
                  {bidangs.length > 0 ? (
                    <select
                      value={orderForm.bidang}
                      onChange={(e) => setOrderForm({ ...orderForm, bidang: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100"
                      required
                    >
                      {bidangs.map((b) => (
                        <option key={b.id} value={b.nama_bidang}>
                          {b.nama_bidang}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <select
                      value={orderForm.bidang}
                      onChange={(e) => setOrderForm({ ...orderForm, bidang: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
                      required
                    >
                      <option value="IT">IT</option>
                      <option value="HRD">HRD</option>
                      <option value="Keuangan">Keuangan</option>
                      <option value="Marketing">Marketing</option>
                      <option value="Umum">Umum</option>
                      <option value="Operasional">Operasional</option>
                    </select>
                  )}
                </div>

                {/* Text Input Pemesan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Nama Lengkap Pemesan <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={orderForm.nama_pemesan}
                    onChange={(e) => setOrderForm({ ...orderForm, nama_pemesan: e.target.value })}
                    placeholder="Masukkan nama Anda..."
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100"
                    required
                  />
                </div>

                {/* Text Area Keterangan */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Keterangan Tambahan <span className="text-slate-400 font-normal">(Opsional)</span>
                  </label>
                  <textarea
                    value={orderForm.keterangan_customer}
                    onChange={(e) => setOrderForm({ ...orderForm, keterangan_customer: e.target.value })}
                    placeholder="Contoh: Sangat mendesak / mohon diletakkan di meja IT..."
                    rows={3}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white focus:ring-3 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Modal Footer Controls */}
              <div className="bg-slate-50 px-6 py-4 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCartModal(false)}
                  className="px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-medium hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submittingOrder || cart.length === 0}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-xl text-sm font-bold shadow-sm shadow-emerald-100 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  {submittingOrder ? "Memproses..." : (
                    <>
                      Kirim Pesanan <Send className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
