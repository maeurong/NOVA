# Ricerca: panorama — front-end OpenSees, commerciali NTC, open source, il vuoto

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato in parallelo con altri sei. Domanda posta: che cosa esiste già, cosa fa bene, dove sta il vuoto che un nuovo modellatore OpenSees con UI pulita e verifiche NTC 2018 andrebbe a riempire.

Cwd `/Users/mario` (non repo). Metriche GitHub/PyPI [M] = `gh api repos/<owner>/<repo>` e `curl https://pypi.org/pypi/<pkg>/json` eseguiti il 04/09/2026. Prezzi/date [V] = pagina primaria letta lo stesso giorno, URL in Fonti.

**Skill-gate.** `caveman:caveman` invocata. `tech-stack-evaluator` invocata; script `ecosystem_analyzer.py` **non eseguito**: soglie tarate su ecosistema npm/web (30 punti a 50 000 stelle, `ecosystem_analyzer.py:57-120`), qui repo da 4–800 stelle → tutti ≈0, zero potere discriminante. Riportate metriche grezze.

**Premesse brief verificate.** `~/GitHub/Tesi/README.md:11-13` "Il programma si ferma al deck" [V]. `docs/validazione/README.md:3-11` solutore rimosso 2-3/09/2026, mappa #161 [V]. Convenzione tag `ricerca-opensees-e-armature.md:16-21` [V]. Nessuna premessa falsa.

Tag: **[V]** fonte primaria letta · **[M]** misurato in sessione · **[INF]** inferenza · **[NON TROVATO]**.

---

## Artefatti consultati

| artefatto | provenienza | stato |
|---|---|---|
| Tesi README, docs/validazione/README, ricerca-opensees-e-armature | repo locale | letti |
| GitHub API: 30+ repo (stelle, fork, push, licenza, release) | `gh api` | [M] |
| PyPI JSON: openseespy, xara, veux, opstool, opsvis, PyNiteFEA, compas-fea2 | `curl` | [M] |
| Screenshot `opensees-studio/docs/screenshots/main_window.png` | raw.githubusercontent | visto [M] |
| Shabani 2023, "A review of graphical user interfaces of OpenSees", Frontiers Built Env. | frontiersin.org | letto [V] |
| Listini: Dlubal webshop, CDM Dolmen, Tecnisoft ModeSt PDF, Soft.Lab IperSpace PDF (2021-10), STS PDF (2026-03-20, **solo immagine**, testo non estraibile), Karamba3D, Seismosoft, eSEES | siti produttori | [V] / [NON TROVATO] |
| Forum: OpenSees community 2011, it.discussioni.ingegneria.civile 2008, INGforum 2024-25 | primari | letti |

---

## 1. Front-end OpenSees

