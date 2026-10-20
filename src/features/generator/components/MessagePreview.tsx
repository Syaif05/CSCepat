"use client";

import React from "react";
import { Eye, ShieldCheck, AlertCircle, CheckCircle2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldDefinition } from "@/lib/template-engine/types";
import { OutputMode, PreviewTab } from "../hooks/useGeneratorState";

interface MessagePreviewProps {
  previewText: string;
  rawText: string;
  outputMode: OutputMode;
  setOutputMode: (mode: OutputMode) => void;
  activePreviewTab: PreviewTab;
  setActivePreviewTab: (tab: PreviewTab) => void;
  missingRequiredFields: FieldDefinition[];
  hasTemplate: boolean;
}

export function MessagePreview({
  previewText,
  rawText,
  outputMode,
  setOutputMode,
  activePreviewTab,
  setActivePreviewTab,
  missingRequiredFields,
  hasTemplate,
}: MessagePreviewProps) {
  const isComplete = hasTemplate && missingRequiredFields.length === 0;

  return (
    <Card className="flex flex-col lg:sticky lg:top-6 shadow-sm border border-border-subtle">
      {/* Header Preview & Mode Controls */}
      <CardHeader className="pb-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Pratinjau Pesan</CardTitle>
        </div>

        {/* Segmented Control Output Mode: WhatsApp vs Teks Biasa */}
        <div className="inline-flex rounded-pill bg-input-bg p-1 border border-border-subtle shrink-0">
          <button
            type="button"
            onClick={() => setOutputMode("whatsapp")}
            className={`rounded-pill px-3.5 py-1 text-xs font-medium transition-all ${
              outputMode === "whatsapp"
                ? "bg-surface text-text-main shadow-xs font-semibold"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            WhatsApp
          </button>
          <button
            type="button"
            onClick={() => setOutputMode("plain")}
            className={`rounded-pill px-3.5 py-1 text-xs font-medium transition-all ${
              outputMode === "plain"
                ? "bg-surface text-text-main shadow-xs font-semibold"
                : "text-text-muted hover:text-text-main"
            }`}
          >
            Teks Biasa
          </button>
        </div>
      </CardHeader>

      <CardContent className="pt-4 flex flex-col gap-3">
        {/* Sub-tabs untuk WhatsApp Mode (Tampilan vs Teks Disalin) */}
        {outputMode === "whatsapp" && (
          <div className="flex items-center gap-2 border-b border-border-subtle pb-2 text-xs">
            <button
              type="button"
              onClick={() => setActivePreviewTab("display")}
              className={`pb-1 font-medium border-b-2 transition-colors ${
                activePreviewTab === "display"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Tampilan Format
            </button>
            <button
              type="button"
              onClick={() => setActivePreviewTab("raw")}
              className={`pb-1 font-medium border-b-2 transition-colors ${
                activePreviewTab === "raw"
                  ? "border-primary text-primary"
                  : "border-transparent text-text-muted hover:text-text-main"
              }`}
            >
              Teks yang Disalin (*teks*)
            </button>
          </div>
        )}

        {/* Box Tampilan Pesan */}
        <div className="min-h-[260px] max-h-[500px] overflow-y-auto rounded-input bg-input-bg p-4 border border-border-subtle text-xs md:text-sm leading-relaxed text-text-main whitespace-pre-line font-sans">
          {outputMode === "whatsapp" && activePreviewTab === "raw" ? (
            <span className="font-mono text-xs">{rawText || previewText}</span>
          ) : (
            <span>{previewText}</span>
          )}
        </div>

        {/* Status Validasi Isian Wajib */}
        {hasTemplate && (
          <div className="flex items-center justify-between pt-1">
            {isComplete ? (
              <div className="flex items-center gap-1.5 text-xs text-success font-medium">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Semua kolom wajib telah lengkap. Siap disalin.</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-medium">
                <AlertCircle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>
                  {missingRequiredFields.length} kolom wajib belum diisi (
                  {missingRequiredFields.map((f) => f.label).join(", ")})
                </span>
              </div>
            )}
          </div>
        )}

        {/* Catatan Privasi Nol Penyimpanan (PRD 7.3) */}
        <div className="flex items-center gap-1.5 text-[11px] text-text-muted pt-2 border-t border-border-subtle">
          <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
          <span>
            Data isian tidak disimpan ke database. Salin pesan sebelum meninggalkan halaman.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
