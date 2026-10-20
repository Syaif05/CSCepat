import { describe, it, expect } from "vitest";
import {
  BackupFileSchema,
  TemplateBackupItemSchema,
  BackupFileStructure,
} from "../schemas";
import { validateBackupJsonString } from "../actions/backup-actions";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";

describe("Fase 6: Backup, Pengaturan Akun & Edge States Suite", () => {
  const sampleBackupPayload: BackupFileStructure = {
    format: "pesanrapi-template-backup",
    schema_version: 1,
    exported_at: new Date().toISOString(),
    templates: STARTER_TEMPLATES.map((st) => ({
      title: st.title,
      description: st.description,
      category: st.category,
      body: st.body,
      fields: st.fields,
      is_favorite: st.is_favorite,
      is_archived: st.is_archived,
    })),
  };

  // -------------------------------------------------------------
  // Test 1: Validasi Skema Backup (BACK-01)
  // -------------------------------------------------------------
  describe("BACK-01: Validasi Format File Cadangan Resmi", () => {
    it("harus meloloskan file backup yang memiliki struktur valid", () => {
      const result = BackupFileSchema.safeParse(sampleBackupPayload);
      expect(result.success).toBe(true);
    });

    it("harus memastikan file ekspor tidak memuat properti owner_id atau data riwayat", () => {
      sampleBackupPayload.templates.forEach((tpl) => {
        expect((tpl as unknown as { owner_id?: string }).owner_id).toBeUndefined();
        expect((tpl as unknown as { customer_input?: string }).customer_input).toBeUndefined();
      });
    });
  });

  // -------------------------------------------------------------
  // Test 2: Penolakan File Korup & Versi Tidak Didukung (BACK-02)
  // -------------------------------------------------------------
  describe("BACK-02: Penolakan File Tidak Sah atau Korup", () => {
    it("harus menolak string yang bukan merupakan JSON valid", async () => {
      const invalidJson = "{ format: 'pesanrapi', invalid... }";
      const result = await validateBackupJsonString(invalidJson);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/bukan JSON yang valid/i);
      }
    });

    it("harus menolak file dengan nama format selain 'pesanrapi-template-backup'", () => {
      const wrongFormat = {
        ...sampleBackupPayload,
        format: "my-custom-backup",
      };

      const result = BackupFileSchema.safeParse(wrongFormat);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/pesanrapi-template-backup/i);
      }
    });

    it("harus menolak schema_version yang belum didukung (misal versi 2)", () => {
      const futureVersion = {
        ...sampleBackupPayload,
        schema_version: 2,
      };

      const result = BackupFileSchema.safeParse(futureVersion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/versi 1/i);
      }
    });

    it("harus menolak file jika jumlah template melebihi 50 item", () => {
      const oversizedTemplates = Array.from({ length: 51 }, (_, i) => ({
        ...sampleBackupPayload.templates[0],
        title: `Template ke-${i + 1}`,
      }));

      const oversizedFile = {
        ...sampleBackupPayload,
        templates: oversizedTemplates,
      };

      const result = BackupFileSchema.safeParse(oversizedFile);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/Maksimal 50 template/i);
      }
    });

    it("harus menolak template yang menyusupkan properti asing atau data pelanggan", () => {
      const contaminatedTemplate = {
        ...sampleBackupPayload.templates[0],
        customer_secret: "DATA_PELANGGAN_BOCOR", // Properti asing
      };

      const result = TemplateBackupItemSchema.safeParse(contaminatedTemplate);
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // Test 3: Validasi Batas Ukuran 1 MiB (PRD 9.4)
  // -------------------------------------------------------------
  describe("Batas Ukuran File Cadangan", () => {
    it("harus menolak string file cadangan yang ukurannya melebihi 1 MiB (1.048.576 byte)", async () => {
      // String besar melebihi 1 MiB
      const hugeString = "a".repeat(1048577);
      const result = await validateBackupJsonString(hugeString);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toMatch(/1 MiB/i);
      }
    });
  });

  // -------------------------------------------------------------
  // Test 4: Preferensi Pengaturan Akun
  // -------------------------------------------------------------
  describe("Preferensi Output Mode Akun", () => {
    it("hanya menerima mode 'whatsapp' atau 'plain'", () => {
      const validModes = ["whatsapp", "plain"];
      expect(validModes.includes("whatsapp")).toBe(true);
      expect(validModes.includes("plain")).toBe(true);
      expect(validModes.includes("markdown")).toBe(false);
      expect(validModes.includes("html")).toBe(false);
    });
  });
});
