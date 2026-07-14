create function public.log_request_status_change() returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into public.notifications (user_id, title, body, link)
    values (
      new.user_id,
      'Request Status Updated',
      'Your request status has changed to: ' || new.status,
      '/customer/dashboard/request/' || new.id
    );
  end if;
  return new;
end;
$$ language plpgsql security definer;

if not exists (
  select 1 from information_schema.triggers where trigger_name = 'on_request_status_change'
) then
  create trigger on_request_status_change
  after update on public.requests
  for each row execute procedure public.log_request_status_change();
end if;
