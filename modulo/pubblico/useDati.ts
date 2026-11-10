import { useEffect, useRef, useState, type DependencyList } from 'react'
import { EVENTO_AGGIORNA } from '../config'

export type Stato<T> =
  | { stato: 'carico'; dati?: undefined; errore?: undefined }
  | { stato: 'ok'; dati: T; errore?: undefined }
  | { stato: 'errore'; dati?: undefined; errore: string }

/** Evento lanciato dalla modalità modifica dopo un salvataggio: le pagine ricaricano i dati. */
export { EVENTO_AGGIORNA }

/** Numero che cresce a ogni salvataggio dalla modalità modifica. */
function useGiro(): number {
  const [giro, setGiro] = useState(0)
  useEffect(() => {
    const f = () => setGiro((g) => g + 1)
    window.addEventListener(EVENTO_AGGIORNA, f)
    return () => window.removeEventListener(EVENTO_AGGIORNA, f)
  }, [])
  return giro
}

/** Carica dati asincroni; ignora risposte arrivate dopo un cambio di dipendenze. */
export function useDati<T>(carica: () => Promise<T>, deps: DependencyList, iniziale?: T): Stato<T> {
  const [s, setS] = useState<Stato<T>>(iniziale !== undefined ? { stato: 'ok', dati: iniziale } : { stato: 'carico' })
  const giro = useGiro()
  const ultimoGiro = useRef(giro)
  useEffect(() => {
    let vivo = true
    // Dopo un salvataggio si aggiorna in silenzio, senza tornare a "carico".
    const silenzioso = iniziale !== undefined || ultimoGiro.current !== giro
    ultimoGiro.current = giro
    if (!silenzioso) setS({ stato: 'carico' })
    carica()
      .then((dati) => vivo && setS({ stato: 'ok', dati }))
      .catch(() => vivo && !silenzioso && setS({ stato: 'errore', errore: 'Non riusciamo a caricare i contenuti. Riprova tra poco.' }))
    return () => {
      vivo = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, giro])
  return s
}

/** Lancia l'errore di Supabase così useDati lo intercetta. */
export function oppure<T>(r: { data: T | null; error: unknown }): T {
  if (r.error) throw r.error
  return r.data as T
}
