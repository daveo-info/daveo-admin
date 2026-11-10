import { useEffect, useId, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { supabase } from './supabase'
import { CATALOGO_TESTI, voceTesto } from '../config'
import type { VoceTesto } from '../tipi'
import { Messaggio, erroreLeggibile } from './Campi'
import { EditorTesto } from './EditorTesto'

type Msg = { tipo: 'ok' | 'err'; testo: string } | null
const VOCI = Object.entries(CATALOGO_TESTI) as [string, VoceTesto][]

/** Testo semplice in anteprima: senza tag. DOMParser non esegue script e non carica immagini. */
const semplice = (html: string) => new DOMParser().parseFromString(html, 'text/html').body.textContent?.trim() ?? ''

/** Modifica di un testo della pagina. Salvare il testo originale elimina la riga (si torna al predefinito). */
export function ModuloTesto({
  chiave,
  onFatto,
  onChiudi,
  onSporco,
}: {
  chiave: string
  onFatto: () => void
  onChiudi: () => void
  onSporco?: (s: boolean) => void
}) {
  const voce = voceTesto(chiave)
  const id = useId()
  const [originale, setOriginale] = useState<string | null>(null)
  const [valore, setValore] = useState<string | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [salvo, setSalvo] = useState(false)

  useEffect(() => {
    if (!voce) return
    let vivo = true
    supabase
      .from('testi')
      .select('valore')
      .eq('chiave', chiave)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) return setMsg({ tipo: 'err', testo: erroreLeggibile(error) })
        const v = (data as { valore: string } | null)?.valore ?? voce.predefinito
        setOriginale(v)
        setValore(v)
      })
    return () => {
      vivo = false
    }
  }, [chiave, voce])

  const sporco = valore !== null && valore !== originale
  // Con le graffe: l'effetto non deve restituire niente (React chiamerebbe il valore come pulizia).
  useEffect(() => {
    onSporco?.(sporco)
  }, [sporco, onSporco])

  if (!voce) return <p>Questo testo non esiste più.</p>

  async function salva(e: FormEvent) {
    e.preventDefault()
    if (valore === null || !voce) return
    const v = voce.ricco ? valore : valore.trim()
    if (voce.max && [...v].length > voce.max) return setMsg({ tipo: 'err', testo: `Massimo ${voce.max} caratteri.` })
    if (!voce.ricco && !v && voce.predefinito) return setMsg({ tipo: 'err', testo: 'Il testo non può essere vuoto. Per tornare all’originale usa “Ripristina”.' })
    setSalvo(true)
    setMsg(null)
    // Uguale al predefinito: nessuna riga, così se un domani cambia il predefinito si aggiorna da solo.
    const r =
      v === voce.predefinito
        ? await supabase.from('testi').delete().eq('chiave', chiave)
        : await supabase.from('testi').upsert({ chiave, valore: v }, { onConflict: 'chiave' })
    setSalvo(false)
    if (r.error) return setMsg({ tipo: 'err', testo: erroreLeggibile(r.error) })
    setOriginale(v)
    setValore(v)
    setMsg({ tipo: 'ok', testo: 'Salvato. È già sul sito.' })
    onFatto()
  }

  function ripristina() {
    if (!voce) return
    setValore(voce.predefinito)
    setMsg({ tipo: 'ok', testo: 'Rimesso il testo originale: premi Salva per confermare.' })
  }

  function chiudi() {
    if (sporco && !window.confirm('Ci sono modifiche non salvate. Vuoi uscire lo stesso?')) return
    onSporco?.(false)
    onChiudi()
  }

  return (
    <form className="adm-modulo" onSubmit={salva} noValidate>
      <h2>
        {voce.pagina}: {voce.etichetta}
      </h2>
      <div className="adm-card adm-form">
        {valore === null ? (
          <p role="status">Carico…</p>
        ) : voce.ricco ? (
          <div className="campo">
            <span className="label">Testo</span>
            <EditorTesto valore={valore} onChange={setValore} etichetta={voce.etichetta} cartella="pagine" />
          </div>
        ) : (
          <div className="campo">
            <label htmlFor={id}>Testo</label>
            <textarea id={id} rows={Math.min(8, Math.max(2, Math.ceil((voce.max ?? 200) / 120)))} value={valore} onChange={(e) => setValore(e.target.value)} />
            {voce.max && (
              <span className="adm-contatore" aria-hidden="true">
                {[...valore].length}/{voce.max}
              </span>
            )}
          </div>
        )}
        {valore !== null && valore !== voce.predefinito && (
          <details className="adm-originale">
            <summary>Testo originale</summary>
            <p>{voce.ricco ? semplice(voce.predefinito) || '(vuoto)' : voce.predefinito || '(vuoto)'}</p>
          </details>
        )}
      </div>
      <div className="adm-barra-salva">
        <Messaggio m={msg} />
        <div className="adm-azioni">
          <button className="adm-btn" type="submit" disabled={salvo || !sporco}>
            {salvo ? 'Salvo…' : sporco ? 'Salva' : 'Salvato'}
          </button>
          <button className="adm-btn adm-btn--sec" type="button" onClick={chiudi}>
            {sporco ? 'Annulla' : 'Chiudi'}
          </button>
          {valore !== null && valore !== voce.predefinito && (
            <button className="adm-btn adm-btn--sec adm-spingi" type="button" onClick={ripristina}>
              Ripristina l’originale
            </button>
          )}
        </div>
      </div>
    </form>
  )
}

