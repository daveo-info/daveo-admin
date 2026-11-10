import { CONFIG } from './config'

/*
  Origine: src/lib/format.ts di vini-vidi-virgi (solo le funzioni usate dall'admin).
  Fuso orario e lingua vengono dalla config. I formattatori si creano al primo uso:
  così questo file si può importare anche da admin.config.ts senza problemi di
  ordine di caricamento.
*/

const cache = new Map<string, Intl.DateTimeFormat>()
function fmt(nome: string, opzioni: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  let f = cache.get(nome)
  if (!f) {
    f = new Intl.DateTimeFormat(CONFIG.lingua, { ...opzioni, timeZone: CONFIG.fusoOrario })
    cache.set(nome, f)
  }
  return f
}

/** "10 novembre 2026" */
export const data = (iso: string) => fmt('data', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
/** "18:30" */
export const ora = (iso: string) => fmt('ora', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso))

export function slugify(testo: string): string {
  return testo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Converte un timestamptz in valore per <input type="datetime-local"> (ora del fuso della config). */
export function aInputLocale(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const parti = new Intl.DateTimeFormat('sv-SE', {
    timeZone: CONFIG.fusoOrario,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d)
  return parti.replace(' ', 'T')
}

/** Converte il valore di <input type="datetime-local"> (ora del fuso della config) in ISO. */
export function daInputLocale(valore: string): string {
  // Calcola lo scostamento del fuso per quella data (gestisce l'ora legale).
  const comeUtc = new Date(valore + ':00Z')
  const locale = new Date(comeUtc.toLocaleString('en-US', { timeZone: CONFIG.fusoOrario }))
  const utc = new Date(comeUtc.toLocaleString('en-US', { timeZone: 'UTC' }))
  const offset = locale.getTime() - utc.getTime()
  return new Date(comeUtc.getTime() - offset).toISOString()
}

/**
 * Un link che arriva dal database, solo se è sicuro da mettere in un href:
 * https/http, mailto: o tel:. Tutto il resto (es. "javascript:") diventa null.
 */
export function linkSicuro(url: string | null | undefined): string | null {
  const u = url?.trim()
  if (!u) return null
  return /^(https?:\/\/|mailto:|tel:)/i.test(u) ? u : null
}
