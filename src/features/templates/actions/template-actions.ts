"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import {
  TemplateDefinition,
  FieldDefinition,
  TemplateListItem,
} from "@/lib/template-engine/types";
import { TemplateDefinitionSchema } from "@/lib/validation/template-schema";
import { parseTemplate, validateTemplateVariables } from "@/lib/template-engine/parser";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "NOT_AVAILABLE" | "CONFLICT" | "NETWORK_ERROR";
      error: string;
      details?: unknown;
    };

function isPlaceholderConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

/**
 * Mengambil daftar ringkasan template milik akun aktif
 * Mendukung filter pencarian, kategori, dan tab (all / favorite / archived)
 */
export async function listTemplatesAction(filterOptions?: {
  search?: string;
  category?: string;
  filter?: "all" | "favorite" | "archived";
}): Promise<ActionResponse<TemplateListItem[]>> {
  try {
    const supabase = await createClient();

    // Cek autentikasi
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        // Fallback untuk mode development tanpa kredensial Supabase
        const starterList: TemplateListItem[] = [
          ...STARTER_FLOWS.map((sf, idx) => {
            const totalFields = sf.nodes.reduce(
              (acc, n) => acc + n.fields.length,
              0
            );
            return {
              id: sf.id || `starter-flow-${idx + 1}`,
              title: sf.title,
              description: sf.description,
              category: sf.category,
              field_count: totalFields,
              is_favorite: sf.is_favorite,
              is_archived: sf.is_archived,
              starter_key: sf.starter_key || null,
              schema_version: 2,
              version: sf.version,
              updated_at: new Date().toISOString(),
            };
          }),
          ...STARTER_TEMPLATES.map((st, idx) => ({
            id: `local-starter-${idx + 1}`,
            title: st.title,
            description: st.description,
            category: st.category,
            field_count: st.fields.length,
            is_favorite: st.is_favorite,
            is_archived: st.is_archived,
            starter_key: st.starter_key || null,
            schema_version: 1,
            version: st.version,
            updated_at: new Date().toISOString(),
          })),
        ];
        return { success: true, data: starterList };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Silakan masuk ke akun Anda terlebih dahulu.",
      };
    }

    // Query hanya metadata (tanpa kolom body dan fields yang besar)
    let query = supabase
      .from("templates")
      .select("id, title, description, category, fields, is_favorite, is_archived, starter_key, schema_version, version, updated_at")
      .order("updated_at", { ascending: false });

    if (filterOptions?.filter === "favorite") {
      query = query.eq("is_favorite", true).eq("is_archived", false);
    } else if (filterOptions?.filter === "archived") {
      query = query.eq("is_archived", true);
    } else {
      query = query.eq("is_archived", false);
    }

    if (filterOptions?.category) {
      query = query.eq("category", filterOptions.category);
    }

    if (filterOptions?.search) {
      query = query.or(
        `title.ilike.%${filterOptions.search}%,category.ilike.%${filterOptions.search}%`
      );
    }

    const { data, error } = await query;

    if (error) {
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Gagal mengambil daftar template. Silakan muat ulang.",
      };
    }

    const items: TemplateListItem[] = (data || []).map((row) => {
      const fieldsArray = Array.isArray(row.fields) ? row.fields : [];
      return {
        id: row.id,
        title: row.title,
        description: row.description,
        category: row.category,
        field_count: fieldsArray.length,
        is_favorite: row.is_favorite,
        is_archived: row.is_archived,
        starter_key: row.starter_key,
        schema_version: row.schema_version || 1,
        version: row.version,
        updated_at: row.updated_at,
      };
    });

    return { success: true, data: items };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Terjadi kesalahan internal saat memuat template.",
    };
  }
}

/**
 * Mengambil definisi lengkap satu template berdasarkan ID
 * PRD 16: Template tidak ditemukan atau milik orang lain mendapat respons netral
 */
