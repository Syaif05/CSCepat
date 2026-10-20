"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MailCheck, ArrowLeft, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export default function CheckEmailPage() {
  const [cooldown, setCooldown] = useState(0);

  const handleResend = () => {
    setCooldown(60);
    const timer = setInterval(() => {
      setCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
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

        <Card className="modal-shadow text-center">
          <CardHeader className="pb-2">
            <div className="h-16 w-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3">
              <MailCheck className="h-8 w-8" />
            </div>
            <CardTitle className="text-xl font-bold">Periksa Email Anda</CardTitle>
            <CardDescription className="max-w-sm mx-auto">
              Kami telah mengirimkan tautan konfirmasi pendaftaran. Buka email Anda dan klik tautan untuk mengaktifkan akun.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col gap-4">
            <div className="rounded-input bg-input-bg p-4 border border-border-subtle text-xs text-text-muted leading-relaxed">
              Jika email belum masuk setelah beberapa menit, periksa folder Spam atau minta pengiriman ulang.
            </div>

            <Button
              variant="secondary"
              size="default"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="w-full"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${cooldown > 0 ? "animate-spin" : ""}`} />
              {cooldown > 0 ? `Kirim ulang dalam ${cooldown}d` : "Kirim Ulang Email Verifikasi"}
            </Button>

            <Link href="/login" className="mt-2">
              <Button variant="ghost" size="sm" className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Kembali ke Halaman Masuk
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
