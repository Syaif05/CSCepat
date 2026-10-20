import { parseTemplate } from "./parser";
import { renderTemplate, WA_FORMAT_CHARS_REGEX } from "./renderer";
import {
  ActiveFlowResult,
  FlowBranchCondition,
  FlowFieldDefinition,
  FlowNode,
  FlowRenderResult,
  TemplateFlowDefinition,
} from "./flow-types";
import { OutputMode } from "./types";

/**
 * Memeriksa apakah nilai jawaban pengguna cocok dengan kondisi cabang.
 * Mendukung pencocokan teks persis (case-insensitive), alias boolean (Ya/Tidak/true/false),
 * serta perbandingan numerik.
 */
export function isBranchConditionMatched(
  conditionValue: string,
  userValue: string | undefined | null
): boolean {
  if (userValue === undefined || userValue === null) {
    return false;
  }

  const cVal = conditionValue.trim().toLowerCase();
  const uVal = String(userValue).trim().toLowerCase();

  // 1. Pencocokan langsung (case-insensitive)
  if (cVal === uVal) {
    return true;
  }

  // 2. Pencocokan alias boolean (Ya / Tidak vs true / false)
  const isConditionTrue = cVal === "true" || cVal === "ya" || cVal === "1";
  const isConditionFalse = cVal === "false" || cVal === "tidak" || cVal === "0";

  const isUserTrue = uVal === "true" || uVal === "ya" || uVal === "1";
  const isUserFalse = uVal === "false" || uVal === "tidak" || uVal === "0";

  if (isConditionTrue && isUserTrue) return true;
  if (isConditionFalse && isUserFalse) return true;

  // 3. Pencocokan numerik (misal: "100" vs "100.0")
  const numC = Number(cVal);
  const numU = Number(uVal);
  if (!isNaN(numC) && !isNaN(numU) && numC === numU) {
    return true;
  }

  return false;
}

/**
 * Mengevaluasi jalur node yang aktif (Path Traversal) dari sebuah template flow.
 * - Mulai dari `template.rootNodeId`.
 * - Melangkah ke node berikutnya berdasarkan nilai `userAnswers[node.branchingFieldKey]`.
 * - Memiliki proteksi siklus (Cycle Detection) menggunakan Set ID yang sudah dikunjungi.
 * - Mengembalikan daftar node aktif, field formulir aktif, dan ID node yang dikunjungi.
 */
export function evaluateActiveFlow(
  template: TemplateFlowDefinition,
  userAnswers: Record<string, string> = {}
): ActiveFlowResult {
  const nodeMap = new Map<string, FlowNode>();
  template.nodes.forEach((node) => nodeMap.set(node.id, node));

  const visitedSet = new Set<string>();
  const activeNodes: FlowNode[] = [];
  let currentNodeId: string | null = template.rootNodeId;

  while (currentNodeId) {
    // Proteksi siklik: Jika node sudah dikunjungi, hentikan alur untuk mencegah infinite loop
    if (visitedSet.has(currentNodeId)) {
      break;
    }

    const node = nodeMap.get(currentNodeId);
    if (!node) {
      break;
    }

    visitedSet.add(currentNodeId);
    activeNodes.push(node);

    // Tentukan langkah ke node berikutnya
    if (node.branchingFieldKey) {
      const branchAnswer = userAnswers[node.branchingFieldKey];
      const isAnswerProvided =
        branchAnswer !== undefined &&
        branchAnswer !== null &&
        branchAnswer.trim().length > 0;

      if (isAnswerProvided) {
        // Cari cabang yang cocok dengan jawaban pengguna
        const matchedBranch = node.branches.find((b: FlowBranchCondition) =>
          isBranchConditionMatched(b.value, branchAnswer)
        );

        if (matchedBranch) {
          currentNodeId = matchedBranch.targetNodeId;
        } else if (node.defaultNextNodeId) {
          currentNodeId = node.defaultNextNodeId;
        } else {
          // Tidak ada cabang yang cocok dan tidak ada defaultNextNodeId
          currentNodeId = null;
        }
      } else {
        // Pertanyaan percabangan belum dijawab: jeda penelusuran sampai CS memilih opsi
        currentNodeId = null;
      }
    } else if (node.defaultNextNodeId) {
      // Alur lurus tanpa percabangan
      currentNodeId = node.defaultNextNodeId;
    } else {
      // Node ujung (Leaf node / Penutup)
      currentNodeId = null;
    }
  }

  // Kumpulkan seluruh field input dari node-node yang aktif secara berurutan
  const activeFields: FlowFieldDefinition[] = [];
  const seenFieldKeys = new Set<string>();

  for (const node of activeNodes) {
    for (const field of node.fields) {
      if (!seenFieldKeys.has(field.key)) {
        activeFields.push(field);
        seenFieldKeys.add(field.key);
      }
    }
  }

  return {
    activeNodes,
    activeFields,
    visitedNodeIds: Array.from(visitedSet),
  };
}