export async function getTemplateAction(
  id: string
): Promise<ActionResponse<TemplateDefinition>> {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        const foundFlow = STARTER_FLOWS.find((f) => f.id === id);
        if (foundFlow) {
          return {
            success: true,
            data: {
              id: foundFlow.id,
              title: foundFlow.title,
              description: foundFlow.description,
              category: foundFlow.category,
              body: JSON.stringify({
                rootNodeId: foundFlow.rootNodeId,
                nodes: foundFlow.nodes,
              }),
              fields: [],
              is_favorite: foundFlow.is_favorite,
              is_archived: foundFlow.is_archived,
              starter_key: foundFlow.starter_key,
              schema_version: 2,
              version: foundFlow.version,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
          };
        }
        const starterIndex = parseInt(id.replace("local-starter-", ""), 10) - 1;
        const found = STARTER_TEMPLATES[starterIndex] || STARTER_TEMPLATES[0];
        return {
          success: true,
          data: { ...found, id },
        };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Silakan masuk ke akun Anda terlebih dahulu.",
      };
    }

    const { data, error } = await supabase
      .from("templates")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error || !data) {
      // Sesuai PRD 16: Pesan netral "Template tidak tersedia"
      return {
        success: false,
        code: "NOT_AVAILABLE",
        error: "Template tidak tersedia.",
      };
    }

    const template: TemplateDefinition = {
      id: data.id,
      owner_id: data.owner_id,
      title: data.title,
      description: data.description,
      category: data.category,
      body: data.body,
      fields: (data.fields as unknown as FieldDefinition[]) || [],
      is_favorite: data.is_favorite,
      is_archived: data.is_archived,
      starter_key: data.starter_key,
      schema_version: data.schema_version,
      version: data.version,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return { success: true, data: template };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Gagal memuat template.",
    };
  }
}

/**
 * Membuat template baru secara atomik
 * Mendukung idempotensi via custom ID / requestId (SAVE-02)
 */
export async function createTemplateAction(
  templateData: Omit<TemplateDefinition, "id" | "owner_id" | "created_at" | "updated_at">,
  requestId?: string
): Promise<ActionResponse<TemplateDefinition>> {
  try {
    // 1. Validasi Zod
    const parseResult = TemplateDefinitionSchema.safeParse(templateData);
    if (!parseResult.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parseResult.error.issues[0]?.message || "Format template tidak valid.",
        details: parseResult.error.issues,
      };
    }

    // 2. Validasi Parser & Kecocokan Variabel (PRD 8.3 & DEF-01)
    let ast;
    try {
      ast = parseTemplate(templateData.body);
    } catch (parseErr) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: (parseErr as Error).message,
      };
    }

    const fieldKeys = templateData.fields.map((f) => f.key);
    const varValidation = validateTemplateVariables(ast, fieldKeys);
    if (!varValidation.isValid) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: varValidation.errors[0] || "Variabel dalam pesan tidak cocok dengan input formulir.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        const mockNew: TemplateDefinition = {
          ...templateData,
          id: requestId || crypto.randomUUID(),
          version: 1,
          schema_version: 1,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        revalidatePath("/app/templates");
        return { success: true, data: mockNew };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Sesi login tidak valid.",
      };
    }

    // Gunakan requestId yang sama bila ada untuk idempotensi (SAVE-02)
    const newId = requestId || crypto.randomUUID();

    const insertPayload = {
      id: newId,
      owner_id: user.id,
      title: templateData.title.trim(),
      description: templateData.description.trim(),
      category: templateData.category.trim(),
      body: templateData.body,
      fields: templateData.fields as unknown as import("@/lib/supabase/database.types").Json,
      is_favorite: templateData.is_favorite ?? false,
      is_archived: templateData.is_archived ?? false,
      starter_key: templateData.starter_key || null,
      schema_version: 1,
      version: 1,
    };

    const { data, error } = await supabase
      .from("templates")
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: error.message || "Gagal menyimpan template.",
      };
    }

    revalidatePath("/app/templates");
    revalidatePath("/app");

    return {
      success: true,
      data: {
        ...data,
        fields: (data.fields as unknown as FieldDefinition[]) || [],
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: (err as Error).message || "Terjadi kesalahan saat membuat template.",
    };
  }
}

/**
 * Memperbarui template dengan Optimistic Concurrency Lock (CAS)
 * Mencegah tab kedua menimpa editan tab pertama tanpa sengaja (PRD 8.4, 16, & SAVE-01)
 */
