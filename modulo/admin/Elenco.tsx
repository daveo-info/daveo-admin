import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useLocation, useNavigate, useParams } from 'react-router'
import { supabase } from './supabase'
import { raccolta } from '../config'
import type { Raccolta, Riga } from '../tipi'
import { Messaggio, erroreLeggibile } from './Campi'
import { Modulo } from './Modulo'

type Msg = { tipo: 'ok' | 'err'; testo: string } | null

function Lista({ R }: { R: Raccolta }) {
  const [righe, setRighe] = useState<Riga[] | null>(null)
  const [msg, setMsg] = useState<Msg>(null)
  const [cerca, setCerca] = useState('')
  const [filtro, setFiltro] = useState<string>('Tutti')

  const carica = useCallback(async () => {
    let q = supabase.from(R.tabella).select('*')
    for (const o of R.ordine) q = q.order(o.col, { ascending: o.asc })
    const { data, error } = await q.limit(500)
    if (error) return setMsg({ tipo: 'err', testo: erroreLeggibile(error) })
    setRighe((data ?? []) as Riga[])
  }, [R])

  useEffect(() => {
    setRighe(null)
    setCerca('')
    setFiltro('Tutti')
    void carica()
  }, [R, carica])

  async function cambiaVisibile(r: Riga) {
    if (!R.visibile || !r.id) return
    const nuovo = !r[R.visibile]
    setRighe((l) => l?.map((x) => (x.id === r.id ? { ...x, [R.visibile!]: nuovo } : x)) ?? l)
    const { error } = await supabase.from(R.tabella).update({ [R.visibile]: nuovo }).eq('id', r.id)
    if (error) {
      setMsg({ tipo: 'err', testo: erroreLeggibile(error) })
      void carica()
    }
  }

  const filtri = [{ etichetta: 'Tutti', vale: () => true }, ...(R.filtri ?? [])]
  if (R.visibile) filtri.push({ etichetta: 'Nascosti', vale: (r: Riga) => r[R.visibile!] === false })
  const scelto = filtri.find((f) => f.etichetta === filtro) ?? filtri[0]!

  const visibili = useMemo(() => {
    const t = cerca.trim().toLowerCase()
    return (righe ?? []).filter((r) => scelto.vale(r) && (!t || `${R.titolo(r)} ${R.sottotitolo?.(r) ?? ''}`.toLowerCase().includes(t)))
  }, [righe, cerca, scelto, R])

  return (
    <>
      <div className="adm-testa">
        <h1>{R.plurale}</h1>
        {R.creabile !== false && (
          <Link className="adm-btn" to={`/admin/r/${R.id}/nuovo`}>
            + {R.nuovo}
          </Link>
        )}
      </div>
      {R.aiuto && <p className="adm-aiuto">{R.aiuto}</p>}
      {R.strumenti && <div className="adm-azioni">{R.strumenti}</div>}
      <Messaggio m={msg} />

      <div className="adm-strumenti">
        <input type="search" aria-label={`Cerca in ${R.plurale}`} placeholder="Cerca…" value={cerca} onChange={(e) => setCerca(e.target.value)} />
        {filtri.length > 1 && (
          <div className="adm-chips" role="group" aria-label="Filtra">
            {filtri.map((f) => (
              <button key={f.etichetta} type="button" aria-pressed={f.etichetta === scelto.etichetta} onClick={() => setFiltro(f.etichetta)}>
                {f.etichetta}
              </button>
            ))}
          </div>
        )}
      </div>

      {righe === null ? (
        <p role="status">Carico…</p>
      ) : visibili.length === 0 ? (
        <div className="adm-vuoto">
          <p>{righe.length === 0 ? 'Ancora niente qui.' : 'Nessun risultato.'}</p>
          {righe.length === 0 && R.creabile !== false && (
            <Link className="adm-btn" to={`/admin/r/${R.id}/nuovo`}>
              + {R.nuovo}
            </Link>
          )}
        </div>
      ) : (
        <ul className="adm-lista">
          {visibili.map((r) => {
            const img = R.immagine?.(r)
            const nascosta = R.visibile ? r[R.visibile] === false : false
            const etichetta = R.etichetta?.(r)
            return (
              <li key={String(r.id)} className={nascosta ? 'is-nascosta' : ''}>
                {R.immagine && <span className="adm-lista__img">{img ? <img src={img} alt="" loading="lazy" /> : null}</span>}
                <Link className="adm-lista__info" to={`/admin/r/${R.id}/${r.id}`}>
                  <span className="adm-lista__titolo">
                    {etichetta && <span className="adm-etichetta">{etichetta}</span>}
                    {R.titolo(r)}
                  </span>
                  {R.sottotitolo && <span className="adm-lista__meta">{R.sottotitolo(r)}</span>}
                </Link>
                {R.visibile && (
                  <button
                    type="button"
                    className={`adm-stato ${nascosta ? '' : 'adm-stato--on'}`}
                    onClick={() => cambiaVisibile(r)}
                    aria-label={`${nascosta ? 'Nascosto' : 'Visibile'}: tocca per ${nascosta ? 'mostrarlo' : 'nasconderlo'} sul sito`}
                  >
                    {nascosta ? 'Nascosto' : 'Visibile'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}

/** /admin/r/:raccolta → elenco; /admin/r/:raccolta/:id → modulo (id "nuovo" = nuova riga). */
export function PaginaRaccolta() {
  const { raccolta: nome, id } = useParams()
  const navigate = useNavigate()
  const appenaCreato = (useLocation().state as { creato?: boolean } | null)?.creato === true
  const R = raccolta(nome)
  if (!R) return <Navigate to="/admin" replace />
  if (!id) return <Lista R={R} />
  if (id === 'nuovo' && R.creabile === false) return <Navigate to={`/admin/r/${R.id}`} replace />
  return (
    <>
      <Link className="adm-indietro" to={`/admin/r/${R.id}`}>
        ← {R.plurale}
      </Link>
      <Modulo
        key={id}
        raccolta={R}
        id={id === 'nuovo' ? null : id}
        messaggio={appenaCreato ? 'Creato. È già sul sito, se è visibile.' : undefined}
        onChiudi={() => navigate(`/admin/r/${R.id}`)}
        onFatto={(e) => {
          if (e.azione === 'eliminato') navigate(`/admin/r/${R.id}`, { replace: true })
          // Dopo il primo salvataggio la riga nuova ha un id: l'indirizzo diventa il suo.
          else if (id === 'nuovo' && e.riga?.id) navigate(`/admin/r/${R.id}/${e.riga.id}`, { replace: true, state: { creato: true } })
        }}
      />
    </>
  )
}
