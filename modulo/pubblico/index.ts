/*
  Tutto quello che il sito PUBBLICO può importare dal modulo.
  Niente di questi file importa supabase-js, Tiptap o il codice di admin/:
  restano fuori dal bundle pubblico. PortaModifica carica la modalità modifica
  con lazy(), solo per chi ha una sessione salvata.
*/
export { Testo } from './Testo'
export { useTesto, caricaTesti } from './testi'
export { PortaModifica } from './PortaModifica'
export { installaRicaricaDopoDeploy } from './ricaricaDopoDeploy'
export { useDati, oppure, EVENTO_AGGIORNA, type Stato } from './useDati'
export { pulisci } from './sanitize'
export { immagineCompleta, risolviLink } from './media'
export { db } from './db'
export { linkSicuro } from '../format'
export type { ChiaveTesto } from '../config'
