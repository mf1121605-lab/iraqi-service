-- Social news feed: posts, per-post reactions (one per user), and comments.
create table public.social_posts (
  id         uuid primary key default gen_random_uuid(),
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text,
  image_url  text,
  created_at timestamptz not null default now(),
  constraint social_posts_has_content check (content is not null or image_url is not null)
);

create table public.social_reactions (
  id            uuid primary key default gen_random_uuid(),
  post_id       uuid not null references public.social_posts(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  reaction_type text not null check (reaction_type in ('like', 'love', 'angry')),
  created_at    timestamptz not null default now(),
  unique(post_id, user_id)
);

create table public.social_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.social_posts(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);

alter table public.social_posts     enable row level security;
alter table public.social_reactions enable row level security;
alter table public.social_comments  enable row level security;

create policy social_posts_select on public.social_posts for select to authenticated using (true);
create policy social_posts_insert on public.social_posts for insert to authenticated with check (author_id = auth.uid());
create policy social_posts_delete on public.social_posts for delete to authenticated
  using (author_id = auth.uid() or public.is_founder() or public.is_co_admin());

create policy social_reactions_select on public.social_reactions for select to authenticated using (true);
create policy social_reactions_insert on public.social_reactions for insert to authenticated with check (user_id = auth.uid());
create policy social_reactions_delete on public.social_reactions for delete to authenticated using (user_id = auth.uid());

create policy social_comments_select on public.social_comments for select to authenticated using (true);
create policy social_comments_insert on public.social_comments for insert to authenticated with check (author_id = auth.uid());
create policy social_comments_delete on public.social_comments for delete to authenticated
  using (author_id = auth.uid() or public.is_founder() or public.is_co_admin());

alter publication supabase_realtime add table public.social_posts;
alter publication supabase_realtime add table public.social_reactions;
alter publication supabase_realtime add table public.social_comments;
