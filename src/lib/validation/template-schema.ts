import { z } from "zod";
import {
  countUnicodeCodePoints,
  countUtf8Bytes,
  KEY_REGEX,
} from "./unicode";

export const FieldOptionSchema = z
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

export const FieldDefinitionSchema = z
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
    type: z.enum(["text", "textarea", "select", "combobox"], {
      message: "Jenis field tidak valid",
    }),
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
    max_length: z.number().int().positive(),
    allow_custom: z.boolean(),
    default_value: z.string().nullable(),
    options: z.array(FieldOptionSchema).default([]),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Field transient TIDAK BOLEH memiliki default_value (PRD 7.2 & DEF-02)
    if (data.data_class === "transient" && data.default_value !== null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["default_value"],
        message: "Field transient tidak boleh memiliki nilai default tersimpan",
      });
    }

    // 2. Validasi batas panjang berdasarkan jenis field
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
      // Jika ada default_value, harus cocok dengan value opsi yang tersedia
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
    }

    // 3. Keunikan value opsi
    const seenValues = new Set<string>();
    data.options.forEach((opt, index) => {
      const normalizedValue = opt.value.trim().normalize("NFC");
      if (seenValues.has(normalizedValue)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["options", index, "value"],
          message: `Nilai opsi ganda '${opt.value}' tidak diizinkan`,
        });
      }
      seenValues.add(normalizedValue);
    });
  });

export const TemplateDefinitionSchema = z
  .object({
    id: z.string().uuid().optional(),
    owner_id: z.string().uuid().optional(),
    title: z
      .string()
      .trim()
      .min(1, "Judul template wajib diisi")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 100,
        "Judul template maksimal 100 karakter"
      ),
    description: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 300,
        "Deskripsi template maksimal 300 karakter"
      )
      .default(""),
    category: z
      .string()
      .refine(
        (val) => countUnicodeCodePoints(val) <= 50,
        "Kategori maksimal 50 karakter"
      )
      .default(""),
    body: z
      .string()
      .min(1, "Isi template tidak boleh kosong")
      .refine(
        (val) => countUnicodeCodePoints(val) <= 10000,
        "Isi template maksimal 10.000 karakter"
      )
      .refine(
        (val) => countUtf8Bytes(val) <= 30000,
        "Isi template maksimal 30.000 byte UTF-8"
      ),
    fields: z
      .array(FieldDefinitionSchema)
      .min(0)
      .max(30, "Maksimal 30 variabel input per template"),
    is_favorite: z.boolean().default(false),
    is_archived: z.boolean().default(false),
    starter_key: z.string().nullable().optional(),
    schema_version: z.number().int().default(1),
    version: z.number().int().default(1),
    created_at: z.string().optional(),
    updated_at: z.string().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    // 1. Keunikan ID dan Key field
    const seenIds = new Set<string>();
    const seenKeys = new Set<string>();

    data.fields.forEach((field, index) => {
      if (seenIds.has(field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "id"],
          message: `ID field ganda: ${field.id}`,
        });
      }
      seenIds.add(field.id);

      if (seenKeys.has(field.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["fields", index, "key"],
          message: `Key field ganda: '${field.key}'. Setiap variabel harus memiliki key yang unik.`,
        });
      }
      seenKeys.add(field.key);
    });

    // 2. Validasi batas ukuran total JSON fields (maks 100.000 byte UTF-8)
    const fieldsByteSize = countUtf8Bytes(JSON.stringify(data.fields));
    if (fieldsByteSize > 100000) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["fields"],
        message: "Ukuran definisi fields melebihi batas 100.000 byte UTF-8",
      });
    }
  });

export type ValidatedFieldOption = z.infer<typeof FieldOptionSchema>;
export type ValidatedFieldDefinition = z.infer<typeof FieldDefinitionSchema>;
export type ValidatedTemplateDefinition = z.infer<typeof TemplateDefinitionSchema>;
