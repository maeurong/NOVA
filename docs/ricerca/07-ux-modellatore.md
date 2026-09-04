# Ricerca: UX — cosa rende sofisticata l'esperienza d'uso di un modellatore strutturale

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato dopo che Mario ha dichiarato la UX «estremamente sviluppata e sofisticata» come requisito di prodotto. Domanda posta: punti di dolore documentati del flusso di lavoro dell'ingegnere, pattern di interazione eccellenti, risultati strutturali come UX, inventario delle skill di design locali, motion/accessibilità, metodo per sviluppatore singolo.

Letture locali da `/Users/mario/GitHub/Tesi`, branch `feat/il-numero-di-prima`, HEAD `782f507`. Nessun `graphify-out/` in Tesi → grep/Read diretti.

**Skill-gate:** `tech-stack-evaluator` saltata. Motivo: task = ricerca disciplina UX, nessun confronto fra stack/librerie; i suoi script (TCO, ecosystem, migration) non hanno ingresso qui. `caveman:caveman` invocata.

**Premesse del brief ricontrollate.** `README.md` righe 3-14 (brief dice 4-13: scostamento di una riga, marginale) descrive pipeline e stop al deck [V]. `PRODUCT.md:76-78` contiene la regola «ogni numero che l'applicazione mostra ha un controllo che lo contraddice» sotto Positioning [V]; Product Principles 186-201, Accessibility 203-208 [V]. Tutte e 6 le skill esistono ai percorsi indicati [V]. `.impeccable/critique/` ha 3 file [V].

**Limite di raccolta, dichiarato:** Eng-Tips (403 diretto, via Wayback, via jina) e Reddit (403 + «blocked by network security») non aprono. Per quei thread si cita solo ciò che il motore di ricerca ha estratto, taggato **[INF-snippet]**: parafrasi del motore, pagina non letta, URL riportato. Newsgroup italiano letto via narkive (statico) [V] ma datato 2004-2008: staleness dichiarata dove usato.

Tag: **[V]** fonte letta · **[M]** misurato in sessione · **[INF]** inferenza · **[INF-snippet]** solo snippet del motore · **[NON TROVATO]**.

## Artefatti consultati

| artefatto | provenienza | stato |
|---|---|---|
| `PRODUCT.md`, `README.md`, `docs/validazione/ricerca-opensees-e-armature.md:16-21` | `/Users/mario/GitHub/Tesi` @ 782f507 | letti [V] |
| 3 critique impeccable (14/08 17:47, 14/08 18:50, 16/08 11:21) | `/Users/mario/GitHub/Tesi/.impeccable/critique/` | letti per intero [V] |
| 6 SKILL.md + `impeccable/reference/{critique,operate}.md` | `/Users/mario/.claude/skills/` | letti [V]; `design-taste-frontend` 508/1207 righe + grep sezioni scope |
| Blender HIG «Design Paradigms» | developer.blender.org | curl, testo pieno [V] |
| Plasticity manual «Command Palette» | doc.plasticity.xyz | curl, testo pieno [V] |
| Blender manual Undo/Redo, Input Fields | docs.blender.org | curl [V] |
| Munzner 2009 «A Nested Model…» PDF | cs.ubc.ca | pdftotext [V] |
| ViewCube (Khan et al., I3D 2008) PDF | research.autodesk.com | pdftotext [V] |
| Wilson, cap. 4 «Cognitive Walkthrough» PDF | cs.uwaterloo.ca | pdftotext [V] |
| NNG: heuristic evaluation, 5 users, usability metrics, response times, empty states, progressive disclosure, two gulfs | nngroup.com | WebFetch [V] |
| W3C Understanding 1.4.11, 2.4.13 | w3.org | WebFetch [V] |
| Onshape help (Part Studios, Feature basics), tech tip Roll to here | cad.onshape.com, onshape.com | WebFetch [V] |
| Figma blog UI3, Figma help Actions menu | figma.com | WebFetch [V] |
| performance.dev «How's Linear so fast», Knock «keyboard shortcuts» | | WebFetch [V] |
| Speckle blog viewer redesign; Karamba3D manual BeamView; CSI SAP2000 «Show Deformed Shape»; Abaqus/CAE deformed shape plot | | WebFetch [V] |
| EGU blog rainbow (riporta Borland & Taylor 2007) | blogs.egu.eu | WebFetch [V]; Moreland PDF non aperto (>10 MB) |
| narkive: «Software strutturali» 2008, «per utenti sismicad e mastersap» 2008, «Domanda rivolta ad utenti sismicad» 2004 | it.discussioni.ingegneria.civile | curl [V] |
| INGforum «CDS e scarichi fondazione» 2022, «Consiglio su miglior software…» | ingforum.it | WebFetch [V] |
| soft.lab «Combinazioni di carico sismiche in IperSpace BIM»; marcodepisapia «32 combinazioni» | | WebFetch [V] |
| Dlubal community «RFEM 6 file size and performance» | community.dlubal.com | WebFetch [V] |
| re-tug «Diaphragm Slicer ETABS API» | | WebFetch [V] |
| buildupreport substack; solidsmack Shapr3D; proav.de projection rules; parametricdesign Onshape | | WebFetch [V] |
| Eng-Tips Robot 475479 / 501591, Combinito 495947, Sorting combos 515939, NBCC 519016 | eng-tips.com | **403** → [INF-snippet] |

## 1. Punti di dolore per fase

