-- =============================================================================
-- Modulo admin Daveo · 0001 · Editor e funzioni di base
-- Origine: vini-vidi-virgi, migrazioni 20261028220000_schema, 20261101120000_sei_sezioni
-- (sono_editor), 20261101130000_editors_in_public, 20261104120000_admin_v2 (set_updated_by).
-- Qui scritte nella forma finale, senza i passaggi intermedi.
--
-- Quando la copi in un progetto: rinominala con il timestamp del momento
-- (AAAAMMGGHHMMSS_admin_editor.sql), DOPO le migrazioni già esistenti.
-- Non applicarla senza l'OK di chi gestisce il progetto Supabase.
-- =============================================================================

-- Schema privato: non esposto dall'API REST. Ci stanno le funzioni usate dalle policy.
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated;

-- -----------------------------------------------------------------------------
-- Editor: chi può entrare in /admin e scrivere i contenuti.
-- -----------------------------------------------------------------------------
create table if not exists public.editors (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

comment on table public.editors is 'Chi può entrare in /admin. Per aggiungere qualcuno: invitalo da Authentication → Users, copia il suo UID e incollalo qui in user_id.';

-- Doppia difesa oltre a RLS: gli anonimi non vedono niente, gli utenti loggati
-- possono solo leggere la propria riga, nessun client può scrivere.
-- Gli editor si aggiungono dal Table Editor (o dal SQL Editor).
revoke all on public.editors from anon, authenticated;
grant select on public.editors to authenticated;

alter table public.editors enable row level security;

drop policy if exists "editors: lettura propria riga" on public.editors;
create policy "editors: lettura propria riga" on public.editors
  for select to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- private.is_editor(): la usano TUTTE le policy di scrittura.
-- security definer: legge editors anche se la policy mostra solo la propria riga.
-- -----------------------------------------------------------------------------
create or replace function private.is_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.editors e where e.user_id = (select auth.uid())
  );
$$;

revoke all on function private.is_editor() from public, anon;
grant execute on function private.is_editor() to authenticated;

-- -----------------------------------------------------------------------------
-- public.sono_editor(): l'area editor chiede "sono un editor?" con questa RPC.
-- Serve solo a mostrare la schermata giusta: i permessi veri sono le policy.
-- -----------------------------------------------------------------------------
create or replace function public.sono_editor()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_editor();
$$;

revoke all on function public.sono_editor() from public, anon;
grant execute on function public.sono_editor() to authenticated;

-- -----------------------------------------------------------------------------
-- Trigger di servizio per le tabelle di contenuto.
-- -----------------------------------------------------------------------------
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function private.set_updated_at() from public, anon, authenticated;

-- updated_by lo decide il database, non il client.
create or replace function private.set_updated_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_by = auth.uid();
  return new;
end;
$$;

revoke all on function private.set_updated_by() from public, anon, authenticated;
