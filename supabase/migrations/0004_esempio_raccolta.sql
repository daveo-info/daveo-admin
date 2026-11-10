-- =============================================================================
-- Modulo admin Daveo · 0004 · ESEMPIO di tabella di contenuto ("notizie")
-- Origine: lo schema delle policy di vini-vidi-virgi (20261028220000_schema,
-- 20261101120000_sei_sezioni, 20261103120000_immagini_nome_file), applicato a una
-- tabella "notizie" ridotta ai campi della raccolta di esempio in admin.config.esempio.ts.
-- Richiede: 0001_admin_editor.
--
-- È un MODELLO: copialo per ogni raccolta del sito cambiando nome e colonne,
-- ma tieni sempre le stesse regole:
--   1. RLS attiva;
--   2. anonimi: solo SELECT delle righe visibili (colonna pubblicato), nessuna scrittura;
--   3. autenticati: SELECT delle righe visibili, oppure di tutte se editor;
--   4. INSERT / UPDATE / DELETE solo con (select private.is_editor());
--   5. una policy per ruolo: le policy per "anon" non chiamano private.is_editor();
--   6. check sui formati (slug, link, immagini) anche nel database, non solo nel pannello:
--      gli editor possono scrivere anche dal Table Editor.
-- Se la raccolta non serve, non applicare questo file.
-- =============================================================================

create table if not exists public.notizie (
  id uuid primary key default gen_random_uuid(),
  titolo text not null check (char_length(titolo) between 1 and 200),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  data_pubblicazione timestamptz not null default now(),
  -- Nome del file nel bucket "immagini" (es. gita.webp, notizie/gita.webp) oppure un link https://.
  copertina_url text check (copertina_url is null or copertina_url ~ '^https://' or copertina_url ~ '^[^/\:]+(/[^/\:]+)*\.[A-Za-z0-9]+$'),
  estratto text not null default '',
  -- HTML dell'editor: il sito lo mostra SOLO dopo pulisci() (DOMPurify).
  contenuto text not null default '',
  -- Una riga nuova è visibile subito: per nasconderla si toglie la spunta.
  pubblicato boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists notizie_data_idx on public.notizie (data_pubblicazione desc);

drop trigger if exists notizie_updated_at on public.notizie;
create trigger notizie_updated_at before update on public.notizie
  for each row execute function private.set_updated_at();

-- Doppia difesa oltre alle policy: gli anonimi possono solo leggere.
revoke all on public.notizie from anon;
grant select on public.notizie to anon;

alter table public.notizie enable row level security;

drop policy if exists "notizie: lettura anonimi" on public.notizie;
create policy "notizie: lettura anonimi" on public.notizie
  for select to anon using (pubblicato);
drop policy if exists "notizie: lettura autenticati" on public.notizie;
create policy "notizie: lettura autenticati" on public.notizie
  for select to authenticated using (pubblicato or (select private.is_editor()));
drop policy if exists "notizie: inserimento editor" on public.notizie;
create policy "notizie: inserimento editor" on public.notizie
  for insert to authenticated with check ((select private.is_editor()));
drop policy if exists "notizie: modifica editor" on public.notizie;
create policy "notizie: modifica editor" on public.notizie
  for update to authenticated
  using ((select private.is_editor())) with check ((select private.is_editor()));
drop policy if exists "notizie: eliminazione editor" on public.notizie;
create policy "notizie: eliminazione editor" on public.notizie
  for delete to authenticated using ((select private.is_editor()));

comment on table public.notizie is 'Esempio di raccolta del modulo admin. Una riga nuova è visibile subito: per nasconderla togli la spunta a pubblicato.';
comment on column public.notizie.copertina_url is 'Facoltativa: nome del file caricato nel bucket immagini (es. gita.webp) oppure un link https://';
