import { OutputMode } from "./types";

/**
 * Tipe kontrol input formulir yang didukung pada sistem Flow v2
 */
export type FlowFieldType =
  | "text"      // Teks Singkat 1 baris
  | "textarea"  // Teks Panjang multi-baris
  | "select"    // Dropdown pilihan tetap
  | "combobox"  // Dropdown pilihan + ketik bebas
  | "number"    // Nomor / Nilai angka (kuantitas, hari, nominal)
  | "boolean";  // Ya / Tidak (Switch / Radio / Dropdown Ya-Tidak)

export type FlowDataClass = "transient" | "configuration";

export interface FlowFieldOption {
  id: string;
  label: string;
  value: string;
}

/**
 * Definisi field input di dalam sebuah node
 */
export interface FlowFieldDefinition {
  id: string;
  key: string;              // Token variabel dalam snake_case (misal: nama_pelanggan, order_id)
  label: string;            // Label yang tampil pada formulir UI
  type: FlowFieldType;
  required: boolean;
  data_class: FlowDataClass;
  placeholder: string;
  help_text: string;
  max_length: number;
  allow_custom: boolean;
  default_value: string | null; // Wajib null untuk data_class "transient"
  options: FlowFieldOption[];   // Relevan untuk select dan combobox
  min?: number;                 // Khusus tipe number
  max?: number;                 // Khusus tipe number
}

/**
 * Aturan kondisi percabangan ke node berikutnya
 */
export interface FlowBranchCondition {
  value: string;            // Nilai pembanding (misal: "Paket Hilang", "true", "false")
  targetNodeId: string;     // ID node tujuan berikutnya
  label?: string;           // Keterangan visual cabang
}

/**
 * Satu node (langkah / blok pesan) dalam template flow
 */
export interface FlowNode {
  id: string;
  title: string;            // Judul langkah (misal: "Sapaan Awal", "Investigasi Ekspedisi")
  body: string;             // Kalimat pesan pada node ini (bisa memuat {{token}} dan **bold**)
  fields: FlowFieldDefinition[];
  // Variabel yang dijadikan penentu cabang ke node berikutnya (opsional)
  branchingFieldKey?: string | null;
  // Daftar cabang berdasarkan jawaban pada branchingFieldKey
  branches: FlowBranchCondition[];
  // Node lanjutan default jika tidak ada cabang yang cocok atau alur lurus
  defaultNextNodeId?: string | null;
}

/**
 * Definisi lengkap Template Flow v2
 */
export interface TemplateFlowDefinition {
  id: string;
  owner_id?: string;
  title: string;
  description: string;
  category: string;
  is_favorite: boolean;
  is_archived: boolean;
  starter_key?: string | null;
  schema_version: 2;        // Versi skema 2 untuk Flow Node
  version: number;
  rootNodeId: string;       // ID node awal / titik masuk percabangan
  nodes: FlowNode[];        // Seluruh daftar node dalam alur
  created_at?: string;
  updated_at?: string;
}

/**
 * Hasil evaluasi jalur aktif pada saat customer service mengisi form
 */
export interface ActiveFlowResult {
  activeNodes: FlowNode[];
  activeFields: FlowFieldDefinition[];
  visitedNodeIds: string[];
}

/**
 * Hasil render pesan akhir dari seluruh node yang aktif
 */
export interface FlowRenderResult {
  text: string;
  isComplete: boolean;
  missingRequiredFields: FlowFieldDefinition[];
  hasWhatsAppFormatChars: boolean;
  activeNodes: FlowNode[];
  activeFields: FlowFieldDefinition[];
  outputMode: OutputMode;
}
