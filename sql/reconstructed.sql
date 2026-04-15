-- Reconstructed from APP_FINAL/src/types/supabase.ts
-- Assumptions used:
-- 1) string identifiers (id, *_id) are uuid.
-- 2) *at timestamp-like fields are timestamptz.
-- 3) number fields are mapped by domain guess: counters -> integer/bigint, measurements/cost -> numeric.
-- 4) id columns are treated as PRIMARY KEY (likely, but not explicitly encoded in TS).
-- 5) Only relationships explicitly listed in `Relationships` are restored as foreign keys.
-- 6) No defaults/triggers/RLS/indexes/unique/checks beyond what can be inferred safely.

begin;

create schema if not exists public;

-- Enums
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'artifact_status'
  ) THEN
    CREATE TYPE public.artifact_status AS ENUM (
      'created',
      'processing',
      'images_collected',
      'error',
      'ready'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'capture_mode'
  ) THEN
    CREATE TYPE public.capture_mode AS ENUM (
      'device',
      'manual'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'session_status'
  ) THEN
    CREATE TYPE public.session_status AS ENUM (
      'created',
      'active',
      'completed',
      'failed'
    );
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_type t
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' AND t.typname = 'validation_status'
  ) THEN
    CREATE TYPE public.validation_status AS ENUM (
      'pending',
      'in_progress',
      'passed',
      'failed'
    );
  END IF;
END
$$;

-- Tables (without foreign keys first)
create table if not exists public.artifacts (
  capture_mode public.capture_mode null,
  created_at timestamptz not null,
  "3d_url" text null,
  device_completed_at timestamptz null,
  id uuid not null,
  image_count integer not null,
  is_public boolean not null,
  last_capture_at timestamptz null,
  manual_uploaded_at timestamptz null,
  name text not null,
  status public.artifact_status not null,
  thumbnail_url text null,
  updated_at timestamptz not null,
  user_id uuid not null,
  validation_notes text null,
  validation_status public.validation_status not null
);

create table if not exists public.capture_sessions (
  artifact_id uuid not null,
  capture_mode public.capture_mode not null,
  created_at timestamptz not null,
  finished_at timestamptz null,
  id uuid not null,
  notes text null,
  status public.session_status not null,
  uploaded_images integer not null,
  user_id uuid not null
);

create table if not exists public.artifact_images (
  artifact_id uuid not null,
  checksum text null,
  file_size bigint not null,
  id uuid not null,
  mime_type text not null,
  session_id uuid not null,
  storage_path text not null,
  uploaded_at timestamptz not null,
  user_id uuid not null
);

create table if not exists public.artifact_measurements (
  artifact_id uuid null,
  bibliography text null,
  cipher_id text null,
  condition_description text null,
  cost numeric null,
  created_at timestamptz not null,
  dating text null,
  height numeric null,
  id bigint not null,
  legend text null,
  length numeric null,
  material text null,
  place_of_creation text null,
  publisher_name text null,
  quantity integer null,
  report_author text null,
  restoration_details text null,
  subject text null,
  technique text null,
  weight numeric null,
  width numeric null
);

create table if not exists public.profiles (
  full_name text null,
  id uuid not null,
  is_guest boolean null,
  role text null,
  updated_at timestamptz null
);

-- Primary keys (assumption-based)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifacts_pkey' AND conrelid = 'public.artifacts'::regclass
  ) THEN
    ALTER TABLE public.artifacts
      ADD CONSTRAINT artifacts_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'capture_sessions_pkey' AND conrelid = 'public.capture_sessions'::regclass
  ) THEN
    ALTER TABLE public.capture_sessions
      ADD CONSTRAINT capture_sessions_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifact_images_pkey' AND conrelid = 'public.artifact_images'::regclass
  ) THEN
    ALTER TABLE public.artifact_images
      ADD CONSTRAINT artifact_images_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifact_measurements_pkey' AND conrelid = 'public.artifact_measurements'::regclass
  ) THEN
    ALTER TABLE public.artifact_measurements
      ADD CONSTRAINT artifact_measurements_pkey PRIMARY KEY (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'profiles_pkey' AND conrelid = 'public.profiles'::regclass
  ) THEN
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);
  END IF;
END
$$;

-- Foreign keys (only explicit `Relationships` from TS)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'capture_sessions_artifact_id_fkey'
      AND conrelid = 'public.capture_sessions'::regclass
  ) THEN
    ALTER TABLE public.capture_sessions
      ADD CONSTRAINT capture_sessions_artifact_id_fkey
      FOREIGN KEY (artifact_id)
      REFERENCES public.artifacts (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifact_images_artifact_id_fkey'
      AND conrelid = 'public.artifact_images'::regclass
  ) THEN
    ALTER TABLE public.artifact_images
      ADD CONSTRAINT artifact_images_artifact_id_fkey
      FOREIGN KEY (artifact_id)
      REFERENCES public.artifacts (id);
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'artifact_images_session_id_fkey'
      AND conrelid = 'public.artifact_images'::regclass
  ) THEN
    ALTER TABLE public.artifact_images
      ADD CONSTRAINT artifact_images_session_id_fkey
      FOREIGN KEY (session_id)
      REFERENCES public.capture_sessions (id);
  END IF;
END
$$;

commit;

-- ------------------------------------------------------------
-- Missing / not reliably reconstructable from TS-only metadata
-- ------------------------------------------------------------
-- missing defaults:
--   Not inferred for id/created_at/updated_at/status/etc.
--
-- missing indexes:
--   Non-PK and FK supporting indexes are not reconstructed.
--
-- missing unique constraints:
--   No additional UNIQUE constraints were derivable.
--
-- missing checks:
--   CHECK constraints could not be recovered.
--
-- missing triggers:
--   Trigger logic (e.g., updated_at maintenance) not recoverable here.
--
-- missing RLS policies:
--   RLS enablement and policies are not present in generated TS types.
--
-- missing functions:
--   Functions/RPC were empty in this type file.
