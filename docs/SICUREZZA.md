# Sicurezza — checklist del modulo admin Daveo

Da eseguire a ogni integrazione, prima di mettere online il sito. Segna cosa è verificato e cosa no.

## 1. Confine pubblico / admin (dopo `npm run build`)

```bash
# Il chunk d'ingresso non deve contenere codice di admin: tutti i conteggi a 0.
for w in tiptap ProseMirror signInWithPassword GoTrueClient; do
  printf "%-20s %s\n" "$w" "$(cat dist/assets/index-*.js | grep -c "$w")"
done
# Le pagine pubbliche importano solo da daveo-admin/pubblico:
grep -rn "daveo-admin/\(admin\|modifica\)" src --include=*.tsx --include=*.ts | grep -v "^src/daveo-admin/"
#   → deve restare solo la riga con lazy(() => import('./daveo-admin/admin/Admin'))
```

- [ ] Conteggi a 0
- [ ] `admin/Admin` importato solo con `lazy()`
- [ ] `admin.config.ts` importa solo `daveo-admin/tipi`, `daveo-admin/format`, `daveo-admin/pubblico/media` e componenti di presentazione

## 2. RLS e permessi (Supabase)

- [ ] RLS attiva su **ogni** tabella `public` (Database → Advisors → Security: nessun "RLS disabled")
- [ ] Ogni tabella di contenuto ha le 5 policy del modello `0004` (lettura anonimi, lettura autenticati, insert/update/delete solo `private.is_editor()`)
- [ ] Le policy per `anon` non chiamano `private.is_editor()`
- [ ] `anon` non ha privilegi di scrittura (`revoke all … from anon; grant select …`)
- [ ] `public.editors`: nessuna policy di scrittura; i client possono solo leggere la propria riga
- [ ] Funzioni `security definer` con `set search_path = ''` (Advisors: nessun "function_search_path_mutable")
- [ ] Bucket `immagini`: `file_size_limit` = `immagini.maxByte` della config, solo JPEG/PNG/WebP; scrittura ed elenco solo editor
- [ ] Ogni campo che finisce in un `href` ha un check nel database (solo `https://`, `mailto:`, `tel:`) e passa da `linkSicuro()` nel sito
- [ ] Ogni HTML dal database passa da `pulisci()` prima del render

## 3. Auth

- [ ] "Allow new users to sign up" **spento**
- [ ] Password minima = `accesso.passwordMinima`, con lettere e numeri
- [ ] Site URL e redirect URL = dominio vero + `/admin` (niente `localhost` in produzione)
- [ ] Se `accesso.captcha: true`: CAPTCHA protection attiva con la **secret key** di Turnstile impostata in Supabase (mai nel codice) e `VITE_TURNSTILE_SITE_KEY` nell'hosting
- [ ] Editor aggiunti uno per uno (Add user + `editors`), password temporanea con `cambia_password: true`

## 4. Secrets

- [ ] Nel codice e nella build ci sono solo valori pubblici: URL Supabase, chiave **publishable** (`sb_publishable_…` o anon), site key Turnstile
- [ ] La service role key / `sb_secret_…` non compare da nessuna parte (codice, `.env.example`, build, history)
- [ ] `.env*` e `.dev.vars` sono in `.gitignore`
- [ ] Scansione: `gitleaks detect` se installato, altrimenti `grep -rEn "sb_secret_|service_role|eyJ[A-Za-z0-9_-]{10,}\.eyJ" .` (escludendo `node_modules`)

## 5. CSP per `/admin`

Il modulo ha bisogno di (aggiungi i domini del sito, es. font o embed):

```
default-src 'self';
script-src 'self' https://challenges.cloudflare.com;            # Turnstile: solo se captcha
frame-src https://challenges.cloudflare.com;                    # Turnstile: solo se captcha
connect-src 'self' https://<ref>.supabase.co wss://<ref>.supabase.co;
img-src 'self' data: blob: https:;
style-src 'self' 'unsafe-inline';
font-src 'self';
object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
```

Note:
- `img-src https:` serve al campo "Oppure incolla il link di un'immagine". Se il sito non lo vuole, si può restringere a `'self' data: blob: https://<ref>.supabase.co`, ma i link esterni già salvati non si vedranno più (sul sito e nel pannello).
- `style-src 'unsafe-inline'`: lo usano gli stili in linea di React (anteprima, `visibility` di `<Testo>`).
- Meglio usare `https://<ref>.supabase.co` invece di `https://*.supabase.co`.
- Intestazioni consigliate anche: `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, `Strict-Transport-Security`.
- `/admin` non va indicizzato: il pannello imposta `noindex, nofollow`; aggiungi anche `Disallow: /admin` in `robots.txt`.

## 6. Controlli prima del via

- [ ] `npm run build` passa
- [ ] Login con un utente **non** editor → "Non autorizzato", e nessuna scrittura possibile (prova da console: `insert` su una raccolta → errore 42501)
- [ ] Login editor → crea, modifica, nascondi, elimina una riga di ogni raccolta
- [ ] Upload: JPG grande (>2 MB, <15 MB) → caricato compresso; PDF → rifiutato; file >15 MB → rifiutato
- [ ] Modalità modifica: clic su un testo e su un contenuto → cassetto; salva → la pagina si aggiorna
- [ ] Da anonimo, in navigazione privata, la modalità modifica non si scarica (Network: nessun chunk `Modifica-*`)
- [ ] Password dimenticata → email → link → nuova password
- [ ] "Esci da tutti i dispositivi" chiude anche le altre sessioni

## 7. Da provare con un progetto Supabase di test

La prova del modulo (`_prova/`, vedi `_report/RAPPORTO.md`) è stata fatta **senza Supabase reale**: typecheck, build e lint. Restano da provare su un progetto Supabase di test, prima del primo sito vero:

1. Applicare `0001`–`0004` su un progetto vuoto: nessun errore, e rieseguirle non dà errori.
2. Advisors di sicurezza e performance puliti.
3. Tutti i punti della sezione 6.
4. Un utente non editor non riesce a: leggere righe nascoste, scrivere su `notizie`/`testi`, elencare o caricare file nel bucket `immagini`, inserirsi in `editors`.
5. Un anonimo legge solo righe con `pubblicato = true` e solo `chiave, valore, updated_at` di `testi`.
6. Upload oltre `file_size_limit` chiamando direttamente l'API Storage → rifiutato.
7. CAPTCHA (se usata): login senza token → rifiutato.
8. Rinnovo della sessione con rete instabile (DevTools → offline durante il rinnovo) → schermata "Riprova", non il login.
