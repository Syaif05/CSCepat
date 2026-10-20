import { ASTNode, TextNode, VariableNode } from "./types";
import { isValidKey } from "../validation/unicode";

export class TemplateParseError extends Error {
  position: number;
  line: number;
  column: number;

  constructor(message: string, position: number, line: number, column: number) {
    super(`Baris ${line}, Kolom ${column}: ${message}`);
    this.name = "TemplateParseError";
    this.position = position;
    this.line = line;
    this.column = column;
  }
}

/**
 * Parser deterministik untuk grammar template PesanRapi P0
 * Mendukung:
 * - Teks biasa & newline (CRLF dinormalisasi ke LF)
 * - Token variabel {{key}}
 * - Format tebal non-bersarang **teks**
 * - Escape sequences: \*, \{, \\
 */
export function parseTemplate(rawBody: string): ASTNode[] {
  if (!rawBody) return [];

  // Normalisasi CRLF menjadi LF sesuai PRD 7.3
  const source = rawBody.replace(/\r\n/g, "\n");
  const length = source.length;
  let index = 0;
  let line = 1;
  let col = 1;

  function advance(count = 1): void {
    for (let i = 0; i < count; i++) {
      if (source[index] === "\n") {
        line++;
        col = 1;
      } else {
        col++;
      }
      index++;
    }
  }

  const nodes: ASTNode[] = [];
  let currentText = "";

  function flushText(): void {
    if (currentText.length > 0) {
      nodes.push({ type: "text", value: currentText });
      currentText = "";
    }
  }

  while (index < length) {
    // 1. Karakter Escape: \* atau \{ atau \\
    if (source[index] === "\\") {
      const nextChar = source[index + 1];
      if (nextChar === "*" || nextChar === "{" || nextChar === "\\") {
        currentText += nextChar;
        advance(2);
        continue;
      }
      // Backslash biasa tanpa escape khusus
      currentText += "\\";
      advance(1);
      continue;
    }

    // 2. Format Tebal (Bold): **...**
    if (source[index] === "*" && source[index + 1] === "*") {
      flushText();
      const boldStartPos = index;
      const boldStartLine = line;
      const boldStartCol = col;
      advance(2); // Lewati '**' pembuka

      const boldChildren: (TextNode | VariableNode)[] = [];
      let boldText = "";

      function flushBoldText(): void {
        if (boldText.length > 0) {
          boldChildren.push({ type: "text", value: boldText });
          boldText = "";
        }
      }

      let boldClosed = false;

      while (index < length) {
        // Cek newline di dalam bold (dilarang sesuai PRD 9.1)
        if (source[index] === "\n") {
          throw new TemplateParseError(
            "Format tebal (**) tidak boleh melintasi baris baru (newline)",
            boldStartPos,
            boldStartLine,
            boldStartCol
          );
        }

        // Cek escape di dalam bold
        if (source[index] === "\\") {
          const nextChar = source[index + 1];
          if (nextChar === "*" || nextChar === "{" || nextChar === "\\") {
            boldText += nextChar;
            advance(2);
            continue;
          }
          boldText += "\\";
          advance(1);
          continue;
        }

        // Cek penutup bold '**'
        if (source[index] === "*" && source[index + 1] === "*") {
          flushBoldText();
          advance(2); // Lewati '**' penutup
          boldClosed = true;
          break;
        }

        // Cek variabel di dalam bold: **...{{key}}...**
        if (source[index] === "{" && source[index + 1] === "{") {
          flushBoldText();
          const varStartPos = index;
          const varStartLine = line;
          const varStartCol = col;
          advance(2); // Lewati '{{'

          let keyBuffer = "";
          let varClosed = false;

          while (index < length) {
            if (source[index] === "\n") {
              throw new TemplateParseError(
                "Token variabel '{{' tidak boleh melintasi baris baru",
                varStartPos,
                varStartLine,
                varStartCol
              );
            }
            if (source[index] === "}" && source[index + 1] === "}") {
              advance(2); // Lewati '}}'
              varClosed = true;
              break;
            }
            keyBuffer += source[index];
            advance(1);
          }

          if (!varClosed) {
            throw new TemplateParseError(
              "Token variabel '{{' belum ditutup dengan '}}'",
              varStartPos,
              varStartLine,
              varStartCol
            );
          }

          const trimmedKey = keyBuffer.trim();
          if (!isValidKey(trimmedKey) || keyBuffer !== trimmedKey) {
            throw new TemplateParseError(
              `Key variabel '${keyBuffer}' tidak valid. Key harus diawali huruf kecil, tanpa spasi, dan hanya huruf/angka/garis bawah (contoh: {{nama_pelanggan}})`,
              varStartPos,
              varStartLine,
              varStartCol
            );
          }

          boldChildren.push({ type: "variable", key: trimmedKey });
          continue;
        }

        // Karakter teks di dalam bold
        boldText += source[index];
        advance(1);
      }

      if (!boldClosed) {
        throw new TemplateParseError(
          "Penanda format tebal (**) tidak ditutup sampai akhir teks",
          boldStartPos,
          boldStartLine,
          boldStartCol
        );
      }

      nodes.push({ type: "bold", children: boldChildren });
      continue;
    }

    // 3. Token Variabel di luar bold: {{key}}
    if (source[index] === "{" && source[index + 1] === "{") {
      flushText();
      const varStartPos = index;
      const varStartLine = line;
      const varStartCol = col;
      advance(2); // Lewati '{{'

      let keyBuffer = "";
      let varClosed = false;

      while (index < length) {
        if (source[index] === "\n") {
          throw new TemplateParseError(
            "Token variabel '{{' tidak boleh melintasi baris baru",
            varStartPos,
            varStartLine,
            varStartCol
          );
        }
        if (source[index] === "}" && source[index + 1] === "}") {
          advance(2); // Lewati '}}'
          varClosed = true;
          break;
        }
        keyBuffer += source[index];
        advance(1);
      }

      if (!varClosed) {
        throw new TemplateParseError(
          "Token variabel '{{' belum ditutup dengan '}}'",
          varStartPos,
          varStartLine,
          varStartCol
        );
      }

      const trimmedKey = keyBuffer.trim();
      if (!isValidKey(trimmedKey) || keyBuffer !== trimmedKey) {
        throw new TemplateParseError(
          `Key variabel '${keyBuffer}' tidak valid. Key harus diawali huruf kecil, tanpa spasi, dan hanya huruf/angka/garis bawah (contoh: {{nama_pelanggan}})`,
          varStartPos,
          varStartLine,
          varStartCol
        );
      }

      nodes.push({ type: "variable", key: trimmedKey });
      continue;
    }

    // 4. Karakter Teks Biasa
    currentText += source[index];
    advance(1);
  }

  flushText();
  return nodes;
}

