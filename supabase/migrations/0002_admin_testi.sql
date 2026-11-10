-- =============================================================================
-- Modulo admin Daveo · 0002 · Testi delle pagine
-- Origine: vini-vidi-virgi, migrazione 20261104120000_admin_v2 (parte "testi").
-- Richiede: 0001_admin_editor.
--
-- Una riga solo per i testi cambiati dagli editor: se la riga manca, il sito
-- mostra il testo predefinito scritto in admin.config.ts (testi).
-- Per tornare al testo originale basta eliminare la riga.
-- =============================================================================

create table if not exists public.testi (
  chiave text primary key check (chiave ~ '^[a-z0-9_]+(\.[a-z0-9_]+)*$' and char_length(chiave) <= 80),
  valore text not null check (char_length(valore) <= 20000),
  updated_at timestamptz not null default now(),
  -- Chi l'ha cambiato per ultimo: visibile solo agli editor.
  updated_by uuid default auth.uid() references auth.users (id) on delete set null
);

drop trigger if exists testi_updated_at on public.testi;
create trigger testi_updated_at before update on public.testi
  for each row execute function private.set_updated_at();
drop trigger if exists testi_updated_by on public.testi;
create trigger testi_updated_by before insert or update on public.testi
  for each row execute function private.set_updated_by();

-- Privilegi: gli anonimi leggono solo chiave, valore e data (non updated_by).
revoke all on public.testi from anon;
grant select (chiave, valore, updated_at) on public.testi to anon;

alter table public.testi enable row level security;

-- Le policy per gli anonimi non chiamano private.is_editor() (non possono eseguirla):
-- una policy per ruolo.
drop policy if exists "testi: lettura anonimi" on public.testi;
create policy "testi: lettura anonimi" on public.testi
  for select to anon using (true);
drop policy if exists "testi: lettura autenticati" on public.testi;
create policy "testi: lettura autenticati" on public.testi
  for select to authenticated using (true);
drop policy if exists "testi: inserimento editor" on public.testi;
create policy "testi: inserimento editor" on public.testi
  for insert to authenticated with check ((select private.is_editor()));
drop policy if exists "testi: modifica editor" on public.testi;
create policy "testi: modifica editor" on public.testi
  for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
drop policy if exists "testi: eliminazione editor" on public.testi;
create policy "testi: eliminazione editor" on public.testi
  for delete to authenticated using ((select private.is_editor()));

comment on table public.testi is 'Testi delle pagine cambiati dagli editor. Si modificano da /admin → Testi del sito. Elimina una riga per tornare al testo originale.';
comment on column public.testi.chiave is 'Quale testo è, es. home.titolo. Non cambiarla.';
