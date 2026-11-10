import { useId, useState, type ReactNode } from 'react'
import { immagineCompleta } from '../pubblico/media'
import { CONFIG } from '../config'
import { caricaImmagine } from './immagini'

export function Campo({
  label,
  aiuto,
  children,
  id,
}: {
  label: string
  aiuto?: ReactNode
  children: ReactNode
  id: string
}) {
  return (
    <div className="campo">
      <label htmlFor={id}>{label}</label>
      {children}
      {aiuto && <span className="campo__aiuto">{aiuto}</span>}
    </div>
  )
}

export function Spunta({
  label,
  aiuto,
  checked,
  onChange,
}: {
  label: string
  aiuto?: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  const id = useId()
  return (
    <label className="adm-check" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>
        {label}
        {aiuto && <small>{aiuto}</small>}
      </span>
    </label>
  )
}

/** Campo immagine: carica dal dispositivo (ridimensionando) e, con conLink, anche da un link https. */
export function CampoImmagine({
  label,
  valore,
  onChange,
  cartella,
  aiuto,
  conLink = false,
}: {
  label: string
  valore: string | null
  onChange: (url: string | null) => void
  cartella: string
  aiuto?: string
  conLink?: boolean
}) {
  const id = useId()
  const [carico, setCarico] = useState(false)
  const [errore, setErrore] = useState('')
  const [link, setLink] = useState('')

  function usaLink() {
    const url = link.trim()
    if (!url) return
    if (!/^https:\/\/\S+$/i.test(url)) return setErrore('Il link deve iniziare con https://')
    setErrore('')
    setLink('')
    onChange(url)
  }

  async function scegli(file: File | undefined) {
    if (!file) return
    setErrore('')
    setCarico(true)
    try {
      onChange(await caricaImmagine(file, cartella))
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Caricamento non riuscito.')
    } finally {
      setCarico(false)
    }
  }

  return (
    <div className="campo adm-img">
      <span className="label" id={`${id}-l`}>
        {label}
      </span>
      {valore && (
        <img
          src={immagineCompleta(valore) ?? undefined}
          alt="Anteprima dell’immagine scelta"
          referrerPolicy="no-referrer"
          onError={() => setErrore('Non riusciamo a mostrare questa immagine. Se viene da un link, il sito che la ospita potrebbe bloccarla: meglio salvarla e caricarla dal dispositivo.')}
        />
      )}
      <div className="adm-azioni">
        <label className="adm-btn adm-btn--sec" htmlFor={id} style={{ cursor: 'pointer' }}>
          {carico ? 'Carico…' : valore ? 'Cambia immagine' : 'Carica immagine'}
        </label>
        <input
          id={id}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-labelledby={`${id}-l`}
          disabled={carico}
          onChange={(e) => {
            scegli(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        {valore && (
          <button
            type="button"
            className="adm-btn adm-btn--peric"
            onClick={() => {
              setErrore('')
              onChange(null)
            }}
          >
            Togli immagine
          </button>
        )}
      </div>
      {conLink && (
        <>
          <label htmlFor={`${id}-link`}>Oppure incolla il link di un’immagine</label>
          <input
            id={`${id}-link`}
            type="url"
            inputMode="url"
            placeholder="https://"
            pattern="https://.*"
            title="Il link deve iniziare con https://"
            value={link}
            onChange={(e) => {
              setLink(e.target.value)
              setErrore('')
            }}
            onBlur={usaLink}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return
              e.preventDefault()
              usaLink()
            }}
          />
        </>
      )}
      <span className="campo__aiuto">
        {aiuto ?? `JPG, PNG o WebP. La ridimensioniamo noi (max ${CONFIG.immagini.latoMax} px) prima di caricarla.`}
      </span>
      {errore && (
        <span className="campo__errore" role="alert">
          {errore}
        </span>
      )}
    </div>
  )
}

export function Messaggio({ m }: { m: { tipo: 'ok' | 'err'; testo: string } | null }) {
  if (!m) return null
  return (
    <p className={`adm-msg adm-msg--${m.tipo}`} role={m.tipo === 'err' ? 'alert' : 'status'}>
      {m.testo}
    </p>
  )
}

export function conferma(cosa: string): boolean {
  return window.confirm(`Vuoi davvero eliminare ${cosa}? Non si può annullare.`)
}

/** Traduce gli errori di Supabase in frasi comprensibili. */
export function erroreLeggibile(e: { code?: string; message?: string } | null | undefined): string {
  if (!e) return 'Qualcosa non ha funzionato. Riprova.'
  if (e.code === '23505') return 'Esiste già un elemento con questo indirizzo (slug). Cambialo e riprova.'
  if (e.code === '23514') return 'Uno dei campi non rispetta le regole (lunghezza o formato). Controlla e riprova.'
  if (e.code === '23502') return 'Manca un campo obbligatorio. Controlla e riprova.'
  if (e.code === '23503') return 'Non si può: è collegato ad altri dati (per esempio un elemento usato da altri contenuti, o non più esistente). Ricarica e riprova.'
  if (e.code === '42501') return 'Non hai i permessi per questa operazione. Prova a uscire e rientrare.'
  if (e.code === 'PGRST301' || e.code === 'PGRST303') return 'La sessione è scaduta. Esci e rientra.'
  return 'Salvataggio non riuscito. Controlla la connessione e riprova.'
}
