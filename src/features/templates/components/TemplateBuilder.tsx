"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Bold,
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Edit3,
  Star,
  AlertTriangle,
  CheckCircle2,
  Eye,
  RefreshCw,
  Copy,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FieldDialog } from "./FieldDialog";
import {
  TemplateDefinition,
  FieldDefinition,
} from "@/lib/template-engine/types";
import { parseTemplate, validateTemplateVariables } from "@/lib/template-engine/parser";
import { renderTemplate } from "@/lib/template-engine/renderer";
import {
  createTemplateAction,
  updateTemplateAction,
} from "../actions/template-actions";

interface TemplateBuilderProps {
  initialData?: TemplateDefinition;
  isEditing?: boolean;
}

export function TemplateBuilder({ initialData, isEditing = false }: TemplateBuilderProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State Form Utama
  const [title, setTitle] = useState(initialData?.title || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [description, setDescription] = useState(initialData?.description || "");
  const [body, setBody] = useState(initialData?.body || "");
  const [fields, setFields] = useState<FieldDefinition[]>(initialData?.fields || []);
  const [isFavorite, setIsFavorite] = useState(initialData?.is_favorite || false);
  const version = initialData?.version || 1;

  // State UI & Dialog
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isConflictModalOpen, setIsConflictModalOpen] = useState(false);
  const [previewTab, setPreviewTab] = useState<"whatsapp" | "plain">("whatsapp");

  // Track apakah form memiliki perubahan tanpa memicu cascading setState
  const isDirty = useMemo(() => {
    if (!initialData) {
      return title !== "" || body !== "" || fields.length > 0;
    }
    return (
      title !== initialData.title ||
      category !== initialData.category ||
      description !== initialData.description ||
      body !== initialData.body ||
      isFavorite !== initialData.is_favorite ||
      JSON.stringify(fields) !== JSON.stringify(initialData.fields)
    );
  }, [title, category, description, body, fields, isFavorite, initialData]);

  // Proteksi sebelum menutup tab jika ada draf yang belum disimpan
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // Validasi AST dan sinkronisasi token secara real-time
  const parseValidation = useMemo(() => {
    try {
      const ast = parseTemplate(body);
      const fieldKeys = fields.map((f) => f.key);
      const syncValidation = validateTemplateVariables(ast, fieldKeys);
      return {
        ast,
        isValid: syncValidation.isValid,
        syntaxError: null,
        missingFields: syncValidation.missingFields,
        unusedFields: syncValidation.unusedFields,
        errors: syncValidation.errors,
      };
    } catch (err) {
      return {
        ast: null,
        isValid: false,
        syntaxError: (err as Error).message,
        missingFields: [],
        unusedFields: [],
        errors: [(err as Error).message],
      };
    }
  }, [body, fields]);

  // Pratinjau Sementara dengan data simulasi fiktif
  const previewSimulation = useMemo(() => {
    if (!parseValidation.ast) return { text: "Perbaiki format teks untuk melihat pratinjau." };
    const mockValues: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.default_value) {
        mockValues[f.key] = f.default_value;
      } else if (f.options.length > 0) {
        mockValues[f.key] = f.options[0].value;
      } else {
        mockValues[f.key] = `[${f.label}]`;
      }
    });

    return renderTemplate(parseValidation.ast, fields, mockValues, previewTab, {
      previewMode: true,
    });
  }, [parseValidation.ast, fields, previewTab]);

  // Toolbar Bold: Sisipkan atau bungkus teks aktif
  const handleInsertBold = () => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const selectedText = body.slice(start, end);

    let replacement = "**teks tebal**";
    let newCursorPos = start + 2;

    if (selectedText.length > 0) {
      replacement = `**${selectedText}**`;
      newCursorPos = end + 4;
    }

    const newBody = body.slice(0, start) + replacement + body.slice(end);
    setBody(newBody);

    setTimeout(() => {
      el.focus();
      el.setSelectionRange(newCursorPos, newCursorPos);
    }, 0);
  };

  // Toolbar Sisip Variabel
  const handleInsertVariableToken = (tokenKey: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;

    const tokenString = `{{${tokenKey}}}`;
    const newBody = body.slice(0, start) + tokenString + body.slice(end);
    setBody(newBody);

    setTimeout(() => {
      el.focus();
      const nextPos = start + tokenString.length;
      el.setSelectionRange(nextPos, nextPos);
    }, 0);
  };

  // Field Reordering
  const handleMoveField = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= fields.length) return;
    const newFields = [...fields];
    const temp = newFields[index];
    newFields[index] = newFields[targetIndex];
    newFields[targetIndex] = temp;
    setFields(newFields);
  };

  // Field Deletion
  const handleDeleteField = (fieldToDelete: FieldDefinition) => {
    const isUsedInBody = body.includes(`{{${fieldToDelete.key}}}`);
    if (isUsedInBody) {
      alert(
        `Variabel '{{${fieldToDelete.key}}}' masih digunakan dalam teks pesan. Hapus token '{{${fieldToDelete.key}}}' dari isi pesan terlebih dahulu sebelum menghapus field ini.`
      );
      return;
    }
    setFields(fields.filter((f) => f.id !== fieldToDelete.id));
  };

  // Simpan / Submit Handler
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);

    if (!title.trim()) {
      setSaveError("Judul template wajib diisi.");
      return;
    }

    if (!parseValidation.isValid) {
      setSaveError(parseValidation.errors[0] || "Struktur template belum valid.");
      return;
    }

    setIsSaving(true);

    try {
      if (isEditing && initialData?.id) {
        // Update dengan optimistic lock CAS
        const result = await updateTemplateAction({
          id: initialData.id,
          expected_version: version,
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          body,
          fields,
          is_favorite: isFavorite,
          is_archived: initialData.is_archived,
        });

        if (!result.success) {
          if (result.code === "CONFLICT") {
            setIsConflictModalOpen(true);
          } else {
            setSaveError(result.error || "Gagal memperbarui template.");
          }
        } else {
          router.push("/app/templates");
        }
      } else {
        // Buat baru
        const result = await createTemplateAction({
          title: title.trim(),
          description: description.trim(),
          category: category.trim(),
          body,
          fields,
          is_favorite: isFavorite,
          is_archived: false,
          starter_key: null,
          schema_version: 1,
          version: 1,
        });

        if (!result.success) {
          setSaveError(result.error || "Gagal membuat template.");
        } else {
          router.push("/app/templates");
        }
      }
    } catch {
      setSaveError("Terjadi gangguan jaringan saat menyimpan template.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 max-w-5xl mx-auto pb-20">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/app/templates">
            <Button variant="ghost" size="icon" className="h-10 w-10 rounded-pill">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-main">
                {isEditing ? "Edit Template" : "Buat Template Baru"}
              </h1>
              {isEditing && (
                <Badge variant="secondary" className="text-[10px] font-mono">
                  v{version}
                </Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">
              Atur teks pesan dan konfigurasi formulir input dinamis yang otomatis menyesuaikan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/app/templates">
            <Button variant="secondary" size="sm">
              Batal
            </Button>
          </Link>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !parseValidation.isValid}
            className="font-semibold min-w-[130px]"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                Menyimpan...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-1.5" />
                {isEditing ? "Simpan Perubahan" : "Simpan Template"}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Global Error Banner */}
      {saveError && (
        <div className="rounded-input bg-danger/10 p-3.5 text-xs text-danger border border-danger/20 flex items-start gap-2.5">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Bagian 1: Identitas Template */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">1. Identitas Template</CardTitle>
          <button
            type="button"
            onClick={() => setIsFavorite(!isFavorite)}
            className="flex items-center gap-1.5 text-xs font-medium text-text-muted hover:text-amber-500 transition-colors"
          >
            <Star className={`h-4 w-4 ${isFavorite ? "fill-amber-400 text-amber-500" : ""}`} />
            <span>{isFavorite ? "Favorit" : "Tandai Favorit"}</span>
          </button>
        </CardHeader>
        <CardContent className="pt-5 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5 md:col-span-2">
            <label className="text-xs font-semibold text-text-main">
              Judul Template <span className="text-danger">*</span>
            </label>
            <Input
              placeholder="Misal: Pesanan Mengalami Kendala"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-main">Kategori</label>
            <Input
              placeholder="Misal: Kendala, Transaksi, Pengiriman"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              maxLength={50}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-text-main">Deskripsi Singkat</label>
            <Input
              placeholder="Catatan penggunaan template ini"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>

      {/* Bagian 2: Isi Pesan & Toolbar Variabel */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <CardTitle className="text-base font-semibold">2. Isi Pesan & Variabel</CardTitle>
            <CardDescription className="text-xs">
              Gunakan **teks tebal** dan {"{{key_variabel}}"} untuk nilai dinamis.
            </CardDescription>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleInsertBold}
              className="h-8 px-2.5 text-xs"
              title="Bungkus dengan format tebal (**)"
            >
              <Bold className="h-3.5 w-3.5 mr-1" />
              Tebal (Bold)
            </Button>

            {fields.length > 0 && (
              <div className="relative group">
                <Button type="button" variant="secondary" size="sm" className="h-8 px-2.5 text-xs text-primary">
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  Sisipkan Variabel
                </Button>
                <div className="hidden group-hover:flex group-focus-within:flex flex-col absolute right-0 top-full mt-1 bg-surface border border-border-subtle rounded-card p-1.5 shadow-lg z-20 min-w-[180px]">
                  <span className="text-[10px] text-text-muted px-2 py-1 font-semibold uppercase">Pilih Variabel:</span>
                  {fields.map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => handleInsertVariableToken(f.key)}
                      className="text-left px-2 py-1.5 text-xs rounded-input hover:bg-input-bg text-text-main font-mono flex items-center justify-between"
                    >
                      <span>{`{{${f.key}}}`}</span>
                      <span className="text-[10px] text-text-muted font-sans">{f.type}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-3">
          <textarea
            ref={textareaRef}
            rows={9}
            className="w-full rounded-input border border-border-input bg-input-bg p-4 text-sm font-mono text-text-main leading-relaxed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            placeholder="Ketik isi template pesan di sini..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />

          {!parseValidation.isValid && (
            <div className="rounded-input bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200 flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
                <span>Pemeriksaan Token & Format Pesan:</span>
              </div>
              <ul className="list-disc pl-5 space-y-0.5">
                {parseValidation.errors.map((err, i) => (
                  <li key={i}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {parseValidation.isValid && body.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-success font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Semua token dan format pesan telah cocok dengan input formulir.</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bagian 3: Pengaturan Input Formulir */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">
              3. Daftar Variabel Input Formulir ({fields.length}/30)
            </CardTitle>
            <CardDescription className="text-xs">
              Urutan di bawah menentukan susunan input formulir saat customer service mengisi pesan.
            </CardDescription>
          </div>

          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              setEditingField(null);
              setIsFieldDialogOpen(true);
            }}
            disabled={fields.length >= 30}
            className="text-xs font-semibold"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Tambah Variabel
          </Button>
        </CardHeader>

        <CardContent className="pt-4 flex flex-col gap-2.5">
          {fields.length === 0 ? (
            <div className="rounded-input border border-dashed border-border-subtle p-8 text-center text-text-muted text-xs">
              Belum ada variabel input. Klik tombol <strong>+ Tambah Variabel</strong> di atas untuk membuat input pertama.
            </div>
          ) : (
            fields.map((field, index) => (
              <div
                key={field.id}
                className="flex items-center justify-between gap-3 p-3 rounded-input bg-surface border border-border-subtle hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex flex-col gap-0.5 shrink-0">
                    <button
                      type="button"
                      disabled={index === 0}
                      onClick={() => handleMoveField(index, "up")}
                      className="text-text-muted hover:text-text-main disabled:opacity-30 p-0.5"
                      title="Pindahkan ke atas"
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={index === fields.length - 1}
                      onClick={() => handleMoveField(index, "down")}
                      className="text-text-muted hover:text-text-main disabled:opacity-30 p-0.5"
                      title="Pindahkan ke bawah"
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-main truncate">
                        {field.label}
                      </span>
                      <code className="text-xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded">
                        {`{{${field.key}}}`}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-text-muted mt-0.5">
                      <Badge variant="secondary" className="text-[10px] py-0 px-1.5 uppercase">
                        {field.type}
                      </Badge>
                      <span>{field.required ? "Wajib" : "Opsional"}</span>
                      <span>&bull;</span>
                      <span>{field.data_class === "transient" ? "Data Pelanggan" : "Konfigurasi"}</span>
                      {field.options.length > 0 && (
                        <>
                          <span>&bull;</span>
                          <span>{field.options.length} opsi</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-text-main"
                    onClick={() => {
                      setEditingField(field);
                      setIsFieldDialogOpen(true);
                    }}
                    title="Edit Field"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-danger"
                    onClick={() => handleDeleteField(field)}
                    title="Hapus Field"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Bagian 4: Pratinjau Sementara Builder */}
      <Card>
        <CardHeader className="pb-3 border-b border-border-subtle flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Eye className="h-4 w-4 text-primary" />
            4. Pratinjau Sementara Simulasi
          </CardTitle>

          <div className="inline-flex rounded-pill bg-input-bg p-1 border border-border-subtle">
            <button
              type="button"
              onClick={() => setPreviewTab("whatsapp")}
              className={`rounded-pill px-3 py-1 text-xs font-medium ${
                previewTab === "whatsapp" ? "bg-surface shadow-xs font-semibold" : "text-text-muted"
              }`}
            >
              WhatsApp
            </button>
            <button
              type="button"
              onClick={() => setPreviewTab("plain")}
              className={`rounded-pill px-3 py-1 text-xs font-medium ${
                previewTab === "plain" ? "bg-surface shadow-xs font-semibold" : "text-text-muted"
              }`}
            >
              Teks Biasa
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          <div className="min-h-[160px] rounded-input bg-input-bg p-4 border border-border-subtle font-sans text-xs md:text-sm leading-relaxed whitespace-pre-line text-text-main">
            {previewSimulation.text}
          </div>
          <span className="text-[11px] text-text-muted mt-2 block">
            * Data di atas adalah data simulasi contoh dan tidak ikut tersimpan ke database.
          </span>
        </CardContent>
      </Card>

      {/* Dialog Konfigurasi Field Modal dengan key prop agar state terisolasi bersih */}
      <FieldDialog
        key={editingField ? editingField.id : "new-field"}
        isOpen={isFieldDialogOpen}
        onClose={() => {
          setIsFieldDialogOpen(false);
          setEditingField(null);
        }}
        initialField={editingField}
        existingKeys={fields.map((f) => f.key)}
        onSave={(savedField) => {
          if (editingField) {
            setFields(fields.map((f) => (f.id === savedField.id ? savedField : f)));
          } else {
            setFields([...fields, savedField]);
          }
        }}
      />

      {/* Modal Penanganan Konflik Versi (SAVE-01) */}
      {isConflictModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="max-w-md modal-shadow">
            <CardHeader>
              <div className="flex items-center gap-2 text-danger font-semibold">
                <AlertTriangle className="h-5 w-5" />
                <span>Konflik Perubahan Terdeteksi</span>
              </div>
              <CardDescription className="pt-1 text-xs text-text-muted leading-relaxed">
                Template ini telah diperbarui di tab atau perangkat lain sejak Anda membukanya. Untuk mencegah penimpaan perubahan yang tidak disengaja, silakan pilih salah satu tindakan:
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => {
                  window.location.reload();
                }}
                className="w-full justify-start text-xs"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Muat Ulang Data Terbaru (Buang draf ini)
              </Button>

              <Button
                onClick={async () => {
                  setIsConflictModalOpen(false);
                  setIsSaving(true);
                  const newTitle = `Salinan Baru — ${title}`.slice(0, 100);
                  const res = await createTemplateAction({
                    title: newTitle,
                    description,
                    category,
                    body,
                    fields,
                    is_favorite: false,
                    is_archived: false,
                    starter_key: null,
                    schema_version: 1,
                    version: 1,
                  });
                  setIsSaving(false);
                  if (res.success) {
                    router.push("/app/templates");
                  }
                }}
                className="w-full justify-start text-xs font-semibold"
              >
                <Copy className="h-4 w-4 mr-2" />
                Simpan sebagai Salinan Baru (Amankan draf)
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
