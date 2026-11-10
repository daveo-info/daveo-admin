import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { CONFIG } from '../config'

/*
  Chi sta usando l'admin. Il controllo "è un editor?" qui serve solo a mostrare
  la schermata giusta: i permessi veri li applicano le policy RLS del database.
*/
export type Accesso =
  | { stato: 'carico' }
  | { stato: 'anonimo' }
  /** Arrivato dal link "password dimenticata": deve sceglierne una nuova. */
  | { stato: 'recupero'; sessione: Session }
  /** Primo accesso con la password temporanea: deve sceglierne una sua. */
  | { stato: 'cambia'; sessione: Session }
  | { stato: 'negato'; sessione: Session }
  | { stato: 'editor'; sessione: Session }
  /** C'è un accesso salvato ma non si riesce a rinnovarlo (rete, server): non è un'uscita. */
  | { stato: 'errore'; riprova: () => void }

/** Attese tra un tentativo e l'altro (ms): dopo l'ultimo si mostra l'errore. */
const ATTESE = [1000, 3000, 6000]
const pausa = (ms: number) => new Promise((ok) => setTimeout(ok, ms))

/*
  Al ricaricamento, se il token di un'ora è scaduto, getSession() prova a
  rinnovarlo. Se il rinnovo fallisce per un problema temporaneo, Supabase lascia
  l'accesso salvato nel browser ma risponde "nessuna sessione" con un errore:
  prima mostravamo il login e sembrava che l'admin "buttasse fuori". Ora
  riproviamo e, se continua a fallire, mostriamo un errore con "Riprova".
  Se invece l'accesso è davvero finito (uscita, sessione revocata) Supabase
  risponde senza errore e si torna al login.
*/
async function leggiSessione(): Promise<{ sessione: Session | null; errore: boolean }> {
  for (let i = 0; ; i++) {
    const { data, error } = await supabase.auth.getSession()
    if (data.session || !error) return { sessione: data.session, errore: false }
    // Solo codice e stato, mai il contenuto: serve per capire il problema dalla console.
    console.warn('[admin] rinnovo dell’accesso non riuscito', { tentativo: i + 1, codice: error.code, stato: error.status })
    if (i >= ATTESE.length) return { sessione: null, errore: true }
    await pausa(ATTESE[i])
  }
}

export function useAccesso(): Accesso {
  const [sessione, setSessione] = useState<Session | null | undefined>(undefined)
  const [errore, setErrore] = useState(false)
  const [tentativo, setTentativo] = useState(0)
  const [recupero, setRecupero] = useState(false)
  const [editor, setEditor] = useState<boolean | null>(null)

  useEffect(() => {
    let vivo = true
    // Su "Riprova" torna a "Controllo l'accesso…" invece di mostrare il login.
    setErrore(false)
    setSessione(undefined)
    void leggiSessione().then((r) => {
      if (!vivo) return
      setSessione(r.sessione)
      setErrore(r.errore)
    })
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      // La sessione iniziale la legge leggiSessione(), con i nuovi tentativi:
      // qui arriverebbe null anche quando il rinnovo è solo fallito per un attimo.
      if (evento === 'INITIAL_SESSION') return
      if (evento === 'SIGNED_OUT') console.warn('[admin] sessione chiusa', { ora: new Date().toLocaleTimeString(CONFIG.lingua) })
      if (evento === 'PASSWORD_RECOVERY') setRecupero(true)
      // Nuova password salvata (USER_UPDATED) o uscita: fine del recupero.
      if (evento === 'SIGNED_OUT' || evento === 'USER_UPDATED') setRecupero(false)
      if (s) setErrore(false)
      setSessione(s)
    })
    return () => {
      vivo = false
      data.subscription.unsubscribe()
    }
  }, [tentativo])

  const userId = sessione?.user.id
  useEffect(() => {
    setEditor(null)
    if (!userId) return
    let vivo = true
    // Un errore di rete non deve far comparire "Non autorizzato": riprova una volta.
    const controlla = async () => {
      let r = await supabase.rpc('sono_editor')
      if (r.error) {
        await pausa(ATTESE[0])
        if (!vivo) return
        r = await supabase.rpc('sono_editor')
      }
      if (vivo) setEditor(!r.error && r.data === true)
    }
    void controlla()
    return () => {
      vivo = false
    }
  }, [userId])

  if (errore && !sessione) return { stato: 'errore', riprova: () => setTentativo((t) => t + 1) }
  if (sessione === undefined) return { stato: 'carico' }
  if (!sessione) return { stato: 'anonimo' }
  if (recupero) return { stato: 'recupero', sessione }
  if (editor === null) return { stato: 'carico' }
  if (!editor) return { stato: 'negato', sessione }
  if (sessione.user.user_metadata?.cambia_password === true) return { stato: 'cambia', sessione }
  return { stato: 'editor', sessione }
}

const MINIMA = CONFIG.accesso.passwordMinima

/** Regole della password (le stesse impostate in Supabase): null se va bene. */
export function problemaPassword(p: string): string | null {
  if (p.length < MINIMA) return `Usa almeno ${MINIMA} caratteri.`
  if (!/[a-z]/i.test(p) || !/\d/.test(p)) return 'Mettici almeno una lettera e un numero.'
  if (p.length > 72) return 'Massimo 72 caratteri.'
  return null
}

/** Traduce gli errori di Supabase Auth in frasi chiare (senza dire se un'email esiste). */
export function erroreAccesso(e: { code?: string; status?: number; message?: string } | null): string {
  const c = e?.code ?? ''
  if (c === 'invalid_credentials') return 'Email o password non corretti.'
  if (c === 'captcha_failed') return 'Completa il controllo anti-spam e riprova.'
  if (c === 'over_request_rate_limit' || c === 'over_email_send_rate_limit' || e?.status === 429)
    return 'Troppi tentativi ravvicinati. Aspetta qualche minuto e riprova.'
  if (c === 'weak_password') return `Password troppo debole: almeno ${MINIMA} caratteri, con lettere e numeri.`
  if (c === 'same_password') return 'La nuova password deve essere diversa da quella attuale.'
  if (c === 'reauthentication_needed')
    return 'Per sicurezza la password si può cambiare solo entro 24 ore dall’accesso. Esci, rientra e riprova.'
  if (c === 'session_not_found' || c === 'refresh_token_not_found') return 'La sessione è scaduta. Rientra.'
  return 'Qualcosa non ha funzionato. Controlla la connessione e riprova.'
}
