"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  FileText,
  ChevronDown,
  Check,
  Info,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { FieldDefinition } from "@/lib/template-engine/types";
import { hasWhatsAppFormatChars } from "@/lib/template-engine/renderer";
import { OutputMode } from "../hooks/useGeneratorState";

interface DynamicFormProps {
  fields: FieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  outputMode: OutputMode;
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export function DynamicForm({
  fields,
  values,
  onChange,
  outputMode,
  firstInputRef,
}: DynamicFormProps) {
  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-3 border-b border-border-subtle flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold">Formulir Pesan</CardTitle>
        </div>
        <span className="text-xs text-text-muted">
          {fields.length} Variabel Input
        </span>
      </CardHeader>

      <CardContent className="pt-5">
        <form
          onSubmit={(e) => e.preventDefault()}
          autoComplete="off"
          className="flex flex-col gap-4"
        >
          {fields.map((field, index) => {
            const val = values[field.key] || "";
            const isFirst = index === 0;
            const hasFormatChars = outputMode === "whatsapp" && hasWhatsAppFormatChars(val);

            return (
              <div key={field.id} className="flex flex-col gap-1.5">
                {/* Field Label & Indicators */}
                <div className="flex items-center justify-between">
                  <label
                    htmlFor={`field-${field.key}`}
                    className="text-xs font-semibold text-text-main flex items-center gap-1"
                  >
                    <span>{field.label}</span>
                    {field.required ? (
                      <span className="text-danger font-bold" title="Wajib diisi">*</span>
                    ) : (
                      <span className="text-[10px] text-text-muted font-normal">(opsional)</span>
                    )}
                  </label>

                  <div className="flex items-center gap-1.5 text-[11px] text-text-muted">
                    <span>
                      {val.length}/{field.max_length}
                    </span>
                  </div>
                </div>

                {/* Input Renderers */}
                {field.type === "text" && (
                  <Input
                    id={`field-${field.key}`}
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLInputElement>) : undefined}
                    type="text"
                    autoComplete="off"
                    placeholder={field.placeholder || `Ketik ${field.label}...`}
                    value={val}
                    maxLength={field.max_length}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className={field.required && !val.trim() ? "border-border-input" : ""}
                  />
                )}

                {field.type === "textarea" && (
                  <textarea
                    id={`field-${field.key}`}
                    ref={isFirst ? (firstInputRef as React.RefObject<HTMLTextAreaElement>) : undefined}
                    autoComplete="off"
                    rows={3}
                    placeholder={field.placeholder || `Ketik ${field.label}...`}
                    value={val}
                    maxLength={field.max_length}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="w-full rounded-input border border-border-input bg-input-bg p-3 text-sm text-text-main placeholder:text-text-muted leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                )}

                {field.type === "select" && (
                  <select
                    id={`field-${field.key}`}
                    value={val}
                    onChange={(e) => onChange(field.key, e.target.value)}
                    className="flex h-12 w-full rounded-input border border-border-input bg-input-bg px-3 text-sm text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <option value="">{field.placeholder || `-- Pilih ${field.label} --`}</option>
                    {field.options.map((opt) => (
                      <option key={opt.id} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                )}

                {field.type === "combobox" && (
                  <ComboboxInput
                    field={field}
                    value={val}
                    onChange={(v) => onChange(field.key, v)}
                  />
                )}

                {/* Help text */}
                {field.help_text && (
                  <span className="text-[11px] text-text-muted">
                    {field.help_text}
                  </span>
                )}

                {/* WhatsApp Format Character Warning */}
                {hasFormatChars && (
                  <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 p-2 rounded-input border border-amber-200">
                    <Info className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span>
                      Teks mengandung karakter format WhatsApp (*, _, ~, `). Karakter ini akan disalin apa adanya.
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </form>
      </CardContent>
    </Card>
  );
}

/**
 * Komponen Combobox: Memungkinkan memilih dari opsi dropdown ATAU mengetik nilai baru secara bebas
 */
function ComboboxInput({
  field,
  value,
  onChange,
}: {
  field: FieldDefinition;
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const filteredOptions = field.options.filter((opt) =>
    opt.label.toLowerCase().includes(value.toLowerCase())
  );

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="relative">
        <Input
          id={`field-${field.key}`}
          type="text"
          autoComplete="off"
          placeholder={field.placeholder || `Pilih atau ketik ${field.label}...`}
          value={value}
          maxLength={field.max_length}
          onChange={(e) => {
            onChange(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          className="pr-9"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main p-1"
          tabIndex={-1}
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && field.options.length > 0 && (
        <div className="absolute left-0 top-full mt-1 w-full max-h-48 overflow-y-auto rounded-input bg-surface border border-border-subtle shadow-lg z-30 p-1 divide-y divide-border-subtle/40">
          {filteredOptions.length === 0 ? (
            <div className="p-2 text-xs text-text-muted italic">
              Tekan enter untuk menggunakan &quot;{value}&quot;
            </div>
          ) : (
            filteredOptions.map((opt) => {
              const isSelected = opt.value === value;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-xs rounded-input flex items-center justify-between transition-colors ${
                    isSelected
                      ? "bg-primary/10 text-primary font-semibold"
                      : "hover:bg-input-bg text-text-main"
                  }`}
                >
                  <span>{opt.label}</span>
                  {isSelected && <Check className="h-3.5 w-3.5 text-primary shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