| Tool | Cosa fa | Licenza / prezzo | Piattaforma | Maturità / ultimo segno di vita | UI | Limiti dichiarati |
|---|---|---|---|---|---|---|
| **STKO** (Asdea, Pescara) | Pre+post completo, import CAD, MPCO/HDF5, Python scripting, OpenSees parallelo | Commerciale, solo preventivo [V]. Free Learning: 20 linee / 100 superfici / 150 solidi, vietato uso commerciale e ricerca [V]. Trial 30 gg | **Solo Windows 64-bit** [V] | STKO 4.0.0 richiede OpenSees 3.7.0 [V]; data post non stampata ([INF] fine 2024) | Research-grade, densa [INF da doc] | Frontiers: no IDA automatica, no SSI. Nessuna verifica di norma oggi. **STKO Professional** "coming soon": licenza annuale, "ASCE and Eurocode checks planned", "AI/MCP assistance" [V] |
| **OpenSees Navigator** (PEER/UBC, MATLAB) | Pre/post GUI, import Perform3D | Gratis previa registrazione; termini [NON TROVATO] | Win/Mac standalone (MCR) | 2.5.9 → **2019-12-03** [V]; pagina cita 2.6.0 senza data | MATLAB figure | Frontiers: no IDA, no SSI. **Di fatto fermo dal 2019** [INF] |
| **GiD+OpenSees** (AUTh rclab) | Problemtype GiD: 1D/2D/3D, non lineare, multi-dominio SSI | GPL-3.0 plugin; GiD è commerciale (CIMNE), prezzo [NON TROVATO] | GiD (Win/Linux/Mac) | 102★ 44 fork, push 2026-02-08; ultima release GitHub v2.9.6 **2017-05-07** [M] | GiD generico | Frontiers: no IDA, no SSI |
| **BuildingTcl** (Mazzoni) | Libreria Tcl alto livello + GUI edifici | Gratis | Tcl | 1.9; autrice "not working on further development" ~2010 [V forum] | — | **Morto ~2010** |
| **eSEES** (Silvia's Brainery) | GUI+scripting "model manager", geometria non nodi | **$749.99 / 12 mesi** (pro) [V] | Windows [INF] | Data versione [NON TROVATO] | — | Frontiers: no import/export |
| **NextFEM Designer** (Italia) | Pre/post generico; esporta .tcl con fiber sections, lancia `OpenSees.exe` esterno (non incluso), rilegge recorder (solo 3D 6 gdl), procedure RS/pushover/TH | Base **gratis senza limiti nodi anche professionale** [V]; moduli a pagamento prezzo [NON TROVATO] | Windows 64 + Store "Lite" [V] | Manuale v2.5 © 2015-2026 [V] → vivo | Desktop classica | "Import from OpenSees could be incomplete" [V]; verifiche NTC [NON TROVATO] |
| **OpenSeesPy** | Solver Python | BSD-like | pip | 274★, push 2026-08-18; PyPI 3.8.0.0 2026-03-18 [M] | nessuna | non è front-end |
| **opstool** (yexiang92) | Pre (Gmsh, fiber mesh) + post (xarray) + vis per OpenSeesPy | GPL-3.0 | pip | 139★ 28 fork, push 2026-07-03; PyPI 1.0.26 2026-01-11 [M]; SoftwareX 2025 [V] | libreria, no GUI | — |
| **opsvis** (sewkokot) | Post matplotlib | GPL-3.0 | pip | 57★, PyPI 1.3.7 2026-03-30 [M] | no GUI | — |
| **vfo** (u-anurag) | Post/vis | MIT | pip | 46★, push 2024-08-12 [M] | no GUI | rallentato |
| **xara** (Perez/STAIRlab) | Refactor C++ OpenSeesRT, drop-in OpenSeesPy, più veloce | BSD-2 [V] | `pip install xara` | PyPI 0.0.33 **2026-09-02**; repo STAIRlab/xara 4★ push 2026-08-29 [M] | **API only, no GUI** [V] | versione 0.0.x |
| **veux** (STAIRlab) | Rendering FE web-first, glTF persistenti | licenza GitHub: none [M] | pip | 41★, PyPI 0.0.43 **2026-09-04** [M] | viewer, no modellatore | — |
| **opensees-gallery** (peer-open-source) | Esempi Tcl/Python + veux | BSD-3 | web | 12★, push 2026-03-10 [M] | — | nessuna norma [V] |
| **OpenSees Studio** (ogunc) | "SAP2000-style desktop GUI for OpenSeesPy": disegno telai su griglia, materiali/sezioni fibra, statica/modale/pushover/TH, diagrammi, `.osmodel` JSON Pydantic | **AGPL-3.0** | PySide6+PyVista, CI Linux/Mac/Win | Creato 2026-04-15; **6★, 1 fork, 1 contributor, 85 commit, ultimo commit 2026-05-22**, push 2026-08-21 [M]; "Pre-alpha" [V] | Screenshot visto [M]: Qt scuro, model explorer, viewport 3D con sezioni estruse, properties dock, console. Pulita, SAP-like | OpenSeesPy pinnato 3.5.1.12; **zero verifiche di norma**; cerca collaboratori [V] |
| OpenSeesGuiPy, pysees (TS), openSeesPy-GUI (Tongji), OPynSees2000 | GUI amatoriali | varie/none | — | 0–3★, 2022–2026 [M] | — | abbandonate o embrionali |
| **FeView** / OSLite / OpenSeesPyView | Post-proc/viewer | MIT / free / — | Win | 38★ push 2023-09 / 2★ 2019-11 / 29★ 2022-09 [M] | — | **morti** |
| RC-FIAP | Piattaforma OpenSeesPy per fragilità telai c.a. (ACI/ASCE) | MIT | Python | 17★, 2023-08 [M] | GUI didattica | norma USA |
| Convertitori ETABS→OpenSees | E2O-SEAOC2020 (MIT, 20★, **2020-12**); RDC_PERFORM (0★, 2025-10); Navigator importa Perform3D; NextFEM converte SAP2000→OpenSees; IFC→OpenSeesPy `opensees-kds-bim-pipeline` (1★, 2026-07) [M] | — | — | frammentari | — | nessuno mantenuto |
| **CDS Win** (STS) — OpenSees nascosto | "Libreria OpenSEES 64 bit": pushover, time-history, IDA, fondazione non lineare, output NTC 2018 | **Moduli aggiuntivi a pagamento** [V]; prezzi [NON TROVATO] (PDF listino solo immagine) | Windows | listino 2026-03-20 → vivo | verticale italiana | OpenSees "non allineato a normativa", CDS fa le verifiche [V] |
| **ModeSt** (Tecnisoft) — OpenSees nascosto | "Collegamento automatico ad uno dei seguenti solutori: XFINEST, SAP2000 e OpenSees (non compresi nel prezzo)"; pushover con OpenSees, verifiche NTC 2018 | C.A. FULL **3 950 €** con XFINEST / **2 650 €** senza solutore; C.A.+Acciaio 5 250/3 950 €; LITE 500 nodi 1 775/1 300 €; dongle USB [V] | Windows | listino senza data stampata | verticale italiana | — |
| **SeismoStruct** (non OpenSees) | Fibra non lineare, pushover adattivo, IDA | **4 000 €** full; supporto 800 €/anno; sconti 25–35 % multi-utente [V] | Windows [INF] | v2026 Release-2 [V] | desktop classica, IT/EN | Codici: EC8, **NTC-18**, ASCE 41, KANEPE, TBDY [V] |

Frontiers 2023 (Shabani): 15 GUI censite, 13 open access, 2 commerciali (eSEES, STKO). Solo FM-2D e Hyperomet automatizzano IDA; quasi nessuna interoperabilità CAE; **nessuna citata con verifiche di norma** [V].

Forum OpenSees 2011: utenti chiedono pre-processore gratuito, risposta = Gmsh + Tcl a mano [V]. Situazione oggi: stesso vuoto, coperto da script Python.

---

## 2. Commerciali di riferimento (utente NTC 2018)

| Software | Prezzo | Cosa fa che serve per essere credibili | Cosa fa male / lamentele |
|---|---|---|---|
| **SAP2000** (CSI) | USA: Basic $2 977 / Plus $7 439 / Advanced $11 903 / Ultimate $17 855; manutenzione $521–3 128 (listino CSI USA "checked 2026-07-29", fonte secondaria aecplustech) [V-sec]. CSI Italia: solo preventivo, cloud +30 % [V] | Modellazione generale, API OAPI | Verifiche NTC **non integrate**: serve **VIS** (CSI Italia, v19.2.2: NTC 2018+circolare, EC2/EC8, gerarchia resistenze, SLE, minimi, DXF armature, Design Wizard) [V]. "ETABS+VIS ≈ 11 000 €" (INGforum 2024) [INF] |
| **ETABS** | come sopra, preventivo | Edifici, combinazioni automatiche da codice, **Check Model** (joint/frame overlap) [V] | idem: NTC via VIS |
| **Midas Gen NX** (CSPFea) | Solo preventivo, PLUS/ADVANCED [V] | NTC2018 + Circ. 2019 implementate [V]; nuova UI "intuitiva" (marketing) | prezzo opaco; "stability issues" (secondario) |
| **Robot** (Autodesk) | Solo in AEC Collection; pagina Autodesk 403; reseller grigio 620–729 €/anno [INF] | BIM Revit | lock-in Autodesk; NTC via Eurocodici generici |
| **RFEM 6** (Dlubal) | Base **4 750 €** perpetua; service 800 €/anno; Concrete Design 2 950; Steel 2 950; Modal 1 350; Building Model 1 950 € [V]. Trial 90 gg | **Model Check + Plausibility Check** [V]; add-on modulari; **Mia** assistente AI [V] | costo add-on somma veloce; niente NTC nativo (Eurocodici + NA) [INF] |
| **SOFiSTiK** | Solo preventivo [V] | BIM/infrastrutture | opaco, complesso |
| **CDS Win** (STS) | [NON TROVATO] (PDF immagine); abbonamento −15 % [V] | OpenSees per pushover/TH/IDA + verifiche NTC [V] | UI storica [INF] |
| **Sismicad** (Concrete) | Preventivo; perpetua + noleggio "12 mesi al prezzo di 10" [V]; storico ~8 540 € IVA incl. (annuncio 2020) [INF]; Classic 3 600 vs 5 110 € (2020) [V] | Il più citato come "stabile, supporto ottimo", esecutivi fino in fondo (usenet 2008, INGforum 2024) [V] | "non permette intervento diretto nella modellazione", solo strutture "classiche" (2008) [V] |
| **IperSpace BIM** (Soft.Lab) | Listino 2021-10 IVA incl: C.A. Power 3 490 €, FULL 5 990 €, PREMIUM 7 490 €, PushOver 1 220 €; versioni a tempo da 249 € [V]; "da 999 €/anno" (Aranzulla) [INF] | multi-materiale, combinazioni sismiche automatiche [V] | — |
| **ModeSt** (Tecnisoft) | vedi tabella 1 | verifiche NTC, armature automatiche, IDEA StatiCa | dongle USB, Windows |
| **EdiLus** (ACCA) | EdiLus-CA ≈ 3 042,68 € IVA incl. (reseller); AmiCus obbligatorio dal 2° anno [INF] | BIM ACCA | lock-in ecosistema ACCA [INF] |
| **PRO_SAP** (2S.I.) | LT 750 nodi 3 075 € + IVA (annuncio) [INF]; rent-to-buy 5 rate/5 anni [V]. **Versioni gratuite Entry ed e-TIME dismesse: 2026-05-01 fuori dai pacchetti, 2026-07-31 e-TIME spento** [V ingenio 2026-03-26] | — | "gran ciofeca" (usenet 2008, 10 licenze abbandonate) [V]; forum dedicato chiuso |
| **Dolmen** (CDM) | CAD 3D 1 300 €; C.A.+GEOBASE 4 650 €; FULL 7 470 €; manutenzione 10 %/anno; edu −65 % [V] | modulare trasparente | — |

Lamentele ricorrenti trasversali (fonti forum): (a) **relazione di calcolo e esecutivi** sono il deliverable, non l'analisi (INGforum 2024) [V]; (b) prezzi opachi, quasi tutti "preventivo"; (c) stabilità (Travilog "freeze frequenti") [V]; (d) SAP2000 amato ma senza verifiche di norma integrate [V]; (e) Windows-only universale [INF: nessun prodotto sopra dichiara macOS/Linux].

---

## 3. Open source FEM con UI

| Tool | Stato [M] | Lezione su modello dati / UI |
|---|---|---|
| **PrePoMax** (CalculiX) | v2.6.1 dev 2026-08-26 [V]; Windows .NET | Pre/post solidi, non telai. UI ordinata a albero (Model/Mesh/BC/Step). Zero norme |
| **FreeCAD FEM** 1.0 | 33 249★, push oggi [M]; CalculiX default | Beam elements aggiunti in 1.0, ma CalculiX beam "wrong results in some cases" [V blog] → CAD-first non serve al telaio c.a. |
| **Karamba3D** | PRO **900 €/anno** [V]; Grasshopper | Parametrico, non un modellatore standalone |
| **compas_fea** | **archived**, push 2024-10-03 [M] | morto |
| **compas_fea2** | 14★, PyPI 0.2.1 2024-05-15, push 2025-11-20 [M] | Modello backend-agnostico con plugin (Abaqus/OpenSees/…): pattern interessante, adozione nulla |
| **PyNite** | MIT, **737★**, v3.0.0 2026-06-01 [M] | Modello Python puro, JSON export (`pynite-tools`), esiste **MCP server** [V]. 3D telai, P-Δ, combinazioni. Zero norme |
| **anaStruct** | LGPL-3, 464★, v1.7.0 2026-06-06 [M] | 2D solo |
| **OpenSees Studio** | vedi §1 | `core` Pydantic senza Qt, `.osmodel` JSON diffabile, MVVM, esempi verificati vs Wiki [V] — **il modello dati più vicino al target** |
| **opstool** | vedi §1 | Risultati come xarray etichettati [V] |
| **veux** | vedi §1 | Rendering persistente glTF apribile senza software [V] |

---

## 4. Il vuoto — evidenze

Domanda: esiste oggi modellatore OpenSees moderno, gratuito, UI pulita, telai c.a., verifiche europee? **No.** Ogni candidato manca almeno due assi:

| Candidato | Gratis | UI moderna | Multi-OS | Telai c.a. | Verifiche EC/NTC | Vivo |
|---|---|---|---|---|---|---|
| STKO | no (learning 20 linee) | research | Win only | sì | **planned, in Pro a pagamento** | sì |
| Navigator | sì | MATLAB 2019 | Win/Mac | sì | no | **2019** |
| GiD+OpenSees | plugin sì, GiD no | GiD | sì | sì | no | release 2017 |
| eSEES | $750/anno | — | Win | sì | no | ? |
| NextFEM | base sì | classica | Win | sì | [NON TROVATO] | sì |
| CDS / ModeSt | no (2 650–3 950 € + moduli) | verticale legacy | Win | sì | **sì NTC** | sì |
| OpenSees Studio | sì (AGPL) | **sì** | **sì** | sì | **no** | 1 dev, 85 commit, ultimo 2026-05-22 |
| SeismoStruct | 4 000 € | classica | Win | sì | sì NTC-18 | sì, ma non OpenSees |

Evidenze aggiuntive:
- Frontiers 2023: 15 GUI censite, nessuna con verifiche di norma [V].
- Unico prodotto che dichiara verifiche EC su OpenSees = STKO Professional, "coming soon", licenza annuale, checks "planned" [V] → il vuoto è riconosciuto dal leader e monetizzato.
- CDS e ModeSt usano già OpenSees come motore non lineare dietro verifiche NTC [V] → **validazione di mercato**: l'accoppiata "OpenSees + verifiche italiane" esiste ma chiusa, Windows, legacy.
- Fascia gratuita in Italia **si restringe**: PRO_SAP e-TIME spento 2026-07-31 [V]. Restano NextFEM base e JASP limitato (INGforum).
- opensees-studio è nato 2026-04 e mira esattamente al target ("SAP2000-style", `.osmodel` JSON) ma è 1 persona, AGPL, senza norme [M/V]. È il concorrente/alleato più vicino.
- xara+veux (Perez, Berkeley) forniscono solver moderno pip-installabile + rendering web, entrambi rilasciati **questa settimana** [M] — lo strato solver/vis moderno esiste, manca solo la GUI+norma sopra.

Sintesi [INF]: il vuoto è **"GUI pulita multi-OS + OpenSees + verifiche NTC 2018/EC2/EC8 su telai c.a. + relazione di calcolo, gratuita"**. Nessuno dei 20+ tool copre più di 3 assi su 6.

---

## 5. Censimento "funzioni intelligenti" già in prodotto

| Categoria | Prodotto | Cosa fa | Fonte |
|---|---|---|---|
| Auto-check modello | ETABS **Check Model** | overlap/joint/frame, evidenzia errori | docs CSI [V] |
| | RFEM 6 **Model Check + Plausibility Check** | nodi identici, aste sovrapposte, coerenza dati | manuale Dlubal [V] |
| | Sismicad "verifica di risposta strutturale sismica" | copia automatica progetto con base fissa e spettro suolo A, confronto tagli globali | comunicato [V] |
| | SkyCiv `skyciv.validator` API + "AI assistant" (2025) | validazione modello; claim AI da fonte secondaria | [V]/[INF] |
| Combinazioni automatiche | ETABS, SkyCiv (EN 1990), IperSpace, tutte le verticali IT | generazione da codice | [V] |
| Suggerimento sezione/armatura | VIS **Design Wizard** | armatura automatica parametrica | CSI Italia [V] |
| | ModeSt "progetto automatico ed interattivo delle armature" | travi, pilastri, pareti, plinti, pali | listino [V] |
| | RFEM "Model Optimization Using AI" (webinar 2022) | ottimizzazione parametrica | Dlubal [V] |
| Assistente LLM | Dlubal **Mia** (2024-03) | chat ChatGPT-4.0 su knowledge Dlubal dentro RFEM; risponde, **non modella né controlla** | [V] |
| | STKO Professional "AI/MCP assistance", "AI-assisted modeling" | annunciato, non rilasciato | [V] |
| | Liang, Kalaleh, Mei, arXiv 2504.09754 (2025-04) | LLM → script OpenSeesPy da testo; GPT-4o 100 % su 20 problemi | [V] |
| | Pynite MCP server (buildwellai) | espone PyNite a LLM via MCP | [V] |
| | stru.ai, PhysicsX | terze parti su API ETABS/SAP | secondario [INF] |

Nessun prodotto trovato combina LLM con **verifica di norma spiegata** (es. "SLU flessione fallisce per X, suggerisco Y"). [NON TROVATO]

---

## Domande aperte per il brainstorming

1. Target primario: **verifica NTC 2018** (mercato italiano, richiede relazione di calcolo) o **modellazione non lineare pulita** (nicchia ricerca/PBD, dove STKO Pro sta arrivando)? Le due cose hanno UX opposte.
2. Motore: OpenSeesPy ufficiale (3.8.0.0) o **xara** (drop-in, più veloce, 0.0.33, BSD)? Rischio: xara pre-1.0; vantaggio: geometria non lineare riformulata, veux nativo.
3. Rapporto con **OpenSees Studio** (AGPL, 1 dev, stesso target meno norme): contribuire, forkare (AGPL vincola), o partire da zero con altra licenza? Il suo modello `.osmodel` Pydantic è un buon riferimento.
4. Piattaforma: desktop Qt (come Studio/STKO) o **web** (veux è web-first; nessun concorrente è multi-OS)? Mario su macOS → tutti i commerciali gli sono preclusi senza VM.
5. Perimetro norme fase 1: solo c.a. telai (EC2 + NTC §4.1 + §7.4 gerarchia) o anche acciaio? VIS copre solo c.a. e basta a CSI Italia.
6. Deliverable: senza **relazione di calcolo esportabile** il tool non entra nello studio (INGforum 2024). Dentro fase 1 o no?
7. Licenza: AGPL blocca adozione da studi; MIT/BSD apre a fork commerciali (CDS/ModeSt già chiudono OpenSees).
8. "Funzioni intelligenti": auto-check deterministico (RFEM-style) prima di qualunque LLM? Nessun concorrente ha un LLM che agisce sul modello con norma in mezzo.

---

## Raccomandazioni (non decisioni)

- **[Raccomandazione]** Posizionare il vuoto come "OpenSees + verifiche NTC/EC su telai c.a. + UI pulita multi-OS", non come "ennesima GUI OpenSees": le GUI generiche sono 15+ e morte in massa; l'asse norma è quello che nessuno gratuito copre e che STKO Pro sta per vendere.
- **[Raccomandazione]** Leggere `ogunc/opensees-studio` (`docs/architecture.md`, `.osmodel`) prima di disegnare il modello dati: è la cosa più vicina, verificata contro gli esempi Wiki, e il suo autore cerca collaboratori. Decidere presto se contribuire o divergere, per la licenza AGPL.
- **[Raccomandazione]** Valutare xara+veux come strato solver/vis: rilasci 2026-09-02 e 2026-09-04, stessa persona che sta riformulando OpenSees a Berkeley; ma pinnare versione, è 0.0.x.
- **[Raccomandazione]** Auto-check deterministico del modello (nodi duplicati, aste sconnesse, masse mancanti, combinazioni incomplete) è la "funzione intelligente" a costo minimo e valore massimo: la hanno solo i commerciali da 4 750 € in su.
- **[Raccomandazione]** Relazione di calcolo esportabile in scope fase 1 se il target è lo studio italiano.
- **[Caveat]** Prezzi CSI in USD da fonte secondaria; CDS listino illeggibile (immagine); NextFEM moduli e verifiche NTC non trovati in chiaro; STKO 4.0.0 data non stampata. Robot: pagina Autodesk 403.

---

## Fonti

Locale: `/Users/mario/GitHub/Tesi/README.md`, `/Users/mario/GitHub/Tesi/docs/validazione/README.md`, `/Users/mario/GitHub/Tesi/docs/validazione/ricerca-opensees-e-armature.md`, `/Users/mario/.claude/skills/tech-stack-evaluator/scripts/ecosystem_analyzer.py`.

OpenSees front-end: https://www.stko.net/ · https://www.stko.net/stko-professional · https://asdea.eu/software/academic-educational-licenses/ · https://asdea.eu/software/commercial-licenses/ · https://asdea.eu/software/system-requirements/ · https://asdea.eu/en/blog/structural-analysis-stko-v4-features/ · https://openseesnavigator.berkeley.edu/?page_id=6 · https://openseesnavigator.berkeley.edu/?page_id=29 · https://github.com/rclab-auth/gidopensees · http://opensees.berkeley.edu/community/viewtopic.php?t=17417 · https://www.silviasbrainery.com/product-page/esees-a-graphical-and-scripting-interface-for-opensees-2 · https://www.nextfem.it/it/opensees/ · https://www.nextfem.it/ · https://github.com/yexiang92/opstool · https://opstool.readthedocs.io/en/latest/ · https://github.com/sewkokot/opsvis · https://github.com/u-anurag/vfo · https://xara.so/ · https://github.com/STAIRlab/xara · https://github.com/STAIRlab/veux · https://gallery.stairlab.io/ · https://github.com/peer-open-source/opensees-gallery · https://github.com/ogunc/opensees-studio · https://github.com/motiurce/FeView · https://github.com/jacques-chen/oslite · https://github.com/Junjun1guo/OpenSeesPyView · https://github.com/vfceball/RC-FIAP · https://github.com/OpenSeesPro/E2O-SEAOC2020 · https://www.frontiersin.org/journals/built-environment/articles/10.3389/fbuil.2023.1233116/full · https://opensees.berkeley.edu/community/viewtopic.php?f=8&t=29490 · https://www.stsweb.it/opensees/ · https://www.tecnisoft.it/assets/files/Listino_ModeSt.pdf · https://seismosoft.com/product/seismostruct/ · https://pypi.org/project/openseespy/ · https://pypi.org/project/xara/ · https://pypi.org/project/veux/

Commerciali: https://www.aecplustech.com/tools/sap2000 · https://www.csi-italia.eu/software/sap2000/listino-sap2000/ · https://www.csi-italia.eu/software/etabs/listino-etabs/ · https://www.csi-italia.eu/software/vis/ · https://docs.csiamerica.com/help-files/etabs/Menus/Analyze/Check_Model.htm · https://www.cspfea.net/prodotti/midas-gen-nx/costo-midas-gen-nx/ · https://www.cspfea.net/doc_prodotti/Midas_Gen/cspfea-midas-gen-implementazione-ntc2018.pdf · https://www.autodesk.com/products/robot-structural-analysis/overview · https://www.dlubal.com/en/webshop/rfem-family · https://www.dlubal.com/en/downloads-and-information/documents/online-manuals/rfem-6/000437 · https://www.dlubal.com/en/support-and-learning/support/product-features/002793 · https://www.sofistik.com/en/italia · https://www.stsweb.it/downloads/brochure/listino.pdf · https://www.stsweb.it/piani-di-abbonamento/ · https://www.concrete.it/acquista/ · https://www.concrete.it/acquista/offerte-commerciali/ · https://www.legislazionetecnica.it/6665412/ · https://www.legislazionetecnica.it/6791567/ · https://www.soft.lab.it/wp-content/uploads/2021/10/Linstino-IperSpace-BIM.pdf · https://www.soft.lab.it/combinazioni-di-carico-in-condizioni-sismiche-come-crearle-ed-interpretarle-in-iperspace-bim/ · https://www.aranzulla.it/programmi-per-calcolo-strutturale-1545650.html · https://www.tecno3d.it/wp-content/uploads/2025/09/LISTINO-PREZZI-ACCA-T3D-new.pdf · https://www.2si.it/rent-to-buy/ · https://www.ingenio-web.it/articoli/software-strutturale-pro-sap-stop-alle-versioni-gratuite-entry-ed-e-time-cosa-devono-fare-i-progettisti-entro-il-2026/ · https://ingforum.it/community/discussione/cedo-licenza-pro_sap-lt-2si.24454/ · https://www.cdmdolmen.it/listino/listino.htm · https://ingforum.it/community/discussione/consiglio-su-miglior-software-di-calcolo-gratuito-per-iniziare-la-professione.23868/ · https://it.discussioni.ingegneria.civile.narkive.com/m07mRa9r/software-strutturali

Open source: https://prepomax.fs.um.si/version-2-6-0/ · https://blog.freecad.org/2024/09/28/major-fem-workbench-improvements-for-freecad-1-0/ · https://buy.karamba3d.com/products/pro-license · https://github.com/compas-dev/compas_fea · https://github.com/compas-dev/compas_fea2 · https://github.com/JWock82/Pynite · https://pypi.org/project/pynite-tools/0.7.0/ · https://lobehub.com/mcp/buildwellai-mcp-pynite · https://github.com/anastruct/anaStruct

AI/intelligenti: https://arxiv.org/abs/2504.09754 · https://www.dlubal.com/en/support-and-learning/learning/webinars/002518 · https://skyciv.com/api/v3/docs/s3d-validator/ · https://stru.ai/blog/structural-engineering-ai-tools
