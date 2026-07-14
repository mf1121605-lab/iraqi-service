create function public.on_chat_message_insert() returns trigger as $$
begin
  if new.is_hidden = false then
    insert into public.notifications (user_id, title, body, link)
    select
      p.id,
      'New Chat Message',
      (select substring(content, 1, 50) from public.chat_messages where id = new.id),
      '/chat'  
    from public.profiles p
    where p.role = 'employee' or p.role = 'founder'
    and p.id != new.sender_id
    limit 1;
  end if;
  return new;
end;
$$ language plpgsql security definer;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'notify_on_chat_message'
) then
  create trigger notify_on_chat_message
  after insert on public.chat_messages
  for each row execute procedure public.on_chat_message_insert();
end if;
