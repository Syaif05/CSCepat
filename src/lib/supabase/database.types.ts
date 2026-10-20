export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      templates: {
        Row: {
          id: string;
          owner_id: string;
          title: string;
          description: string;
          category: string;
          body: string;
          fields: Json;
          is_favorite: boolean;
          is_archived: boolean;
          starter_key: string | null;
          schema_version: number;
          version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          owner_id?: string;
          title: string;
          description?: string;
          category?: string;
          body: string;
          fields?: Json;
          is_favorite?: boolean;
          is_archived?: boolean;
          starter_key?: string | null;
          schema_version?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          title?: string;
          description?: string;
          category?: string;
          body?: string;
          fields?: Json;
          is_favorite?: boolean;
          is_archived?: boolean;
          starter_key?: string | null;
          schema_version?: number;
          version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "templates_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
      user_settings: {
        Row: {
          owner_id: string;
          default_output_mode: "plain" | "whatsapp";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          owner_id?: string;
          default_output_mode?: "plain" | "whatsapp";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          owner_id?: string;
          default_output_mode?: "plain" | "whatsapp";
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_settings_owner_id_fkey";
            columns: ["owner_id"];
            isOneToOne: true;
            referencedRelation: "users";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      update_template_cas: {
        Args: {
          p_template_id: string;
          p_expected_version: number;
          p_title: string;
          p_description: string;
          p_category: string;
          p_body: string;
          p_fields: Json;
          p_is_favorite: boolean;
          p_is_archived: boolean;
        };
        Returns: Database["public"]["Tables"]["templates"]["Row"];
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}
