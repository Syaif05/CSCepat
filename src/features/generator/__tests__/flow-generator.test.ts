import { describe, it, expect } from "vitest";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";
import {
  evaluateActiveFlow,
  renderFlowTemplate,
  cleanInactiveAnswers,
  initializeFlowAnswers,
} from "@/lib/template-engine/flow-evaluator";
import { extractFlowDefinition } from "../hooks/useGeneratorState";

describe("Fase 2.3: Formulir Adaptif & Generator Pesan Dinamis", () => {
  const flowTemplate = STARTER_FLOWS[0]; // Kendala Pesanan & Kompensasi

  describe("1. Ekstraksi Definisi Flow (extractFlowDefinition)", () => {
    it("mengekstrak TemplateFlowDefinition yang valid dari objek langsung", () => {
      const extracted = extractFlowDefinition(flowTemplate);
      expect(extracted).not.toBeNull();
      expect(extracted?.schema_version).toBe(2);
      expect(extracted?.rootNodeId).toBe("node-root-sapaan");
      expect(extracted?.nodes.length).toBeGreaterThan(0);
    });

    it("mengekstrak TemplateFlowDefinition dari envelope body stringified JSON", () => {
      const wrappedTemplate = {
        id: "wrapped-test-id",
        title: flowTemplate.title,
        description: flowTemplate.description,
        category: flowTemplate.category,
        body: JSON.stringify({
          rootNodeId: flowTemplate.rootNodeId,
          nodes: flowTemplate.nodes,
        }),
        fields: [],
        is_favorite: false,
        is_archived: false,
        schema_version: 2,
        version: 1,
      };

      const extracted = extractFlowDefinition(wrappedTemplate);
      expect(extracted).not.toBeNull();
      expect(extracted?.rootNodeId).toBe("node-root-sapaan");
      expect(extracted?.nodes.length).toBe(flowTemplate.nodes.length);
    });

    it("mengembalikan null untuk template linear v1", () => {
      const linearTemplate = {
        id: "linear-id",
        title: "Linear Template",
        description: "",
        category: "Umum",
        body: "Halo {{nama}}",
        fields: [],
        is_favorite: false,
        is_archived: false,
        schema_version: 1,
        version: 1,
      };

      const extracted = extractFlowDefinition(linearTemplate);
      expect(extracted).toBeNull();
    });
  });

  describe("2. Formulir Dinamis Adaptif Berdasarkan Pilihan Masalah", () => {
    it("hanya menampilkan field root node saat CS belum memilih jenis kendala", () => {
      const values: Record<string, string> = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
      };

      const active = evaluateActiveFlow(flowTemplate, values);
      expect(active.activeNodes.map((n) => n.id)).toEqual(["node-root-sapaan"]);

      const activeKeys = active.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("nama_pelanggan");
      expect(activeKeys).toContain("jenis_kendala");
      expect(activeKeys).not.toContain("nomor_resi");
      expect(activeKeys).not.toContain("detail_kerusakan");
    });

    it("membuka jalur Paket Hilang saat CS memilih opsi tersebut", () => {
      const values = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
        jenis_kendala: "Paket Hilang di Ekspedisi",
      };

      const active = evaluateActiveFlow(flowTemplate, values);
      expect(active.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-paket-hilang",
      ]);

      const activeKeys = active.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("nomor_resi");
      expect(activeKeys).toContain("nama_ekspedisi");
      expect(activeKeys).toContain("asuransi_aktif");
      expect(activeKeys).not.toContain("detail_kerusakan");
    });

    it("membuka sub-jalur asuransi klaim saat asuransi_aktif = 'true'", () => {
      const values = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP9999",
        nama_ekspedisi: "J&T Express",
        asuransi_aktif: "true",
      };

      const active = evaluateActiveFlow(flowTemplate, values);
      expect(active.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-paket-hilang",
        "node-klaim-asuransi",
        "node-penutup",
      ]);

      const activeKeys = active.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("nominal_klaim");
      expect(activeKeys).not.toContain("estimasi_hari_investigasi");
    });

    it("membuka sub-jalur investigasi kurir saat asuransi_aktif = 'false'", () => {
      const values = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP9999",
        nama_ekspedisi: "J&T Express",
        asuransi_aktif: "false",
      };

      const active = evaluateActiveFlow(flowTemplate, values);
      expect(active.activeNodes.map((n) => n.id)).toEqual([
        "node-root-sapaan",
        "node-paket-hilang",
        "node-investigasi-standar",
        "node-penutup",
      ]);

      const activeKeys = active.activeFields.map((f) => f.key);
      expect(activeKeys).toContain("estimasi_hari_investigasi");
      expect(activeKeys).not.toContain("nominal_klaim");
    });
  });

  describe("3. Pembersihan Otomatis Isian Cabang (cleanInactiveAnswers)", () => {
    it("menghapus isian dari cabang lama saat CS berpindah dari Paket Hilang ke Produk Rusak", () => {
      // 1. Awalnya CS mengisi jalur Paket Hilang
      const oldAnswers = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-123",
        jenis_kendala: "Paket Hilang di Ekspedisi",
        nomor_resi: "JP9999",
        nama_ekspedisi: "J&T Express",
        asuransi_aktif: "true",
        nominal_klaim: "250000",
      };

      // 2. CS berubah pikiran dan mengganti jenis_kendala ke "Produk Rusak / Cacat"
      const updatedAnswers = {
        ...oldAnswers,
        jenis_kendala: "Produk Rusak / Cacat",
        detail_kerusakan: "Kemasan sobek dan barang pecah",
      };

      const newActive = evaluateActiveFlow(flowTemplate, updatedAnswers);
      const cleaned = cleanInactiveAnswers(newActive.activeFields, updatedAnswers);

      // Data umum tetap ada
      expect(cleaned.nama_pelanggan).toBe("Rina");
      expect(cleaned.id_order).toBe("ORD-123");
      expect(cleaned.jenis_kendala).toBe("Produk Rusak / Cacat");
      expect(cleaned.detail_kerusakan).toBe("Kemasan sobek dan barang pecah");

      // Data dari cabang lama otomatis dibersihkan
      expect(cleaned.nomor_resi).toBeUndefined();
      expect(cleaned.nama_ekspedisi).toBeUndefined();
      expect(cleaned.asuransi_aktif).toBeUndefined();
      expect(cleaned.nominal_klaim).toBeUndefined();
    });
  });

  describe("4. Validasi Kelengkapan Salin Pesan (isComplete & Missing Required)", () => {
    it("hanya memblokir tombol salin jika field wajib pada JALUR AKTIF kosong", () => {
      const incompleteValues = {
        nama_pelanggan: "Budi",
        nama_toko: "Toko Maju",
        id_order: "ORD-888",
        jenis_kendala: "Salah Kirim Produk",
        // nama_produk_benar sengaja dikosongkan!
      };

      const rendered = renderFlowTemplate(flowTemplate, incompleteValues, "whatsapp");
      expect(rendered.isComplete).toBe(false);
      expect(rendered.missingRequiredFields.map((f) => f.key)).toEqual([
        "nama_produk_benar",
      ]);

      // Lengkapi field wajib
      const completeValues = {
        ...incompleteValues,
        nama_produk_benar: "Baju Koko Putih M",
      };

      const renderedComplete = renderFlowTemplate(
        flowTemplate,
        completeValues,
        "whatsapp"
      );
      expect(renderedComplete.isComplete).toBe(true);
      expect(renderedComplete.missingRequiredFields).toHaveLength(0);
      expect(renderedComplete.text).toContain("*Baju Koko Putih M*");
    });
  });

  describe("5. Siklus Hidup Pelanggan Baru (Reset Customer Values)", () => {
    it("mengembalikan konfigurasi ke default dan mengosongkan data pelanggan", () => {
      const active = evaluateActiveFlow(flowTemplate, {
        jenis_kendala: "Produk Rusak / Cacat",
      });

      const initialValues = initializeFlowAnswers(active.activeFields);

      // Nilai transient (pelanggan) wajib kosong
      expect(initialValues.nama_pelanggan).toBe("");
      expect(initialValues.id_order).toBe("");
      expect(initialValues.detail_kerusakan).toBe("");

      // Nilai configuration (toko) tetap terjaga dari default template
      expect(initialValues.nama_toko).toBe("Toko Contoh");
    });
  });
});
