import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react'
import { supabase } from './supabase'
import { aInputLocale, daInputLocale, slugify } from '../format'
import { CampoImmagine, Messaggio, Spunta, conferma, erroreLeggibile } from './Campi'
import { EditorTesto } from './EditorTesto'
import type { DefCampo, Raccolta, Riga } from '../tipi'

type Msg = { tipo: 'ok' | 'err'; testo: string } | null

const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SCHEMI = {
  web: { re: /^https:\/\/\S+$/i, errore: 'Il link deve iniziare con https://' },
  http: { re: /^https?:\/\/\S+$/i, errore: 'Il link deve iniziare con https://' },
  contatto: { re: /^(https:\/\/\S+|mailto:\S+@\S+|tel:\+?[\d\s/-]{5,})$/i, errore: 'Usa https://…, mailto:nome@esempio.it oppure tel:+39…' },
}

const vuoto = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')
const visibile = (c: DefCampo, r: Riga) => !c.se || c.se(r)

/** Controlla i campi prima di salvare: restituisce un errore per campo. */
function controlla(campi: DefCampo[], r: Riga): Record<string, string> {
  const errori: Record<string, string> = {}
  for (const c of campi) {
    if (!visibile(c, r) || c.tipo === 'solaLettura') continue
    const v = r[c.k]
    if (c.obbligatorio && vuoto(v)) {
      errori[c.k] = 'Questo campo è obbligatorio.'
      continue
    }
    if (vuoto(v)) continue
    const t = typeof v === 'string' ? v.trim() : ''
    if ((c.tipo === 'testo' || c.tipo === 'testoLungo') && c.max && [...t].length > c.max) errori[c.k] = `Massimo ${c.max} caratteri.`
    if (c.tipo === 'link' && !SCHEMI[c.schemi].re.test(t)) errori[c.k] = SCHEMI[c.schemi].errore
    if (c.tipo === 'slug' && !SLUG.test(t)) errori[c.k] = 'Solo lettere minuscole, numeri e trattini (es. gita-a-roma).'
    if (c.tipo === 'dataOra' && c.dopo) {
      const prima = r[c.dopo]
      if (typeof prima === 'string' && prima && new Date(t).getTime() <= new Date(prima).getTime()) errori[c.k] = 'Deve venire dopo la data di inizio.'
    }
    if (c.tipo === 'numero' && (typeof v !== 'number' || Number.isNaN(v) || (c.min !== undefined && v < c.min)))
      errori[c.k] = c.min !== undefined ? `Scrivi un numero da ${c.min} in su.` : 'Scrivi un numero.'
  }
  return errori
}

/** La riga da mandare al database: solo i campi del modulo, testi ripuliti, vuoti → null. */
function daSalvare(campi: DefCampo[], r: Riga): Riga {
  const out: Riga = {}
  for (const c of campi) {
    if (c.tipo === 'solaLettura') continue
    const v = r[c.k]
    if (typeof v === 'string') {
      const t = c.tipo === 'html' ? v : v.trim()
      out[c.k] = t === '' ? (c.nonNullo ? '' : null) : t
    } else if (c.tipo === 'numero') {
      out[c.k] = typeof v === 'number' && !Number.isNaN(v) ? v : c.k === 'ordine' ? 0 : null
    } else {
      out[c.k] = v ?? (c.nonNullo ? '' : null)
    }
  }
  return out
}

