import { CONFIG } from '../config'

/*
  Porta i colori della config nelle variabili CSS --adm-* usate da admin.css e
  modifica.css. Si chiama all'avvio del pannello e della modalità modifica
  (codice caricato a parte: non pesa sul sito pubblico).
*/
let applicato = false

export function applicaTema() {
  if (applicato) return
  applicato = true
  const t = CONFIG.tema
  const s = document.documentElement.style
  s.setProperty('--adm-primario', t.primario)
  s.setProperty('--adm-chiaro', t.chiaro)
  s.setProperty('--adm-testo', t.testo)
  s.setProperty('--adm-errore', t.errore)
  s.setProperty('--adm-ok', t.ok)
  s.setProperty('--adm-font', t.font)
}
