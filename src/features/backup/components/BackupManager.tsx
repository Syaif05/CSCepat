"use client";

import React, { useState, useRef } from "react";
import {
  Download,
  Upload,
  FileJson,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  RefreshCw,
  X,
  FileCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  exportTemplatesBackupAction,
  validateBackupJsonString,
  importTemplatesBackupAction,
  ImportSummary,
} from "../actions/backup-actions";
import { BackupFileStructure, TemplateBackupItem } from "../schemas";

export function BackupManager() {
  // Export State
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  // Import State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stagedBackup, setStagedBackup] = useState<BackupFileStructure | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handler Ekspor Template ke File JSON
  const handleExport = async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const res = await exportTemplatesBackupAction();
      if (!res.success) {
        setExportError(res.error || "Gagal menyiapkan berkas ekspor.");
        return;
      }

      const jsonString = JSON.stringify(res.data, null, 2);
      const blob = new Blob([jsonString], { type: "application/json;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const dateStr = new Date().toISOString().split("T")[0];
      link.href = url;
      link.download = `pesanrapi-backup-${dateStr}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      setExportError("Terjadi gangguan saat mengunduh berkas cadangan.");
    } finally {
      setIsExporting(false);
    }
  };

  // Handler Pemilihan File JSON
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setStagedBackup(null);
    setImportSummary(null);

    if (!file.name.endsWith(".json")) {
      setImportError("Format berkas harus berekstensi .json.");
      return;
    }

    if (file.size > 1048576) {
      setImportError("Ukuran berkas melebihi batas 1 MiB.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const text = await file.text();
      const res = await validateBackupJsonString(text);

      if (!res.success) {
        setImportError(res.error || "Berkas cadangan tidak valid.");
      } else {
        setStagedBackup(res.data);
      }
    } catch {
      setImportError("Gagal membaca isi berkas JSON.");
    } finally {
      setIsAnalyzing(false);
      // Reset input agar file yang sama bisa dipilih ulang bila diinginkan
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  // Handler Eksekusi Impor Item
  const handleCommitImport = async (itemsToImport: TemplateBackupItem[]) => {
    setIsImporting(true);
    setImportError(null);

    try {
      const res = await importTemplatesBackupAction(itemsToImport);
      if (!res.success) {
        setImportError(res.error || "Gagal mengimpor template.");
      } else {
        setImportSummary(res.data);
        setStagedBackup(null);
      }
    } catch {
      setImportError("Terjadi gangguan saat memproses impor.");
    } finally {
      setIsImporting(false);
    }
  };

  // Retry hanya untuk item yang gagal (PRD 17 & 6.2)
  const handleRetryFailed = async () => {
    if (!importSummary) return;
    const failedItems = importSummary.results
      .filter((r) => !r.success)
      .map((r) => r.item);

    if (failedItems.length === 0) return;
    await handleCommitImport(failedItems);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Kartu Ekspor Cadangan */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Download className="h-4 w-4 text-primary" />
            Ekspor Cadangan Template
          </CardTitle>
          <CardDescription className="text-xs">
            Unduh seluruh definisi template Anda dalam format JSON terstandarisasi untuk arsip pribadi atau pemulihan di kemudian hari.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-3">
          {exportError && (
            <div className="rounded-input bg-danger/10 p-3 text-xs text-danger border border-danger/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{exportError}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-input-bg p-3.5 rounded-input border border-border-subtle">
            <div className="flex items-center gap-2.5">
              <FileJson className="h-5 w-5 text-primary shrink-0" />
              <div>
                <span className="text-xs font-semibold text-text-main block">
                  Format Backup Resmi (Schema v1)
                </span>
                <span className="text-[11px] text-text-muted">
                  Bebas dari data pelanggan, riwayat pesan, dan token rahasia.
                </span>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleExport}
              disabled={isExporting}
              size="sm"
              className="shrink-0 font-semibold"
            >
              {isExporting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  Mengekspor...
                </>
              ) : (
                <>
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  Unduh Berkas JSON
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Kartu Impor Cadangan */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Upload className="h-4 w-4 text-primary" />
            Impor Cadangan Template
          </CardTitle>
          <CardDescription className="text-xs">
            Pulihkan template dari file JSON cadangan resmi PesanRapi (maksimal 1 MiB, 50 template per berkas).
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
            id="backup-file-upload"
          />

          {importError && (
            <div className="rounded-input bg-danger/10 p-3 text-xs text-danger border border-danger/20 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          <label
            htmlFor="backup-file-upload"
            className="border-2 border-dashed border-border-input hover:border-primary/50 bg-input-bg/40 rounded-input p-6 flex flex-col items-center justify-center gap-2.5 cursor-pointer transition-colors text-center"
          >
            <div className="h-10 w-10 rounded-full bg-surface text-primary flex items-center justify-center shadow-xs">
              {isAnalyzing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold text-text-main block">
                {isAnalyzing ? "Memeriksa struktur berkas..." : "Pilih berkas JSON cadangan"}
              </span>
              <span className="text-[11px] text-text-muted">
                Klik untuk memilih berkas dari komputer Anda
              </span>
            </div>
          </label>

          {/* Modal Konfirmasi Pratinjau Sebelum Impor */}
          {stagedBackup && (
            <div className="rounded-input border border-primary/30 bg-primary/5 p-4 flex flex-col gap-3 animate-in fade-in">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 text-primary font-semibold text-xs">
                  <FileCheck className="h-4 w-4" />
                  <span>Berkas Cadangan Siap Diimpor</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStagedBackup(null)}
                  className="text-text-muted hover:text-text-main"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="text-xs text-text-muted flex flex-col gap-1">
                <span>
                  Ditemukan <strong>{stagedBackup.templates.length} template</strong> yang valid.
                </span>
                <span className="text-[11px]">
                  Diekspor pada: {new Date(stagedBackup.exported_at).toLocaleString("id-ID")}
                </span>
              </div>

              <div className="max-h-36 overflow-y-auto divide-y divide-border-subtle/40 bg-surface rounded-input p-2 border border-border-subtle text-xs">
                {stagedBackup.templates.map((tpl, i) => (
                  <div key={i} className="py-1 px-1 flex items-center justify-between">
                    <span className="font-semibold text-text-main truncate max-w-[240px]">
                      {tpl.title}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {tpl.schema_version === 2 ? (
                        <>
                          <Badge variant="default" className="text-[9px] bg-brand-primary text-white border-none py-0">
                            Flow v2
                          </Badge>
                          <Badge variant="secondary" className="text-[9px] py-0">
                            {tpl.nodes.length} Langkah
                          </Badge>
                        </>
                      ) : (
                        <Badge variant="secondary" className="text-[9px] py-0">
                          {tpl.fields.length} Variabel
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setStagedBackup(null)}
                  disabled={isImporting}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleCommitImport(stagedBackup.templates)}
                  disabled={isImporting}
                  className="font-semibold"
                >
                  {isImporting ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                      Mengimpor ({stagedBackup.templates.length} item)...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Impor Sekarang
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Laporan Hasil Impor */}
          {importSummary && (
            <div className="rounded-input border border-border-subtle bg-surface p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="font-semibold text-xs text-text-main">
                    Hasil Impor: {importSummary.importedCount} Berhasil, {importSummary.failedCount} Gagal
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setImportSummary(null)}
                  className="text-text-muted hover:text-text-main text-xs"
                >
                  Tutup
                </button>
              </div>

              {importSummary.failedCount > 0 && (
                <div className="flex flex-col gap-2 pt-2 border-t border-border-subtle">
                  <div className="text-xs text-danger font-medium flex items-center justify-between">
                    <span>Item yang gagal disimpan:</span>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleRetryFailed}
                      disabled={isImporting}
                      className="h-7 text-xs"
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Coba Ulang yang Gagal
                    </Button>
                  </div>

                  <ul className="text-xs text-text-muted space-y-1 pl-4 list-disc">
                    {importSummary.results
                      .filter((r) => !r.success)
                      .map((r, i) => (
                        <li key={i}>
                          <strong>{r.title}</strong>: {r.error}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
