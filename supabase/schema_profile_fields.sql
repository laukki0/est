-- Cohort — país, estado e área de foco no perfil
-- Rode isso se o seu banco já tinha o schema.sql aplicado antes dessas
-- colunas existirem (se você está criando o banco do zero agora, o
-- schema.sql já vem com elas e este arquivo não é necessário).

alter table public.profiles add column if not exists country text default '';
alter table public.profiles add column if not exists state text default '';
alter table public.profiles add column if not exists focus_area text default '';
