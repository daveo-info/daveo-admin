import { useEffect } from 'react'
import { CONFIG } from '../config'

/*
  Origine: src/components/Seo.tsx di vini-vidi-virgi. L'area editor usava Seo
  solo per il titolo della scheda e per "noindex": qui resta solo quello.
*/
export function TitoloAdmin({ titolo }: { titolo: string }) {
  useEffect(() => {
    document.title = `${titolo} | ${CONFIG.nomeSito}`
    let el = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]')
    const prima = el?.content
    if (!el) {
      el = document.createElement('meta')
      el.name = 'robots'
      document.head.appendChild(el)
    }
    el.content = 'noindex, nofollow'
    return () => {
      if (prima === undefined) el?.remove()
      else if (el) el.content = prima
    }
  }, [titolo])
  return null
}
