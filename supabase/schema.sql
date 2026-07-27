-- Estuda+ — schema do Supabase
-- Rode este arquivo inteiro no SQL Editor do seu projeto Supabase
-- (Dashboard → SQL Editor → New query → cole tudo → Run).

-- ============================================================
-- 1. Tabela de perfil (substitui users/{uid} + settings/prefs
--    do Firestore - aqui é tudo numa tabela só, sem precisar de
--    subcoleção separada)
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text default '',
  email text default '',
  photo_url text default '',
  theme text not null default 'dark',
  language text not null default 'pt',
  last_login timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "usuário lê o próprio perfil"
  on public.profiles for select
  using (auth.uid() = id);

create policy "usuário atualiza o próprio perfil"
  on public.profiles for update
  using (auth.uid() = id);

create policy "usuário insere o próprio perfil"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================================
-- 2. Tabela de estatísticas (substitui users/{uid}/stats/summary)
-- ============================================================
create table if not exists public.study_stats (
  user_id uuid primary key references auth.users(id) on delete cascade,
  flashcards_viewed int not null default 0,
  questions_answered int not null default 0,
  correct_answers int not null default 0,
  drills_answered int not null default 0,
  drills_correct int not null default 0,
  updated_at timestamptz default now()
);

alter table public.study_stats enable row level security;

create policy "usuário lê as próprias estatísticas"
  on public.study_stats for select
  using (auth.uid() = user_id);

create policy "usuário atualiza as próprias estatísticas"
  on public.study_stats for update
  using (auth.uid() = user_id);

create policy "usuário insere as próprias estatísticas"
  on public.study_stats for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 3. Tabela de sessões de estudo (substitui
--    users/{uid}/studySessions/{id})
-- ============================================================
create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  materia text not null,
  segundos int not null,
  started_at timestamptz not null,
  created_at timestamptz default now()
);

create index if not exists study_sessions_user_started_idx
  on public.study_sessions (user_id, started_at);

alter table public.study_sessions enable row level security;

create policy "usuário lê as próprias sessões"
  on public.study_sessions for select
  using (auth.uid() = user_id);

create policy "usuário insere as próprias sessões"
  on public.study_sessions for insert
  with check (auth.uid() = user_id);

-- ============================================================
-- 4. Trigger: cria a linha de perfil e de estatísticas
--    automaticamente no primeiro login (equivalente ao
--    setDoc(..., {merge:true}) que o app fazia manualmente
--    no Firestore)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name, email, photo_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture', '')
  )
  on conflict (id) do nothing;

  insert into public.study_stats (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$ language plpgsql security definer set search_path = public;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- 5. Funções de incremento atômico (equivalente ao
--    increment() do Firestore - evita race condition entre
--    múltiplas respostas rápidas)
-- ============================================================
create or replace function public.increment_flashcard_viewed()
returns void as $$
begin
  insert into public.study_stats (user_id, flashcards_viewed)
  values (auth.uid(), 1)
  on conflict (user_id)
  do update set flashcards_viewed = study_stats.flashcards_viewed + 1, updated_at = now();
end;
$$ language plpgsql security invoker;

create or replace function public.record_quiz_answer(is_correct boolean)
returns void as $$
begin
  insert into public.study_stats (user_id, questions_answered, correct_answers)
  values (auth.uid(), 1, case when is_correct then 1 else 0 end)
  on conflict (user_id)
  do update set
    questions_answered = study_stats.questions_answered + 1,
    correct_answers = study_stats.correct_answers + case when is_correct then 1 else 0 end,
    updated_at = now();
end;
$$ language plpgsql security invoker;

create or replace function public.record_drill_answer(is_correct boolean)
returns void as $$
begin
  insert into public.study_stats (user_id, drills_answered, drills_correct)
  values (auth.uid(), 1, case when is_correct then 1 else 0 end)
  on conflict (user_id)
  do update set
    drills_answered = study_stats.drills_answered + 1,
    drills_correct = study_stats.drills_correct + case when is_correct then 1 else 0 end,
    updated_at = now();
end;
$$ language plpgsql security invoker;

grant execute on function public.increment_flashcard_viewed() to authenticated;
grant execute on function public.record_quiz_answer(boolean) to authenticated;
grant execute on function public.record_drill_answer(boolean) to authenticated;

-- ============================================================
-- 6. Realtime: liga as tabelas que o app assina em tempo real
--    (equivalente ao onSnapshot do Firestore)
-- ============================================================
alter publication supabase_realtime add table public.profiles;
alter publication supabase_realtime add table public.study_stats;
alter publication supabase_realtime add table public.study_sessions;

-- ============================================================
-- 7. Storage: bucket de avatares + políticas
--    (equivalente ao storage.rules do Firebase)
--    Rode isto também - cria o bucket se ainda não existir.
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

create policy "avatares são publicamente legíveis"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "usuário envia o próprio avatar"
  on storage.objects for insert
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "usuário atualiza o próprio avatar"
  on storage.objects for update
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
