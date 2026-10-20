-- ==============================================================================
-- MIGRASI BASIS DATA SUPABASE PESANRAPI (v1.0)
-- Sesuai PRD Bagian 14 (Model Database) dan Bagian 15 (RLS & Keamanan)
-- ==============================================================================

-- 1. FUNGSI VALIDASI STRUKTUR JSONB FIELD
-- Memastikan integritas skema field dan mencegah data pelanggan masuk ke database
CREATE OR REPLACE FUNCTION public.validate_template_fields(fields jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  f jsonb;
  f_key text;
  f_type text;
  f_class text;
  f_default text;
  f_allow_custom boolean;
  f_options jsonb;
  opt jsonb;
  opt_val text;
  seen_keys text[] := '{}';
  seen_opts text[] := '{}';
BEGIN
  -- Wajib berupa JSONB array
  IF jsonb_typeof(fields) <> 'array' THEN
    RETURN false;
  END IF;

  -- Maksimal 30 variabel input per template (PRD 9.4)
  IF jsonb_array_length(fields) > 30 THEN
    RETURN false;
  END IF;

  FOR f IN SELECT * FROM jsonb_array_elements(fields) LOOP
    IF jsonb_typeof(f) <> 'object' THEN
      RETURN false;
    END IF;

    -- LARANGAN PRIVASI: Tolak properti asing atau data pelanggan yang tersimpan
    IF f ? 'customer_input' OR f ? 'current_value' OR f ? 'output_message' OR f ? 'last_customer_input' THEN
      RETURN false;
    END IF;

    -- Properti wajib pada setiap field
    IF NOT (f ? 'id' AND f ? 'key' AND f ? 'label' AND f ? 'type' AND f ? 'required' AND f ? 'data_class' AND f ? 'max_length' AND f ? 'allow_custom' AND f ? 'default_value' AND f ? 'options') THEN
      RETURN false;
    END IF;

    f_key := f->>'key';
    f_type := f->>'type';
    f_class := f->>'data_class';

    -- Validasi pola key [a-z][a-z0-9_]{0,63}
    IF f_key !~ '^[a-z][a-z0-9_]{0,63}$' THEN
      RETURN false;
    END IF;

    -- Validasi keunikan key dalam 1 template
    IF f_key = ANY(seen_keys) THEN
      RETURN false;
    END IF;
    seen_keys := array_append(seen_keys, f_key);

    -- Klasifikasi data transient vs configuration (PRD 7.2 & 14.5)
    IF f_class NOT IN ('transient', 'configuration') THEN
      RETURN false;
    END IF;

    -- Field transient HARUS memiliki default_value = NULL (tidak boleh ada isian bawaan tersimpan)
    IF f_class = 'transient' AND f->>'default_value' IS NOT NULL THEN
      RETURN false;
    END IF;

    -- Validasi tipe input
    IF f_type NOT IN ('text', 'textarea', 'select', 'combobox') THEN
      RETURN false;
    END IF;

    f_allow_custom := (f->>'allow_custom')::boolean;
    f_options := f->'options';

    IF jsonb_typeof(f_options) <> 'array' THEN
      RETURN false;
    END IF;

    -- Text & Textarea tidak boleh membawa pilihan opsi
    IF f_type IN ('text', 'textarea') AND jsonb_array_length(f_options) > 0 THEN
      RETURN false;
    END IF;

    -- Select & Combobox: Maksimal 100 opsi
    IF f_type IN ('select', 'combobox') THEN
      IF jsonb_array_length(f_options) > 100 THEN
        RETURN false;
      END IF;

      IF f_type = 'select' AND f_allow_custom <> false THEN
        RETURN false;
      END IF;

      IF f_type = 'combobox' AND f_allow_custom <> true THEN
        RETURN false;
      END IF;

      -- Validasi keunikan value opsi
      seen_opts := '{}';
      FOR opt IN SELECT * FROM jsonb_array_elements(f_options) LOOP
        opt_val := trim(opt->>'value');
        IF opt_val = '' OR opt_val = ANY(seen_opts) THEN
          RETURN false;
        END IF;
        seen_opts := array_append(seen_opts, opt_val);
      END LOOP;
    END IF;
  END LOOP;

  RETURN true;
END;
$$;


-- 2. TABEL TEMPLATES (PRD 14.2)
CREATE TABLE IF NOT EXISTS public.templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT '',
  body text NOT NULL,
  fields jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_favorite boolean NOT NULL DEFAULT false,
  is_archived boolean NOT NULL DEFAULT false,
  starter_key text NULL,
  schema_version integer NOT NULL DEFAULT 1,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  -- Batasan ukuran kolom (PRD 9.4)
  CONSTRAINT check_title_length CHECK (char_length(trim(title)) BETWEEN 1 AND 100),
  CONSTRAINT check_description_length CHECK (char_length(description) <= 300),
  CONSTRAINT check_category_length CHECK (char_length(category) <= 50),
  CONSTRAINT check_body_length CHECK (char_length(body) BETWEEN 1 AND 10000),
  CONSTRAINT check_body_bytes CHECK (octet_length(body) <= 30000),
  CONSTRAINT check_fields_structure CHECK (public.validate_template_fields(fields))
);