| fase | dolore documentato | fonte | tag |
|---|---|---|---|
| **Onboarding / prima apertura** | «39% of the structural engineers polled by the BuildUp responded that it takes longer than three months to learn a particular structural program.» «One in five engineers are so dissatisfied with the learning guides produced by established software providers that they have resorted to learning complex software through trial and error.» | buildupreport.substack.com | [V] |
| | Robot: «different modules appear to be created by different people», «consumes a lot of time just navigating the UI and figuring out what tool to use for relatively simple tasks»; «many dialog options that either shouldn't show up or be disabled because the buttons do nothing when pressed» | eng-tips 475479, 501591 | [INF-snippet] |
| | «all'università odiavo Nolian» per l'interfaccia (ingenium75, 2008) | narkive «Software strutturali» | [V], 2008 |
| **Griglia/assi** | Nessuna lamentela specifica trovata. | — | [NON TROVATO] |
| **Nodi/aste** | MasterSap: «carichi trapezoidali, si possono inserire ma non si vedono nella rappresentazione in quanto rappresentati come media, per cui se non si fa attenzione a verso degli elelemnti e del modo in cui sono iseriti si commette errore»; «allineamenti che bisogna fare inserendo gli scostamenti a mano» (pippo65, 2008) | narkive «per utenti sismicad e mastersap» | [V], 2008 |
| **Sezioni/materiali** | In casa: `analysis.material` era «un input `readOnly` da 14px contenente il JSON del modello: modulo di Young e densita', le due cose che una tesista strutturale vorra' cambiare per prime, non sono modificabili dall'interfaccia» | critique 16/08 §Cose piccole | [V] |
| **Vincoli** | «Inserito un vincolo ad un nodo non se ne può inserire un altro, se blocchi con piano rigido non puoi magari bloccare lo stesso nodo con corpo rigido» (pippo65) | narkive | [V], 2008 |
| **Carichi e combinazioni** | MasterSap: «la possibilità di gestirti autonomamente condizioni e combinazioni di carico, senza definire prima la Banca dei codice dei carichi, poi la scelta dei tipi, infine assegnare le azioni esterne (terribilmente farraginoso in MasterSap)» (Ing. Sieno) | narkive | [V], 2008 |
| | IperSpace: «si debbono considerare ai fini del calcolo 32 combinazioni sismiche»; «Ognuna di queste combinazioni va poi suddivisa in ulteriori quattro per tener conto della permutazione dei segni» | soft.lab.it | [V] |
| | «Le relazioni di calcolo strutturale prodotte dai software di calcolo contengono centinaia di pagine e tabulati. Uno dei motivi che rende i fascicoli di calcolo così voluminosi è senza dubbio l'elevato numero di combinazioni di carico in condizioni sismiche.» | marcodepisapia.com | [V] |
| | CSI: esiste tool terzo «Combinito» solo per generare combinazioni SAP/ETABS/SAFE; thread 2024 su impossibilità di ordinare le combinazioni; NBCC: «the selling feature of using software is that some of these tasks can be automated» | eng-tips 495947, 515939, 519016 | [INF-snippet] |
| | RFEM 6: «all load combinations are treated as independent loadings, so calculations and results are stored separately» (Pavel) | community.dlubal.com/t/2241 | [V] |
| **Analisi / attesa** | RFEM 6: «RFEM 6 files are about 2.5 times larger than RFEM 5», 8 GB per 50×50 m 3 piani, apertura/salvataggio lenti (Pavel) | idem | [V] |
| | Robot «crashing more than other programs they use, often with no error message or recovery» | eng-tips 475479 | [INF-snippet] |
| | In casa: 27-34 s a freddo, «nulla lo dice»; «una corsa fallita non alza nessun allarme» — `exit_code` trasmesso e mai letto | critique 16/08 P0 ×2 | [V] |
| **Lettura risultati** | ETABS section cut: «Notice how you have to enter (4) valid points to define a section cut... a time consuming process.» «Defining lots of these section cuts along the length of a diaphragm is tedious.» | re-tug.com | [V] |
| | RFEM 6: «Result Combinations, even when using the 'Superposition' type, never display loads in the graphic view» (Pavel) | dlubal community | [V] |
| | Robot: «getting seemingly simple results from analysis is also very complex» | eng-tips 501591 | [INF-snippet] |
| | Abaqus/CAE scala automaticamente la deformata: «the displacements are scaled automatically to ensure that they are clearly visible», fattore mostrato nello state block (es. 42.83) | abaqus-docs.mit.edu | [V] |
| **Verifiche** | «Un buon software per l'acciaio poi dovrebbe avere la possibilità di stampare/mostrare verifiche "in chiaro", cioè non un tasso di lavoro ( 85%) ma le singole verifiche col risultato come se le si facesse a mano. E sarebbe bello se avesse un controllo sulle lunghezze di libera inflessione, un tipico quanto pericolosissimo errore che "scappa" usando programmi.» (Benedetto) | narkive «Software strutturali» | [V], 2008 |
| | Sismicad: «se li sostituisco con uguali diametri ma sagomati come vuole la tradizione, mi da errore "sezione non verificata in x=0"… anche se aumento l'armatura. Boh!» (Luigi, neolaureato); risposta utente storico: «Io ho protestato ma non mi hanno dato retta.(chiedevo solo un bottoncino).» | narkive «Domanda rivolta ad utenti sismicad» | [V], 2004 |
| **Relazione / export** | CDS: «come al solito il CDS è poco intutitvo, mi tira fuori le reazioni vincolari, ovvero già combinate e solo agli SLV»; «Ho generato manualmente le combinazioni SLE, ho poi modificato tutte le tabelle generate in word»; «allucinante, per un SW pagato migliaia di euro, a loro non costava nulla far esportare tutto» (el ingeniero, 2022) | ingforum.it 22573 | [V] |
| | Robot: report «large reports with poor formatting and broken table headers that are mostly unreadable» | eng-tips 475479 | [INF-snippet] |
| | In casa: Galleria «mostra zero delle otto grandezze per cui esiste», hash da 64 caratteri sfonda la barra | critique 16/08 P1 | [V] |

Sintesi [INF]: dolore ricorrente = (a) combinazioni digitate a mano e non tracciabili; (b) risultati che il programma possiede ma non mostra/esporta; (c) verifica come «tasso» opaco invece che calcolo ripercorribile; (d) attesa muta; (e) moduli incoerenti fra loro. Nessuna lamentela specifica sull'asse/griglia: fase evidentemente «risolta» dai concorrenti o sotto la soglia di attenzione.

## 2. Pattern eccellenti

