import { CONFIG } from '../config'

/*
  Stato della modalità modifica, condiviso tra il pannello e il sito.
  sessionStorage: vale solo per questa scheda e si spegne chiudendola.
*/
export const CHIAVE_MODIFICA = `${CONFIG.prefisso}-modifica`

export function modificaAttiva(): boolean {
  try {
    return sessionStorage.getItem(CHIAVE_MODIFICA) === '1'
  } catch {
    return false
  }
}

export function impostaModifica(attiva: boolean) {
  try {
    if (attiva) sessionStorage.setItem(CHIAVE_MODIFICA, '1')
    else sessionStorage.removeItem(CHIAVE_MODIFICA)
  } catch {
    // Navigazione privata con storage bloccato: la modalità resta spenta.
  }
}

/** Dal pannello: accende la modalità modifica prima di andare sul sito. */
export const attivaModifica = () => impostaModifica(true)
