-- Integra-Tracker: esquema da base de dados Supabase.
-- Executar uma vez no SQL Editor do projeto Supabase.
-- Cada linha pertence a um utilizador (user_id) e as políticas RLS garantem
-- que cada pessoa só vê e altera os seus próprios dados.

create table if not exists public.plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  template jsonb not null,
  start_date date not null,
  schedule jsonb not null default '[]'::jsonb,
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.block_logs (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week integer not null check (week >= 1),
  block_key text not null,
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  hours numeric(5, 2) not null default 0 check (hours >= 0),
  notes text not null default '',
  principles jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  primary key (plan_id, week, block_key)
);

create table if not exists public.deliverables (
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  week integer not null check (week >= 1),
  status text not null default 'todo' check (status in ('todo', 'doing', 'done')),
  link text not null default '',
  delivered_on date,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  primary key (plan_id, week)
);

create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null references public.plans (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  moment_key text not null,
  assessed_on date not null,
  scores jsonb not null,
  notes text not null default '',
  created_at timestamptz not null default now()
);

-- Os projetos Supabase recentes não dão acesso automático da API às tabelas novas.
-- Só o papel "authenticated" (utilizador com sessão iniciada) recebe acesso;
-- as políticas RLS abaixo limitam esse acesso às linhas do próprio utilizador.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.plans, public.block_logs, public.deliverables, public.assessments to authenticated;
revoke all on public.plans, public.block_logs, public.deliverables, public.assessments from anon;

create index if not exists plans_user_idx on public.plans (user_id, archived);
create index if not exists assessments_plan_idx on public.assessments (plan_id);

alter table public.plans enable row level security;
alter table public.block_logs enable row level security;
alter table public.deliverables enable row level security;
alter table public.assessments enable row level security;

-- Uma política por tabela: o próprio utilizador pode ler e escrever as suas linhas.
-- Nos registos, exige-se também que o plano pertença ao utilizador.
drop policy if exists "own plans" on public.plans;
create policy "own plans" on public.plans
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "own block logs" on public.block_logs;
create policy "own block logs" on public.block_logs
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
  );

drop policy if exists "own deliverables" on public.deliverables;
create policy "own deliverables" on public.deliverables
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
  );

drop policy if exists "own assessments" on public.assessments;
create policy "own assessments" on public.assessments
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.plans p where p.id = plan_id and p.user_id = auth.uid())
  );
