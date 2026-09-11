import { useState, useEffect, useMemo } from "react";
import kejaksaanLogo from "../assets/images/Kejaksaan_Agung_Republik_Indonesia_new_logo.png";
import stempelDisetujui from "../assets/images/STEMPEL DISETUJUI.png";
import { RequestOrder, Item } from "../types";
import { getRequests, getItems, processRequest, rejectRequest, completeRequest, getDepartments, getSettings } from "../api";
import { generateOrderPDF } from "../lib/generatePDF";
import {
  FileCheck, Search, AlertTriangle, FileText, User, MapPin, Info,
  Layers, ChevronRight, Package, Calendar, MessageSquare,
  X, CheckCircle, XCircle, Clock, ShoppingBag, Truck, Download
} from "lucide-react";

type GroupStatus = "Pending" | "Diproses" | "Selesai" | "Ditolak" | "Sebagian";

interface OrderGroup {
  order_id: string;
  requests: RequestOrder[];
  pemesan: string;
  bidang: string;
  unit?: string;
  created_at: string;
  status: GroupStatus;
  hasPending: boolean;
  hasBeingProcessed: boolean;
  keterangan_customer?: string;
}

interface ItemForm {
  jumlah_disetujui: number;
  catatan_admin: string;
  isRejecting: boolean;
  rejectReason: string;
}

function computeGroupStatus(reqs: RequestOrder[]): GroupStatus {
  if (reqs.every(r => r.status === "Selesai"))  return "Selesai";
  if (reqs.every(r => r.status === "Ditolak"))  return "Ditolak";
  if (reqs.every(r => r.status === "Diproses")) return "Diproses";
  if (reqs.every(r => r.status === "Pending"))  return "Pending";
  return "Sebagian";
}

