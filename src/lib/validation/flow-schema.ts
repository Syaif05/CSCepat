import { z } from "zod";
import {
  countUnicodeCodePoints,
  countUtf8Bytes,
  KEY_REGEX,
} from "./unicode";

export const FlowFieldOptionSchema = z
  .object({
    id: z.string().min(1, "ID opsi wajib diisi"),
    label: z
      .string()
      .min(1, "Label opsi wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 150,
        "Label opsi maksimal 150 karakter"
      ),
    value: z
      .string()
      .min(1, "Nilai opsi wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 150,
        "Nilai opsi maksimal 150 karakter"
      ),
  })
  .strict();

export const FlowFieldDefinitionSchema = z
  .object({
    id: z.string().min(1, "ID field wajib diisi"),
    key: z
      .string()
      .regex(
        KEY_REGEX,
        "Key field harus diawali huruf kecil dan hanya berisi huruf kecil, angka, atau garis bawah (maks. 64 karakter)"
      ),
    label: z
      .string()
      .trim()
      .min(1, "Label field wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 80,
        "Label field maksimal 80 karakter"
      ),
    type: z.enum(
      ["text", "textarea", "select", "combobox", "number", "boolean"],
      {
        message: "Jenis field tidak valid",
      }
    ),
    required: z.boolean(),
    data_class: z.enum(["transient", "configuration"], {
      message: "Klasifikasi data harus 'transient' atau 'configuration'",
    }),
    placeholder: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 120,
        "Placeholder maksimal 120 karakter"
      )
      .default(""),
    help_text: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 200,
        "Teks bantuan maksimal 200 karakter"
      )
      .default(""),
    max_length: z.number().int().positive().default(200),
    allow_custom: z.boolean().default(false),
    default_value: z.string().nullable().default(null),
    options: z.array(FlowFieldOptionSchema).default([]),
    min: z.number().optional(),
    max: z.number().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Data transient tidak boleh memiliki default_value
    if (data.data_class === "transient" && data.default_value !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["default_value"],
        message: "Field transient tidak boleh memiliki nilai default tersimpan",
      });
    }

    // 2. Validasi per jenis kontrol input
    if (data.type === "text") {
      if (data.max_length < 1 || data.max_length > 1000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["max_length"],
          message: "Panjang maksimal field text harus antara 1 sampai 1.000 karakter",
        });
      }
      if (data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Field text tidak boleh memiliki opsi",
        });
      }
    } else if (data.type === "textarea") {
      if (data.max_length < 1 || data.max_length > 3000) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["max_length"],
          message: "Panjang maksimal field textarea harus antara 1 sampai 3.000 karakter",
        });
      }
      if (data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Field textarea tidak boleh memiliki opsi",
        });
      }
    } else if (data.type === "select") {
      if (data.allow_custom !== false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allow_custom"],
          message: "Field select harus memiliki allow_custom = false",
        });
      }
      if (data.options.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Maksimal 100 opsi per field",
        });
      }
      if (
        data.default_value !== null &&
        !data.options.some((opt) => opt.value === data.default_value)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["default_value"],
          message: "Nilai default field select harus ada dalam daftar opsi yang terdaftar",
        });
      }
    } else if (data.type === "combobox") {
      if (data.allow_custom !== true) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allow_custom"],
          message: "Field combobox harus memiliki allow_custom = true",
        });
      }
      if (data.options.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Maksimal 100 opsi per field",
        });
      }
    } else if (data.type === "number") {
      if (data.options.length > 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Field number tidak boleh memiliki opsi",
        });
      }
      if (
        data.min !== undefined &&
        data.max !== undefined &&
        data.min > data.max
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["min"],
          message: "Nilai minimum tidak boleh lebih besar dari nilai maksimum",
        });
      }
    } else if (data.type === "boolean") {
      if (data.allow_custom !== false) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["allow_custom"],
          message: "Field boolean harus memiliki allow_custom = false",
        });
      }
      if (data.options.length > 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options"],
          message: "Field boolean maksimal memiliki 2 opsi (Ya / Tidak)",
        });
      }
    }

    // 3. Keunikan opsi jika ada
    if (data.options.length > 0) {
      const seenValues = new Set<string>();
      data.options.forEach((opt, index) => {
        const normalized = opt.value.trim().normalize("NFC");
        if (seenValues.has(normalized)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["options", index, "value"],
            message: `Nilai opsi ganda '${opt.value}' tidak diizinkan`,
          });
        }
        seenValues.add(normalized);
      });
    }
  });

export const FlowBranchConditionSchema = z
  .object({
    value: z
      .string()
      .min(1, "Nilai pemicu cabang wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 150,
        "Nilai pemicu cabang maksimal 150 karakter"
      ),
    targetNodeId: z.string().min(1, "Target node tujuan wajib diisi"),
    label: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 100,
        "Label cabang maksimal 100 karakter"
      )
      .optional(),
  })
  .strict();

