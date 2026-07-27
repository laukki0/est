-- Estuda+ — feed de atividades (rode depois de schema.sql e
-- schema_friends.sql)
-- Cole no SQL Editor do Supabase e dê Run.

create table if not exists public.activities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  type text not null check (type in ('quiz_completed', 'drill_completed', 'study_session', 'friend_added')),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz default now()
);

create index if not exists activities_created_idx on public.activities (created_at desc);

alter table public.activities enable row level security;

create policy "usuário vê as próprias atividades"
  on public.activities for select
  using (auth.uid() = user_id);

create policy "usuário insere as próprias atividades"
  on public.activities for insert
  with check (auth.uid() = user_id);

alter publication supabase_realtime add table public.activities;

-- Feed = próprias atividades + as dos amigos aceitos, já com nome/foto
-- juntados (security definer só pra isso - a checagem de amizade dentro
-- da função é a autorização real, não uma RLS ampla).
create or replace function public.get_activity_feed(limit_count int default 30)
returns table (
  id uuid,
  user_id uuid,
  display_name text,
  photo_url text,
  type text,
  payload jsonb,
  created_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select a.id, a.user_id, p.display_name, p.photo_url, a.type, a.payload, a.created_at
  from public.activities a
  join public.profiles p on p.id = a.user_id
  where a.user_id = auth.uid()
     or exists (
       select 1 from public.friendships f
       where f.status = 'accepted'
         and ((f.requester_id = auth.uid() and f.addressee_id = a.user_id)
           or (f.addressee_id = auth.uid() and f.requester_id = a.user_id))
     )
  order by a.created_at desc
  limit limit_count;
$$;

grant execute on function public.get_activity_feed(int) to authenticated;
