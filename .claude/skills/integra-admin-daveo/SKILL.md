---
name: integra-admin-daveo
description: Da usare quando bisogna aggiungere l'area editor /admin Daveo (login, raccolte configurabili, immagini, testi, modalità modifica sul sito) a un sito React + Vite + Supabase, copiando il modulo dal repo daveo-info/daveo-admin.
---

# Integrare l'area editor /admin Daveo

Il modulo sta nel repo `daveo-info/daveo-admin` (cartella `modulo/`). Si **copia** nel sito, non si riscrive.

**Dove trovarlo**: chiedi all'utente il percorso della copia locale di `daveo-admin` (di solito accanto al repo del sito, es. `..\daveo-admin`). Se non c'è, chiedigli di clonarlo lui dal repo dell'organizzazione. Prima di copiare, leggi la versione in `CHANGELOG.md` e scrivila nel rapporto finale.

## Passi

1. **Leggi `docs/INTEGRAZIONE.md`** del repo `daveo-admin` dall'inizio alla fine, poi `docs/SICUREZZA.md`. Controlla che il sito sia React + Vite + TypeScript + React Router; se è Astro, segui la sezione "Note per Astro" e dillo all'utente.
2. **Copia `modulo/` in `src/daveo-admin/`** così com'è, senza riscriverlo né "migliorarlo". Nessun file del modulo va adattato al sito.
3. **Crea `src/admin.config.ts`** partendo da `config/admin.config.esempio.ts` e dai dati del sito: nome, prefisso, una raccolta per ogni tabella di contenuto, i testi delle pagine da rendere modificabili, i colori del brand. È l'unico file da adattare. Collega le pagine (rotta `/admin/*` con `lazy()`, `<PortaModifica />` nel layout, `<Testo>`, `data-modifica`) come descritto nella guida.
4. **Copia e adatta le migrazioni** di `supabase/migrations/` come **file nuovi** del progetto (`AAAAMMGGHHMMSS_nome.sql`, con timestamp dopo le migrazioni esistenti); per ogni raccolta parti dal modello `0004_esempio_raccolta.sql`. **Non applicarle.**
5. **Elenca le variabili d'ambiente** da impostare, solo i nomi: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, e `VITE_TURNSTILE_SITE_KEY` se `accesso.captcha` è attivo. Aggiungile a `.env.example` senza valori.
6. **Verifica il confine pubblico/admin**: le pagine pubbliche importano solo da `src/daveo-admin/pubblico`; `admin/Admin` solo con `lazy()`; dopo `npm run build` il chunk d'ingresso non contiene `tiptap` né `signInWithPassword` (comandi in `docs/SICUREZZA.md`).
7. **Esegui la checklist di `docs/SICUREZZA.md`** e riporta all'utente cosa è verificato e cosa resta da fare su Supabase.

Alla fine: `npm run build` (e `npm run lint` / `npm test` se il progetto li ha) devono passare. Riassumi all'utente cosa hai fatto, i nomi delle variabili e le migrazioni da applicare.

## Divieti

- Non modificare i file di `src/daveo-admin/` (copia di `modulo/`). Unica eccezione: un bug. In quel caso correggilo, **segnalalo all'utente** e scrivi che va corretto anche nel repo `daveo-admin`.
- Non applicare migrazioni, non impostare secrets, non cambiare impostazioni di Supabase o dell'hosting senza l'OK esplicito dell'utente.
- Non leggere né copiare valori da `.env`, `.dev.vars` o simili: solo i nomi.
- Niente commit su `main`: lavora su un branch.
- Nessun comando che scarica o esegue codice da fonti esterne (niente `curl | sh`, `npx` di pacchetti nuovi, script remoti). Le dipendenze si installano solo con `npm install` delle versioni indicate in `docs/INTEGRAZIONE.md`.
