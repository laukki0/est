-- Cohort — preview público de convite de grupo (pro link de convite
-- funcionar mesmo pra quem ainda não tem conta / não está logado)
-- Rode depois de schema_groups.sql.

create or replace function public.get_group_preview_by_code(code text)
returns table (name text, description text, member_count bigint)
language sql
security definer
set search_path = public
as $$
  select g.name, g.description,
    (select count(*) from public.group_members gm where gm.group_id = g.id)
  from public.study_groups g
  where g.invite_code = upper(trim(code));
$$;

-- Diferente das outras funções do app, essa precisa ser chamada também
-- por quem ainda não tem sessão (role "anon" do Postgres/Supabase) -
-- é só um preview público de nome/descrição/nº de membros, nada sensível.
grant execute on function public.get_group_preview_by_code(text) to authenticated, anon;
