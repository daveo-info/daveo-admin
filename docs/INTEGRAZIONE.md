# Integrazione del modulo admin Daveo

Per siti **React + Vite + TypeScript + React Router + Supabase**. In fondo, le note per Astro.

Tempo: circa un'ora, più la parte Supabase (che fa chi gestisce il progetto).

## 0. Requisiti

- React 19, React Router 8 (`createBrowserRouter` o `BrowserRouter`), Vite, TypeScript con `"types": ["vite/client"]`.
- Un progetto Supabase (URL e chiave publishable).
- Versioni provate (da `vini-vidi-virgi`, vedi `CHANGELOG.md`):

```bash
npm install --save-exact @supabase/supabase-js@2.118.0 @supabase/postgrest-js@2.118.0 \
  @tiptap/react@3.32.1 @tiptap/starter-kit@3.32.1 @tiptap/extension-image@3.32.1 @tiptap/pm@3.32.1 \
  dompurify@3.4.17 react-router@8.5.1
```

React (19.3.1), Vite (8.3.5) e TypeScript (7.0.2) li ha già il progetto: se le versioni sono diverse, segnalalo nel rapporto dell'integrazione.

## 1. Copia i file

| Da `daveo-admin` | A nel sito |
|---|---|
| `modulo/` (tutta la cartella) | `src/daveo-admin/` |
| `config/admin.config.esempio.ts` | `src/admin.config.ts` |

La posizione conta: `src/daveo-admin/config.ts` importa `'../admin.config'`, e `admin.config.ts` importa `'./daveo-admin/…'`.
**Non modificare** i file in `src/daveo-admin/`. Se trovi un bug, correggilo e segnalalo: va corretto anche in `daveo-admin`.

## 2. Adatta `src/admin.config.ts`

