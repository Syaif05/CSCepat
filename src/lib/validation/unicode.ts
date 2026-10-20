/**
 * Utilitas penghitungan karakter Unicode dan validasi byte UTF-8
 * Sesuai PRD Bagian 9.4:
 * - Penghitungan karakter menggunakan Unicode code point (Array.from(text).length)
 * - Penghitungan batas ukuran menggunakan UTF-8 byte length (TextEncoder)
 */

export function countUnicodeCodePoints(text: string): number {
  if (!text) return 0;
  return Array.from(text).length;
}

export function countUtf8Bytes(text: string): number {
  if (!text) return 0;
  return new TextEncoder().encode(text).length;
}

/**
 * Validasi identifier key variabel
 * Aturan: [a-z][a-z0-9_]{0,63} (hanya huruf kecil, angka, underscore; dimulai huruf kecil; maks 64 karakter)
 */
export const KEY_REGEX = /^[a-z][a-z0-9_]{0,63}$/;

export function isValidKey(key: string): boolean {
  return KEY_REGEX.test(key);
}

/**
 * Konversi label bebas menjadi format snake_case key yang valid
 * Contoh: "Nama Pelanggan" -> "nama_pelanggan"
 * "ID Order #1" -> "id_order_1"
 */
export function labelToKey(label: string): string {
  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  if (!normalized) return "variabel";
  // Pastikan dimulai dengan huruf alfabet a-z
  if (!/^[a-z]/.test(normalized)) {
    return `v_${normalized}`.slice(0, 64);
  }
  return normalized.slice(0, 64);
}
