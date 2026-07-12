-- ============================================================
-- profiles
-- ============================================================
alter table public.profiles enable row level security;

create policy profiles_select_self
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Staff need to see customer/employee info to work requests and route
-- cases; founder/co_admin need full visibility to manage accounts.
create policy profiles_select_staff_all
  on public.profiles for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

-- No INSERT policy: rows are created exclusively by the
-- handle_new_auth_user trigger (customer self-signup) or by the founder's
-- server-only admin API using the service-role key, which bypasses RLS
-- entirely. Employees can never be created from client code.

-- Self-updates are further restricted at the column-privilege level below
-- (role/account_status/admin_level are excluded), so this policy only
-- needs to keep a user editing their own row.
create policy profiles_update_self
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- Lets founder/co_admin edit an employee's specialization/active_services
-- directly from the client (e.g. "Service Specialization Settings: Founder
-- & Employee (self-profile)"). It does NOT reach role/account_status/
-- admin_level — see the column-privilege note below.
create policy profiles_update_founder
  on public.profiles for update
  to authenticated
  using (public.is_founder())
  with check (true);

-- co_admin has founder-like reach over accounts, but can never touch the
-- founder's own row (no suspending/demoting the primary founder).
create policy profiles_update_co_admin
  on public.profiles for update
  to authenticated
  using (public.is_co_admin() and role <> 'founder')
  with check (role <> 'founder');

-- Column-level privileges, layered under all three UPDATE policies above.
-- Every signed-in user — customer, employee, AND founder — authenticates
-- as the same shared `authenticated` Postgres role in Supabase; only
-- auth.uid() + the `profiles.role` column distinguish who they are, which
-- RLS can check per-row but a column GRANT cannot. So this REVOKE/GRANT
-- pair applies to all of them equally, and deliberately excludes
-- role/account_status/admin_level from the grant entirely.
--
-- Practical effect: a customer PATCHing role='founder' is rejected by
-- Postgres itself, not just app code — and so is the founder trying to
-- flip those same columns straight from the browser. Suspending an
-- account, promoting a co_admin, or creating an employee must go through
-- a server-only API route using supabaseAdmin (service-role key), which
-- bypasses RLS and column grants entirely. Non-sensitive columns
-- (specialization, active_services, names, avatar) remain directly
-- editable per the row-level policies above.
revoke update on public.profiles from authenticated;
grant update (
  given_name, father_name, grandfather_name, family_name,
  avatar_key, specialization, active_services, phone, email
) on public.profiles to authenticated;

-- No DELETE policy anywhere: accounts are suspended via account_status,
-- never deleted.

-- ============================================================
-- founder_settings
-- ============================================================
alter table public.founder_settings enable row level security;

create policy founder_settings_select_public
  on public.founder_settings for select
  to anon, authenticated
  using (true);

create policy founder_settings_write_founder
  on public.founder_settings for update
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- ============================================================
-- service_links
-- ============================================================
alter table public.service_links enable row level security;

create policy service_links_select_active_public
  on public.service_links for select
  to anon, authenticated
  using (is_active = true);

create policy service_links_select_staff_all
  on public.service_links for select
  to authenticated
  using (public.is_staff() or public.is_co_admin());

create policy service_links_write_founder_or_co_admin
  on public.service_links for all
  to authenticated
  using (public.is_founder() or public.is_co_admin())
  with check (public.is_founder() or public.is_co_admin());

-- ============================================================
-- chat_rooms
-- ============================================================
alter table public.chat_rooms enable row level security;

create policy chat_rooms_select_public
  on public.chat_rooms for select
  to anon, authenticated
  using (true);

-- Room creation and moderator assignment is a founder-only action.
create policy chat_rooms_write_founder
  on public.chat_rooms for all
  to authenticated
  using (public.is_founder())
  with check (public.is_founder());

-- ============================================================
-- chat_messages
-- ============================================================
alter table public.chat_messages enable row level security;

-- Community rooms are open to any signed-in user, but not to anonymous
-- visitors (who can see the room list, not its contents).
create policy chat_messages_select_authenticated
  on public.chat_messages for select
  to authenticated
  using (true);

create policy chat_messages_insert_authenticated
  on public.chat_messages for insert
  to authenticated
  with check (sender_id = auth.uid());

-- Only the author, that room's moderator, or the founder may moderate
-- (hide) a message; no one can edit the message body after the fact.
create policy chat_messages_update_moderation
  on public.chat_messages for update
  to authenticated
  using (
    sender_id = auth.uid()
    or public.is_founder()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id and cr.moderator_id = auth.uid()
    )
  )
  with check (
    sender_id = auth.uid()
    or public.is_founder()
    or exists (
      select 1 from public.chat_rooms cr
      where cr.id = chat_messages.room_id and cr.moderator_id = auth.uid()
    )
  );

