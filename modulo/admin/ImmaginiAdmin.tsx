import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { CONFIG, RACCOLTE } from '../config'
import { BUCKET, caricaImmagine, formatoPeso } from './immagini'
import { Messaggio, conferma } from './Campi'

type File = { percorso: string; url: string; nome: string }

/** Cartelle del bucket: quelle dei campi immagine e html delle raccolte, più "pagine" (testi del sito) e "generale" (caricate da qui). */
const CARTELLE = [
  ...new Set([
    ...RACCOLTE.flatMap((r) => r.campi.flatMap((c) => (c.tipo === 'immagine' || c.tipo === 'html' ? [c.cartella] : []))),
    'pagine',
    'generale',
  ]),
]

export function ImmaginiAdmin() {
  const [files, setFiles] = useState<File[] | null>(null)
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'err'; testo: string } | null>(null)
  const [carico, setCarico] = useState(false)

  const carica = async () => {
    const tutte: File[] = []
    for (const c of CARTELLE) {
      const { data } = await supabase.storage.from(BUCKET).list(c, { limit: 200, sortBy: { column: 'created_at', order: 'desc' } })
      for (const f of data ?? []) {
        if (!f.id) continue
        const percorso = `${c}/${f.name}`
        tutte.push({ percorso, nome: f.name, url: supabase.storage.from(BUCKET).getPublicUrl(percorso).data.publicUrl })
      }
    }
    setFiles(tutte)
  }
  useEffect(() => {
    carica()
  }, [])

  async function nuova(f: globalThis.File | undefined) {
    if (!f) return
    setCarico(true)
    setMsg(null)
    try {
      await caricaImmagine(f, 'generale')
      setMsg({ tipo: 'ok', testo: 'Immagine caricata. Copia il suo indirizzo per usarla.' })
      carica()
    } catch (e) {
      setMsg({ tipo: 'err', testo: e instanceof Error ? e.message : 'Caricamento non riuscito.' })
    } finally {
      setCarico(false)
    }
  }

  async function elimina(f: File) {
    if (!conferma('questa immagine (se è usata in un contenuto, lì non si vedrà più)')) return
    const { error } = await supabase.storage.from(BUCKET).remove([f.percorso])
    if (error) return setMsg({ tipo: 'err', testo: 'Eliminazione non riuscita.' })
    setFiles((l) => l!.filter((x) => x.percorso !== f.percorso))
  }

  const copia = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setMsg({ tipo: 'ok', testo: 'Indirizzo copiato.' })
    } catch {
      window.prompt('Copia questo indirizzo:', url)
    }
  }

  return (
    <>
      <div className="adm-testa">
        <h1>Immagini</h1>
        <label className="adm-btn" style={{ cursor: 'pointer' }}>
          {carico ? 'Carico…' : 'Carica immagine'}
          <input type="file" accept="image/*" className="sr-only" disabled={carico} onChange={(e) => { nuova(e.target.files?.[0]); e.target.value = '' }} />
        </label>
      </div>
      <p className="adm-aiuto">
        Tutte le immagini caricate. Le immagini vengono ridimensionate (max {CONFIG.immagini.latoMax} px) e compresse prima di caricarle; il limite è {formatoPeso(CONFIG.immagini.maxByte)}.
      </p>
      <Messaggio m={msg} />
      {files === null ? (
        <p role="status">Carico…</p>
      ) : files.length === 0 ? (
        <p>Ancora nessuna immagine.</p>
      ) : (
        <ul className="adm-galleria">
          {files.map((f) => (
            <li key={f.percorso}>
              <img src={f.url} alt="" loading="lazy" />
              <code>{f.percorso}</code>
              <div className="adm-azioni">
                <button className="adm-btn adm-btn--sec" onClick={() => copia(f.url)}>
                  Copia link
                </button>
                <button className="adm-btn adm-btn--peric" onClick={() => elimina(f)}>
                  Elimina
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
