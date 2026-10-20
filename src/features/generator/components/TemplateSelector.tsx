"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Search,
  Star,
  ChevronDown,
  Plus,
  Loader2,
  FileText,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { TemplateDefinition, TemplateListItem } from "@/lib/template-engine/types";
import { getTemplateAction } from "@/features/templates/actions/template-actions";

interface TemplateSelectorProps {
  templates: TemplateListItem[];
  selectedTemplate: TemplateDefinition | null;
  onSelectTemplate: (template: TemplateDefinition) => void;
  loading?: boolean;
}

export function TemplateSelector({
  templates,
  selectedTemplate,
  onSelectTemplate,
  loading = false,
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tutup dropdown jika klik di luar
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Urutkan: Favorit dahulu, lalu judul alfabetis (PRD 7.1)
  const sortedAndFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = templates.filter((t) => {
      if (t.is_archived) return false; // Hanya template aktif
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        (t.category && t.category.toLowerCase().includes(q))
      );
    });

    return filtered.sort((a, b) => {
      // 1. Favorit di atas
      if (a.is_favorite && !b.is_favorite) return -1;
      if (!a.is_favorite && b.is_favorite) return 1;
      // 2. Alfabetis berdasarkan judul
      return a.title.localeCompare(b.title, "id");
    });
  }, [templates, search]);

  const handlePick = async (item: TemplateListItem) => {
    if (selectedTemplate?.id === item.id) {
      setIsOpen(false);
      return;
    }

    setFetchingId(item.id);
    try {
      const res = await getTemplateAction(item.id);
      if (res.success) {
        onSelectTemplate(res.data);
        setIsOpen(false);
      }
    } finally {
      setFetchingId(null);
    }
  };

  return (
    <div className="relative w-full sm:w-auto" ref={dropdownRef}>
      {/* Trigger Button */}
      <Button
        type="button"
        variant="secondary"
        onClick={() => setIsOpen(!isOpen)}
        disabled={loading}
        className="w-full sm:w-[360px] justify-between text-left h-12 px-4 rounded-input border-border-input hover:border-primary/50 shadow-xs"
      >
        <div className="flex items-center gap-2.5 truncate">
          <FileText className="h-4 w-4 shrink-0 text-primary" />
          {loading ? (
            <span className="text-xs text-text-muted">Memuat daftar template...</span>
          ) : selectedTemplate ? (
            <div className="flex items-center gap-1.5 truncate">
              <span className="font-semibold text-xs text-text-main truncate">
                {selectedTemplate.title}
              </span>
              {selectedTemplate.is_favorite && (
                <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
              )}
            </div>
          ) : (
            <span className="text-xs text-text-muted">
              Pilih Template Pesan...
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {selectedTemplate && (
            <Badge variant="secondary" className="text-[10px] font-mono py-0 px-1.5">
              {selectedTemplate.fields.length} Field
            </Badge>
          )}
          <ChevronDown
            className={`h-4 w-4 text-text-muted transition-transform duration-150 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </Button>

      {/* Dropdown Popover */}
      {isOpen && (
        <Card className="absolute left-0 top-full mt-2 w-full sm:w-[420px] max-h-[460px] flex flex-col z-50 modal-shadow border border-border-subtle overflow-hidden">
          {/* Header Search */}
          <div className="p-3 border-b border-border-subtle bg-surface sticky top-0 z-10 flex flex-col gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
              <Input
                placeholder="Cari judul atau kategori..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-8 h-9 text-xs"
                autoFocus
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-main"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center justify-between text-[11px] text-text-muted px-1">
              <span>{sortedAndFiltered.length} template aktif ditemukan</span>
              <Link
                href="/app/templates/new"
                className="text-primary hover:underline font-medium flex items-center gap-1"
                onClick={() => setIsOpen(false)}
              >
                <Plus className="h-3 w-3" />
                Buat baru
              </Link>
            </div>
          </div>

          {/* List Item */}
          <CardContent className="p-2 overflow-y-auto divide-y divide-border-subtle/50">
            {sortedAndFiltered.length === 0 ? (
              <div className="py-8 px-4 text-center text-xs text-text-muted flex flex-col items-center gap-2">
                <span>Tidak ada template yang cocok.</span>
                {search && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setSearch("")}
                    className="text-xs h-7"
                  >
                    Hapus pencarian
                  </Button>
                )}
              </div>
            ) : (
              sortedAndFiltered.map((tpl) => {
                const isSelected = selectedTemplate?.id === tpl.id;
                const isFetching = fetchingId === tpl.id;

                return (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => handlePick(tpl)}
                    disabled={isFetching}
                    className={`w-full text-left p-2.5 rounded-input transition-colors flex items-start justify-between gap-3 ${
                      isSelected
                        ? "bg-primary/10 border border-primary/30"
                        : "hover:bg-input-bg"
                    }`}
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-text-main truncate">
                          {tpl.title}
                        </span>
                        {tpl.is_favorite && (
                          <Star className="h-3 w-3 fill-amber-400 text-amber-500 shrink-0" />
                        )}
                      </div>

                      {tpl.description && (
                        <p className="text-[11px] text-text-muted line-clamp-1 mt-0.5">
                          {tpl.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-[9px] py-0 px-1.5">
                          {tpl.category || "Umum"}
                        </Badge>
                        <span className="text-[10px] text-text-muted">
                          {tpl.field_count} variabel
                        </span>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center pt-1">
                      {isFetching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                      ) : isSelected ? (
                        <Badge variant="default" className="text-[9px] py-0 px-1.5">
                          Aktif
                        </Badge>
                      ) : null}
                    </div>
                  </button>
                );
              })
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