/** /admin/testi: tutti i testi delle pagine, raggruppati per pagina. /admin/testi/:chiave → modulo. */
export function TestiAdmin() {
  const { chiave } = useParams()
  const navigate = useNavigate()
  const [cambiati, setCambiati] = useState<Record<string, string> | null>(null)

  const carica = () =>
    supabase
      .from('testi')
      .select('chiave, valore')
      .then(({ data }) => setCambiati(Object.fromEntries(((data ?? []) as { chiave: string; valore: string }[]).map((r) => [r.chiave, r.valore]))))
  useEffect(() => {
    void carica()
  }, [chiave])

  const pagine = useMemo(() => {
    const m = new Map<string, [string, VoceTesto][]>()
    for (const v of VOCI) m.set(v[1].pagina, [...(m.get(v[1].pagina) ?? []), v])
    return [...m.entries()]
  }, [])

  if (chiave)
    return (
      <>
        <Link className="adm-indietro" to="/admin/testi">
          ← Testi del sito
        </Link>
        <ModuloTesto key={chiave} chiave={chiave} onFatto={() => void carica()} onChiudi={() => navigate('/admin/testi')} />
      </>
    )

  return (
    <>
      <div className="adm-testa">
        <h1>Testi del sito</h1>
      </div>
      <p className="adm-aiuto">
        Titoli e introduzioni delle pagine. Puoi cambiarli anche direttamente sul sito: “Modifica sul sito”, poi tocca il testo.
      </p>
      {pagine.map(([pagina, voci]) => (
        <section key={pagina} className="adm-gruppo" aria-labelledby={`tg-${pagina}`}>
          <h2 id={`tg-${pagina}`}>{pagina}</h2>
          <ul className="adm-lista">
            {voci.map(([k, v]) => {
              const attuale = cambiati?.[k] ?? v.predefinito
              const mostra = v.ricco ? semplice(attuale) : attuale
              return (
                <li key={k}>
                  <Link className="adm-lista__info" to={`/admin/testi/${k}`}>
                    <span className="adm-lista__titolo">{v.etichetta}</span>
                    <span className="adm-lista__meta adm-taglia">{mostra || '(vuoto, non si vede)'}</span>
                  </Link>
                  {cambiati && k in cambiati && <span className="adm-stato adm-stato--evid">Modificato</span>}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </>
  )
}