/**
 * Merender pesan dari seluruh node aktif secara deterministik.
 * - Mengevaluasi alur node aktif.
 * - Merender body setiap node aktif menggunakan parser & renderer AST.
 * - Menggabungkan paragraf node aktif dengan pemisah baris baru ganda (\n\n).
 * - Menghitung field wajib yang belum diisi pada JALUR AKTIF SAJA.
 * - Mendeteksi karakter format khusus WhatsApp (*, _, ~, `).
 */
export function renderFlowTemplate(
  template: TemplateFlowDefinition,
  userAnswers: Record<string, string> = {},
  mode: OutputMode = "plain",
  options: { previewMode?: boolean } = {}
): FlowRenderResult {
  const { activeNodes, activeFields } = evaluateActiveFlow(template, userAnswers);

  // Periksa field wajib yang belum terisi pada jalur aktif
  const missingRequiredFields: FlowFieldDefinition[] = [];
  let hasWhatsAppFormatChars = false;

  activeFields.forEach((field) => {
    const rawVal = userAnswers[field.key];
    const isBlank =
      rawVal === undefined || rawVal === null || rawVal.trim().length === 0;

    if (field.required && isBlank) {
      missingRequiredFields.push(field);
    }

    if (rawVal && WA_FORMAT_CHARS_REGEX.test(rawVal)) {
      hasWhatsAppFormatChars = true;
    }
  });

  // Render teks per node aktif
  const renderedParagraphs: string[] = [];

  for (const node of activeNodes) {
    const rawBody = node.body ? node.body.trim() : "";
    if (rawBody.length === 0) {
      continue;
    }

    try {
      const ast = parseTemplate(rawBody);
      const renderRes = renderTemplate(
        ast,
        activeFields,
        userAnswers,
        mode,
        options
      );

      if (renderRes.text.trim().length > 0) {
        renderedParagraphs.push(renderRes.text);
      }
    } catch (err) {
      if (options.previewMode) {
        renderedParagraphs.push(`[Node "${node.title}": Sintaks tidak valid]`);
      } else {
        throw err;
      }
    }
  }

  const text = renderedParagraphs.join("\n\n");
  const isComplete = missingRequiredFields.length === 0;

  return {
    text,
    isComplete,
    missingRequiredFields,
    hasWhatsAppFormatChars,
    activeNodes,
    activeFields,
    outputMode: mode,
  };
}

/**
 * Membersihkan jawaban yang tidak lagi berada pada jalur aktif ketika CS berganti pilihan cabang.
 * Memastikan tidak ada data usang atau data hantu yang terbawa ke pesan akhir.
 */
export function cleanInactiveAnswers(
  activeFields: FlowFieldDefinition[],
  currentAnswers: Record<string, string>
): Record<string, string> {
  const activeKeys = new Set(activeFields.map((f) => f.key));
  const cleaned: Record<string, string> = {};

  for (const [key, value] of Object.entries(currentAnswers)) {
    if (activeKeys.has(key)) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

/**
 * Inisialisasi nilai awal formulir dari konfigurasi umum template.
 * Nilai "transient" (data pelanggan) SELALU kosong demi privasi nol penyimpanan.
 */
export function initializeFlowAnswers(
  activeFields: FlowFieldDefinition[]
): Record<string, string> {
  const initial: Record<string, string> = {};

  for (const field of activeFields) {
    if (field.data_class === "configuration" && field.default_value !== null) {
      initial[field.key] = field.default_value;
    } else {
      initial[field.key] = "";
    }
  }

  return initial;
}

/**
 * Validasi isian individual per tipe kontrol baru (number, boolean, dll.)
 */
export function validateFlowFieldAnswer(
  field: FlowFieldDefinition,
  value: string
): { isValid: boolean; error?: string } {
  const trimmed = value.trim();

  if (field.required && trimmed.length === 0) {
    return { isValid: false, error: `${field.label} wajib diisi` };
  }

  if (trimmed.length === 0) {
    return { isValid: true };
  }

  // Validasi tipe number
  if (field.type === "number") {
    const num = Number(trimmed);
    if (isNaN(num)) {
      return { isValid: false, error: `${field.label} harus berupa angka` };
    }
    if (field.min !== undefined && num < field.min) {
      return {
        isValid: false,
        error: `${field.label} minimal ${field.min}`,
      };
    }
    if (field.max !== undefined && num > field.max) {
      return {
        isValid: false,
        error: `${field.label} maksimal ${field.max}`,
      };
    }
  }

  // Validasi batas panjang teks
  if (field.max_length && trimmed.length > field.max_length) {
    return {
      isValid: false,
      error: `${field.label} maksimal ${field.max_length} karakter`,
    };
  }

  return { isValid: true };
}
