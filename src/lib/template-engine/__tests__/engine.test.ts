import { describe, it, expect } from "vitest";
import { parseTemplate, extractVariableKeys, validateTemplateVariables, TemplateParseError } from "../parser";
import { renderTemplate } from "../renderer";
import { STARTER_TEMPLATES } from "../starters";
import { TemplateDefinitionSchema, FieldDefinitionSchema } from "../../validation/template-schema";
import { FieldDefinition } from "../types";

describe("Template Engine & Validation Suite (PRD Matriks Bagian 21)", () => {
  // -------------------------------------------------------------
  // DEF-01: Token tidak dikenal, key ganda, bold rusak / unclosed
  // -------------------------------------------------------------
  describe("DEF-01: Parser Syntax & Grammar Validation", () => {
    it("harus menolak penanda format tebal yang tidak ditutup", () => {
      expect(() => parseTemplate("**Halo Kak Rina")).toThrowError(TemplateParseError);
      expect(() => parseTemplate("**Halo Kak Rina")).toThrowError(/tidak ditutup/);
    });

    it("harus menolak penanda format tebal yang melintasi baris baru (newline)", () => {
      expect(() => parseTemplate("**Halo Kak Rina\nterima kasih**")).toThrowError(TemplateParseError);
      expect(() => parseTemplate("**Halo Kak Rina\nterima kasih**")).toThrowError(/baris baru/);
    });

    it("harus menolak token variabel yang tidak ditutup", () => {
      expect(() => parseTemplate("Halo Kak {{nama_pelanggan")).toThrowError(TemplateParseError);
      expect(() => parseTemplate("Halo Kak {{nama_pelanggan")).toThrowError(/belum ditutup/);
    });

    it("harus menolak token variabel yang mengandung spasi", () => {
      expect(() => parseTemplate("Halo Kak {{ nama_pelanggan }}")).toThrowError(TemplateParseError);
      expect(() => parseTemplate("Halo Kak {{ nama_pelanggan }}")).toThrowError(/tidak valid/);
    });

    it("harus mendeteksi ketidaksesuaian antara token di body dan field yang didefinisikan", () => {
      const ast = parseTemplate("Halo {{nama_pelanggan}} di {{nama_toko}}");
      const validation = validateTemplateVariables(ast, ["nama_pelanggan"]);

      expect(validation.isValid).toBe(false);
      expect(validation.missingFields).toContain("nama_toko");
    });

    it("harus mendeteksi jika ada field yang didefinisikan namun tidak dipakai di body", () => {
      const ast = parseTemplate("Halo {{nama_pelanggan}}");
      const validation = validateTemplateVariables(ast, ["nama_pelanggan", "id_order"]);

      expect(validation.isValid).toBe(false);
      expect(validation.unusedFields).toContain("id_order");
    });
  });

  // -------------------------------------------------------------
  // DEF-02: Default pada transient dan properti asing
  // -------------------------------------------------------------
  describe("DEF-02: Schema Integrity & Transient Protection", () => {
    it("harus menolak field transient yang memiliki default_value", () => {
      const invalidTransientField = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        key: "nama_pelanggan",
        label: "Nama Pelanggan",
        type: "text",
        required: true,
        data_class: "transient",
        placeholder: "Nama",
        help_text: "",
        max_length: 200,
        allow_custom: false,
        default_value: "Budi", // ILEGAL untuk transient!
        options: [],
      };

      const result = FieldDefinitionSchema.safeParse(invalidTransientField);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toMatch(/tidak boleh memiliki nilai default/);
      }
    });

    it("harus menolak properti asing (properti pelanggan tersimpan)", () => {
      const foreignPropertyField = {
        id: "123e4567-e89b-12d3-a456-426614174000",
        key: "nama_pelanggan",
        label: "Nama Pelanggan",
        type: "text",
        required: true,
        data_class: "transient",
        placeholder: "Nama",
        help_text: "",
        max_length: 200,
        allow_custom: false,
        default_value: null,
        options: [],
        customer_input: "Nilai Bocor", // ILEGAL!
      };

      const result = FieldDefinitionSchema.safeParse(foreignPropertyField);
      expect(result.success).toBe(false);
    });
  });

  // -------------------------------------------------------------
  // GEN-01: Enam field contoh dan variabel berulang
  // -------------------------------------------------------------
  describe("GEN-01: Starter Template & Repeated Variables", () => {
    const mainStarter = STARTER_TEMPLATES[0]; // Template kendala pesanan 6 input

    it("harus memiliki 6 field yang cocok 100% dengan token di body", () => {
      const ast = parseTemplate(mainStarter.body);
      const keysInBody = extractVariableKeys(ast);
      const definedKeys = mainStarter.fields.map((f) => f.key);

      expect(keysInBody.sort()).toEqual(definedKeys.sort());

      const validation = validateTemplateVariables(ast, definedKeys);
      expect(validation.isValid).toBe(true);
    });

    it("harus mensubstitusi seluruh 6 field dengan tepat pada mode WhatsApp", () => {
      const ast = parseTemplate(mainStarter.body);
      const values = {
        nama_pelanggan: "Rina",
        nama_toko: "Toko Contoh",
        id_order: "ORD-00123",
        nama_produk: "Paket A",
        detail_masalah: "transaksi belum terkonfirmasi",
        estimasi_waktu: "30 menit",
      };

      const result = renderTemplate(ast, mainStarter.fields, values, "whatsapp");

      expect(result.isComplete).toBe(true);
      expect(result.missingRequiredFields).toHaveLength(0);
      expect(result.text).toContain("*Halo Kak Rina,*");
      expect(result.text).toContain("Terima kasih telah berbelanja di Toko Contoh.");
      expect(result.text).toContain("*ID Order: ORD-00123*");
      expect(result.text).toContain("produk *Paket A*");
      expect(result.text).toContain("berupa *transaksi belum terkonfirmasi*.");
      expect(result.text).toContain("kurang lebih *30 menit*.");
      expect(result.text).toContain("Terima kasih atas pengertiannya. 🙏");
    });

    it("harus memvalidasi ke-6 starter template sesuai skema Zod tanpa error", () => {
      STARTER_TEMPLATES.forEach((starter) => {
        const result = TemplateDefinitionSchema.safeParse(starter);
        expect(result.success).toBe(true);

        const ast = parseTemplate(starter.body);
        const definedKeys = starter.fields.map((f) => f.key);
        const validation = validateTemplateVariables(ast, definedKeys);
        expect(validation.isValid).toBe(true);
      });
    });

    it("harus mensubstitusi variabel yang muncul berulang kali secara seragam", () => {
      const repeatedBody = "Halo Kak {{nama_pelanggan}}, pesanan Kak {{nama_pelanggan}} telah siap.";
      const ast = parseTemplate(repeatedBody);
      const fields: FieldDefinition[] = [
        {
          id: "f-1",
          key: "nama_pelanggan",
          label: "Nama Pelanggan",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 200,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      const result = renderTemplate(ast, fields, { nama_pelanggan: "Dewi" }, "plain");
      expect(result.text).toBe("Halo Kak Dewi, pesanan Kak Dewi telah siap.");
    });
  });

  // -------------------------------------------------------------
  // GEN-02: Required kosong/spasi dan opsional kosong
  // -------------------------------------------------------------
  describe("GEN-02: Required Whitespace & Optional Fields", () => {
    const fields: FieldDefinition[] = [
      {
        id: "f-req",
        key: "nama_pelanggan",
        label: "Nama Pelanggan",
        type: "text",
        required: true,
        data_class: "transient",
        placeholder: "",
        help_text: "",
        max_length: 200,
        allow_custom: false,
        default_value: null,
        options: [],
      },
      {
        id: "f-opt",
        key: "catatan_tambahan",
        label: "Catatan Tambahan",
        type: "text",
        required: false,
        data_class: "transient",
        placeholder: "",
        help_text: "",
        max_length: 200,
        allow_custom: false,
        default_value: null,
        options: [],
      },
    ];

    it("harus menandai tidak lengkap jika field required hanya berisi whitespace", () => {
      const ast = parseTemplate("Halo {{nama_pelanggan}} {{catatan_tambahan}}");
      const result = renderTemplate(ast, fields, {
        nama_pelanggan: "   ",
        catatan_tambahan: "",
      });

      expect(result.isComplete).toBe(false);
      expect(result.missingRequiredFields).toContain("nama_pelanggan");
    });

    it("harus mengubah field opsional yang kosong menjadi string kosong", () => {
      const ast = parseTemplate("Halo {{nama_pelanggan}}, catatan:{{catatan_tambahan}}");
      const result = renderTemplate(ast, fields, {
        nama_pelanggan: "Budi",
        catatan_tambahan: "",
      });

      expect(result.isComplete).toBe(true);
      expect(result.text).toBe("Halo Budi, catatan:");
    });
  });

  // -------------------------------------------------------------
  // GEN-03: ID 000123, Unicode, emoji, dan newline
  // -------------------------------------------------------------
  describe("GEN-03: Formatting Preservation (Leading Zeros, Emoji, Newline)", () => {
    it("harus mempertahankan angka nol di depan pada ID Order", () => {
      const ast = parseTemplate("Order: {{id_order}}");
      const fields: FieldDefinition[] = [
        {
          id: "f-id",
          key: "id_order",
          label: "ID Order",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      const result = renderTemplate(ast, fields, { id_order: "000123" });
      expect(result.text).toBe("Order: 000123");
    });

    it("harus mempertahankan emoji majemuk dan karakter Unicode", () => {
      const ast = parseTemplate("Pesan: {{salam}} 🙏✨");
      const fields: FieldDefinition[] = [
        {
          id: "f-salam",
          key: "salam",
          label: "Salam",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      const result = renderTemplate(ast, fields, { salam: "Selamat Siang 🌟" });
      expect(result.text).toBe("Pesan: Selamat Siang 🌟 🙏✨");
    });

    it("harus menormalisasi CRLF menjadi LF", () => {
      const crlfBody = "Baris 1\r\nBaris 2\r\nBaris 3";
      const ast = parseTemplate(crlfBody);
      const result = renderTemplate(ast, [], {});
      expect(result.text).toBe("Baris 1\nBaris 2\nBaris 3");
    });
  });

  // -------------------------------------------------------------
  // GEN-04: Zero Injection ({{token}}, $&, script, HTML)
  // -------------------------------------------------------------
  describe("GEN-04: Zero Injection & Single Substitution", () => {
    it("tidak boleh mengevaluasi ulang nilai pelanggan yang mengandung token template lain", () => {
      const ast = parseTemplate("Toko: {{nama_toko}}, Pelanggan: {{nama_pelanggan}}");
      const fields: FieldDefinition[] = [
        {
          id: "f-toko",
          key: "nama_toko",
          label: "Toko",
          type: "text",
          required: true,
          data_class: "configuration",
          placeholder: "",
          help_text: "",
          max_length: 100,
          allow_custom: false,
          default_value: "Toko Asli",
          options: [],
        },
        {
          id: "f-pelanggan",
          key: "nama_pelanggan",
          label: "Pelanggan",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      // Input jahat/tidak sengaja: pelanggan memasukkan {{nama_toko}}
      const maliciousInput = {
        nama_toko: "Toko Asli",
        nama_pelanggan: "{{nama_toko}} dan $& dan $1",
      };

      const result = renderTemplate(ast, fields, maliciousInput);

      // Harus tetap mengandung string mentah "{{nama_toko}}" tanpa tersubstitusi jadi "Toko Asli"
      expect(result.text).toBe("Toko: Toko Asli, Pelanggan: {{nama_toko}} dan $& dan $1");
    });

    it("tidak boleh mengeksekusi tag script atau HTML", () => {
      const ast = parseTemplate("Catatan: {{detail}}");
      const fields: FieldDefinition[] = [
        {
          id: "f-det",
          key: "detail",
          label: "Detail",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 200,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      const htmlInput = "<script>alert('xss')</script><b>tebal</b>";
      const result = renderTemplate(ast, fields, { detail: htmlInput });
      expect(result.text).toBe(`Catatan: ${htmlInput}`);
    });
  });

  // -------------------------------------------------------------
  // FMT-01 & FMT-02: Bold Plain vs WhatsApp & WhatsApp Markers
  // -------------------------------------------------------------
  describe("FMT-01 & FMT-02: Formatting & WhatsApp Markers", () => {
    it("FMT-01: Plain menghapus penanda bold, WhatsApp membungkus dengan asteris tunggal", () => {
      const ast = parseTemplate("**Halo Kak {{nama}},** selamat datang!");
      const fields: FieldDefinition[] = [
        {
          id: "f-nama",
          key: "nama",
          label: "Nama",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 100,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      const plain = renderTemplate(ast, fields, { nama: "Rina" }, "plain");
      expect(plain.text).toBe("Halo Kak Rina, selamat datang!");

      const wa = renderTemplate(ast, fields, { nama: "Rina" }, "whatsapp");
      expect(wa.text).toBe("*Halo Kak Rina,* selamat datang!");
    });

    it("FMT-02: Mendeteksi karakter format WhatsApp dalam isian pengguna", () => {
      const ast = parseTemplate("Pesan: {{pesan}}");
      const fields: FieldDefinition[] = [
        {
          id: "f-msg",
          key: "pesan",
          label: "Pesan",
          type: "text",
          required: true,
          data_class: "transient",
          placeholder: "",
          help_text: "",
          max_length: 200,
          allow_custom: false,
          default_value: null,
          options: [],
        },
      ];

      // Isian tanpa marker WA
      const normal = renderTemplate(ast, fields, { pesan: "Pesanan siap dikirim" });
      expect(normal.hasWhatsAppFormatChars).toBe(false);

      // Isian mengandung marker WA (*, _, ~, `)
      const withAsterisk = renderTemplate(ast, fields, { pesan: "Kondisi *prioritas*" });
      expect(withAsterisk.hasWhatsAppFormatChars).toBe(true);
      expect(withAsterisk.text).toBe("Pesan: Kondisi *prioritas*");

      const withTilde = renderTemplate(ast, fields, { pesan: "~diskon 50%~" });
      expect(withTilde.hasWhatsAppFormatChars).toBe(true);
    });
  });

  // -------------------------------------------------------------
  // Escape Sequences: \*, \{, \\
  // -------------------------------------------------------------
  describe("Escape Sequences in Template Body", () => {
    it("harus memproses escape \\*, \\{, dan \\\\ sebagai karakter literal", () => {
      const body = "Bintang literal: \\*, Kurung literal: \\{, Backslash literal: \\\\";
      const ast = parseTemplate(body);
      const result = renderTemplate(ast, [], {});
      expect(result.text).toBe("Bintang literal: *, Kurung literal: {, Backslash literal: \\");
    });
  });
});
