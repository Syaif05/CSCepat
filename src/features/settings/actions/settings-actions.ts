"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export type OutputModePreference = "whatsapp" | "plain";

export type ActionResponse<T = unknown> =
  | { success: true; data: T }
  | {
      success: false;
      code: "VALIDATION_ERROR" | "UNAUTHENTICATED" | "NETWORK_ERROR";
      error: string;
    };

function isPlaceholderConfig(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  return !url || url.includes("placeholder");
}

/**
 * Mengambil ringkasan akun pengguna yang sedang login
 */
export async function getUserAccountAction(): Promise<
  ActionResponse<{
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
  }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      if (isPlaceholderConfig()) {
        return {
          success: true,
          data: {
            id: "local-dev-user-id",
            email: "cs-demo@pesanrapi.local",
            createdAt: new Date().toISOString(),
            lastSignInAt: new Date().toISOString(),
          },
        };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Silakan login terlebih dahulu.",
      };
    }

    return {
      success: true,
      data: {
        id: user.id,
        email: user.email || "",
        createdAt: user.created_at,
        lastSignInAt: user.last_sign_in_at || null,
      },
    };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Gagal memuat informasi akun.",
    };
  }
}

/**
 * Mengambil preferensi pengguna (default output mode)
 */
export async function getUserSettingsAction(): Promise<
  ActionResponse<{
    defaultOutputMode: OutputModePreference;
  }>
> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        return {
          success: true,
          data: { defaultOutputMode: "whatsapp" },
        };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Sesi login tidak valid.",
      };
    }

    const { data, error } = await supabase
      .from("user_settings")
      .select("default_output_mode")
      .eq("owner_id", user.id)
      .maybeSingle();

    if (error) {
      return {
        success: true,
        data: { defaultOutputMode: "whatsapp" },
      };
    }

    const mode = (data?.default_output_mode as OutputModePreference) || "whatsapp";
    return {
      success: true,
      data: { defaultOutputMode: mode },
    };
  } catch {
    return {
      success: true,
      data: { defaultOutputMode: "whatsapp" },
    };
  }
}

/**
 * Menyimpan preferensi default format output (WhatsApp / Teks Biasa)
 */
export async function updateUserSettingsAction(
  defaultOutputMode: OutputModePreference
): Promise<ActionResponse<{ defaultOutputMode: OutputModePreference }>> {
  try {
    if (defaultOutputMode !== "whatsapp" && defaultOutputMode !== "plain") {
      return {
        success: false,
        code: "VALIDATION_ERROR",
        error: "Format output harus 'whatsapp' atau 'plain'.",
      };
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      if (isPlaceholderConfig()) {
        revalidatePath("/app");
        revalidatePath("/app/settings");
        return {
          success: true,
          data: { defaultOutputMode },
        };
      }
      return {
        success: false,
        code: "UNAUTHENTICATED",
        error: "Sesi login tidak valid.",
      };
    }

    const { error } = await supabase.from("user_settings").upsert(
      {
        owner_id: user.id,
        default_output_mode: defaultOutputMode,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "owner_id" }
    );

    if (error) {
      return {
        success: false,
        code: "NETWORK_ERROR",
        error: "Gagal menyimpan preferensi format.",
      };
    }

    revalidatePath("/app");
    revalidatePath("/app/settings");

    return {
      success: true,
      data: { defaultOutputMode },
    };
  } catch {
    return {
      success: false,
      code: "NETWORK_ERROR",
      error: "Terjadi kesalahan internal saat menyimpan pengaturan.",
    };
  }
}
