import { z } from "zod";
import { FieldDefinitionSchema } from "@/lib/validation/template-schema";
import { FieldDefinition } from "@/lib/template-engine/types";

export interface TemplateBackupItem {
  title: string;
  description: string;
  category: string;
  body: string;
  fields: FieldDefinition[];
  is_favorite: boolean;
  is_archived: boolean;
}

export interface BackupFileStructure {
  format: "pesanrapi-template-backup";
  schema_version: 1;
  exported_at: string;
  templates: TemplateBackupItem[];
}

export const TemplateBackupItemSchema = z
  .object({
    title: z.string().trim().min(1, "Judul template wajib diisi.").max(100),
    description: z.string().max(300).default(""),
    category: z.string().max(50).default(""),
    body: z.string().min(1, "Isi pesan wajib diisi.").max(10000),
    fields: z.array(FieldDefinitionSchema).max(30, "Maksimal 30 variabel input."),
    is_favorite: z.boolean().default(false),
    is_archived: z.boolean().default(false),
  })
  .strict(); // Menolak properti asing / tidak sah

export const BackupFileSchema = z
  .object({
    format: z.literal("pesanrapi-template-backup", {
      error: "Format file tidak valid. Harus 'pesanrapi-template-backup'.",
    }),
    schema_version: z.literal(1, {
      error: "Versi skema backup tidak didukung (harus versi 1).",
    }),
    exported_at: z.string().datetime({ message: "Format timestamp tidak valid." }),
    templates: z
      .array(TemplateBackupItemSchema)
      .min(1, "File backup tidak memuat template.")
      .max(50, "Maksimal 50 template per file impor."),
  })
  .strict();