export const FlowNodeSchema = z
  .object({
    id: z.string().min(1, "ID node wajib diisi"),
    title: z
      .string()
      .trim()
      .min(1, "Judul langkah node wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 100,
        "Judul node maksimal 100 karakter"
      ),
    body: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 5000,
        "Teks node maksimal 5.000 karakter"
      )
      .refine(
        (val) => countUtf8Bytes(val) <= 15000,
        "Teks node maksimal 15.000 byte UTF-8"
      )
      .default(""),
    fields: z
      .array(FlowFieldDefinitionSchema)
      .max(30, "Maksimal 30 variabel per node")
      .default([]),
    branchingFieldKey: z
      .string()
      .regex(KEY_REGEX, "Key percabangan tidak valid")
      .nullable()
      .optional(),
    branches: z
      .array(FlowBranchConditionSchema)
      .max(20, "Maksimal 20 cabang per node")
      .default([]),
    defaultNextNodeId: z.string().nullable().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Larang node menunjuk dirinya sendiri sebagai target cabang langsung
    if (data.defaultNextNodeId === data.id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["defaultNextNodeId"],
        message: "Node tidak boleh mengalir ke dirinya sendiri secara langsung",
      });
    }

    data.branches.forEach((b, idx) => {
      if (b.targetNodeId === data.id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["branches", idx, "targetNodeId"],
          message: "Cabang tidak boleh menunjuk ke node itu sendiri",
        });
      }
    });

    // 2. Keunikan field key di dalam node ini
    const seenKeys = new Set<string>();
    data.fields.forEach((field, index) => {
      if (seenKeys.has(field.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "key"],
          message: `Key field ganda '${field.key}' di dalam satu node`,
        });
      }
      seenKeys.add(field.key);
    });

    // 3. Keunikan pemicu value cabang
    const seenBranchValues = new Set<string>();
    data.branches.forEach((b, index) => {
      const normVal = b.value.trim().toLowerCase();
      if (seenBranchValues.has(normVal)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["branches", index, "value"],
          message: `Nilai cabang ganda '${b.value}' tidak diizinkan pada node yang sama`,
        });
      }
      seenBranchValues.add(normVal);
    });
  });

export const TemplateFlowDefinitionSchema = z
  .object({
    id: z.string().min(1).optional(),
    owner_id: z.string().uuid().optional(),
    title: z
      .string()
      .trim()
      .min(1, "Judul template flow wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 100,
        "Judul template flow maksimal 100 karakter"
      ),
    description: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 300,
        "Deskripsi template flow maksimal 300 karakter"
      )
      .default(""),
    category: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 50,
        "Kategori maksimal 50 karakter"
      )
      .default(""),
    is_favorite: z.boolean().default(false),
    is_archived: z.boolean().default(false),
    starter_key: z.string().nullable().optional(),
    schema_version: z.literal(2).default(2),
    version: z.number().int().default(1),
    rootNodeId: z.string().min(1, "Root Node ID wajib diisi"),
    nodes: z
      .array(FlowNodeSchema)
      .min(1, "Template minimal harus memiliki 1 node")
      .max(50, "Maksimal 50 node per template flow"),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Keunikan ID Node
    const nodeMap = new Map<string, (typeof data.nodes)[0]>();
    data.nodes.forEach((node, index) => {
      if (nodeMap.has(node.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nodes", index, "id"],
          message: `ID Node ganda: ${node.id}`,
        });
      }
      nodeMap.set(node.id, node);
    });

    // 2. rootNodeId harus ada di daftar nodes
    if (!nodeMap.has(data.rootNodeId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rootNodeId"],
        message: `Root Node ID '${data.rootNodeId}' tidak ditemukan dalam daftar nodes`,
      });
    }

    // 3. Validasi targetNodeId cabang dan defaultNextNodeId
    let totalFields = 0;
    data.nodes.forEach((node, nodeIdx) => {
      totalFields += node.fields.length;

      // Cek defaultNextNodeId
      if (node.defaultNextNodeId && !nodeMap.has(node.defaultNextNodeId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["nodes", nodeIdx, "defaultNextNodeId"],
          message: `Target defaultNextNodeId '${node.defaultNextNodeId}' tidak ditemukan`,
        });
      }

      // Cek targetNodeId pada branches
      node.branches.forEach((branch, branchIdx) => {
        if (!nodeMap.has(branch.targetNodeId)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["nodes", nodeIdx, "branches", branchIdx, "targetNodeId"],
            message: `Target branch '${branch.targetNodeId}' tidak ditemukan`,
          });
        }
      });
    });

    // 4. Batas total field kumulatif (maksimal 60 field di seluruh alur)
    if (totalFields > 60) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message: "Total seluruh field di semua node melebihi batas 60 field",
      });
    }

    // 5. Batas ukuran JSON nodes (maksimal 200.000 byte)
    const jsonBytes = countUtf8Bytes(JSON.stringify(data.nodes));
    if (jsonBytes > 200000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nodes"],
        message: "Ukuran total definisi node melebihi batas 200.000 byte UTF-8",
      });
    }
  });

export type ValidatedFlowFieldOption = z.infer<typeof FlowFieldOptionSchema>;
export type ValidatedFlowFieldDefinition = z.infer<typeof FlowFieldDefinitionSchema>;
export type ValidatedFlowBranchCondition = z.infer<typeof FlowBranchConditionSchema>;
export type ValidatedFlowNode = z.infer<typeof FlowNodeSchema>;
export type ValidatedTemplateFlowDefinition = z.infer<typeof TemplateFlowDefinitionSchema>;
