-- Run this once in the Supabase SQL editor before deploying to Vercel.
-- The app currently stores its application state as one JSON document so the
-- existing local flow and Supabase flow stay identical.

create table if not exists public.detail_page_app_state (
  key text primary key,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'detail-page-assets',
  'detail-page-assets',
  false,
  104857600,
  array[
    'image/png',
    'image/jpeg',
    'image/webp',
    'image/svg+xml',
    'application/octet-stream'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
