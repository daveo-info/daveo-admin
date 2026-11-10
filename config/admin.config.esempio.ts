/*
  CONFIGURAZIONE DELL'AREA EDITOR /admin — l'unico file da adattare per ogni sito.

  Copialo in src/admin.config.ts (accanto alla cartella src/daveo-admin/ del modulo).
  Attenzione: questo file finisce anche nel bundle pubblico (serve a <Testo>),
  quindi qui si importano solo i tipi e le funzioni pure del modulo
  (daveo-admin/tipi, daveo-admin/format, daveo-admin/pubblico/media),
  mai codice di daveo-admin/admin/ o daveo-admin/modifica/.
  Nel resto del sito non importare questo file: usa CONFIG da daveo-admin/config.

  Le regole scritte qui servono solo ad aiutare chi scrive: i controlli veri
  sono nel database (check constraint e policy RLS delle migrazioni).
*/
import { definisciConfig, type DefCampo, type Raccolta, type Riga } from './daveo-admin/tipi'
import { data } from './daveo-admin/format'
import { immagineCompleta } from './daveo-admin/pubblico/media'

const s = (v: unknown) => (typeof v === 'string' ? v : '')

/* ---------------------------------------------------------------- campi riusabili */

const VISIBILE: DefCampo = {
  k: 'pubblicato',
  tipo: 'spunta',
  etichetta: 'Visibile sul sito',
  aiuto: 'Togli la spunta per nasconderlo senza eliminarlo (resta qui come bozza).',
}

/* ---------------------------------------------------------------- raccolte */
/*
  Una raccolta = una tabella di Supabase. "id" è anche il nome usato sul sito in
  data-modifica="<id>:<uuid della riga>". La tabella deve esistere con le policy
  del modello (vedi supabase/migrations/0004_esempio_raccolta.sql).
*/

const notizie: Raccolta = {
  id: 'notizie',
  tabella: 'notizie',
  nome: 'Notizia',
  plurale: 'Notizie',
  nuovo: 'Nuova notizia',
  // Bottone "Vedi sul sito": può essere un indirizzo fisso o una funzione della riga salvata.
  pagina: (r: Riga) => `/notizie/${s(r.slug)}`,
  campi: [
    { k: 'titolo', tipo: 'testo', etichetta: 'Titolo', obbligatorio: true, max: 200 },
    { k: 'slug', tipo: 'slug', etichetta: 'Indirizzo della pagina', da: 'titolo', prefisso: '/notizie/', obbligatorio: true },
    { k: 'data_pubblicazione', tipo: 'dataOra', etichetta: 'Data', obbligatorio: true, aiuto: 'Le notizie sono in ordine dalla più recente.' },
    { k: 'estratto', tipo: 'testoLungo', etichetta: 'Riassunto', nonNullo: true, max: 400, aiuto: 'Due righe che si leggono nell’elenco delle notizie.' },
    { k: 'copertina_url', tipo: 'immagine', etichetta: 'Copertina (facoltativa)', cartella: 'notizie' },
    { k: 'contenuto', tipo: 'html', etichetta: 'Testo dell’articolo', cartella: 'notizie', nonNullo: true },
    VISIBILE,
  ],
  vuota: () => ({
    titolo: '',
    slug: '',
    data_pubblicazione: new Date().toISOString(),
    estratto: '',
    copertina_url: null,
    contenuto: '',
    pubblicato: true,
  }),
  titolo: (r) => s(r.titolo) || 'Senza titolo',
  sottotitolo: (r) => (typeof r.data_pubblicazione === 'string' ? data(r.data_pubblicazione) : ''),
  // Facoltativo: miniatura nell'elenco. immagineCompleta() accetta anche il solo nome del file nel bucket.
  immagine: (r) => immagineCompleta(s(r.copertina_url) || null),
  ordine: [{ col: 'data_pubblicazione', asc: false }],
  visibile: 'pubblicato',
  // anteprima: (r) => <SchedaNotizia … />  ← facoltativa, con i componenti del sito (file .tsx)
}

/* ---------------------------------------------------------------- configurazione */

export default definisciConfig({
  nomeSito: 'Nome del sito',
  // Solo lettere minuscole e trattini: chiavi nel browser ed evento "<prefisso>:aggiorna".
  prefisso: 'sito',
  lingua: 'it-IT',
  fusoOrario: 'Europe/Rome',

  // Ordine del menu del pannello.
  raccolte: [notizie],

  /*
    Testi delle pagine modificabili: il valore qui è il PREDEFINITO.
    Nella tabella "testi" finiscono solo quelli cambiati dagli editor.
    Sul sito: <Testo k="home.titolo" as="h1" />.
    Chiavi: lettere minuscole, numeri, "_" e punti; massimo 80 caratteri.
  */
  testi: {
    'home.titolo': { pagina: 'Home', etichetta: 'Titolo principale', predefinito: 'Benvenuti', max: 80 },
    'home.intro': {
      pagina: 'Home',
      etichetta: 'Testo di presentazione',
      predefinito: '<p>Scrivi qui due righe su chi siete e cosa offrite.</p>',
      ricco: true,
    },
  },

  immagini: {
    bucket: 'immagini',
    latoMax: 1600,
    latoMini: 480,
    qualita: 0.8,
    // Deve essere uguale al file_size_limit del bucket (migrazione 0003).
    maxByte: 2 * 1024 * 1024,
    maxOriginaleByte: 15 * 1024 * 1024,
  },

  accesso: {
    // Uguale a Authentication → Policies → Password in Supabase.
    passwordMinima: 12,
    // true solo se in Supabase è attiva la CAPTCHA protection con Turnstile e c'è VITE_TURNSTILE_SITE_KEY.
    captcha: false,
  },

  modifica: {
    // Cosa rendere inerte mentre il cassetto della modalità modifica è aperto.
    bloccaFuori: 'main, header, footer, .vvm-barra',
  },

  // Colori dell'area editor: dal brand del cliente. Verifica il contrasto WCAG AA di testo su chiaro e chiaro su primario.
  tema: {
    primario: '#2f3e5c',
    chiaro: '#faf8f4',
    testo: '#1d1b20',
    errore: '#8f1d1d',
    ok: '#2d5a34',
    font: "system-ui, -apple-system, 'Segoe UI', sans-serif",
  },
})
