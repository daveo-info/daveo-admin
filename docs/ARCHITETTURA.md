# Architettura del modulo admin Daveo

## Struttura

```
modulo/                         → nel sito: src/daveo-admin/
  tipi.ts                       tipi (Raccolta, DefCampo, VoceTesto, ConfigAdmin) + definisciConfig(). Puro.
  config.ts                     legge ../admin.config.ts: CONFIG, RACCOLTE, raccolta(), testi, EVENTO_AGGIORNA
  env.ts                        VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY, chiave della sessione nel browser
  format.ts                     date nel fuso della config, slugify, datetime-local, linkSicuro. Puro.
  pubblico/                     SOLO questo lo importano le pagine pubbliche
    index.ts                    esportazioni pubbliche
    db.ts                       PostgrestClient leggero, sola lettura, come anonimo
    testi.ts, Testo.tsx         store dei testi + <Testo k> (con data-modifica="testi:<chiave>")
    useDati.ts                  caricamento dati che si aggiorna dopo un salvataggio
    sanitize.ts                 DOMPurify (pulisci)
    media.ts                    immagineCompleta / risolviLink (nome file nel bucket → URL)
    PortaModifica.tsx           carica con lazy() la modalità modifica se c'è una sessione salvata
    ricaricaDopoDeploy.ts       ricarica la pagina se un chunk lazy non esiste più dopo un deploy
  admin/                        area editor /admin (chunk separato)
    Admin.tsx                   guscio: stati di accesso, barra, menu generato dalla config, rotte
    sessione.ts                 useAccesso(), regole password, errori Auth leggibili
    Accesso.tsx                 login, password dimenticata, nuova password
    Account.tsx                 cambio password, esci da tutti i dispositivi
    Panoramica.tsx              home del pannello
    Elenco.tsx                  elenco di una raccolta (ricerca, filtri, visibile/nascosto)
    Modulo.tsx                  modulo generico di una riga (usato anche nel cassetto)
    Campi.tsx                   campi comuni, messaggi, errori Supabase leggibili
    EditorTesto.tsx             editor ricco Tiptap
    immagini.ts                 preparazione e caricamento immagini con i limiti
    ImmaginiAdmin.tsx           libreria immagini del bucket
    TestiAdmin.tsx              testi delle pagine
    modificaSito.ts             on/off della modalità modifica (sessionStorage)
    supabase.ts                 client supabase-js completo (auth PKCE, storage)
    Turnstile.tsx               widget anti-bot del login (facoltativo)
    TitoloAdmin.tsx             titolo della scheda + noindex
    tema.ts                     colori della config → variabili CSS --adm-*
    base.css, admin.css         stili, tutti sotto .adm
  modifica/                     modalità modifica sul sito (chunk separato)
    Modifica.tsx, modifica.css  barra in basso, clic su data-modifica, cassetto con Modulo/ModuloTesto
```

## Confine pubblico / admin

```
pagine pubbliche ──► daveo-admin/pubblico ──► config.ts ──► admin.config.ts (dati + tipi)
       │                     │
       │                     └─ PortaModifica ──lazy()──► modifica/Modifica ──► admin/* + supabase-js + Tiptap
       └─ main.tsx ──lazy()──► admin/Admin ──► admin/* + supabase-js + Tiptap
```

- Il bundle pubblico contiene: `pubblico/`, `config.ts`, `tipi.ts`, `format.ts`, la config del sito, `@supabase/postgrest-js`, DOMPurify.
- I chunk lazy contengono: `admin/`, `modifica/`, `@supabase/supabase-js`, `@tiptap/*`.
- `PortaModifica` scarica la modalità modifica solo se in `localStorage` c'è la chiave di sessione di supabase-js (`sb-<ref>-auth-token`). È solo un risparmio: non dà permessi. `Modifica` poi mostra la barra solo se `useAccesso()` dice `editor`.
- I permessi veri sono **solo** le policy RLS: tutto quello che il client "decide" serve solo a mostrare la schermata giusta.

Per mantenerlo: le pagine pubbliche importano solo da `daveo-admin/pubblico`; `admin/Admin` solo con `lazy()`; `admin.config.ts` importa solo tipi e funzioni pure. Verifica dopo la build in `SICUREZZA.md`.

## Flusso di login

```
/admin
  │
  ├─ useAccesso(): supabase.auth.getSession()
  │     ├─ errore di rete nel rinnovo del token → 3 nuovi tentativi (1s, 3s, 6s) → "Non riesco a rinnovare l'accesso" + Riprova
  │     ├─ nessuna sessione → <Login>
  │     │      ├─ signInWithPassword(email, password [, captchaToken])
  │     │      │     └─ 5 errori di fila → 30 secondi di attesa
  │     │      └─ "Password dimenticata?" → resetPasswordForEmail(redirectTo: /admin)
  │     │            (stesso messaggio che l'email esista o no)
  │     └─ sessione
  │           ├─ evento PASSWORD_RECOVERY → "Scegli una nuova password"
  │           ├─ rpc('sono_editor') (un nuovo tentativo se fallisce la rete)
  │           │     └─ false → "Non autorizzato" + Esci
  │           ├─ user_metadata.cambia_password = true → "Scegli la tua password"
  │           └─ editor → pannello
  │
  └─ pannello: Account → cambio password (updateUser, toglie cambia_password), "Esci da tutti i dispositivi" (signOut global)
```

Client: `flowType: 'pkce'`, sessione persistente, rinnovo automatico. In console finiscono solo codice e stato degli errori Auth, mai token o corpi delle risposte.

## Raccolte e modalità modifica

- Una **raccolta** (in `admin.config.ts`) descrive una tabella: campi, valori iniziali, titolo e sottotitolo nell'elenco, ordine, colonna di visibilità, filtri, anteprima.
- Rotte: `/admin/r/<id>` elenco, `/admin/r/<id>/nuovo`, `/admin/r/<id>/<uuid>`; `/admin/testi[/<chiave>]`; `/admin/immagini`; `/admin/account`.
- Sul sito, un elemento con `data-modifica="<id raccolta>:<uuid>"` o `data-modifica="testi:<chiave>"` (messo da `<Testo>`), con la modalità modifica accesa, al clic apre un cassetto con lo stesso `Modulo` del pannello. Il menu "+ Nuovo" crea righe nuove.
- Dopo un salvataggio parte l'evento `<prefisso>:aggiorna`: `useDati` e lo store dei testi ricaricano in silenzio.
- Testi: il predefinito sta nella config; la tabella `testi` contiene solo quelli cambiati; salvare il testo originale elimina la riga.

## Database

- `public.editors` (chi è editor) + `private.is_editor()` (usata da tutte le policy) + `public.sono_editor()` (RPC per il client).
- `public.testi` (testi cambiati).
- Bucket pubblico `immagini` (2 MB, JPEG/PNG/WebP), scrittura ed elenco solo per gli editor.
- Ogni tabella di contenuto segue il modello `0004_esempio_raccolta.sql`.
