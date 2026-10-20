"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  Plus,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Star,
  WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  listTemplatesAction,
  getTemplateAction,
  createTemplateAction,
} from "@/features/templates/actions/template-actions";
import { getUserSettingsAction } from "@/features/settings/actions/settings-actions";
import { TemplateListItem } from "@/lib/template-engine/types";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";
import { useGeneratorState } from "@/features/generator/hooks/useGeneratorState";
import { TemplateSelector } from "@/features/generator/components/TemplateSelector";
import { DynamicForm } from "@/features/generator/components/DynamicForm";
import { MessagePreview } from "@/features/generator/components/MessagePreview";
import { GeneratorActions } from "@/features/generator/components/GeneratorActions";
import { FallbackCopyDialog } from "@/features/generator/components/FallbackCopyDialog";

export default function GeneratorPage() {
  const [templateList, setTemplateList] = useState<TemplateListItem[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [isInitializingStarters, setIsInitializingStarters] = useState(false);
  const [isOffline, setIsOffline] = useState(false);

  const {
    selectedTemplate,
    selectTemplate,
    values,
    setValue,
    outputMode,
    setOutputMode,
    activePreviewTab,
    setActivePreviewTab,
    copyStatus,
    isFallbackOpen,
    setIsFallbackOpen,
    isResetConfirmOpen,
    isSwitchConfirmOpen,
    toastMessage,
    missingRequiredFields,
    isValidToCopy,
    previewRender,
    finalRender,
    firstInputRef,
    confirmSwitchTemplate,
    cancelSwitchTemplate,
    triggerResetCustomer,
    confirmResetCustomer,
    cancelResetCustomer,
    copyToClipboard,
  } = useGeneratorState();

  // Deteksi status koneksi offline/online (PRD 11.5 & NET-01)
  useEffect(() => {
    const handleStatus = () => setIsOffline(!navigator.onLine);
    handleStatus();
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  // Load daftar template saat halaman pertama kali dibuka
  const loadTemplates = async () => {
    setLoadingList(true);
    try {
      const res = await listTemplatesAction({ filter: "all" });
      if (res.success) {
        setTemplateList(res.data);
      }
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      listTemplatesAction({ filter: "all" }),
      getUserSettingsAction(),
    ])
      .then(([templatesRes, settingsRes]) => {
        if (isMounted) {
          if (templatesRes.success) {
            setTemplateList(templatesRes.data);
          }
          if (settingsRes.success && settingsRes.data.defaultOutputMode) {
            setOutputMode(settingsRes.data.defaultOutputMode);
          }
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingList(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [setOutputMode]);

  // Inisialisasi cepat 6 starter template jika akun baru belum memiliki template
  const handleLoadStarters = async () => {
    setIsInitializingStarters(true);
    try {
      for (const starter of STARTER_TEMPLATES) {
        await createTemplateAction(starter);
      }
      await loadTemplates();
    } finally {
      setIsInitializingStarters(false);
    }
  };

  // Pilih template langsung dari rekomendasi kartu kosong
  const handleDirectSelect = async (item: TemplateListItem) => {
    const res = await getTemplateAction(item.id);
    if (res.success) {
      selectTemplate(res.data);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-28 lg:pb-12 max-w-7xl mx-auto">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 rounded-pill bg-text-main text-surface px-4 py-2.5 shadow-lg flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Offline Alert Banner (PRD 11.5 & NET-01) */}
      {isOffline && (
        <div className="rounded-input bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex items-center gap-2.5 animate-in fade-in">
          <WifiOff className="h-4 w-4 shrink-0 text-amber-600" />
          <span>
            <strong>Mode Terputus (Offline):</strong> Koneksi internet Anda sedang terputus. Generator tetap dapat melakukan substitusi dan menyalin pesan di memori lokal.
          </span>
        </div>
      )}

      {/* Header Halaman & Pemilih Template */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border-subtle pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">
            Buat Pesan
          </h1>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Pilih template, isi data pelanggan, lalu salin pesan yang sudah rapi dan siap dikirim.
          </p>
        </div>

        {/* Template Selector Trigger */}
        <TemplateSelector
          templates={templateList}
          selectedTemplate={selectedTemplate}
          onSelectTemplate={selectTemplate}
          loading={loadingList}
        />
      </div>

      {/* Area Konten Utama */}
      {loadingList ? (
        <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs">Memuat generator pesan...</span>
        </div>
      ) : templateList.length === 0 ? (
        /* State 1: Belum Ada Template Sama Sekali */
        <Card className="text-center p-8 border-dashed">
          <CardContent className="pt-6 flex flex-col items-center gap-4 max-w-md mx-auto">
            <div className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <Sparkles className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-text-main">
                Belum Ada Template Tersedia
              </h2>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Mulai dengan menggunakan 6 template contoh siap pakai untuk customer service, atau buat template kustom Anda sendiri.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleLoadStarters}
                disabled={isInitializingStarters}
                className="font-semibold"
              >
                {isInitializingStarters ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Menyiapkan Contoh...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Gunakan 6 Template Contoh
                  </>
                )}
              </Button>

              <Link href="/app/templates/new">
                <Button variant="secondary" size="sm">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  Buat Template Baru
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : !selectedTemplate ? (
        /* State 2: Belum Memilih Template (PRD 7.1 & 11.5) */
        <div className="flex flex-col gap-6 py-4">
          <div className="rounded-card bg-surface p-6 border border-border-subtle shadow-xs">
            <h2 className="text-base font-semibold text-text-main mb-1">
              Silakan Pilih Template Pesan
            </h2>
            <p className="text-xs text-text-muted max-w-xl leading-relaxed">
              Pilih salah satu template di bawah atau gunakan menu pilihan di pojok kanan atas untuk menampilkan formulir isian otomatis.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-5">
              {templateList.slice(0, 6).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => handleDirectSelect(tpl)}
                  className="p-4 rounded-input border border-border-subtle bg-input-bg/40 hover:bg-surface hover:border-primary/50 transition-all text-left flex flex-col justify-between group"
                >
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {tpl.category || "Umum"}
                      </Badge>
                      {tpl.is_favorite && (
                        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-500 shrink-0" />
                      )}
                    </div>
                    <span className="font-semibold text-xs text-text-main group-hover:text-primary transition-colors">
                      {tpl.title}
                    </span>
                    {tpl.description && (
                      <p className="text-[11px] text-text-muted line-clamp-2 leading-relaxed">
                        {tpl.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-border-subtle text-[11px] text-text-muted">
                    <span>{tpl.field_count} variabel</span>
                    <span className="text-primary font-medium flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                      Gunakan <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* State 3: Template Terpilih -> Tampilkan 2 Kolom Kerja (Form & Preview) */
        <div className="flex flex-col gap-6">
          {/* Deskripsi & Ringkasan Template Aktif */}
          <div className="flex items-center justify-between bg-surface p-3.5 rounded-input border border-border-subtle text-xs">
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">
                {selectedTemplate.category || "Umum"}
              </Badge>
              <span className="font-semibold text-text-main">
                {selectedTemplate.title}
              </span>
              {selectedTemplate.description && (
                <span className="text-text-muted hidden sm:inline">
                  — {selectedTemplate.description}
                </span>
              )}
            </div>

            <Link
              href={`/app/templates/${selectedTemplate.id}/edit`}
              className="text-[11px] text-primary hover:underline font-medium shrink-0"
            >
              Ubah Template
            </Link>
          </div>

          {/* Grid 2 Kolom (PRD 11.3: Desktop 45% Form, 55% Preview, gap 24px) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Kolom Kiri: Formulir Dinamis (lg:col-span-5) */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <DynamicForm
                fields={selectedTemplate.fields}
                values={values}
                onChange={setValue}
                outputMode={outputMode}
                firstInputRef={firstInputRef}
              />
            </div>

            {/* Kolom Kanan: Pratinjau Pesan (lg:col-span-7) */}
            <div className="lg:col-span-7 flex flex-col gap-4">
              <MessagePreview
                previewText={previewRender.text}
                rawText={finalRender.text}
                outputMode={outputMode}
                setOutputMode={setOutputMode}
                activePreviewTab={activePreviewTab}
                setActivePreviewTab={setActivePreviewTab}
                missingRequiredFields={missingRequiredFields}
                hasTemplate={true}
              />
            </div>
          </div>

          {/* Bar Aksi: Salin & Reset */}
          <GeneratorActions
            isValidToCopy={isValidToCopy}
            copyStatus={copyStatus}
            onCopy={copyToClipboard}
            onReset={triggerResetCustomer}
            isResetConfirmOpen={isResetConfirmOpen}
            onConfirmReset={confirmResetCustomer}
            onCancelReset={cancelResetCustomer}
            isSwitchConfirmOpen={isSwitchConfirmOpen}
            onConfirmSwitch={confirmSwitchTemplate}
            onCancelSwitch={cancelSwitchTemplate}
            missingCount={missingRequiredFields.length}
          />
        </div>
      )}

      {/* Fallback Manual Copy Dialog (CLIP-01) */}
      <FallbackCopyDialog
        isOpen={isFallbackOpen}
        onClose={() => setIsFallbackOpen(false)}
        text={finalRender.text}
      />
    </div>
  );
}
