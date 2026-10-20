"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Eye, EyeOff, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { resetPasswordAction } from "@/features/auth/actions";

export default function ResetPasswordPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 12) {
      setError("Password baru harus minimal 12 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak cocok.");
      return;
    }

    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("password", password);
      formData.append("confirmPassword", confirmPassword);

      const result = await resetPasswordAction(formData);
      if (!result.success) {
        setError(result.error || "Gagal memperbarui password.");
      } else {
        setSuccess(true);
      }
    } catch {
      setError("Terjadi kesalahan jaringan. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md flex flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2.5 mx-auto">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-xs">
            <Sparkles className="h-6 w-6" />
          </div>
          <span className="font-bold text-2xl tracking-tight text-text-main">
            PesanRapi
          </span>
        </Link>

        <Card className="modal-shadow">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-xl font-bold">Atur Ulang Password</CardTitle>
            <CardDescription>
              Buat password baru yang aman untuk akun Anda (minimal 12 karakter).
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {success ? (
              <div className="flex flex-col gap-4 text-center py-2">
                <div className="h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-text-main">
                  Password Berhasil Diperbarui
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Silakan masuk menggunakan password baru Anda.
                </p>
                <Link href="/login" className="mt-2">
                  <Button size="lg" className="w-full font-semibold">
                    Masuk Sekarang
                  </Button>
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {error && (
                  <div className="flex items-start gap-2.5 rounded-input bg-danger/10 p-3 text-xs text-danger border border-danger/20">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main" htmlFor="newPassword">
                    Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Minimal 12 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10 pr-10"
                      required
                      minLength={12}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? "Sembunyikan password" : "Lihat password"}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main" htmlFor="confirmNewPassword">
                    Konfirmasi Password Baru
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="confirmNewPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Ketik ulang password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      minLength={12}
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full mt-2 font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Menyimpan...
                    </>
                  ) : (
                    <>
                      Simpan Password Baru <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
