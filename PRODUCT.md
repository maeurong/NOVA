# Product

<!-- impeccable:product-schema 1 -->

> Bozza del 04/09/2026, scritta prima del brainstorming. Riempie solo ciò che
> la ricerca in `docs/ricerca/` sostiene. Ogni campo che dipende da una
> decisione non ancora presa è marcato `[DA DECIDERE AL BRAINSTORMING — vedi
> docs/ricerca/README.md §3 domanda N]`. Nome del prodotto: **NOVA** — Nonlinear
> OpenSees Visualization & Analysis (deciso il 04/09/2026).

## Platform

web — **ipotesi**, non decisione. La ricerca (`03-stack-tecnico.md` §5,
raccomandazione 5) indica `web` per qualunque shell a webview, nativa o nel
browser; la scelta della shell resta aperta (vedi «Stack»).

## Users

**Utente primario:** l'autore, ingegnere strutturale. Ha già usato MeshRec ogni
giorno su macOS con Apple Silicon e su Windows 11 (`~/GitHub/Tesi/PRODUCT.md`,
«Users»); da qui la piattaforma doppia macOS + Windows come requisito, non come
opzione.

**Utente secondo:** `[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md
§3 domanda 2]`. Solo l'autore, oppure tesisti, colleghi e commissione come in
MeshRec. Decide quanto pesa la divulgazione progressiva contro la densità
(`07-ux-modellatore.md`, principio 8).

**Target di prodotto:** `[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md
§3 domanda 1]`. Verifica NTC 2018 per lo studio italiano, che pretende la
relazione di calcolo, oppure modellazione non lineare pulita per ricerca. Le due
UX sono opposte (`02-panorama-software.md`, `07-ux-modellatore.md`).

## Product Purpose

Modellare un telaio in cemento armato, analizzarlo con OpenSees e verificarlo a
NTC 2018, in modo riproducibile e documentabile, da un'applicazione locale con
un'interfaccia sofisticata. La sofisticazione dell'esperienza d'uso è un
requisito dichiarato dall'autore, non un'aspirazione.

Completa il lato analisi di MeshRec, che porta un rilievo fotogrammetrico fino
al deck `.inp` e si ferma lì per scelta. Non sostituisce MeshRec, non lo
riscrive.

**Perimetro:** `[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md §3
domande 3, 5, 6, 7]`. Ingresso del modello (prior di MeshRec, da zero nella UI,
entrambi), verifiche della prima versione (senza armature: drift, θ,
regolarità, SLE deformazione; oppure set completo SLU/SLE/gerarchia con
armature), relazione di calcolo (sì/no, forma, perimetro), norma (solo NTC
2018 + Circolare, o parametrica con EC8 2004 e EC8 2024).

**Perché la linea integrata di MeshRec è stata dismessa** il 02/09/2026 non è
scritto da nessuna parte oltre «ha provato l'interfaccia e ha deciso»
(`05-archeologia-linea-integrata.md` §5) — `[DA DECIDERE AL BRAINSTORMING —
vedi docs/ricerca/README.md §3 domanda 4]`. Senza questa risposta si rischia di
ricostruire la stessa schermata a quattro stadi.

## Positioning

Il vuoto che la ricerca ha misurato (`02-panorama-software.md` §4): nessuno dei
venti e più strumenti censiti copre più di tre assi su sei fra *gratuito · UI
moderna · multi-OS · telai c.a. · verifiche EC/NTC · vivo*. L'accoppiata
«OpenSees + verifiche NTC» esiste (CDS, ModeSt) ma chiusa, solo Windows,
legacy; STKO Professional la sta per vendere; `opensees-studio` (aprile 2026,
un solo sviluppatore, AGPL) è il vicino più prossimo ma senza norme.

Posizionamento raccomandato dalla ricerca, non deciso: «OpenSees + verifiche
NTC/EC su telai c.a. + UI pulita multi-OS + relazione», non «ennesima GUI
OpenSees». Il meccanismo ereditato da MeshRec che un prodotto vicino non
potrebbe copiare sinceramente: **ogni numero mostrato ha un controllo che lo
contraddice se il risultato peggiora.**

Rapporto con `opensees-studio` (contribuire, forkare, divergere):
`[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md §3 domanda 10]`.

## Operating Context

Applicazione **locale**, utente singolo, nessuna autenticazione, nessun server
remoto — come MeshRec. Le uscite del programma escono dal programma: la
relazione e le viste vanno in un documento; l'artefatto del solutore, se resta
un requisito, ricostruisce la corsa senza il programma.

Il solutore vive in un processo separato: un errore di modello banale termina
il processo che ospita OpenSees senza eccezione (`01-opensees-integrazione.md`
§2, misurato). L'attesa del solutore è parte dell'esperienza d'uso: la ricerca
UX documenta l'«attesa muta» come dolore ricorrente (`07-ux-modellatore.md`
§1). Tempi attesi sui modelli reali: non misurati.

