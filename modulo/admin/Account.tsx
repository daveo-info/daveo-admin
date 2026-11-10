import { useState } from 'react'
import { supabase } from './supabase'
import { NuovaPassword } from './Accesso'

export function Account({ email }: { email: string }) {
  const [esco, setEsco] = useState(false)

  async function esciOvunque() {
    if (!window.confirm('Esci da tutti i dispositivi? Dovrai rientrare con la password anche qui.')) return
    setEsco(true)
    // Revoca tutte le sessioni di questo account (telefono, PC, ecc.).
    await supabase.auth.signOut({ scope: 'global' })
    setEsco(false)
  }

  return (
    <>
      <div className="adm-testa">
        <h1>Il tuo account</h1>
      </div>
      <p className="adm-aiuto">Sei entrato come {email}.</p>

      <NuovaPassword
        titolo="Cambia password"
        intro="Per sicurezza si può cambiare solo entro 24 ore dall’ultimo accesso: se ti dà errore, esci e rientra."
      />


      <section className="adm-card adm-form" aria-labelledby="acc-sessioni">
        <h2 id="acc-sessioni">Dispositivi</h2>
        <p className="adm-aiuto">
          Hai perso il telefono o sei entrato da un computer condiviso e non sei uscito? Esci da tutti i dispositivi in un colpo solo.
        </p>
        <div className="adm-azioni">
          <button className="adm-btn adm-btn--peric" type="button" onClick={esciOvunque} disabled={esco}>
            {esco ? 'Esco…' : 'Esci da tutti i dispositivi'}
          </button>
        </div>
      </section>
    </>
  )
}