/**
 * Ekstraksi seluruh key variabel unik dari AST secara berurutan
 */
export function extractVariableKeys(ast: ASTNode[]): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();

  function collect(node: ASTNode): void {
    if (node.type === "variable") {
      if (!seen.has(node.key)) {
        seen.add(node.key);
        keys.push(node.key);
      }
    } else if (node.type === "bold") {
      node.children.forEach(collect);
    }
  }

  ast.forEach(collect);
  return keys;
}

/**
 * Validasi kecocokan antara token di body dan daftar field (PRD 8.3 & DEF-01)
 * Token tanpa field -> blokir simpan
 * Field tanpa token -> blokir simpan
 */
export function validateTemplateVariables(
  ast: ASTNode[],
  definedKeys: string[]
): {
  isValid: boolean;
  missingFields: string[]; // Ada di body, belum ada di fields
  unusedFields: string[]; // Ada di fields, tidak dipakai di body
  errors: string[];
} {
  const bodyKeys = new Set(extractVariableKeys(ast));
  const fieldKeySet = new Set(definedKeys);

  const missingFields: string[] = [];
  bodyKeys.forEach((key) => {
    if (!fieldKeySet.has(key)) {
      missingFields.push(key);
    }
  });

  const unusedFields: string[] = [];
  fieldKeySet.forEach((key) => {
    if (!bodyKeys.has(key)) {
      unusedFields.push(key);
    }
  });

  const errors: string[] = [];
  if (missingFields.length > 0) {
    errors.push(
      `Variabel berikut ada di isi pesan tetapi belum dibuatkan input formulirnya: ${missingFields
        .map((k) => `{{${k}}}`)
        .join(", ")}`
    );
  }
  if (unusedFields.length > 0) {
    errors.push(
      `Input formulir berikut tidak digunakan dalam isi pesan: ${unusedFields
        .map((k) => `'${k}'`)
        .join(", ")}. Hapus input atau sisipkan tokennya ke pesan.`
    );
  }

  return {
    isValid: errors.length === 0,
    missingFields,
    unusedFields,
    errors,
  };
}
