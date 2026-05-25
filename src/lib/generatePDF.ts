import { jsPDF } from "jspdf";

export interface PDFOrderItem {
  nama_barang: string;
  satuan: string;
  jumlah_diminta: number;
  jumlah_disetujui?: number | null;
}

export interface PDFOrderData {
  items: PDFOrderItem[];
  nama_pemesan: string;
  bidang: string;
  keterangan_customer?: string;
  catatan_admin?: string;
  officeName: string;
  orderId: string;
  status: "Pending" | "Diproses" | "Selesai" | "Ditolak";
  createdAt?: string;
}

const STATUS_CONFIG = {
  Pending:  { bg: [254, 243, 199] as [number,number,number], text: [146, 64, 14]  as [number,number,number], label: "Menunggu Konfirmasi" },
  Diproses: { bg: [219, 234, 254] as [number,number,number], text: [29,  78,  216] as [number,number,number], label: "Sedang Diproses" },
  Selesai:  { bg: [209, 250, 229] as [number,number,number], text: [4,   120, 87]  as [number,number,number], label: "Pesanan Selesai" },
  Ditolak:  { bg: [254, 226, 226] as [number,number,number], text: [185, 28,  28]  as [number,number,number], label: "Ditolak" },
};

export function generateOrderPDF(order: PDFOrderData) {
  const doc = new jsPDF("p", "pt", "a4");
  const pw = 595;
  const ml = 40;
  const mr = 40;
  const cw = pw - ml - mr;

  const teal:  [number,number,number] = [13,  78,  74];
  const white: [number,number,number] = [255, 255, 255];
  const dark:  [number,number,number] = [15,  23,  42];
  const mid:   [number,number,number] = [71,  85,  105];
  const light: [number,number,number] = [226, 232, 240];
  const tealLight: [number,number,number] = [204, 235, 234];

  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────
  doc.setFillColor(...teal);
  doc.rect(0, 0, pw, 72, "F");

  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text((order.officeName || "Portal ATK Kantor").toUpperCase(), ml, 26);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Formulir Pesanan ATK Digital", ml, 43);

  // No. Pesanan (top right)
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text("No. Pesanan", pw - mr, 22, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text(order.orderId.toUpperCase(), pw - mr, 36, { align: "right" });

  y = 96;

  // ── TITLE + STATUS BADGE (same row) ─────────────────────────
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BUKTI PERMINTAAN ATK", ml, y);

  // Status badge (right-aligned on title row)
  const badgeW = 130;
  const badgeX = pw - mr - badgeW;
  doc.setFillColor(...statusCfg.bg);
  doc.roundedRect(badgeX, y - 14, badgeW, 18, 4, 4, "F");
  doc.setTextColor(...statusCfg.text);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.text("● " + statusCfg.label, badgeX + badgeW / 2, y - 2, { align: "center" });

  y += 14;

  // Timestamp
  doc.setTextColor(...mid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text(
    `Diterima: ${createdDate.toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}, ` +
    `${createdDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })} WIB`,
    ml, y
  );
  y += 16;

  // Divider
  doc.setDrawColor(...light);
  doc.line(ml, y, pw - mr, y);
  y += 18;

  // ── INFORMASI PEMESAN ────────────────────────────────────────
  doc.setFillColor(...tealLight);
  doc.rect(ml, y, cw, 16, "F");
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("INFORMASI PEMESAN", ml + 6, y + 11);
  y += 20;

  const infoRows: [string, string][] = [
    ["Nama Pemesan",     order.nama_pemesan],
    ["Bidang / Departemen", order.bidang || "Umum"],
    ["Tanggal Permintaan", createdDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ["Keterangan",       order.keterangan_customer || "-"],
  ];
  const lw = 145;
  infoRows.forEach(([label, val]) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...mid);
    doc.text(label, ml + 6, y);
    doc.text(":", ml + lw, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(val, cw - lw - 14);
    doc.text(lines, ml + lw + 10, y);
    y += Math.max(16, lines.length * 13);
  });
  y += 10;

  // ── BARANG YANG DIPESAN ──────────────────────────────────────
  doc.setFillColor(...tealLight);
  doc.rect(ml, y, cw, 16, "F");
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("BARANG YANG DIPESAN", ml + 6, y + 11);
  y += 20;

  const showApproved = order.status !== "Pending";
  const col0x = ml + 6;
  const col1x = ml + 32;
  const col2x = ml + cw - (showApproved ? 160 : 80);
  const col3x = ml + cw - (showApproved ? 90 : 10);
  const col4x = ml + cw - 5;

  // Table header
  doc.setFillColor(...teal);
  doc.rect(ml, y, cw, 22, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("No", col0x, y + 15);
  doc.text("Nama Barang", col1x, y + 15);
  doc.text("Satuan", col2x, y + 15);
  doc.text("Jml Diminta", col3x, y + 15, { align: "right" });
  if (showApproved) doc.text("Jml Disetujui", col4x, y + 15, { align: "right" });
  y += 22;

  order.items.forEach((item, idx) => {
    const rowBg: [number,number,number] = idx % 2 === 0 ? [248, 250, 252] : [255, 255, 255];
    doc.setFillColor(...rowBg);
    doc.rect(ml, y, cw, 22, "F");
    doc.setTextColor(...dark);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.text(String(idx + 1), col0x, y + 15);
    const name = item.nama_barang.length > 40 ? item.nama_barang.slice(0, 37) + "..." : item.nama_barang;
    doc.text(name, col1x, y + 15);
    doc.text(item.satuan, col2x, y + 15);
    doc.text(String(item.jumlah_diminta), col3x, y + 15, { align: "right" });
    if (showApproved) {
      const approved = item.jumlah_disetujui != null ? String(item.jumlah_disetujui) : "-";
      doc.setFont("helvetica", "bold");
      if (item.jumlah_disetujui != null && item.jumlah_disetujui < item.jumlah_diminta) {
        doc.setTextColor(185, 28, 28);
      } else {
        doc.setTextColor(4, 120, 87);
      }
      doc.text(approved, col4x, y + 15, { align: "right" });
      doc.setTextColor(...dark);
    }
    y += 22;
  });

  // Table border
  doc.setDrawColor(...light);
  doc.rect(ml, y - order.items.length * 22 - 22, cw, order.items.length * 22 + 22, "S");
  y += 12;

  // ── CATATAN BOX ──────────────────────────────────────────────
  if (order.catatan_admin) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    doc.roundedRect(ml, y, cw, 30, 3, 3, "FD");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Catatan Admin:", ml + 8, y + 10);
    doc.setFont("helvetica", "normal");
    const catatanLines = doc.splitTextToSize(order.catatan_admin, cw - 16);
    doc.text(catatanLines, ml + 8, y + 21);
    y += 30 + Math.max(0, (catatanLines.length - 1) * 10) + 10;
  } else if (order.status === "Pending") {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(167, 243, 208);
    doc.roundedRect(ml, y, cw, 28, 3, 3, "FD");
    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    const noteLines = doc.splitTextToSize(
      "Catatan: Jumlah yang disetujui akan diisi oleh Admin ATK setelah memverifikasi stok yang tersedia. Anda akan menerima notifikasi setelah pesanan dikonfirmasi.",
      cw - 16
    );
    doc.text(noteLines, ml + 8, y + 12);
    y += 36 + Math.max(0, (noteLines.length - 2) * 10);
  }
  y += 16;

  // ── SIGNATURE AREA ───────────────────────────────────────────
  const sigColW = cw / 3;
  const sigLabels = ["Pemesan,", "Mengetahui,", "Disetujui Admin ATK,"];
  const sigSubs   = [order.nama_pemesan, "( ________________ )\nKepala Bidang", "( ________________ )\nAdmin ATK"];

  doc.setTextColor(...mid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);

  sigLabels.forEach((label, i) => {
    const x = ml + i * sigColW;
    doc.text(label, x + sigColW / 2, y, { align: "center" });
  });
  y += 50;

  sigSubs.forEach((sub, i) => {
    const x = ml + i * sigColW;
    const lines = sub.split("\n");
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.text(lines[0], x + sigColW / 2, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...mid);
      doc.text(order.bidang || "Umum", x + sigColW / 2, y + 12, { align: "center" });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      lines.forEach((line, li) => {
        doc.text(line, x + sigColW / 2, y + li * 12, { align: "center" });
      });
    }
  });

  // ── FOOTER ───────────────────────────────────────────────────
  const footerY = 800;
  doc.setDrawColor(...light);
  doc.line(ml, footerY, pw - mr, footerY);
  doc.setTextColor(...mid);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7);
  doc.text(
    `Dokumen ini diterbitkan secara otomatis oleh Sistem ATK Digital — ${order.officeName}.`,
    ml, footerY + 13
  );
  doc.text(
    `${createdDate.toLocaleString("id-ID")}  |  ${order.orderId}  |  Harap simpan sebagai bukti permintaan Anda`,
    ml, footerY + 24
  );

  doc.save(`bukti_ATK_${order.orderId}_${order.status}.pdf`);
}
