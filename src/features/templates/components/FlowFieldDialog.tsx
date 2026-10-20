"use client";

import React, { useState } from "react";
import { X, Plus, ShieldAlert, Sparkles, Hash, ToggleLeft, AlignLeft, FileText, List, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  FlowFieldDefinition,
  FlowFieldType,
  FlowDataClass,
  FlowFieldOption,
} from "@/lib/template-engine/flow-types";
import { labelToKey, isValidKey } from "@/lib/validation/unicode";

interface FlowFieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FlowFieldDefinition) => void;
  initialField?: FlowFieldDefinition | null;
  existingKeys: string[];
}

const FIELD_TYPES: { type: FlowFieldType; label: string; desc: string; icon: React.ElementType }[] = [
  {
    type: "text",
    label: "Teks Singkat",
    desc: "1 baris (Nama, ID Order, Nomor)",
    icon: AlignLeft,
  },
  {
    type: "textarea",
    label: "Teks Panjang",
    desc: "Multi-baris (Penjelasan kendala, catatan)",
    icon: FileText,
  },
  {
    type: "select",
    label: "Dropdown Pilihan",
    desc: "Pilihan kaku / baku yang sudah ditentukan",
    icon: List,
  },
  {
    type: "combobox",
    label: "Ketik Baru + Dropdown",
    desc: "Bisa memilih opsi atau mengetik nilai baru",
    icon: SlidersHorizontal,
  },
  {
    type: "number",
    label: "Nomor / Angka",
    desc: "Kuantitas, Nominal Rupiah, atau Hari",
    icon: Hash,
  },
  {
    type: "boolean",
    label: "Ya / Tidak",
    desc: "Pertanyaan biner penentu alur cabang",
    icon: ToggleLeft,
  },
];