| pattern | dove documentato (verbatim) | applicazione al modellatore |
|---|---|---|
| **Non-blocking / non-overlapping / non-modal** | Blender HIG: «Blender doesn't pop up requesters that require the user to fill in data before things execute. The UI should stay responsive by all means, at least for the common and most used operations. When things exceptionally do block (while rendering or simulations) it should be clearly indicated and allow an immediate exit.» «The UI should enable you to view all relevant options and tools at a glance, without the need for pushing or dragging windows around.» [V] | Analisi OpenSees = «rendering»: barra di stato viva + Annulla sempre visibile; niente finestra modale per sezione/carico: pannello laterale. Contrasta direttamente Robot «dialog options… do nothing». |
| **Select → Operate; Operate → Settings** | Blender HIG: «In Blender you first indicate which data you work on, and then what you want to do.» «tools to be adjusted after you've used them. This prevents annoying popups forcing you to decide settings before you even know how they'd look like.» [V] | Selezioni 4 aste → pannello mostra «Assegna sezione», «Carico distribuito»; dopo l'azione, pannello «ultima operazione» per ritoccare valore senza rifare. |
| **Adaptive UI per selezione** | Shapr3D (solidsmack): «Select one entity and you see only the applicable commands. Select two entities and you see another set of commands.» [V] | Un nodo → vincolo/massa/carico nodale; due nodi → «crea asta»; un'asta → sezione, rilasci, carico. |
| **Command palette + conflitti visibili** | Plasticity: «Press F key in the work area to display the Command Palette. Execute a command by typing its name.» «If you assign a shortcut that's already in use, it will highlight the conflicting shortcut in red color.» [V]. Figma: Actions menu su «Command K on MacOS or Control K on Windows» [V]. Knock: «Shortcuts are only useful to users if they know that they are there.»; «The user can use the key bindings without having to change settings in the product, the browser, or the OS.» [V] | ⌘K con ricerca fuzzy di ogni comando + valori (es. «sezione 30x50»); scorciatoia mostrata in ogni tooltip e voce di menu. Chiude euristica 7 = 1/4 nelle 3 critique. |
| **Keyboard-first senza animazione** | emil-design-eng: «Never animate keyboard-initiated actions.» «Raycast has no open/close animation.» [V locale] | Palette e cambi step senza transizione; animazione solo su deformata/modi. |
| **Local-first / optimistic** | performance.dev: «UI responsiveness should not depend on network latency.» «The user never waits to see their own change.» [V] | Modello in memoria + persistenza asincrona; edit del carico visibile subito, run OpenSees in background. |
| **Anteprima prima del commit** | Onshape: «The Preview slider is an opacity control that lets you adjust the display opacity of the feature along a scale of 0% (before the feature is applied) to 100% (after the feature is applied).» [V] | Ghost dell'asta/carico durante il dialogo; conferma = Invio. Vale anche per «rigenera da qui in giù»: mostra in ghost cosa verrà sovrascritto (critique P1 «non dichiara cosa riscrive»). |
| **Undo illimitato e cronologia visibile** | Blender: «There is also an Undo History of the last actions taken… A small icon of a dot next to one of the entries indicates the current status… you can hop around on the Undo timeline as much as you want as long as you do not make a new change.» [V]. Onshape: «unlimited 'undo' and 'redo'» vs «restricted to 'undoing' only 5 or 10 steps» nei CAD legacy [V]; rollback bar: «repositioned to generate the Feature list up to its location in the list» [V] | Cronologia operazioni come lista (crea asta, assegna sezione, combina…) navigabile; è anche il registro di provenienza (PRODUCT P4). |
| **Direct manipulation + input numerico** | Rhino Gumball: trascina freccia per muovere, «typing a distance and pressing Enter allows for exact values»; Snappy Dragging aggancia agli osnap attivi | docs.mcneel.com/rhino/8 [INF-snippet, URL doc] | Gizmo su nodo/asta: drag con snap a griglia/assi, oppure digita «3.5». |
| **Gizmo di orientamento** | ViewCube paper: «users prefer and are almost twice as fast at using the ViewCube with dragging compared to clicking techniques»; hover: «we highlight the part that would be selected if clicked» [V] | Cubo in angolo con hover-highlight; viste XY/XZ/3D con animazione per non perdere l'orientamento (studio: utenti novizi «my box disappeared and there's only a square now» senza rotazione animata). |
| **Espressioni e unità nei campi** | Blender: «You can enter mathematical expressions into any number field.» «you can specify numbers and units… `1m`, `3mm`, `1m, 3mm`, `2ft`…» «You can mix units, e.g. metric and imperial» [V]. Fusion: espressioni in dimensioni con conversione automatica [INF-snippet] | Campo carico accetta `25 kN/m`, `2.5*9.81`, `30 cm`; unità dichiarate in un punto (PRODUCT vincoli). |
| **Progressive disclosure** | NNG: «Progressive disclosure defers advanced or rarely used features to a secondary screen, making applications easier to learn and less error-prone.» «You have to disclose everything that users frequently need up front» [V] | Pannello sezione: b, h, materiale in vista; copriferro, staffe, rilasci sotto «Avanzate» aperte una volta e ricordate. |
| **Empty states che insegnano** | NNG 3 guideline: «Use Empty States to Communicate System Status», «…Provide Learning Cues», «…Provide Direct Pathways for Key Tasks» [V] | Viewport vuoto: «Nessun nodo. Premi N o importa griglia» + link «cos'è un telaio in questo programma». |
| **Filtri/selezione per proprietà** | Speckle: «Filters now have their own full-height panel on the left.» «Measuring, Sectioning, Exploding, View modes, and Light controls now live in a central panel at the bottom of your screen» [V] | Filtro per tipo (trave/pilastro), sezione, piano, «verifica fallita»; colora-per-proprietà. |
| **Pannello proprietà che si ritrae** | Figma UI3: «The idea that work should be the center of the canvas will remain true»; pannelli flottanti ritirati dopo beta perché «cramped the canvas and slowed workflows» [V] | Pannelli fissi ridimensionabili, non flottanti; «Minimize UI» per proiezione in aula. |
| **Attesa** | NNG: «10 seconds is about the limit for keeping the user's attention focused on the dialogue»; oltre «they should be given feedback indicating when the computer expects to be done»; fra 1 e 10 s «a true percent-done indicator may be overkill» [V] | Analisi lineare < 1 s: nessun indicatore. Modale/nonlineare > 10 s: fasi nominate («assemblaggio», «autovalori 3/6») senza percentuale inventata (PRODUCT P3). |

