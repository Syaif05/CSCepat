"use client";

import React from "react";
import {
  ChevronRight,
  GitFork,
  AlertCircle,
  HelpCircle,
  SlidersHorizontal,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  FlowNode,
  FlowFieldDefinition,
  TemplateFlowDefinition,
} from "@/lib/template-engine/flow-types";
import { hasWhatsAppFormatChars } from "@/lib/template-engine/renderer";
import { OutputMode } from "../hooks/useGeneratorState";

interface DynamicFlowFormProps {
  flowTemplate: TemplateFlowDefinition;
  activeNodes: FlowNode[];
  activeFields: FlowFieldDefinition[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  outputMode: OutputMode;
  firstInputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
}

export function DynamicFlowForm({
  flowTemplate,
  activeNodes,
  values,
  onChange,
  outputMode,
  firstInputRef,
}: DynamicFlowFormProps) {
  return (
    <div className="flex flex-col gap-4">
      {/* 1. Header & Stepper Alur Percabangan Aktif */}
      <Card className="border-border bg-card shadow-xs">
        <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <GitFork className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <span>{flowTemplate.title}</span>
                <Badge variant="default" className="text-[10px] py-0 px-1.5">
                  Flow v2
                </Badge>
              </CardTitle>
            </div>
          </div>
          <span className="text-xs font-semibold text-text-muted">
            {activeNodes.length} Langkah Terpilih
          </span>
        </CardHeader>

        {/* Stepper Pill Visual */}
        <div className="py-2.5 px-4 bg-surface-elevated/50 flex flex-wrap items-center gap-1.5 border-b border-border text-xs">
          {activeNodes.map((node, index) => (
            <React.Fragment key={node.id}>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-card border border-border text-text-main font-medium shadow-xs">
                <span className="flex items-center justify-center h-4 w-4 rounded-full bg-primary/10 text-primary font-bold text-[10px]">
                  {index + 1}
                </span>
                <span className="line-clamp-1">{node.title}</span>
              </span>
              {index < activeNodes.length - 1 && (
                <ChevronRight className="h-3 w-3 text-text-muted/60 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </Card>

      {/* 2. Daftar Langkah & Input Form Sesuai Jalur Aktif */}
      <div className="space-y-4">
        {activeNodes.map((node, nodeIdx) => {
          if (node.fields.length === 0) {
            // Node penutup tanpa input formulir
            return (
              <Card
                key={node.id}
                className="border-dashed border-border bg-surface-elevated/40"
              >
                <CardContent className="p-3.5 flex items-center justify-between text-xs text-text-muted">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-text-main">
                      {nodeIdx + 1}. {node.title}
                    </span>
                    <span className="text-[11px]">(Langkah Penutup Otomatis)</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    ✓ Teks siap digabungkan
                  </span>
                </CardContent>
              </Card>
            );
          }

          return (
            <Card key={node.id} className="border-border bg-card shadow-xs">
              <CardHeader className="py-3 px-4 border-b border-border flex flex-row items-center justify-between bg-surface-elevated/30">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center h-5 w-5 rounded-md bg-primary text-primary-foreground font-bold text-xs">
                    {nodeIdx + 1}
                  </span>
                  <CardTitle className="text-xs font-bold text-text-main">
                    {node.title}
                  </CardTitle>
                </div>

                {node.branchingFieldKey && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-primary bg-primary/10 px-2 py-0.5 rounded-md font-medium">
                    <SlidersHorizontal className="h-3 w-3" />
                    Menentukan Cabang Berikutnya
                  </span>
                )}
              </CardHeader>

              <CardContent className="p-4 space-y-4">
                {node.fields.map((field, fieldIdx) => {
                  const val = values[field.key] || "";
                  const shouldAttachRef = nodeIdx === 0 && fieldIdx === 0;

                  const hasFormatChars =
                    outputMode === "whatsapp" && hasWhatsAppFormatChars(val);

                  return (
                    <div key={field.id} className="flex flex-col gap-1.5">
                      {/* Label & Deskripsi */}
                      <div className="flex items-center justify-between">
                        <label
                          htmlFor={`flow-field-${field.key}`}
                          className="text-xs font-semibold text-text-main flex items-center gap-1"
                        >
                          <span>{field.label}</span>
                          {field.required ? (
                            <span
                              className="text-danger font-bold"
                              title="Wajib diisi sebelum menyalin pesan"
                            >
                              *
                            </span>
                          ) : (
                            <span className="text-[10px] text-text-muted font-normal">
                              (opsional)
                            </span>
                          )}
                        </label>

                        <div className="flex items-center gap-2 text-[10px] text-text-muted">
                          {field.data_class === "configuration" && (
                            <span className="bg-surface-elevated px-1.5 py-0.5 rounded border border-border text-[9px]">
                              Nilai Toko
                            </span>
                          )}
                          {field.type !== "boolean" && (
                            <span>
                              {val.length}/{field.max_length}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Kontrol Input Berdasarkan Tipe */}
                      {field.type === "text" && (
                        <Input
                          id={`flow-field-${field.key}`}
                          ref={
                            shouldAttachRef
                              ? (firstInputRef as React.RefObject<HTMLInputElement>)
                              : undefined
                          }
                          type="text"
                          autoComplete="off"
                          placeholder={field.placeholder || `Ketik ${field.label}...`}
                          value={val}
                          maxLength={field.max_length}
                          onChange={(e) => onChange(field.key, e.target.value)}
                          className={
                            field.required && !val.trim() ? "border-border-input" : ""
                          }
                        />
                      )}

                      {field.type === "number" && (
                        <div className="relative">
                          <Input
                            id={`flow-field-${field.key}`}
                            ref={
                              shouldAttachRef
                                ? (firstInputRef as React.RefObject<HTMLInputElement>)
                                : undefined
                            }
                            type="number"
                            autoComplete="off"
                            placeholder={field.placeholder || "0"}
                            value={val}
                            min={field.min}
                            max={field.max}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className={
                              field.required && !val.trim() ? "border-border-input" : ""
                            }
                          />
                          {(field.min !== undefined || field.max !== undefined) && (
                            <span className="text-[10px] text-text-muted mt-1 block">
                              {field.min !== undefined && `Min: ${field.min}`}
                              {field.min !== undefined && field.max !== undefined && " • "}
                              {field.max !== undefined && `Maks: ${field.max}`}
                            </span>
                          )}
                        </div>
                      )}

                      {field.type === "textarea" && (
                        <textarea
                          id={`flow-field-${field.key}`}
                          ref={
                            shouldAttachRef
                              ? (firstInputRef as React.RefObject<HTMLTextAreaElement>)
                              : undefined
                          }
                          autoComplete="off"
                          rows={3}
                          placeholder={field.placeholder || `Ketik ${field.label}...`}
                          value={val}
                          maxLength={field.max_length}
                          onChange={(e) => onChange(field.key, e.target.value)}
                          className="w-full rounded-input border border-border bg-surface px-3 py-2 text-xs leading-relaxed text-text-main placeholder:text-text-muted/60 focus:border-primary focus:outline-hidden resize-y"
                        />
                      )}

                      {field.type === "select" && (
                        <select
                          id={`flow-field-${field.key}`}
                          value={val}
                          onChange={(e) => onChange(field.key, e.target.value)}
                          className="w-full text-xs p-2.5 rounded-input border border-border bg-surface text-text-main focus:border-primary focus:outline-hidden"
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {field.options.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      )}

                      {field.type === "combobox" && (
                        <div className="space-y-1.5">
                          <select
                            value={
                              field.options.some((o) => o.value === val) ? val : "__custom__"
                            }
                            onChange={(e) => {
                              if (e.target.value !== "__custom__") {
                                onChange(field.key, e.target.value);
                              }
                            }}
                            className="w-full text-xs p-2.5 rounded-input border border-border bg-surface text-text-main focus:border-primary focus:outline-hidden"
                          >
                            <option value="">-- Pilih dari opsi yang ada --</option>
                            {field.options.map((opt) => (
                              <option key={opt.id} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                            <option value="__custom__">✎ Ketik nilai sendiri...</option>
                          </select>
                          <Input
                            placeholder={`Atau ketik langsung ${field.label}...`}
                            value={val}
                            maxLength={field.max_length}
                            onChange={(e) => onChange(field.key, e.target.value)}
                            className="text-xs"
                          />
                        </div>
                      )}

                      {field.type === "boolean" && (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => onChange(field.key, "true")}
                            className={`flex-1 py-2 px-3 text-xs rounded-xl border font-semibold transition-all ${
                              val === "true" || val === "Ya" || val === "ya"
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs"
                                : "border-border text-text-muted hover:text-text-main hover:bg-surface-elevated"
                            }`}
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() => onChange(field.key, "false")}
                            className={`flex-1 py-2 px-3 text-xs rounded-xl border font-semibold transition-all ${
                              val === "false" || val === "Tidak" || val === "tidak"
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30 shadow-xs"
                                : "border-border text-text-muted hover:text-text-main hover:bg-surface-elevated"
                            }`}
                          >
                            Tidak
                          </button>
                        </div>
                      )}

                      {/* Bantuan & Petunjuk */}
                      {field.help_text && (
                        <p className="text-[10px] text-text-muted flex items-center gap-1">
                          <HelpCircle className="h-3 w-3 shrink-0" />
                          <span>{field.help_text}</span>
                        </p>
                      )}

                      {/* Peringatan Format WhatsApp */}
                      {hasFormatChars && (
                        <p className="text-[10px] text-amber-600 flex items-center gap-1 animate-in fade-in">
                          <AlertCircle className="h-3 w-3 shrink-0" />
                          <span>
                            Isian mengandung karakter format (*, _, ~, `). WhatsApp dapat
                            mengubah teks menjadi miring/tebal.
                          </span>
                        </p>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
