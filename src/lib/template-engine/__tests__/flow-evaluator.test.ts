import { describe, it, expect } from "vitest";
import {
  evaluateActiveFlow,
  renderFlowTemplate,
  cleanInactiveAnswers,
  initializeFlowAnswers,
  validateFlowFieldAnswer,
  isBranchConditionMatched,
} from "../flow-evaluator";
import { STARTER_FLOWS } from "../starter-flows";
import { TemplateFlowDefinitionSchema } from "../../validation/flow-schema";
import { TemplateFlowDefinition } from "../flow-types";

describe("Fase 2.1: Flow Evaluator & Data Model", () => {
  const starterOrderFlow = STARTER_FLOWS[0];

  describe("1. Skema Validasi Zod (flow-schema.ts)", () => {
    it("memvalidasi seluruh STARTER_FLOWS dengan sukses tanpa error", () => {
      STARTER_FLOWS.forEach((flow) => {
        const result = TemplateFlowDefinitionSchema.safeParse(flow);
        expect(result.success).toBe(true);
      });
    });

    it("menolak template jika rootNodeId tidak ada di daftar nodes", () => {
      const invalid = {
        ...starterOrderFlow,
        rootNodeId: "node-tidak-ada",
      };
      const result = TemplateFlowDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("Root Node ID"))
        ).toBe(true);
      }
    });

    it("menolak template jika target cabang (targetNodeId) tidak ada di daftar nodes", () => {
      const invalid = {
        ...starterOrderFlow,
        nodes: starterOrderFlow.nodes.map((n) =>
          n.id === "node-root-sapaan"
            ? {
                ...n,
                branches: [
                  {
                    value: "Paket Hilang di Ekspedisi",
                    targetNodeId: "node-hantu-gaib",
                  },
                ],
              }
            : n
        ),
      };
      const result = TemplateFlowDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) => i.message.includes("Target branch"))
        ).toBe(true);
      }
    });

    it("menolak node yang mengarahkan langsung ke dirinya sendiri (self-loop)", () => {
      const invalid = {
        ...starterOrderFlow,
        nodes: starterOrderFlow.nodes.map((n) =>
          n.id === "node-root-sapaan"
            ? {
                ...n,
                defaultNextNodeId: "node-root-sapaan",
              }
            : n
        ),
      };
      const result = TemplateFlowDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes("Node tidak boleh mengalir ke dirinya sendiri")
          )
        ).toBe(true);
      }
    });

    it("menolak field transient jika diberi default_value (Zero Storage Policy)", () => {
      const invalid = {
        ...starterOrderFlow,
        nodes: starterOrderFlow.nodes.map((n) =>
          n.id === "node-root-sapaan"
            ? {
                ...n,
                fields: n.fields.map((f) =>
                  f.key === "nama_pelanggan"
                    ? { ...f, default_value: "Budi Customer" }
                    : f
                ),
              }
            : n
        ),
      };
      const result = TemplateFlowDefinitionSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(
          result.error.issues.some((i) =>
            i.message.includes(
              "Field transient tidak boleh memiliki nilai default tersimpan"
            )
          )
        ).toBe(true);
      }
    });
  });

  describe("2. Logika Kondisi Percabangan (isBranchConditionMatched)", () => {
    it("mencocokkan string teks langsung (case-insensitive)", () => {
      expect(isBranchConditionMatched("Paket Hilang", "Paket Hilang")).toBe(true);
      expect(isBranchConditionMatched("Paket Hilang", "paket hilang")).toBe(true);
      expect(isBranchConditionMatched("Paket Hilang", "  Paket Hilang  ")).toBe(true);
      expect(isBranchConditionMatched("Paket Hilang", "Produk Rusak")).toBe(false);
    });

    it("mencocokkan alias boolean secara fleksibel (true/false vs Ya/Tidak)", () => {
      expect(isBranchConditionMatched("true", "true")).toBe(true);
      expect(isBranchConditionMatched("true", "Ya")).toBe(true);
      expect(isBranchConditionMatched("true", "ya")).toBe(true);
      expect(isBranchConditionMatched("Ya", "true")).toBe(true);

      expect(isBranchConditionMatched("false", "false")).toBe(true);
      expect(isBranchConditionMatched("false", "Tidak")).toBe(true);
      expect(isBranchConditionMatched("Tidak", "false")).toBe(true);

      expect(isBranchConditionMatched("true", "Tidak")).toBe(false);
    });

    it("mencocokkan nilai numerik", () => {
      expect(isBranchConditionMatched("100", "100")).toBe(true);
      expect(isBranchConditionMatched("100", "100.0")).toBe(true);
      expect(isBranchConditionMatched("100", "200")).toBe(false);
    });
  });

  describe("3. Path Traversal Jalur Node (evaluateActiveFlow)", () => {
    it("hanya mengaktifkan root node jika pertanyaan percabangan belum dijawab", () => {
      const result = evaluateActiveFlow(starterOrderFlow, {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
      });

      expect(result.activeNodes.map((n) => n.id)).toEqual(["node-root-sapaan"]);
      expect(result.activeFields.map((f) => f.key)).toEqual([
        "nama_pelanggan",
        "nama_toko",
        "id_order",
        "jenis_kendala",
      ]);
    });

    it("menelusuri Jalur 1A: Paket Hilang -> Asuransi Aktif -> Klaim -> Penutup", () => {
      const answers = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP12345678",
        nama_ekspedisi: "J&T Express",
        asuransi_aktif: "true",
        nominal_klaim: "250000",
      };

      const result = evaluateActiveFlow(starterOrderFlow, answers);

      expect(result.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-paket-hilang",
        "node-klaim-asuransi",
        "node-penutup",
      ]);

      const activeKeys = result.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("nominal_klaim");
      expect(activeKeys).not.toContain("estimasi_hari_investigasi");
      expect(activeKeys).not.toContain("detail_kerusakan");
      expect(activeKeys).not.toContain("nama_produk_benar");
    });

    it("menelusuri Jalur 1B: Paket Hilang -> Tanpa Asuransi -> Investigasi Kurir -> Penutup", () => {
      const answers = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP12345678",
        nama_ekspedisi: "SiCepat",
        asuransi_aktif: "false",
        estimasi_hari_investigasi: "5",
      };

      const result = evaluateActiveFlow(starterOrderFlow, answers);

      expect(result.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-paket-hilang",
        "node-investigasi-standar",
        "node-penutup",
      ]);

      const activeKeys = result.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("estimasi_hari_investigasi");
      expect(activeKeys).not.toContain("nominal_klaim");
      expect(activeKeys).not.toContain("detail_kerusakan");
    });

    it("menelusuri Jalur 2: Produk Rusak -> Solusi Rusak -> Penutup", () => {
      const answers = {
        nama_pelanggan: "Budi",
        nama_toko: "Toko Berkah",
        id_order: "ORD-77",
        jenis_kendala: "Produk Rusak / Cacat",
        detail_kerusakan: "Layar retak",
        opsi_solusi_rusak: "Pengembalian Dana Penuh (Refund)",
      };

      const result = evaluateActiveFlow(starterOrderFlow, answers);

      expect(result.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-produk-rusak",
        "node-penutup",
      ]);

      const activeKeys = result.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("detail_kerusakan");
      expect(activeKeys).toContain("opsi_solusi_rusak");
      expect(activeKeys).not.toContain("nomor_resi");
      expect(activeKeys).not.toContain("nominal_klaim");
    });

    it("proteksi siklus (Cycle Protection): tidak terjebak infinite loop pada template rekursif", () => {
      const cyclicTemplate: TemplateFlowDefinition = {
        id: "cyclic-test",
        title: "Cyclic Test",
        description: "",
        category: "Test",
        is_favorite: false,
        is_archived: false,
        schema_version: 2,
        version: 1,
        rootNodeId: "node-a",
        nodes: [
          {
            id: "node-a",
            title: "Node A",
            body: "Ini Node A",
            fields: [],
            branches: [],
            defaultNextNodeId: "node-b",
          },
          {
            id: "node-b",
            title: "Node B",
            body: "Ini Node B",
            fields: [],
            branches: [],
            defaultNextNodeId: "node-a", // Menunjuk kembali ke Node A
          },
        ],
      };

      const result = evaluateActiveFlow(cyclicTemplate, {});
      // Harus berhenti setelah Node A dan Node B dikunjungi satu kali
      expect(result.visitedNodeIds).toEqual(["node-a", "node-b"]);
      expect(result.activeNodes.map((n) => n.id)).toEqual(["node-a", "node-b"]);
    });
  });

  describe("4. Rendering & Penyambungan Paragraf (renderFlowTemplate)", () => {
    it("merender pesan format Teks Biasa tanpa formatting bintang", () => {
      const answers = {
        nama_pelanggan: "Siti",
        nama_toko: "Toko Maju",
        id_order: "ORD-555",
        jenis_kendala: "Salah Kirim Produk",
        nama_produk_benar: "Sepatu Sneaker Putih Size 42",
      };

      const result = renderFlowTemplate(starterOrderFlow, answers, "plain");

      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredFields.length).toBe(0);
      expect(result.text).toContain("Halo Kak Siti,");
      expect(result.text).toContain("ID Order: ORD-555");
      expect(result.text).toContain("Sepatu Sneaker Putih Size 42");
      // Tidak boleh ada tanda bintang bold WhatsApp
      expect(result.text).not.toContain("**");
      expect(result.text).not.toContain("*Halo Kak Siti,*");
    });

    it("merender pesan format WhatsApp dengan formatting bintang *teks*", () => {
      const answers = {
        nama_pelanggan: "Siti",
        nama_toko: "Toko Maju",
        id_order: "ORD-555",
        jenis_kendala: "Salah Kirim Produk",
        nama_produk_benar: "Sepatu Sneaker Putih Size 42",
      };

      const result = renderFlowTemplate(starterOrderFlow, answers, "whatsapp");

      expect(result.isComplete).toBe(true);
      expect(result.text).toContain("*Halo Kak Siti,*");
      expect(result.text).toContain("*ID Order: ORD-555*");
      expect(result.text).toContain("*Sepatu Sneaker Putih Size 42*");
    });

    it("hanya memblokir isComplete untuk field wajib pada JALUR AKTIF yang belum terisi", () => {
      const answers = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP12345678",
        nama_ekspedisi: "J&T Express",
        asuransi_aktif: "true",
        // nominal_klaim sengaja dikosongkan!
      };

      const result = renderFlowTemplate(starterOrderFlow, answers, "plain");

      expect(result.isComplete).toBe(false);
      expect(result.missingRequiredFields.map((f) => f.key)).toEqual([
        "nominal_klaim",
      ]);
      // Pastikan field dari jalur non-aktif (seperti detail_kerusakan) tidak dianggap missing!
      expect(
        result.missingRequiredFields.some((f) => f.key === "detail_kerusakan")
      ).toBe(false);
    });

    it("mendeteksi karakter pemformatan WhatsApp (*, _, ~, `) pada isian pelanggan", () => {
      const answers = {
        nama_pelanggan: "*Rina Bintang*",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Salah Kirim Produk",
        nama_produk_benar: "Barang Bagus",
      };

      const result = renderFlowTemplate(starterOrderFlow, answers, "whatsapp");
      expect(result.hasWhatsAppFormatChars).toBe(true);
    });
  });

  describe("5. Utilitas Manajemen Isian & Siklus Hidup Pelanggan Baru", () => {
    it("cleanInactiveAnswers menghapus isian dari cabang yang telah ditinggalkan", () => {
      const { activeFields } = evaluateActiveFlow(starterOrderFlow, {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Salah Kirim Produk",
        nama_produk_benar: "Barang A",
      });

      const dirtyOldAnswers = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Berkah",
        id_order: "ORD-99",
        jenis_kendala: "Salah Kirim Produk",
        nama_produk_benar: "Barang A",
        // Data lama dari cabang paket hilang yang pernah diisi sebelumnya:
        nomor_resi: "JP9999",
        nominal_klaim: "500000",
      };

      const cleaned = cleanInactiveAnswers(activeFields, dirtyOldAnswers);

      expect(cleaned.nomor_resi).toBeUndefined();
      expect(cleaned.nominal_klaim).toBeUndefined();
      expect(cleaned.nama_produk_benar).toBe("Barang A");
    });

    it("initializeFlowAnswers mengisi field configuration dan mengosongkan transient", () => {
      const { activeFields } = evaluateActiveFlow(starterOrderFlow, {
        jenis_kendala: "Salah Kirim Produk",
      });

      const initial = initializeFlowAnswers(activeFields);

      expect(initial.nama_toko).toBe("Toko Contoh"); // configuration with default
      expect(initial.nama_pelanggan).toBe(""); // transient
      expect(initial.id_order).toBe(""); // transient
    });

    it("validateFlowFieldAnswer memeriksa tipe number beserta batasan min/max", () => {
      const numField = starterOrderFlow.nodes
        .find((n) => n.id === "node-investigasi-standar")!
        .fields.find((f) => f.key === "estimasi_hari_investigasi")!;

      expect(validateFlowFieldAnswer(numField, "5").isValid).toBe(true);
      expect(validateFlowFieldAnswer(numField, "bukan_angka").isValid).toBe(false);
      expect(validateFlowFieldAnswer(numField, "0").isValid).toBe(false); // min 1
      expect(validateFlowFieldAnswer(numField, "20").isValid).toBe(false); // max 14
    });
  });
});
