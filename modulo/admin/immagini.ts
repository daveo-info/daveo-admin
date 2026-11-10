import { supabase } from './supabase'
import { CONFIG } from '../config'
import { slugify } from '../format'

/*
  Origine: src/admin/immagini.ts di vini-vidi-virgi.
  Limiti presi dalla config (immagini.*). Tolti: la copia delle miniature
  YouTube e il promemoria sulla liberatoria (specifici di VVV).
*/

export const BUCKET = CONFIG.immagini.bucket

const LATO_MAX = CONFIG.immagini.latoMax
/** Lato lungo della miniatura usata nelle gallerie (non serve la foto intera per un riquadro piccolo). */
const LATO_MINI = CONFIG.immagini.latoMini
const QUALITA = CONFIG.immagini.qualita
/** Deve restare uguale al file_size_limit del bucket (vedi la migrazione del bucket). */
const MAX_BYTES = CONFIG.immagini.maxByte
const MAX_ORIGINALE = CONFIG.immagini.maxOriginaleByte
const TIPI = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']
const ESTENSIONI = /\.(jpe?g|png|webp|heic|heif)$/i

export function formatoPeso(byte: number): string {
  if (byte < 1024 * 1024) return `${Math.max(1, Math.round(byte / 1024))} KB`
  return `${(byte / 1024 / 1024).toLocaleString(CONFIG.lingua, { maximumFractionDigits: 1 })} MB`
}

function toBlob(canvas: HTMLCanvasElement, tipo: string): Promise<Blob | null> {
  return new Promise((ok) => canvas.toBlob(ok, tipo, QUALITA))
}

/** Disegna la bitmap con il lato lungo al massimo `lato` e la comprime in WebP (o JPEG se il browser non sa fare WebP). */
async function comprimi(bitmap: ImageBitmap, lato: number) {
  const scala = Math.min(1, lato / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scala)
  const h = Math.round(bitmap.height * scala)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, 0, 0, w, h)
  let blob = await toBlob(canvas, 'image/webp')
  let estensione = 'webp'
  if (!blob || blob.type !== 'image/webp') {
    blob = await toBlob(canvas, 'image/jpeg')
    estensione = 'jpg'
  }
  if (!blob) throw new Error('Non riusciamo a comprimere questa immagine.')
  return { blob, estensione, larghezza: w, altezza: h }
}

export type ImmaginePronta = {
  blob: Blob
  mini: Blob
  estensione: string
  larghezza: number
  altezza: number
  pesoOriginale: number
}

/**
 * Controlla il file e lo prepara: lato lungo massimo e qualità dalla config
 * (WebP, JPEG se il browser non sa fare WebP), più una miniatura per le gallerie.
 */
export async function preparaImmagine(file: File): Promise<ImmaginePronta> {
  if (file.type.startsWith('video/')) {
    throw new Error('I video non si caricano qui: mettili su YouTube o Vimeo e incolla il link.')
  }
  // Alcuni telefoni non dicono il tipo dei file HEIC: in quel caso guardiamo l'estensione.
  if (!TIPI.includes(file.type) && !(file.type === '' && ESTENSIONI.test(file.name))) {
    throw new Error('Questo file non è una foto accettata. Usa JPG, PNG, WebP o HEIC.')
  }
  if (file.size > MAX_ORIGINALE) {
    throw new Error(`La foto pesa ${formatoPeso(file.size)}: il massimo è ${formatoPeso(MAX_ORIGINALE)}. Riducila o scegline un'altra.`)
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      /heic|heif/i.test(file.type + file.name)
        ? 'Questo browser non sa leggere le foto HEIC. Prova da Safari (iPhone/Mac) o esportala come JPG.'
        : 'Non riusciamo a leggere questa immagine. Prova a salvarla come JPG e ricaricala.',
    )
  }
  try {
    const grande = await comprimi(bitmap, LATO_MAX)
    const mini = await comprimi(bitmap, LATO_MINI)
    if (grande.blob.size > MAX_BYTES) throw new Error(`Anche dopo la compressione l’immagine supera ${formatoPeso(MAX_BYTES)}. Prova con un’altra foto.`)
    return { ...grande, mini: mini.blob, pesoOriginale: file.size }
  } finally {
    bitmap.close()
  }
}

export type FotoCaricata = {
  url: string
  miniatura: string
  larghezza: number
  altezza: number
  pesoPrima: number
  pesoDopo: number
}

/** Percorso nel bucket dal link pubblico (null se il link non è del nostro bucket). */
export function percorsoDaUrl(url: string): { bucket: string; percorso: string } | null {
  const m = /\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/.exec(url)
  return m ? { bucket: m[1]!, percorso: decodeURIComponent(m[2]!) } : null
}

/** Carica l'immagine nel bucket e restituisce l'URL pubblico. */
export async function caricaImmagine(file: File, cartella: string): Promise<string> {
  return (await caricaFoto(file, cartella, false)).url
}

/**
 * Carica foto (e, se richiesta, la miniatura) con nomi unici e cache di un anno:
 * i file non cambiano mai, quindi browser e CDN possono tenerli senza ricontrollare.
 */
export async function caricaFoto(file: File, cartella: string, conMiniatura = true): Promise<FotoCaricata> {
  const p = await preparaImmagine(file)
  const base = slugify(file.name.replace(/\.[^.]+$/, '')) || 'immagine'
  // Un pezzo casuale nel nome: nessuno può indovinare o sovrascrivere i file degli altri.
  const radice = `${cartella}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}-${base}`
  const percorso = `${radice}.${p.estensione}`
  const percorsoMini = `${radice}.mini.${p.estensione}`
  const opzioni = { contentType: p.blob.type, cacheControl: '31536000', upsert: false }

  const { error } = await supabase.storage.from(BUCKET).upload(percorso, p.blob, opzioni)
  if (error) throw new Error(erroreUpload(error))
  if (conMiniatura) {
    const r = await supabase.storage.from(BUCKET).upload(percorsoMini, p.mini, opzioni)
    if (r.error) {
      await supabase.storage.from(BUCKET).remove([percorso])
      throw new Error(erroreUpload(r.error))
    }
  }
  const pubblico = (x: string) => supabase.storage.from(BUCKET).getPublicUrl(x).data.publicUrl
  return {
    url: pubblico(percorso),
    miniatura: conMiniatura ? pubblico(percorsoMini) : pubblico(percorso),
    larghezza: p.larghezza,
    altezza: p.altezza,
    pesoPrima: p.pesoOriginale,
    pesoDopo: p.blob.size + (conMiniatura ? p.mini.size : 0),
  }
}

function erroreUpload(e: { message?: string; statusCode?: string }): string {
  const m = `${e.message ?? ''}`
  if (/row-level security|policy/i.test(m)) return MESSAGGIO_LIMITE_GENERICO
  if (/mime|type/i.test(m)) return 'Tipo di file non ammesso: si caricano solo foto.'
  if (/size|large|exceed/i.test(m)) return `Il file è troppo pesante (massimo ${formatoPeso(MAX_BYTES)} dopo la compressione).`
  return 'Caricamento non riuscito. Controlla la connessione e riprova.'
}

const MESSAGGIO_LIMITE_GENERICO = 'Caricamento rifiutato: forse hai raggiunto un limite, o la sessione è scaduta. Ricarica la pagina.'
