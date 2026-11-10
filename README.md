# daveo-admin

Area editor `/admin` riusabile per i siti Daveo **React + Vite + Supabase**.
Versione **1.0.0** · estratta da `vini-vidi-virgi@87d9fff` (vedi `CHANGELOG.md`).

Stato: **pilot**. Typecheck, build e lint provati su un progetto vuoto; non ancora provato con un Supabase reale (vedi `docs/SICUREZZA.md`, sezione 7).

## Cosa include

- Login con email e password: password dimenticata, primo accesso con password temporanea, blocco dopo 5 errori, CAPTCHA Turnstile facoltativa, "esci da tutti i dispositivi".
- Ruolo **editor** (tabella `editors`, controllato dalle policy RLS).
- **Raccolte configurabili**: ogni tabella di contenuto si descrive una volta in `admin.config.ts`; elenco con ricerca, filtri e visibile/nascosto; modulo con 11 tipi di campo, slug automatico, editor ricco (Tiptap), anteprima.
- **Immagini**: ridimensionate e compresse nel browser prima del caricamento (1600 px, WebP 0.8, max 2 MB dopo, 15 MB prima), libreria del bucket.
- **Testi delle pagine** modificabili, con il predefinito nel codice.
- **Modalità modifica sul sito**: clic su un testo o un contenuto → cassetto con lo stesso modulo del pannello.
- Migrazioni Supabase: editor, testi, bucket immagini, modello di tabella di contenuto.

## Cosa non include

Domande anonime, archivio e pulizia di fine anno, CSV, avvisi email, merch, album foto e video, categorie, annullamento eventi, espansioni "In arrivo". Elenco e file di origine in `docs/ESTENSIONI.md`.

## Come si usa

Con Claude Code: la skill `.claude/skills/integra-admin-daveo`. A mano: `docs/INTEGRAZIONE.md`.

In breve: si copia `modulo/` in `src/daveo-admin/`, si adatta **solo** `src/admin.config.ts` (da `config/admin.config.esempio.ts`), si collegano rotta e layout, si copiano le migrazioni.

## Cartelle

| Cartella | Contenuto |
|---|---|
| `modulo/` | Il codice, da copiare senza modifiche |
| `config/` | La config di esempio: l'unico file da adattare |
| `supabase/migrations/` | Migrazioni generiche, numerate e commentate |
| `docs/` | `INTEGRAZIONE`, `ARCHITETTURA`, `SICUREZZA`, `ESTENSIONI` |
| `.claude/skills/` | Skill per Claude Code |

Le cartelle `_prova/` (progetto di prova) e `_report/` (rapporti dell'estrazione) non sono nel repo.

## Regole

- `modulo/` non si modifica nei siti: i bug si correggono qui, con una nuova versione nel `CHANGELOG.md`.
- Codice, commenti e testi in italiano.
- Nessun segreto nel repo: solo nomi di variabili.
