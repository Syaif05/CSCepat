import { describe, it, expect } from "vitest";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { parseTemplate } from "@/lib/template-engine/parser";
import { renderTemplate, hasWhatsAppFormatChars } from "@/lib/template-engine/renderer";
import { TemplateDefinition } from "@/lib/template-engine/types";

describe("Fase 5: Generator Pesan & Interaksi Clipboard Suite", () => {
  const starterKendala: TemplateDefinition = STARTER_TEMPLATES[0];
  const ast = parseTemplate(starterKendala.body);

  // -------------------------------------------------------------
  // Test 1: Real-time substitution & format modes (GEN-01 & FMT-01)
  // -------------------------------------------------------------
  describe("Substitusi Real-Time & Mode Format (Plain vs WhatsApp)", () => {
    const validInputs = {
      nama_pelanggan: "Rina",
      nama_toko: "Toko Contoh",
      id_order: "ORD-00123",
      nama_produk: "Paket A",
      detail_masalah: "transaksi belum terkonfirmasi",
      estimasi_waktu: "30 menit",
    };

    it("harus merender format WhatsApp dengan tanda asteris tunggal pada bagian bold", () => {
      const result = renderTemplate(ast, starterKendala.fields, validInputs, "whatsapp", {
        previewMode: false,
      });

      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.text).toContain("*Halo Kak Rina,*");
      expect(result.text).toContain("*ID Order: ORD-00123*");
      expect(result.text).toContain("*Paket A*");
      expect(result.text).toContain("*transaksi belum terkonfirmasi*");
      expect(result.text).toContain("*30 menit*");
    });

    it("harus merender format Teks Biasa tanpa tanda format tebal", () => {
      const result = renderTemplate(ast, starterKendala.fields, validInputs, "plain", {
        previewMode: false,
      });

      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.text).toContain("Halo Kak Rina,");
      expect(result.text).not.toContain("*Halo Kak Rina,*");
      expect(result.text).toContain("ID Order: ORD-00123");
      expect(result.text).not.toContain("*ID Order: ORD-00123*");
    });

    it("harus menampilkan placeholder [Label] saat field wajib belum diisi pada mode pratinjau", () => {
      const partialInputs = {
        nama_pelanggan: "", // Kosong
        nama_toko: "Toko Contoh",
        id_order: "", // Kosong
        nama_produk: "Paket A",
        detail_masalah: "kendala teknis",
        estimasi_waktu: "15 menit",
      };

      const result = renderTemplate(ast, starterKendala.fields, partialInputs, "whatsapp", {
        previewMode: true,
      });

      expect(result.isComplete).toBe(false);
      expect(result.missingRequiredFields).toContain("nama_pelanggan");
      expect(result.missingRequiredFields).toContain("id_order");
      expect(result.text).toContain("[Nama Pelanggan]");
      expect(result.text).toContain("[ID Order]");
    });
  });

  // -------------------------------------------------------------
  // Test 2: Validasi Isian Wajib & Pemblokiran Salin (PRD 7.3 & 7.4)
  // -------------------------------------------------------------
  describe("Validasi Isian Wajib & Pemblokiran Salin", () => {
    it("harus menganggap field wajib yang hanya berisi whitespace sebagai tidak lengkap", () => {
      const whitespaceInputs = {
        nama_pelanggan: "   ",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
        nama_produk: "Paket A",
        detail_masalah: "masalah",
        estimasi_waktu: "10 menit",
      };

      const result = renderTemplate(ast, starterKendala.fields, whitespaceInputs, "plain");
      expect(result.isComplete).toBe(false);
      expect(result.missingRequiredFields).toContain("nama_pelanggan");
    });

    it("harus menandai siap salin hanya jika seluruh field wajib telah diisi", () => {
      const fullInputs = {
        nama_pelanggan: "Budi",
        nama_toko: "Toko Contoh",
        id_order: "ORD-999",
        nama_produk: "Paket B",
        detail_masalah: "Stok sedang diperiksa",
        estimasi_waktu: "1 jam",
      };

      const result = renderTemplate(ast, starterKendala.fields, fullInputs, "plain");
      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------
  // Test 3: Logika Reset Pelanggan Baru & Isolasi Transient (PRIV-03 & PRIV-04)
  // -------------------------------------------------------------
  describe("PRIV-03 & PRIV-04: Siklus Hidup Privasi & Reset Pelanggan Baru", () => {
    it("harus membedakan transient field dan configuration field saat reset", () => {
      // Nilai sebelum reset
      const filledValues = {
        nama_pelanggan: "Pelanggan Rahasia",
        nama_toko: "Toko Baru Diedit",
        id_order: "ORD-RAHASIA-99",
        nama_produk: "Produk X",
        detail_masalah: "Kendala Y",
        estimasi_waktu: "2 jam",
      };
      expect(filledValues.nama_pelanggan).toBe("Pelanggan Rahasia");

      // Logika reset pelanggan baru:
      // 1. Kosongkan semua transient field
      // 2. Kembalikan configuration field ke default_value bawaan template
      const resetValues: Record<string, string> = {};
      starterKendala.fields.forEach((field) => {
        if (field.data_class === "transient") {
          resetValues[field.key] = "";
        } else if (field.data_class === "configuration") {
          resetValues[field.key] = field.default_value || "";
        }
      });

      // Verifikasi: nilai transient pelanggan dibersihkan total
      expect(resetValues.nama_pelanggan).toBe("");
      expect(resetValues.id_order).toBe("");
      expect(resetValues.nama_produk).toBe("");
      expect(resetValues.detail_masalah).toBe("");
      expect(resetValues.estimasi_waktu).toBe("");

      // Verifikasi: nilai konfigurasi umum kembali ke default
      expect(resetValues.nama_toko).toBe("Toko Contoh");
    });

    it("harus mendeteksi dirty state hanya ketika ada transient data yang terisi", () => {
      const emptyValues = {
        nama_pelanggan: "",
        nama_toko: "Toko Contoh", // Configuration field
        id_order: "",
        nama_produk: "",
        detail_masalah: "",
        estimasi_waktu: "",
      };

      const isDirtyClean = starterKendala.fields.some(
        (f) => f.data_class === "transient" && (emptyValues[f.key as keyof typeof emptyValues] || "").trim() !== ""
      );
      expect(isDirtyClean).toBe(false);

      const customerFilledValues = {
        ...emptyValues,
        nama_pelanggan: "Kak Andi", // Transient field terisi
      };

      const isDirtyFilled = starterKendala.fields.some(
        (f) => f.data_class === "transient" && (customerFilledValues[f.key as keyof typeof customerFilledValues] || "").trim() !== ""
      );
      expect(isDirtyFilled).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Test 4: Deteksi Karakter Format WhatsApp (FMT-02)
  // -------------------------------------------------------------
  describe("FMT-02: Deteksi Karakter Format WhatsApp", () => {
    it("harus mendeteksi karakter *, _, ~, dan backtick dalam nilai isian", () => {
      expect(hasWhatsAppFormatChars("Promo *Spesial*")).toBe(true);
      expect(hasWhatsAppFormatChars("Paket_Ekonomi")).toBe(true);
      expect(hasWhatsAppFormatChars("Diskon ~50%~")).toBe(true);
      expect(hasWhatsAppFormatChars("Kode: `1234`")).toBe(true);
      expect(hasWhatsAppFormatChars("Nama Pelanggan Biasa 123")).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 5: Fallback Copy Handling (CLIP-01)
  // -------------------------------------------------------------
  describe("CLIP-01: Fallback Salin Manual", () => {
    it("harus menghasilkan teks yang sama persis untuk fallback modal saat writeText gagal", () => {
      const inputs = {
        nama_pelanggan: "Dina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-456",
        nama_produk: "Paket Premium",
        detail_masalah: "jaringan lambat",
        estimasi_waktu: "10 menit",
      };

      const rendered = renderTemplate(ast, starterKendala.fields, inputs, "whatsapp", {
        previewMode: false,
      });

      // Teks yang akan dimuat ke textarea FallbackCopyDialog
      const fallbackText = rendered.text;
      expect(fallbackText).toBeTruthy();
      expect(fallbackText).toContain("*Halo Kak Dina,*");
      expect(fallbackText).toContain("*ID Order: ORD-456*");
    });
  });
});