export async function updateTemplateAction(params: {
  id: string;
  expected_version: number;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: FieldDefinition[];
  is_favorite: boolean;
  is_archived: boolean;
}): Promise<ActionResponse<TemplateDefinition>> {
  try {
    // 1. Validasi Zod
    const parseResult = TemplateDefinitionSchema.safeParse({
      id: params.id,
      title: params.title,
      description: params.description,
      category: params.category,
      body: params.body,
      fields: params.fields,
      is_favorite: params.is_favorite,
      is_archived: params.is_archived,
      version: params.expected_version,
    });

    if (!parseResult.success) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: parseResult.error.issues[0]?.message || "Data template tidak valid.",
      };
    }

    // 2. Validasi Parser & Kecocokan Variabel
    let ast;
    try {
      ast = parseTemplate(params.body);
    } catch (parseErr) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: (parseErr as Error).message,
      };
    }

    const fieldKeys = params.fields.map((f) => f.key);
    const varValidation = validateTemplateVariables(ast, fieldKeys);
    if (!varValidation.isValid) {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: varValidation.errors[0] || "Variabel dalam pesan tidak cocok dengan input formulir.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        const mockUpdated: TemplateDefinition = {
          ...params,
          version: params.expected_version + 1,
          schema_version: 1,
          updated_at: new Date().toISOString(),
        };
        revalidatePath("/app/templates");
        return { success: true, data: mockUpdated };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Sesi login tidak valid.",
      };
    }

    // Panggil fungsi RPC update_template_cas
    const { data, error } = await supabase.rpc("update_template_cas", {
      p_template_id: params.id,
      p_expected_version: params.expected_version,
      p_title: params.title.trim(),
      p_description: params.description.trim(),
      p_category: params.category.trim(),
      p_body: params.body,
      p_fields: params.fields as unknown as import("@/lib/supabase/database.types").Json,
      p_is_favorite: params.is_favorite,
      p_is_archived: params.is_archived,
    });

    if (error) {
      // Deteksi jika terjadi konflik versi
      if (error.code === "P0001" || error.message?.includes("CONFLICT_OR_NOT_FOUND")) {
        return {
          success: false,
          code: "CONFLICT",
          error: "Template sudah berubah di tab atau perangkat lain. Muat ulang untuk melihat perubahan terbaru.",
        };
      }
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: error.message || "Gagal memperbarui template.",
      };
    }

    revalidatePath("/app/templates");
    revalidatePath(`/app/templates/${params.id}/edit`);
    revalidatePath("/app");

    return {
      success: true,
      data: {
        ...data,
        fields: (data.fields as unknown as FieldDefinition[]) || [],
      },
    };
  } catch (err) {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: (err as Error).message || "Terjadi kesalahan saat memperbarui template.",
    };
  }
}

/**
 * Menduplikasi template menjadi row baru
 * PRD 8.5 & 16: Judul diberi awalan "Salinan —", version kembali 1, starter_key dikosongkan
 */
export async function duplicateTemplateAction(
  sourceId: string
): Promise<ActionResponse<TemplateDefinition>> {
  try {
    const fetchRes = await getTemplateAction(sourceId);
    if (!fetchRes.success) {
      return fetchRes;
    }

    const source = fetchRes.data;
    const newTitle = `Salinan — ${source.title}`.slice(0, 100);

    return await createTemplateAction({
      title: newTitle,
      description: source.description,
      category: source.category,
      body: source.body,
      fields: source.fields,
      is_favorite: false,
      is_archived: false,
      starter_key: null,
      schema_version: 1,
      version: 1,
    });
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Gagal menduplikasi template.",
    };
  }
}

/**
 * Menghapus template secara permanen
 */
export async function deleteTemplateAction(
  id: string,
  expected_version: number
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        revalidatePath("/app/templates");
        return { success: true, data: true };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Sesi login tidak valid.",
      };
    }

    const { error } = await supabase
      .from("templates")
      .delete()
      .eq("id", id)
      .eq("version", expected_version);

    if (error) {
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Gagal menghapus template.",
      };
    }

    revalidatePath("/app/templates");
    revalidatePath("/app");
    return { success: true, data: true };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Terjadi kesalahan saat menghapus template.",
    };
  }
}

/**
 * Toggle status Favorit secara cepat
 */
export async function toggleFavoriteAction(
  id: string,
  currentFavorite: boolean,
  version: number
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("templates")
      .update({
        is_favorite: !currentFavorite,
        version: version + 1,
      })
      .eq("id", id)
      .eq("version", version);

    if (error) {
      return { success: false, code: "NETWORK_ERROR", error: "Gagal mengubah status favorit." };
    }

    revalidatePath("/app/templates");
    return { success: true, data: !currentFavorite };
  } catch {
    return { success: false, code: "NETWORK_ERROR", error: "Gagal mengubah status favorit." };
  }
}

/**
 * Toggle status Arsip
 */
export async function toggleArchiveAction(
  id: string,
  currentArchived: boolean,
  version: number
): Promise<ActionResponse<boolean>> {
  try {
    const supabase = await createClient();
    const { error } = await supabase
      .from("templates")
      .update({
        is_archived: !currentArchived,
        version: version + 1,
      })
      .eq("id", id)
      .eq("version", version);

    if (error) {
      return { success: false, code: "NETWORK_ERROR", error: "Gagal mengubah status arsip." };
    }

    revalidatePath("/app/templates");
    return { success: true, data: !currentArchived };
  } catch {
    return { success: false, code: "NETWORK_ERROR", error: "Gagal mengubah status arsip." };
  }
}