function CampoDinamico({
  c,
  r,
  set,
  errore,
  onSlugToccato,
}: {
  c: DefCampo
  r: Riga
  set: (k: string, v: unknown) => void
  errore?: string
  onSlugToccato: () => void
}) {
  const id = useId()
  const v = r[c.k]
  const testo = typeof v === 'string' ? v : ''
  const descr = [c.aiuto ? `${id}-a` : '', errore ? `${id}-e` : ''].filter(Boolean).join(' ') || undefined
  const comuni = { id, 'aria-invalid': errore ? true : undefined, 'aria-describedby': descr, required: c.obbligatorio }

  if (c.tipo === 'spunta') return <Spunta label={c.etichetta} aiuto={c.aiuto} checked={v === true} onChange={(x) => set(c.k, x)} />
  if (c.tipo === 'immagine')
    return <CampoImmagine label={c.etichetta} aiuto={c.aiuto} valore={(v as string | null) || null} onChange={(u) => set(c.k, u)} cartella={c.cartella} conLink />

  let campo
  switch (c.tipo) {
    case 'testo':
      campo = <input {...comuni} value={testo} maxLength={c.max ? c.max + 20 : undefined} placeholder={c.placeholder} onChange={(e) => set(c.k, e.target.value)} />
      break
    case 'testoLungo':
      campo = <textarea {...comuni} value={testo} rows={c.righe ?? 4} onChange={(e) => set(c.k, e.target.value)} />
      break
    case 'html':
      campo = <EditorTesto valore={testo} onChange={(h) => set(c.k, h)} etichetta={c.etichetta} cartella={c.cartella} />
      break
    case 'dataOra':
      campo = (
        <input {...comuni} type="datetime-local" value={aInputLocale(testo)} onChange={(e) => set(c.k, e.target.value ? daInputLocale(e.target.value) : '')} />
      )
      break
    case 'numero':
      campo = (
        <input
          {...comuni}
          type="number"
          inputMode="decimal"
          min={c.min}
          step={c.passo ?? 1}
          value={typeof v === 'number' ? v : ''}
          onChange={(e) => set(c.k, e.target.value === '' ? null : Number(e.target.value))}
        />
      )
      break
    case 'link':
      campo = (
        <input
          {...comuni}
          type={c.schemi === 'contatto' ? 'text' : 'url'}
          inputMode="url"
          autoCapitalize="off"
          spellCheck={false}
          placeholder={c.placeholder}
          value={testo}
          onChange={(e) => set(c.k, e.target.value)}
        />
      )
      break
    case 'scelta':
      campo = (
        <select {...comuni} value={testo} onChange={(e) => set(c.k, e.target.value)}>
          {c.opzioni.map((o) => (
            <option key={o.valore} value={o.valore}>
              {o.etichetta}
            </option>
          ))}
        </select>
      )
      break
    case 'slug':
      campo = (
        <div className="adm-slug">
          <span aria-hidden="true">{c.prefisso}</span>
          <input
            {...comuni}
            value={testo}
            autoCapitalize="off"
            spellCheck={false}
            onChange={(e) => {
              onSlugToccato()
              set(c.k, slugify(e.target.value) || e.target.value.toLowerCase())
            }}
          />
        </div>
      )
      break
    case 'solaLettura':
      campo = (
        <p id={id} className="adm-sola-lettura">
          {testo}
        </p>
      )
      break
  }

  return (
    <div className="campo">
      {c.tipo === 'html' || c.tipo === 'solaLettura' ? <span className="label">{c.etichetta}</span> : <label htmlFor={id}>{c.etichetta}</label>}
      {campo}
      {c.tipo === 'testoLungo' && c.max && (
        <span className="adm-contatore" aria-hidden="true">
          {[...testo].length}/{c.max}
        </span>
      )}
      {c.aiuto && (
        <span id={`${id}-a`} className="campo__aiuto">
          {c.aiuto}
        </span>
      )}
      {errore && (
        <span id={`${id}-e`} className="campo__errore">
          {errore}
        </span>
      )}
    </div>
  )
}

export type Esito = { azione: 'salvato' | 'eliminato'; riga?: Riga }

/**
 * Modulo per creare o modificare una riga di qualunque raccolta.
 * id = null → nuova riga.
 */
