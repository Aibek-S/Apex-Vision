-- strict.sql
-- Reconstructed from APP_FINAL/src/types/supabase.ts
-- Assumptions are identical to reconstructed.sql.
-- This script is intentionally strict: it will fail if objects already exist.

begin;

-- In Supabase/PostgreSQL, `public` usually already exists.
-- We intentionally avoid `create schema if not exists` in strict mode.

create type public.artifact_status as enum (
  'created',
  'processing',
  'images_collected',
  'error',
  'ready'
);

create type public.capture_mode as enum (
  'device',
  'manual'
);

create type public.session_status as enum (
  'created',
  'active',
  'completed',
  'failed'
);

create type public.validation_status as enum (
  'pending',
  'in_progress',
  'passed',
  'failed'
);

create table public.artifacts (
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
  validation_status public.validation_status not null,
  constraint artifacts_pkey primary key (id)
);

create table public.capture_sessions (
  artifact_id uuid not null,
  capture_mode public.capture_mode not null,
  created_at timestamptz not null,
  finished_at timestamptz null,
  id uuid not null,
  notes text null,
  status public.session_status not null,
  uploaded_images integer not null,
  user_id uuid not null,
  constraint capture_sessions_pkey primary key (id)
);

create table public.artifact_images (
  artifact_id uuid not null,
  checksum text null,
  file_size bigint not null,
  id uuid not null,
  mime_type text not null,
  session_id uuid not null,
  storage_path text not null,
  uploaded_at timestamptz not null,
  user_id uuid not null,
  constraint artifact_images_pkey primary key (id)
);

create table public.artifact_measurements (
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
  width numeric null,
  constraint artifact_measurements_pkey primary key (id)
);

create table public.profiles (
  full_name text null,
  id uuid not null,
  is_guest boolean null,
  role text null,
  updated_at timestamptz null,
  constraint profiles_pkey primary key (id)
);

alter table public.capture_sessions
  add constraint capture_sessions_artifact_id_fkey
  foreign key (artifact_id)
  references public.artifacts (id);

alter table public.artifact_images
  add constraint artifact_images_artifact_id_fkey
  foreign key (artifact_id)
  references public.artifacts (id);

alter table public.artifact_images
  add constraint artifact_images_session_id_fkey
  foreign key (session_id)
  references public.capture_sessions (id);

commit;

-- ------------------------------------------------------------
-- Missing / not reliably reconstructable from TS-only metadata
-- ------------------------------------------------------------
-- missing defaults
-- missing indexes
-- missing unique constraints
-- missing checks
-- missing triggers
-- missing RLS policies
-- missing functions
