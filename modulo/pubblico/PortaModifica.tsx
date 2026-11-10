import { lazy, Suspense, useState } from 'react'
import { CHIAVE_SESSIONE } from '../env'

/*
  Origine: src/components/Layout.tsx di vini-vidi-virgi.
  La modalità modifica è un pacchetto a parte: lo scarica solo chi ha una
  sessione salvata nel browser (cioè chi è entrato in /admin). Gli altri no.
  Montala una volta nel layout delle pagine pubbliche, dentro il router.
*/
const Modifica = lazy(() => import('../modifica/Modifica'))

function sessioneSalvata(): boolean {
  try {
    return !!localStorage.getItem(CHIAVE_SESSIONE)
  } catch {
    return false
  }
}

export function PortaModifica() {
  const [editorForse] = useState(sessioneSalvata)
  if (!editorForse) return null
  return (
    <Suspense fallback={null}>
      <Modifica />
    </Suspense>
  )
}