## 3. Risultati strutturali come UX

- **Colormap.** EGU (riporta Borland & Taylor 2007): «The rainbow colour scheme adds randomly (at least) two strong artificial boundaries to the data: One along the red-yellow transition (at 0.4 of the colour bar range) and one along the blue-cyan transition (at 0.7 of the colour bar range).»; «unreadable for people with most forms of colour blindness, and when printed in black and white»; alternative viridis/magma/inferno, batlow/devon/oslo/broc [V]. Moreland cool-warm divergente per grandezze con zero significativo (M, N) [NON aperto: PDF > limite; citato per titolo]. Applicazione: sequenziale percettiva per utilizzo/spostamenti, divergente cool-warm per M/N/σ con zero al centro; mai rainbow. Appendice stampata in B/N (PRODUCT Brand) → obbligo, non gusto.
- **Convenzione fisica del colore.** Karamba: «Red (similar to brick) indicates compression, while blue (similar to steel) represents tension»; «Result values beyond the upper limit appear yellow, below the lower threshold green» + Legend [V]. Diagrammi M sul lato teso (convenzione italiana) [INF, da verificare con Mario].
- **Scala della deformata = numero da dichiarare.** SAP2000: «The Auto option will automatically set the scale factor.»; «Wire Shadow… will also display the undeformed shape as a reference»; «View the displacement components for a single joint by right clicking on a joint» [V]. Abaqus: «The scale factor is displayed in the state block.» [V]. Applicazione: fattore sempre stampato sul viewport («×120, auto»), ombra indeformata di default, click sul nodo → valore numerico. Regola PRODUCT P3: nessuna deformata senza scala dichiarata.
- **Verifica fallita = doppio canale.** WCAG 1.4.11: «Parts of graphics required to understand the content» ≥ 3:1 [V]; critique 16/08 sul fronte di Pareto: «Colore e fondo sono i suoi unici due canali — `on_front` non arriva mai all'albero di accessibilita'» [V]. Applicazione: asta fallita = colore + spessore/tratteggio + etichetta «1.23» + riga in tabella filtrabile. Colore rosso/verde è la convenzione (STAAD verde pass; EnerCalc blu ≤1 / rosso >1) [INF-snippet] ma non basta da sola.
- **Verifiche in chiaro.** Benedetto 2008 chiede «le singole verifiche col risultato come se le si facesse a mano» [V]. Coincide con PRODUCT P1: «Un numero mostrato senza un controllo che lo smentisca non vale più di un numero assente.» Applicazione: ogni ratio cliccabile → formula NTC, valori sostituiti, riferimento paragrafo; il «controllo che contraddice» = ricalcolo indipendente (es. Σ reazioni = Σ carichi; equilibrio per piano; periodo T1 vs formula NTC 7.3.3.2) mostrato accanto.
- **Inviluppi.** Nessuna fonte di design trovata [NON TROVATO]; [INF] mostrare inviluppo + combinazione governante per punto (hover → «SLV 12, sisma X+ecc.»); marcodepisapia e IperSpace documentano 32 combinazioni: senza «quale governa» il numero è muto.
- **Modi.** SAP2000 animazione con slider velocità [V]. [INF] modi: animazione a scala dichiarata, massa partecipante accanto al numero (NTC 7.3.3.1 85%), frecce di direzione.
- **Munzner.** «an upstream error inevitably cascades to all downstream levels. If a poor choice was made in the abstraction stage, then even perfect visual encoding and algorithm design will not create a visualization system that solves the intended problem.» [V]. Livello encoding: «Methodologies such as heuristic evaluation [53] and expert review [44] are a way to systematically ensure that no known guidelines are being violated by the design.» → impeccable critique = validazione immediata legittima a quel livello; non sostituisce prova con utenti (validazione downstream).
- **Tufte.** data-ink, chartjunk, small multiples [V su fonti secondarie]. Applicazione: small multiples per confrontare M in 32 combinazioni o 6 modi in una griglia, stessa scala.
- **Regola di casa applicata al viewport.** Critique 16/08 domanda 3: «Rifiutarsi di fabbricare un numero non e' la stessa cosa che rifiutarsi di parlare» [V] → durante l'analisi: stato nominato, non percentuale.

## 4. Inventario skill di design locali

