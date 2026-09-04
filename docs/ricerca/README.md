# Ricerca pre-brainstorming — quadro d'insieme

Sette ricerche indipendenti, condotte in parallelo il 04/09/2026 da sette `researcher`, prima di qualunque decisione di prodotto, più un'ottava mirata dispacciata subito dopo sui modelli dati di riferimento. Repo di riferimento per il contesto: `~/GitHub/Tesi` a `782f507`. Questo file è la sintesi: non ripete i numeri, li indirizza, e mette in fila ciò che le sette ricerche dicono **insieme** — comprese le contraddizioni.

| documento | cosa contiene |
|---|---|
| [`01-opensees-integrazione.md`](01-opensees-integrazione.md) | vie d'integrazione (openseespy, Tcl, xara, CMake, SP/MP) con ruote e piattaforme; modello di fallimento **misurato** (`exit()` che uccide il processo); licenze verbatim con la discrepanza repo/doc; catalogo elementi/analisi; tempi misurati |
| [`02-panorama-software.md`](02-panorama-software.md) | 20+ front-end OpenSees, commerciali NTC con prezzi, open source con UI; tabella «il vuoto» a 6 assi; censimento funzioni intelligenti nei prodotti |
| [`03-stack-tecnico.md`](03-stack-tecnico.md) | shell (Python+browser, Tauri, Electron, PySide6, pywebview) con firma/packaging; viewport three.js e riferimenti (awatif, chili3d, veux); stato/undo; ponte UI↔solutore; cosa chiede `impeccable`; cos'è «shape» |
| [`04-funzioni-intelligenti.md`](04-funzioni-intelligenti.md) | LLM per modelli strutturali 2025-26 con accuratezze e failure mode; intelligenza deterministica; AI nei prodotti; pattern affidabili; responsabilità §10.2; **lista ordinata C1-C12** |
| [`05-archeologia-linea-integrata.md`](05-archeologia-linea-integrata.md) | la linea rimossa il 2-3/09 da MeshRec: inventario per modulo con righe e test, come parlava con OpenSees/CalculiX, verifiche di norma implementate, schermata dismessa, validazione uscita, cosa è riusabile |
| [`06-dominio-analisi-verifiche-formati.md`](06-dominio-analisi-verifiche-formati.md) | catalogo analisi e verifiche NTC 2018/EC8 con articolo; tre strade d'ingresso del modello; formati di scambio (SAF, IFC, e2k); relazione §10.2.1; caso studio e benchmark aperti; stato normativo 2026-2028 |
| [`07-ux-modellatore.md`](07-ux-modellatore.md) | punti di dolore per fase con citazioni; pattern eccellenti (Blender, Plasticity, Onshape, Shapr3D, Figma, Linear); risultati come UX; inventario skill di design locali; motion/a11y/aula; metodo per sviluppatore singolo; **10 principi UX candidati** |
| [`08-modelli-dati-riferimento.md`](08-modelli-dati-riferimento.md) | schema comparato di opensees-studio `.osmodel`, awatif, SAF 2.2, PyNite/pynite-tools, Speckle Structural, `printModel -JSON`: tabella entità × formato; **14 lezioni per il modello dati** (ID stabili, asta fisica ≠ elemento, risultati per combinazione con tre forme, verdetto come entità, armatura costruttiva → fibre derivate) |
| [`09-legami-costitutivi-ntc.md`](09-legami-costitutivi-ntc.md) | issue #12: derivazione `Concrete02`/`Steel02` da C25/30 e B450C con esempio numerico; confinamento NTC [4.1.8]-[4.1.12.i] contro Mander 1988 su un pilastro 30×50 staffato; incompatibilità Mander ↔ `Concrete02` (`Ec` = 2 `fpc`/`epsc0`); **veste delle resistenze** articolo per articolo (NTC §4.1.1.3/§7.3.4 tacciono, Circolare C4.1.2.1.2.1 e C8.7.2.2, EC8-1 §4.3.3.4.1(4) = medie); cinque esempi OpenSees con numeri; raccomandazione: medie nel modello, veste come campo del materiale |

