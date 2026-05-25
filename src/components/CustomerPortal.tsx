import { useState, useEffect, useMemo } from "react";
import kejaksaanLogo from "../assets/images/kejaksaan_logo_1779373081640.png";
import { Customer, RequestOrder } from "../types";
import { getCustomerOrders } from "../api";
import { generateOrderPDF } from "../lib/generatePDF";
import {
  ShoppingBag, Clock, CheckCircle, XCircle, Download,
  RefreshCw, Package, LogOut, Plus, ChevronDown, ChevronUp,
  FileText, AlertTriangle
} from "lucide-react";

interface CustomerPortalProps {
  customer: Customer;
  officeName: string;
  onLogout: () => void;
  onBrowseCatalog: () => void;
}

type OrderStatus = "Pending" | "Diproses" | "Selesai" | "Ditolak";

interface OrderGroup {
  order_id: string;
  items: RequestOrder[];
  created_at: string;
  overallStatus: OrderStatus;
}

function computeOverallStatus(items: RequestOrder[]): OrderStatus {
  if (items.every(r => r.status === "Selesai")) return "Selesai";
  if (items.every(r => r.status === "Ditolak")) return "Ditolak";
  if (items.some(r => r.status === "Diproses")) return "Diproses";
  if (items.some(r => r.status === "Pending"))  return "Pending";
  return "Diproses";
}

const STATUS_META: Record<OrderStatus, { label: string; color: string; icon: any; step: number }> = {
  Pending:  { label: "Menunggu Konfirmasi", color: "amber",  icon: Clock,        step: 1 },
  Diproses: { label: "Sedang Diproses",     color: "blue",   icon: Package,      step: 2 },
  Selesai:  { label: "Pesanan Selesai",     color: "teal",   icon: CheckCircle,  step: 3 },
  Ditolak:  { label: "Ditolak",             color: "rose",   icon: XCircle,      step: 0 },
};

const BADGE_CLASS: Record<OrderStatus, string> = {
  Pending:  "bg-amber-50  text-amber-700  border-amber-200",
  Diproses: "bg-blue-50   text-blue-700   border-blue-200",
  Selesai:  "bg-teal-50   text-teal-700   border-teal-200",
  Ditolak:  "bg-rose-50   text-rose-700   border-rose-200",
};