| skill | copre | richiede al progetto | adatta a modellatore 3D denso? | vuoti |
|---|---|---|---|---|
| **impeccable** 4.1.1 (`/Users/mario/.claude/skills/impeccable/SKILL.md`) | visione + critica + audit tecnico + refine (polish/harden/onboard/clarify/animate/typeset/layout/distill) + `shape` (piano UX prima del codice) + `init/document/extract` (PRODUCT.md, DESIGN.md, tokens). Modo **Operate** esplicito: «Scanability, consistency, native expectations, and the real usage scene outrank expression» (`reference/operate.md`) | `PRODUCT.md` con `impeccable:product-schema`, `DESIGN.md`, surface brief, `context.mjs` per sessione; detector `detect.mjs`; browser per overlay | **Sì** — `operate.md`: «Density. Tables with many rows, panels with many labels» permesso; «Modal as first thought. Modals are usually laziness» | Nessuna euristica specifica per viewport 3D/WebGL: detector guarda HTML/CSS, non canvas. Critique su MeshRec ha misurato contrasto e a11y del DOM, non della tela. |
| **apple-design** (symlink `../../.agents/skills/apple-design`) | motion fisico: risposta su pointer-down, interruttibilità, spring damping/response, momentum projection, rubber-band, materiali, reduced-motion, tipografia (tracking/leading), 8 principi WWDC 2026 | nessun file; codice web (Pointer Events, rAF, Motion) | Parziale: valori spring e proiezione servono a orbit/pan con inerzia e a drawer/sheet; non copre densità dati | Nessuna guida su tabelle, legende, colormap |
| **emil-design-eng** (symlink) | decisione se animare, easing, durate (<300 ms), popover origin-aware, tooltip istantanei dopo il primo, `prefers-reduced-motion`, performance (transform/opacity) | nessuno | Sì per micro-interazioni di pannelli/palette | Zero su 3D, zero su dati |
| **hallmark** 1.1.0 (symlink a `/Users/mario/Jarvis/_jarvis/skills-library/D-design-ux-a11y/hallmark`) | anti-slop per **pagine** (landing/portfolio), 20 temi, macrostrutture, 58 gate, `audit`/`redesign`/`study` da URL | `design.md`, `tokens.css`, `.hallmark/log.json`, `preflight.json` | **No** come default: nato per marketing; utile solo `audit` per anti-pattern e la disciplina 8 stati per componente | Nessun modo Operate; rotazione temi è rumore per un tool |
| **design-taste-frontend** | landing/portfolio/redesign, dial VARIANCE/MOTION/DENSITY, mappa brief→design system (Fluent/Carbon/Radix…) | nessuno | **No, per sua dichiarazione**: riga 8 «Landing pages, portfolios, and redesigns. Not dashboards, not data tables, not multi-step product UI.»; riga 898-900 «This skill is NOT for: Dashboards / dense product UI / admin panels… Data tables (use TanStack Table or AG Grid)» [V] | Fuori perimetro |
| **brand-guidelines** | palette e font **Anthropic** (Poppins/Lora, `#d97757`) | font installati | **No**: identità di terzi; PRODUCT.md: «Nessuna identità visiva d'ateneo da rispettare» | Irrilevante |

**Cosa produce davvero `impeccable critique`** (3 giri su `meshrec/src/meshrec/ui/index.html`) [V]:
- Metodo dual-agent A/B, banner `⚠️ DEGRADED` quando inline (giro 1). Punteggio 10 euristiche 0-4 + carico cognitivo 8 check + persone (Alex/Sam/Riley/Giulia) + P0/P1 con comando di rimedio (`/impeccable harden|layout|clarify`).
- Rilievi concreti e misurati: 27-34 s senza stato; `exit_code` in SSE non letto; Galleria 22rem con hash 64 char; contorno hover 2,88:1 sotto 3:1; `h2` a 13px «i titoli strutturali sono il testo piu' piccolo dell'interfaccia».
- Onestà sui numeri: «25 → 20 → 21 non e' una misura: i tre giri sono stati assegnati da tre valutatori diversi… non fabbricare precisione che non esiste.»
- Limite dichiarato: «Sovrapposizioni visive: non disponibili» quando manca JS injection; il detector non vede la tela WebGL.

Sovrapposizioni: apple-design ∩ emil (spring, reduced-motion, transform-only) — coerenti, emil più prescrittivo su durate. impeccable ∩ hallmark (anti-pattern, 8 stati) — impeccable ha Operate, hallmark no. Vuoto comune: **nessuna skill copre viewport 3D, legende, colormap, tabelle dense di risultati**. Da coprire con fonti esterne (§3) o con un `DESIGN.md`/surface brief scritto a mano per il viewport.

## 5. Motion, feedback fisico, accessibilità

- **apple-design, per il viewport** [V locale]: «Respond on pointer-down, not on release.»; «Every animation must be interruptible and redirectable at any moment.»; «Always animate from the presentation (current) value»; orbit/pan = drag 1:1 con `setPointerCapture`, rilascio con velocity handoff e proiezione `project(v, 0.998)`; rubber-band ai limiti di zoom; damping 1.0 default, 0.8 solo dopo flick. Reduced motion: «replace slides/springs/parallax with short opacity cross-fades»; `prefers-reduced-transparency`; `prefers-contrast: more`. Feedback: «status, completion, warning, error»; «Wayfinding. Every screen should answer: Where am I? Where can I go? What's there? How do I get out?»
- **three.js OrbitControls**: `enableDamping` + `dampingFactor` danno inerzia [INF-snippet, docs threejs.org]. ViewCube: hover-highlight, drag «almost twice as fast» del click [V].
- **emil**: hover solo con `@media (hover: hover) and (pointer: fine)`; niente animazione su azioni da tastiera [V locale].
- **WCAG AA in app densa**: 1.4.11 «contrast ratio of at least 3:1 against adjacent color(s)» per componenti UI e «Parts of graphics required to understand the content» [V]; 2.4.13 Focus Appearance: «at least as large as the area of a 2 CSS pixel thick perimeter of the unfocused component… contrast ratio of at least 3:1 between the same pixels in the focused and unfocused states» [V]; hallmark: «Never animate the ring's appearance» [V locale]. Critique MeshRec ha già misurato: `.conteggi` sopra nuvola densa 4,55:1 «passa con 0,05 di margine» → testo sopra viewport va su lastra opaca o con alone, non nudo. Tastiera completa: critique giro 1 P0 «Le righe degli step non si raggiungono da tastiera» (WCAG 2.1.1 A) [V]; `role="application"` sulla tela ancora aperto.
- **Proiezione in aula**: ISO 9241-303:2011 altezza maiuscola 20-22 arcmin, min 16 [INF-snippet]; proav.de: «The text height should be at least 4mm per one meter of viewing distance.»; FAA «20 arcminutes correspond to 1/200 of the viewing distance»; «four, six or eight times the image height» (4× per grafica tecnica) [V]. Traduzione [INF]: aula 8 m, proiettore 1080p su 2 m di base → 20 arcmin ≈ 46 mm ≈ 45 px di altezza maiuscola; quindi modo «Presentazione» che alza scala tipografica, spessore linee, dimensione nodi e nasconde pannelli (Figma «Minimize UI»). Critique: 13px per `h2` e testi d'aiuto è il caso opposto.

## 6. Metodo da sviluppatore singolo

