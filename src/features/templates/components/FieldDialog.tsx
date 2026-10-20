"use client";

import React, { useState } from "react";
import { X, Plus, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
  FieldDefinition,
  FieldType,
  DataClass,
  FieldOption,
} from "@/lib/template-engine/types";
import { labelToKey, isValidKey } from "@/lib/validation/unicode";

interface FieldDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (field: FieldDefinition) => void;
  initialField?: FieldDefinition | null;
  existingKeys: string[];
}

export function FieldDialog({
  isOpen,
  onClose,
  onSave,
  initialField,
  existingKeys,
}: FieldDialogProps) {
  const isEditing = !!initialField;

  const [label, setLabel] = useState(initialField?.label || "");
  const [key, setKey] = useState(initialField?.key || "");
  const [type, setType] = useState<FieldType>(initialField?.type || "text");
  const [required, setRequired] = useState(initialField ? initialField.required : true);
  const [dataClass, setDataClass] = useState<DataClass>(initialField?.data_class || "transient");
  const [placeholder, setPlaceholder] = useState(initialField?.placeholder || "");
  const [helpText, setHelpText] = useState(initialField?.help_text || "");
  const [maxLength, setMaxLength] = useState(initialField?.max_length || 200);
  const [defaultValue, setDefaultValue] = useState(initialField?.default_value || "");
  const [options, setOptions] = useState<FieldOption[]>(initialField?.options || []);
  const [newOptionLabel, setNewOptionLabel] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLabelChange = (val: string) => {
    setLabel(val);
    if (!isEditing) {
      setKey(labelToKey(val));
    }
  };

  const handleTypeChange = (newType: FieldType) => {
    setType(newType);
    if (newType === "textarea" && maxLength < 1000) {
      setMaxLength(1000);
    }
    if (newType === "text" && maxLength > 1000) {
      setMaxLength(200);
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
      setError("Label field wajib diisi.");
      return;
    }

    const trimmedKey = key.trim();
    if (!isValidKey(trimmedKey)) {
      setError(
        "Key variabel harus diawali huruf kecil dan hanya berisi huruf kecil, angka, atau garis bawah (contoh: nama_pelanggan)."
      );
      return;
    }

    if (!isEditing || initialField?.key !== trimmedKey) {
      if (existingKeys.includes(trimmedKey)) {
        setError(`Key '${trimmedKey}' sudah digunakan oleh field lain. Pilih key yang berbeda.`);
        return;
      }
    }

    if ((type === "select" || type === "combobox") && options.length === 0) {
      setError(`Field berjenis ${type} wajib memiliki minimal 1 pilihan opsi.`);
      return;
    }

    const fieldResult: FieldDefinition = {
      id: initialField ? initialField.id : crypto.randomUUID(),
      key: trimmedKey,
      label: trimmedLabel,
      type,
      required,
      data_class: dataClass,
      placeholder: placeholder.trim(),
      help_text: helpText.trim(),
      max_length: maxLength,
      allow_custom: type === "combobox",
      default_value: dataClass === "configuration" && defaultValue.trim() ? defaultValue.trim() : null,
      options: type === "select" || type === "combobox" ? options : [],
    };

    onSave(fieldResult);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <Card className="modal-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-border-subtle sticky top-0 bg-surface z-10">
            <CardTitle className="text-base font-semibold">
              {isEditing ? "Edit Variabel Input" : "Tambah Variabel Input"}
            </CardTitle>
            <button
              type="button"
              onClick={onClose}
              className="text-text-muted hover:text-text-main h-8 w-8 flex items-center justify-center rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </CardHeader>

          <CardContent className="pt-4">
            {error && (
              <div className="mb-4 rounded-input bg-danger/10 p-3 text-xs text-danger border border-danger/20">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {/* Label & Key */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">
                    Label Input <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="Contoh: Nama Pelanggan"
                    value={label}
                    onChange={(e) => handleLabelChange(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">
                    Key Variabel (Token) <span className="text-danger">*</span>
                  </label>
                  <Input
                    placeholder="nama_pelanggan"
                    value={key}
                    onChange={(e) => setKey(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    required
                  />
                  <span className="text-[10px] text-text-muted font-mono">
                    Token pesan: {`{{${key || "variabel"}}}`}
                  </span>
                </div>
              </div>

              {/* Jenis Input & Wajib */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">
                    Jenis Kontrol
                  </label>
                  <select
                    className="flex h-12 w-full rounded-input border border-border-input bg-input-bg px-3 text-sm text-text-main focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    value={type}
                    onChange={(e) => handleTypeChange(e.target.value as FieldType)}
                  >
                    <option value="text">Teks Singkat (text)</option>
                    <option value="textarea">Teks Panjang (textarea)</option>
                    <option value="select">Dropdown Pilihan Kaku (select)</option>
                    <option value="combobox">Dropdown + Ketik Baru (combobox)</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">
                    Status Isian
                  </label>
                  <div className="flex items-center gap-4 h-12">
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        checked={required}
                        onChange={() => setRequired(true)}
                        className="text-primary"
                      />
                      <span>Wajib diisi</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-medium cursor-pointer">
                      <input
                        type="radio"
                        checked={!required}
                        onChange={() => setRequired(false)}
                        className="text-primary"
                      />
                      <span>Opsional</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Klasifikasi Data (PRD 7.2) */}
              <div className="flex flex-col gap-2 rounded-input bg-input-bg p-3.5 border border-border-subtle">
                <label className="text-xs font-semibold text-text-main flex items-center justify-between">
                  <span>Klasifikasi Data</span>
                  <span className="text-[10px] text-text-muted font-normal">
                    Pencegahan Rekam Riwayat Pelanggan
                  </span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <label
                    className={`p-2.5 rounded-input border text-xs cursor-pointer transition-all ${
                      dataClass === "transient"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border-subtle bg-surface text-text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={dataClass === "transient"}
                      onChange={() => {
                        setDataClass("transient");
                        setDefaultValue("");
                      }}
                    />
                    <div className="font-semibold mb-0.5">Data Pelanggan (Transient)</div>
                    <div className="text-[11px] leading-tight text-text-muted">
                      Selalu dimulai kosong. Tidak menyimpan nilai bawaan.
                    </div>
                  </label>

                  <label
                    className={`p-2.5 rounded-input border text-xs cursor-pointer transition-all ${
                      dataClass === "configuration"
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border-subtle bg-surface text-text-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      className="sr-only"
                      checked={dataClass === "configuration"}
                      onChange={() => setDataClass("configuration")}
                    />
                    <div className="font-semibold mb-0.5">Konfigurasi Umum</div>
                    <div className="text-[11px] leading-tight text-text-muted">
                      Nilai umum bisnis (misal: nama toko) yang boleh memiliki default.
                    </div>
                  </label>
                </div>

                {dataClass === "configuration" && (
                  <div className="mt-2 flex flex-col gap-1.5 pt-2 border-t border-border-subtle">
                    <label className="text-xs font-semibold text-text-main">
                      Nilai Bawaan (Default Value)
                    </label>
                    <Input
                      placeholder="Contoh: Toko Berkah Jaya"
                      value={defaultValue}
                      onChange={(e) => setDefaultValue(e.target.value)}
                    />
                    <div className="flex items-center gap-1 text-[11px] text-amber-700">
                      <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                      <span>Gunakan nilai umum. Jangan masukkan data transaksi atau nama pelanggan.</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Opsi Dropdown jika select/combobox */}
              {(type === "select" || type === "combobox") && (
                <div className="flex flex-col gap-2 rounded-input bg-surface p-3.5 border border-border-subtle">
                  <label className="text-xs font-semibold text-text-main">
                    Daftar Opsi Pilihan ({options.length}/100)
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Ketik opsi baru lalu klik Tambah"
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddOption();
                        }
                      }}
                    />
                    <Button type="button" variant="secondary" onClick={handleAddOption} className="shrink-0">
                      <Plus className="h-4 w-4 mr-1" />
                      Tambah
                    </Button>
                  </div>

                  {options.length > 0 ? (
                    <div className="flex flex-wrap gap-2 mt-2 max-h-36 overflow-y-auto pt-1">
                      {options.map((opt) => (
                        <div
                          key={opt.id}
                          className="flex items-center gap-1.5 rounded-pill bg-input-bg border border-border-subtle px-3 py-1 text-xs text-text-main"
                        >
                          <span>{opt.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(opt.id)}
                            className="text-text-muted hover:text-danger ml-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-text-muted italic">Belum ada opsi pilihan.</span>
                  )}
                </div>
              )}

              {/* Placeholder, Help Text, Max Length */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="flex flex-col gap-1.5 sm:col-span-2">
                  <label className="text-xs font-semibold text-text-main">Placeholder</label>
                  <Input
                    placeholder="Contoh isian panduan"
                    value={placeholder}
                    onChange={(e) => setPlaceholder(e.target.value)}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-text-main">Maks. Karakter</label>
                  <Input
                    type="number"
                    min={1}
                    max={type === "textarea" ? 3000 : 1000}
                    value={maxLength}
                    onChange={(e) => setMaxLength(parseInt(e.target.value, 10) || 200)}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-main">Teks Bantuan (Help Text)</label>
                <Input
                  placeholder="Keterangan kecil di bawah input formulir"
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                />
              </div>

              {/* Tombol Aksi */}
              <div className="flex justify-end gap-2 pt-3 border-t border-border-subtle">
                <Button type="button" variant="secondary" onClick={onClose}>
                  Batal
                </Button>
                <Button type="submit" className="font-semibold">
                  {isEditing ? "Simpan Perubahan" : "Tambahkan ke Template"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
