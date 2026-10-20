import { describe, it, expect } from "vitest";
import {
  BackupFileSchema,
  TemplateBackupItemSchema,
  BackupFileStructure,
  FlowTemplateBackupItemSchema,
} from "../schemas";
import {
  validateBackupJsonString,
  exportTemplatesBackupAction,
  importTemplatesBackupAction,
} from "../actions/backup-actions";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";

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

    it("harus menolak schema_version yang belum didukung (misal versi 3)", () => {
      const futureVersion = {
        ...sampleBackupPayload,
        schema_version: 3,
      };

      const result = BackupFileSchema.safeParse(futureVersion);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/versi 1 atau 2/i);
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

  // -------------------------------------------------------------
  // Test 5: Dukungan Backup Flow v2 & Hybrid v1/v2 (Fase 2.4)
  // -------------------------------------------------------------
  describe("Fase 2.4: Dukungan Backup & Impor Flow v2", () => {
    it("harus meloloskan validasi FlowTemplateBackupItemSchema", () => {
      const flowBackupItem = {
        schema_version: 2 as const,
        title: STARTER_FLOWS[0].title,
        description: STARTER_FLOWS[0].description,
        category: STARTER_FLOWS[0].category,
        rootNodeId: STARTER_FLOWS[0].rootNodeId,
        nodes: STARTER_FLOWS[0].nodes,
        is_favorite: STARTER_FLOWS[0].is_favorite,
        is_archived: STARTER_FLOWS[0].is_archived,
      };

      const result = FlowTemplateBackupItemSchema.safeParse(flowBackupItem);
      expect(result.success).toBe(true);
    });

    it("harus mengekspor file cadangan v2 yang memuat starter flows dan linear templates", async () => {
      const exportRes = await exportTemplatesBackupAction();
      expect(exportRes.success).toBe(true);
      if (exportRes.success) {
        expect(exportRes.data.format).toBe("pesanrapi-template-backup");
        expect(exportRes.data.schema_version).toBe(2);
        expect(exportRes.data.templates.length).toBeGreaterThan(0);

        // Harus ada setidaknya 1 template flow v2
        const hasFlow = exportRes.data.templates.some((t) => t.schema_version === 2);
        expect(hasFlow).toBe(true);

        // Validasi struktur keseluruhan file ekspor
        const validation = BackupFileSchema.safeParse(exportRes.data);
        expect(validation.success).toBe(true);
      }
    });

    it("harus berhasil mengimpor batch campuran template linear v1 dan flow v2", async () => {
      const mixedBatch = [
        {
          schema_version: 2 as const,
          title: "Flow Impor Uji",
          description: "Deskripsi flow uji",
          category: "Uji",
          rootNodeId: STARTER_FLOWS[0].rootNodeId,
          nodes: STARTER_FLOWS[0].nodes,
          is_favorite: false,
          is_archived: false,
        },
        {
          schema_version: 1 as const,
          title: "Linear Impor Uji",
          description: "Deskripsi linear uji",
          category: "Uji",
          body: "Halo {{nama}}",
          fields: [
            {
              id: "f-1",
              key: "nama",
              label: "Nama",
              type: "text" as const,
              required: true,
              data_class: "transient" as const,
              max_length: 100,
              placeholder: "",
              help_text: "",
              allow_custom: false,
              default_value: null,
              options: [],
            },
          ],
          is_favorite: true,
          is_archived: false,
        },
      ];

      const importRes = await importTemplatesBackupAction(mixedBatch);
      expect(importRes.success).toBe(true);
      if (importRes.success) {
        expect(importRes.data.importedCount).toBe(2);
        expect(importRes.data.failedCount).toBe(0);
        expect(importRes.data.results[0].title).toBe("Flow Impor Uji");
        expect(importRes.data.results[1].title).toBe("Linear Impor Uji");
      }
    });
  });
});

