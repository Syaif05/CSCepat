"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { TemplateDefinition } from "@/lib/template-engine/types";
import {
  TemplateFlowDefinition,
  FlowFieldDefinition,
} from "@/lib/template-engine/flow-types";
import { parseTemplate } from "@/lib/template-engine/parser";
import { renderTemplate, hasWhatsAppFormatChars } from "@/lib/template-engine/renderer";
import {
  evaluateActiveFlow,
  renderFlowTemplate,
  cleanInactiveAnswers,
  initializeFlowAnswers,
} from "@/lib/template-engine/flow-evaluator";

export type OutputMode = "whatsapp" | "plain";
export type PreviewTab = "display" | "raw";

export type UnifiedTemplate = TemplateDefinition | TemplateFlowDefinition;

export interface UseGeneratorStateProps {
  initialTemplate?: UnifiedTemplate | null;
  defaultOutputMode?: OutputMode;
}

/**
 * Helper untuk mengurai definisi flow v2 dari template
 */
export function extractFlowDefinition(
  tpl: UnifiedTemplate | null
): TemplateFlowDefinition | null {
  if (!tpl || tpl.schema_version !== 2) return null;

  if ("nodes" in tpl && Array.isArray((tpl as TemplateFlowDefinition).nodes)) {
    return tpl as TemplateFlowDefinition;
  }

  if ("body" in tpl && typeof tpl.body === "string") {
    try {
      const parsed = JSON.parse(tpl.body);
      if (parsed.rootNodeId && Array.isArray(parsed.nodes)) {
        return {
          id: tpl.id || "",
          owner_id: tpl.owner_id,
          title: tpl.title,
          description: tpl.description,
          category: tpl.category,
          is_favorite: tpl.is_favorite,
          is_archived: tpl.is_archived,
          starter_key: tpl.starter_key,
          schema_version: 2,
          version: tpl.version,
          rootNodeId: parsed.rootNodeId,
          nodes: parsed.nodes,
          created_at: tpl.created_at,
          updated_at: tpl.updated_at,
        };
      }
    } catch {
      return null;
    }
  }

  return null;
}

function getInitialValues(tpl: UnifiedTemplate | null): Record<string, string> {
  if (!tpl) return {};

  const flowTpl = extractFlowDefinition(tpl);
  if (flowTpl) {
    const active = evaluateActiveFlow(flowTpl, {});
    return initializeFlowAnswers(active.activeFields);
  }

  // Linear v1
  const initial: Record<string, string> = {};
  const linearTpl = tpl as TemplateDefinition;
  if (linearTpl.fields) {
    linearTpl.fields.forEach((f) => {
      if (f.data_class === "configuration" && f.default_value) {
        initial[f.key] = f.default_value;
      } else {
        initial[f.key] = "";
      }
    });
  }
  return initial;
}

