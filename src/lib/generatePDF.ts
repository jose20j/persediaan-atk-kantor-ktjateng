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
  logoUrl?: string;
}

const STATUS_CONFIG = {
  Pending:  { bg: [254, 243, 199] as [number,number,number], text: [146, 64, 14]  as [number,number,number], label: "Menunggu Konfirmasi" },
  Diproses: { bg: [219, 234, 254] as [number,number,number], text: [29,  78,  216] as [number,number,number], label: "Sedang Diproses" },
  Selesai:  { bg: [209, 250, 229] as [number,number,number], text: [4,   120, 87]  as [number,number,number], label: "Pesanan Selesai" },
  Ditolak:  { bg: [254, 226, 226] as [number,number,number], text: [185, 28,  28]  as [number,number,number], label: "Ditolak" },
};

async function fetchLogoDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export async function generateOrderPDF(order: PDFOrderData) {
  let logoDataUrl: string | null = null;
  if (order.logoUrl) {
    logoDataUrl = await fetchLogoDataUrl(order.logoUrl);
  }

  const doc = new jsPDF("p", "pt", "a4");
  const pw = 595;
  const ml = 40;
  const mr = 40;
  const cw = pw - ml - mr;

  const teal:      [number,number,number] = [13,  78,  74];
  const white:     [number,number,number] = [255, 255, 255];
  const dark:      [number,number,number] = [15,  23,  42];
  const mid:       [number,number,number] = [71,  85,  105];
  const light:     [number,number,number] = [226, 232, 240];
  const tealLight: [number,number,number] = [204, 235, 234];

  const createdDate = order.createdAt ? new Date(order.createdAt) : new Date();
  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.Pending;

  let y = 0;

  // ── HEADER ──────────────────────────────────────────────────
  const headerH = 76;
  doc.setFillColor(...teal);
  doc.rect(0, 0, pw, headerH, "F");

  // Logo on LEFT side of header
  const logoSize = 52;
  const logoY = (headerH - logoSize) / 2;
  let textStartX = ml;
  if (logoDataUrl) {
    const logoX = ml;
    doc.setFillColor(255, 255, 255);
    doc.circle(logoX + logoSize / 2, logoY + logoSize / 2, logoSize / 2 + 2, "F");
    doc.addImage(logoDataUrl, "PNG", logoX, logoY, logoSize, logoSize);
    textStartX = ml + logoSize + 10;
  }

  // Office name and subtitle (no "No. Pesanan" on right)
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const officeLine = doc.splitTextToSize(
    (order.officeName || "Portal ATK Kantor").toUpperCase(),
    pw - mr - textStartX
  );
  doc.text(officeLine, textStartX, 26);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.text("Formulir Pesanan ATK Digital", textStartX, officeLine.length > 1 ? 52 : 44);

  y = headerH + 20;

  // ── TITLE ───────────────────────────────────────────────────
  doc.setTextColor(...dark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("BUKTI PERMINTAAN ATK", ml, y);

  // ── STATUS BADGE (right-aligned, auto-sized to text) ────────
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  const badgeLabel = statusCfg.label;
  const textW  = doc.getTextWidth(badgeLabel);
  const dotR   = 2.5;
  const padH   = 10;
  const badgeH = 18;
  // padH (left) + dot diameter + gap + text + padH (right)
  const badgeW = padH + dotR * 2 + 6 + textW + padH;
  const badgeX = pw - mr - badgeW;
  const badgeTop = y - badgeH + 2;

  doc.setFillColor(...statusCfg.bg);
  doc.roundedRect(badgeX, badgeTop, badgeW, badgeH, 4, 4, "F");

  // Filled circle dot — avoids the %İ Unicode rendering bug
  doc.setFillColor(...statusCfg.text);
  doc.circle(badgeX + padH + dotR, badgeTop + badgeH / 2, dotR, "F");

  doc.setTextColor(...statusCfg.text);
  doc.text(badgeLabel, badgeX + padH + dotR * 2 + 6, badgeTop + badgeH / 2 + 3);

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
  y += 16;

  // ── INFORMASI PEMESAN ────────────────────────────────────────
  const sectionH = 20;
  doc.setFillColor(...tealLight);
  doc.rect(ml, y, cw, sectionH, "F");
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("INFORMASI PEMESAN", ml + 8, y + sectionH / 2 + 3);
  y += sectionH + 14;

  const infoRows: [string, string][] = [
    ["Nama Pemesan",        order.nama_pemesan],
    ["Bidang / Departemen", order.bidang || "Umum"],
    ["Tanggal Permintaan",  createdDate.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })],
    ["Keterangan",          order.keterangan_customer || "-"],
  ];
  const lw = 145;
  infoRows.forEach(([label, val], i) => {
    if (i % 2 === 0) {
      doc.setFillColor(248, 250, 252);
      doc.rect(ml, y - 11, cw, 18, "F");
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...mid);
    doc.text(label, ml + 8, y);
    doc.text(":", ml + lw, y);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...dark);
    const lines = doc.splitTextToSize(val, cw - lw - 16);
    doc.text(lines, ml + lw + 10, y);
    y += Math.max(18, lines.length * 14);
  });
  y += 10;

  // ── BARANG YANG DIPESAN ──────────────────────────────────────
  doc.setFillColor(...tealLight);
  doc.rect(ml, y, cw, sectionH, "F");
  doc.setTextColor(...teal);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("BARANG YANG DIPESAN", ml + 8, y + sectionH / 2 + 3);
  y += sectionH + 6;

  const showApproved = order.status !== "Pending";
  const col0x = ml + 6;
  const col1x = ml + 32;
  // Satuan left-aligned; leave enough room for right-side numeric columns
  const col2x = showApproved ? ml + cw - 220 : ml + cw - 140;
  // Jml Diminta right-aligned edge
  const col3x = showApproved ? ml + cw - 80  : ml + cw - 5;
  // Jml Disetujui right-aligned edge
  const col4x = ml + cw - 5;

  doc.setFillColor(...teal);
  doc.rect(ml, y, cw, 22, "F");
  doc.setTextColor(...white);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("No",           col0x, y + 15);
  doc.text("Nama Barang",  col1x, y + 15);
  doc.text("Satuan",       col2x, y + 15);
  doc.text("Jml Diminta",  col3x, y + 15, { align: "right" });
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
      doc.setTextColor(
        item.jumlah_disetujui != null && item.jumlah_disetujui < item.jumlah_diminta ? 185 : 4,
        item.jumlah_disetujui != null && item.jumlah_disetujui < item.jumlah_diminta ? 28  : 120,
        item.jumlah_disetujui != null && item.jumlah_disetujui < item.jumlah_diminta ? 28  : 87
      );
      doc.text(approved, col4x, y + 15, { align: "right" });
      doc.setTextColor(...dark);
    }
    y += 22;
  });

  doc.setDrawColor(...light);
  doc.rect(ml, y - order.items.length * 22 - 22, cw, order.items.length * 22 + 22, "S");
  y += 12;

  // ── CATATAN BOX ──────────────────────────────────────────────
  if (order.catatan_admin) {
    doc.setFillColor(255, 251, 235);
    doc.setDrawColor(253, 230, 138);
    const catatanLines = doc.splitTextToSize(order.catatan_admin, cw - 16);
    const catatanH = 14 + catatanLines.length * 11 + 10;
    doc.roundedRect(ml, y, cw, catatanH, 3, 3, "FD");
    doc.setTextColor(146, 64, 14);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.text("Catatan Admin:", ml + 8, y + 11);
    doc.setFont("helvetica", "normal");
    doc.text(catatanLines, ml + 8, y + 22);
    y += catatanH + 10;
  } else if (order.status === "Pending") {
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(167, 243, 208);
    const noteLines = doc.splitTextToSize(
      "Catatan: Jumlah yang disetujui akan diisi oleh Admin ATK setelah memverifikasi stok yang tersedia. Anda akan menerima notifikasi setelah pesanan dikonfirmasi.",
      cw - 16
    );
    const noteH = 10 + noteLines.length * 11 + 8;
    doc.roundedRect(ml, y, cw, noteH, 3, 3, "FD");
    doc.setTextColor(6, 95, 70);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.text(noteLines, ml + 8, y + 12);
    y += noteH + 10;
  }
  y += 14;

  // ── SIGNATURE AREA (2 columns: Pemesan and Admin ATK) ────────
  const sigColW = cw / 2;
  const sigLabels = ["Pemesan,", "Disetujui Admin ATK,"];
  const sigSubs   = [order.nama_pemesan, "( ________________ )\nAdmin ATK"];

  doc.setTextColor(...mid);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  sigLabels.forEach((label, i) => {
    doc.text(label, ml + i * sigColW + sigColW / 2, y, { align: "center" });
  });
  y += 50;

  sigSubs.forEach((sub, i) => {
    const x = ml + i * sigColW + sigColW / 2;
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...dark);
      doc.setFontSize(8.5);
      doc.text(sub, x, y, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...mid);
      doc.text(order.bidang || "Umum", x, y + 12, { align: "center" });
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(...mid);
      sub.split("\n").forEach((line, li) => {
        doc.text(line, x, y + li * 12, { align: "center" });
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
