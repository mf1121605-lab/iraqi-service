-- Singleton row (id is always 1) holding the platform-wide chat
-- background/audio, set once by the founder and applied to all 5
-- community rooms — the spec calls these out as global, not per-room.
create table public.founder_settings (
  id smallint primary key default 1,
  chat_background_key text,
  chat_audio_track_key text,
  updated_by uuid references public.profiles (id),
  updated_at timestamptz not null default now(),
  constraint founder_settings_singleton check (id = 1)
);

insert into public.founder_settings (id) values (1);

create trigger trg_founder_settings_updated_at
before update on public.founder_settings
for each row execute function public.set_updated_at();

create trigger trg_audit_founder_settings
after insert or update or delete on public.founder_settings
for each row execute function public.fn_audit_log_generic();

-- Hero banner carousel items ("Manage Global Hero Banners: Founder Only").
create table public.service_links (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  url text not null,
  image_path text,
  is_active boolean not null default true,
  sort_order int not null default 0,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_links_active_idx on public.service_links (is_active, sort_order);

create trigger trg_service_links_updated_at
before update on public.service_links
for each row execute function public.set_updated_at();

create trigger trg_audit_service_links
after insert or update or delete on public.service_links
for each row execute function public.fn_audit_log_generic();
