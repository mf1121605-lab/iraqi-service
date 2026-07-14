create index idx_requests_user_id on public.requests(user_id);
create index idx_requests_category_key on public.requests(category_key);
create index idx_requests_assigned_to on public.requests(assigned_to);
create index idx_requests_status on public.requests(status);
create index idx_requests_created_at on public.requests(created_at);

create index idx_request_messages_request_id on public.request_messages(request_id);
create index idx_request_messages_sender_id on public.request_messages(sender_id);
create index idx_request_messages_created_at on public.request_messages(created_at);

create index idx_chat_messages_room_id on public.chat_messages(room_id);
create index idx_chat_messages_sender_id on public.chat_messages(sender_id);
create index idx_chat_messages_created_at on public.chat_messages(created_at);

create index idx_notifications_user_id on public.notifications(user_id);
create index idx_notifications_created_at on public.notifications(created_at);
create index idx_notifications_is_read on public.notifications(is_read);

create index idx_push_subscriptions_user_id on public.push_subscriptions(user_id);

create index idx_audit_log_actor_id on public.audit_log(actor_id);
create index idx_audit_log_created_at on public.audit_log(created_at);
create index idx_audit_log_table_name on public.audit_log(table_name);