Convenzione dei tag, valida per tutti: **[V]** verificato su fonte primaria · **[M]** misurato in sessione con comando · **[INF]** inferenza · **[NON TROVATO]**. Notazione numerica italiana (virgola decimale) fuori dalle citazioni verbatim.

---

## 1. Ciò che le sette ricerche dicono insieme

**Il solutore vive fuori processo, obbligatoriamente.** Tre ricerche indipendenti arrivano allo stesso punto da tre strade: `01` lo **misura** (`forceBeamColumn` fra due nodi coincidenti termina il processo Python con exit 0, nessuna eccezione; `elasticBeamColumn` idem con exit 255; oltre 2.000 `exit()` nel sorgente), `03` lo conferma dal sorgente e dai post di M. Scott, `05` racconta che la linea rimossa aveva già preso questa decisione (#139, 28-29/08) per lo stesso motivo — abort 134 sul tetraedro quadratico. Non è un'opinione: è un vincolo architetturale.

**Il vuoto esiste ed è preciso.** `02`: nessuno dei 20+ strumenti censiti copre più di 3 assi su 6 fra *gratis · UI moderna · multi-OS · telai c.a. · verifiche EC/NTC · vivo*. L'accoppiata «OpenSees + verifiche NTC» esiste (CDS, ModeSt) ma chiusa, Windows, legacy. STKO Professional la sta per vendere. `opensees-studio` (aprile 2026, 1 sviluppatore, AGPL, zero norme) è il vicino più prossimo. `07` conferma dal lato utente: i dolori documentati sono combinazioni a mano, risultati posseduti ma non esportati, verifiche opache, attesa muta.

**Il modello dati è un telaio, non un solido.** `06`: le verifiche NTC pretendono sollecitazioni di sezione e armature, che un solido non dà; `01`: il `TenNodeTetrahedron` resta rotto sulle tensioni; `05`: la linea rimossa aveva già `telaio.py` (prior → aste) e `opensees.py` (sezioni a fibre) funzionanti e testati. Il deck `.inp` di MeshRec entra al massimo come importatore di verifica incrociata.

**Molto è già scritto.** `05`: circa 1.500 righe riusabili as-is da `9716f6e` (`opensees.py` 1037 righe + 55 test + 4 sul binario vero; `telaio.py`, `armatura.py`, `combinazioni.py`), più la tabella dei sette verdetti in `solve.py`. Tre caselle marcate «non decise» dall'autore stesso: materiali non lineari e veste delle resistenze, carichi diversi dal peso proprio, modale con spettro.

**Tutto il post-processing normativo è codice proprio.** `01` + `06` concordano: OpenSees dà modi, spostamenti modali (`responseSpectrumAnalysis`), forze per modo, `modalProperties`; CQC/SRSS, regola del 30%, spettro NTC, N2, θ, drift, combinazioni SLU/SLE, verifiche: tutto in casa. `06` indica `structuralcodes` (Apache-2.0) per M-N/M-χ EC2; per taglio/nodi/gerarchia NTC nessuna libreria PyPI.

**Le funzioni intelligenti che valgono sono deterministiche.** `04`: C1 Check Model, C2 modi automatici, C3 equilibrio e sanity check, C4 combinazioni, C5 convergenza adattiva, C6 relazione §10.2.1 — tutte con oracolo, tutte prerequisito per qualunque LLM. `02` conferma: nessun concorrente ha un LLM che agisce sul modello con la norma in mezzo; Dlubal e Bentley hanno scelto MCP. `04` § responsabilità: NTC §10.2.1 chiede riproducibilità → il numero non può dipendere da un LLM. Offline non esiste.

**La UX ha già le sue regole.** `07`: dieci principi candidati, quattro con più fonti indipendenti (ogni numero porta il suo contraddittore; attesa parlante; combinazioni generate e ripercorribili; risultati con colormap percettiva e fallimento a doppio canale). `03` + `07`: `impeccable` in modo **Operate** è lo strumento; «shape» non è un tool separato ma il suo sottocomando di pianificazione UX. **Nessuna skill locale copre viewport 3D, legende, colormap**: serve un surface brief scritto a mano.

**Lo stack non ha un vincitore netto.** `03`: `stack_comparator` dà «close call»; la scelta dipende da finestra nativa sì/no e da quanto conta la firma/notarizzazione al giorno 1. Raccomandazione a due tempi: Python + browser/pywebview subito (riuso di ciò che MeshRec sa fare), UI agnostica dal trasporto, Tauri 2 come cambio di colla dopo. Rust = colla, non dominio.

---

## 2. Contraddizioni e correzioni fra le ricerche

| punto | chi dice cosa | come si legge |
|---|---|---|
| **Soglia di massa partecipante** | brief e `modi-per-la-normativa.md` di Tesi: 90% per NTC; `06` corregge: **NTC 2018 §7.3.3.1 = 85%** + modi >5%; **EC8 = 90%**. `04` e `07` citano ancora 90% per NTC | vale `06` (letto sul testo di norma). Da correggere anche in Tesi |
| **openseespy vs xara** | `02` raccomanda di valutare xara+veux (rilasci 02-04/09); `01` misura: `opensees` 0.1.31 **senza ruota macOS arm64**, README «experimental», eigen rotto su Windows; raccomanda openseespy base, xara tracciato | vale `01` (misurato); xara resta opzione futura |
| **Tcl vs openseespy** | `05`: la linea rimossa scelse Tcl subprocess (#139) per artefatto diffabile e isolamento; `01`: worker Python `openseespy` con stderr catturato; `06`: `responseSpectrumAnalysis` + `-return` e opstool spingono verso Python | entrambe fuori processo. Decisione di brainstorming: conta ancora «l'artefatto che esce dal programma»? |
| **Python 3.12 obbligatorio** | doc OpenSeesPy: «Python 3.12 is required»; `01` misura: su macOS gira su 3.14.7; vincolo reale solo win/linux (metadati ruota) | vale la misura; su Windows resta 3.12 |
| **Riuso di opstool** | `06` lo elenca come utile (spettro, smart analyze, fibre); `01`: **GPL-3.0**, `python <3.13`, 22 dipendenze pesanti | riuso solo se l'app è GPL; altrimenti reimplementare i pezzi (SmartAnalyze è MIT a sé) |
| **Licenza OpenSees** | `01`: file `COPYRIGHT` (noncommerciale/interno) e `license.rst` (BSD-like, «if you sell») **non coincidono**; OpenSeesPy: redistribuzione commerciale richiede licenza; `04` aveva trovato lo stesso avviso | decisione di prodotto da chiudere **prima del codice**: non ridistribuire la ruota; l'app la fa installare |
| **Perché la linea integrata è stata dismessa** | `05`: [NON TROVATO] per iscritto oltre «ha provato l'interfaccia e ha deciso» | domanda diretta a Mario, prima di disegnare la UI nuova — altrimenti si ricostruisce la stessa schermata a quattro stadi |

---

## 3. Domande aperte consolidate per il brainstorming

Raggruppate per ciò che cambiano. Le domande di strumento (quale libreria, quale formato) restano a chi implementa.

**Prodotto e perimetro**
1. Target primario: verifica NTC 2018 per lo studio italiano (relazione di calcolo obbligatoria) o modellazione non lineare pulita per ricerca? Le due UX sono opposte (`02`, `07`).
2. Chi è l'utente secondo: solo Mario, o tesisti/colleghi/commissione come in `PRODUCT.md` di Tesi? Decide divulgazione progressiva vs densità (`07`).
3. Ingresso del modello: dal prior geometrico di MeshRec (`12_wall.json`, contratto ancora prodotto), da zero nella UI, o entrambi come importatori su un modello dati telaio (`05`, `06`)?
4. Perché la linea integrata è stata dismessa il 2/09 (`05`)?
5. Verifiche v1: solo quelle senza armature (drift, θ, regolarità, SLE deformazione) o set completo SLU/SLE/gerarchia con armature (`06`, `07`)?
6. La relazione di calcolo esce dal programma? In che forma e con che perimetro (`06`, `07`)?
7. Norma: solo NTC 2018 + Circolare, o parametrica NTC/EC8 2004/EC8 2024 (ritiro prima generazione 30/03/2028) (`06`)?

**Vincoli che precedono il codice**
8. Licenza OpenSees/OpenSeesPy: uso interno/ricerca (tutto permesso) o distribuzione (licenza da UC OTL / Zhu)? (`01`, `04`)
9. Licenza del progetto: AGPL (blocca gli studi), MIT/BSD (apre a fork commerciali), altro (`02`)?
10. Rapporto con `opensees-studio`: contribuire, forkare, divergere (`02`)?
11. Le tre caselle «non decise» della linea rimossa: materiali non lineari e veste delle resistenze, carichi oltre il peso proprio, modale con spettro (`05`).

**Stack e UX**
12. Finestra nativa (menu, dock, associazione file) al giorno 1 o dopo? Cambia shell e peso della firma (`03`).
13. Storia parametrica (timeline stile Onshape) o undo lineare (`07`)?
14. Input geometria: tabella, viewport, o entrambi sincronizzati (`07`)?
15. Convenzioni grafiche: M sul lato teso? rosso = compressione o rosso = fallito (`07`)?
16. Proiezione in aula davvero prevista → tema chiaro, modo Presentazione (`07`)?
17. LLM: opzionale e online, o requisito? Dati del cliente: retention 30 gg basta o serve ZDR (`04`)?

---

## 4. Raccomandazioni convergenti (non decisioni)

Quelle che almeno due ricerche fanno indipendentemente:

- Solutore in sidecar, stderr come esito, Check Model geometrico prima di ogni run (`01`, `03`, `04`, `05`).
- Modello dati = telaio con sezioni armate, combinazioni e norma; deck solido solo come importatore (`05`, `06`).
- Cherry-pick da `9716f6e` invece di riscrivere: `opensees.py`, `telaio.py`, `armatura.py`, `combinazioni.py`, tabella dei verdetti (`05`, `06`).
- Costruire prima C1-C6 deterministici; LLM dopo, come generatore di JSON verificato, esposto via MCP (`02`, `04`).
- Posizionamento: «OpenSees + verifiche NTC/EC su telai c.a. + UI pulita multi-OS + relazione», non «ennesima GUI OpenSees» (`02`, `06`, `07`).
- `impeccable` Operate come loop di critica; `PRODUCT.md` con schema impeccable subito; surface brief per il viewport scritto a mano (`03`, `07`).
- three.js moderno + `camera-controls` + `three-mesh-bvh`; awatif come riferimento MIT dello stesso dominio (`03`).
- Licenza OpenSees/OpenSeesPy chiusa prima del codice; non ridistribuire la ruota (`01`, `04`).
- Benchmark: Morandi-Hak-Magenes 2018 (CC BY) per il telaio nudo; mensola analitica e `RCFrameGravity` per il generatore (`05`, `06`).
- Modello dati in tre schemi distinti con versione — modello, risultati per caso/combinazione con provenienza, verdetti — perché nessun formato esistente copre i tre insieme; forma tecnica da opensees-studio, vocabolario di nature e categorie da SAF (`06`, `08`).

---

## 5. Cosa non è stato coperto

- Eng-Tips e Reddit bloccati (403): le citazioni su SAP2000/ETABS sono da snippet, non da pagina (`07`).
- Prezzi CSI in USD da fonte secondaria; listino CDS illeggibile (`02`).
- Tempi del `TenNodeTetrahedron` non misurati; claim «4-5×» di xara non misurato (`01`).
- Dimensioni hello-world Electron/Tauri solo da secondarie (`03`).
- Il codice della linea rimossa è stato letto, non eseguito: OpenSees non è installato sulla macchina di sviluppo (`05`).
- Nessuna prova di carico documentata sul telaio di laboratorio: il confronto resta code verification, non validazione (`06`).

Se una di queste manca al brainstorming, un `researcher` mirato costa meno di una decisione presa a memoria.
