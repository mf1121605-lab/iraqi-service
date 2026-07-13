-- Single private bucket for both community-chat and request-chat file
-- attachments, split by a path prefix rather than two buckets, since the
-- access rules only differ in scope (open to any authenticated user vs.
-- restricted to a request's own participants) and the RLS below already
-- has to branch on the path anyway.
--
-- Path convention:
--   chat/{room_id}/{uuid}-{filename}
--   requests/{request_id}/{uuid}-{filename}
--
-- file_size_limit/allowed_mime_types enforce the same jpg/png/pdf, ≤5MB
-- rule as request_documents, at the bucket level — defense in depth, not
-- just a client-side check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attachments', 'attachments', false, 5242880, array['image/png', 'image/jpeg', 'application/pdf'])
on conflict (id) do nothing;

create policy attachments_chat_select
  on storage.objects for select
  to authenticated
  using (bucket_id = 'attachments' and (storage.foldername(name))[1] = 'chat');

create policy attachments_chat_insert
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'attachments' and (storage.foldername(name))[1] = 'chat');

-- No update/delete: attachments are append-only, same as the messages
-- that reference them.

create policy attachments_requests_select
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'requests'
    and (
      public.is_founder()
      or public.is_co_admin()
      or exists (
        select 1 from public.requests r
        where r.id::text = (storage.foldername(name))[2]
          and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
      )
    )
  );

create policy attachments_requests_insert
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'attachments'
    and (storage.foldername(name))[1] = 'requests'
    and exists (
      select 1 from public.requests r
      where r.id::text = (storage.foldername(name))[2]
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  );
