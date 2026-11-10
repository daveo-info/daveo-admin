import type { CSSProperties } from 'react'
import { CATALOGO_TESTI, type ChiaveTesto } from '../config'
import { useTesto } from './testi'
import { pulisci } from './sanitize'

type Props = {
  k: ChiaveTesto
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span' | 'div' | 'strong'
  className?: string
  id?: string
  style?: CSSProperties
}

/**
 * Un testo della pagina modificabile dagli editor (catalogo in admin.config.ts).
 * Finché non si sa se è stato cambiato resta invisibile, così non "salta".
 * data-modifica serve alla modalità modifica per sapere cosa aprire al clic.
 */
export function Testo({ k, as: Tag = 'p', className, id, style }: Props) {
  const { testo, pronto } = useTesto(k)
  const nascosto: CSSProperties | undefined = pronto ? style : { ...style, visibility: 'hidden' }
  if (pronto && !testo.trim()) return null
  if ((CATALOGO_TESTI[k] as { ricco?: boolean }).ricco) {
    return (
      <div
        className={className ?? 'prosa'}
        id={id}
        style={nascosto}
        data-modifica={`testi:${k}`}
        dangerouslySetInnerHTML={{ __html: pulisci(testo) }}
      />
    )
  }
  return (
    <Tag className={className} id={id} style={nascosto} data-modifica={`testi:${k}`}>
      {testo}
    </Tag>
  )
}