- **Heuristic evaluation** (NNG): «Ideally, three to five people should independently evaluate the same interface.»; «each individual (no matter how experienced or expert) is likely to miss some of the potential usability issues» [V]. Da soli: impeccable critique dual-agent è una versione con 2 valutatori indipendenti (A/B) — le 3 critique lo dimostrano; Munzner la classifica «immediate validation» al livello encoding [V].
- **Cognitive walkthrough** (Wharton et al. 1994, via koji.so [V secondaria]; Wilson cap. 4 [V]): 4 domande — «Will the user try to achieve the right effect?», «Will the user notice that the correct action is available?», «Will the user associate the correct action with the effect?», «If the correct action is performed, will the user see that progress is being made?»; ingressi richiesti: «User profile… Task list… Action sequence for each task» [V Wilson]; versione Spencer «1 or 2» valutatori, «60 minutes max» [V koji]. Limite dichiarato da Wilson: «Some complex products, such as the popular design tool, Photoshop, or other content creation tools such as AutoCAD» rendono il metodo lento → scegliere 3-4 task (crea telaio 2×2, assegna sezione, genera combinazioni SLV, leggi M max).
- **Test con colleghi**: NNG: primo utente ≈31% dei problemi, 3 ≈75%, 5 ≈85%; «Spend this budget on 3 studies with 5 users each!» [V]. Con 2-3 colleghi ×3 giri realistico.
- **Metriche**: Nielsen: «success rate (whether users can perform the task at all), the time a task requires, the error rate, and users' subjective satisfaction» ma «when you're collecting usability metrics, you must test with more than five users...I usually recommend testing 20 users» [V]. Conseguenza onesta: time-on-task con 3 colleghi = aneddoto, non misura; usare come confronto prima/dopo su stesso task, dichiarato come tale (coerente con critique: «non fabbricare precisione»). SUS 10 item, 2 min, «consistent scores with as few as 8 to 12 participants» [INF-snippet]: sotto quella soglia è solo indicativo.
- **Prototipo e frame-by-frame**: Apple «an interactive demo is worth "a million static designs"»; emil «Review your work the next day», «Play animations at reduced speed» [V locale]. Figma UI3: beta aperta, decisione rovesciata su dati di adozione [V].
- **Loop realistico [INF]**: `shape` (impeccable) → prototipo → critique dual-agent → walkthrough su 4 task → 2-3 colleghi con think-aloud → fix → critique. Tenere `.impeccable/critique/` come backlog e `ignore.md` per i falsi positivi.

## Principi UX candidati

| # | principio | evidenza | esempio applicato |
|---|---|---|---|
| 1 | **Ogni numero mostrato porta il suo contraddittore** | PRODUCT.md P1 [V]; Benedetto «verifiche in chiaro» [V 2008]; Sismicad «Boh!» [V 2004]; Abaqus fattore nello state block [V] | Ratio di verifica cliccabile → formula NTC con valori; Σ reazioni vs Σ carichi accanto ai risultati; deformata con «×120 (auto)» stampato. |
| 2 | **Seleziona, poi agisci; nessuna finestra che blocca** | Blender HIG [V]; Robot dialog inutili [INF-snippet]; impeccable operate «Modal as first thought… laziness» [V] | Pannello contestuale (Shapr3D) al posto di dialoghi; solo «Esegui da qui in giù» chiede conferma, inline. |
| 3 | **Tastiera prima, palette con conflitti in rosso** | Plasticity [V]; Linear/Knock [V]; critique euristica 7 = 1/4 in tutti e 3 i giri [V] | ⌘K, N=nodo, B=asta, S=sezione; scorciatoia in ogni tooltip; nessuna animazione sulle azioni da tastiera. |
| 4 | **Anteprima prima del commit, undo illimitato e visibile** | Onshape preview slider e rollback [V]; Blender Undo History [V]; critique «Nessun annullamento in tutto il prodotto» [V] | Ghost dell'operazione; cronologia operazioni = registro di provenienza (P4); «rigenera» mostra cosa sovrascrive. |
| 5 | **Attesa parlante, mai percentuale inventata** | NNG 0.1/1/10 s [V]; PRODUCT P3 [V]; critique P0 27-34 s muti, `exit_code` ignorato [V]; Blender «clearly indicated and allow an immediate exit» [V] | Fasi nominate («autovalori 3/6»), durata misurata a fine corsa, errore con rimando al log, Annulla sempre vivo. |
| 6 | **Combinazioni generate dalla norma, nominate e ripercorribili** | IperSpace 32×4 [V]; marcodepisapia «centinaia di pagine» [V]; Sieno «terribilmente farraginoso» [V 2008]; Combinito/NBCC [INF-snippet]; CDS SLE non esportate [V] | Generatore NTC 2018 con sole scelte esplicite (ψ, direzioni, eccentricità); ogni combinazione con nome leggibile e coefficienti visibili; inviluppo che dice quale governa; export completo (SLU/SLE) sempre. |
| 7 | **Risultati: colormap percettiva, convenzione fisica, fallimento a doppio canale** | Borland & Taylor via EGU [V]; Karamba rosso=compressione [V]; WCAG 1.4.11/1.4.1 [V]; critique riga Pareto a solo colore [V] | Viridis/cool-warm, mai rainbow; asta fallita = colore + tratto + etichetta + riga tabella; stampabile in B/N. |
| 8 | **Divulgazione progressiva per chi arriva dopo, densità per chi conosce** | NNG progressive disclosure, empty states [V]; PRODUCT P5 [V]; Figma «work should be the center of the canvas» [V]; critique carico cognitivo 6/8 falliti [V] | Pannello con ≤4 blocchi, «Avanzate» ricordato; stati vuoti che insegnano; tabelle dense dove il dato è il prodotto. |
| 9 | **Unità ed espressioni nei campi, unità dichiarate in un punto** | Blender fields [V]; Fusion [INF-snippet]; PRODUCT vincoli unità [V]; critique «Le metriche non portano unita'» [V] | `25 kN/m`, `2.5*9.81`, `30cm`; ogni numero mostrato con unità. |
| 10 | **Leggibile a 8 metri** | ISO 9241-303 20-22 arcmin [INF-snippet]; proav 4 mm/m [V]; PRODUCT Accessibility [V]; critique 13px su `h2` [V] | Modo Presentazione: scala tipo ×1.6, linee e nodi più spessi, pannelli ritratti, contrasto ≥ 3:1 sul viewport. |

