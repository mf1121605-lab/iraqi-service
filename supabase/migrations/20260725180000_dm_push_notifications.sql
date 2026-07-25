-- Push notifications for DM invitations and DM messages
-- Both insert into the notifications table, which already has the
-- trg_dispatch_push_notification trigger that calls /api/push/dispatch.

-- 1. Notify receiver when someone sends them a DM invitation
create or replace function public.fn_notify_dm_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
begin
  select coalesce(given_name, 'مستخدم') into v_sender_name
  from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, title, body, link, notification_type)
  values (
    new.receiver_id,
    'طلب مراسلة جديد',
    v_sender_name || ' يريد مراسلتك',
    '/customer/dashboard',
    'dm_invitation'
  );
  return new;
end;
$$;

create trigger trg_notify_dm_invitation
after insert on public.chat_room_invitations
for each row execute function public.fn_notify_dm_invitation();

-- 2. Notify the other participant when a direct message arrives
create or replace function public.fn_notify_direct_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sender_name text;
  v_other_user  uuid;
  v_thread      record;
begin
  select user_a_id, user_b_id into v_thread
  from public.direct_message_threads where id = new.thread_id;

  if v_thread is null then return new; end if;

  v_other_user := case
    when new.sender_id = v_thread.user_a_id then v_thread.user_b_id
    else v_thread.user_a_id
  end;

  select coalesce(given_name, 'مستخدم') into v_sender_name
  from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, title, body, link, notification_type)
  values (
    v_other_user,
    'رسالة من ' || v_sender_name,
    left(coalesce(new.body, '📎 مرفق'), 100),
    '/chat/dm/' || new.thread_id::text,
    'dm_message'
  );
  return new;
end;
$$;

create trigger trg_notify_direct_message
after insert on public.direct_messages
for each row execute function public.fn_notify_direct_message();
