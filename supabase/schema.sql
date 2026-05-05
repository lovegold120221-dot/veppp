create table if not exists public.vep_chat_messages (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  role text not null check (role in ('user', 'model')),
  source text,
  speaker text,
  text text not null,
  message_timestamp timestamptz not null,
  file_url text,
  file_type text,
  file_name text,
  file_size bigint,
  storage_provider text check (storage_provider in ('supabase', 'google_drive', 'firebase') or storage_provider is null),
  storage_bucket text,
  storage_path text,
  google_drive_file_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vep_chat_messages_uid_timestamp_idx
  on public.vep_chat_messages (firebase_uid, message_timestamp desc);

create table if not exists public.vep_knowledge_files (
  id uuid primary key default gen_random_uuid(),
  firebase_uid text not null,
  file_name text not null,
  file_type text not null,
  file_size bigint not null default 0,
  source text not null check (source in ('supabase', 'google_drive', 'local')),
  storage_provider text check (storage_provider in ('supabase', 'google_drive', 'firebase') or storage_provider is null),
  storage_bucket text,
  storage_path text,
  public_url text,
  google_drive_file_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists vep_knowledge_files_uid_created_idx
  on public.vep_knowledge_files (firebase_uid, created_at desc);

insert into storage.buckets (id, name, public, file_size_limit)
values ('vep-global-storage', 'vep-global-storage', true, 52428800)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit;

alter table public.vep_chat_messages enable row level security;
alter table public.vep_knowledge_files enable row level security;

drop policy if exists "client insert chat mirrors" on public.vep_chat_messages;
create policy "client insert chat mirrors"
  on public.vep_chat_messages
  for insert
  to anon, authenticated
  with check (length(firebase_uid) between 4 and 160);

drop policy if exists "client insert knowledge files" on public.vep_knowledge_files;
create policy "client insert knowledge files"
  on public.vep_knowledge_files
  for insert
  to anon, authenticated
  with check (length(firebase_uid) between 4 and 160);

drop policy if exists "client upload firebase scoped objects" on storage.objects;
create policy "client upload firebase scoped objects"
  on storage.objects
  for insert
  to anon, authenticated
  with check (
    bucket_id = 'vep-global-storage'
    and name like 'users/%'
  );
