"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TemplateBuilder } from "@/features/templates/components/TemplateBuilder";
import { getTemplateAction } from "@/features/templates/actions/template-actions";
import { TemplateDefinition } from "@/lib/template-engine/types";

function EditTemplateContent() {
  const params = useParams();
  const id = params?.id as string;

  const [template, setTemplate] = useState<TemplateDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadTemplate() {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const res = await getTemplateAction(id);
        if (res.success) {
          setTemplate(res.data);
        } else {
          setError(res.error || "Template tidak tersedia.");
        }
      } catch {
        setError("Gagal memuat template.");
      } finally {
        setLoading(false);
      }
    }
    loadTemplate();
  }, [id]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-3 text-text-muted">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="text-sm">Memuat template...</span>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="max-w-md mx-auto py-16">
        <Card className="text-center p-6">
          <CardContent className="pt-4 flex flex-col items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-danger/10 text-danger flex items-center justify-center">
              <AlertCircle className="h-6 w-6" />
            </div>
            <div className="text-base font-semibold text-text-main">
              {error || "Template tidak tersedia"}
            </div>
            <p className="text-xs text-text-muted">
              Template ini mungkin telah dihapus, diarsipkan, atau Anda tidak memiliki akses ke template ini.
            </p>
            <Link href="/app/templates">
              <Button variant="secondary" size="sm">
                <ArrowLeft className="h-4 w-4 mr-1.5" />
                Kembali ke Daftar Template
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <TemplateBuilder initialData={template} isEditing={true} />;
}

export default function EditTemplatePage() {
  return (
    <Suspense fallback={<div className="p-8 text-sm text-text-muted">Memuat editor template...</div>}>
      <EditTemplateContent />
    </Suspense>
  );
}