-- Index performa query template terisolasi akun
CREATE INDEX IF NOT EXISTS idx_templates_owner_archived_updated
  ON public.templates (owner_id, is_archived, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_templates_owner_category
  ON public.templates (owner_id, category);

-- Unique index parsial untuk starter_key per akun (mencegah klik ganda saat inisialisasi)
CREATE UNIQUE INDEX IF NOT EXISTS idx_templates_owner_starter_key
  ON public.templates (owner_id, starter_key)
  WHERE starter_key IS NOT NULL;


-- 3. TABEL USER SETTINGS (PRD 14.3)
CREATE TABLE IF NOT EXISTS public.user_settings (
  owner_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  default_output_mode text NOT NULL DEFAULT 'plain',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT check_output_mode CHECK (default_output_mode IN ('plain', 'whatsapp'))
);


-- 4. ROW LEVEL SECURITY (RLS) POLICIES (PRD 15.1)
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Cabut akses dari pengguna anonim
REVOKE ALL ON public.templates FROM anon;
REVOKE ALL ON public.user_settings FROM anon;

-- Policy untuk Tabel Templates
DROP POLICY IF EXISTS templates_select_own ON public.templates;
CREATE POLICY templates_select_own
  ON public.templates FOR SELECT TO authenticated
  USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS templates_insert_own ON public.templates;
CREATE POLICY templates_insert_own
  ON public.templates FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS templates_update_own ON public.templates;
CREATE POLICY templates_update_own
  ON public.templates FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS templates_delete_own ON public.templates;
CREATE POLICY templates_delete_own
  ON public.templates FOR DELETE TO authenticated
  USING ((select auth.uid()) = owner_id);

-- Policy untuk Tabel User Settings
DROP POLICY IF EXISTS settings_select_own ON public.user_settings;
CREATE POLICY settings_select_own
  ON public.user_settings FOR SELECT TO authenticated
  USING ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS settings_insert_own ON public.user_settings;
CREATE POLICY settings_insert_own
  ON public.user_settings FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS settings_update_own ON public.user_settings;
CREATE POLICY settings_update_own
  ON public.user_settings FOR UPDATE TO authenticated
  USING ((select auth.uid()) = owner_id)
  WITH CHECK ((select auth.uid()) = owner_id);

DROP POLICY IF EXISTS settings_delete_own ON public.user_settings;
CREATE POLICY settings_delete_own
  ON public.user_settings FOR DELETE TO authenticated
  USING ((select auth.uid()) = owner_id);


-- 5. RPC FUNCTION: UPDATE TEMPLATE DENGAN OPTIMISTIC CONCURRENCY (VERSION COMPARE-AND-SWAP)
-- Mencegah penimpaan perubahan antar-tab (PRD 8.4, 16, & SAVE-01)
CREATE OR REPLACE FUNCTION public.update_template_cas(
  p_template_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text,
  p_category text,
  p_body text,
  p_fields jsonb,
  p_is_favorite boolean,
  p_is_archived boolean
)
RETURNS public.templates
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_updated public.templates;
BEGIN
  UPDATE public.templates
  SET
    title = p_title,
    description = p_description,
    category = p_category,
    body = p_body,
    fields = p_fields,
    is_favorite = p_is_favorite,
    is_archived = p_is_archived,
    version = version + 1,
    updated_at = now()
  WHERE id = p_template_id
    AND version = p_expected_version
    AND owner_id = (SELECT auth.uid())
  RETURNING * INTO v_updated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'CONFLICT_OR_NOT_FOUND' USING ERRCODE = 'P0001';
  END IF;

  RETURN v_updated;
END;
$$;


-- 6. TRIGGER AUTO UPDATE TIMESTAMP
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_templates_updated_at ON public.templates;
CREATE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON public.templates
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_user_settings_updated_at ON public.user_settings;
CREATE TRIGGER trg_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