export function FlowFieldDialog({
  isOpen,
  onClose,
  onSave,
  initialField,
  existingKeys,
}: FlowFieldDialogProps) {
  const isEditing = !!initialField;

  const [label, setLabel] = useState(initialField?.label || "");
  const [key, setKey] = useState(initialField?.key || "");
  const [type, setType] = useState<FlowFieldType>(initialField?.type || "text");
  const [required, setRequired] = useState(initialField ? initialField.required : true);
  const [dataClass, setDataClass] = useState<FlowDataClass>(initialField?.data_class || "transient");
  const [placeholder, setPlaceholder] = useState(initialField?.placeholder || "");
  const [helpText, setHelpText] = useState(initialField?.help_text || "");
  const [maxLength, setMaxLength] = useState(initialField?.max_length || 200);
  const [defaultValue, setDefaultValue] = useState(initialField?.default_value || "");
  const [minVal, setMinVal] = useState<number | undefined>(initialField?.min);
  const [maxVal, setMaxVal] = useState<number | undefined>(initialField?.max);
  const [options, setOptions] = useState<FlowFieldOption[]>(
    initialField?.options ||
      (type === "boolean"
        ? [
            { id: "opt-1", label: "Ya", value: "true" },
            { id: "opt-2", label: "Tidak", value: "false" },
          ]
        : [])
  );
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!isEditing) {
      setKey(labelToKey(val));
    }
  };

  const handleTypeChange = (newType: FlowFieldType) => {
    setType(newType);
    if (newType === "textarea" && maxLength < 1000) {
      setMaxLength(1000);
    }
    if (newType === "text" && maxLength > 1000) {
      setMaxLength(200);
    }
    if (newType === "boolean") {
      setOptions([
        { id: "opt-1", label: "Ya", value: "true" },
        { id: "opt-2", label: "Tidak", value: "false" },
      ]);
    }
  };

  const handleAddOption = () => {
    const trimmed = newOptionLabel.trim();
    if (!trimmed) return;
    if (options.some((opt) => opt.value.toLowerCase() === trimmed.toLowerCase())) {
      setError(`Opsi '${trimmed}' sudah terdaftar.`);
      return;
    }
    setOptions([
      ...options,
      {
        id: crypto.randomUUID(),
        label: trimmed,
        value: trimmed,
      },
    ]);
    setNewOptionLabel("");
    setError(null);
  };

  const handleRemoveOption = (optId: string) => {
    setOptions(options.filter((opt) => opt.id !== optId));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedLabel = label.trim();
    if (!trimmedLabel) {
      setError("Label variabel wajib diisi.");
      return;
    }

    const trimmedKey = key.trim();
    if (!isValidKey(trimmedKey)) {
      setError(
        "Key variabel harus diawali huruf kecil dan hanya boleh berisi huruf kecil, angka, atau garis bawah (contoh: id_order)."
      );
      return;
    }

    // Cek duplikasi key
    const isKeyDuplicate = existingKeys.some(
      (k) => k === trimmedKey && (!initialField || initialField.key !== trimmedKey)
    );
    if (isKeyDuplicate) {
      setError(`Variabel dengan token '{{${trimmedKey}}}' sudah digunakan. Gunakan token lain.`);
      return;
    }

    if ((type === "select" || type === "combobox") && options.length === 0) {
      setError("Field dropdown wajib memiliki minimal 1 pilihan opsi.");
      return;
    }

    if (type === "number" && minVal !== undefined && maxVal !== undefined && minVal > maxVal) {
      setError("Nilai minimum tidak boleh lebih besar dari nilai maksimum.");
      return;
    }

    const newField: FlowFieldDefinition = {
      id: initialField?.id || crypto.randomUUID(),
      key: trimmedKey,
      label: trimmedLabel,
      type,
      required,
      data_class: dataClass,
      placeholder: placeholder.trim(),
      help_text: helpText.trim(),
      max_length: Number(maxLength) || 200,
      allow_custom: type === "combobox",
      default_value: dataClass === "configuration" && defaultValue.trim() ? defaultValue.trim() : null,
      options: type === "select" || type === "combobox" || type === "boolean" ? options : [],
      min: type === "number" ? minVal : undefined,
      max: type === "number" ? maxVal : undefined,
    };

    onSave(newField);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <Card className="w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl border-border bg-card">
        <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-lg">
                {isEditing ? "Edit Variabel Formulir" : "Tambah Variabel Baru"}
              </CardTitle>
              <p className="text-xs text-text-muted">
                Variabel ini akan muncul sebagai input saat Customer Service menyusun pesan.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </CardHeader>

        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-4">
            {error && (
              <div className="p-3 text-xs bg-danger/10 border border-danger/30 text-danger rounded-xl flex items-start gap-2">
                <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Pilihan Tipe Kontrol Input */}
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1.5">
                Tipe Input Formulir
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {FIELD_TYPES.map((ft) => {
                  const Icon = ft.icon;
                  const isSelected = type === ft.type;
                  return (
                    <button
                      key={ft.type}
                      type="button"
                      onClick={() => handleTypeChange(ft.type)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/30"
                          : "border-border hover:border-text-muted/40 hover:bg-surface-elevated text-text-muted hover:text-text-main"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 font-semibold text-xs">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span>{ft.label}</span>
                      </div>
                      <span className="text-[10px] text-text-muted leading-tight line-clamp-2">
                        {ft.desc}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Label & Token Key */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Label Variabel (Tampil di Form) <span className="text-danger">*</span>
                </label>
                <Input
                  value={label}
                  onChange={(e) => handleLabelChange(e.target.value)}
                  placeholder="Contoh: Nama Pelanggan"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Token Template <span className="text-text-muted font-normal">(snake_case)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-text-muted font-mono">{`{{`}</span>
                  <Input
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_"))}
                    placeholder="nama_pelanggan"
                    className="font-mono text-xs pl-7 pr-7"
                    required
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-text-muted font-mono">{`}}`}</span>
                </div>
              </div>
            </div>

            {/* Konfigurasi Khusus Number */}
            {type === "number" && (
              <div className="grid grid-cols-2 gap-3 p-3 bg-surface-elevated rounded-xl border border-border">
                <div>
                  <label className="block text-xs font-medium text-text-main mb-1">
                    Nilai Minimum (Min)
                  </label>
                  <Input
                    type="number"
                    value={minVal !== undefined ? minVal : ""}
                    onChange={(e) => setMinVal(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Contoh: 0 atau 1"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-main mb-1">
                    Nilai Maksimum (Max)
                  </label>
                  <Input
                    type="number"
                    value={maxVal !== undefined ? maxVal : ""}
                    onChange={(e) => setMaxVal(e.target.value ? Number(e.target.value) : undefined)}
                    placeholder="Contoh: 100 atau 14"
                  />
                </div>
              </div>
            )}

            {/* Konfigurasi Opsi Dropdown / Select / Combobox */}
            {(type === "select" || type === "combobox") && (
              <div className="p-3 bg-surface-elevated rounded-xl border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-main">
                    Daftar Pilihan Opsi ({options.length})
                  </label>
                  <span className="text-[10px] text-text-muted">
                    {type === "combobox" ? "CS dapat memilih atau mengetik nilai baru" : "CS wajib memilih salah satu"}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={newOptionLabel}
                    onChange={(e) => setNewOptionLabel(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddOption();
                      }
                    }}
                    placeholder="Ketik opsi lalu tekan Tambah..."
                    className="text-xs"
                  />
                  <Button type="button" size="sm" variant="secondary" onClick={handleAddOption}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Tambah
                  </Button>
                </div>

                {options.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pt-1">
                    {options.map((opt) => (
                      <span
                        key={opt.id}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-surface rounded-lg border border-border text-xs text-text-main"
                      >
                        <span>{opt.label}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveOption(opt.id)}
                          className="text-text-muted hover:text-danger transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-[11px] text-text-muted italic">
                    Belum ada opsi ditambahkan. Masukkan minimal 1 opsi.
                  </p>
                )}
              </div>
            )}

            {/* Klasifikasi Data (Zero Storage Protection) */}
            <div className="p-3 bg-surface-elevated rounded-xl border border-border space-y-2">
              <label className="block text-xs font-semibold text-text-main">
                Klasifikasi Data & Privasi Pelanggan
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setDataClass("transient");
                    setDefaultValue("");
                  }}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    dataClass === "transient"
                      ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                      : "border-border text-text-muted hover:text-text-main"
                  }`}
                >
                  <div className="text-xs font-semibold mb-0.5">Data Pelanggan (Transient)</div>
                  <div className="text-[10px] leading-tight text-text-muted">
                    Nama, ID order, keluhan. Tidak pernah disimpan sebagai default.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setDataClass("configuration")}
                  className={`p-2.5 rounded-xl border text-left transition-all ${
                    dataClass === "configuration"
                      ? "border-primary bg-primary/10 text-primary font-medium ring-1 ring-primary/30"
                      : "border-border text-text-muted hover:text-text-main"
                  }`}
                >
                  <div className="text-xs font-semibold mb-0.5">Konfigurasi Toko (Re-usable)</div>
                  <div className="text-[10px] leading-tight text-text-muted">
                    Nama toko, salam pembuka. Boleh memiliki nilai default tersimpan.
                  </div>
                </button>
              </div>

              {dataClass === "configuration" && (
                <div className="pt-2 animate-in fade-in">
                  <label className="block text-xs font-medium text-text-main mb-1">
                    Nilai Bawaan Tersimpan (Default Value)
                  </label>
                  <Input
                    value={defaultValue}
                    onChange={(e) => setDefaultValue(e.target.value)}
                    placeholder="Contoh: Toko Berkah Jaya"
                  />
                  <p className="text-[10px] text-text-muted mt-1">
                    Nilai ini otomatis terisi saat CS membuka template.
                  </p>
                </div>
              )}
            </div>

            {/* Bantuan & Placeholder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-text-main mb-1">
                  Placeholder Input
                </label>
                <Input
                  value={placeholder}
                  onChange={(e) => setPlaceholder(e.target.value)}
                  placeholder="Contoh: ORD-12345"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-text-main mb-1">
                  Teks Petunjuk / Bantuan CS
                </label>
                <Input
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  placeholder="Contoh: Masukkan resi tanpa spasi"
                />
              </div>
            </div>

            {/* Wajib Diisi & Batas Panjang */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-text-main">
                <input
                  type="checkbox"
                  checked={required}
                  onChange={(e) => setRequired(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary h-4 w-4"
                />
                <span>Wajib diisi oleh CS sebelum salin</span>
              </label>

              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>Maks. Karakter:</span>
                <input
                  type="number"
                  value={maxLength}
                  onChange={(e) => setMaxLength(Number(e.target.value))}
                  className="w-16 px-2 py-1 text-xs border border-border rounded-lg bg-surface text-center"
                  min={1}
                  max={type === "textarea" ? 3000 : 1000}
                />
              </div>
            </div>
          </CardContent>

          <div className="flex items-center justify-end gap-2 p-4 border-t border-border bg-surface-elevated/50 rounded-b-xl">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Batal
            </Button>
            <Button type="submit" size="sm">
              {isEditing ? "Simpan Perubahan" : "Tambahkan ke Langkah"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
