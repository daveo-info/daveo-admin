import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { supabase } from '../admin/supabase'
import { CONFIG, EVENTO_AGGIORNA, RACCOLTE, raccolta, voceTesto } from '../config'
import { Modulo, type Esito } from '../admin/Modulo'
import { ModuloTesto } from '../admin/TestiAdmin'
import { useAccesso } from '../admin/sessione'
import { impostaModifica, modificaAttiva } from '../admin/modificaSito'
import { applicaTema } from '../admin/tema'
import '../admin/base.css'
import '../admin/admin.css'
import './modifica.css'

/*
  Modalità modifica: caricata solo se nel browser c'è una sessione, e mostrata
  solo agli editor. Gli elementi del sito con data-modifica="raccolta:id" (o
  "testi:chiave") diventano cliccabili e si aprono in un cassetto con lo stesso
  modulo del pannello. I permessi veri restano quelli delle policy RLS.
  Origine: src/modifica/Modifica.tsx di vini-vidi-virgi (tolto il caso "foto:",
  specifico di VVV; il resto della pagina da bloccare viene dalla config).
*/
applicaTema()

type Apertura = { tipo: 'riga'; raccolta: string; id: string | null } | { tipo: 'testo'; chiave: string }

const SELETTORE = '[data-modifica]'
const FOCUSABILE = 'a[href], button, input, select, textarea, summary, [tabindex]'

function interpreta(spec: string | null): Apertura | null {
  if (!spec) return null
  const i = spec.indexOf(':')
  if (i < 1) return null
  const tipo = spec.slice(0, i)
  const valore = spec.slice(i + 1)
  if (tipo === 'testi') return voceTesto(valore) ? { tipo: 'testo', chiave: valore } : null
  return raccolta(tipo) ? { tipo: 'riga', raccolta: tipo, id: valore } : null
}

/** Rende raggiungibili da tastiera anche gli elementi modificabili che non lo sono (titoli, paragrafi). */
function useTastiera(attiva: boolean) {
  useEffect(() => {
    if (!attiva) return
    const segna = () => {
      document.querySelectorAll<HTMLElement>(SELETTORE).forEach((el) => {
        if (!el.matches(FOCUSABILE)) {
          el.tabIndex = 0
          el.dataset.vvmTab = '1'
        }
      })
    }
    segna()
    const mo = new MutationObserver(segna)
    mo.observe(document.body, { childList: true, subtree: true })
    return () => {
      mo.disconnect()
      document.querySelectorAll<HTMLElement>('[data-vvm-tab]').forEach((el) => {
        el.removeAttribute('tabindex')
        delete el.dataset.vvmTab
      })
    }
  }, [attiva])
}

function Cassetto({ a, onChiudi }: { a: Apertura; onChiudi: () => void }) {
  const sporco = useRef(false)
  const box = useRef<HTMLDivElement>(null)
  const setSporco = useCallback((s: boolean) => {
    sporco.current = s
  }, [])
  const avvisaSito = () => window.dispatchEvent(new Event(EVENTO_AGGIORNA))

  const chiudi = useCallback(() => {
    if (sporco.current && !window.confirm('Ci sono modifiche non salvate. Vuoi chiudere lo stesso?')) return
    onChiudi()
  }, [onChiudi])

  // Il resto della pagina non si raggiunge finché il cassetto è aperto; Esc chiude.
  useEffect(() => {
    const prima = document.activeElement as HTMLElement | null
    const resto = document.querySelectorAll<HTMLElement>(CONFIG.modifica.bloccaFuori)
    resto.forEach((el) => (el.inert = true))
    document.documentElement.classList.add('vvm-bloccato')
    box.current?.querySelector<HTMLElement>('h2, input, textarea')?.focus()
    const tasti = (e: KeyboardEvent) => e.key === 'Escape' && chiudi()
    document.addEventListener('keydown', tasti)
    return () => {
      document.removeEventListener('keydown', tasti)
      resto.forEach((el) => (el.inert = false))
      document.documentElement.classList.remove('vvm-bloccato')
      prima?.focus?.()
    }
  }, [chiudi])

  const R = a.tipo === 'riga' ? raccolta(a.raccolta) : undefined
  const onFatto = (e: Esito) => {
    avvisaSito()
    if (e.azione === 'eliminato') onChiudi()
  }

  return (
    <div className="vvm-sfondo" onClick={(e) => e.target === e.currentTarget && chiudi()}>
      <div ref={box} className="adm vvm-cassetto" role="dialog" aria-modal="true" aria-label="Modifica">
        <button type="button" className="vvm-chiudi" onClick={chiudi} aria-label="Chiudi">
          ×
        </button>
        {a.tipo === 'testo' && <ModuloTesto chiave={a.chiave} onFatto={avvisaSito} onChiudi={chiudi} onSporco={setSporco} />}
        {a.tipo === 'riga' && R && <Modulo raccolta={R} id={a.id} onFatto={onFatto} onChiudi={chiudi} onSporco={setSporco} />}
      </div>
    </div>
  )
}