revoke update on public.chat_messages from authenticated;
grant update (is_hidden) on public.chat_messages to authenticated;
grant update on public.chat_messages to postgres;
-- No DELETE policy: moderation hides messages (is_hidden), never deletes.

-- ============================================================
-- requests
-- ============================================================
alter table public.requests enable row level security;

create policy requests_select_participants
  on public.requests for select
  to authenticated
  using (
    customer_id = auth.uid()
    or assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and category = any (public.current_active_services())
    )
  );

-- "Submit to the 4 Service Categories: Customer Only."
create policy requests_insert_customer_only
  on public.requests for insert
  to authenticated
  with check (public.current_role() = 'customer' and customer_id = auth.uid());

-- Employees may update requests already assigned to them, or claim an
-- unassigned request that matches one of their active service categories;
-- founder/co_admin can update anything. Customers never update a request
-- after submitting it.
create policy requests_update_staff
  on public.requests for update
  to authenticated
  using (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and assigned_employee_id is null
      and category = any (public.current_active_services())
    )
  )
  with check (
    assigned_employee_id = auth.uid()
    or public.is_founder()
    or public.is_co_admin()
    or (
      public.current_role() = 'employee'
      and category = any (public.current_active_services())
    )
  );

-- No DELETE policy: citizen service requests are never deleted.

-- ============================================================
-- request_documents
-- ============================================================
alter table public.request_documents enable row level security;

create policy request_documents_select_participants
  on public.request_documents for select
  to authenticated
  using (
    public.is_founder()
    or public.is_co_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_documents.request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  );

-- Only the request's own customer uploads supporting documents.
create policy request_documents_insert_owner
  on public.request_documents for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id and r.customer_id = auth.uid()
    )
  );

-- No UPDATE/DELETE: replace a document by uploading a new one; the
-- evidence trail is append-only.

-- ============================================================
-- request_messages
-- ============================================================
alter table public.request_messages enable row level security;

create policy request_messages_select_participants
  on public.request_messages for select
  to authenticated
  using (
    public.is_founder()
    or public.is_co_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_messages.request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  );

-- "Live Chat Responses to Customers: Founder & Employee" — plus the
-- customer themself can message about their own request.
create policy request_messages_insert_participants
  on public.request_messages for insert
  to authenticated
  with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.requests r
      where r.id = request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid() or public.is_founder())
    )
  );

-- No UPDATE/DELETE: the transcript is immutable.

-- ============================================================
-- request_status_history
-- ============================================================
alter table public.request_status_history enable row level security;

create policy request_status_history_select_participants
  on public.request_status_history for select
  to authenticated
  using (
    public.is_founder()
    or public.is_co_admin()
    or exists (
      select 1 from public.requests r
      where r.id = request_status_history.request_id
        and (r.customer_id = auth.uid() or r.assigned_employee_id = auth.uid())
    )
  );

-- No INSERT/UPDATE/DELETE policy at all: only fn_log_request_status_change
-- (SECURITY DEFINER, owned by the migration role which is exempt from its
-- own RLS) can write here. Do not add FORCE ROW LEVEL SECURITY to this
-- table — that would also lock out the trigger's owner and break logging.

-- ============================================================
-- audit_log
-- ============================================================
alter table public.audit_log enable row level security;

create policy audit_log_select_founder_only
  on public.audit_log for select
  to authenticated
  using (public.is_founder());

-- No write policy for any client role — see fn_audit_log_generic /
-- fn_audit_log_profile_sensitive. Same FORCE ROW LEVEL SECURITY caveat as
-- request_status_history applies.

-- ============================================================
-- notifications
-- ============================================================
alter table public.notifications enable row level security;

create policy notifications_select_own
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy notifications_update_own
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Users may only flip is_read; title/body/link stay server-generated.
revoke update on public.notifications from authenticated;
grant update (is_read) on public.notifications to authenticated;
grant update on public.notifications to postgres;

-- No INSERT policy: notifications are only ever created by the
-- SECURITY DEFINER trigger functions above.
