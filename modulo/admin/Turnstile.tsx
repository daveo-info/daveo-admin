import { useEffect, useRef } from 'react'
import { CONFIG } from '../config'

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opzioni: Record<string, unknown>) => string
      reset: (id?: string) => void
      remove: (id?: string) => void
    }
  }
}

const SCRIPT = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
let caricamento: Promise<void> | null = null

function caricaScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve()
  caricamento ??= new Promise((ok, ko) => {
    const s = document.createElement('script')
    s.src = SCRIPT
    s.async = true
    s.onload = () => ok()
    s.onerror = () => {
      caricamento = null
      ko(new Error('turnstile'))
    }
    document.head.appendChild(s)
  })
  return caricamento
}

type Props = {
  onToken: (token: string | null) => void
  onErrore: () => void
  /** Cambia questo valore per chiedere un nuovo controllo (dopo un invio). */
  resetKey: number
  /** Nome dell'azione (es. "login"): il server controlla che il token venga proprio da questo modulo. */
  azione?: string
}

/** Il controllo anti-bot di Cloudflare. Carica lo script solo su questa pagina. */
export function Turnstile({ onToken, onErrore, resetKey, azione }: Props) {
  const box = useRef<HTMLDivElement>(null)
  const widget = useRef<string | null>(null)
  const chiave = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined

  useEffect(() => {
    if (!chiave) return
    let vivo = true
    const avvia = () =>
      caricaScript()
        .then(() => {
          if (!vivo || !box.current || !window.turnstile) return
          widget.current = window.turnstile.render(box.current, {
            sitekey: chiave,
            ...(azione ? { action: azione } : {}),
            language: CONFIG.lingua.slice(0, 2),
            theme: 'light',
            appearance: 'always',
            // Il formato normale è largo 300px: nei telefoni piccoli non ci starebbe.
            size: box.current.clientWidth < 300 ? 'compact' : 'normal',
            callback: (t: string) => onToken(t),
            'expired-callback': () => onToken(null),
            'error-callback': () => {
              onToken(null)
              onErrore()
            },
          })
        })
        .catch(() => vivo && onErrore())

    // Il controllo pesa quasi 2 MB: si scarica solo quando il modulo sta per entrare nello schermo.
    const vedetta = new IntersectionObserver(
      (voci) => {
        if (voci.some((v) => v.isIntersecting)) {
          vedetta.disconnect()
          void avvia()
        }
      },
      { rootMargin: '400px 0px' },
    )
    if (box.current) vedetta.observe(box.current)

    return () => {
      vivo = false
      vedetta.disconnect()
      if (widget.current) window.turnstile?.remove(widget.current)
      widget.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chiave])

  useEffect(() => {
    if (resetKey > 0 && widget.current) {
      onToken(null)
      window.turnstile?.reset(widget.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetKey])

  if (!chiave) return <p className="campo__errore">Controllo anti-spam non configurato (manca VITE_TURNSTILE_SITE_KEY).</p>
  return <div ref={box} className="turnstile-box" />
}
