import { PostgrestClient } from '@supabase/postgrest-js'
import { SUPABASE_KEY, SUPABASE_URL } from '../env'

// Client leggero per le pagine pubbliche: solo lettura via REST, come utente
// anonimo. Le policy RLS decidono cosa si vede.
export const db = new PostgrestClient(`${SUPABASE_URL}/rest/v1`, {
  headers: { apikey: SUPABASE_KEY },
})
