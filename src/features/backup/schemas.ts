import { z } from "zod";
import { FieldDefinitionSchema } from "@/lib/validation/template-schema";
import { FlowNodeSchema } from "@/lib/validation/flow-schema";
import { FieldDefinition } from "@/lib/template-engine/types";
import { FlowNode } from "@/lib/template-engine/flow-types";

// Item Backup Template Linear (v1)
export interface LinearTemplateBackupItem {
  schema_version?: 1;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: FieldDefinition[];
  is_favorite: boolean;
  is_archived: boolean;
}

// Item Backup Template Flow Dinamis (v2)
export interface FlowTemplateBackupItem {
  schema_version: 2;
  title: string;
  description: string;
  category: string;
  rootNodeId: string;
  nodes: FlowNode[];
  is_favorite: boolean;
  is_archived: boolean;
}

export type TemplateBackupItem = LinearTemplateBackupItem | FlowTemplateBackupItem;

export interface BackupFileStructure {
  format: "pesanrapi-template-backup";
  schema_version: 1 | 2;
  exported_at: string;
  templates: TemplateBackupItem[];
}

export const LinearTemplateBackupItemSchema = z
  .object({
    schema_version: z.literal(1).optional().default(1),
    title: z.string().trim().min(1, "Judul template wajib diisi.").max(100),
    description: z.string().max(300).default(""),
    category: z.string().max(50).default(""),
    body: z.string().min(1, "Isi pesan wajib diisi.").max(10000),
    fields: z.array(FieldDefinitionSchema).max(30, "Maksimal 30 variabel input."),
    is_favorite: z.boolean().default(false),
    is_archived: z.boolean().default(false),
  })
  .strict();

export const FlowTemplateBackupItemSchema = z
  .object({
    schema_version: z.literal(2),
    title: z.string().trim().min(1, "Judul template wajib diisi.").max(100),
    description: z.string().max(300).default(""),
    category: z.string().max(50).default(""),
    rootNodeId: z.string().min(1, "Root Node ID wajib diisi."),
    nodes: z.array(FlowNodeSchema).min(1, "Minimal 1 node per flow.").max(50),
    is_favorite: z.boolean().default(false),
    is_archived: z.boolean().default(false),
  })
  .strict();

export const TemplateBackupItemSchema = z.union([
  FlowTemplateBackupItemSchema,
  LinearTemplateBackupItemSchema,
]);

export const BackupFileSchema = z
  .object({
    format: z.literal("pesanrapi-template-backup", {
      error: "Format file tidak valid. Harus 'pesanrapi-template-backup'.",
    }),
    schema_version: z.union([z.literal(1), z.literal(2)], {
      error: "Versi skema backup tidak didukung (harus versi 1 atau 2).",
    }),
    exported_at: z.string().datetime({ message: "Format timestamp tidak valid." }),
    templates: z
      .array(TemplateBackupItemSchema)
      .min(1, "File backup tidak memuat template.")
      .max(50, "Maksimal 50 template per file impor."),
  })
  .strict();