function StatusBadge({ status }: { status: OrderStatus }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-bold ${BADGE_CLASS[status]}`}>
      <Icon className="h-3 w-3" /> {meta.label}
    </span>
  );
}

function ProgressBar({ status }: { status: OrderStatus }) {
  if (status === "Ditolak") {
    return (
      <div className="flex items-center gap-2 mt-3">
        <div className="flex-1 h-1.5 bg-rose-100 rounded-full overflow-hidden">
          <div className="h-full w-full bg-rose-400 rounded-full" />
        </div>
        <span className="text-[10px] font-bold text-rose-500 shrink-0">Ditolak</span>
      </div>
    );
  }
  const step = STATUS_META[status].step;
  const steps = ["Pesanan Dikirim", "Diproses Admin", "Selesai"];
  return (
    <div className="mt-3">
      <div className="flex items-center justify-between mb-1">
        {steps.map((s, i) => (
          <span key={s} className={`text-[9px] font-bold ${i < step ? "text-teal-600" : i === step - 1 ? "text-teal-700" : "text-slate-300"}`}>
            {s}
          </span>
        ))}
      </div>
      <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-teal-500 rounded-full transition-all duration-500"
          style={{ width: `${((step) / 3) * 100}%` }}
        />
      </div>
    </div>
  );
}

export default function CustomerPortal({ customer, officeName, onLogout, onBrowseCatalog }: CustomerPortalProps) {
  const [orders, setOrders]         = useState<RequestOrder[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadOrders = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await getCustomerOrders(customer.id);
      setOrders(data);
    } catch (err: any) {
      setError(err.message || "Gagal memuat pesanan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadOrders(); }, [customer.id]);

  const orderGroups = useMemo<OrderGroup[]>(() => {
    const map: Record<string, RequestOrder[]> = {};
    orders.forEach(r => {
      const key = r.order_id || r.id;
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    return Object.entries(map)
      .map(([oid, items]) => ({
        order_id: oid,
        items: items.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
        created_at: items[0].created_at,
        overallStatus: computeOverallStatus(items),
      }))
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [orders]);

  const handleDownloadPDF = (group: OrderGroup) => {
    const firstItem = group.items[0];
    generateOrderPDF({
      items: group.items.map(r => ({
        nama_barang:     r.itemName    || r.item_id,
        satuan:          r.itemSatuan  || "unit",
        jumlah_diminta:  r.jumlah_diminta,
        jumlah_disetujui: r.jumlah_disetujui,
      })),
      nama_pemesan:      firstItem.nama_pemesan,
      bidang:            firstItem.bidang,
      keterangan_customer: firstItem.keterangan_customer,
      catatan_admin:     group.items.map(r => r.catatan_admin).filter(Boolean).join("; ") || undefined,
      officeName,
      orderId:           group.order_id,
      status:            group.overallStatus,
      createdAt:         group.created_at,
    });
  };

  const stats = useMemo(() => ({
    total:    orderGroups.length,
    pending:  orderGroups.filter(g => g.overallStatus === "Pending").length,
    diproses: orderGroups.filter(g => g.overallStatus === "Diproses").length,
    selesai:  orderGroups.filter(g => g.overallStatus === "Selesai").length,
  }), [orderGroups]);

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <header className="bg-teal-950 text-white border-b border-teal-900 shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-5 sm:px-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-white/10 p-1.5 rounded-xl border border-white/20">
              <img src={kejaksaanLogo} className="h-7 w-7 object-contain" alt="Logo" />
            </div>
            <div>
              <h1 className="font-extrabold text-base leading-tight">{officeName}</h1>
              <p className="text-xs text-teal-300 mt-0.5">Portal Pesanan ATK Anda</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2 border border-white/10">
              <div className="h-6 w-6 rounded-full bg-teal-500 flex items-center justify-center text-xs font-bold">
                {customer.nama_lengkap.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-xs font-bold leading-none">{customer.nama_lengkap}</p>
                <p className="text-[10px] text-teal-300 mt-0.5">{customer.bidang}</p>
              </div>
            </div>
            <button
              onClick={onBrowseCatalog}
              className="flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-500 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Pesan ATK
            </button>
            <button
              onClick={onLogout}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6 sm:px-6 space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Total Pesanan", val: stats.total,    color: "slate" },
            { label: "Menunggu",      val: stats.pending,  color: "amber" },
            { label: "Diproses",      val: stats.diproses, color: "blue"  },
            { label: "Selesai",       val: stats.selesai,  color: "teal"  },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-slate-200 p-4 text-center">
              <p className="text-2xl font-extrabold text-slate-800">{s.val}</p>
              <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Order List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="font-extrabold text-slate-800">Riwayat Pesanan Saya</h2>
              <p className="text-xs text-slate-500 mt-0.5">{orderGroups.length} pesanan ditemukan</p>
            </div>
            <button
              onClick={loadOrders}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer text-slate-500"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>
          </div>

          {loading ? (
            <div className="py-16 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-r-transparent" />
              <p className="text-sm text-slate-500 mt-4">Memuat pesanan...</p>
            </div>
          ) : error ? (
            <div className="py-12 text-center px-6">
              <AlertTriangle className="h-10 w-10 text-rose-300 mx-auto mb-3" />
              <p className="font-bold text-slate-700">Gagal memuat pesanan</p>
              <p className="text-xs text-slate-500 mt-1">{error}</p>
              <button onClick={loadOrders} className="mt-4 px-4 py-2 bg-teal-600 text-white text-xs font-bold rounded-xl cursor-pointer">
                Coba Lagi
              </button>
            </div>
          ) : orderGroups.length === 0 ? (
            <div className="py-16 text-center px-6">
              <ShoppingBag className="h-12 w-12 text-slate-200 mx-auto mb-3" />
              <h3 className="font-bold text-slate-700">Belum Ada Pesanan</h3>
              <p className="text-sm text-slate-500 mt-1">Mulai pesan ATK dari katalog kami.</p>
              <button
                onClick={onBrowseCatalog}
                className="mt-4 px-5 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl cursor-pointer inline-flex items-center gap-2"
              >
                <Plus className="h-4 w-4" /> Pesan Sekarang
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orderGroups.map((group, idx) => {
                const isExpanded = expandedId === group.order_id;
                const firstItem = group.items[0];
                return (
                  <div key={group.order_id} className="hover:bg-slate-50/50 transition-colors">
                    {/* Group header row */}
                    <div className="px-6 py-4 flex items-start gap-4">
                      <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 rounded-full text-xs font-bold text-slate-600 shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={group.overallStatus} />
                          <span className="text-[10px] font-mono text-slate-400">{group.order_id}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1.5">
                          {new Date(group.created_at).toLocaleDateString("id-ID", {
                            day: "2-digit", month: "long", year: "numeric",
                            hour: "2-digit", minute: "2-digit"
                          })} WIB
                        </p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-xs text-slate-600 font-semibold">
                            {group.items.length} item
                          </span>
                          {firstItem.keterangan_customer && (
                            <span className="text-xs text-slate-400 italic truncate max-w-xs">
                              · "{firstItem.keterangan_customer}"
                            </span>
                          )}
                        </div>
                        <ProgressBar status={group.overallStatus} />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleDownloadPDF(group)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-teal-50 hover:text-teal-700 text-slate-600 text-xs font-bold rounded-xl transition-colors cursor-pointer border border-slate-200"
                          title="Unduh bukti pesanan PDF"
                        >
                          <Download className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">PDF</span>
                        </button>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : group.order_id)}
                          className="p-2 hover:bg-slate-100 rounded-xl text-slate-500 cursor-pointer"
                        >
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="px-6 pb-5 pt-1">
                        <div className="bg-slate-50 rounded-xl border border-slate-100 overflow-hidden">
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="bg-slate-100 text-xs font-bold text-slate-500 uppercase">
                                <th className="py-2.5 px-4 text-left">Barang</th>
                                <th className="py-2.5 px-4 text-center">Satuan</th>
                                <th className="py-2.5 px-4 text-center">Diminta</th>
                                <th className="py-2.5 px-4 text-center">Disetujui</th>
                                <th className="py-2.5 px-4 text-center">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {group.items.map(item => (
                                <tr key={item.id} className="hover:bg-white transition-colors">
                                  <td className="py-3 px-4 font-medium text-slate-800">{item.itemName || "—"}</td>
                                  <td className="py-3 px-4 text-center text-slate-500 text-xs">{item.itemSatuan || "—"}</td>
                                  <td className="py-3 px-4 text-center font-mono font-bold text-slate-700">{item.jumlah_diminta}</td>
                                  <td className="py-3 px-4 text-center font-mono font-bold">
                                    {item.jumlah_disetujui != null ? (
                                      <span className={item.jumlah_disetujui < item.jumlah_diminta ? "text-rose-600" : "text-teal-600"}>
                                        {item.jumlah_disetujui}
                                      </span>
                                    ) : (
                                      <span className="text-slate-300">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 px-4 text-center">
                                    <StatusBadge status={item.status} />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Admin notes */}
                          {group.items.some(r => r.catatan_admin) && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-amber-50">
                              <p className="text-xs font-bold text-amber-700 mb-1 flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Catatan Admin:
                              </p>
                              {group.items.filter(r => r.catatan_admin).map(r => (
                                <p key={r.id} className="text-xs text-amber-800 italic">
                                  {r.itemName}: "{r.catatan_admin}"
                                </p>
                              ))}
                            </div>
                          )}
                        </div>

                        <div className="mt-3 flex justify-end">
                          <button
                            onClick={() => handleDownloadPDF(group)}
                            className="flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl cursor-pointer transition-colors"
                          >
                            <Download className="h-3.5 w-3.5" /> Unduh Bukti Pesanan PDF
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
