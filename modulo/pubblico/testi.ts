import { useEffect, useSyncExternalStore } from 'react'
import { db } from './db'
import { CATALOGO_TESTI, EVENTO_AGGIORNA, type ChiaveTesto } from '../config'

/*
  Testi delle pagine modificabili dagli editor.
  Il testo PREDEFINITO sta nella config del sito (admin.config.ts → testi):
  nella tabella "testi" finiscono solo quelli cambiati. Se il database non
  risponde, il sito mostra i predefiniti.
  Per aggiungere un testo modificabile: aggiungi una voce in admin.config.ts
  e usa <Testo k="..."> nella pagina.
*/


type Stato = { pronti: boolean; valori: Record<string, string> }
let stato: Stato = { pronti: false, valori: {} }
let richiesta: Promise<void> | null = null
const ascoltatori = new Set<() => void>()

function avvisa() {
  ascoltatori.forEach((f) => f())
}

/** Carica (o ricarica) tutti i testi cambiati: una sola richiesta per tutto il sito. */
export function caricaTesti(): Promise<void> {
  // Con una rete lenta non si lascia la pagina senza testi: dopo poco si mostrano i predefiniti.
  const scadenza = window.setTimeout(() => {
    if (!stato.pronti) {
      stato = { ...stato, pronti: true }
      avvisa()
    }
  }, 1500)
  richiesta = (async () => {
    try {
      const { data, error } = await db.from('testi').select('chiave, valore')
      if (error) throw error
      const valori: Record<string, string> = {}
      for (const r of (data ?? []) as { chiave: string; valore: string }[]) valori[r.chiave] = r.valore
      stato = { pronti: true, valori }
    } catch {
      // Senza database restano i testi predefiniti.
      stato = { pronti: true, valori: stato.valori }
    }
    window.clearTimeout(scadenza)
    avvisa()
  })()
  return richiesta
}

if (typeof window !== 'undefined') {
  // Dopo un salvataggio dalla modalità modifica.
  window.addEventListener(EVENTO_AGGIORNA, () => void caricaTesti())
}

const iscriviti = (f: () => void) => {
  ascoltatori.add(f)
  return () => ascoltatori.delete(f)
}

/** Il testo da mostrare: quello cambiato dagli editor o il predefinito. `pronto` è false finché non si sa. */
export function useTesto(k: ChiaveTesto): { testo: string; pronto: boolean } {
  const s = useSyncExternalStore(iscriviti, () => stato)
  useEffect(() => {
    if (!richiesta) void caricaTesti()
  }, [])
  return { testo: s.valori[k] ?? CATALOGO_TESTI[k].predefinito, pronto: s.pronti }
}
