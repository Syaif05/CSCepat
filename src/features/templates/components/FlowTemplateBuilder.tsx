"use client";

import React, { useState, useRef, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Save,
  Bold,
  Plus,
  Trash2,
  Sparkles,
  GitFork,
  ArrowRight,
  Star,
  Eye,
  ShieldAlert,
  Loader2,
  Copy,
  RotateCcw,
  Check,
  Split,
  ChevronRight,
  FolderGit2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FlowFieldDialog } from "./FlowFieldDialog";
import {
  TemplateFlowDefinition,
  FlowNode,
  FlowFieldDefinition,
  FlowBranchCondition,
} from "@/lib/template-engine/flow-types";
import {
  evaluateActiveFlow,
  renderFlowTemplate,
  initializeFlowAnswers,
} from "@/lib/template-engine/flow-evaluator";
import { STARTER_FLOWS } from "@/lib/template-engine/starter-flows";
import { TemplateFlowDefinitionSchema } from "@/lib/validation/flow-schema";
import {
  createFlowTemplateAction,
  updateFlowTemplateAction,
} from "../actions/flow-template-actions";

interface FlowTemplateBuilderProps {
  initialData?: TemplateFlowDefinition;
  isEditing?: boolean;
}

const DEFAULT_INITIAL_FLOW: TemplateFlowDefinition = {
  id: crypto.randomUUID(),
  title: "Alur Kendala Pesanan",
  description: "Template alur dinamis yang otomatis bercabang sesuai masalah pelanggan.",
  category: "Kendala",
  is_favorite: false,
  is_archived: false,
  schema_version: 2,
  version: 1,
  rootNodeId: "node-pembuka",
  nodes: [
    {
      id: "node-pembuka",
      title: "Sapaan & Identifikasi Masalah",
      body: "**Halo Kak {{nama_pelanggan}},**\nTerima kasih telah berbelanja di {{nama_toko}}. Terkait pesanan dengan **ID Order: {{id_order}}**, kami siap membantu kendala Kakak.",
      fields: [
        {
          id: "f-1",
          key: "nama_pelanggan",
          label: "Nama Pelanggan",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "Contoh: Kak Rina",
          help_text: "Nama sapaan pembeli",
          max_length: 200,
          allow_custom: false,
          default_value: null,
          options: [],
        },
        {
          id: "f-2",
          key: "nama_toko",
          label: "Nama Toko",
          type: "combobox",
          required: true,
          data_class: "configuration",
          placeholder: "Toko Contoh",
          help_text: "Nama toko Anda",
          max_length: 150,
          allow_custom: true,
          default_value: "Toko Contoh",
          options: [{ id: "opt-1", label: "Toko Contoh", value: "Toko Contoh" }],
        },
        {
          id: "f-3",
          key: "id_order",
          label: "ID Order",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "ORD-00123",
          help_text: "Nomor order pesanan",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
        {
          id: "f-4",
          key: "jenis_masalah",
          label: "Pilih Kendala",
          type: "select",
          required: true,
          data_class: "transient",
          placeholder: "Pilih kendala pelanggan",
          help_text: "Pilihan ini menentukan alur solusi berikutnya",
          max_length: 150,
          allow_custom: false,
          default_value: null,
          options: [
            { id: "opt-k1", label: "Paket Hilang di Ekspedisi", value: "Paket Hilang di Ekspedisi" },
            { id: "opt-k2", label: "Produk Rusak / Cacat", value: "Produk Rusak / Cacat" },
          ],
        },
      ],
      branchingFieldKey: "jenis_masalah",
      branches: [
        {
          value: "Paket Hilang di Ekspedisi",
          targetNodeId: "node-paket-hilang",
          label: "Jalur Paket Hilang",
        },
        {
          value: "Produk Rusak / Cacat",
          targetNodeId: "node-produk-rusak",
          label: "Jalur Produk Rusak",
        },
      ],
      defaultNextNodeId: "node-penutup",
    },
    {
      id: "node-paket-hilang",
      title: "Investigasi Paket Hilang",
      body: "Pesanan dengan nomor resi **{{nomor_resi}}** saat ini sedang dalam proses investigasi pihak kurir dengan estimasi waktu **{{hari_investigasi}} hari kerja**.",
      fields: [
        {
          id: "f-ph-1",
          key: "nomor_resi",
          label: "Nomor Resi",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "Contoh: JP12345678",
          help_text: "Nomor resi pengiriman",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
        {
          id: "f-ph-2",
          key: "hari_investigasi",
          label: "Estimasi Hari Kerja",
          type: "number",
          required: true,
          data_class: "transient",
          placeholder: "3",
          help_text: "Jumlah hari estimasi",
          max_length: 10,
          allow_custom: false,
          default_value: null,
          options: [],
          min: 1,
          max: 14,
        },
      ],
      branches: [],
      defaultNextNodeId: "node-penutup",
    },
    {
      id: "node-produk-rusak",
      title: "Solusi Produk Rusak",
      body: "Kami mohon maaf atas kerusakan produk berupa **{{detail_kerusakan}}**. Kami menawarkan solusi **{{opsi_ganti}}** untuk Kakak.",
      fields: [
        {
          id: "f-pr-1",
          key: "detail_kerusakan",
          label: "Detail Kerusakan",
          type: "textarea",
          required: true,
          data_class: "transient",
          placeholder: "Contoh: Layar retak",
          help_text: "Kondisi barang saat diterima",
          max_length: 1000,
          allow_custom: false,
          default_value: null,
          options: [],
        },
        {
          id: "f-pr-2",
          key: "opsi_ganti",
          label: "Opsi Penggantian",
          type: "select",
          required: true,
          data_class: "transient",
          placeholder: "Pilih opsi ganti",
          help_text: "Solusi yang disepakati",
          max_length: 150,
          allow_custom: false,
          default_value: null,
          options: [
            { id: "opt-g1", label: "Kirim Unit Baru", value: "Kirim Unit Baru" },
            { id: "opt-g2", label: "Pengembalian Dana Penuh", value: "Pengembalian Dana Penuh" },
          ],
        },
      ],
      branches: [],
      defaultNextNodeId: "node-penutup",
    },
    {
      id: "node-penutup",
      title: "Penutup & Konfirmasi",
      body: "Sekali lagi kami mohon maaf atas kendala yang dialami ya Kak {{nama_pelanggan}}. Tim CS kami akan terus mendampingi hingga tuntas. Terima kasih atas kesabaran Kakak. 🙏",
      fields: [],
      branches: [],
      defaultNextNodeId: null,
    },
  ],
};

export function FlowTemplateBuilder({
  initialData,
  isEditing = false,
}: FlowTemplateBuilderProps) {
  const router = useRouter();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State Template Flow Utama
  const [template, setTemplate] = useState<TemplateFlowDefinition>(
    initialData || DEFAULT_INITIAL_FLOW
  );

  // Node yang sedang aktif dipilih di panel editor
  const [selectedNodeId, setSelectedNodeId] = useState<string>(
    initialData?.rootNodeId || DEFAULT_INITIAL_FLOW.rootNodeId
  );

  // State Modal Variabel
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editingField, setEditingField] = useState<FlowFieldDefinition | null>(null);

  // State Simulator Interaktif
  const [simulationAnswers, setSimulationAnswers] = useState<Record<string, string>>(() => {
    const flow = initialData || DEFAULT_INITIAL_FLOW;
    const active = evaluateActiveFlow(flow, {});
    return initializeFlowAnswers(active.activeFields);
  });
  const [previewTab, setPreviewTab] = useState<"whatsapp" | "plain">("whatsapp");
  const [copied, setCopied] = useState(false);

  // State Penyimpanan
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [viewMode, setViewMode] = useState<"builder" | "simulator">("builder");

  const currentNode = useMemo(() => {
    return template.nodes.find((n) => n.id === selectedNodeId) || template.nodes[0];
  }, [template.nodes, selectedNodeId]);

  // Evaluasi alur aktif pada simulator
  const activeFlow = useMemo(() => {
    return evaluateActiveFlow(template, simulationAnswers);
  }, [template, simulationAnswers]);

  // Render teks pesan simulator
  const renderedMessage = useMemo(() => {
    return renderFlowTemplate(template, simulationAnswers, previewTab, {
      previewMode: true,
    });
  }, [template, simulationAnswers, previewTab]);

  // Inisialisasi dari preset starter
  const handleLoadStarter = (starter: TemplateFlowDefinition) => {
    if (confirm("Ganti alur saat ini dengan template contoh siap pakai?")) {
      setTemplate({
        ...starter,
        id: crypto.randomUUID(),
        version: 1,
      });
      setSelectedNodeId(starter.rootNodeId);
      setSimulationAnswers({});
    }
  };

  // Handler Update Node Aktif
  const updateCurrentNode = (updates: Partial<FlowNode>) => {
    setTemplate((prev) => ({
      ...prev,
      nodes: prev.nodes.map((node) =>
        node.id === selectedNodeId ? { ...node, ...updates } : node
      ),
    }));
  };

  // Tambah Node Baru
  const handleAddNode = () => {
    const newId = `node-${Date.now().toString(36)}`;
    const newNodeNumber = template.nodes.length + 1;
    const newNode: FlowNode = {
      id: newId,
      title: `Langkah ${newNodeNumber}`,
      body: "",
      fields: [],
      branches: [],
      defaultNextNodeId: null,
    };

    setTemplate((prev) => ({
      ...prev,
      nodes: [...prev.nodes, newNode],
    }));
    setSelectedNodeId(newId);
  };

  // Hapus Node
  const handleDeleteNode = (nodeIdToDelete: string) => {
    if (template.nodes.length <= 1) {
      alert("Template harus memiliki minimal 1 langkah / node.");
      return;
    }

    if (
      !confirm(
        "Hapus langkah ini? Seluruh variabel dan teks di langkah ini akan terhapus."
      )
    ) {
      return;
    }

    const remainingNodes = template.nodes.filter((n) => n.id !== nodeIdToDelete);
    const newRootId =
      template.rootNodeId === nodeIdToDelete
        ? remainingNodes[0].id
        : template.rootNodeId;

    // Bersihkan referensi ke node yang dihapus
    const cleanedNodes = remainingNodes.map((n) => ({
      ...n,
      defaultNextNodeId:
        n.defaultNextNodeId === nodeIdToDelete ? null : n.defaultNextNodeId,
      branches: n.branches.filter((b) => b.targetNodeId !== nodeIdToDelete),
    }));

    setTemplate((prev) => ({
      ...prev,
      rootNodeId: newRootId,
      nodes: cleanedNodes,
    }));

    if (selectedNodeId === nodeIdToDelete) {
      setSelectedNodeId(newRootId);
    }
  };

  // Jadikan Root Node
  const handleSetAsRoot = (nodeId: string) => {
    setTemplate((prev) => ({
      ...prev,
      rootNodeId: nodeId,
    }));
  };

  // Sisipkan Format Tebal **
  const handleInsertBold = () => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = currentNode.body;
    const selectedText = currentBody.substring(start, end);

    let newBody = "";
    let newCursorPos = start + 2;

    if (selectedText.length > 0) {
      newBody =
        currentBody.substring(0, start) +
        `**${selectedText}**` +
        currentBody.substring(end);
      newCursorPos = end + 4;
    } else {
      newBody =
        currentBody.substring(0, start) +
        `**teks**` +
        currentBody.substring(end);
      newCursorPos = start + 6;
    }

    updateCurrentNode({ body: newBody });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 50);
  };

  // Sisipkan Variabel {{key}}
  const handleInsertVariableToken = (key: string) => {
    const textarea = textareaRef.current;
    const token = `{{${key}}}`;

    if (!textarea) {
      updateCurrentNode({ body: currentNode.body + " " + token });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentBody = currentNode.body;

    const newBody =
      currentBody.substring(0, start) + token + currentBody.substring(end);
    const newPos = start + token.length;

    updateCurrentNode({ body: newBody });
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(newPos, newPos);
    }, 50);
  };

  // Simpan / Edit Variabel Field
  const handleSaveField = (savedField: FlowFieldDefinition) => {
    if (editingField) {
      updateCurrentNode({
        fields: currentNode.fields.map((f) =>
          f.id === savedField.id ? savedField : f
        ),
      });
    } else {
      updateCurrentNode({
        fields: [...currentNode.fields, savedField],
      });
    }
    setEditingField(null);
  };

  // Hapus Variabel Field
  const handleDeleteField = (fieldId: string) => {
    const field = currentNode.fields.find((f) => f.id === fieldId);
    if (!field) return;

    if (currentNode.body.includes(`{{${field.key}}}`)) {
      if (
        !confirm(
          `Token {{${field.key}}} sedang digunakan di dalam teks pesan. Hapus variabel ini?`
        )
      ) {
        return;
      }
    }

    updateCurrentNode({
      fields: currentNode.fields.filter((f) => f.id !== fieldId),
      // Jika field ini adalah penentu cabang, reset cabangnya
      ...(currentNode.branchingFieldKey === field.key
        ? { branchingFieldKey: null, branches: [] }
        : {}),
    });
  };

  // Otomatis sinkronkan opsi cabang dari pilihan field
  const handleSyncBranchesFromField = (field: FlowFieldDefinition) => {
    if (field.type === "boolean") {
      const newBranches: FlowBranchCondition[] = [
        {
          value: "true",
          targetNodeId: template.nodes.find((n) => n.id !== currentNode.id)?.id || "",
          label: "Ya / Benar",
        },
        {
          value: "false",
          targetNodeId: template.nodes.find((n) => n.id !== currentNode.id)?.id || "",
          label: "Tidak / Salah",
        },
      ];
      updateCurrentNode({
        branchingFieldKey: field.key,
        branches: newBranches,
      });
    } else if (field.options.length > 0) {
      const newBranches: FlowBranchCondition[] = field.options.map((opt) => ({
        value: opt.value,
        targetNodeId: template.nodes.find((n) => n.id !== currentNode.id)?.id || "",
        label: opt.label,
      }));
      updateCurrentNode({
        branchingFieldKey: field.key,
        branches: newBranches,
      });
    }
  };

  // Handler Simpan Template
  const handleSaveTemplate = async () => {
    setSaveError(null);
    setSaveSuccess(false);

    // 1. Validasi Zod
    const valResult = TemplateFlowDefinitionSchema.safeParse(template);
    if (!valResult.success) {
      setSaveError(
        valResult.error.issues[0]?.message || "Definisi template belum valid."
      );
      return;
    }

    setIsSaving(true);
    try {
      if (isEditing) {
        const res = await updateFlowTemplateAction({
          id: template.id,
          expected_version: template.version,
          template,
        });
        if (res.success) {
          setSaveSuccess(true);
          setTemplate(res.data);
          setTimeout(() => setSaveSuccess(false), 3000);
        } else {
          setSaveError(res.error || "Gagal memperbarui template.");
        }
      } else {
        const res = await createFlowTemplateAction(template);
        if (res.success) {
          router.push(`/app/templates`);
        } else {
          setSaveError(res.error || "Gagal membuat template baru.");
        }
      }
    } catch {
      setSaveError("Terjadi kesalahan jaringan saat menyimpan.");
    } finally {
      setIsSaving(false);
    }
  };

  // Salin Pesan Simulasi
  const handleCopySimulation = () => {
    navigator.clipboard.writeText(renderedMessage.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] max-w-7xl mx-auto px-4 py-6 gap-6">
      {/* 1. Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-border">
        <div className="flex items-center gap-3">
          <Link href="/app/templates">
            <Button variant="ghost" size="sm" className="h-9 w-9 p-0 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={template.title}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, title: e.target.value }))
                }
                placeholder="Ketik Judul Alur Template..."
                className="text-lg font-bold text-text-main bg-transparent border-b border-transparent hover:border-border focus:border-primary focus:outline-hidden transition-colors px-1 py-0.5 rounded-sm"
              />
              <button
                type="button"
                onClick={() =>
                  setTemplate((prev) => ({
                    ...prev,
                    is_favorite: !prev.is_favorite,
                  }))
                }
                className={`p-1.5 rounded-lg transition-colors ${
                  template.is_favorite
                    ? "text-amber-500 bg-amber-500/10"
                    : "text-text-muted hover:text-text-main hover:bg-surface-elevated"
                }`}
                title={template.is_favorite ? "Favorit" : "Jadikan Favorit"}
              >
                <Star className="h-4 w-4 fill-current" />
              </button>
              <Badge variant="default" className="text-[10px] py-0.5">
                <GitFork className="h-3 w-3 mr-1" />
                Flow v2 Dinamis
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-text-muted mt-1 px-1">
              <span>Kategori:</span>
              <input
                type="text"
                value={template.category}
                onChange={(e) =>
                  setTemplate((prev) => ({ ...prev, category: e.target.value }))
                }
                placeholder="Umum, Kendala, Retur..."
                className="bg-transparent border-b border-border/50 hover:border-border focus:border-primary focus:outline-hidden text-text-main px-1 text-xs w-32"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Switcher Tampilan Desktop / Mobile */}
          <div className="flex rounded-xl border border-border p-1 bg-surface-elevated">
            <button
              type="button"
              onClick={() => setViewMode("builder")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                viewMode === "builder"
                  ? "bg-card text-text-main shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              Visual Builder
            </button>
            <button
              type="button"
              onClick={() => setViewMode("simulator")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all flex items-center gap-1.5 ${
                viewMode === "simulator"
                  ? "bg-card text-text-main shadow-xs"
                  : "text-text-muted hover:text-text-main"
              }`}
            >
              <Eye className="h-3.5 w-3.5 text-primary" />
              Simulator CS
            </button>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSaveTemplate}
            disabled={isSaving}
            className="rounded-xl shadow-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-1.5" />
                Menyimpan...
              </>
            ) : saveSuccess ? (
              <>
                <Check className="h-4 w-4 mr-1.5 text-emerald-400" />
                Tersimpan!
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

      {/* Error & Warning Alert */}
      {saveError && (
        <div className="p-3 bg-danger/10 border border-danger/30 text-danger rounded-xl flex items-center gap-2 text-xs animate-in fade-in">
          <ShieldAlert className="h-4 w-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Preset Starter Loader Helper */}
      {!isEditing && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-primary/5 border border-primary/20 rounded-2xl text-xs">
          <div className="flex items-center gap-2 text-primary font-medium">
            <Sparkles className="h-4 w-4" />
            <span>Butuh inspirasi alur percabangan?</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleLoadStarter(STARTER_FLOWS[0])}
            >
              Gunakan Contoh: Kendala Pesanan (Decision Tree)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={() => handleLoadStarter(STARTER_FLOWS[1])}
            >
              Gunakan Contoh: Kualifikasi Pelanggan
            </Button>
          </div>
        </div>
      )}

      {/* 2. Grid Utama 3 Kolom */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Kolom 1 (lg:col-span-3): Daftar Langkah & Visualisasi Alur */}
        <div
          className={`lg:col-span-3 flex flex-col gap-3 ${
            viewMode === "simulator" ? "hidden lg:flex" : "flex"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FolderGit2 className="h-4 w-4 text-text-muted" />
              <h2 className="text-xs font-semibold text-text-main uppercase tracking-wider">
                Langkah Alur ({template.nodes.length})
              </h2>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={handleAddNode}
              className="h-7 text-xs rounded-lg px-2"
            >
              <Plus className="h-3 w-3 mr-1" />
              Langkah
            </Button>
          </div>

          <div className="flex flex-col gap-2">
            {template.nodes.map((node, index) => {
              const isSelected = node.id === selectedNodeId;
              const isRoot = node.id === template.rootNodeId;
              const hasBranch =
                node.branchingFieldKey && node.branches.length > 0;
              const isEnd = !hasBranch && !node.defaultNextNodeId;

              return (
                <div
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`p-3 rounded-2xl border transition-all cursor-pointer text-left relative ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30 shadow-xs"
                      : "border-border hover:border-text-muted/40 hover:bg-surface-elevated bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="flex items-center justify-center h-5 w-5 rounded-full text-[10px] font-bold bg-surface-elevated text-text-muted border border-border">
                        {index + 1}
                      </span>
                      <span className="text-xs font-bold text-text-main line-clamp-1">
                        {node.title || `Langkah ${index + 1}`}
                      </span>
                    </div>

                    {isRoot ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                        Awal
                      </span>
                    ) : hasBranch ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-indigo-500/10 text-indigo-500 border border-indigo-500/20">
                        <Split className="h-2.5 w-2.5 mr-0.5" />
                        {node.branches.length} Cabang
                      </span>
                    ) : isEnd ? (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-500">
                        Penutup
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium text-text-muted">
                        Lurus
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-text-muted line-clamp-1 mb-2 font-mono">
                    {node.body ? node.body : "(Belum ada teks pesan)"}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-text-muted pt-2 border-t border-border/60">
                    <span>{node.fields.length} Variabel</span>
                    {hasBranch ? (
                      <span className="text-primary truncate max-w-[120px]">
                        Bercabang: {node.branchingFieldKey}
                      </span>
                    ) : node.defaultNextNodeId ? (
                      <span className="truncate max-w-[120px] flex items-center gap-1">
                        Lanjut <ArrowRight className="h-2.5 w-2.5" />
                      </span>
                    ) : (
                      <span className="text-slate-400">Selesai</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Kolom 2 (lg:col-span-5): Editor Langkah Aktif */}
        <div
          className={`lg:col-span-5 flex flex-col gap-4 ${
            viewMode === "simulator" ? "hidden lg:flex" : "flex"
          }`}
        >
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                  Editor Langkah
                </span>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Input
                    value={currentNode.title}
                    onChange={(e) => updateCurrentNode({ title: e.target.value })}
                    placeholder="Judul Langkah..."
                    className="h-8 font-bold text-sm bg-transparent border-transparent hover:border-border focus:border-primary px-1.5"
                  />
                </CardTitle>
              </div>

              <div className="flex items-center gap-1.5">
                {currentNode.id !== template.rootNodeId && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleSetAsRoot(currentNode.id)}
                  >
                    Jadikan Titik Awal
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-text-muted hover:text-danger"
                  onClick={() => handleDeleteNode(currentNode.id)}
                  title="Hapus Langkah Ini"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardHeader>

            <CardContent className="space-y-5 pt-4">
              {/* Bagian A: Isi Pesan Langkah Ini */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-text-main">
                    Teks Pesan Langkah Ini
                  </label>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleInsertBold}
                      className="h-6 px-2 text-xs font-bold"
                      title="Format Tebal (**teks**)"
                    >
                      <Bold className="h-3 w-3 mr-1" />
                      Tebal
                    </Button>
                  </div>
                </div>

                <div className="relative">
                  <textarea
                    ref={textareaRef}
                    rows={6}
                    value={currentNode.body}
                    onChange={(e) => updateCurrentNode({ body: e.target.value })}
                    placeholder="Ketik kalimat pesan untuk langkah ini. Gunakan {{nama_variabel}} untuk data dinamis atau klik Sisipkan Variabel di bawah."
                    className="w-full p-3 text-xs font-mono rounded-xl border border-border bg-surface text-text-main focus:border-primary focus:outline-hidden leading-relaxed resize-y"
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>
                    Dukungan: **teks tebal** dan {`{{token_variabel}}`}
                  </span>
                  <span>{currentNode.body.length} karakter</span>
                </div>
              </div>

              {/* Bagian B: Variabel Input Khusus Langkah Ini */}
              <div className="space-y-2 pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-semibold text-text-main">
                      Variabel Input Langkah Ini ({currentNode.fields.length})
                    </h3>
                    <p className="text-[10px] text-text-muted">
                      Variabel yang akan diminta kepada CS saat mencapai langkah ini.
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      setEditingField(null);
                      setIsFieldDialogOpen(true);
                    }}
                    className="h-7 text-xs"
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Tambah Variabel
                  </Button>
                </div>

                {currentNode.fields.length > 0 ? (
                  <div className="space-y-1.5">
                    {currentNode.fields.map((field) => (
                      <div
                        key={field.id}
                        className="flex items-center justify-between p-2 rounded-xl border border-border bg-surface hover:bg-surface-elevated transition-colors text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleInsertVariableToken(field.key)}
                            className="font-mono text-[11px] font-semibold text-primary hover:underline bg-primary/10 px-2 py-0.5 rounded-md"
                            title="Klik untuk menyisipkan ke pesan"
                          >
                            {`{{${field.key}}}`}
                          </button>
                          <span className="text-text-main font-medium">
                            {field.label}
                          </span>
                          <Badge variant="outline" className="text-[10px] py-0 px-1.5">
                            {field.type}
                          </Badge>
                          {field.required && (
                            <span className="text-danger text-[10px] font-bold">
                              *Wajib
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-text-muted hover:text-text-main"
                            onClick={() => {
                              setEditingField(field);
                              setIsFieldDialogOpen(true);
                            }}
                          >
                            ✎
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-text-muted hover:text-danger"
                            onClick={() => handleDeleteField(field.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-3 text-center rounded-xl border border-dashed border-border text-[11px] text-text-muted">
                    Belum ada variabel di langkah ini. Klik &quot;+ Tambah Variabel&quot; untuk menambahkan.
                  </div>
                )}
              </div>

              {/* Bagian C: Aturan Percabangan / Alur Langkah Berikutnya */}
              <div className="space-y-3 pt-3 border-t border-border">
                <div>
                  <h3 className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                    <GitFork className="h-3.5 w-3.5 text-primary" />
                    Alur Langkah Berikutnya
                  </h3>
                  <p className="text-[10px] text-text-muted">
                    Tentukan apakah langkah ini lanjut lurus, bercabang sesuai pilihan, atau selesai.
                  </p>
                </div>

                {/* Switcher Tipe Alur */}
                <div className="grid grid-cols-3 gap-1.5 p-1 bg-surface-elevated rounded-xl border border-border">
                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentNode({
                        branchingFieldKey: null,
                        branches: [],
                        defaultNextNodeId:
                          template.nodes.find((n) => n.id !== currentNode.id)?.id || null,
                      })
                    }
                    className={`p-2 text-xs font-medium rounded-lg transition-all text-center ${
                      !currentNode.branchingFieldKey && currentNode.defaultNextNodeId
                        ? "bg-card text-text-main font-semibold shadow-xs"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    Alur Lurus
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const branchableField = currentNode.fields.find(
                        (f) => f.type === "select" || f.type === "boolean" || f.type === "combobox"
                      );
                      updateCurrentNode({
                        branchingFieldKey: branchableField ? branchableField.key : null,
                        branches: [],
                      });
                    }}
                    className={`p-2 text-xs font-medium rounded-lg transition-all text-center ${
                      currentNode.branchingFieldKey
                        ? "bg-card text-primary font-semibold shadow-xs"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    Bercabang
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      updateCurrentNode({
                        branchingFieldKey: null,
                        branches: [],
                        defaultNextNodeId: null,
                      })
                    }
                    className={`p-2 text-xs font-medium rounded-lg transition-all text-center ${
                      !currentNode.branchingFieldKey && !currentNode.defaultNextNodeId
                        ? "bg-card text-text-main font-semibold shadow-xs"
                        : "text-text-muted hover:text-text-main"
                    }`}
                  >
                    Penutup (Selesai)
                  </button>
                </div>

                {/* Konfigurasi Alur Lurus */}
                {!currentNode.branchingFieldKey && currentNode.defaultNextNodeId !== null && (
                  <div className="p-3 bg-surface-elevated rounded-xl border border-border space-y-1.5 animate-in fade-in">
                    <label className="text-xs font-medium text-text-main">
                      Lanjut ke Langkah:
                    </label>
                    <select
                      value={currentNode.defaultNextNodeId || ""}
                      onChange={(e) =>
                        updateCurrentNode({ defaultNextNodeId: e.target.value || null })
                      }
                      className="w-full text-xs p-2 rounded-lg border border-border bg-card text-text-main"
                    >
                      <option value="">-- Pilih Langkah Tujuan --</option>
                      {template.nodes
                        .filter((n) => n.id !== currentNode.id)
                        .map((n) => (
                          <option key={n.id} value={n.id}>
                            {n.title}
                          </option>
                        ))}
                    </select>
                  </div>
                )}

                {/* Konfigurasi Percabangan */}
                {currentNode.branchingFieldKey !== null &&
                  currentNode.branchingFieldKey !== undefined && (
                    <div className="p-3 bg-surface-elevated rounded-xl border border-border space-y-3 animate-in fade-in">
                      <div>
                        <label className="block text-xs font-medium text-text-main mb-1">
                          Variabel Penentu Cabang
                        </label>
                        <select
                          value={currentNode.branchingFieldKey || ""}
                          onChange={(e) => {
                            const selectedKey = e.target.value;
                            const matchedField = currentNode.fields.find(
                              (f) => f.key === selectedKey
                            );
                            updateCurrentNode({
                              branchingFieldKey: selectedKey,
                              branches: [],
                            });
                            if (matchedField) {
                              handleSyncBranchesFromField(matchedField);
                            }
                          }}
                          className="w-full text-xs p-2 rounded-lg border border-border bg-card text-text-main"
                        >
                          <option value="">-- Pilih Variabel --</option>
                          {currentNode.fields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label} ({f.type})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Daftar Cabang */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-medium text-text-main">
                            Pemetaan Cabang ({currentNode.branches.length})
                          </label>
                          {currentNode.fields.find(
                            (f) => f.key === currentNode.branchingFieldKey
                          ) && (
                            <button
                              type="button"
                              onClick={() => {
                                const f = currentNode.fields.find(
                                  (f) => f.key === currentNode.branchingFieldKey
                                );
                                if (f) handleSyncBranchesFromField(f);
                              }}
                              className="text-[11px] text-primary hover:underline"
                            >
                              Sinkronkan Ulang Opsi
                            </button>
                          )}
                        </div>

                        {currentNode.branches.map((branch, bIdx) => (
                          <div
                            key={bIdx}
                            className="p-2.5 rounded-xl border border-border bg-card space-y-2 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-text-main text-[11px]">
                                Jika jawaban: &quot;{branch.value}&quot;
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  updateCurrentNode({
                                    branches: currentNode.branches.filter(
                                      (_, idx) => idx !== bIdx
                                    ),
                                  })
                                }
                                className="text-text-muted hover:text-danger"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="text-[10px] text-text-muted shrink-0">
                                Lanjut ke:
                              </span>
                              <select
                                value={branch.targetNodeId}
                                onChange={(e) => {
                                  const targetId = e.target.value;
                                  updateCurrentNode({
                                    branches: currentNode.branches.map((b, idx) =>
                                      idx === bIdx ? { ...b, targetNodeId: targetId } : b
                                    ),
                                  });
                                }}
                                className="w-full text-xs p-1.5 rounded-lg border border-border bg-surface text-text-main"
                              >
                                <option value="">-- Pilih Langkah Tujuan --</option>
                                {template.nodes
                                  .filter((n) => n.id !== currentNode.id)
                                  .map((n) => (
                                    <option key={n.id} value={n.id}>
                                      {n.title}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Fallback Jika Tidak Cocok */}
                      <div>
                        <label className="block text-[11px] text-text-muted mb-1">
                          Langkah Lanjutan Cadangan (Fallback):
                        </label>
                        <select
                          value={currentNode.defaultNextNodeId || ""}
                          onChange={(e) =>
                            updateCurrentNode({ defaultNextNodeId: e.target.value || null })
                          }
                          className="w-full text-xs p-2 rounded-lg border border-border bg-card text-text-main"
                        >
                          <option value="">-- Tidak ada (Berhenti) --</option>
                          {template.nodes
                            .filter((n) => n.id !== currentNode.id)
                            .map((n) => (
                              <option key={n.id} value={n.id}>
                                {n.title}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>
                  )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kolom 3 (lg:col-span-4): Simulator Interaktif CS & Pratinjau Real-Time */}
        <div
          className={`lg:col-span-4 flex flex-col gap-4 ${
            viewMode === "builder" ? "hidden lg:flex" : "flex"
          }`}
        >
          <Card className="border-border bg-card shadow-xs">
            <CardHeader className="pb-3 border-b border-border flex flex-row items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Eye className="h-4 w-4 text-primary" />
                <CardTitle className="text-sm font-bold">Simulator Interaktif CS</CardTitle>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSimulationAnswers(initializeFlowAnswers(activeFlow.activeFields));
                }}
                className="h-7 text-xs text-text-muted hover:text-text-main"
                title="Reset formulir simulasi"
              >
                <RotateCcw className="h-3 w-3 mr-1" />
                Reset
              </Button>
            </CardHeader>

            <CardContent className="space-y-4 pt-4">
              {/* Form Input Simulasi Berdasarkan Node Aktif */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-text-muted">
                  <span>Jalur Langkah Aktif:</span>
                  <span className="font-semibold text-text-main">
                    {activeFlow.activeNodes.length} Langkah
                  </span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {activeFlow.activeNodes.map((node, idx) => (
                    <span
                      key={node.id}
                      className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium"
                    >
                      <span>{idx + 1}. {node.title}</span>
                      {idx < activeFlow.activeNodes.length - 1 && (
                        <ChevronRight className="h-2.5 w-2.5 opacity-60" />
                      )}
                    </span>
                  ))}
                </div>

                {/* Render Input Dinamis Pada Jalur Aktif */}
                <div className="space-y-2.5 pt-2 border-t border-border">
                  {activeFlow.activeFields.map((field) => (
                    <div key={field.key} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-text-main">
                          {field.label}
                          {field.required && (
                            <span className="text-danger ml-0.5">*</span>
                          )}
                        </label>
                        {field.data_class === "configuration" && (
                          <span className="text-[10px] text-text-muted">
                            Konfigurasi
                          </span>
                        )}
                      </div>

                      {field.type === "select" ? (
                        <select
                          value={simulationAnswers[field.key] || ""}
                          onChange={(e) =>
                            setSimulationAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          className="w-full text-xs p-2 rounded-xl border border-border bg-surface text-text-main"
                        >
                          <option value="">-- Pilih {field.label} --</option>
                          {field.options.map((opt) => (
                            <option key={opt.id} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                      ) : field.type === "boolean" ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setSimulationAnswers((prev) => ({
                                ...prev,
                                [field.key]: "true",
                              }))
                            }
                            className={`flex-1 py-1.5 px-3 text-xs rounded-xl border font-medium transition-all ${
                              simulationAnswers[field.key] === "true"
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                : "border-border text-text-muted hover:text-text-main"
                            }`}
                          >
                            Ya
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setSimulationAnswers((prev) => ({
                                ...prev,
                                [field.key]: "false",
                              }))
                            }
                            className={`flex-1 py-1.5 px-3 text-xs rounded-xl border font-medium transition-all ${
                              simulationAnswers[field.key] === "false"
                                ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                                : "border-border text-text-muted hover:text-text-main"
                            }`}
                          >
                            Tidak
                          </button>
                        </div>
                      ) : field.type === "textarea" ? (
                        <textarea
                          rows={2}
                          value={simulationAnswers[field.key] || ""}
                          onChange={(e) =>
                            setSimulationAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder || `Ketik ${field.label}...`}
                          className="w-full text-xs p-2 rounded-xl border border-border bg-surface text-text-main resize-none"
                        />
                      ) : (
                        <Input
                          type={field.type === "number" ? "number" : "text"}
                          value={simulationAnswers[field.key] || ""}
                          onChange={(e) =>
                            setSimulationAnswers((prev) => ({
                              ...prev,
                              [field.key]: e.target.value,
                            }))
                          }
                          placeholder={field.placeholder || `Ketik ${field.label}...`}
                          className="h-8 text-xs"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Pratinjau Pesan yang Tersambung */}
              <div className="space-y-2 pt-3 border-t border-border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 bg-surface-elevated p-0.5 rounded-lg border border-border">
                    <button
                      type="button"
                      onClick={() => setPreviewTab("whatsapp")}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                        previewTab === "whatsapp"
                          ? "bg-card text-text-main shadow-xs"
                          : "text-text-muted"
                      }`}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      onClick={() => setPreviewTab("plain")}
                      className={`px-2 py-0.5 text-[11px] font-medium rounded-md transition-all ${
                        previewTab === "plain"
                          ? "bg-card text-text-main shadow-xs"
                          : "text-text-muted"
                      }`}
                    >
                      Teks Biasa
                    </button>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-6 text-[11px] px-2"
                    onClick={handleCopySimulation}
                  >
                    {copied ? (
                      <>
                        <Check className="h-3 w-3 mr-1 text-emerald-500" />
                        Disalin!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 mr-1" />
                        Salin
                      </>
                    )}
                  </Button>
                </div>

                <div className="p-3 bg-surface rounded-2xl border border-border text-xs font-sans whitespace-pre-wrap leading-relaxed min-h-[160px] max-h-[300px] overflow-y-auto">
                  {renderedMessage.text || (
                    <span className="text-text-muted italic">
                      Lengkapi isian simulasi untuk melihat pesan tersusun.
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] text-text-muted">
                  <span>
                    Status:{" "}
                    {renderedMessage.isComplete ? (
                      <span className="text-emerald-500 font-semibold">
                        Lengkap Siap Salin
                      </span>
                    ) : (
                      <span className="text-amber-500 font-medium">
                        {renderedMessage.missingRequiredFields.length} field wajib kosong
                      </span>
                    )}
                  </span>
                  <span>{renderedMessage.text.length} karakter</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal Dialog Variabel */}
      <FlowFieldDialog
        isOpen={isFieldDialogOpen}
        onClose={() => {
          setIsFieldDialogOpen(false);
          setEditingField(null);
        }}
        onSave={handleSaveField}
        initialField={editingField}
        existingKeys={currentNode.fields.map((f) => f.key)}
      />
    </div>
  );
}

function X(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