## Mappa fase → pattern → riferimento

| fase | pattern | riferimento |
|---|---|---|
| Prima apertura | empty state a 3 funzioni; walkthrough «Giulia» | NNG empty states [V]; critique persona Giulia [V] |
| Griglia/assi | input tabellare + viewport sincronizzati (RFEM «left-side navigation bar and table editing») | dlubal.com review [INF-snippet]; Midas finestre multiple stessa DB [INF-snippet] |
| Nodi/aste | gizmo drag + snap + digita valore; hover highlight; select→operate | Rhino Gumball docs [INF-snippet]; Blender HIG [V]; ViewCube [V] |
| Sezioni/materiali | pannello adattivo alla selezione; progressive disclosure; espressioni/unità | Shapr3D [V]; NNG [V]; Blender fields [V] |
| Vincoli | pannello contestuale su nodo; anteprima simbolo vincolo | Blender Operate→Settings [V]; Onshape preview [V] |
| Carichi e combinazioni | generatore NTC con scelte esplicite; nomi leggibili; ordinabili/filtrabili; export SLU+SLE | soft.lab [V]; marcodepisapia [V]; Eng-Tips sorting/Combinito [INF-snippet]; ingforum CDS [V] |
| Analisi | non-blocking, fasi nominate, Annulla, esito con durata misurata | Blender HIG [V]; NNG 10 s [V]; critique P0 [V] |
| Lettura risultati | filtri a pannello, colora-per-proprietà, scala dichiarata, click→valore, small multiples | Speckle [V]; SAP2000 [V]; Karamba [V]; Tufte [V sec.] |
| Verifiche | ratio → «verifica in chiaro» con formula; doppio canale; controllo indipendente accanto | narkive Benedetto [V]; PRODUCT P1 [V]; WCAG 1.4.11 [V] |
| Relazione | tabelle = stesso insieme di colonne dell'appendice ma ordine per schermo; export completo | critique domanda 4 (`report._COLUMNS`) [V]; ingforum CDS [V] |
| Motion/viewport | pointer-down, interruttibile, inerzia, rubber-band, reduced-motion | apple-design [V locale]; OrbitControls damping [INF-snippet] |
| Aula | modo Presentazione, 20 arcmin | ISO 9241-303 / proav [V] |

## Domande per Mario (cambiano il prodotto)

1. **Chi è l'utente secondo?** Solo tu, oppure tesisti/colleghi/commissione (come in PRODUCT.md)? Decide quanto pesa la divulgazione progressiva contro la densità.
2. **Combinazioni NTC 2018: generate e sigillate, o modificabili a mano?** Se modificabili, come si distingue a video una combinazione «di norma» da una «editata»? (Principio 6.)
3. **Il prodotto verifica le armature o si ferma alle sollecitazioni?** Se verifica: la «verifica in chiaro» (formula + valori) è requisito o lusso?
4. **La relazione esce dal programma?** Se sì, in che forma (PDF/Markdown/Word) e con che perimetro: MeshRec scelse «appendice stampata»; qui centinaia di pagine sono il dolore documentato.
5. **Input geometria: tabella, disegno nel viewport, o entrambi sincronizzati?** Cambia il modello dati e il costo del gizmo.
6. **Storia parametrica (timeline stile Onshape/Fusion) o solo undo lineare?** La prima dà rigenerazione e provenienza; costa un'architettura.
7. **Deformata e modi: scala sempre dichiarata a video anche in proiezione?** (P3 lo impone; conferma che vale anche per le viste catturate.)
8. **Convenzioni grafiche:** M sul lato teso? rosso = compressione (Karamba) o rosso = fallito? Serve una sola regola di colore.
9. **Ambiente d'uso reale:** proiezione in aula davvero prevista (come PRODUCT.md) → tema chiaro obbligato? Dark mode utile o rumore?
10. **Tolleranza all'attesa:** modelli attesi (n. aste, analisi modale/nonlineare)? Sotto 1 s il design dell'attesa sparisce; sopra 10 s diventa una feature.

## Raccomandazioni (non decisioni)

- **R1.** Usare `impeccable` in modo **Operate** come critique loop principale; scrivere subito `PRODUCT.md` (schema impeccable) + un surface brief per il viewport, perché nessuna skill locale copre WebGL/legende/colormap. `design-taste-frontend` e `brand-guidelines`: fuori perimetro per loro stessa dichiarazione. `hallmark`: solo `audit`.
- **R2.** Adottare come vincoli di prodotto i principi 1, 5, 6, 7 (sono i dolori documentati con più fonti indipendenti + regola di casa già scritta).
- **R3.** Prima del codice: cognitive walkthrough (versione Spencer, 60 min) su 4 task con persona «Giulia»; poi 3 giri da 2-3 colleghi con think-aloud. Metriche quantitative (time-on-task) solo come confronto prima/dopo dichiarato aneddotico.
- **R4.** Per il viewport: apple-design §1-3, 6, 9, 14 come specifica di orbit/pan/zoom; emil per pannelli/palette; ViewCube con hover-highlight.
- **R5.** Provare a riaprire Eng-Tips/Reddit da browser reale (skill `claude-in-chrome`) se servono citazioni verbatim su SAP2000/ETABS: oggi sono le sole fonti non lette.

## Fonti

Locali (assolute): `/Users/mario/GitHub/Tesi/PRODUCT.md` (76-78, 186-208); `/Users/mario/GitHub/Tesi/README.md` (3-14); `/Users/mario/GitHub/Tesi/docs/validazione/ricerca-opensees-e-armature.md` (16-21); `/Users/mario/GitHub/Tesi/.impeccable/critique/2026-08-14T17-47-36Z__meshrec-src-meshrec-ui-index-html.md`, `…18-50-32Z…`, `…2026-08-16T11-21-22Z…`; `/Users/mario/.claude/skills/impeccable/SKILL.md`, `/Users/mario/.claude/skills/impeccable/reference/operate.md`, `/Users/mario/.claude/skills/impeccable/reference/critique.md`; `/Users/mario/.claude/skills/apple-design/SKILL.md`; `/Users/mario/.claude/skills/emil-design-eng/SKILL.md`; `/Users/mario/.claude/skills/hallmark/SKILL.md`; `/Users/mario/.claude/skills/design-taste-frontend/SKILL.md` (8, 898-900); `/Users/mario/.claude/skills/brand-guidelines/SKILL.md`.

