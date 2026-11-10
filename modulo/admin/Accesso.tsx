import { useId, useRef, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { supabase } from './supabase'
import { CONFIG } from '../config'
import { Turnstile } from './Turnstile'
import { erroreAccesso, problemaPassword } from './sessione'

type Msg = { tipo: 'ok' | 'err'; testo: string } | null

function Avviso({ m }: { m: Msg }) {
  if (!m) return null
  return (
    <p className={`adm-msg adm-msg--${m.tipo}`} role={m.tipo === 'err' ? 'alert' : 'status'}>
      {m.testo}
    </p>
  )
}

/**
 * Il controllo anti-bot: il token va a Supabase (CAPTCHA protection). Ogni token vale una volta sola.
 * Solo se accesso.captcha è attivo nella config: altrimenti niente widget e niente token.
 */
function useControllo() {
  const [token, setToken] = useState<string | null>(null)
  const [giro, setGiro] = useState(0)
  const [ko, setKo] = useState(false)
  return {
    token,
    rinnova: () => setGiro((g) => g + 1),
    widget: CONFIG.accesso.captcha && (
      <>
        <Turnstile onToken={setToken} onErrore={() => setKo(true)} resetKey={giro} />
        {ko && <p className="campo__aiuto">Il controllo anti-spam non si è caricato: se l’accesso non va, ricarica la pagina.</p>}
      </>
    ),
  }
}

/** Accesso con email e password. Dopo 5 errori di fila si aspetta 30 secondi. */
export function Login() {
  const [modo, setModo] = useState<'accedi' | 'dimenticata'>('accedi')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [vedi, setVedi] = useState(false)
  const [invio, setInvio] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)
  const errori = useRef(0)
  const [bloccoFino, setBloccoFino] = useState(0)
  const controllo = useControllo()

  async function accedi(e: FormEvent) {
    e.preventDefault()
    if (Date.now() < bloccoFino) return setMsg({ tipo: 'err', testo: 'Troppi tentativi sbagliati. Aspetta 30 secondi e riprova.' })
    setInvio(true)
    setMsg(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
      options: controllo.token ? { captchaToken: controllo.token } : undefined,
    })
    setInvio(false)
    controllo.rinnova()
    if (error) {
      errori.current++
      if (errori.current >= 5) {
        errori.current = 0
        setBloccoFino(Date.now() + 30_000)
      }
      setPassword('')
      setMsg({ tipo: 'err', testo: erroreAccesso(error) })
    }
  }

  async function recupera(e: FormEvent) {
    e.preventDefault()
    setInvio(true)
    setMsg(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/admin`,
      captchaToken: controllo.token ?? undefined,
    })
    setInvio(false)
    controllo.rinnova()
    // Stesso messaggio che l'email esista o no: non si rivela chi è editor.
    if (error && (error.status === 429 || error.code === 'captcha_failed')) return setMsg({ tipo: 'err', testo: erroreAccesso(error) })
    setMsg({
      tipo: 'ok',
      testo: 'Se l’indirizzo è di un editor, ti arriva un’email con un link per scegliere una nuova password. Aprilo da questo stesso browser.',
    })
  }

  return (
    <div className="adm adm-login" role="main">
      <form className="adm-card adm-form" onSubmit={modo === 'accedi' ? accedi : recupera}>
        <h1>{modo === 'accedi' ? 'Area editor' : 'Password dimenticata'}</h1>
        <div className="campo">
          <label htmlFor="acc-email">Email</label>
          <input id="acc-email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        {modo === 'accedi' && (
          <div className="campo">
            <label htmlFor="acc-pw">Password</label>
            <div className="adm-pw">
              <input
                id="acc-pw"
                type={vedi ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button type="button" className="adm-btn adm-btn--sec" onClick={() => setVedi((v) => !v)} aria-pressed={vedi}>
                {vedi ? 'Nascondi' : 'Mostra'}
              </button>
            </div>
          </div>
        )}
        {controllo.widget}
        <Avviso m={msg} />
        <button className="adm-btn adm-btn--largo" type="submit" disabled={invio}>
          {invio ? 'Un attimo…' : modo === 'accedi' ? 'Entra' : 'Mandami il link'}
        </button>
        <button
          type="button"
          className="adm-link"
          onClick={() => {
            setModo(modo === 'accedi' ? 'dimenticata' : 'accedi')
            setMsg(null)
          }}
        >
          {modo === 'accedi' ? 'Password dimenticata?' : 'Torna all’accesso'}
        </button>
        <Link to="/">Torna al sito</Link>
      </form>
    </div>
  )
}

/** Scelta di una nuova password: al primo accesso, dopo "password dimenticata" o dalla pagina Account. */
export function NuovaPassword({ titolo, intro, onFatto }: { titolo: string; intro?: string; onFatto?: () => void }) {
  const id = useId()
  const [p1, setP1] = useState('')
  const [p2, setP2] = useState('')
  const [vedi, setVedi] = useState(false)
  const [invio, setInvio] = useState(false)
  const [msg, setMsg] = useState<Msg>(null)

  async function salva(e: FormEvent) {
    e.preventDefault()
    const problema = problemaPassword(p1)
    if (problema) return setMsg({ tipo: 'err', testo: problema })
    if (p1 !== p2) return setMsg({ tipo: 'err', testo: 'Le due password non sono uguali.' })
    setInvio(true)
    setMsg(null)
    const { error } = await supabase.auth.updateUser({ password: p1, data: { cambia_password: false } })
    setInvio(false)
    if (error) return setMsg({ tipo: 'err', testo: erroreAccesso(error) })
    setP1('')
    setP2('')
    setMsg({ tipo: 'ok', testo: 'Password salvata.' })
    onFatto?.()
  }

  return (
    <form className="adm-card adm-form" onSubmit={salva}>
      <h2>{titolo}</h2>
      {intro && <p className="adm-aiuto">{intro}</p>}
      <div className="campo">
        <label htmlFor={`${id}-1`}>Nuova password</label>
        <input
          id={`${id}-1`}
          type={vedi ? 'text' : 'password'}
          autoComplete="new-password"
          required
          minLength={CONFIG.accesso.passwordMinima}
          maxLength={72}
          value={p1}
          onChange={(e) => setP1(e.target.value)}
          aria-describedby={`${id}-aiuto`}
        />
        <span id={`${id}-aiuto`} className="campo__aiuto">
          Almeno {CONFIG.accesso.passwordMinima} caratteri, con lettere e numeri. Una frase lunga è più facile da ricordare (es. “pane-caldo-alle-7-di-mattina”).
        </span>
      </div>
      <div className="campo">
        <label htmlFor={`${id}-2`}>Ripeti la password</label>
        <input
          id={`${id}-2`}
          type={vedi ? 'text' : 'password'}
          autoComplete="new-password"
          required
          value={p2}
          onChange={(e) => setP2(e.target.value)}
        />
      </div>
      <label className="adm-check">
        <input type="checkbox" checked={vedi} onChange={(e) => setVedi(e.target.checked)} />
        <span>Mostra le password</span>
      </label>
      <Avviso m={msg} />
      <button className="adm-btn" type="submit" disabled={invio}>
        {invio ? 'Salvo…' : 'Salva la password'}
      </button>
    </form>
  )
}
