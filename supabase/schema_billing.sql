-- Cohort — assinatura Premium (Stripe) e limite diário de IA pro plano
-- gratuito. Rode depois de schema.sql.
--
-- Como funciona:
-- - `subscriptions` guarda o status da assinatura de cada usuário. Só é
--   escrita pelo webhook do Stripe (api/stripeWebhook.js), que usa a
--   service role key e por isso não passa pelas policies de RLS abaixo -
--   por isso não existem policies de insert/update aqui pro client.
-- - `ai_usage_daily` conta quantas gerações de IA (chat, resumo,
--   flashcards, quiz, feynman, repertório - tudo que passa por
--   api/chatWithAI.js) cada usuário fez em cada dia.
-- - `consume_ai_quota()` é chamada pelo servidor (com o token do próprio
--   usuário) antes de cada chamada de IA: usuário Premium sempre passa;
--   usuário grátis é bloqueado ao atingir o limite diário.

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text not null default 'inactive', -- active, trialing, past_due, canceled, inactive
  plan text default 'premium_monthly',
  current_period_end timestamptz,
  updated_at timestamptz default now()
);

alter table public.subscriptions enable row level security;

create policy "usuário lê a própria assinatura"
  on public.subscriptions for select
  using (auth.uid() = user_id);

create table if not exists public.ai_usage_daily (
  user_id uuid not null references auth.users(id) on delete cascade,
  usage_date date not null default current_date,
  count int not null default 0,
  primary key (user_id, usage_date)
);

alter table public.ai_usage_daily enable row level security;

create policy "usuário lê o próprio uso de IA"
  on public.ai_usage_daily for select
  using (auth.uid() = user_id);

-- ============================================================
-- Confere se o usuário logado tem assinatura Premium ativa
-- ============================================================
create or replace function public.is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions
    where user_id = auth.uid()
      and status in ('active', 'trialing')
      and (current_period_end is null or current_period_end > now())
  );
$$;

grant execute on function public.is_premium() to authenticated;

-- ============================================================
-- Consulta o status de uso/assinatura sem consumir a cota - pra
-- mostrar na tela (ex.: "12/15 gerações usadas hoje")
-- ============================================================
create or replace function public.get_billing_status()
returns table (is_premium boolean, plan text, current_period_end timestamptz, usage_today int, daily_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  premium boolean := public.is_premium();
  sub record;
  used int;
begin
  select s.plan, s.current_period_end into sub from public.subscriptions s where s.user_id = auth.uid();
  select coalesce(u.count, 0) into used from public.ai_usage_daily u
  where u.user_id = auth.uid() and u.usage_date = current_date;

  return query select premium, sub.plan, sub.current_period_end, coalesce(used, 0), 15;
end;
$$;

grant execute on function public.get_billing_status() to authenticated;

-- ============================================================
-- Consome uma unidade da cota diária de IA (só quando não é
-- Premium). Retorna se a chamada pode prosseguir.
-- ============================================================
create or replace function public.consume_ai_quota()
returns table (allowed boolean, remaining int, is_premium boolean, daily_limit int)
language plpgsql
security definer
set search_path = public
as $$
declare
  premium boolean := public.is_premium();
  today date := current_date;
  current_count int;
  limit_per_day int := 15;
begin
  if premium then
    return query select true, null::int, true, limit_per_day;
    return;
  end if;

  insert into public.ai_usage_daily (user_id, usage_date, count)
  values (auth.uid(), today, 0)
  on conflict (user_id, usage_date) do nothing;

  select count into current_count from public.ai_usage_daily
  where user_id = auth.uid() and usage_date = today;

  if current_count >= limit_per_day then
    return query select false, 0, false, limit_per_day;
    return;
  end if;

  update public.ai_usage_daily set count = count + 1
  where user_id = auth.uid() and usage_date = today;

  return query select true, (limit_per_day - current_count - 1), false, limit_per_day;
end;
$$;

grant execute on function public.consume_ai_quota() to authenticated;