Funzioni con LLM, se ci saranno, sono online e opzionali: offline non esiste,
e NTC §10.2.1 chiede riproducibilità, quindi nessun numero può dipendere da un
LLM (`04-funzioni-intelligenti.md` §5, § responsabilità).
`[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md §3 domanda 17]`.

Finestra nativa (menu, dock, associazione file) dal primo giorno o dopo:
`[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md §3 domanda 12]`.
Proiezione in aula prevista: `[DA DECIDERE AL BRAINSTORMING — vedi
docs/ricerca/README.md §3 domanda 16]`.

## Capabilities and Constraints

**Capacità confermate:** nessuna. Non esiste codice.

**Capacità già scritte e testate altrove**, riusabili dalla cronologia di
MeshRec a `9716f6e` (`05-archeologia-linea-integrata.md` §7): scrittura del
modello a fibre per OpenSees con lettura dei recorder (1037 righe, 55 test più
4 sul binario vero); telaio dal prior geometrico (452 righe, 36 test);
collocazione delle armature e verdetti sui minimi NTC (308 righe, 26 test);
registro ψ/γ e proposta delle combinazioni NTC con statica equivalente (530
righe, 35 test); tabella dei sette verdetti con «non applicabile» distinto da
«non passato». Tre caselle che il loro autore stesso marca non decise:
materiali non lineari e veste delle resistenze, carichi diversi dal peso
proprio, modale con spettro — `[DA DECIDERE AL BRAINSTORMING — vedi
docs/ricerca/README.md §3 domanda 11]`.

**Cosa il solutore non fa e resta al programma** (`01-*.md` §4, `06-*.md` §1):
combinazioni di carico, CQC/SRSS e regola del 30 %, spettro NTC, statica
equivalente, θ e drift, curva di capacità e spostamento obiettivo, tutte le
verifiche di norma. Nessuna libreria PyPI implementa NTC 2018; `structuralcodes`
(Apache-2.0) copre M-N e M-χ secondo EC2.

**Terminologia da preservare alla lettera:** vedi `CONTEXT.md`, «Da preservare
alla lettera».

**Vincoli tecnici misurati:**

- Solutore fuori processo, obbligatorio (`01-*.md` §2).
- Il codice d'uscita di OpenSees non è il segnale: esce 0 anche su errore
  fatale; stderr e un marcatore di fine lo sono (`05-*.md` §2).
- `openseespy` 3.8.0.0: nessuna ruota per macOS Intel né per Windows ARM; su
  Windows e Linux Python 3.12 obbligatorio, su macOS misurato funzionante
  anche su 3.14 (`03-*.md` §1, `README.md` §2).
- Massa partecipante: 85 % per NTC 2018 §7.3.3.1, 90 % per EC8 (`06-*.md` §1).
- `opstool` e `opsvis` sono GPL-3.0: importarli trascina la GPL (`01-*.md` §3).

**Vincoli non ancora chiusi, che precedono il codice:**

- Licenza di OpenSees/OpenSeesPy — uso interno o distribuzione:
  `[DA DECIDERE AL BRAINSTORMING — vedi docs/ricerca/README.md §3 domanda 8]`.
  Fino ad allora, non ridistribuire la ruota.
- Licenza del progetto: `[DA DECIDERE AL BRAINSTORMING — vedi
  docs/ricerca/README.md §3 domanda 9]`.

**Fatti esplicitamente non stabiliti:** nessuna prova di carico documentata sul
telaio di laboratorio, quindi ogni confronto sul caso studio è verifica di
codice, non validazione (`06-*.md` §6). OpenSees non è installato sulla
macchina di sviluppo (`05-*.md` §2). Il codice della linea rimossa è stato
letto, non eseguito (`README.md` §5).

## Stack

**Non deciso.** La ricerca (`03-stack-tecnico.md` §1) non trova un vincitore
netto («close call»): la scelta dipende da quanto conta la finestra nativa e
dal peso della firma/notarizzazione al primo giorno. Le opzioni sul tavolo,
con i fatti verificati per ciascuna nella tabella di `03-*.md` §1:

- (a) Python + server + browser dell'utente — continuità massima con MeshRec,
  nessuna finestra nativa.
