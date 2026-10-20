-- ==============================================================================
-- MIGRASI BASIS DATA SUPABASE PESANRAPI (v2.0 - Flow v2)
-- Menambahkan dukungan Node-Based Dynamic Decision Tree, input number & boolean,
-- ekspansi kapasitas body JSON, dan penguatan CAS optimistic locking.
-- ==============================================================================

-- 1. PERBARUI FUNGSI VALIDASI STRUKTUR JSONB FIELD
-- Mendukung tipe 'number' dan 'boolean' selain tipe v1 ('text', 'textarea', 'select', 'combobox')
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

  -- Array kosong valid (misalnya pada template Flow v2 di mana field tersimpan di dalam masing-masing node)
  IF jsonb_array_length(fields) = 0 THEN
    RETURN true;
  END IF;

  -- Maksimal 30 variabel input per template linear (PRD 9.4)
  IF jsonb_array_length(fields) > 30 THEN
    RETURN false;
  END IF;

  FOR f IN SELECT * FROM jsonb_array_elements(fields) LOOP
    IF jsonb_typeof(f) <> 'object' THEN
      RETURN false;
    END IF;

    -- LARANGAN PRIVASI: Tolak properti asing atau data pelanggan yang tersimpan
    IF f ? 'customer_input' OR f ? 'current_value' OR f ? 'output_message' OR f ? 'last_customer_input' OR f ? 'customer_secret' THEN
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

    -- Validasi tipe input (Mendukung tipe v1: text, textarea, select, combobox; v2: number, boolean)
    IF f_type NOT IN ('text', 'textarea', 'select', 'combobox', 'number', 'boolean') THEN
      RETURN false;
    END IF;

    f_allow_custom := (f->>'allow_custom')::boolean;
    f_options := f->'options';

    IF jsonb_typeof(f_options) <> 'array' THEN
      RETURN false;
    END IF;

    -- Text, Textarea, Number & Boolean tidak boleh membawa pilihan opsi
    IF f_type IN ('text', 'textarea', 'number', 'boolean') AND jsonb_array_length(f_options) > 0 THEN
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


-- 2. PERBARUI BATASAN TABEL TEMPLATES UNTUK FLOW v2
-- Batasan schema_version (1 atau 2)
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS check_schema_version;
ALTER TABLE public.templates ADD CONSTRAINT check_schema_version CHECK (schema_version IN (1, 2));

-- Perluas batas karakter body agar dapat menampung serialisasi JSON FlowNode
ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS check_body_length;
ALTER TABLE public.templates ADD CONSTRAINT check_body_length CHECK (char_length(body) BETWEEN 1 AND 100000);

ALTER TABLE public.templates DROP CONSTRAINT IF EXISTS check_body_bytes;
ALTER TABLE public.templates ADD CONSTRAINT check_body_bytes CHECK (octet_length(body) <= 300000);


-- 3. PERBARUI FUNGSI CAS (OPTIMISTIC LOCK) UNTUK MENDUKUNG SCHEMA_VERSION
-- Hapus versi lama jika ada untuk memperbarui signature
DROP FUNCTION IF EXISTS public.update_template_cas(uuid, integer, text, text, text, text, jsonb, boolean, boolean);
DROP FUNCTION IF EXISTS public.update_template_cas(uuid, integer, text, text, text, text, jsonb, boolean, boolean, integer);

CREATE OR REPLACE FUNCTION public.update_template_cas(
  p_template_id uuid,
  p_expected_version integer,
  p_title text,
  p_description text,
  p_category text,
  p_body text,
  p_fields jsonb,
  p_is_favorite boolean,
  p_is_archived boolean,
  p_schema_version integer DEFAULT NULL
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
    schema_version = COALESCE(p_schema_version, schema_version),
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