export default function AdminRequests() {
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [officeName, setOfficeName] = useState("Portal ATK Kantor");
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState("Semua");
  const [deptFilter, setDeptFilter] = useState("Semua");
  const [searchTerm, setSearchTerm] = useState("");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 3);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  });

  const [selectedGroup, setSelectedGroup] = useState<OrderGroup | null>(null);
  const [groupForms, setGroupForms] = useState<Record<string, ItemForm>>({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedRequests, fetchedItems, fetchedDepts, fetchedSettings] = await Promise.all([
        getRequests(), getItems(), getDepartments(), getSettings()
      ]);
      setRequests(fetchedRequests);
      setItems(fetchedItems);
      setDepartments(fetchedDepts.map(d => d.nama_bidang));
      setOfficeName(fetchedSettings.nama_kantor || "Portal ATK Kantor");
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const orderGroups = useMemo<OrderGroup[]>(() => {
    const grouped: Record<string, RequestOrder[]> = {};
    requests.forEach(req => {
      const key = req.order_id || req.id;
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(req);
    });

    return Object.entries(grouped)
      .map(([oid, reqs]) => ({
        order_id: oid,
        requests: reqs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        pemesan: reqs[0].nama_pemesan,
        bidang: reqs[0].bidang,
        unit: reqs[0].unit,
        created_at: reqs[0].created_at,
        status: computeGroupStatus(reqs),
        hasPending: reqs.some(r => r.status === "Pending"),
        hasBeingProcessed: reqs.some(r => r.status === "Diproses"),
        keterangan_customer: reqs[0].keterangan_customer,
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [requests]);

  const toLocalDateStr = (iso: string) => {
    const d = new Date(iso);
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };

  const filteredGroups = useMemo(() => {
    return orderGroups.filter(group => {
      const itemNames = group.requests.map(r => (r.itemName || "").toLowerCase()).join(" ");
      const matchesSearch =
        group.pemesan.toLowerCase().includes(searchTerm.toLowerCase()) ||
        itemNames.includes(searchTerm.toLowerCase());

      const matchesDept = deptFilter === "Semua" || group.bidang === deptFilter;

      let matchesStatus = true;
      if (statusFilter === "Pending")   matchesStatus = group.hasPending;
      else if (statusFilter === "Diproses") matchesStatus = group.hasBeingProcessed || group.status === "Diproses";
      else if (statusFilter === "Selesai")  matchesStatus = group.status === "Selesai";
      else if (statusFilter === "Ditolak")  matchesStatus = group.status === "Ditolak";

      const groupDateStr = toLocalDateStr(group.created_at);
      const matchesDate = groupDateStr >= startDate && groupDateStr <= endDate;

      return matchesSearch && matchesDept && matchesStatus && matchesDate;
    });
  }, [orderGroups, searchTerm, deptFilter, statusFilter, startDate, endDate]);

  const handleOpenProcess = (group: OrderGroup) => {
    const forms: Record<string, ItemForm> = {};
    group.requests.filter(r => r.status === "Pending").forEach(req => {
      const itm = items.find(i => i.id === req.item_id);
      const stock = itm ? itm.stok : 0;
      forms[req.id] = {
        jumlah_disetujui: Math.min(req.jumlah_diminta, stock),
        catatan_admin: "",
        isRejecting: false,
        rejectReason: "",
      };
    });
    setGroupForms(forms);
    setSelectedGroup(group);
  };

  const updateForm = (reqId: string, patch: Partial<ItemForm>) => {
    setGroupForms(prev => ({ ...prev, [reqId]: { ...prev[reqId], ...patch } }));
  };

  const handleSubmitGroup = async () => {
    if (!selectedGroup) return;
    const pendingReqs = selectedGroup.requests.filter(r => r.status === "Pending");

    for (const req of pendingReqs) {
      const form = groupForms[req.id];
      if (!form) continue;
      const itm = items.find(i => i.id === req.item_id);

      if (form.isRejecting) {
        if (!form.rejectReason.trim()) {
          alert(`Alasan penolakan untuk "${req.itemName || req.item_id}" wajib diisi!`);
          return;
        }
      } else {
        if (form.jumlah_disetujui < 0) {
          alert(`Jumlah untuk "${req.itemName}" tidak boleh negatif!`);
          return;
        }
        if (itm && form.jumlah_disetujui > itm.stok) {
          alert(`Stok "${itm.nama_barang}" hanya ${itm.stok} ${itm.satuan}.`);
          return;
        }
        if (form.jumlah_disetujui > req.jumlah_diminta) {
          alert(`Tidak boleh melebihi jumlah diminta (${req.jumlah_diminta}).`);
          return;
        }
      }
    }

    try {
      setSubmitting(true);
      const results = await Promise.all(
        pendingReqs.map(req => {
          const form = groupForms[req.id];
          if (form.isRejecting) {
            return rejectRequest(req.id, form.rejectReason);
          } else {
            return processRequest(req.id, form.jumlah_disetujui, form.catatan_admin);
          }
        })
      );
      if (results.every(Boolean)) {
        setSelectedGroup(null);
        loadData();
      } else {
        alert("Beberapa item gagal diproses. Silakan cek kembali.");
      }
    } catch {
      alert("Terjadi kesalahan teknis.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompleteGroup = async (group: OrderGroup) => {
    const diprosesReqs = group.requests.filter(r => r.status === "Diproses");
    if (diprosesReqs.length === 0) return;
    if (!confirm(`Tandai ${diprosesReqs.length} item sebagai Selesai untuk pesanan ${group.pemesan}?`)) return;
    try {
      setSubmitting(true);
      await Promise.all(diprosesReqs.map(r => completeRequest(r.id)));
      loadData();
    } catch (err: any) {
      alert(err.message || "Gagal menyelesaikan pesanan.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadPDF = async (group: OrderGroup) => {
    await generateOrderPDF({
      items: group.requests.map(r => ({
        nama_barang:      r.itemName    || r.item_id,
        satuan:           r.itemSatuan  || "unit",
        jumlah_diminta:   r.jumlah_diminta,
        jumlah_disetujui: r.jumlah_disetujui,
      })),
      nama_pemesan:       group.pemesan,
      bidang:             group.bidang,
      unit:               group.unit,
      keterangan_customer: group.keterangan_customer,
      catatan_admin:      group.requests.map(r => r.catatan_admin).filter(Boolean).join("; ") || undefined,
      officeName,
      orderId:            group.order_id,
      status:             "Selesai",
      createdAt:          group.created_at,
      logoUrl:            kejaksaanLogo,
      stampUrl:           stempelDisetujui,
    });
  };

  const StatusBadge = ({ status }: { status: GroupStatus }) => {
    if (status === "Pending") return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full border border-amber-200 text-xs font-bold">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-ping" /> Menunggu
      </span>
    );
    if (status === "Diproses") return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200 text-xs font-bold">
        <Truck className="h-3 w-3" /> Diproses
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
          Setiap baris adalah satu pesanan. Klik Proses untuk memproses semua item dalam pesanan.
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
              placeholder="Cari nama atau barang..."
              className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:border-teal-500 focus:bg-white font-medium"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Status:</span>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm py-2.5 px-4 rounded-xl focus:border-teal-500">
              <option value="Semua">Semua Status</option>
              <option value="Pending">🟡 Menunggu</option>
              <option value="Diproses">🔵 Diproses</option>
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
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center gap-4 flex-wrap">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4 w-4 text-teal-600" /> Rentang Tanggal:
          </span>
          <div className="flex items-center gap-2">
            <input
              type="date" value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-xl font-mono focus:border-teal-500 focus:outline-hidden"
            />
            <span className="text-slate-400 text-xs font-bold">s/d</span>
            <input
              type="date" value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-xl font-mono focus:border-teal-500 focus:outline-hidden"
            />
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
          <p className="text-slate-500 text-sm mt-1">
            {searchTerm ? `Tidak ada order untuk kata kunci "${searchTerm}".` : "Belum ada permintaan masuk."}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-xs font-bold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  <th className="py-4 px-5 text-center w-10">No</th>
                  <th className="py-4 px-5">Informasi Pemesan</th>
                  <th className="py-4 px-5 text-center">Item</th>
                  <th className="py-4 px-5 text-center">Status</th>
                  <th className="py-4 px-5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredGroups.map((group, idx) => (
                  <tr key={group.order_id} className="hover:bg-slate-50/40 transition-colors">
                    <td className="py-4 px-5 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-full text-xs font-bold text-slate-600">
                        {idx + 1}
                      </span>
                    </td>

                    <td className="py-4 px-5">
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        {group.pemesan}
                      </p>
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 mt-0.5">
                        <MapPin className="h-3 w-3 text-teal-500 shrink-0" />
                        {group.bidang}{group.unit ? ` · ${group.unit}` : ""}
                      </span>
                      <p className="text-[10px] text-slate-400 font-mono mt-1">
                        {new Date(group.created_at).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                      </p>
                    </td>

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
                        {group.hasPending && (
                          <button
                            onClick={() => handleOpenProcess(group)}
                            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            Proses <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {group.hasBeingProcessed && !group.hasPending && (
                          <button
                            onClick={() => handleCompleteGroup(group)}
                            disabled={submitting}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Truck className="h-3.5 w-3.5" /> Selesaikan
                          </button>
                        )}
                        {group.status === "Selesai" && (
                          <button
                            onClick={() => handleDownloadPDF(group)}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-all inline-flex items-center gap-1.5 cursor-pointer"
                          >
                            <Download className="h-3.5 w-3.5" /> Bukti PDF
                          </button>
                        )}
                        {!group.hasPending && !group.hasBeingProcessed && group.status !== "Selesai" && (
                          <span className="text-xs text-slate-400 italic">—</span>
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

      {/* ── PROCESS GROUP MODAL ── */}
      {selectedGroup && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white px-6 py-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <FileCheck className="h-5 w-5 text-teal-400" />
                <div>
                  <h3 className="font-bold text-lg">Konfirmasi & Proses Pesanan</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {selectedGroup.pemesan} · {selectedGroup.bidang}{selectedGroup.unit ? ` · ${selectedGroup.unit}` : ""}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedGroup(null)} className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1">
              <div className="p-6 space-y-5">
                {/* Info pemesan */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <div className="flex items-center gap-3">
                    <User className="h-4 w-4 text-teal-500 shrink-0" />
                    <div>
                      <p className="font-bold text-slate-800 text-sm">{selectedGroup.pemesan}</p>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" /> {selectedGroup.bidang}{selectedGroup.unit ? ` · ${selectedGroup.unit}` : ""}
                      </p>
                    </div>
                    <div className="ml-auto text-right">
                      <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                        <Calendar className="h-3 w-3" />
                        {new Date(selectedGroup.created_at).toLocaleString("id-ID", {
                          day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                      </p>
                    </div>
                  </div>
                  {selectedGroup.keterangan_customer && (
                    <div className="flex items-start gap-2 mt-3 pt-3 border-t border-slate-200">
                      <MessageSquare className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-900 italic">"{selectedGroup.keterangan_customer}"</p>
                    </div>
                  )}
                </div>

                {/* Item list */}
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                    Item yang Dipesan ({selectedGroup.requests.length} item)
                  </p>
                  <div className="space-y-4">
                    {selectedGroup.requests.map(req => {
                      const itm = items.find(i => i.id === req.item_id);
                      const isPending = req.status === "Pending";
                      const form = groupForms[req.id];

                      if (!isPending) {
                        const isSelesai  = req.status === "Selesai";
                        const isDiproses = req.status === "Diproses";
                        const borderCls  = isSelesai ? "border-teal-200 bg-teal-50/40"
                          : isDiproses ? "border-blue-200 bg-blue-50/40"
                          : "border-rose-200 bg-rose-50/40";
                        const iconCls = isSelesai ? "text-teal-600" : isDiproses ? "text-blue-500" : "text-rose-500";
                        const badgeCls = isSelesai ? "bg-teal-100 text-teal-700"
                          : isDiproses ? "bg-blue-100 text-blue-700"
                          : "bg-rose-100 text-rose-700";
                        const badgeLabel = isSelesai ? "✓ Selesai" : isDiproses ? "⟳ Diproses" : "✗ Ditolak";
                        return (
                          <div key={req.id} className={`rounded-xl border p-4 ${borderCls}`}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2.5">
                                <Package className={`h-4 w-4 shrink-0 ${iconCls}`} />
                                <div>
                                  <p className="font-bold text-slate-800 text-sm">{req.itemName || "—"}</p>
                                  {itm && <p className="text-[11px] text-slate-500">{itm.kategori} · {itm.satuan}</p>}
                                  {isDiproses && req.jumlah_disetujui != null && (
                                    <p className="text-[11px] text-blue-600 font-semibold mt-0.5">
                                      Disetujui: {req.jumlah_disetujui} {itm?.satuan || "unit"}
                                    </p>
                                  )}
                                </div>
                              </div>
                              <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${badgeCls}`}>
                                {badgeLabel}
                              </span>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div key={req.id} className={`rounded-xl border p-4 ${
                          form?.isRejecting ? "border-rose-200 bg-rose-50/30" : "border-amber-200 bg-amber-50/30"
                        }`}>
                          {/* Item header */}
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-start gap-2.5">
                              <Package className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="font-bold text-slate-800 text-sm">{req.itemName || "—"}</p>
                                {itm && <p className="text-[11px] text-slate-500">{itm.kategori} · {itm.satuan}</p>}
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateForm(req.id, { isRejecting: !form?.isRejecting, rejectReason: "" })}
                              className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer shrink-0 ${
                                form?.isRejecting
                                  ? "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                                  : "bg-rose-50 text-rose-600 border-rose-200 hover:bg-rose-100"
                              }`}
                            >
                              {form?.isRejecting ? "↩ Setujui" : "✕ Tolak Item"}
                            </button>
                          </div>

                          {/* Stock info */}
                          <div className="bg-slate-800 text-white rounded-lg px-3 py-2.5 flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <Layers className="h-4 w-4 text-emerald-400 shrink-0" />
                              <div>
                                <p className="text-[10px] text-slate-400">Stok Gudang</p>
                                <p className="text-sm font-extrabold font-mono text-emerald-400">
                                  {itm?.stok ?? "?"} <span className="text-xs font-normal">{itm?.satuan}</span>
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-slate-400">Diminta</p>
                              <p className="text-sm font-bold font-mono text-rose-300">
                                {req.jumlah_diminta} <span className="text-xs font-normal">{req.itemSatuan || itm?.satuan}</span>
                              </p>
                            </div>
                            {itm && itm.stok < req.jumlah_diminta && (
                              <span className="text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30 px-1.5 py-0.5 rounded font-bold">
                                ⚠️ Stok Kurang
                              </span>
                            )}
                          </div>

                          {form?.isRejecting ? (
                            <div>
                              <label className="text-xs font-bold text-rose-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Alasan Penolakan *
                              </label>
                              <textarea
                                value={form.rejectReason}
                                onChange={e => updateForm(req.id, { rejectReason: e.target.value })}
                                placeholder="Contoh: Stok habis / dialokasikan berkala..."
                                rows={2}
                                className="w-full bg-white border border-rose-200 text-rose-900 rounded-xl px-3 py-2 text-sm focus:border-rose-500 focus:outline-hidden"
                              />
                            </div>
                          ) : (
                            <div className="space-y-3">
                              <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                                  Jumlah Disetujui *
                                </label>
                                <input
                                  type="number" min="0"
                                  max={Math.min(req.jumlah_diminta, itm?.stok ?? req.jumlah_diminta)}
                                  value={form?.jumlah_disetujui ?? 0}
                                  onChange={e => updateForm(req.id, { jumlah_disetujui: parseInt(e.target.value) || 0 })}
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2 text-sm font-mono focus:ring-3 focus:ring-teal-100"
                                />
                                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                                  <Info className="h-3 w-3 text-teal-500" /> Kurangi untuk pemenuhan parsial.
                                </p>
                              </div>
                              <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-widest mb-1.5">
                                  Catatan Admin <span className="text-slate-400 normal-case font-normal">(opsional)</span>
                                </label>
                                <input
                                  type="text"
                                  value={form?.catatan_admin ?? ""}
                                  onChange={e => updateForm(req.id, { catatan_admin: e.target.value })}
                                  placeholder="Catatan untuk pemesan..."
                                  className="w-full bg-slate-50 border border-slate-200 text-slate-800 rounded-xl px-4 py-2 text-sm"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 px-6 py-4 flex items-center justify-between border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedGroup(null)}
                className="px-4 py-2.5 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold hover:bg-slate-100 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSubmitGroup}
                disabled={submitting}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-400 text-white rounded-xl text-xs font-extrabold cursor-pointer inline-flex items-center gap-2"
              >
                {submitting
                  ? "Menyimpan..."
                  : `Setujui & Proses ${selectedGroup.requests.filter(r => r.status === "Pending").length} Item →`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
