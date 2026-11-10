import { Link } from 'react-router'
import { RACCOLTE } from '../config'
import { attivaModifica } from './modificaSito'

/*
  Origine: src/admin/Panoramica.tsx di vini-vidi-virgi. Quella di VVV mostrava
  domande da leggere, prossima assemblea ed evento (specifici del sito): qui
  restano il riquadro "Modifica sul sito" e i bottoni "Aggiungi", generati
  dalle raccolte della config.
*/
export function Panoramica({ email }: { email: string }) {
  const creabili = RACCOLTE.filter((r) => r.creabile !== false)
  return (
    <>
      <div className="adm-testa">
        <h1>Ciao!</h1>
      </div>
      <p className="adm-aiuto">Sei entrato come {email}. Da qui gestisci tutto il sito.</p>

      <div className="adm-griglia">
        <Link className="adm-riquadro adm-riquadro--forte" to="/" onClick={attivaModifica}>
          <strong>Modifica sul sito</strong>
          <span>Apri il sito e tocca un testo o un contenuto per cambiarlo lì.</span>
        </Link>
      </div>

      {creabili.length > 0 && (
        <>
          <h2 className="adm-sotto">Aggiungi</h2>
          <div className="adm-azioni">
            {creabili.map((r) => (
              <Link key={r.id} className="adm-btn" to={`/admin/r/${r.id}/nuovo`}>
                + {r.nome}
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  )
}
