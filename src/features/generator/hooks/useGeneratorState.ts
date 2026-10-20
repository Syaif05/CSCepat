"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { TemplateDefinition } from "@/lib/template-engine/types";
import { parseTemplate } from "@/lib/template-engine/parser";
import { renderTemplate, hasWhatsAppFormatChars } from "@/lib/template-engine/renderer";

export type OutputMode = "whatsapp" | "plain";
export type PreviewTab = "display" | "raw";

export interface UseGeneratorStateProps {
  initialTemplate?: TemplateDefinition | null;
  defaultOutputMode?: OutputMode;
}

function getInitialValues(tpl: TemplateDefinition | null): Record<string, string> {
  if (!tpl) return {};
  const initial: Record<string, string> = {};
  tpl.fields.forEach((f) => {
    if (f.data_class === "configuration" && f.default_value) {
      initial[f.key] = f.default_value;
    } else {
      initial[f.key] = "";
    }
  });
  return initial;
}

export function useGeneratorState({
  initialTemplate = null,
  defaultOutputMode = "whatsapp",
}: UseGeneratorStateProps = {}) {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateDefinition | null>(initialTemplate);
  const [values, setValues] = useState<Record<string, string>>(() => getInitialValues(initialTemplate));
  const [outputMode, setOutputMode] = useState<OutputMode>(defaultOutputMode);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("display");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<TemplateDefinition | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Inisialisasi default values saat template berubah
  const initializeValuesForTemplate = useCallback((tpl: TemplateDefinition | null) => {
    setValues(getInitialValues(tpl));
  }, []);

  // Cek apakah ada nilai pelanggan (transient) yang telah diisi oleh user
  const isDirty = useMemo(() => {
    if (!selectedTemplate) return false;
    return selectedTemplate.fields.some(
      (f) => f.data_class === "transient" && (values[f.key] || "").trim() !== ""
    );
  }, [selectedTemplate, values]);

  // Parse template body menjadi AST secara memoized
  const parsedAST = useMemo(() => {
    if (!selectedTemplate?.body) return null;
    try {
      return parseTemplate(selectedTemplate.body);
    } catch {
      return null;
    }
  }, [selectedTemplate]);

  // Cek field required yang masih kosong
  const missingRequiredFields = useMemo(() => {
    if (!selectedTemplate) return [];
    return selectedTemplate.fields.filter(
      (f) => f.required && (values[f.key] || "").trim() === ""
    );
  }, [selectedTemplate, values]);

  const isValidToCopy = useMemo(() => {
    return !!selectedTemplate && missingRequiredFields.length === 0;
  }, [selectedTemplate, missingRequiredFields]);

  // Render hasil pesan untuk pratinjau visual (previewMode: true menampilkan placeholder)
  const previewRender = useMemo(() => {
    if (!parsedAST || !selectedTemplate) {
      return { text: "Pilih template untuk menyusun pesan." };
    }
    return renderTemplate(parsedAST, selectedTemplate.fields, values, outputMode, {
      previewMode: true,
    });
  }, [parsedAST, selectedTemplate, values, outputMode]);

  // Render pesan final untuk disalin ke clipboard (previewMode: false)
  const finalRender = useMemo(() => {
    if (!parsedAST || !selectedTemplate) {
      return { text: "" };
    }
    return renderTemplate(parsedAST, selectedTemplate.fields, values, outputMode, {
      previewMode: false,
    });
  }, [parsedAST, selectedTemplate, values, outputMode]);

  // Deteksi jika isian pengguna mengandung karakter format WhatsApp (*, _, ~, `)
  const whatsAppFormatWarnings = useMemo(() => {
    if (outputMode !== "whatsapp" || !selectedTemplate) return [];
    const warnings: { fieldLabel: string; value: string }[] = [];
    selectedTemplate.fields.forEach((f) => {
      const val = values[f.key] || "";
      if (hasWhatsAppFormatChars(val)) {
        warnings.push({ fieldLabel: f.label, value: val });
      }
    });
    return warnings;
  }, [outputMode, selectedTemplate, values]);

  // Mutasi nilai input
  const setValue = useCallback((key: string, val: string) => {
    setValues((prev) => ({
      ...prev,
      [key]: val,
    }));
  }, []);

  // Ganti template dengan proteksi konfirmasi jika ada transient dirty data
  const selectTemplate = useCallback(
    (tpl: TemplateDefinition) => {
      if (selectedTemplate?.id === tpl.id) return;

      if (isDirty) {
        setPendingTemplate(tpl);
        setIsSwitchConfirmOpen(true);
      } else {
        setSelectedTemplate(tpl);
        initializeValuesForTemplate(tpl);
      }
    },
    [selectedTemplate, isDirty, initializeValuesForTemplate]
  );

  const confirmSwitchTemplate = useCallback(() => {
    if (pendingTemplate) {
      setSelectedTemplate(pendingTemplate);
      initializeValuesForTemplate(pendingTemplate);
      setPendingTemplate(null);
    }
    setIsSwitchConfirmOpen(false);
  }, [pendingTemplate, initializeValuesForTemplate]);

  const cancelSwitchTemplate = useCallback(() => {
    setPendingTemplate(null);
    setIsSwitchConfirmOpen(false);
  }, []);

  // Reset pelanggan baru
  const triggerResetCustomer = useCallback(() => {
    if (isDirty) {
      setIsResetConfirmOpen(true);
    } else {
      // Langsung reset jika form memang masih kosong
      initializeValuesForTemplate(selectedTemplate);
    }
  }, [isDirty, selectedTemplate, initializeValuesForTemplate]);

  const confirmResetCustomer = useCallback(() => {
    if (selectedTemplate) {
      initializeValuesForTemplate(selectedTemplate);
    }
    setIsResetConfirmOpen(false);
    // Kembalikan fokus ke input pertama setelah reset
    setTimeout(() => {
      firstInputRef.current?.focus();
    }, 50);
  }, [selectedTemplate, initializeValuesForTemplate]);

  const cancelResetCustomer = useCallback(() => {
    setIsResetConfirmOpen(false);
  }, []);

  // Salin ke clipboard dengan fallback modal
  const copyToClipboard = useCallback(async () => {
    if (!isValidToCopy) return;
    const textToCopy = finalRender.text;

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(textToCopy);
        setCopyStatus("success");
        setToastMessage("Pesan berhasil disalin");
        setTimeout(() => {
          setCopyStatus("idle");
          setToastMessage(null);
        }, 3000);
      } else {
        // Fallback jika API clipboard tidak tersedia
        setIsFallbackOpen(true);
      }
    } catch {
      // Fallback jika permission denied
      setIsFallbackOpen(true);
    }
  }, [isValidToCopy, finalRender.text]);

  // Privasi: Bersihkan state saat terjadi pageshow dari bfcache (back-forward cache)
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        // Halaman dimuat ulang dari bfcache browser -> bersihkan nilai transaksi
        initializeValuesForTemplate(selectedTemplate);
      }
    };

    window.addEventListener("pageshow", handlePageShow);
    return () => {
      window.removeEventListener("pageshow", handlePageShow);
    };
  }, [selectedTemplate, initializeValuesForTemplate]);

  return {
    selectedTemplate,
    setSelectedTemplate,
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
    pendingTemplate,
    toastMessage,
    isDirty,
    parsedAST,
    missingRequiredFields,
    isValidToCopy,
    previewRender,
    finalRender,
    whatsAppFormatWarnings,
    firstInputRef,
    confirmSwitchTemplate,
    cancelSwitchTemplate,
    triggerResetCustomer,
    confirmResetCustomer,
    cancelResetCustomer,
    copyToClipboard,
  };
}
