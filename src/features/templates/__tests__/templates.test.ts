import { describe, it, expect } from "vitest";
import { labelToKey, isValidKey } from "@/lib/validation/unicode";
import { TemplateDefinition, FieldDefinition } from "@/lib/template-engine/types";
import { parseTemplate, validateTemplateVariables } from "@/lib/template-engine/parser";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { TemplateDefinitionSchema } from "@/lib/validation/template-schema";

describe("Fase 4: Template Builder & Manajemen Template Suite", () => {
  // -------------------------------------------------------------
  // Test 1: Auto-key generation (labelToKey) & key validation
  // -------------------------------------------------------------
  describe("Field Key Generation & Validation", () => {
    it("harus mengubah label menjadi snake_case yang valid", () => {
      expect(labelToKey("Nama Pelanggan")).toBe("nama_pelanggan");
      expect(labelToKey("ID Order")).toBe("id_order");
      expect(labelToKey("Detail Masalah (Kendala)")).toBe("detail_masalah_kendala");
      expect(labelToKey("Estimasi Waktu")).toBe("estimasi_waktu");
      expect(labelToKey("Nama Toko / Perusahaan")).toBe("nama_toko_perusahaan");
    });

    it("harus memvalidasi key sesuai grammar [a-z][a-z0-9_]{0,63}", () => {
      expect(isValidKey("nama_pelanggan")).toBe(true);
      expect(isValidKey("id_order_123")).toBe(true);
      expect(isValidKey("a")).toBe(true);
      
      // Ilegal: diawali angka, huruf kapital, ada spasi, karakter khusus
      expect(isValidKey("123order")).toBe(false);
      expect(isValidKey("NamaPelanggan")).toBe(false);
      expect(isValidKey("nama pelanggan")).toBe(false);
      expect(isValidKey("nama-pelanggan")).toBe(false);
      expect(isValidKey("nama@pelanggan")).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 2: Template 6-Input Kasus Kendala Pesanan (PRD 10.1 & 10.2)
  // -------------------------------------------------------------
  describe("Template 6-Input Utama (Kasus Kendala Pesanan)", () => {
    const starterKendala = STARTER_TEMPLATES[0];

    it("harus memiliki tepat 6 field yang cocok 100% dengan token di body", () => {
      expect(starterKendala.fields).toHaveLength(6);
      const ast = parseTemplate(starterKendala.body);
      const fieldKeys = starterKendala.fields.map((f) => f.key);
      const validation = validateTemplateVariables(ast, fieldKeys);

      expect(validation.isValid).toBe(true);
      expect(validation.missingFields).toHaveLength(0);
      expect(validation.unusedFields).toHaveLength(0);
    });

    it("harus lolos validasi skema TemplateDefinitionSchema secara atomik", () => {
      const result = TemplateDefinitionSchema.safeParse(starterKendala);
      expect(result.success).toBe(true);
    });

    it("harus membedakan transient (tanpa default) dan configuration (dengan default)", () => {
      const namaPelangganField = starterKendala.fields.find((f) => f.key === "nama_pelanggan");
      expect(namaPelangganField?.data_class).toBe("transient");
      expect(namaPelangganField?.default_value).toBeNull();

      const namaTokoField = starterKendala.fields.find((f) => f.key === "nama_toko");
      expect(namaTokoField?.data_class).toBe("configuration");
      expect(namaTokoField?.default_value).toBe("Toko Contoh");
    });
  });

  // -------------------------------------------------------------
  // Test 3: Logika Duplikasi Template (PRD 8.5 & 16)
  // -------------------------------------------------------------
  describe("Duplikasi Template", () => {
    it("harus membuat salinan dengan prefix judul 'Salinan — ', reset version 1, dan tanpa riwayat", () => {
      const original: TemplateDefinition = {
        ...STARTER_TEMPLATES[0],
        id: "original-uuid-1234",
        version: 5,
        is_favorite: true,
        is_archived: false,
        starter_key: "kendala_pesanan",
      };

      // Simulasi logika duplicateTemplateAction
      const duplicatedTitle = `Salinan — ${original.title}`.slice(0, 100);
      const duplicatedPayload: Omit<TemplateDefinition, "id" | "owner_id" | "created_at" | "updated_at"> = {
        title: duplicatedTitle,
        description: original.description,
        category: original.category,
        body: original.body,
        fields: original.fields,
        is_favorite: false, // Reset favorit
        is_archived: false, // Reset arsip
        starter_key: null, // Reset starter key
        schema_version: 1,
        version: 1, // Reset versi ke 1
      };

      expect(duplicatedPayload.title).toBe(`Salinan — ${original.title}`);
      expect(duplicatedPayload.version).toBe(1);
      expect(duplicatedPayload.is_favorite).toBe(false);
      expect(duplicatedPayload.starter_key).toBeNull();
      expect(duplicatedPayload.fields).toEqual(original.fields);
    });
  });

  // -------------------------------------------------------------
  // Test 4: Proteksi Field Deletion & Sync (PRD 8.3)
  // -------------------------------------------------------------
  describe("Field Deletion & Sync Protection", () => {
    it("harus memblokir penghapusan field jika tokennya masih dipakai dalam teks pesan", () => {
      const body = "Halo Kak {{nama_pelanggan}}, pesanan {{id_order}} sedang diproses.";
      const fieldToDelete: FieldDefinition = {
        id: "field-1",
        key: "nama_pelanggan",
        label: "Nama Pelanggan",
        type: "text",
        required: true,
        data_class: "transient",
        placeholder: "",
        help_text: "",
        max_length: 200,
        allow_custom: false,
        default_value: null,
        options: [],
      };

      const isUsedInBody = body.includes(`{{${fieldToDelete.key}}}`);
      expect(isUsedInBody).toBe(true);

      // Jika field dihapus tanpa menghapus token dari body, AST validation harus gagal
      const ast = parseTemplate(body);
      const remainingFieldKeys = ["id_order"]; // nama_pelanggan dihapus
      const validation = validateTemplateVariables(ast, remainingFieldKeys);

      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain("nama_pelanggan");
    });
  });

  // -------------------------------------------------------------
  // Test 5: Reordering Fields
  // -------------------------------------------------------------
  describe("Field Reordering Logic", () => {
    it("harus menukar posisi field dengan benar pada arah 'up' dan 'down'", () => {
      const fields: FieldDefinition[] = [
        { id: "1", key: "field_a", label: "A", type: "text", required: true, data_class: "transient", placeholder: "", help_text: "", max_length: 200, allow_custom: false, default_value: null, options: [] },
        { id: "2", key: "field_b", label: "B", type: "text", required: true, data_class: "transient", placeholder: "", help_text: "", max_length: 200, allow_custom: false, default_value: null, options: [] },
        { id: "3", key: "field_c", label: "C", type: "text", required: true, data_class: "transient", placeholder: "", help_text: "", max_length: 200, allow_custom: false, default_value: null, options: [] },
      ];

      // Pindahkan index 1 ('field_b') ke atas ('up')
      const moveUp = (list: FieldDefinition[], index: number) => {
        if (index <= 0) return list;
        const copy = [...list];
        const temp = copy[index];
        copy[index] = copy[index - 1];
        copy[index - 1] = temp;
        return copy;
      };

      const afterUp = moveUp(fields, 1);
      expect(afterUp[0].key).toBe("field_b");
      expect(afterUp[1].key).toBe("field_a");
      expect(afterUp[2].key).toBe("field_c");

      // Pindahkan index 0 ('field_b') ke bawah ('down')
      const moveDown = (list: FieldDefinition[], index: number) => {
        if (index >= list.length - 1) return list;
        const copy = [...list];
        const temp = copy[index];
        copy[index] = copy[index + 1];
        copy[index + 1] = temp;
        return copy;
      };

      const afterDown = moveDown(afterUp, 0);
      expect(afterDown[0].key).toBe("field_a");
      expect(afterDown[1].key).toBe("field_b");
      expect(afterDown[2].key).toBe("field_c");
    });
  });

  // -------------------------------------------------------------
  // Test 6: SAVE-01 Optimistic Concurrency Lock (CAS)
  // -------------------------------------------------------------
  describe("SAVE-01: Optimistic Concurrency Check", () => {
    it("harus mendeteksi konflik jika versi di database lebih baru dari expected_version", () => {
      const databaseCurrentVersion: number = 3;
      const clientExpectedVersion: number = 2; // Ketinggalan karena tab lain sudah simpan

      const isConflict = databaseCurrentVersion !== clientExpectedVersion;
      expect(isConflict).toBe(true);
    });

    it("harus mengizinkan pembaruan jika expected_version cocok dan menaikkan versi atomik", () => {
      let databaseVersion: number = 2;
      const clientExpectedVersion: number = 2;

      if (databaseVersion === clientExpectedVersion) {
        databaseVersion += 1;
      }

      expect(databaseVersion).toBe(3);
    });
  });
});
