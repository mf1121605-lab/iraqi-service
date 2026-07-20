-- Read receipts for the private customer<->employee request chat. The
-- transcript itself stays immutable (see rls_policies.sql's note on
-- request_messages) — this only allows the *recipient* of a message to
-- flip its own read_at, mirroring the exact column-privilege pattern
-- already used for notifications.is_read.
alter table public.request_messages add column read_at timestamptz;

create policy request_messages_update_read_receipt
  on public.request_messages for update
  to authenticated
  using (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_messages.request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  )
  with check (
    sender_id <> auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_messages.request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  );

grant update (read_at) on public.request_messages to authenticated;
