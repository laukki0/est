-- Cohort — grupos de estudo (rode depois do schema.sql)
-- Independente do schema_friends.sql/schema_activities.sql, mas combina bem com eles.
-- Cole no SQL Editor do Supabase e dê Run.

-- ============================================================
-- 1. Tabelas
-- ============================================================
create table if not exists public.study_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text default '',
  invite_code text not null unique,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz default now()
);

create table if not exists public.group_members (
  group_id uuid not null references public.study_groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

alter table public.study_groups enable row level security;
alter table public.group_members enable row level security;

-- Inserts/updates de entrada e saída são feitos só via funções abaixo
-- (security definer), por isso não há policy de insert direta nessas tabelas.

create policy "membro vê os grupos em que participa"
  on public.study_groups for select
  using (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = study_groups.id and gm.user_id = auth.uid()
    )
  );

create policy "dono atualiza o próprio grupo"
  on public.study_groups for update
  using (auth.uid() = owner_id);

create policy "dono remove o próprio grupo"
  on public.study_groups for delete
  using (auth.uid() = owner_id);

create policy "membro vê os membros dos grupos em que está"
  on public.group_members for select
  using (
    exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid()
    )
  );

create policy "membro sai do próprio grupo"
  on public.group_members for delete
  using (auth.uid() = user_id);

alter publication supabase_realtime add table public.study_groups;
alter publication supabase_realtime add table public.group_members;

-- ============================================================
-- 2. Gera um código de convite curto e único (6 caracteres, sem
--    O/0/I/1 pra evitar confusão na hora de digitar)
-- ============================================================
create or replace function public.generate_invite_code()
returns text
language plpgsql
as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text;
  already_used boolean;
begin
  loop
    code := '';
    for i in 1..6 loop
      code := code || substr(chars, floor(random() * length(chars) + 1)::int, 1);
    end loop;
    select exists(select 1 from public.study_groups where invite_code = code) into already_used;
    exit when not already_used;
  end loop;
  return code;
end;
$$;

-- ============================================================
-- 3. Cria um grupo e já adiciona o criador como membro/dono
-- ============================================================
create or replace function public.create_group(group_name text, group_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if trim(group_name) = '' then
    raise exception 'o nome do grupo não pode ser vazio';
  end if;

  insert into public.study_groups (name, description, invite_code, owner_id)
  values (trim(group_name), coalesce(group_description, ''), public.generate_invite_code(), auth.uid())
  returning id into new_id;

  insert into public.group_members (group_id, user_id) values (new_id, auth.uid());

  return new_id;
end;
$$;

grant execute on function public.create_group(text, text) to authenticated;

-- ============================================================
-- 4. Entra em um grupo usando o código de convite
-- ============================================================
create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  select id into target_group_id from public.study_groups where invite_code = upper(trim(code));

  if target_group_id is null then
    raise exception 'código de convite inválido';
  end if;

  insert into public.group_members (group_id, user_id)
  values (target_group_id, auth.uid())
  on conflict (group_id, user_id) do nothing;

  return target_group_id;
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;

-- ============================================================
-- 5. Sai de um grupo. Se quem sair for o dono e sobrar gente, a
--    posse passa pro membro mais antigo; se for o último, o
--    grupo é apagado.
-- ============================================================
create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  is_owner boolean;
  next_owner uuid;
begin
  delete from public.group_members
  where group_id = target_group_id and user_id = auth.uid();

  select (owner_id = auth.uid()) into is_owner
  from public.study_groups where id = target_group_id;

  if is_owner then
    select user_id into next_owner from public.group_members
    where group_id = target_group_id
    order by joined_at asc limit 1;

    if next_owner is null then
      delete from public.study_groups where id = target_group_id;
    else
      update public.study_groups set owner_id = next_owner where id = target_group_id;
    end if;
  end if;
end;
$$;

grant execute on function public.leave_group(uuid) to authenticated;

-- ============================================================
-- 6. Lista os grupos do usuário, já com contagem de membros
-- ============================================================
create or replace function public.list_my_groups()
returns table (
  id uuid, name text, description text, invite_code text,
  owner_id uuid, member_count bigint, is_owner boolean
)
language sql
security definer
set search_path = public
as $$
  select
    g.id, g.name, g.description, g.invite_code, g.owner_id,
    (select count(*) from public.group_members gm2 where gm2.group_id = g.id),
    g.owner_id = auth.uid()
  from public.study_groups g
  join public.group_members gm on gm.group_id = g.id and gm.user_id = auth.uid()
  order by g.created_at desc;
$$;

grant execute on function public.list_my_groups() to authenticated;

-- ============================================================
-- 7. Lista os membros de um grupo (só se quem pedir for membro
--    dele), com estatísticas de estudo pra comparar entre si
-- ============================================================
create or replace function public.list_group_members(target_group_id uuid)
returns table (
  user_id uuid, display_name text, photo_url text,
  flashcards_viewed int, questions_answered int, correct_answers int,
  drills_answered int, drills_correct int, is_owner boolean, joined_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  select
    p.id, p.display_name, p.photo_url,
    coalesce(s.flashcards_viewed, 0), coalesce(s.questions_answered, 0),
    coalesce(s.correct_answers, 0), coalesce(s.drills_answered, 0), coalesce(s.drills_correct, 0),
    (g.owner_id = p.id), gm.joined_at
  from public.group_members gm
  join public.profiles p on p.id = gm.user_id
  join public.study_groups g on g.id = gm.group_id
  left join public.study_stats s on s.user_id = p.id
  where gm.group_id = target_group_id
    and exists (
      select 1 from public.group_members me
      where me.group_id = target_group_id and me.user_id = auth.uid()
    )
  order by gm.joined_at asc;
$$;

grant execute on function public.list_group_members(uuid) to authenticated;
