create table if not exists public.requests (
  id uuid not null default gen_random_uuid() primary key,
  user_id uuid not null references public.profiles on delete cascade,
  category_key text not null references public.categories on delete restrict,
  title text not null,
  description text not null,
  status text not null default 'submitted'::text check (status = any(array['submitted'::text, 'in_review'::text, 'needs_changes'::text, 'approved'::text, 'rejected'::text])),
  assigned_to uuid references public.profiles on delete set null,
  payment_required boolean not null default false,
  payment_amount integer,
  payment_status text default 'pending'::text check (payment_status = any(array['pending'::text, 'completed'::text, 'failed'::text])),
  notes text,
  rejection_reason text,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

alter table if exists public.requests enable row level security;

grant select on table public.requests to anon, authenticated;
grant insert on table public.requests to authenticated;
grant update on table public.requests to authenticated;

create policy "Customers can view their own requests" on public.requests
  for select
  using (user_id = auth.uid());

create policy "Employees can view assigned requests" on public.requests
  for select
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employee'
    ) and (assigned_to = auth.uid() or assigned_to is null)
  );

create policy "Founders can view all requests" on public.requests
  for select
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
    )
  );

create policy "Customers can create requests" on public.requests
  for insert
  with check (
    user_id = auth.uid() and
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'customer'
    )
  );

create policy "Employees can update assigned requests" on public.requests
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employee' and p.id = assigned_to
    )
  )
  with check (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'employee' and p.id = assigned_to
    )
  );

create policy "Founders can update any request" on public.requests
  for update
  using (
    exists (
      select 1 from public.profiles p where p.id = auth.uid() and p.role = 'founder'
    )
  );
