import type { ReactNode } from 'react'
import { Link, NavLink, Navigate, Route, Routes } from 'react-router'
import { supabase } from './supabase'
import { CONFIG, RACCOLTE } from '../config'
import { Login, NuovaPassword } from './Accesso'
import { Account } from './Account'
import { PaginaRaccolta } from './Elenco'
import { ImmaginiAdmin } from './ImmaginiAdmin'
import { attivaModifica } from './modificaSito'
import { Panoramica } from './Panoramica'
import { useAccesso } from './sessione'
import { applicaTema } from './tema'
import { TestiAdmin } from './TestiAdmin'
import { TitoloAdmin } from './TitoloAdmin'
import './base.css'
import './admin.css'

/*
  Origine: src/admin/Admin.tsx di vini-vidi-virgi. Il menu ora si genera dalla
  config: Panoramica, una voce per raccolta, Testi del sito (se ce ne sono),
  Immagini, Account.
*/
applicaTema()

const SEZIONI: { to: string; label: string; end?: boolean }[] = [
  { to: '/admin', label: 'Panoramica', end: true },
  ...RACCOLTE.map((r) => ({ to: `/admin/r/${r.id}`, label: r.plurale })),
  ...(Object.keys(CONFIG.testi).length > 0 ? [{ to: '/admin/testi', label: 'Testi del sito' }] : []),
  { to: '/admin/immagini', label: 'Immagini' },
  { to: '/admin/account', label: 'Account' },
]

const esci = () => supabase.auth.signOut()

function Schermata({ titolo, children }: { titolo: string; children: ReactNode }) {
  return (
    <div className="adm adm-login" role="main">
      <TitoloAdmin titolo={titolo} />
      {children}
    </div>
  )
}

export default function Admin() {
  const a = useAccesso()

  if (a.stato === 'carico')
    return (
      <Schermata titolo="Area editor">
        <p role="status">Controllo l’accesso…</p>
      </Schermata>
    )
  if (a.stato === 'errore')
    return (
      <Schermata titolo="Area editor">
        <div className="adm-card" role="alert">
          <h1>Non riesco a rinnovare l’accesso</h1>
          <p>
            Sei ancora collegato, ma il server non ha risposto. Controlla la connessione e riprova: non serve rimettere la password.
          </p>
          <div className="adm-azioni">
            <button className="adm-btn" type="button" onClick={a.riprova}>
              Riprova
            </button>
            <Link to="/">Torna al sito</Link>
          </div>
        </div>
      </Schermata>
    )
  if (a.stato === 'anonimo')
    return (
      <>
        <TitoloAdmin titolo="Area editor" />
        <Login />
      </>
    )
  if (a.stato === 'negato')
    return (
      <Schermata titolo="Non autorizzato">
        <div className="adm-card">
          <h1>Non autorizzato</h1>
          <p>
            Sei entrato come <strong>{a.sessione.user.email}</strong>, ma questo account non è tra gli editor del sito. Se pensi sia un
            errore, chiedi a chi gestisce il sito di aggiungerti.
          </p>
          <div className="adm-azioni">
            <button className="adm-btn" onClick={esci}>
              Esci
            </button>
            <Link to="/">Torna al sito</Link>
          </div>
        </div>
      </Schermata>
    )
  if (a.stato === 'recupero' || a.stato === 'cambia')
    return (
      <Schermata titolo="Scegli la password">
        <NuovaPassword
          titolo={a.stato === 'cambia' ? 'Benvenuto! Scegli la tua password' : 'Scegli una nuova password'}
          intro={
            a.stato === 'cambia'
              ? 'Stai usando una password temporanea. Scegline una tua, che conosci solo tu: servirà per entrare d’ora in poi.'
              : undefined
          }
        />
        <button className="adm-link" type="button" onClick={esci}>
          Esci
        </button>
      </Schermata>
    )

  const email = a.sessione.user.email ?? ''
  return (
    <div className="adm">
      <TitoloAdmin titolo="Area editor" />
      <a className="salta-contenuto" href="#adm-contenuto">
        Vai al contenuto
      </a>
      <header className="adm-barra">
        <Link to="/admin" className="adm-barra__nome">
          {CONFIG.nomeSito} · editor
        </Link>
        <div className="adm-barra__dx">
          <Link to="/" onClick={attivaModifica}>
            Modifica sul sito
          </Link>
          <button type="button" onClick={esci}>
            Esci
          </button>
        </div>
      </header>
      <div className="adm-corpo">
        <nav className="adm-nav" aria-label="Sezioni">
          <ul>
            {SEZIONI.map((s) => (
              <li key={s.to}>
                <NavLink to={s.to} end={s.end}>
                  {s.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <main id="adm-contenuto" className="adm-pannello" tabIndex={-1}>
          <Routes>
            <Route index element={<Panoramica email={email} />} />
            <Route path="r/:raccolta" element={<PaginaRaccolta />} />
            <Route path="r/:raccolta/:id" element={<PaginaRaccolta />} />
            <Route path="testi" element={<TestiAdmin />} />
            <Route path="testi/:chiave" element={<TestiAdmin />} />
            <Route path="immagini" element={<ImmaginiAdmin />} />
            <Route path="account" element={<Account email={email} />} />
            <Route path="*" element={<Navigate to="/admin" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}
