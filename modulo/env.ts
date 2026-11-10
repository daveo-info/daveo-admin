const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !key) {
  throw new Error('Mancano VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY: copia .env.example in .env')
}

export const SUPABASE_URL = url.replace(/\/$/, '')
export const SUPABASE_KEY = key

/**
 * Dove supabase-js salva la sessione nel browser. Il sito pubblico guarda solo
 * se esiste, per decidere se caricare la modalità modifica (chi non è loggato
 * non scarica nulla in più). Non dà nessun permesso: decidono le policy RLS.
 */
export const CHIAVE_SESSIONE = `sb-${new URL(SUPABASE_URL).hostname.split('.')[0]}-auth-token`
