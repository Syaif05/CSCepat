"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  BackupFileStructure,
  TemplateBackupItem,
  BackupFileSchema,
  FlowTemplateBackupItem,
  LinearTemplateBackupItem,
} from "../schemas";
import { FieldDefinition } from "@/lib/template-engine/types";
import { createTemplateAction } from "@/features/templates/actions/template-actions";
import { createFlowTemplateAction } from "@/features/templates/actions/flow-template-actions";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "NETWORK_ERROR";
      error: string;
      details?: unknown;
    };

function isPlaceholderConfig(): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) {
    return true;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

/**
 * Ekspor definisi seluruh template (linear v1 & flow v2) milik akun aktif
 * PRD 17: File tidak membawa owner_id, token, password, atau data pelanggan.
 */
export async function exportTemplatesBackupAction(): Promise<
  ActionResponse<BackupFileStructure>
> {
  try {
    if (isPlaceholderConfig()) {
      const dummyBackup: BackupFileStructure = {
        format: "pesanrapi-template-backup",
        schema_version: 2,
        exported_at: new Date().toISOString(),
        templates: [
          ...STARTER_FLOWS.map((sf) => ({
            schema_version: 2 as const,
            title: sf.title,
            description: sf.description,
            category: sf.category,
            rootNodeId: sf.rootNodeId,
            nodes: sf.nodes,
            is_favorite: sf.is_favorite,
            is_archived: sf.is_archived,
          })),
          ...STARTER_TEMPLATES.map((st) => ({
            schema_version: 1 as const,
            title: st.title,
            description: st.description,
            category: st.category,
            body: st.body,
            fields: st.fields,
            is_favorite: st.is_favorite,
            is_archived: st.is_archived,
          })),
        ],
      };
      return { success: true, data: dummyBackup };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Silakan masuk ke akun Anda terlebih dahulu.",
      };
    }

    const { data, error } = await supabase
      .from("templates")
      .select("title, description, category, body, fields, is_favorite, is_archived, schema_version")
      .order("created_at", { ascending: true });

    if (error) {
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Gagal mengambil data template untuk diekspor.",
      };
    }

    const cleanTemplates: TemplateBackupItem[] = (data || []).map((row) => {
      if (row.schema_version === 2) {
        let flowData = { rootNodeId: "node-pembuka", nodes: [] };
        try {
          flowData = JSON.parse(row.body);
        } catch {
          // fallback
        }

        const flowItem: FlowTemplateBackupItem = {
          schema_version: 2,
          title: row.title,
          description: row.description || "",
          category: row.category || "",
          rootNodeId: flowData.rootNodeId,
          nodes: flowData.nodes,
          is_favorite: row.is_favorite,
          is_archived: row.is_archived,
        };
        return flowItem;
      }

      const linearItem: LinearTemplateBackupItem = {
        schema_version: 1,
        title: row.title,
        description: row.description || "",
        category: row.category || "",
        body: row.body,
        fields: (row.fields as unknown as FieldDefinition[]) || [],
        is_favorite: row.is_favorite,
        is_archived: row.is_archived,
      };
      return linearItem;
    });

    const backupPayload: BackupFileStructure = {
      format: "pesanrapi-template-backup",
      schema_version: 2,
      exported_at: new Date().toISOString(),
      templates: cleanTemplates,
    };

    return {
      success: true,
      data: backupPayload,
    };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Terjadi kesalahan sistem saat mengekspor template.",
    };
  }
}

export interface ImportItemResult {
  title: string;
  success: boolean;
  error?: string;
  item: TemplateBackupItem;
}

export interface ImportSummary {
  importedCount: number;
  failedCount: number;
  results: ImportItemResult[];
}

/**
 * Impor item template satu per satu ke database (mendukung linear v1 & flow v2)
 * PRD 17 & 9.4: Item diimpor berurutan dengan hasil per item.
 */
export async function importTemplatesBackupAction(
  templates: TemplateBackupItem[]
): Promise<ActionResponse<ImportSummary>> {
  try {
    if (!Array.isArray(templates) || templates.length === 0) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Tidak ada data template yang akan diimpor.",
      };
    }

    if (templates.length > 50) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Jumlah template melebihi batas maksimal 50 item per impor.",
      };
    }

    const results: ImportItemResult[] = [];
    let importedCount = 0;
    let failedCount = 0;

    for (const item of templates) {
      if (item.schema_version === 2) {
        const flowItem = item as FlowTemplateBackupItem;
        const res = await createFlowTemplateAction({
          id: crypto.randomUUID(),
          title: flowItem.title,
          description: flowItem.description || "",
          category: flowItem.category || "",
          schema_version: 2,
          version: 1,
          rootNodeId: flowItem.rootNodeId,
          nodes: flowItem.nodes,
          is_favorite: flowItem.is_favorite ?? false,
          is_archived: flowItem.is_archived ?? false,
        });

        if (res.success) {
          importedCount += 1;
          results.push({
            title: item.title,
            success: true,
            item,
          });
        } else {
          failedCount += 1;
          results.push({
            title: item.title,
            success: false,
            error: res.error || "Gagal menyimpan flow template.",
            item,
          });
        }
      } else {
        const linearItem = item as LinearTemplateBackupItem;
        const res = await createTemplateAction({
          title: linearItem.title,
          description: linearItem.description || "",
          category: linearItem.category || "",
          body: linearItem.body,
          fields: linearItem.fields || [],
          is_favorite: linearItem.is_favorite ?? false,
          is_archived: linearItem.is_archived ?? false,
          starter_key: null,
          schema_version: 1,
          version: 1,
        });

        if (res.success) {
          importedCount += 1;
          results.push({
            title: item.title,
            success: true,
            item,
          });
        } else {
          failedCount += 1;
          results.push({
            title: item.title,
            success: false,
            error: res.error || "Gagal menyimpan template.",
            item,
          });
        }
      }
    }

    try {
      revalidatePath("/app/templates");
      revalidatePath("/app");
    } catch {
      // safe in test runner
    }

    return {
      success: true,
      data: {
        importedCount,
        failedCount,
        results,
      },
    };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Terjadi gangguan saat memproses impor template.",
    };
  }
}

/**
 * Validasi string isi file JSON sebelum dikirim ke database
 */
export async function validateBackupJsonString(
  jsonString: string
): Promise<ActionResponse<BackupFileStructure>> {
  try {
    // 1. Cek ukuran UTF-8 (maks 1 MiB = 1.048.576 byte)
    const byteLength = new TextEncoder().encode(jsonString).length;
    if (byteLength > 1048576) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Ukuran file melebihi batas maksimal 1 MiB.",
      };
    }

    // 2. Parse JSON
    let parsed: unknown;
    try {
      parsed = JSON.parse(jsonString);
    } catch {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Format file rusak atau bukan JSON yang valid.",
      };
    }

    // 3. Validasi Zod Skema Backup
    const validation = BackupFileSchema.safeParse(parsed);
    if (!validation.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: validation.error.issues[0]?.message || "Struktur file backup tidak valid.",
        details: validation.error.issues,
      };
    }

    return {
      success: true,
      data: validation.data as BackupFileStructure,
    };
  } catch {
    return {
      success: false,
      code: "VALIDATION_ERROR",
      error: "Gagal memverifikasi file backup.",
    };
  }
}
