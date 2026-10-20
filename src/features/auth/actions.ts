"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const SignUpSchema = z
  .object({
    email: z.string().email("Format email tidak valid"),
    password: z.string().min(12, "Password minimal 12 karakter"),
    confirmPassword: z.string().min(12, "Konfirmasi password minimal 12 karakter"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

const SignInSchema = z.object({
  email: z.string().email("Format email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

const ResetRequestSchema = z.object({
  email: z.string().email("Format email tidak valid"),
});

const UpdatePasswordSchema = z
  .object({
    password: z.string().min(12, "Password minimal 12 karakter"),
    confirmPassword: z.string().min(12, "Konfirmasi password minimal 12 karakter"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Konfirmasi password tidak cocok",
    path: ["confirmPassword"],
  });

export interface AuthActionResult {
  success: boolean;
  error?: string;
  message?: string;
}

export async function signUpAction(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parseResult = SignUpSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0].message,
    };
  }

  const { email, password } = parseResult.data;
  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.APP_URL || "http://localhost:3000";

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/confirm?next=/app`,
    },
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Gagal mendaftarkan akun. Silakan coba beberapa saat lagi.",
    };
  }

  return {
    success: true,
  };
}

export async function signInAction(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const parseResult = SignInSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0].message,
    };
  }

  const { email, password } = parseResult.data;
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    // Sesuai PRD 15.2: Tampilkan pesan netral, jangan membocorkan apakah email terdaftar
    return {
      success: false,
      error: "Email atau password yang Anda masukkan tidak sesuai.",
    };
  }

  return {
    success: true,
  };
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordResetAction(
  formData: FormData
): Promise<AuthActionResult> {
  const email = formData.get("email") as string;
  const parseResult = ResetRequestSchema.safeParse({ email });

  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0].message,
    };
  }

  const headerList = await headers();
  const origin = headerList.get("origin") || process.env.APP_URL || "http://localhost:3000";
  const supabase = await createClient();

  await supabase.auth.resetPasswordForEmail(parseResult.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/reset-password`,
  });

  // PRD 15.2: Selalu berikan respons netral terlepas dari ada/tidaknya email
  return {
    success: true,
    message:
      "Jika alamat email terdaftar, instruksi atur ulang password telah dikirim ke kotak masuk Anda.",
  };
}

export async function resetPasswordAction(formData: FormData): Promise<AuthActionResult> {
  const rawData = {
    password: formData.get("password") as string,
    confirmPassword: formData.get("confirmPassword") as string,
  };

  const parseResult = UpdatePasswordSchema.safeParse(rawData);
  if (!parseResult.success) {
    return {
      success: false,
      error: parseResult.error.issues[0].message,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({
    password: parseResult.data.password,
  });

  if (error) {
    return {
      success: false,
      error: error.message || "Gagal memperbarui password. Sesi pemulihan mungkin sudah kedaluwarsa.",
    };
  }

  return {
    success: true,
  };
}
