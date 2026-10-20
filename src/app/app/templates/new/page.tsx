"use client";

import React, { useState } from "react";
import { GitFork, AlignLeft } from "lucide-react";
import { TemplateBuilder } from "@/features/templates/components/TemplateBuilder";
import { FlowTemplateBuilder } from "@/features/templates/components/FlowTemplateBuilder";

export default function NewTemplatePage() {
  const [templateFormat, setTemplateFormat] = useState<"flow" | "linear">("flow");

  return (
    <div className="flex flex-col">
      {/* Mode Selector Banner */}
      <div className="bg-surface-elevated/50 border-b border-border py-2 px-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-muted font-medium hidden sm:inline">
              Format Pembuatan:
            </span>
            <div className="flex rounded-xl border border-border p-0.5 bg-surface">
              <button
                type="button"
                onClick={() => setTemplateFormat("flow")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
                  templateFormat === "flow"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <GitFork className="h-3.5 w-3.5" />
                Alur Percabangan Node (v2)
              </button>
              <button
                type="button"
                onClick={() => setTemplateFormat("linear")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                  templateFormat === "linear"
                    ? "bg-primary text-primary-foreground shadow-xs"
                    : "text-text-muted hover:text-text-main"
                }`}
              >
                <AlignLeft className="h-3.5 w-3.5" />
                Template Linear Statis (v1)
              </button>
            </div>
          </div>
          <span className="text-[11px] text-text-muted hidden md:inline">
            {templateFormat === "flow"
              ? "Pesan otomatis bercabang & form menyesuaikan pilihan masalah"
              : "Satu pesan statis tanpa percabangan cabang"}
          </span>
        </div>
      </div>

      {templateFormat === "flow" ? (
        <FlowTemplateBuilder isEditing={false} />
      ) : (
        <TemplateBuilder isEditing={false} />
      )}
    </div>
  );
}
