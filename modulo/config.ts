import config from '../admin.config'
import type { Raccolta, VoceTesto } from './tipi'

/*
  Unico punto in cui il modulo legge la configurazione del sito.
  Il modulo va copiato in src/admin/ e la config in src/admin.config.ts:
  per questo l'import è '../admin.config'.
  Questo file finisce anche nel bundle pubblico (serve a <Testo>): non importare
  qui niente di admin/ o modifica/.
*/

export const CONFIG = config

/** Raccolte modificabili, nell'ordine del menu. */
export const RACCOLTE: Raccolta[] = config.raccolte

export function raccolta(id: string | undefined): Raccolta | undefined {
  return RACCOLTE.find((r) => r.id === id)
}

export type ChiaveTesto = keyof typeof config.testi & string

export const CATALOGO_TESTI = config.testi as Record<ChiaveTesto, VoceTesto>

export function voceTesto(k: string): VoceTesto | undefined {
  return (config.testi as Record<string, VoceTesto>)[k]
}

/** Evento lanciato dopo un salvataggio dalla modalità modifica: il sito ricarica i dati. */
export const EVENTO_AGGIORNA = `${config.prefisso}:aggiorna`
