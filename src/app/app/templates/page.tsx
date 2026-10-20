"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Star,
  Copy,
  Edit3,
  Archive,
  Trash2,
  Sparkles,
  Loader2,
  FileQuestion,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  listTemplatesAction,
  duplicateTemplateAction,
  deleteTemplateAction,
  toggleFavoriteAction,
  toggleArchiveAction,
  createTemplateAction,
} from "@/features/templates/actions/template-actions";
import { TemplateListItem } from "@/lib/template-engine/types";
import { STARTER_TEMPLATES } from "@/lib/template-engine/starters";

export default function TemplatesListPage() {
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"all" | "favorite" | "archived">("all");
  const [isPending, startTransition] = useTransition();

  // Dialog Konfirmasi Hapus
  const [deletingTemplate, setDeletingTemplate] = useState<TemplateListItem | null>(null);
  const [deleteConfirmTitle, setDeleteConfirmTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  const loadTemplates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await listTemplatesAction({
        search: search.trim() || undefined,
        category: selectedCategory || undefined,
        filter: activeTab,
      });
      if (res.success) {
        setTemplates(res.data);
      }
    } finally {
      setLoading(false);
    }
  }, [search, selectedCategory, activeTab]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadTemplates();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadTemplates]);

  // Ekstraksi kategori unik untuk filter chips
  const categories = Array.from(
    new Set(templates.map((t) => t.category).filter(Boolean))
  );

  const handleToggleFavorite = async (tpl: TemplateListItem) => {
    startTransition(async () => {
      const res = await toggleFavoriteAction(tpl.id, tpl.is_favorite, tpl.version);
      if (res.success) {
        setTemplates((prev) =>
          prev.map((t) =>
            t.id === tpl.id ? { ...t, is_favorite: !t.is_favorite, version: t.version + 1 } : t
          )
        );
      }
    });
  };

  const handleToggleArchive = async (tpl: TemplateListItem) => {
    startTransition(async () => {
      const res = await toggleArchiveAction(tpl.id, tpl.is_archived, tpl.version);
      if (res.success) {
        loadTemplates();
      }
    });
  };

  const handleDuplicate = async (tpl: TemplateListItem) => {
    startTransition(async () => {
      const res = await duplicateTemplateAction(tpl.id);
      if (res.success) {
        loadTemplates();
      }
    });
  };

  const handleDelete = async () => {
    if (!deletingTemplate) return;
    if (deleteConfirmTitle !== deletingTemplate.title) return;

    setIsDeleting(true);
    try {
      const res = await deleteTemplateAction(deletingTemplate.id, deletingTemplate.version);
      if (res.success) {
        setDeletingTemplate(null);
        setDeleteConfirmTitle("");
        loadTemplates();
      }
    } finally {
      setIsDeleting(false);
    }
  };

  // Inisialisasi 6 Template Contoh
  const handleLoadStarters = async () => {
    setLoading(true);
    try {
      for (const starter of STARTER_TEMPLATES) {
        await createTemplateAction(starter);
      }
      await loadTemplates();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main flex items-center gap-2">
            Template Saya
            {isPending && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </h1>
          <p className="text-sm text-text-muted">
            Kelola kata-kata pesan dan konfigurasi formulir input dinamis Anda.
          </p>
        </div>

        <Link href="/app/templates/new">
          <Button className="w-full sm:w-auto font-semibold">
            <Plus className="h-4 w-4 mr-2" />
            Buat Template Baru
          </Button>
        </Link>
      </div>

      {/* Bar Pencarian & Filter Tab */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <Input
            placeholder="Cari judul template atau kategori..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="inline-flex rounded-pill bg-input-bg p-1 border border-border-subtle shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("all")}
            className={`rounded-pill px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "all" ? "bg-surface text-text-main shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            Semua
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("favorite")}
            className={`rounded-pill px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "favorite" ? "bg-surface text-text-main shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            Favorit
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("archived")}
            className={`rounded-pill px-3.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === "archived" ? "bg-surface text-text-main shadow-xs" : "text-text-muted hover:text-text-main"
            }`}
          >
            Arsip
          </button>
        </div>
      </div>

      {/* Filter Kategori Chips */}
      {categories.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          <Badge
            variant={selectedCategory === null ? "default" : "secondary"}
            onClick={() => setSelectedCategory(null)}
            className="cursor-pointer py-1 px-3"
          >
            Semua Kategori
          </Badge>
          {categories.map((cat) => (
            <Badge
              key={cat}
              variant={selectedCategory === cat ? "default" : "secondary"}
              onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
              className="cursor-pointer py-1 px-3"
            >
              {cat}
            </Badge>
          ))}
        </div>
      )}

      {/* Grid Template Cards / States */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-3 text-text-muted">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm">Memuat daftar template...</span>
        </div>
      ) : templates.length === 0 ? (
        <Card className="text-center p-8 border-dashed">
          <CardContent className="pt-6 flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-input-bg text-text-muted flex items-center justify-center">
              <FileQuestion className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-base font-semibold text-text-main">
                {search || selectedCategory || activeTab !== "all"
                  ? "Template tidak ditemukan"
                  : "Belum Ada Template"}
              </h2>
              <p className="text-xs text-text-muted max-w-sm mt-1">
                {search || selectedCategory || activeTab !== "all"
                  ? "Tidak ada template yang cocok dengan filter pencarian ini."
                  : "Mulai buat template pertama Anda atau gunakan contoh template siap pakai."}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              {search || selectedCategory || activeTab !== "all" ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setSelectedCategory(null);
                    setActiveTab("all");
                  }}
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" />
                  Hapus Filter
                </Button>
              ) : (
                <>
                  <Link href="/app/templates/new">
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-1.5" />
                      Buat Template Pertama
                    </Button>
                  </Link>

                  <Button variant="secondary" size="sm" onClick={handleLoadStarters}>
                    <Sparkles className="h-4 w-4 mr-1.5 text-primary" />
                    Gunakan 6 Template Contoh
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <Card key={tpl.id} className="hover:border-primary/40 transition-all flex flex-col justify-between">
              <CardContent className="pt-5 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <Badge variant="secondary" className="text-xs">
                    {tpl.category || "Umum"}
                  </Badge>

                  <button
                    type="button"
                    onClick={() => handleToggleFavorite(tpl)}
                    aria-label={tpl.is_favorite ? "Hapus dari favorit" : "Tandai favorit"}
                    className="text-text-muted hover:text-amber-500 transition-colors p-1"
                  >
                    <Star
                      className={`h-4 w-4 ${
                        tpl.is_favorite ? "fill-amber-400 text-amber-500" : ""
                      }`}
                    />
                  </button>
                </div>

                <div>
                  <h2 className="font-semibold text-base text-text-main line-clamp-1">
                    {tpl.title}
                  </h2>
                  <p className="text-xs text-text-muted mt-1 line-clamp-2 leading-relaxed min-h-[32px]">
                    {tpl.description || "Tidak ada deskripsi singkat."}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-border-subtle text-xs text-text-muted">
                  <span>{tpl.field_count} Variabel Input</span>
                  <span className="text-[11px] font-mono">v{tpl.version}</span>
                </div>
              </CardContent>

              {/* Action Toolbar */}
              <div className="px-5 pb-3.5 pt-1.5 flex items-center justify-between border-t border-border-subtle bg-input-bg/30 rounded-b-card">
                <Link href={`/app/templates/${tpl.id}/edit`}>
                  <Button variant="ghost" size="sm" className="h-8 px-3 text-xs">
                    <Edit3 className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </Link>

                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-text-main"
                    onClick={() => handleDuplicate(tpl)}
                    title="Duplikasi Template"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-text-main"
                    onClick={() => handleToggleArchive(tpl)}
                    title={tpl.is_archived ? "Pulihkan dari Arsip" : "Arsipkan Template"}
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-text-muted hover:text-danger"
                    onClick={() => setDeletingTemplate(tpl)}
                    title="Hapus Permanen"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Konfirmasi Hapus Permanen */}
      {deletingTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <Card className="max-w-md modal-shadow">
            <CardContent className="pt-6 flex flex-col gap-4">
              <div className="flex items-center gap-2 text-danger font-semibold">
                <Trash2 className="h-5 w-5" />
                <span>Hapus Template Permanen</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Tindakan ini tidak dapat dibatalkan. Template <strong>&quot;{deletingTemplate.title}&quot;</strong> akan dihapus permanen dari akun Anda.
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-text-main">
                  Ketik judul template untuk konfirmasi:
                </label>
                <Input
                  placeholder={deletingTemplate.title}
                  value={deleteConfirmTitle}
                  onChange={(e) => setDeleteConfirmTitle(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-border-subtle">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setDeletingTemplate(null);
                    setDeleteConfirmTitle("");
                  }}
                  disabled={isDeleting}
                >
                  Batal
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={deleteConfirmTitle !== deletingTemplate.title || isDeleting}
                  onClick={handleDelete}
                >
                  {isDeleting ? "Menghapus..." : "Hapus Permanen"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
