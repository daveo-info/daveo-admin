# Changelog

## v1.0.1 — 2026-11-10

- Corretto: in `modulo/admin/base.css` i reset (`button`, `input`, titoli) avevano una specificità più alta delle regole di `admin.css`, quindi il testo dei bottoni principali risultava scuro su fondo scuro e alcuni bordi e margini erano sbagliati. Ora i selettori di base usano `:where(.adm)`, con la stessa priorità che avevano in VVV. Trovato aprendo il pannello di prova nel browser.
- Skill: dove trovare la copia locale di `daveo-admin`; README: come rendere la skill disponibile nelle sessioni degli altri siti.

## v1.0.0 — 2026-11-10

Origine: `vini-vidi-virgi@87d9fff3c0736fc521c81272f3086afc42835157` (branch `main`).

Prima estrazione dell'area editor `/admin` del sito di origine in un modulo riusabile.

- Codice NUCLEO copiato da VVV e reso configurabile con `admin.config.ts` (nome del sito, raccolte, testi, limiti delle immagini, password, CAPTCHA, colori).
- Tolte le parti specifiche di VVV (domande anonime, foto e video, categorie, annullamento eventi, merch, espansioni): elenco in `docs/ESTENSIONI.md`.
- Migrazioni generiche `0001`–`0004` (editor, testi, bucket immagini, modello di raccolta).
- Provato: typecheck (`tsc -b`, TypeScript 7.0.2), build (Vite 8.3.5) e lint (oxlint 1.90.0) su un progetto Vite + React vuoto. Non provato con un Supabase reale.

Versioni delle dipendenze provate: react 19.3.1, react-dom 19.3.1, react-router 8.5.1, @supabase/supabase-js 2.118.0, @supabase/postgrest-js 2.118.0, @tiptap/react · starter-kit · extension-image · pm 3.32.1, dompurify 3.4.17.
