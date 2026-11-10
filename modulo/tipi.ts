import type { ReactNode } from 'react'

/*
  Tipi del modulo admin Daveo. Questo file è puro (nessun import di codice):
  lo usano sia la parte pubblica sia l'area editor, e la config del sito.
  Origine: src/admin/raccolte.tsx e src/lib/testi.ts di vini-vidi-virgi.
*/

export type Riga = Record<string, unknown> & { id?: string }

type Base = {
  k: string
  etichetta: string
  aiuto?: string
  obbligatorio?: boolean
  /** Colonna NOT NULL di testo: vuoto = '' invece di null. */
  nonNullo?: boolean
  /** Mostra il campo solo se… */
  se?: (r: Riga) => boolean
}

export type DefCampo = Base &
  (
    | { tipo: 'testo'; max?: number; placeholder?: string }
    /** righe: altezza della casella (predefinito 4). */
    | { tipo: 'testoLungo'; max?: number; righe?: number }
    /** cartella: dove finiscono nel bucket le immagini inserite nel testo. */
    | { tipo: 'html'; cartella: string }
    /** dopo: nome del campo data che deve venire prima (es. la fine dopo l'inizio). */
    | { tipo: 'dataOra'; dopo?: string }
    | { tipo: 'numero'; min?: number; passo?: number }
    | { tipo: 'spunta' }
    | { tipo: 'immagine'; cartella: string }
    /** web: solo https://. contatto: anche mailto: e tel:. http: anche http://. */
    | { tipo: 'link'; schemi: 'web' | 'contatto' | 'http'; placeholder?: string }
    | { tipo: 'scelta'; opzioni: { valore: string; etichetta: string }[] }
    /** Indirizzo della pagina, generato da un altro campo finché non lo si tocca. */
    | { tipo: 'slug'; da: string; prefisso: string }
    | { tipo: 'solaLettura' }
  )

export type Filtro = { etichetta: string; vale: (r: Riga) => boolean }

export type Raccolta = {
  /** Uguale al nome usato in data-modifica sul sito (es. "notizie:<id>"). */
  id: string
  tabella: string
  nome: string
  plurale: string
  /** Testo del bottone, es. "Nuova notizia". */
  nuovo: string
  aiuto?: string
  campi: DefCampo[]
  vuota: () => Riga
  titolo: (r: Riga) => string
  sottotitolo?: (r: Riga) => string
  immagine?: (r: Riga) => string | null
  ordine: { col: string; asc: boolean }[]
  /** Colonna che decide se si vede sul sito. */
  visibile?: string
  creabile?: boolean
  filtri?: Filtro[]
  anteprima?: (r: Riga) => ReactNode
  /** Informazioni sopra il modulo. Riceve la riga salvata. */
  intestazione?: (r: Riga) => ReactNode
  /**
   * Pagina del sito dove compare (bottone "Vedi sul sito" e ordine del menu "+ Nuovo").
   * Può essere una funzione della riga salvata, es. (r) => `/notizie/${r.slug}`.
   */
  pagina?: string | ((r: Riga) => string)
  /** Etichetta di testo ben visibile nell'elenco. */
  etichetta?: (r: Riga) => string | null
  /** Link o strumenti in più sopra l'elenco. */
  strumenti?: ReactNode
}

export type VoceTesto = {
  pagina: string
  etichetta: string
  predefinito: string
  /** HTML con grassetti, titoli, elenchi e link (editor ricco) invece di testo semplice. */
  ricco?: boolean
  /** Massimo caratteri (solo testo semplice). */
  max?: number
}

export type ConfigAdmin<T extends Record<string, VoceTesto> = Record<string, VoceTesto>> = {
  /** Compare nella barra del pannello ("<nome> · editor") e nel titolo della scheda. */
  nomeSito: string
  /** Prefisso delle chiavi nel browser e dell'evento di aggiornamento (solo lettere minuscole e trattini). */
  prefisso: string
  /** Lingua per date e numeri, es. 'it-IT'. */
  lingua: string
  /** Fuso orario dei campi data e ora, es. 'Europe/Rome'. */
  fusoOrario: string
  /** Le tabelle di contenuto modificabili, nell'ordine del menu. */
  raccolte: Raccolta[]
  /** Testi delle pagine modificabili (predefiniti). Le chiavi: lettere minuscole, numeri, _ e punti. */
  testi: T
  immagini: {
    /** Bucket pubblico di Supabase Storage. */
    bucket: string
    /** Lato lungo massimo della foto caricata, in pixel. */
    latoMax: number
    /** Lato lungo della miniatura, in pixel. */
    latoMini: number
    /** Qualità WebP/JPEG da 0 a 1. */
    qualita: number
    /** Peso massimo dopo la compressione: deve essere uguale al file_size_limit del bucket. */
    maxByte: number
    /** Peso massimo del file scelto dall'editor, prima della compressione. */
    maxOriginaleByte: number
  }
  accesso: {
    /** Lunghezza minima della password: uguale a quella impostata in Supabase Auth. */
    passwordMinima: number
    /** true = widget Turnstile nel login (serve la CAPTCHA protection attiva in Supabase e VITE_TURNSTILE_SITE_KEY). */
    captcha: boolean
  }
  modifica: {
    /** Elementi del sito resi inerti mentre il cassetto è aperto (selettore CSS). */
    bloccaFuori: string
  }
  /** Colori e font dell'area editor (variabili CSS --adm-*). */
  tema: {
    primario: string
    chiaro: string
    testo: string
    errore: string
    ok: string
    font: string
  }
}

/** Aiuta a scrivere admin.config.ts con i controlli dei tipi, mantenendo le chiavi dei testi. */
export function definisciConfig<const T extends Record<string, VoceTesto>>(config: ConfigAdmin<T>): ConfigAdmin<T> {
  return config
}