- (a') pywebview — stessa UI web dentro una finestra nativa, senza Rust.
- (b) Tauri 2 + sidecar Python — installer piccolo, Rust come colla; webview
  legata alla versione di macOS; firma del sidecar a mano (issue #11992
  aperta).
- (c) Electron + Python — Chromium identico ovunque, 80-150 MB.
- (d) PySide6 — nessuna continuità con la UI di MeshRec.

Raccomandazione della ricerca, non decisione: due tempi, (a)/(a') subito con
UI agnostica dal trasporto, Tauri 2 dopo se servono finestra nativa e installer
piccolo. Viewport: three.js con `camera-controls` e `three-mesh-bvh`, awatif
(MIT) come riferimento dello stesso dominio. Via d'accesso al solutore (binario
Tcl o `openseespy` in un worker), storia parametrica o undo lineare, input
geometria tabella/viewport: `[DA DECIDERE AL BRAINSTORMING — vedi
docs/ricerca/README.md §2 «Tcl vs openseespy» e §3 domande 13, 14]`.

## Brand Commitments

**Lingua dell'interfaccia: italiano**, coerente con documenti, commenti e
messaggi di commit. Gli identificatori tecnici restano invariati.

**Voce**, ereditata da MeshRec: registro asciutto e misurato; afferma ciò che è
verificato, dichiara ciò che non lo è, distingue un esito negativo documentato
da un fallimento. Vale per etichette e messaggi dell'interfaccia.

**Convenzioni grafiche** (M sul lato teso; rosso = compressione o rosso =
fallito; scala della deformata sempre dichiarata): `[DA DECIDERE AL
BRAINSTORMING — vedi docs/ricerca/README.md §3 domanda 15]`.

Nessuna identità visiva d'ateneo da rispettare è stata dichiarata per questo
progetto.

## Evidence on Hand

- `docs/ricerca/01-*.md` … `07-*.md` — sette ricerche del 04/09/2026 con
  numeri misurati e fonti primarie, sintesi in `docs/ricerca/README.md`.
- Cronologia di MeshRec a `9716f6e` — circa 1.500 righe riusabili con i loro
  test, leggibili con `git -C /Users/mario/GitHub/Tesi show 9716f6e:<path>`.
- Il caso studio del telaio di laboratorio (`~/GitHub/Tesi`): scansione reale
  di un telaio in c.a. monopiano monocampata con trave di fondazione (due
  zapatas, viga inferior, due columnas, viga superior); prior geometrico
  `12_wall.json` ancora prodotto; tavola `MURO 1` con le armature, non
  versionata, classe del calcestruzzo non dichiarata (`06-*.md` §6).
- Benchmark aperti indicati dalla ricerca: Morandi-Hak-Magenes 2018 (CC BY
  4.0) per il telaio nudo; mensola analitica e `RCFrameGravity` per il
  generatore (`06-*.md` §6, `05-*.md` §6).

**Assenze che il lavoro futuro non deve fabbricare:** nessun codice, nessun
utente oltre all'autore, nessuna prova di carico sul telaio di laboratorio,
nessun risultato Abaqus sul caso studio, nessuna misura dei tempi del solutore
sui modelli attesi.

## Product Principles

Ereditati da MeshRec (`~/GitHub/Tesi/PRODUCT.md`), validi qui:

1. **Un numero mostrato senza un controllo che lo smentisca non vale più di un
   numero assente.** Vale per l'interfaccia quanto per il core.
2. **La grandezza da sorvegliare si sceglie prima della soglia.**
3. **Non fabbricare precisione che non esiste.** Nessuna percentuale di
   avanzamento inventata, nessuno zero che significa «sotto la risoluzione»
   presentato come «esatto».
4. **La provenienza è parte del risultato.** Un artefatto, una metrica o una
   vista dicono da quale configurazione e da quale esecuzione vengono.
5. **Chi arriva dopo deve poter capire.** Se l'utente secondo esiste (domanda
   2): stati vuoti, errori e prima apertura insegnano senza rallentare chi
   conosce il programma.

**Candidati** dalla ricerca UX (`07-ux-modellatore.md`, «Principi UX
candidati»), da confermare al brainstorming — la ricerca raccomanda di adottare
subito 1, 5, 6, 7, che hanno più fonti indipendenti:

1. Ogni numero mostrato porta il suo contraddittore (coincide con il principio
   1 ereditato).
2. Seleziona, poi agisci; nessuna finestra che blocca.
3. Tastiera prima, palette con conflitti in rosso.
4. Anteprima prima del commit, undo illimitato e visibile.
5. Attesa parlante, mai percentuale inventata.
6. Combinazioni generate dalla norma, nominate e ripercorribili.
7. Risultati: colormap percettiva, convenzione fisica, fallimento a doppio
   canale.
8. Divulgazione progressiva per chi arriva dopo, densità per chi conosce.
9. Unità ed espressioni nei campi, unità dichiarate in un punto.
10. Leggibile a 8 metri.

## Accessibility & Inclusion

Nessun requisito specifico d'utenza stabilito oltre allo standard: WCAG AA come
in MeshRec. Il fallimento di un'asta o di una verifica non può viaggiare sul
solo colore (`07-*.md`, principio 7, WCAG 1.4.1). Se la proiezione in aula è
prevista (domanda 16), leggibilità a distanza e contrasto sul viewport sono un
requisito d'uso, non solo di conformità.
