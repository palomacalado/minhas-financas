-- Minhas Finanças V2
-- Execute este arquivo no SQL Editor do Supabase.

create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  kind text not null default 'checking' check (kind in ('checking','cash','va','vr','savings')),
  opening_balance numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  type text not null check (type in ('receita','despesa','diario','cartao','economia')),
  category text,
  description text,
  amount numeric(14,2) not null check (amount >= 0),
  transaction_date date not null,
  recurring boolean not null default false,
  recurrence_type text check (recurrence_type is null or recurrence_type in ('mensal','semanal')),
  recurrence_end date,
  installment_group uuid,
  installment_number integer,
  installment_total integer,
  created_at timestamptz not null default now()
);

create table if not exists public.savings_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  target_amount numeric(14,2) not null default 0,
  current_amount numeric(14,2) not null default 0,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.transactions enable row level security;
alter table public.savings_goals enable row level security;

create policy "profiles_own_rows" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "accounts_own_rows" on public.accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "transactions_own_rows" on public.transactions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "savings_goals_own_rows" on public.savings_goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
