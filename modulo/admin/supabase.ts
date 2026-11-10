import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from '../env'

/*
  Diagnosi delle uscite dall'admin: se Supabase Auth rifiuta un accesso o un
  rinnovo del token, scrive in console SOLO il tipo di richiesta, lo stato HTTP
  e il codice d'errore (es. refresh_token_already_used, session_expired).
  Mai il corpo delle risposte riuscite, che contiene i token.
*/
const fetchConDiagnosi: typeof fetch = async (input, init) => {
  const r = await fetch(input, init)
  const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
  if (!r.ok && url.includes('/auth/v1/token')) {
    let codice: string | undefined
    try {
      codice = ((await r.clone().json()) as { error_code?: string }).error_code
    } catch {
      codice = undefined
    }
    console.warn('[admin] Supabase ha rifiutato l’accesso', {
      tipo: new URL(url).searchParams.get('grant_type'),
      stato: r.status,
      codice,
      ora: new Date().toLocaleTimeString('it-IT'),
    })
  }
  return r
}

// Client completo (auth, storage): lo usa solo l'area editor, caricata a parte.
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
  global: { fetch: fetchConDiagnosi },
})

