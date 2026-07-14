create function public.on_request_message_insert() returns trigger as $$
begin
  if new.is_hidden = false then
    insert into public.notifications (user_id, title, body, link)
    select distinct u.id, 'New Request Message', (select substring(content, 1, 50) from public.request_messages where id = new.id), '/customer/dashboard/request/' || new.request_id
    from (
      select r.user_id as id from public.requests r where r.id = new.request_id and r.user_id != new.sender_id
      union
      select r.assigned_to as id from public.requests r where r.id = new.request_id and r.assigned_to != new.sender_id and r.assigned_to is not null
    ) u;
  end if;
  return new;
end;
$$ language plpgsql security definer;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'notify_on_request_message'
) then
  create trigger notify_on_request_message
  after insert on public.request_messages
  for each row execute procedure public.on_request_message_insert();
end if;
