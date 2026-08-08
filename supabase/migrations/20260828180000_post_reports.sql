-- No existing policy lets an author edit their own post's text (only staff
-- can UPDATE, for approve/reject/pin) — needed for the new "Edit post" menu
-- item; deliberately WITH CHECK (author_id = auth.uid()) so an author can't
-- use an edit request to reassign authorship to someone else.
create policy social_posts_update_own
  on public.social_posts for update
  to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

create table public.post_reports (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.social_posts(id) on delete cascade,
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  reason      text not null,
  status      text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  created_at  timestamptz not null default now()
);

create index post_reports_status_idx on public.post_reports(status, created_at desc);

alter table public.post_reports enable row level security;

create policy post_reports_insert_own
  on public.post_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create policy post_reports_select_staff
  on public.post_reports for select
  to authenticated
  using (public.is_founder() or public.is_co_admin() or public.is_staff());

create policy post_reports_update_staff
  on public.post_reports for update
  to authenticated
  using (public.is_founder() or public.is_co_admin() or public.is_staff())
  with check (public.is_founder() or public.is_co_admin() or public.is_staff());

create policy post_reports_delete_staff
  on public.post_reports for delete
  to authenticated
  using (public.is_founder() or public.is_co_admin() or public.is_staff());

alter publication supabase_realtime add table public.post_reports;