È l'unico file da cambiare:
- `nomeSito`, `prefisso` (es. `pizzeria-rossi`), `lingua`, `fusoOrario`;
- `raccolte`: una per ogni tabella di contenuto del sito (vedi l'esempio `notizie` e i tipi in `src/daveo-admin/tipi.ts`). Tipi di campo: `testo`, `testoLungo`, `html`, `dataOra`, `numero`, `spunta`, `immagine`, `link`, `scelta`, `slug`, `solaLettura`;
- `testi`: i testi delle pagine modificabili, con il predefinito;
- `immagini`: lascia i valori, salvo accordi diversi (il limite deve essere uguale a quello del bucket);
- `accesso.captcha`: `true` solo se usi Turnstile al login (vedi punto 6);
- `modifica.bloccaFuori`: selettore degli elementi del layout da rendere inerti quando il cassetto è aperto (di solito `main, header, footer, .vvm-barra`);
- `tema`: colori del brand (contrasto WCAG AA da verificare: testo su `chiaro`, `chiaro` su `primario`).

Regole del file:
- importa solo `./daveo-admin/tipi`, `./daveo-admin/format`, `./daveo-admin/pubblico/media` e componenti di presentazione del sito (per `anteprima`): finisce nel bundle pubblico;
- nel resto del sito **non importarlo direttamente**: usa `CONFIG` da `src/daveo-admin/config`.

## 3. Rotte

In `src/main.tsx` (o dove sta il router):

```tsx
import { lazy, Suspense } from 'react'
import { installaRicaricaDopoDeploy } from './daveo-admin/pubblico'

// L'admin è un pacchetto separato: chi visita il sito non scarica supabase-js né Tiptap.
const Admin = lazy(() => import('./daveo-admin/admin/Admin'))

installaRicaricaDopoDeploy()

const router = createBrowserRouter([
  { element: <Layout />, children: [ /* pagine pubbliche */ ] },
  {
    path: '/admin/*',
    element: (
      <Suspense fallback={<p style={{ padding: '2rem' }}>Caricamento dell'area editor…</p>}>
        <Admin />
      </Suspense>
    ),
  },
])
```

`/admin/*` sta **fuori** dal layout pubblico. Importa `Admin` **solo** con `lazy()`.

## 4. Layout pubblico: modalità modifica e testi

Nel layout delle pagine pubbliche (dentro il router):

```tsx
import { PortaModifica } from './daveo-admin/pubblico'

export function Layout() {
  return (
    <>
      <Header />
      <main id="contenuto"><Outlet /></main>
      <Footer />
      <PortaModifica />
    </>
  )
}
```

Nelle pagine:
- testi modificabili: `<Testo k="home.titolo" as="h1" />` (import da `./daveo-admin/pubblico`);
- contenuti modificabili: aggiungi `data-modifica="<id raccolta>:<id riga>"` all'elemento che li mostra, es. `<article data-modifica={`notizie:${n.id}`}>`;
- ricarica dopo un salvataggio: carica i dati con `useDati(() => …, deps)` da `./daveo-admin/pubblico` (si aggiorna da solo), oppure ascolta l'evento `EVENTO_AGGIORNA` su `window`;
- HTML dal database: sempre `pulisci(html)` prima di `dangerouslySetInnerHTML`;
- link dal database: sempre `linkSicuro(url)` prima di metterli in un `href`;
- immagini salvate come nome di file: `immagineCompleta(valore)`.

Dalle pagine pubbliche importa **solo** da `./daveo-admin/pubblico` (o i file al suo interno), mai da `admin/` o `modifica/`.

## 5. Variabili d'ambiente (solo i nomi)

In `.env` (non committato) o nelle impostazioni dell'hosting:

```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=          # chiave publishable, MAI la service role
VITE_TURNSTILE_SITE_KEY=         # solo se accesso.captcha = true
```

Aggiungi i nomi a `.env.example`. Senza le prime due il modulo si ferma con un errore chiaro.

## 6. Supabase (fa chi gestisce il progetto, con il suo OK)

1. Copia `supabase/migrations/0001…0003` nella cartella `supabase/migrations/` del sito come **file nuovi**, rinominati `AAAAMMGGHHMMSS_admin_editor.sql`, `…_admin_testi.sql`, `…_admin_immagini.sql` con timestamp successivi alle migrazioni esistenti.
2. Per ogni raccolta crea una migrazione partendo dal modello `0004_esempio_raccolta.sql` (stesse policy).
3. **Non applicarle** finché non c'è l'OK. Poi: `supabase db push` oppure SQL Editor.
4. Authentication:
   - Sign In / Providers → Email attivo; **"Allow new users to sign up" spento**;
   - Policies → Password: minimo uguale a `accesso.passwordMinima`, con lettere e numeri;
   - URL Configuration → Site URL del sito e redirect `https://<dominio>/admin`;
   - (facoltativo) Attack Protection → CAPTCHA con Turnstile; allora `accesso.captcha: true` e `VITE_TURNSTILE_SITE_KEY`.
5. Aggiungere un editor (procedura usata in VVV):
   1. Authentication → Users → **Add user → Create new user**: email e una password temporanea, con "Auto Confirm User". Nessuna email parte.
   2. Nella riga dell'utente, ⋯ → **Edit user metadata**: `{"cambia_password": true}`. Al primo accesso il pannello gli chiede di sceglierne una sua.
   3. Copia lo User UID e nel SQL Editor: `insert into public.editors (user_id) values ('UID-COPIATO');`
   4. Dai la password temporanea di persona, non in chat di gruppo.

## 7. CSP e intestazioni

Il modulo si collega a: `https://*.supabase.co` e `wss://*.supabase.co` (API e Storage) e, se `captcha`, a `https://challenges.cloudflare.com` (script e frame). Le immagini incollate come link possono venire da qualsiasi `https:`. Vedi `docs/SICUREZZA.md` per la CSP consigliata.

## 8. Verifica

```bash
npm run build      # deve passare tsc -b e vite build
```

Poi la checklist di `docs/SICUREZZA.md` (confine pubblico/admin, RLS, secrets).

---

## Note per Astro (`/admin` come app separata)

Non provato su un progetto reale. Strada consigliata:

1. Integrazione React di Astro (`@astrojs/react`) e le dipendenze del punto 0.
2. Copia `modulo/` in `src/daveo-admin/` e la config in `src/admin.config.ts`, come sopra.
3. Variabili: Astro espone al client solo quelle con il prefisso `PUBLIC_`. O imposti `vite: { envPrefix: ['PUBLIC_', 'VITE_'] }` in `astro.config.mjs`, o chiami le variabili `VITE_…` lo stesso: con `envPrefix` funzionano senza toccare il modulo.
4. Pagina `src/pages/admin/[...percorso].astro` (con `export const prerender = false` in SSR, oppure `getStaticPaths` che restituisce solo `/admin` in statico + regola di fallback dell'hosting `/admin/* → /admin/index.html 200`) che monta un'isola:

```tsx
// src/daveo-admin-astro/AppAdmin.tsx (file del sito, non del modulo)
import { BrowserRouter, Route, Routes } from 'react-router'
import Admin from '../daveo-admin/admin/Admin'
export default function AppAdmin() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<Admin />} />
      </Routes>
    </BrowserRouter>
  )
}
```

```astro
---
import AppAdmin from '../../daveo-admin-astro/AppAdmin'
---
<html lang="it"><head><meta name="robots" content="noindex" /></head>
<body><AppAdmin client:only="react" /></body></html>
```

5. Limiti: il bottone "Modifica sul sito" e la modalità modifica funzionano solo su pagine React con React Router; `<Testo>` solo dentro isole React. Su un sito Astro i testi si leggono dalla tabella `testi` al build o con un fetch. La modalità modifica per Astro è elencata in `docs/ESTENSIONI.md`.
