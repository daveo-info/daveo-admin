import { CONFIG } from '../config'

/*
  Origine: src/main.tsx di vini-vidi-virgi.
  Dopo un deploy i file JS vecchi non esistono più e l'hosting risponde con la pagina
  HTML: una scheda aperta da prima si romperebbe aprendo l'admin o la modalità modifica.
  In quel caso ricarichiamo la pagina (al massimo una volta al minuto, per non girare in tondo).
  Chiamala una volta in main.tsx, prima di montare l'app.
*/
export function installaRicaricaDopoDeploy() {
  window.addEventListener('vite:preloadError', (evento) => {
    const CHIAVE = `${CONFIG.prefisso}:ricarica-dopo-deploy`
    let ultima = 0
    try {
      ultima = Number(sessionStorage.getItem(CHIAVE) ?? 0)
    } catch {
      // sessionStorage non disponibile: proviamo comunque.
    }
    if (Date.now() - ultima < 60_000) return
    try {
      sessionStorage.setItem(CHIAVE, String(Date.now()))
    } catch {
      return // senza memoria non possiamo evitare un giro infinito: lasciamo l'errore.
    }
    evento.preventDefault()
    window.location.reload()
  })
}
