import { SUPABASE_URL } from '../env'
import { CONFIG } from '../config'

/*
  Origine: src/lib/video.ts di vini-vidi-virgi (solo la parte sulle immagini).
  Nei campi immagine si può salvare l'indirizzo completo oppure solo il nome
  del file caricato nel bucket (es. "festa.webp", o "articoli/festa.webp"):
  così il Table Editor di Supabase resta facile da compilare a mano.
*/

/** Nome di file nel bucket (o URL completo) → URL pubblico completo. */
export function risolviLink(link: string, bucket: string = CONFIG.immagini.bucket): string {
  if (/^https?:\/\//i.test(link)) return link
  const percorso = link.trim().replace(/^\/+/, '').split('/').map(encodeURIComponent).join('/')
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${percorso}`
}

/** Campo immagine facoltativo (copertina, foto, logo…): nome del file o URL, sempre completo. */
export function immagineCompleta(valore: string | null): string | null {
  return valore?.trim() ? risolviLink(valore) : null
}
