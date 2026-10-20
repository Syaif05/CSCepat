import {
  ASTNode,
  FieldDefinition,
  OutputMode,
  RenderResult,
  VariableNode,
  BoldNode,
} from "./types";
import { countUnicodeCodePoints } from "../validation/unicode";

export const WA_FORMAT_CHARS_REGEX = /[*_~`]/;

export function hasWhatsAppFormatChars(val: string): boolean {
  return WA_FORMAT_CHARS_REGEX.test(val);
}

/**
 * Renderer deterministik untuk menghasilkan pesan teks biasa atau pesan WhatsApp.
 * Sesuai PRD Bagian 7.3, 9.2, dan 9.3:
 * - Variabel disubstitusi satu kali secara langsung dari AST (tidak ada re-evaluasi regex/replace berulang)
 * - Nilai pelanggan yang mengandung {{token}}, $, script, atau HTML tetap menjadi teks mentah
 * - Karakter khusus WhatsApp (*, _, ~, `) dalam isian dideteksi untuk memberi tahu pengguna
 */
export function renderTemplate(
  ast: ASTNode[],
  fields: FieldDefinition[],
  values: Record<string, string>,
  mode: OutputMode = "plain",
  options: { previewMode?: boolean } = {}
): RenderResult {
  const fieldMap = new Map<string, FieldDefinition>();
  fields.forEach((f) => fieldMap.set(f.key, f));

  const missingRequiredFields: string[] = [];
  const substitutedValues: Record<string, string> = {};
  let hasWhatsAppFormatChars = false;

  // 1. Periksa validasi isian berdasarkan konfigurasi field
  fields.forEach((field) => {
    const rawVal = values[field.key];
    const isProvided = rawVal !== undefined && rawVal !== null;
    const isBlank = !isProvided || rawVal.trim().length === 0;

    if (field.required && isBlank) {
      missingRequiredFields.push(field.key);
    }

    if (isProvided) {
      substitutedValues[field.key] = rawVal;
      if (WA_FORMAT_CHARS_REGEX.test(rawVal)) {
        hasWhatsAppFormatChars = true;
      }
    }
  });

  // 2. Render node AST secara deterministik
  function renderVariable(node: VariableNode): string {
    const field = fieldMap.get(node.key);
    const rawVal = values[node.key];
    const isProvided = rawVal !== undefined && rawVal !== null;
    const isBlank = !isProvided || rawVal.trim().length === 0;

    if (isBlank) {
      if (field?.required) {
        // Pada mode pratinjau, tampilkan [Label] sebagai indikator visual
        return options.previewMode ? `[${field.label}]` : `[${field.label}]`;
      }
      // Field opsional yang kosong menjadi string kosong (PRD 7.3)
      return "";
    }

    // Nilai disisipkan apa adanya sebagai teks mentah tanpa parsing ulang
    return rawVal;
  }

  function renderBold(node: BoldNode): string {
    const innerContent = node.children
      .map((child) => {
        if (child.type === "text") return child.value;
        if (child.type === "variable") return renderVariable(child);
        return "";
      })
      .join("");

    if (mode === "whatsapp") {
      // Format WhatsApp: Bungkus dengan penanda bintang tunggal *teks*
      return `*${innerContent}*`;
    }

    // Format Teks Biasa: Hapus penanda formatting
    return innerContent;
  }

  const parts: string[] = [];

  for (const node of ast) {
    if (node.type === "text") {
      parts.push(node.value);
    } else if (node.type === "variable") {
      parts.push(renderVariable(node));
    } else if (node.type === "bold") {
      parts.push(renderBold(node));
    }
  }

  const text = parts.join("");

  return {
    text,
    isComplete: missingRequiredFields.length === 0,
    missingRequiredFields,
    hasWhatsAppFormatChars,
    substitutedValues,
  };
}

/**
 * Validasi batas panjang hasil akhir (maksimal 30.000 karakter Unicode)
 */
export function isRenderResultWithinLimit(text: string): boolean {
  return countUnicodeCodePoints(text) <= 30000;
}
