"use client";

import React, { useState } from "react";
import {
  Settings,
  User,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Save,
  MessageSquare,
  FileText,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import {
  updateUserSettingsAction,
  OutputModePreference,
} from "../actions/settings-actions";

interface UserSettingsFormProps {
  initialDefaultMode: OutputModePreference;
  accountInfo: {
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
  } | null;
}

export function UserSettingsForm({
  initialDefaultMode,
  accountInfo,
}: UserSettingsFormProps) {
  const [outputMode, setOutputMode] = useState<OutputModePreference>(initialDefaultMode);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSavePreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const res = await updateUserSettingsAction(outputMode);
      if (res.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(res.error || "Gagal menyimpan preferensi.");
      }
    } catch {
      setSaveError("Terjadi gangguan jaringan saat menyimpan pengaturan.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Pengaturan Format Output Default */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Settings className="h-4 w-4 text-primary" />
            Preferensi Format Output
          </CardTitle>
          <CardDescription className="text-xs">
            Tentukan format pesan bawaan yang akan otomatis terpilih saat Anda membuka halaman Buat Pesan.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-5">
          <form onSubmit={handleSavePreferences} className="flex flex-col gap-4">
            {saveError && (
              <div className="rounded-input bg-danger/10 p-3 text-xs text-danger border border-danger/20 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>{saveError}</span>
              </div>
            )}

            {saveSuccess && (
              <div className="rounded-input bg-success/10 p-3 text-xs text-success border border-success/20 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Preferensi format default berhasil disimpan.</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={`p-4 rounded-input border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  outputMode === "whatsapp"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border-subtle bg-input-bg/40 text-text-muted hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-xs text-text-main">
                      Format WhatsApp
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="default_output_mode"
                    value="whatsapp"
                    checked={outputMode === "whatsapp"}
                    onChange={() => setOutputMode("whatsapp")}
                    className="text-primary mt-0.5"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Menyertakan penanda format bold bintang (*teks*) yang otomatis menjadi tebal saat ditempel ke chat WhatsApp.
                </p>
              </label>

              <label
                className={`p-4 rounded-input border cursor-pointer transition-all flex flex-col justify-between gap-3 ${
                  outputMode === "plain"
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-border-subtle bg-input-bg/40 text-text-muted hover:border-primary/40"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 shrink-0" />
                    <span className="font-semibold text-xs text-text-main">
                      Format Teks Biasa
                    </span>
                  </div>
                  <input
                    type="radio"
                    name="default_output_mode"
                    value="plain"
                    checked={outputMode === "plain"}
                    onChange={() => setOutputMode("plain")}
                    className="text-primary mt-0.5"
                  />
                </div>
                <p className="text-[11px] leading-relaxed text-text-muted">
                  Format teks murni tanpa penanda khusus, cocok untuk email, SMS, atau sistem tiket internal.
                </p>
              </label>
            </div>

            <div className="flex justify-end pt-2 border-t border-border-subtle">
              <Button
                type="submit"
                disabled={isSaving}
                size="sm"
                className="font-semibold min-w-[140px]"
              >
                {isSaving ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5 mr-1.5" />
                    Simpan Preferensi
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Informasi Akun */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Informasi Akun
          </CardTitle>
          <CardDescription className="text-xs">
            Data autentikasi dan status sesi akun Anda saat ini.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 bg-input-bg rounded-input border border-border-subtle flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-semibold">
                Email Pengguna
              </span>
              <span className="font-semibold text-text-main">
                {accountInfo?.email || "Belum dimuat"}
              </span>
            </div>

            <div className="p-3 bg-input-bg rounded-input border border-border-subtle flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-semibold">
                Status Sesi
              </span>
              <div className="flex items-center gap-1.5 text-success font-semibold">
                <Shield className="h-3.5 w-3.5" />
                <span>Terautentikasi (Supabase SSR)</span>
              </div>
            </div>

            <div className="p-3 bg-input-bg rounded-input border border-border-subtle flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-semibold">
                Waktu Pendaftaran
              </span>
              <span className="text-text-muted font-mono text-[11px]">
                {accountInfo?.createdAt
                  ? new Date(accountInfo.createdAt).toLocaleString("id-ID")
                  : "-"}
              </span>
            </div>

            <div className="p-3 bg-input-bg rounded-input border border-border-subtle flex flex-col gap-1">
              <span className="text-[10px] text-text-muted uppercase font-semibold">
                User ID Akun
              </span>
              <span className="text-text-muted font-mono text-[10px] truncate" title={accountInfo?.id}>
                {accountInfo?.id || "-"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
