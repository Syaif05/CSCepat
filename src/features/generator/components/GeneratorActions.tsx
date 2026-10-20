"use client";

import React from "react";
import { Copy, RotateCcw, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface GeneratorActionsProps {
  isValidToCopy: boolean;
  copyStatus: "idle" | "success" | "error";
  onCopy: () => void;
  onReset: () => void;
  isResetConfirmOpen: boolean;
  onConfirmReset: () => void;
  onCancelReset: () => void;
  isSwitchConfirmOpen: boolean;
  onConfirmSwitch: () => void;
  onCancelSwitch: () => void;
  missingCount: number;
}

export function GeneratorActions({
  isValidToCopy,
  copyStatus,
  onCopy,
  onReset,
  isResetConfirmOpen,
  onConfirmReset,
  onCancelReset,
  isSwitchConfirmOpen,
  onConfirmSwitch,
  onCancelSwitch,
  missingCount,
}: GeneratorActionsProps) {
  return (
    <>
      {/* Action Bar Container: Desktop (inline) & Mobile (Sticky Bottom Bar) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-surface/95 backdrop-blur-md border-t border-border-subtle p-3.5 shadow-lg lg:static lg:bg-transparent lg:border-none lg:p-0 lg:shadow-none lg:backdrop-blur-none">
        <div className="max-w-5xl mx-auto flex items-center justify-between sm:justify-end gap-3">
          {/* Tombol Pelanggan Baru (Reset) */}
          <Button
            type="button"
            variant="secondary"
            onClick={onReset}
            className="flex-1 sm:flex-none text-xs font-semibold h-11 px-4"
          >
            <RotateCcw className="h-4 w-4 mr-2 text-text-muted" />
            Pelanggan Baru
          </Button>

          {/* Tombol Utama Salin Pesan */}
          <Button
            type="button"
            onClick={onCopy}
            disabled={!isValidToCopy}
            className="flex-1 sm:flex-none text-xs font-semibold h-11 px-6 min-w-[160px]"
          >
            {copyStatus === "success" ? (
              <>
                <Check className="h-4 w-4 mr-2 text-white" />
                Pesan Disalin!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                {missingCount > 0 ? `Lengkapi ${missingCount} Input` : "Salin Pesan"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Modal Konfirmasi Reset Pelanggan Baru */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm modal-shadow">
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Kosongkan Isian Pelanggan?</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Semua isian formulir untuk pelanggan saat ini akan dibersihkan. Field konfigurasi umum (seperti nama toko) akan dikembalikan ke nilai bawaan template.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button type="button" variant="secondary" size="sm" onClick={onCancelReset}>
                  Batal
                </Button>
                <Button type="button" variant="danger" size="sm" onClick={onConfirmReset}>
                  Ya, Bersihkan Isian
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal Konfirmasi Ganti Template saat Form Berisi Data Pelanggan */}
      {isSwitchConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="w-full max-w-sm modal-shadow">
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-amber-600 font-semibold text-sm">
                <AlertTriangle className="h-5 w-5" />
                <span>Ganti Template dan Kosongkan Isian?</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Anda sedang mengisi data pelanggan. Berganti template akan mengosongkan isian saat ini karena setiap template memiliki variabel yang berbeda.
              </p>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button type="button" variant="secondary" size="sm" onClick={onCancelSwitch}>
                  Batal
                </Button>
                <Button type="button" size="sm" onClick={onConfirmSwitch}>
                  Ganti Template
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </>
  );
}
