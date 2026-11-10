-- =============================================================================
-- Modulo admin Daveo · 0003 · Bucket "immagini"
-- Origine: vini-vidi-virgi, migrazioni 20261028220000_schema (bucket e policy) e
-- 20261108120000_limiti_piano_free (2 MB, solo JPEG/PNG/WebP).
-- Richiede: 0001_admin_editor.
--
-- Bucket PUBBLICO: chiunque conosca l'indirizzo di un file lo può aprire.
-- Elencare, caricare, modificare ed eliminare file spetta solo agli editor.
-- Il pannello comprime già tutto sotto il limite: qui lo si impone anche a chi
-- chiama le API di Storage direttamente.
--
-- Se cambi il limite, cambia anche immagini.maxByte in admin.config.ts.
-- Il nome del bucket deve essere uguale a immagini.bucket della config.
-- Non incluso (estensione Foto di VVV): il tetto al numero di foto (private.limite_foto).
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('immagini', 'immagini', true, 2097152,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "immagini: elenco editor" on storage.objects;
create policy "immagini: elenco editor" on storage.objects
  for select to authenticated
  using (bucket_id = 'immagini' and (select private.is_editor()));

drop policy if exists "immagini: caricamento editor" on storage.objects;
create policy "immagini: caricamento editor" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'immagini' and (select private.is_editor()));

drop policy if exists "immagini: modifica editor" on storage.objects;
create policy "immagini: modifica editor" on storage.objects
  for update to authenticated
  using (bucket_id = 'immagini' and (select private.is_editor()))
  with check (bucket_id = 'immagini' and (select private.is_editor()));

drop policy if exists "immagini: eliminazione editor" on storage.objects;
create policy "immagini: eliminazione editor" on storage.objects
  for delete to authenticated
  using (bucket_id = 'immagini' and (select private.is_editor()));
