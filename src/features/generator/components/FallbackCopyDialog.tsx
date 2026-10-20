"use client";

import React, { useEffect, useRef } from "react";
import { Copy, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface FallbackCopyDialogProps {
  isOpen: boolean;
  onClose: () => void;
  text: string;
}

export function FallbackCopyDialog({ isOpen, onClose, text }: FallbackCopyDialogProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [copied, setCopied] = React.useState(false);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSelectAll = () => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // Fallback tetap mengandalkan seleksi teks manual
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <Card className="w-full max-w-lg modal-shadow">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border-subtle">
          <div>
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Copy className="h-4 w-4 text-primary" />
              Salin Pesan Manual
            </CardTitle>
            <CardDescription className="text-xs text-text-muted mt-0.5">
              Izin clipboard otomatis tidak tersedia di browser Anda. Silakan salin teks di bawah secara manual.
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-main h-8 w-8 flex items-center justify-center rounded-full"
            aria-label="Tutup dialog"
          >
            <X className="h-4 w-4" />
          </button>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-main">
              Teks Pesan Siap Kirim:
            </label>
            <textarea
              ref={textareaRef}
              readOnly
              rows={8}
              className="w-full rounded-input border border-border-input bg-input-bg p-3.5 text-xs font-mono text-text-main leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              value={text}
              onClick={(e) => (e.target as HTMLTextAreaElement).select()}
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border-subtle">
            <span className="text-[11px] text-text-muted">
              Tekan <kbd className="px-1.5 py-0.5 bg-input-bg rounded border text-[10px] font-mono">Ctrl+C</kbd> / <kbd className="px-1.5 py-0.5 bg-input-bg rounded border text-[10px] font-mono">⌘+C</kbd> untuk menyalin
            </span>

            <div className="flex items-center gap-2">
              <Button type="button" variant="secondary" size="sm" onClick={handleSelectAll}>
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 mr-1 text-success" />
                    Tersalin!
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Pilih & Salin Semua
                  </>
                )}
              </Button>
              <Button type="button" size="sm" onClick={onClose}>
                Selesai
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
