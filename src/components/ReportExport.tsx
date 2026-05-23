import React, { useState, useEffect } from "react";
import { Item, RequestOrder, Setting } from "../types";
import { getItems, getRequests, getSettings } from "../api";
import {
  FileText,
  Download,
  Calendar,
  AlertTriangle,
  FileSpreadsheet,
  Grid,
  TrendingDown,
  Info,
  ChevronDown
} from "lucide-react";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";

export default function ReportExport() {
  const [items, setItems] = useState<Item[]>([]);
  const [requests, setRequests] = useState<RequestOrder[]>([]);
  const [settings, setSettings] = useState<Setting>({ nomor_whatsapp_admin: "", nama_kantor: "" });
  const [loading, setLoading] = useState(true);

  // Date filters for Request History Report
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Chosen Report Type
  // 1: Stok ATK saat ini
  // 2: Riwayat permintaan + date filter
  // 3: Rekap permintaan per bidang
  // 4: Barang stok menipis
  // 5: Selisih permintaan (analisis yang sering tidak terpenuhi penuh)
  const [selectedReportType, setSelectedReportType] = useState<1 | 2 | 3 | 4 | 5>(1);

  useEffect(() => {
    const loadReportData = async () => {
      try {
        setLoading(true);
        const [fetchedItems, fetchedReqs, fetchedSettings] = await Promise.all([
          getItems(),
          getRequests(),
          getSettings()
        ]);
        setItems(fetchedItems);
        setRequests(fetchedReqs);
        setSettings(fetchedSettings);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadReportData();
  }, []);

  // 1. Data Processor: Stok ATK Saat Ini
  const getStokAtkData = () => {
    return items.map((item, idx) => ({
      No: idx + 1,
      "Nama Barang": item.nama_barang,
      Kategori: item.kategori,
      Satuan: item.satuan,
      "Stok Terkini": item.stok,
      "Stok Minimum": item.stok_minimum,
      Status: item.stok === 0 ? "Habis" : item.stok <= item.stok_minimum ? "Menipis" : "Tersedia"
    }));
  };

  // 2. Data Processor: Riwayat Permintaan with date check
  const getRiwayatData = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const filtered = requests.filter(req => {
      const dt = new Date(req.created_at);
      return dt >= start && dt <= end;
    });

    return filtered.map((req, idx) => {
      const diminta = req.jumlah_diminta;
      const disetujui = req.jumlah_disetujui ?? 0;
      const selisih = req.status === "Ditolak" ? diminta : diminta - disetujui;

      return {
        No: idx + 1,
        Tanggal: new Date(req.created_at).toLocaleDateString("id-ID"),
        Pemesan: req.nama_pemesan,
        Bidang: req.bidang,
        "Nama ATK": req.itemName || "ATK",
        "Jumlah Diminta": diminta,
        "Jumlah Disetujui": req.status === "Pending" ? "Pending" : disetujui,
        Selisih: req.status === "Pending" ? "Pending" : selisih,
        Status: req.status,
        "Catatan Admin": req.catatan_admin || "-"
      };
    });
  };

  // 3. Data Processor: Rekap per Bidang
  const getRekapBidangData = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const bidangStats: {
      [bidang: string]: { totalRequests: number; totalDiminta: number; totalDisetujui: number }
    } = {};

    requests.filter(req => {
      const dt = new Date(req.created_at);
      return dt >= start && dt <= end;
    }).forEach(req => {
      const bName = req.bidang || "Lain-Lain";
      if (!bidangStats[bName]) {
        bidangStats[bName] = { totalRequests: 0, totalDiminta: 0, totalDisetujui: 0 };
      }
      bidangStats[bName].totalRequests += 1;
      bidangStats[bName].totalDiminta += req.jumlah_diminta;
      if (req.status === "Selesai" && req.jumlah_disetujui !== null) {
        bidangStats[bName].totalDisetujui += req.jumlah_disetujui;
      }
    });

    return Object.entries(bidangStats).map(([bidangName, meta], idx) => {
      const rate = meta.totalDiminta > 0 ? Math.round((meta.totalDisetujui / meta.totalDiminta) * 100) : 0;
      return {
        No: idx + 1,
        "Bidang / Departemen": bidangName,
        "Total Permintaan": meta.totalRequests,
        "Total Item Diminta": meta.totalDiminta,
        "Total Item Disetujui": meta.totalDisetujui,
        "Tingkat Pemenuhan (%)": `${rate}%`
      };
    });
  };

  // 4. Data Processor: Barang Stok Menipis
  const getStokMenipisData = () => {
    return items
      .filter(item => item.stok <= item.stok_minimum)
      .map((item, idx) => ({
        No: idx + 1,
        "Nama Barang": item.nama_barang,
        Kategori: item.kategori,
        Satuan: item.satuan,
        "Stok Saat Ini": item.stok,
        "Batas Minimum": item.stok_minimum,
        "Status Stok": item.stok === 0 ? "KOSONG" : "MENIPIS"
      }));
  };

  // 5. Data Processor: Selisih Permintaan (Analisis barang sering kurang)
  const getSelisihPermintaanData = () => {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    const itemAnalysis: {
      [id: string]: { name: string; category: string; occurrences: number; totalDifference: number }
    } = {};

    requests.filter(req => {
      const dt = new Date(req.created_at);
      return dt >= start && dt <= end;
    }).forEach(req => {
      if (req.status === "Selesai" && req.jumlah_disetujui !== null) {
        const diff = req.jumlah_diminta - req.jumlah_disetujui;
        if (diff > 0) {
          if (!itemAnalysis[req.item_id]) {
            const matchedItem = items.find(i => i.id === req.item_id);
            itemAnalysis[req.item_id] = {
              name: matchedItem ? matchedItem.nama_barang : req.itemName || "ATK",
              category: matchedItem ? matchedItem.kategori : "Umum",
              occurrences: 0,
              totalDifference: 0
            };
          }
          itemAnalysis[req.item_id].occurrences += 1;
          itemAnalysis[req.item_id].totalDifference += diff;
        }
      }
    });

    return Object.values(itemAnalysis)
      .sort((a, b) => b.totalDifference - a.totalDifference)
      .map((entry, idx) => ({
        No: idx + 1,
        "Nama Barang": entry.name,
        Kategori: entry.category,
        "Kaliproses Selisih": entry.occurrences,
        "Total Selisih (Unit Kurang)": entry.totalDifference
      }));
  };

  // Helper title for report names
  const getReportTitle = () => {
    const range = `(${startDate} s/d ${endDate})`;
    switch (selectedReportType) {
      case 1:
        return "Laporan Stok ATK Saat Ini";
      case 2:
        return `Laporan Riwayat Permintaan ${range}`;
      case 3:
        return `Laporan Rekap Kuantitas per Bidang ${range}`;
      case 4:
        return "Laporan Barang Kritis Stok Menipis";
      case 5:
        return `Laporan Analisis Selisih Pemenuhan Barang ${range}`;
    }
  };

  const getReportPayload = () => {
    switch (selectedReportType) {
      case 1:
        return getStokAtkData();
      case 2:
        return getRiwayatData();
      case 3:
        return getRekapBidangData();
      case 4:
        return getStokMenipisData();
      case 5:
        return getSelisihPermintaanData();
    }
  };

  // EXPORT TO EXCEL (.XLSX) WITH SHEETJS
  const handleExportExcel = () => {
    const payload = getReportPayload();
    if (payload.length === 0) {
      alert("Tidak ada data untuk diekspor!");
      return;
    }

    const title = getReportTitle();
    const worksheet = XLSX.utils.json_to_sheet(payload);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Laporan");

    // File name
    const fileName = `${title.toLowerCase().replace(/ /g, "_")}_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // EXPORT TO PDF WITH JSPDF
  const handleExportPDF = () => {
    const payload = getReportPayload();
    if (payload.length === 0) {
      alert("Tidak ada data untuk dicetak!");
      return;
    }

    const doc = new jsPDF("p", "pt", "a4");
    const margin = 40;
    let y = 50;

    // Headings
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(settings.nama_kantor.toUpperCase(), margin, y);
    y += 20;

    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text(getReportTitle(), margin, y);
    y += 15;

    doc.setFontSize(8);
    doc.text(`Waktu Cetak: ${new Date().toLocaleString("id-ID")}`, margin, y);
    y += 20;

    // Draw Divider Line
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, 595 - margin, y);
    y += 25;

    // Print simple aligned table format
    const columns = Object.keys(payload[0]).filter(k => k !== "No");

    // Draw Column Headers
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("No", margin, y);

    let x = margin + 30;
    const colWidth = (595 - margin * 2 - 30) / columns.length;

    columns.forEach(col => {
      doc.text(col, x, y);
      x += colWidth;
    });

    y += 15;
    doc.line(margin, y, 595 - margin, y);
    y += 15;

    // Draw Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);

    payload.forEach((row: any, rIdx) => {
      // check page limits
      if (y > 780) {
        doc.addPage();
        y = 50;
        doc.setFont("helvetica", "bold");
        doc.text("No", margin, y);
        let curX = margin + 30;
        columns.forEach(col => {
          doc.text(col, curX, y);
          curX += colWidth;
        });
        y += 15;
        doc.line(margin, y, 595 - margin, y);
        y += 15;
        doc.setFont("helvetica", "normal");
      }

      doc.text((rIdx + 1).toString(), margin, y);

      let curX = margin + 30;
      columns.forEach(col => {
        let val = String(row[col]);
        // truncate if string size is too long for columns mapping
        if (val.length > 22) {
          val = val.substring(0, 19) + "...";
        }
        doc.text(val, curX, y);
        curX += colWidth;
      });

      y += 18;
    });

    const docName = `${getReportTitle().toLowerCase().replace(/ /g, "_")}.pdf`;
    doc.save(docName);
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-teal-600 border-r-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-500 mt-4">Menjadwalkan pelaporan ATK...</p>
      </div>
    );
  }

  const previewData = getReportPayload();

  return (
    <div id="report_export_panel" className="space-y-6 font-sans">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-800">Export Laporan & Analisis Kantor</h2>
        <p className="text-sm text-slate-500">Cetak laporan pembukuan ATK dalam format Excel Spreadsheet (.xlsx) dan dokumen Portable Document Format (.pdf)</p>
      </div>

      {/* Choose Report Grid buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { key: 1, label: "Laporan Stok ATK", desc: "Kondisi fisik riil gudang saat ini" },
          { key: 2, label: "Riwayat Transaksi", desc: "Filter berkas tanggal pemesan" },
          { key: 3, label: "Kuantitas Bidang", desc: "Rekap total disetujui per bidang" },
          { key: 4, label: "Barang Stok Kritis", desc: "Item minim butuh restock segera" },
          { key: 5, label: "Selisih Pemenuhan", desc: "Analisis parsial yang sering kurang" }
        ].map((btn) => (
          <button
            key={btn.key}
            onClick={() => setSelectedReportType(btn.key as any)}
            className={`p-4 text-left rounded-2xl border transition-all cursor-pointer ${
              selectedReportType === btn.key
                ? "bg-slate-950 text-white border-slate-950 shadow-md"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300"
            }`}
          >
            <h4 className="font-extrabold text-xs uppercase tracking-wide">{btn.label}</h4>
            <p className={`text-[11px] mt-1 ${selectedReportType === btn.key ? "text-slate-300" : "text-slate-400"}`}>
              {btn.desc}
            </p>
          </button>
        ))}
      </div>

      {/* Date Range Filter — always visible for all report types */}
      <div className="bg-slate-100 p-5 rounded-2xl border border-slate-200">
        <div className="flex flex-col sm:flex-row items-center gap-4 flex-wrap">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5 shrink-0">
            <Calendar className="h-4.5 w-4.5 text-teal-600" /> Filter Rentang Tanggal:
          </span>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg w-full sm:w-auto font-mono"
            />
            <span className="text-slate-400 text-xs font-bold">s/d</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-white border border-slate-200 text-slate-700 text-xs py-2 px-3 rounded-lg w-full sm:w-auto font-mono"
            />
          </div>
          {(selectedReportType === 1 || selectedReportType === 4) && (
            <span className="text-[11px] text-slate-400 italic shrink-0">
              * Laporan stok menampilkan kondisi barang saat ini
            </span>
          )}
        </div>
      </div>

      {/* Table Preview and Export buttons */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Header toolbar */}
        <div className="p-5 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-50/50">
          <div>
            <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded-md font-bold uppercase uppercase tracking-wider font-mono">
              Pratinjau Dokumen
            </span>
            <h3 className="font-extrabold text-slate-800 text-base mt-1">{getReportTitle()}</h3>
          </div>
          <div className="flex gap-2 w-full sm:w-auto shrink-0">
            <button
              onClick={handleExportExcel}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
            </button>
            <button
              onClick={handleExportPDF}
              className="flex-1 sm:flex-initial px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <FileText className="h-4 w-4" /> Cetak PDF (.pdf)
            </button>
          </div>
        </div>

        {/* Dynamic Table Preview */}
        {previewData.length === 0 ? (
          <div className="p-16 text-center text-slate-400 italic">
            Tidak ada kecocokan data transaksi atau ATK untuk direkap pada laporan ini.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#fcfdfe] text-[10px] font-bold text-slate-400 uppercase border-b border-slate-100">
                <tr>
                  {Object.keys(previewData[0]).map((header) => (
                    <th key={header} className="py-3 px-5 font-bold">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 leading-snug">
                {previewData.slice(0, 8).map((row: any, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/30">
                    {Object.values(row).map((val: any, vIdx) => (
                      <td key={vIdx} className="py-3 px-5 font-mono text-xs">
                        {String(val)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {previewData.length > 8 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                <p className="text-[11px] text-slate-400 italic">
                  Menampilkan 8 baris teratas pratinjau. Unduh Excel/PDF untuk laporan selengkapnya ({previewData.length} total baris).
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
