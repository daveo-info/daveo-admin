# Estensioni possibili

Funzioni dell'admin di VVV rimaste fuori dal modulo v1.0.0 perché specifiche del sito o nel dubbio.
Origine: `vini-vidi-virgi@87d9fff3c0736fc521c81272f3086afc42835157`. I percorsi sono di quel repo.

Per trasformarne una in estensione: si generalizza nel repo `daveo-admin` (nuova versione), mai copiando a mano nel singolo sito.

| Estensione | Cosa fa in VVV | File di origine | Perché è fuori |
|---|---|---|---|
| Foto e video (album) | Album con più foto, ordine, didascalie, copertina, foto in Home, link YouTube/Vimeo con miniatura copiata nello Storage, contatore "Foto X / 150" | `src/admin/FotoAdmin.tsx`, `src/admin/immagini.ts` (`caricaFoto`, `copiaAnteprimaYouTube`), `src/lib/video.ts`, `admin.css` (`.adm-drop`, `.adm-media*`, `.adm-in-home`); migrazioni `20261101120000_sei_sezioni.sql` (tabella `foto_e_video`), `20261101140000_foto_link_semplice.sql`, `20261103130000_foto_in_home.sql`, `20261108120000_limiti_piano_free.sql` (tetto, trigger video, `stato_foto`) | Tabella e regole di galleria specifiche; nel dubbio fuori. `caricaFoto` con miniatura è già nel modulo |
| Tetto al numero di foto | Limite in un solo punto (`private.limite_foto()`), trigger su righe + policy sui file | `20261108120000_limiti_piano_free.sql` (sezione 3) | Legato alla cartella `foto/` e alla tabella `foto_e_video` |
| Categorie | Tabella `categorie_notizie`, pagina "Gestisci categorie", campo `categoria` a tendina, categorie disattivate | `src/admin/CategorieAdmin.tsx`, `src/admin/Modulo.tsx` (`MenuCategoria`), `admin.css` (`.adm-categorie`); `20261107120000_storico_eventi_categorie.sql` | Nel dubbio fuori: utile ma legato alle notizie di VVV |
| Annulla / ripristina un evento | "Annulla" con motivo, etichetta "Annullato", doppia conferma per eliminare eventi svolti | `src/admin/Modulo.tsx` (`PannelloAnnulla`, `cambiaAnnullamento`, `annullabile`), `src/admin/raccolte.tsx` (`intestazioneEvento`); colonne `annullato_il`, `motivo_annullamento`, `pubblicato_il` in `20261107120000_storico_eventi_categorie.sql` | Specifico di eventi/assemblee |
| Storico eventi | Esportazione dello storico di eventi e assemblee | `src/admin/BottoneStorico.tsx`, `src/admin/storicoEventi.ts`, `supabase/functions/_shared/storico-eventi.ts` | Specifico VVV |
| Espansioni a pagamento ("In arrivo") | Raccolte spente da `funzioniAttive`: voce "Presto" nel menu e schermata "In arrivo" | `src/config/site.ts` (`funzioniAttive`), `src/admin/raccolte.tsx` (`SPENTE`, `IN_ARRIVO`, `inArrivo`), `src/admin/FunzioneInArrivo.tsx`, `funzioneInArrivo.css`, `admin.css` (`.adm-presto`) | Nel dubbio fuori: riguarda il modello commerciale, da decidere in Daveo |
| Panoramica con scadenze | Domande da leggere, prossima assemblea/evento, assemblee senza verbale | `src/admin/Panoramica.tsx` | Specifico VVV; il modulo ha una panoramica generica |
| Domande anonime | Form pubblico con Turnstile, Edge Function con limiti per impronta, sezione admin con schede, FAQ | `src/pages/Domande.tsx`, `src/admin/DomandeAdmin.tsx`, `src/admin/nonLette.ts`, `supabase/functions/invia-domanda/`, `_shared/sicurezza.ts`; migrazioni `…limite_domande_per_impronta.sql` e precedenti | Escluso dalla SPEC |
| Archivio e pulizia di fine anno | Archivio privato delle domande, pulizia annuale | `supabase/functions/pulizia-domande/`, `_shared/archivio-domande.ts`, `.github/workflows/archivio-domande.yml`, `20261105130000_domande_avvisi_archivio.sql` | Escluso dalla SPEC |
| CSV | Esportazione delle domande in CSV | `src/admin/csvDomande.ts`, `_shared/csv-domande.ts` | Escluso dalla SPEC |
| Avvisi email | Email agli editor quando arrivano domande (Apps Script + Edge Function), preferenza nell'Account | `apps-script/`, `supabase/functions/automazioni-domande/`, `_shared/avviso-domande.ts`, `src/admin/DomandeAdmin.tsx` (`PreferenzaAvvisi`), `20261105120000_avvisi_domande.sql` | Escluso dalla SPEC |
| Merch | Raccolta prodotti con prezzo e taglie | `src/admin/raccolte.tsx` (`merch`), `src/pages/Merch.tsx` | Escluso dalla SPEC (si rifà come semplice raccolta nella config) |
| Slug automatico lato database | Trigger che crea lo slug dal titolo se manca (righe inserite dal Table Editor) | `20261109120000_notizie_slug_automatico.sql` | Nel dubbio fuori: utile come modello per le raccolte con slug |
| Modalità modifica per Astro | La barra e il cassetto su pagine Astro (non React Router) | `src/modifica/Modifica.tsx` | Non provato; richiede una versione senza React Router |
| Promemoria liberatoria | Testo fisso accanto agli upload di foto con persone | `src/admin/immagini.ts` (`PROMEMORIA_LIBERATORIA`) | Specifico (minorenni); nel modulo si mette come `aiuto` del campo nella config |
| Raccolte di VVV come esempi | Notizie complete, eventi, assemblee, chi siamo, collaborazioni, contatti (footer/emergenza) | `src/admin/raccolte.tsx` | Sono dati del sito: possono servire come esempi di config |
