export interface Item {
  id: string;
  nama_barang: string;
  kategori: string;
  satuan: string;
  stok: number;
  stok_minimum: number;
  gambar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  username: string;
  nama_lengkap: string;
  bidang: string;
  created_at: string;
}

export interface RequestOrder {
  id: string;
  order_id?: string;
  item_id: string;
  customer_id?: string;
  nama_pemesan: string;
  bidang: string;
  jumlah_diminta: number;
  jumlah_disetujui: number | null;
  keterangan_customer?: string;
  catatan_admin?: string;
  status: 'Pending' | 'Diproses' | 'Selesai' | 'Ditolak';
  created_at: string;
  updated_at: string;
  approved_at?: string;
  // Join fields for UI helper
  itemName?: string;
  itemSatuan?: string;
}

export interface Setting {
  nomor_whatsapp_admin: string;
  nama_kantor: string;
}

export interface StockHistory {
  id: string;
  item_id: string;
  tipe: 'restock' | 'pengurangan';
  jumlah: number;
  keterangan: string;
  created_at: string;
  itemName?: string;
}

export interface Bidang {
  id: string;
  nama_bidang: string;
}

export interface Stats {
  totalItems: number;
  totalStockAll: number;
  requestsCount: {
    today: number;
    week: number;
    month: number;
  };
  mostRequestedItems: { name: string; count: number }[];
  requestTrendByBidang: { [bidang: string]: number };
  lowStockCount: number;
}
