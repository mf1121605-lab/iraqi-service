-- AI private-tutor feature for 3rd-intermediate (الثالث متوسط) students.
-- One session = one subject, chosen up front (never inferred by the model).
-- tutor_messages has NO insert/update/delete policy for `authenticated` at
-- all — every message (both the student's and the assistant's reply) is
-- written exclusively by /api/tutor/send-message using the service-role
-- client, after that route enforces rate limiting and injects the subject
-- context. If students could insert rows directly, they could bypass rate
-- limiting entirely and rack up unlimited paid API usage — the RLS gap
-- this design deliberately closes.
create table public.tutor_chat_sessions (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles (id) on delete cascade,
  subject text not null check (subject in ('arabic', 'english', 'math', 'science', 'social_studies', 'islamic_education')),
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index tutor_chat_sessions_student_idx on public.tutor_chat_sessions (student_id);

create trigger trg_tutor_chat_sessions_updated_at
before update on public.tutor_chat_sessions
for each row execute function public.set_updated_at();

create table public.tutor_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.tutor_chat_sessions (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index tutor_messages_session_idx on public.tutor_messages (session_id, created_at);
create index tutor_messages_student_rate_limit_idx on public.tutor_messages (student_id, role, created_at);

alter table public.tutor_chat_sessions enable row level security;
alter table public.tutor_messages enable row level security;

create policy tutor_chat_sessions_select_own
  on public.tutor_chat_sessions for select
  to authenticated
  using (student_id = auth.uid());

create policy tutor_chat_sessions_insert_own
  on public.tutor_chat_sessions for insert
  to authenticated
  with check (student_id = auth.uid() and public.current_role() = 'customer');

create policy tutor_chat_sessions_update_own
  on public.tutor_chat_sessions for update
  to authenticated
  using (student_id = auth.uid())
  with check (student_id = auth.uid());

create policy tutor_chat_sessions_delete_own
  on public.tutor_chat_sessions for delete
  to authenticated
  using (student_id = auth.uid());

create policy tutor_messages_select_own
  on public.tutor_messages for select
  to authenticated
  using (student_id = auth.uid());