export function useGeneratorState({
  initialTemplate = null,
  defaultOutputMode = "whatsapp",
}: UseGeneratorStateProps = {}) {
  const [selectedTemplate, setSelectedTemplate] = useState<UnifiedTemplate | null>(initialTemplate);
  const [values, setValues] = useState<Record<string, string>>(() => getInitialValues(initialTemplate));
  const [outputMode, setOutputMode] = useState<OutputMode>(defaultOutputMode);
  const [activePreviewTab, setActivePreviewTab] = useState<PreviewTab>("display");
  const [copyStatus, setCopyStatus] = useState<"idle" | "success" | "error">("idle");
  const [isFallbackOpen, setIsFallbackOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [isSwitchConfirmOpen, setIsSwitchConfirmOpen] = useState(false);
  const [pendingTemplate, setPendingTemplate] = useState<UnifiedTemplate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const firstInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

  // Deteksi definisi Flow v2
  const flowDefinition = useMemo(() => {
    return extractFlowDefinition(selectedTemplate);
  }, [selectedTemplate]);

  // Evaluasi alur aktif untuk Flow v2
  const activeFlow = useMemo(() => {
    if (!flowDefinition) return null;
    return evaluateActiveFlow(flowDefinition, values);
  }, [flowDefinition, values]);

  // Inisialisasi default values saat template berubah
  const initializeValuesForTemplate = useCallback((tpl: UnifiedTemplate | null) => {
    setValues(getInitialValues(tpl));
  }, []);

  // Cek apakah ada nilai pelanggan (transient) yang telah diisi
  const isDirty = useMemo(() => {
    if (!selectedTemplate) return false;

    if (flowDefinition && activeFlow) {
      return activeFlow.activeFields.some(
        (f) => f.data_class === "transient" && (values[f.key] || "").trim() !== ""
      );
    }

    const linearTpl = selectedTemplate as TemplateDefinition;
    if (!linearTpl.fields) return false;
    return linearTpl.fields.some(
      (f) => f.data_class === "transient" && (values[f.key] || "").trim() !== ""
    );
  }, [selectedTemplate, flowDefinition, activeFlow, values]);

  // Parse template body menjadi AST secara memoized (khusus v1)
  const parsedAST = useMemo(() => {
    if (flowDefinition || !selectedTemplate) return null;
    const linearTpl = selectedTemplate as TemplateDefinition;
    if (!linearTpl.body) return null;
    try {
      return parseTemplate(linearTpl.body);
    } catch {
      return null;
    }
  }, [flowDefinition, selectedTemplate]);

  // Cek field required yang masih kosong
  const missingRequiredFields = useMemo(() => {
    if (!selectedTemplate) return [];

    if (flowDefinition && activeFlow) {
      return activeFlow.activeFields.filter(
        (f) => f.required && (values[f.key] || "").trim() === ""
      );
    }

    const linearTpl = selectedTemplate as TemplateDefinition;
    if (!linearTpl.fields) return [];
    return linearTpl.fields.filter(
      (f) => f.required && (values[f.key] || "").trim() === ""
    );
  }, [selectedTemplate, flowDefinition, activeFlow, values]);

  const isValidToCopy = useMemo(() => {
    return !!selectedTemplate && missingRequiredFields.length === 0;
  }, [selectedTemplate, missingRequiredFields]);

  // Render hasil pesan untuk pratinjau visual
  const previewRender = useMemo(() => {
    if (!selectedTemplate) {
      return { text: "Pilih template untuk menyusun pesan." };
    }

    if (flowDefinition) {
      return renderFlowTemplate(flowDefinition, values, outputMode, {
        previewMode: true,
      });
    }

    if (!parsedAST) return { text: "" };
    const linearTpl = selectedTemplate as TemplateDefinition;
    return renderTemplate(parsedAST, linearTpl.fields || [], values, outputMode, {
      previewMode: true,
    });
  }, [selectedTemplate, flowDefinition, parsedAST, values, outputMode]);

  // Render pesan final untuk disalin ke clipboard
  const finalRender = useMemo(() => {
    if (!selectedTemplate) {
      return { text: "" };
    }

    if (flowDefinition) {
      return renderFlowTemplate(flowDefinition, values, outputMode, {
        previewMode: false,
      });
    }

    if (!parsedAST) return { text: "" };
    const linearTpl = selectedTemplate as TemplateDefinition;
    return renderTemplate(parsedAST, linearTpl.fields || [], values, outputMode, {
      previewMode: false,
    });
  }, [selectedTemplate, flowDefinition, parsedAST, values, outputMode]);

  // Deteksi karakter khusus WhatsApp
  const whatsAppFormatWarnings = useMemo(() => {
    if (outputMode !== "whatsapp" || !selectedTemplate) return [];
    const fieldsToCheck =
      flowDefinition && activeFlow
        ? activeFlow.activeFields
        : (selectedTemplate as TemplateDefinition).fields || [];

    const warnings: { fieldLabel: string; value: string }[] = [];
    fieldsToCheck.forEach((f: FlowFieldDefinition) => {
      const val = values[f.key] || "";
      if (hasWhatsAppFormatChars(val)) {
        warnings.push({ fieldLabel: f.label, value: val });
      }
    });
    return warnings;
  }, [outputMode, selectedTemplate, flowDefinition, activeFlow, values]);

  // Mutasi nilai input dengan pembersihan otomatis cabang yang ditinggalkan
  const setValue = useCallback(
    (key: string, val: string) => {
      setValues((prev) => {
        const updated = {
          ...prev,
          [key]: val,
        };

        if (flowDefinition) {
          const newFlow = evaluateActiveFlow(flowDefinition, updated);
          return cleanInactiveAnswers(newFlow.activeFields, updated);
        }

        return updated;
      });
    },
    [flowDefinition]
  );

  // Ganti template dengan proteksi konfirmasi jika ada transient dirty data
  const selectTemplate = useCallback(
    (tpl: UnifiedTemplate) => {
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
      initializeValuesForTemplate(selectedTemplate);
    }
  }, [isDirty, selectedTemplate, initializeValuesForTemplate]);

  const confirmResetCustomer = useCallback(() => {
    if (selectedTemplate) {
      initializeValuesForTemplate(selectedTemplate);
    }
    setIsResetConfirmOpen(false);
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
        setIsFallbackOpen(true);
      }
    } catch {
      setIsFallbackOpen(true);
    }
  }, [isValidToCopy, finalRender.text]);

  // Privasi: Bersihkan state saat terjadi pageshow dari bfcache
  useEffect(() => {
    const handlePageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
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
    flowDefinition,
    activeFlow,
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
