-- Cohort — sistema de amigos (rode depois do schema.sql)
-- Cole no SQL Editor do Supabase e dê Run.

-- ============================================================
-- 1. Tabela de amizades
-- ============================================================
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "usuário vê as próprias solicitações"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "usuário cria solicitação como remetente"
  on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id);

create policy "destinatário aceita a solicitação"
  on public.friendships for update
  using (auth.uid() = addressee_id);

create policy "qualquer um dos dois remove a amizade/solicitação"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

alter publication supabase_realtime add table public.friendships;

-- ============================================================
-- 2. Enviar solicitação (se o outro já pediu antes, vira aceite
--    mútuo automaticamente em vez de duplicar a linha)
-- ============================================================
create or replace function public.send_friend_request(target_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  existing record;
begin
  if target_id = auth.uid() then
    raise exception 'não é possível se adicionar como amigo';
  end if;

  select * into existing from public.friendships
  where (requester_id = auth.uid() and addressee_id = target_id)
     or (requester_id = target_id and addressee_id = auth.uid())
  limit 1;

  if existing.id is not null then
    if existing.status = 'pending' and existing.addressee_id = auth.uid() then
      update public.friendships set status = 'accepted' where id = existing.id;
    end if;
    return;
  end if;

  insert into public.friendships (requester_id, addressee_id) values (auth.uid(), target_id);
end;
$$;

grant execute on function public.send_friend_request(uuid) to authenticated;

-- ============================================================
-- 3. Busca de usuários por e-mail (só campos públicos, nunca
--    expõe a tabela profiles inteira - a RLS dela continua
--    restrita a "cada um vê só o próprio perfil")
-- ============================================================
create or replace function public.search_users_by_email(search_query text)
returns table (id uuid, display_name text, photo_url text, email text)
language sql
security definer
set search_path = public
as $$
  select p.id, p.display_name, p.photo_url, p.email
  from public.profiles p
  where p.email ilike '%' || search_query || '%'
    and p.id <> auth.uid()
  limit 10;
$$;

grant execute on function public.search_users_by_email(text) to authenticated;

-- ============================================================
-- 4. Listas com dados já unidos (profile + stats), pra não
--    precisar de N chamadas separadas no cliente
-- ============================================================
create or replace function public.list_friends()
returns table (
  friendship_id uuid,
  friend_id uuid,
  display_name text,
  photo_url text,
  flashcards_viewed int,
  questions_answered int,
  correct_answers int,
  drills_answered int,
  drills_correct int
)
language sql
security definer
set search_path = public
as $$
  select
    f.id,
    case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end as friend_id,
    p.display_name, p.photo_url,
    coalesce(s.flashcards_viewed, 0), coalesce(s.questions_answered, 0),
    coalesce(s.correct_answers, 0), coalesce(s.drills_answered, 0), coalesce(s.drills_correct, 0)
  from public.friendships f
  join public.profiles p
    on p.id = (case when f.requester_id = auth.uid() then f.addressee_id else f.requester_id end)
  left join public.study_stats s on s.user_id = p.id
  where f.status = 'accepted'
    and (f.requester_id = auth.uid() or f.addressee_id = auth.uid());
$$;

grant execute on function public.list_friends() to authenticated;

create or replace function public.list_pending_received()
returns table (friendship_id uuid, requester_id uuid, display_name text, photo_url text)
language sql
security definer
set search_path = public
as $$
  select f.id, f.requester_id, p.display_name, p.photo_url
  from public.friendships f
  join public.profiles p on p.id = f.requester_id
  where f.addressee_id = auth.uid() and f.status = 'pending';
$$;

grant execute on function public.list_pending_received() to authenticated;

create or replace function public.list_pending_sent()
returns table (friendship_id uuid, addressee_id uuid, display_name text, photo_url text)
language sql
security definer
set search_path = public
as $$
  select f.id, f.addressee_id, p.display_name, p.photo_url
  from public.friendships f
  join public.profiles p on p.id = f.addressee_id
  where f.requester_id = auth.uid() and f.status = 'pending';
$$;

grant execute on function public.list_pending_sent() to authenticated;
