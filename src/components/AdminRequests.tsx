import React, { useState, useEffect, useMemo } from "react";
import { RequestOrder, Item } from "../types";
import { getRequests, getItems, processRequest, rejectRequest, getDepartments } from "../api";
import {
  FileCheck, Search, AlertTriangle, FileText, User, MapPin, Info,
  Layers, ChevronRight, Eye, Package, Hash, Calendar, MessageSquare,
  X, CheckCircle, XCircle, Clock, ShoppingBag
} from "lucide-react";

type GroupStatus = "Pending" | "Selesai" | "Ditolak" | "Sebagian";

interface OrderGroup {
  order_id: string;
  requests: RequestOrder[];
  pemesan: string;
  bidang: string;
  created_at: string;
  status: GroupStatus;
  hasPending: boolean;
  keterangan_customer?: string;
}

function formatOrderId(id: string) {
  return id.replace(/^(ord|req)-/, "").toUpperCase();
}

function computeGroupStatus(reqs: RequestOrder[]): GroupStatus {
  if (reqs.every(r => r.status === "Pending")) return "Pending";
  if (reqs.every(r => r.status === "Selesai")) return "Selesai";
  if (reqs.every(r => r.status === "Ditolak")) return "Ditolak";
  return "Sebagian";
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("Semua");
  const [deptFilter, setDeptFilter] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");

  // Detail modal — menampilkan semua item dalam 1 order group
  const [detailGroup, setDetailGroup] = useState<OrderGroup | null>(null);

  // Process modal — satu item
  const [selectedRequest, setSelectedRequest] = useState<RequestOrder | null>(null);
  const [associatedItem, setAssociatedItem] = useState<Item | null>(null);
  const [approvalForm, setApprovalForm] = useState({ jumlah_disetujui: 1, catatan_admin: "" });
  const [submitting, setSubmitting] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedRequests, fetchedItems, fetchedDepts] = await Promise.all([
        getRequests(), getItems(), getDepartments()
      ]);
      setRequests(fetchedRequests);
      setItems(fetchedItems);
      setDepartments(fetchedDepts.map(d => d.nama_bidang));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Kelompokkan requests by order_id
  const orderGroups = useMemo<OrderGroup[]>(() => {
    const grouped: Record<string, RequestOrder[]> = {};
    requests.forEach(req => {
      const key = req.order_id || req.id; // fallback: request lama tanpa order_id
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(req);
    });

    return Object.entries(grouped)
      .map(([oid, reqs]) => ({
        order_id: oid,
        requests: reqs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        pemesan: reqs[0].nama_pemesan,
        bidang: reqs[0].bidang,
        created_at: reqs[0].created_at,
        status: computeGroupStatus(reqs),
        hasPending: reqs.some(r => r.status === "Pending"),
        keterangan_customer: reqs[0].keterangan_customer,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [requests]);

  // Filter order groups
  const filteredGroups = useMemo(() => {
    return orderGroups.filter(group => {
      const itemNames = group.requests.map(r => (r.itemName || "").toLowerCase()).join(" ");
      const matchesSearch =
        group.pemesan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        formatOrderId(group.order_id).toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemNames.includes(searchTerm.toLowerCase());

      const matchesDept = deptFilter === "Semua" || group.bidang === deptFilter;

      let matchesStatus = true;
      if (statusFilter === "Pending") matchesStatus = group.hasPending;
      else if (statusFilter === "Selesai") matchesStatus = group.status === "Selesai";
      else if (statusFilter === "Ditolak") matchesStatus = group.status === "Ditolak";

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [orderGroups, searchTerm, deptFilter, statusFilter]);

  const handleOpenProcess = (req: RequestOrder) => {
    const parentItem = items.find(i => i.id === req.item_id) || null;
    setSelectedRequest(req);
    setAssociatedItem(parentItem);
    setIsRejecting(false);
    setRejectReason("");
    const stock = parentItem ? parentItem.stok : 0;
    setApprovalForm({ jumlah_disetujui: Math.min(req.jumlah_diminta, stock), catatan_admin: "" });
    setDetailGroup(null); // tutup detail modal
  };

  const handleSubmitApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest || !associatedItem) return;
    const qty = approvalForm.jumlah_disetujui;
    if (qty < 0) { alert("Jumlah tidak boleh negatif!"); return; }
    if (qty > associatedItem.stok) {
      alert(`Stok "${associatedItem.nama_barang}" hanya ${associatedItem.stok} ${associatedItem.satuan}.`);
      return;
    }
    if (qty > selectedRequest.jumlah_diminta) {
      alert(`Tidak boleh melebihi jumlah diminta (${selectedRequest.jumlah_diminta}).`);
      return;
    }
    try {
      setSubmitting(true);
      const ok = await processRequest(selectedRequest.id, qty, approvalForm.catatan_admin);
      if (ok) { setSelectedRequest(null); loadData(); }
      else alert("Gagal memproses persetujuan.");
    } catch { alert("Terjadi kesalahan teknis."); }
    finally { setSubmitting(false); }
  };

  const handleSubmitReject = async () => {
    if (!selectedRequest) return;
    if (!rejectReason.trim()) { alert("Alasan penolakan wajib ditulis!"); return; }
    if (!window.confirm(`Yakin ingin MENOLAK pesanan dari ${selectedRequest.nama_pemesan}?`)) return;
    try {
      setSubmitting(true);
      const ok = await rejectRequest(selectedRequest.id, rejectReason);
      if (ok) { setSelectedRequest(null); setIsRejecting(false); setRejectReason(""); loadData(); }
      else alert("Gagal menolak pesanan.");
    } catch { alert("Sistem gagal menolak berkas."); }
    finally { setSubmitting(false); }
  };

  const StatusBadge = ({ status }: { status: GroupStatus }) => {
    if (status === "Pending") return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-bold">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Pending
      </span>
    );
    if (status === "Selesai") return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-50 text-teal-700 rounded-full border border-teal-200 text-xs font-bold">
        <CheckCircle className="h-3 w-3" /> Selesai
      </span>
    );
    if (status === "Ditolak") return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-50 text-rose-700 rounded-full border border-rose-200 text-xs font-bold">
        <XCircle className="h-3 w-3" /> Ditolak
      </span>
    );
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 text-violet-700 rounded-full border border-violet-200 text-xs font-bold">
        <Clock className="h-3 w-3" /> Sebagian
      </span>
    );
  };

  return (
    <div id="admin_requests_panel" className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Manajemen Permintaan Masuk</h2>
        <p className="text-sm text-slate-500">
          Setiap baris adalah satu Order (bisa berisi beberapa item ATK). Klik Detail untuk melihat dan memproses item per item.
        </p>
      </div>

      {/* Filter */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text" value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Cari nama, barang, atau Order ID..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm py-2.5 px-4 rounded-xl focus:border-teal-500">
              <option value="Semua">Semua Status</option>
              <option value="Pending">🟡 Pending / Sebagian</option>
              <option value="Selesai">🟢 Selesai</option>
              <option value="Ditolak">🔴 Ditolak</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Bidang:</span>
            <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm py-2.5 px-4 rounded-xl focus:border-teal-500">
              <option value="Semua">Semua Bidang</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Tabel */}
      {loading ? (
        <div className="py-16 text-center animate-pulse">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent" />
          <p className="text-sm font-medium text-slate-500 mt-4">Memuat data permintaan...</p>
        </div>
      ) : filteredGroups.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 py-16 text-center">
          <FileText className="h-12 w-12 text-slate-200 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-lg">Tidak Ada Permintaan</h3>
          <p className="text-slate-500 text-sm mt-1">Tidak ada order untuk kata kunci "{searchTerm}".</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-4 px-5 text-center w-10">No</th>
                  <th className="py-4 px-5">Order ID</th>
                  <th className="py-4 px-5">Informasi Pemesan</th>
                  <th className="py-4 px-5 text-center">Item</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((group, idx) => (
                  <tr key={group.order_id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-5 text-center text-slate-400 font-mono text-xs">{idx + 1}</td>

                    <td className="py-4 px-5">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                        <Hash className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="font-mono text-xs font-bold text-slate-700 tracking-wider">
                          {formatOrderId(group.order_id)}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono mt-1 pl-0.5">
                        {new Date(group.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>

                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {group.pemesan}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3 text-teal-500 shrink-0" />
                        {group.bidang}
                      </span>
                    </td>

                    {/* Jumlah item dalam order */}
                    <td className="py-4 px-5 text-center">
                      <div className="inline-flex items-center gap-1.5 bg-slate-100 px-2.5 py-1.5 rounded-lg">
                        <ShoppingBag className="h-3.5 w-3.5 text-slate-500" />
                        <span className="text-xs font-bold text-slate-700">
                          {group.requests.length} item
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-5 text-center">
                      <StatusBadge status={group.status} />
                    </td>

                    <td className="py-4 px-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setDetailGroup(group)}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" /> Detail
                        </button>
                        {group.hasPending && (
                          <button
                            onClick={() => setDetailGroup(group)}
                            className="px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Proses <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── DETAIL ORDER MODAL ── */}
      {detailGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <Eye className="h-5 w-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-base">Detail Order</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <Hash className="h-3 w-3 text-slate-400" />
                    <span className="font-mono text-xs text-slate-300 tracking-wider">
                      {formatOrderId(detailGroup.order_id)}
                    </span>
                  </div>
                </div>
              </div>
              <button onClick={() => setDetailGroup(null)} className="text-white/70 hover:text-white p-1.5 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                {/* Info Pemesan */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Informasi Pemesan</p>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-teal-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{detailGroup.pemesan}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" /> {detailGroup.bidang}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-2 mt-2 border-t border-slate-200">
                    <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span className="text-xs text-slate-500">
                      {new Date(detailGroup.created_at).toLocaleString("id-ID", {
                        day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                      })}
                    </span>
                  </div>
                </div>

                {/* Keterangan customer jika ada */}
                {detailGroup.keterangan_customer && (
                  <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-100 rounded-xl p-3.5">
                    <MessageSquare className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Keterangan Pemesan</p>
                      <p className="text-xs text-amber-900 italic">"{detailGroup.keterangan_customer}"</p>
                    </div>
                  </div>
                )}

                {/* Daftar item dalam order */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Daftar ATK yang Dipesan ({detailGroup.requests.length} item)
                  </p>
                  <div className="space-y-3">
                    {detailGroup.requests.map((req) => {
                      const itm = items.find(i => i.id === req.item_id);
                      const isPending = req.status === "Pending";
                      const isSelesai = req.status === "Selesai";
                      const isDitolak = req.status === "Ditolak";
                      return (
                        <div key={req.id} className={`rounded-xl border p-4 ${
                          isPending ? "border-amber-200 bg-amber-50/40" :
                          isSelesai ? "border-teal-200 bg-teal-50/40" :
                          "border-rose-200 bg-rose-50/40"
                        }`}>
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-2.5 flex-1 min-w-0">
                              <Package className={`h-4 w-4 shrink-0 mt-0.5 ${
                                isPending ? "text-amber-600" : isSelesai ? "text-teal-600" : "text-rose-500"
                              }`} />
                              <div className="min-w-0">
                                <p className="font-bold text-slate-800 text-sm truncate">
                                  {req.itemName || "—"}
                                </p>
                                {itm && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{itm.kategori} · {itm.satuan}</p>
                                )}
                              </div>
                            </div>
                            {/* Status per-item */}
                            <div className="shrink-0">
                              {isPending && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-bold">
                                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Pending
                                </span>
                              )}
                              {isSelesai && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-teal-100 text-teal-700 rounded-lg text-[10px] font-bold">
                                  <CheckCircle className="h-3 w-3" /> Selesai
                                </span>
                              )}
                              {isDitolak && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 bg-rose-100 text-rose-700 rounded-lg text-[10px] font-bold">
                                  <XCircle className="h-3 w-3" /> Ditolak
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Qty info */}
                          <div className="flex items-center gap-4 mt-3 pt-2 border-t border-black/5">
                            <div className="text-xs text-slate-600">
                              Diminta: <span className="font-bold font-mono text-slate-900">{req.jumlah_diminta} {req.itemSatuan || itm?.satuan || ""}</span>
                            </div>
                            {req.jumlah_disetujui !== null && (
                              <div className="text-xs text-slate-600">
                                Disetujui: <span className={`font-bold font-mono ${isSelesai ? "text-teal-700" : "text-rose-600"}`}>
                                  {req.jumlah_disetujui} {req.itemSatuan || itm?.satuan || ""}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Catatan admin jika ada */}
                          {req.catatan_admin && (
                            <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-600 bg-white/70 rounded-lg px-2.5 py-1.5">
                              <Info className="h-3 w-3 text-slate-400 shrink-0" />
                              <span className="italic">{req.catatan_admin}</span>
                            </div>
                          )}

                          {/* Tombol Proses jika pending */}
                          {isPending && (
                            <button
                              onClick={() => handleOpenProcess(req)}
                              className="mt-3 w-full py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-lg inline-flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                            >
                              Proses Item Ini <ChevronRight className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 shrink-0">
              <button
                onClick={() => setDetailGroup(null)}
                className="w-full py-2.5 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── PROCESS MODAL (per item) ── */}
      {selectedRequest && associatedItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-lg">Konfirmasi & Proses Item</h3>
                  <p className="text-xs text-slate-400 font-mono mt-0.5">
                    Order #{formatOrderId(selectedRequest.order_id || selectedRequest.id)}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedRequest(null)} className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitApprove}>
              <div className="p-6 space-y-4">
                {/* Ringkasan item */}
                <div className="bg-teal-50/50 rounded-xl p-4 border border-teal-100 grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-mono font-bold text-teal-700 block uppercase">Pemohon</span>
                    <p className="font-bold text-slate-800 text-sm truncate">{selectedRequest.nama_pemesan}</p>
                    <span className="text-xs font-medium text-slate-500 font-mono">Bidang: {selectedRequest.bidang}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-teal-700 block uppercase">Barang</span>
                    <p className="font-bold text-slate-800 text-sm truncate">{selectedRequest.itemName}</p>
                    <span className="text-xs font-semibold text-rose-600 font-mono">
                      Diminta: {selectedRequest.jumlah_diminta} {associatedItem.satuan}
                    </span>
                  </div>
                </div>

                {/* Stok saat ini */}
                <div className="bg-slate-800 text-white rounded-xl p-3.5 flex items-center justify-between border border-slate-700">
                  <div className="flex items-center gap-2.5">
                    <Layers className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-400">Stok Riil Gudang</p>
                      <h4 className="text-lg font-extrabold font-mono text-emerald-400">
                        {associatedItem.stok} <span className="text-xs font-normal">({associatedItem.satuan})</span>
                      </h4>
                    </div>
                  </div>
                  {associatedItem.stok < selectedRequest.jumlah_diminta && (
                    <span className="px-2 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold rounded">
                      ⚠️ Stok Kurang!
                    </span>
                  )}
                </div>

                {!isRejecting ? (
                  <>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                        Jumlah Disetujui / Dikirim <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="number" min="0"
                        max={Math.min(selectedRequest.jumlah_diminta, associatedItem.stok)}
                        value={approvalForm.jumlah_disetujui}
                        onChange={e => setApprovalForm({ ...approvalForm, jumlah_disetujui: parseInt(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm font-mono focus:ring-3 focus:ring-teal-100"
                        required
                      />
                      <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                        <Info className="h-3.5 w-3.5 text-teal-500" />
                        Kurangi untuk pemenuhan parsial.
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                        Catatan Admin <span className="text-slate-400">(Opsional)</span>
                      </label>
                      <textarea
                        value={approvalForm.catatan_admin}
                        onChange={e => setApprovalForm({ ...approvalForm, catatan_admin: e.target.value })}
                        placeholder="Contoh: Stok dibagi rata, dikirim 2 dari 5."
                        rows={2}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2.5 text-sm"
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-3 p-4 bg-rose-50/50 rounded-xl border border-rose-100">
                    <label className="block text-xs font-bold text-rose-800 uppercase tracking-widest flex items-center gap-1">
                      <AlertTriangle className="h-4 w-4" /> Alasan Penolakan <span className="text-rose-600">*</span>
                    </label>
                    <textarea
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="Contoh: Stok habis / dialokasikan berkala..."
                      rows={3}
                      className="w-full bg-white border border-rose-200 text-rose-900 rounded-xl px-4 py-2.5 text-sm focus:border-rose-500 focus:outline-hidden"
                      required
                    />
                  </div>
                )}
              </div>

              <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                {!isRejecting ? (
                  <>
                    <button type="button" onClick={() => setIsRejecting(true)}
                      className="px-4 py-2.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 rounded-xl text-xs font-bold cursor-pointer">
                      Tolak Item ❌
                    </button>
                    <div className="flex items-center gap-3">
                      <button type="button" onClick={() => setSelectedRequest(null)}
                        className="px-4 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100">
                        Batal
                      </button>
                      <button type="submit" disabled={submitting}
                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-extrabold cursor-pointer">
                        {submitting ? "Menyimpan..." : "Setujui & Kurangi Stok 🟢"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setIsRejecting(false)}
                      className="px-4 py-2 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold">
                      Kembali
                    </button>
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setSelectedRequest(null)} className="px-4 py-2 text-slate-600 text-xs">
                        Batal
                      </button>
                      <button type="button" disabled={submitting} onClick={handleSubmitReject}
                        className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold">
                        {submitting ? "Memproses..." : "Konfirmasi Tolak 🔴"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
