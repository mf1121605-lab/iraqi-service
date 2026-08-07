-- Narrow the new-request alert from "everyone in the category" to "the staff
-- actually assigned to the chosen service".
--
-- Names, corrected against the real schema:
--   * The trigger is fn_notify_new_request on public.requests, not
--     notify_assigned_employees_on_new_order on public.orders. `orders` is the
--     product shop; service submissions are `requests`.
--   * The assignee column is requests.assigned_employee_id, not employee_id.
--   * requests.category is text (FK to categories.key) and
--     profiles.active_services is text[] — both were converted away from the
--     old service_category enum in 20260712121600_categories.sql.
--
-- Push delivery is untouched: trg_dispatch_push_notification already fires on
-- any notifications insert, so changing WHO gets a row is the whole change.
-- Realtime likewise rides on the same inserts.
--
-- Still INSERT-only, deliberately. requests.service_id is written at insert
-- time by the request form, so an UPDATE trigger would add nothing here and
-- would risk re-notifying on every later status change.

create or replace function public.fn_notify_new_request() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_service_label text;
  v_targets       uuid[];
  v_body          text;
begin
  -- Shown in the alert so the employee knows which service was requested
  -- without opening it.
  if new.service_id is not null then
    select cs.label_ar into v_service_label
    from public.category_services cs
    where cs.id = new.service_id;
  end if;

  if new.assigned_employee_id is not null then
    -- 1) Already routed to one person — only they should hear about it.
    v_targets := array[new.assigned_employee_id];

  else
    -- 2) Staff the founder assigned to this exact service.
    --    account_status is still checked: an assignment must not wake a
    --    suspended account. active_services is deliberately NOT checked here —
    --    an explicit per-service assignment is the founder overriding the
    --    broad category routing.
    if new.service_id is not null then
      select array_agg(p.id) into v_targets
      from public.service_employees se
      join public.profiles p on p.id = se.employee_id
      where se.service_id = new.service_id
        and p.role = 'employee'
        and p.account_status = 'active';
    end if;

    -- 3) Fallback — nobody assigned to the service (or no service chosen at
    --    all). Broadcast to the category exactly as before, so a request can
    --    never land silently with no one alerted. This is also what keeps
    --    every service created before service_employees existed working.
    if v_targets is null or cardinality(v_targets) = 0 then
      select array_agg(p.id) into v_targets
      from public.profiles p
      where p.role = 'employee'
        and p.account_status = 'active'
        and new.category = any(p.active_services);
    end if;
  end if;

  if v_targets is null or cardinality(v_targets) = 0 then
    return new;   -- nothing to notify; never fail the insert over it
  end if;

  v_body := case
    when v_service_label is not null then v_service_label || ' — ' || new.title
    else new.title
  end;

  insert into public.notifications (user_id, title, body, link)
  select t, 'طلب جديد بانتظار الاستلام', v_body, '/employee/dashboard'
  from unnest(v_targets) as t;

  return new;
end;
$$;

-- Recreated so the trigger is unambiguously bound to the new definition even
-- if an older one is present under a different timing/name.
drop trigger if exists trg_notify_new_request on public.requests;
create trigger trg_notify_new_request
after insert on public.requests
for each row execute function public.fn_notify_new_request();

notify pgrst, 'reload schema';
