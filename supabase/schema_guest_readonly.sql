-- Cohort — modo visitante (somente leitura)
-- Rode depois de schema.sql, schema_friends.sql, schema_activities.sql e
-- schema_groups.sql já aplicados.
--
-- IMPORTANTE: isso é a barreira de segurança de verdade. Esconder/desabilitar
-- botões no frontend é só experiência de uso - alguém pode chamar a API do
-- Supabase direto pelo DevTools, então o bloqueio real tem que estar aqui,
-- nas policies e nas funções do banco.
--
-- O Supabase marca usuários que entraram com signInAnonymously() com a claim
-- "is_anonymous": true no JWT. É essa claim que usamos pra distinguir
-- visitante de conta de verdade.

create or replace function public.is_guest()
returns boolean
language sql
stable
as $$
  select coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false);
$$;

-- ============================================================
-- profiles (schema.sql) — bloqueia editar nome/foto/tema/idioma
-- ============================================================
drop policy if exists "usuário atualiza o próprio perfil" on public.profiles;
create policy "usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id and not public.is_guest());

-- ============================================================
-- study_stats (schema.sql) — bloqueia salvar progresso de
-- flashcards/quiz/tabuada (as funções increment_flashcard_viewed,
-- record_quiz_answer e record_drill_answer rodam como o próprio
-- usuário, então essas policies já cobrem elas também)
-- ============================================================
drop policy if exists "usuário atualiza as próprias estatísticas" on public.study_stats;
create policy "usuário atualiza as próprias estatísticas"
  on public.study_stats for update
  using (auth.uid() = user_id and not public.is_guest());

drop policy if exists "usuário insere as próprias estatísticas" on public.study_stats;
create policy "usuário insere as próprias estatísticas"
  on public.study_stats for insert
  with check (auth.uid() = user_id and not public.is_guest());

-- ============================================================
-- study_sessions (schema.sql) — bloqueia salvar sessão do timer
-- ============================================================
drop policy if exists "usuário insere as próprias sessões" on public.study_sessions;
create policy "usuário insere as próprias sessões"
  on public.study_sessions for insert
  with check (auth.uid() = user_id and not public.is_guest());

-- ============================================================
-- friendships (schema_friends.sql) — bloqueia pedir, aceitar e
-- remover amizade. send_friend_request também ganha uma checagem
-- explícita abaixo, já que ela mesma decide se faz update/insert.
-- ============================================================
drop policy if exists "usuário cria solicitação como remetente" on public.friendships;
create policy "usuário cria solicitação como remetente"
  on public.friendships for insert
  with check (auth.uid() = requester_id and requester_id <> addressee_id and not public.is_guest());

drop policy if exists "destinatário aceita a solicitação" on public.friendships;
create policy "destinatário aceita a solicitação"
  on public.friendships for update
  using (auth.uid() = addressee_id and not public.is_guest());

drop policy if exists "qualquer um dos dois remove a amizade/solicitação" on public.friendships;
create policy "qualquer um dos dois remove a amizade/solicitação"
  on public.friendships for delete
  using ((auth.uid() = requester_id or auth.uid() = addressee_id) and not public.is_guest());

create or replace function public.send_friend_request(target_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  existing record;
begin
  if public.is_guest() then
    raise exception 'ação não disponível no modo visitante';
  end if;

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
-- activities (schema_activities.sql) — bloqueia gravar eventos
-- no feed (logActivity)
-- ============================================================
drop policy if exists "usuário insere as próprias atividades" on public.activities;
create policy "usuário insere as próprias atividades"
  on public.activities for insert
  with check (auth.uid() = user_id and not public.is_guest());

-- ============================================================
-- study_groups / group_members (schema_groups.sql) — as funções
-- de criar/entrar/sair de grupo são security definer (bypassam
-- RLS de propósito), então a checagem tem que ir dentro delas
-- ============================================================
drop policy if exists "membro sai do próprio grupo" on public.group_members;
create policy "membro sai do próprio grupo"
  on public.group_members for delete
  using (auth.uid() = user_id and not public.is_guest());

drop policy if exists "dono atualiza o próprio grupo" on public.study_groups;
create policy "dono atualiza o próprio grupo"
  on public.study_groups for update
  using (auth.uid() = owner_id and not public.is_guest());

drop policy if exists "dono remove o próprio grupo" on public.study_groups;
create policy "dono remove o próprio grupo"
  on public.study_groups for delete
  using (auth.uid() = owner_id and not public.is_guest());

create or replace function public.create_group(group_name text, group_description text default '')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if public.is_guest() then
    raise exception 'ação não disponível no modo visitante';
  end if;

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

create or replace function public.join_group_by_code(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group_id uuid;
begin
  if public.is_guest() then
    raise exception 'ação não disponível no modo visitante';
  end if;

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

create or replace function public.leave_group(target_group_id uuid)
returns void
language plpgsql
security invoker
as $$
declare
  is_owner boolean;
  next_owner uuid;
begin
  if public.is_guest() then
    raise exception 'ação não disponível no modo visitante';
  end if;

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
-- Storage: avatares (schema.sql) — bloqueia trocar foto de perfil
-- ============================================================
drop policy if exists "usuário envia o próprio avatar" on storage.objects;
create policy "usuário envia o próprio avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_guest()
  );

drop policy if exists "usuário atualiza o próprio avatar" on storage.objects;
create policy "usuário atualiza o próprio avatar"
  on storage.objects for update
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and not public.is_guest()
  );