export function Modulo({
  raccolta: R,
  id,
  onFatto,
  onChiudi,
  onSporco,
  messaggio,
}: {
  raccolta: Raccolta
  id: string | null
  onFatto: (e: Esito) => void
  onChiudi: () => void
  /** Avvisa chi contiene il modulo se ci sono modifiche non salvate. */
  onSporco?: (sporco: boolean) => void
  /** Messaggio da mostrare all'apertura (es. dopo la creazione). */
  messaggio?: string
}) {
  const [originale, setOriginale] = useState<Riga | null>(id ? null : R.vuota())
  const [bozza, setBozza] = useState<Riga | null>(id ? null : R.vuota())
  const [nonTrovata, setNonTrovata] = useState(false)
  const [errori, setErrori] = useState<Record<string, string>>({})
  const [msg, setMsg] = useState<Msg>(messaggio ? { tipo: 'ok', testo: messaggio } : null)
  const [salvo, setSalvo] = useState(false)
  const slugToccato = useRef(!!id)
  const titolo = useRef<HTMLHeadingElement>(null)

  useEffect(() => {
    if (!id) return
    let vivo = true
    supabase
      .from(R.tabella)
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!vivo) return
        if (error) return setMsg({ tipo: 'err', testo: erroreLeggibile(error) })
        if (!data) return setNonTrovata(true)
        const riga = data as Riga
        setOriginale(riga)
        setBozza(riga)
      })
    return () => {
      vivo = false
    }
  }, [R, id])

  const sporco = useMemo(() => !!bozza && !!originale && JSON.stringify(bozza) !== JSON.stringify(originale), [bozza, originale])
  // Con le graffe: l'effetto non deve restituire niente (React chiamerebbe il valore come pulizia).
  useEffect(() => {
    onSporco?.(sporco)
  }, [sporco, onSporco])
  useEffect(() => {
    if (!sporco) return
    const f = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [sporco])

  const set = (k: string, v: unknown) => {
    setBozza((b) => {
      if (!b) return b
      const n: Riga = { ...b, [k]: v }
      // L'indirizzo segue il titolo finché non lo si cambia a mano.
      const campoSlug = R.campi.find((c) => c.tipo === 'slug')
      if (campoSlug?.tipo === 'slug' && campoSlug.da === k && !slugToccato.current) n[campoSlug.k] = slugify(typeof v === 'string' ? v : '')
      return n
    })
    setErrori((e) => (e[k] ? { ...e, [k]: '' } : e))
  }

  async function salva(e: FormEvent) {
    e.preventDefault()
    if (!bozza) return
    const err = controlla(R.campi, bozza)
    setErrori(err)
    if (Object.values(err).some(Boolean)) {
      setMsg({ tipo: 'err', testo: 'Controlla i campi segnati in rosso.' })
      return
    }
    setSalvo(true)
    setMsg(null)
    const riga = daSalvare(R.campi, bozza)
    const r = id
      ? await supabase.from(R.tabella).update(riga).eq('id', id).select().single()
      : await supabase.from(R.tabella).insert(riga).select().single()
    setSalvo(false)
    if (r.error) return setMsg({ tipo: 'err', testo: erroreLeggibile(r.error) })
    const salvata = r.data as Riga
    setOriginale(salvata)
    setBozza(salvata)
    const nascosta = R.visibile && salvata[R.visibile] === false
    setMsg({ tipo: 'ok', testo: nascosta ? 'Salvato. È nascosto: sul sito non si vede.' : 'Salvato. È già sul sito.' })
    onFatto({ azione: 'salvato', riga: salvata })
  }

  async function elimina() {
    if (!id || !bozza) return
    if (!conferma(`“${R.titolo(bozza)}”`)) return
    const { error } = await supabase.from(R.tabella).delete().eq('id', id)
    if (error) return setMsg({ tipo: 'err', testo: erroreLeggibile(error) })
    onSporco?.(false)
    onFatto({ azione: 'eliminato' })
  }

  function chiudi() {
    if (sporco && !window.confirm('Ci sono modifiche non salvate. Vuoi uscire lo stesso?')) return
    onSporco?.(false)
    onChiudi()
  }

  if (nonTrovata)
    return (
      <div className="adm-card">
        <p>Non troviamo questo elemento: forse è stato eliminato.</p>
        <button className="adm-btn adm-btn--sec" onClick={onChiudi}>
          Torna indietro
        </button>
      </div>
    )
  if (!bozza)
    return (
      <>
        <Messaggio m={msg} />
        <p role="status">Carico…</p>
      </>
    )

  const anteprima = R.anteprima?.(bozza)
  const linkSito = id && R.pagina && originale ? (typeof R.pagina === 'function' ? R.pagina(originale) : R.pagina) : null

  return (
    <form className="adm-modulo" onSubmit={salva} noValidate>
      <h2 ref={titolo} tabIndex={-1}>
        {id ? `Modifica: ${R.titolo(bozza)}` : R.nuovo}
      </h2>
      {id && originale && R.intestazione?.(originale)}
      <div className="adm-card adm-form">
        {R.campi
          .filter((c) => visibile(c, bozza))
          .map((c) => (
            <CampoDinamico key={c.k} c={c} r={bozza} set={set} errore={errori[c.k] || undefined} onSlugToccato={() => (slugToccato.current = true)} />
          ))}
      </div>

      {anteprima && (
        <div className="adm-anteprima">
          <p className="adm-anteprima__etichetta">Anteprima</p>
          {/* inert: i link dell'anteprima non si cliccano. */}
          <div inert style={{ maxWidth: '34rem' }}>
            {anteprima}
          </div>
        </div>
      )}

      <div className="adm-barra-salva">
        <Messaggio m={msg} />
        <div className="adm-azioni">
          <button className="adm-btn" type="submit" disabled={salvo || (!!id && !sporco)}>
            {salvo ? 'Salvo…' : id && !sporco ? 'Salvato' : 'Salva'}
          </button>
          <button className="adm-btn adm-btn--sec" type="button" onClick={chiudi}>
            {sporco ? 'Annulla' : 'Chiudi'}
          </button>
          {linkSito && (
            <a className="adm-btn adm-btn--sec" href={linkSito} target="_blank" rel="noopener">
              Vedi sul sito
            </a>
          )}
          {id && (
            <button className="adm-btn adm-btn--peric adm-spingi" type="button" onClick={elimina}>
              Elimina
            </button>
          )}
        </div>
      </div>
    </form>
  )
}
