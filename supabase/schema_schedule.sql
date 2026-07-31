-- Cohort — cronograma de estudos (agenda semanal recorrente)
-- Rode depois de schema.sql. Independente dos outros schemas, mas usa a
-- função public.is_guest() de schema_guest_readonly.sql se ela já existir
-- (e recria aqui também, de forma idempotente, caso esse arquivo seja
-- rodado antes daquele).

create or replace function public.is_guest()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

create table if not exists public.schedule_blocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6), -- 0 = domingo ... 6 = sábado (igual Date.getDay() do JS)
  subject text not null,
  start_time text not null, -- "HH:MM"
  end_time text not null,   -- "HH:MM"
  color text not null default 'yellow',
  last_done_date date,
  created_at timestamptz default now()
);

create index if not exists schedule_blocks_user_day_idx
  on public.schedule_blocks (user_id, day_of_week, start_time);

alter table public.schedule_blocks enable row level security;

create policy "usuário lê os próprios blocos de estudo"
  on public.schedule_blocks for select
  using (auth.uid() = user_id);

create policy "usuário insere os próprios blocos de estudo"
  on public.schedule_blocks for insert
  with check (auth.uid() = user_id and not public.is_guest());

create policy "usuário atualiza os próprios blocos de estudo"
  on public.schedule_blocks for update
  using (auth.uid() = user_id and not public.is_guest());

create policy "usuário remove os próprios blocos de estudo"
  on public.schedule_blocks for delete
  using (auth.uid() = user_id and not public.is_guest());

alter publication supabase_realtime add table public.schedule_blocks;
