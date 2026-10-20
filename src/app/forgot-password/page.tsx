"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, Mail, ArrowLeft, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requestPasswordResetAction } from "@/features/auth/actions";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append("email", email);

      const result = await requestPasswordResetAction(formData);
      if (!result.success) {
        setError(result.error || "Gagal memproses permintaan.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Terjadi gangguan koneksi. Silakan coba lagi.");
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
            <CardTitle className="text-xl font-bold">Lupa Password</CardTitle>
            <CardDescription>
              Masukkan alamat email terdaftar untuk menerima tautan atur ulang password.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            {submitted ? (
              <div className="flex flex-col gap-4 text-center py-2">
                <div className="h-12 w-12 rounded-full bg-success/10 text-success flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-6 w-6" />
                </div>
                <div className="text-sm font-semibold text-text-main">
                  Permintaan Terkirim
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Jika alamat email terdaftar di sistem kami, Anda akan menerima instruksi pemulihan dalam beberapa saat.
                </p>
                <Link href="/login" className="mt-2">
                  <Button variant="secondary" size="default" className="w-full">
                    Kembali ke Halaman Masuk
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
                  <label className="text-xs font-semibold text-text-main" htmlFor="email">
                    Alamat Email
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="nama@perusahaan.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <Button type="submit" size="lg" className="w-full mt-2 font-semibold" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Mengirimkan...
                    </>
                  ) : (
                    <>
                      Kirim Tautan Pemulihan <ArrowRight className="h-4 w-4 ml-1.5" />
                    </>
                  )}
                </Button>

                <div className="mt-4 text-center">
                  <Link
                    href="/login"
                    className="inline-flex items-center text-xs text-text-muted hover:text-text-main"
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Batal dan kembali ke halaman masuk
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
