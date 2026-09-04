# Prototipo usa-e-getta — spazio di modellazione (ticket #8)

**Domanda che risponde:** come si disegna un telaio, dove sta il pannello, come si
mostrano i risultati, serve l'albero del modello? Tre varianti che si disaccordano
sulla struttura, non sul colore. Il mondo visivo è la «colonna tensegrale» scelta
il 04/09/2026 sulla pagina di decisione di impeccable (seed `db5e63c5`).

**Avvio:** `python3 -m http.server 8765 --directory prototype/spazio-di-modellazione`
poi <http://127.0.0.1:8765/?variant=A>. Le varianti si cambiano con la barra
flottante in basso, con `← →`, o con `?variant=A|B|C`.

| variante | creazione | pannello | risultati | albero |
|---|---|---|---|---|
| **A «Richiami»** | click sulla griglia con snap (`N` poi click; `B` poi due nodi) | ispettore agganciato alla selezione con linea di richiamo | overlay sul modello, scala stampata | no; 3D in angolo |
| **B «Doppia vista»** | da tastiera: nodo selezionato, `B`, lunghezza, freccia, Invio | fisso a destra | piano ∣ 3D affiancati, M srotolato sotto | sì, sincronizzato |
| **C «Foglio»** | riga di comando (`N 5 0`, `B N4 N5`, `Q A4 12.5`) | scheda «Selezione» | schede sotto il viewport | tabella |

Comune: palette `⌘K` con valori nella query («sezione 30x50», «q 12.5», «modo 2»),
ghost prima del commit (Invio conferma, Esc annulla), cronologia navigabile
(`⌘Z`, `⇧⌘Z`, click sulla voce), stati vuoti che insegnano, solutore vero in JS
(`fe.js`: rigidezza diretta 2D, deformata, reazioni, M parabolico, 3 modi con
masse concentrate; `autotest()` sulla trave appoggiata), scala della deformata
sempre stampata («×518 (auto)»), risultati stantii in rosso finché non si rilancia.

Fuori per scelta: editor delle barre (ticket suo), finestre modali, non lineare
(#13 chiuso dopo, entrerà nella spec), salvataggio, tema scuro.

Solo tre file contano per reagire: `app.js` (varianti e gesti), `plane.js`
(piano di lavoro in SVG), `space.js` (spazio in three.js r180, vendorizzato da
MeshRec). Il codice è usa-e-getta: nessun test oltre l'autotest del solutore,
nessuna gestione errori oltre il necessario, niente persistenza.