Esterne lette [V]:
- https://developer.blender.org/docs/features/interface/human_interface_guidelines/paradigms/
- https://docs.blender.org/manual/en/latest/interface/undo_redo.html · https://docs.blender.org/manual/en/latest/interface/controls/buttons/fields.html
- https://doc.plasticity.xyz/plasticity-essentials/plasticity-interface/command-palette
- https://help.figma.com/hc/en-us/articles/23570416033943-Use-the-actions-menu-in-Figma-Design · https://www.figma.com/blog/our-approach-to-designing-ui3/
- https://performance.dev/how-is-linear-so-fast-a-technical-breakdown · https://knock.app/blog/how-to-design-great-keyboard-shortcuts
- https://www.solidsmack.com/cad/shapr3d-adds-adaptive-ui-proves-3d-cad-can-be-smarter/
- https://cad.onshape.com/help/Content/PartStudio/part_studios.htm · https://cad.onshape.com/help/Content/PartStudio/feature_basics.htm · https://www.onshape.com/en/resource-center/tech-tips/tech-tip-roll-to-here-roll-to-end · https://parametricdesign.com/en/the-top-5-onshape-features-for-streamlining-design-data-management/
- https://www.research.autodesk.com/app/uploads/2023/03/viewcube-a-3d-orientation.pdf_recsg8BsEjf1BeIbZ.pdf
- https://speckle.systems/blog/redesigned-speckle-3d-viewer/
- https://manual.karamba3d.com/3-in-depth-component-reference/3.6-results/3.7.2-results-on-beams/3.6.7-beamview
- https://docs.csiamerica.com/help-files/sap/Menus/Display/Show_Deformed_Shape.htm · https://abaqus-docs.mit.edu/2017/English/SIMACAEGSARefMap/simagsa-t-displayingandcustomizingadeformedshapeplot.htm
- https://blogs.egu.eu/divisions/gd/2017/08/23/the-rainbow-colour-map/ (Borland & Taylor 2007)
- https://www.cs.ubc.ca/labs/imager/tr/2009/NestedModel/NestedModel.pdf
- https://www.nngroup.com/articles/how-to-conduct-a-heuristic-evaluation/ · https://www.nngroup.com/articles/why-you-only-need-to-test-with-5-users/ · https://www.nngroup.com/articles/usability-metrics/ · https://www.nngroup.com/articles/response-times-3-important-limits/ · https://www.nngroup.com/articles/empty-state-interface-design/ · https://www.nngroup.com/articles/progressive-disclosure/ · https://www.nngroup.com/articles/two-ux-gulfs-evaluation-execution/
- https://www.koji.so/docs/cognitive-walkthrough-guide · https://cs.uwaterloo.ca/~jianzhao/cs449-649/files/walkthrough.pdf
- https://www.w3.org/WAI/WCAG21/Understanding/non-text-contrast.html · https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html
- http://www.proav.de/video/projectionrules.html
- https://it.discussioni.ingegneria.civile.narkive.com/m07mRa9r/software-strutturali · https://it.discussioni.ingegneria.civile.narkive.com/XdGWybe2/per-utenti-sismicad-e-mastersap · https://it.discussioni.ingegneria.civile.narkive.com/n9Ww6zv5/domanda-rivolta-ad-utenti-sismicad
- https://ingforum.it/community/discussione/cds-e-scarichi-fondazione.22573/ · https://ingforum.it/community/discussione/consiglio-su-miglior-software-di-calcolo-gratuito-per-iniziare-la-professione.23868/
- https://www.soft.lab.it/combinazioni-di-carico-in-condizioni-sismiche-come-crearle-ed-interpretarle-in-iperspace-bim/ · https://www.marcodepisapia.com/32-combinazioni-sismiche/
- https://community.dlubal.com/t/rfem-6-file-size-and-performance-vs-rfem-5/2241
- https://re-tug.com/post/diaphragm-slicer-etabs-api/8
- https://buildupreport.substack.com/p/are-web-based-applications-the-future

Solo snippet motore, pagina non aperta [INF-snippet]:
- https://www.eng-tips.com/threads/experience-with-robot-structural-analysis.475479/ · https://www.eng-tips.com/threads/autodesk-robot-structural-analysis-whats-it-good-for.501591/ · https://www.eng-tips.com/threads/combinito-load-combinations-tool-for-csi-software-sap2000-etabs-and-safe-opinions-needed.495947/ · https://www.eng-tips.com/threads/sorting-load-combinations.515939/ · https://www.eng-tips.com/threads/nbcc-automatic-load-combinations.519016/
- https://docs.mcneel.com/rhino/8/help/en-us/commands/gumball.htm · https://www.rhino3d.com/docs/guides/user-guide/gumball-basics/
- https://threejs.org/docs/pages/OrbitControls.html
- https://www.dlubal.com/en/support-and-learning/support/faq/005103 · https://comparecamp.com/midas-gen-review-pricing-pros-cons-features/
- https://docs.bentley.com/LiveContent/web/STAAD.Pro%20Help-v19/en/GUID-05986488-6CD0-4679-A02F-EA1B912736AC.html · https://media.enercalc.com/3d_training/unity_check.htm
- https://help.autodesk.com/view/fusion360/ENU/?guid=GUID-715E7B9F-453B-4660-BC8B-E0C7B0E2ED80
- https://digital.ahrq.gov/sites/default/files/docs/survey/systemusabilityscale%2528sus%2529_comp%255B1%255D.pdf
- https://developer.apple.com/videos/play/wwdc2018/803/ (origine di apple-design, non riaperto)
- Reddit r/StructuralEngineering: [NON TROVATO] — bloccato, nessuna citazione riportata.
