create table if not exists public.clientes (
  id text primary key,
  nome text not null,
  telefone text not null default '',
  perfil jsonb not null default '{}'::jsonb,
  frequencia integer not null default 30,
  novo boolean not null default false,
  observacao text not null default '',
  criado_em timestamptz not null default now()
);

create table if not exists public.agendamentos (
  id text primary key,
  cliente_id text references public.clientes(id) on delete set null,
  servico_id text,
  profissional_id text not null,
  data date not null,
  inicio integer not null,
  duracao integer not null,
  preco numeric(10,2) not null default 0,
  status text not null,
  bloqueio boolean not null default false,
  motivo text,
  criado_em timestamptz not null default now()
);

alter table public.clientes enable row level security;
alter table public.agendamentos enable row level security;

create policy "demo clientes leitura" on public.clientes
  for select to anon using (true);
create policy "demo clientes insercao" on public.clientes
  for insert to anon with check (true);
create policy "demo clientes atualizacao" on public.clientes
  for update to anon using (true) with check (true);

create policy "demo agendamentos leitura" on public.agendamentos
  for select to anon using (true);
create policy "demo agendamentos insercao" on public.agendamentos
  for insert to anon with check (true);
create policy "demo agendamentos atualizacao" on public.agendamentos
  for update to anon using (true) with check (true);
create policy "demo agendamentos exclusao" on public.agendamentos
  for delete to anon using (true);