/** true se la pagina della raccolta (solo se è un indirizzo fisso) è quella in cui sei. */
const suPagina = (pagina: string | ((r: never) => string) | undefined, pathname: string) => typeof pagina === 'string' && pathname.startsWith(pagina)

function Barra() {
  const { pathname } = useLocation()
  const [attiva, setAttiva] = useState(modificaAttiva)
  const [aperto, setAperto] = useState<Apertura | null>(null)
  const [menu, setMenu] = useState(false)

  const cambia = (v: boolean) => {
    impostaModifica(v)
    setAttiva(v)
  }

  useEffect(() => {
    document.documentElement.classList.toggle('vvm-attiva', attiva)
    return () => document.documentElement.classList.remove('vvm-attiva')
  }, [attiva])
  useTastiera(attiva)

  // Clic (e Invio) su un elemento modificabile: si apre il cassetto invece del link.
  useEffect(() => {
    if (!attiva) return
    const bersaglio = (t: EventTarget | null) => {
      const el = t instanceof Element ? t : null
      if (!el || el.closest('.vvm-barra, .vvm-sfondo')) return null
      return el.closest<HTMLElement>(SELETTORE)
    }
    const clic = (e: MouseEvent) => {
      const el = bersaglio(e.target)
      if (!el) return
      const a = interpreta(el.dataset.modifica ?? null)
      if (!a) return
      e.preventDefault()
      e.stopPropagation()
      setAperto(a)
    }
    const tasto = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' && e.key !== ' ') return
      const el = bersaglio(e.target)
      // Solo se il focus è proprio sull'elemento (non su un campo al suo interno).
      if (!el || el !== e.target) return
      const a = interpreta(el.dataset.modifica ?? null)
      if (!a) return
      e.preventDefault()
      setAperto(a)
    }
    document.addEventListener('click', clic, true)
    document.addEventListener('keydown', tasto, true)
    return () => {
      document.removeEventListener('click', clic, true)
      document.removeEventListener('keydown', tasto, true)
    }
  }, [attiva])

  // Le raccolte della pagina in cui sei vengono prima nel menu "Nuovo".
  const creabili = RACCOLTE.filter((r) => r.creabile !== false).sort(
    (x, y) => Number(suPagina(y.pagina, pathname)) - Number(suPagina(x.pagina, pathname)),
  )

  return (
    <>
      <div className="vvm-barra" role="region" aria-label="Modalità modifica">
        <button type="button" className={`vvm-btn${attiva ? ' is-on' : ''}`} aria-pressed={attiva} onClick={() => cambia(!attiva)}>
          ✎ Modifica {attiva ? 'ON' : 'OFF'}
        </button>
        <div className="vvm-nuovo">
          <button type="button" className="vvm-btn" aria-expanded={menu} onClick={() => setMenu((m) => !m)}>
            + Nuovo
          </button>
          {menu && (
            <ul className="vvm-menu">
              {creabili.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setMenu(false)
                      setAperto({ tipo: 'riga', raccolta: r.id, id: null })
                    }}
                  >
                    {r.nuovo}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Link className="vvm-btn" to="/admin">
          Pannello
        </Link>
        <button
          type="button"
          className="vvm-btn"
          onClick={() => {
            impostaModifica(false)
            void supabase.auth.signOut()
          }}
        >
          Esci
        </button>
      </div>
      {attiva && <p className="vvm-suggerimento">Tocca un testo o un contenuto per modificarlo.</p>}
      {aperto && <Cassetto a={aperto} onChiudi={() => setAperto(null)} />}
    </>
  )
}

export default function Modifica() {
  const a = useAccesso()
  // Gli altri (sessione scaduta, non editor, password da cambiare) non vedono niente.
  if (a.stato !== 'editor') return null
  return <Barra />
}
