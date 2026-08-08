alter table public.notifications
  add column if not exists related_user_id uuid references public.profiles(id) on delete set null;

-- Re-created to also stamp related_user_id, so the in-app notification
-- banner can show the actual sender's avatar/name instead of just the
-- pre-formatted title/body text.
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

  insert into public.notifications (user_id, title, body, link, notification_type, related_user_id)
  values (
    v_other_user,
    'رسالة من ' || v_sender_name,
    left(coalesce(new.body, '📎 مرفق'), 100),
    '/chat/dm/' || new.thread_id::text,
    'dm_message',
    new.sender_id
  );
  return new;
end;
$$;

-- New: notify the original author when someone replies directly to their
-- message inside a group chat room — the founder's second requested
-- trigger for the in-app notification banner (the first, DM messages,
-- already existed above).
create or replace function public.fn_notify_chat_reply()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original_sender uuid;
  v_room_slug text;
begin
  if new.reply_to_id is null then
    return new;
  end if;

  select sender_id into v_original_sender
  from public.chat_messages
  where id = new.reply_to_id;

  if v_original_sender is null or v_original_sender = new.sender_id then
    return new;
  end if;

  select slug into v_room_slug from public.chat_rooms where id = new.room_id;

  insert into public.notifications (user_id, title, body, link, notification_type, related_user_id)
  values (
    v_original_sender,
    'رد على رسالتك من ' || coalesce(new.sender_display_name, 'مستخدم'),
    left(coalesce(new.body, '📎 مرفق'), 100),
    '/chat/' || coalesce(v_room_slug, new.room_id::text),
    'chat_reply',
    new.sender_id
  );
  return new;
end;
$$;

drop trigger if exists trg_notify_chat_reply on public.chat_messages;
create trigger trg_notify_chat_reply
after insert on public.chat_messages
for each row execute function public.fn_notify_chat_reply();
