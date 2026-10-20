"use client";

import React, { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { UserSettingsForm } from "@/features/settings/components/UserSettingsForm";
import { BackupManager } from "@/features/backup/components/BackupManager";
import {
  getUserAccountAction,
  getUserSettingsAction,
  OutputModePreference,
} from "@/features/settings/actions/settings-actions";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [defaultMode, setDefaultMode] = useState<OutputModePreference>("whatsapp");
  const [accountInfo, setAccountInfo] = useState<{
    id: string;
    email: string;
    createdAt: string;
    lastSignInAt: string | null;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [accountRes, settingsRes] = await Promise.all([
          getUserAccountAction(),
          getUserSettingsAction(),
        ]);

        if (isMounted) {
          if (accountRes.success) {
            setAccountInfo(accountRes.data);
          }
          if (settingsRes.success) {
            setDefaultMode(settingsRes.data.defaultOutputMode);
          }
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-20">
      {/* Header Halaman */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-text-main">
          Pengaturan Akun & Cadangan
        </h1>
        <p className="text-xs sm:text-sm text-text-muted mt-1">
          Kelola preferensi default salin pesan, informasi akun, dan berkas pencadangan (backup) JSON template Anda.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Memuat pengaturan akun...</span>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Formulir Pengaturan Format & Info Akun */}
          <UserSettingsForm
            initialDefaultMode={defaultMode}
            accountInfo={accountInfo}
          />

          {/* Pengelola Ekspor & Impor Cadangan */}
          <BackupManager />
        </div>
      )}
    </div>
  );
}
