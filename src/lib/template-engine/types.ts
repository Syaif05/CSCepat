/**
 * Tipe data dan AST untuk Template Engine PesanRapi
 * Sesuai PRD Bagian 7, 8, 9, dan 14
 */

export type FieldType = "text" | "textarea" | "select" | "combobox";

export type DataClass = "transient" | "configuration";

export interface FieldOption {
  id: string;
  label: string;
  value: string;
}

export interface FieldDefinition {
  id: string;
  key: string;
  label: string;
  type: FieldType;
  required: boolean;
  data_class: DataClass;
  placeholder: string;
  help_text: string;
  max_length: number;
  allow_custom: boolean;
  default_value: string | null;
  options: FieldOption[];
}

export interface TemplateDefinition {
  id?: string;
  owner_id?: string;
  title: string;
  description: string;
  category: string;
  body: string;
  fields: FieldDefinition[];
  is_favorite: boolean;
  is_archived: boolean;
  starter_key?: string | null;
  schema_version: number;
  version: number;
  created_at?: string;
  updated_at?: string;
}

export interface TemplateListItem {
  id: string;
  title: string;
  description: string;
  category: string;
  field_count: number;
  is_favorite: boolean;
  is_archived: boolean;
  starter_key: string | null;
  version: number;
  updated_at: string;
}

// AST Nodes untuk parser template
export interface TextNode {
  type: "text";
  value: string;
}

export interface VariableNode {
  type: "variable";
  key: string;
}

export interface BoldNode {
  type: "bold";
  children: (TextNode | VariableNode)[];
}

export type ASTNode = TextNode | VariableNode | BoldNode;

export type OutputMode = "plain" | "whatsapp";

export interface RenderResult {
  text: string;
  isComplete: boolean;
  missingRequiredFields: string[];
  hasWhatsAppFormatChars: boolean;
  substitutedValues: Record<string, string>;
}

export interface ParseError {
  message: string;
  position: number;
  line: number;
  column: number;
}
