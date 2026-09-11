# NOVA T5 — giornata 14b: la scheda «Confronto»

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** nel pannello destro, sotto «Risultati», una sezione **«Confronto»** (story 56-57): telaio NOVA contro solido CalculiX e/o CSV Abaqus, per caso e grandezza, con scarto percentuale, classe di concordanza (`concorde ≤ 5 %`, `vicino ≤ 20 %`, `lontano`) e bias atteso; la **massa** è la prima riga. I tre ingressi sono percorsi: telaio e solido **precompilati** con l'ultima corsa del telaio e l'ultima del solido della sessione (modificabili), Abaqus un campo vuoto se non c'è. La `mappa_casi` si compila da un **form minimo** (nodi in sommità precompilati con i nodi più alti del modello, una riga «caso → passo del solido» per caso corso, una casella «il solido ha x e y scambiati») con un **«avanzato»** che mostra il JSON e, se lo si modifica, comanda. Le righe **sotto il pavimento di rumore** o senza un lato restano in tabella con scarto «—», classe attenuata e la `ragione` in **nota a piè di tabella** numerata; il conteggio in testa dice quante sono. Gli export (`confronto.json/csv/tex`) stanno nella cartella della corsa: la sezione stampa il **percorso con «copia»**, come già fa la corsa del solido. Su ogni tabella: «verifica del codice, non validazione» (story 61). Verifica: MURO 1 corso dalla UI, confronto col CSV d'esempio e (a mano) col solido vero; il fumo in Chrome lo prova col solo telaio più il CSV.

**Architecture:** nessun cambio nel server. `POST /api/confronto` (`nova/server.py:367-383`) prende `{telaio, solido|null, abaqus|null, mappa_casi}` — **percorsi** risolti lato server — e risponde `{run_id, cartella, esito: "ok", tabella: {righe, provenienza, avvertenza}, file: {json, csv, tex}}` (`nova/sidecar.py:179-213`); un ingresso sbagliato esce **400** con `detail.motivo` in parole (`nova/confronto.py:214-243`: casi, nodi, passi validi elencati nel messaggio) e `chiediJson` lo rilancia come `Error` col `motivo` (`static/file.js:24-39`). Il client conosce già la **cartella** di ogni corsa (`static/corsa.js:263-264`: `lavoro.cartella` da `s.cartella` della GET, per il telaio come per il solido) e il nome del file dei risultati è fisso: `risultati.nova.risultati.json` (`nova/corsa.py:23`) e `risultati_solido.json` (`nova/ccx.py:44`). `corsa.js` tiene **un solo** `lavoro` (`:124`, il solido sovrascrive il telaio): `app.js` ne tiene due, `ultimoTelaio` e `ultimoSolido`, riempiti in `suEsito` (`app.js:320-330`, `esito.solido` distingue). Tutto il nuovo sta in un modulo `static/confronto.js`: **funzioni pure** (percorso dei risultati, nodi in sommità, mappa predefinita e dal form, lettura del JSON avanzato, righe e note da mostrare, conteggio, provenienza) più `creaConfronto(radice, …)` che possiede il DOM della sezione, come `creaCorsa` (`corsa.js:113-124`). La tabella sta in un contenitore a scorrimento orizzontale (`overflow-x: auto`): il pannello è largo al più 20 rem (`stile.css:22`), e sei colonne (nove con Abaqus) in 320 px non ci stanno per intero — il pannello **non** si allarga e la pagina **non** scorre in orizzontale.

**Tech Stack:** moduli ES nativi, `node --test` col DOM finto di `corsa.test.js:137-183` (mappa `querySelector → elemento`), pytest + Chrome headless via CDP (`tests/fumo/`), `navigator.clipboard` per «copia».

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 56 (riga 106: scheda, scarto, classe a tre valori, bias accanto, «senza fingere una validazione»), 57 (riga 107: massa prima), 60 (riga 110: export con provenienza — CSV/LaTeX/JSON **esistono**, PNG/SVG e piccoli multipli **no**: fuori dalla 14b, decisione dell'autore), 61 (riga 111: «verifica del codice, non validazione» su ogni tabella); §«Confronto» righe 219-221 (casi, grandezze, prima riga, nessun pass/fail, bias atteso). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md:21` (giornata 14; la verifica «tabella esportata uguale a `docs/caso-studio/confronto.csv`» vuole il deck vero, non versionato: a mano, non nel fumo).

**Ricerca che questo piano applica** (`docs/ricerca/index.md:19`, ricerca 06; `:20`, ricerca 07; `:26`, ricerca 13): `06-dominio-analisi-verifiche-formati.md:110` (NTC §10.2.2: valutazione indipendente con un programma diverso — è esattamente il confronto), `:175` («verifica del codice, non validazione», spec:17,111,221), `:178` (gli stessi tre casi statici riusati nel Confronto); `07-ux-modellatore.md:100` (doppio canale: la classe è una **parola**, non solo un'attenuazione — WCAG 1.4.1), `:105` (Tufte, data-ink: bias e ragioni fuori dalle celle, in nota); `13-solido-calculix.md:657` (tolleranza del confronto: le misure dicono 0,0 % sullo stato assiale — le soglie 5 %/20 % sono del backend, `nova/confronto.py:25`, e la UI non le reinventa).

**Decisioni dell'autore (11/09, C1-C4):** C1a ingressi precompilati dalle corse della sessione con campi percorso modificabili, Abaqus a campo vuoto; C2c form minimo **più** «avanzato: JSON»; C3a righe non confrontabili presenti, scarto «—», classe attenuata, ragione in nota numerata, conteggio in testa; C4a percorso della cartella con «copia», niente sotto `nova/`. D7a (11/09 mattina): la sezione sta nel pannello destro sotto «Risultati».

**Ramo:** `feat/interfaccia-14b-confronto` da `main` `d2e8864`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-14b` (venv pronto, `nova ok 3.12.13`). PR verso `main`; merge solo con via libera dell'autore.

## Annotazione dell'architect (11/09/2026)

Worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-14b`, ramo `feat/interfaccia-14b-confronto`,
HEAD **`7766f99`** (questo piano). Punto di partenza rimisurato qui, non ricordato:
`env -C …/static node --test` → **819 pass, 0 fail** (588 ms). Il MURO 1 è stato **corso davvero**
(`nova.sidecar`, OpenSees 3.8.0 in `~/.local/bin/OpenSees`, cartella `/tmp/misura14b/nova`) e la
tabella è stata composta con `nova.confronto.confronta(telaio, None, leggi_csv(abaqus_esempio.csv),
mappa)`: i numeri qui sotto vengono da lì.

**Le tre cose che contano stanno in 0 e in R1-R2, e cambiano gli oracoli del fumo.** Il piano dice
«19 righe» e «almeno una nota, perché la massa del MURO 1 esce non confrontabile: C1 è una
combinazione». **Nessuna delle due regge.** Sul MURO 1 col solo telaio la tabella ha **23 righe**,
la massa esce con il suo valore (**0,7694 t**, `ragione: null`), e le note sono **due** — tutte e
due `bias_atteso`, nessuna `ragione`. Motivo misurato: `run.casi` del MURO 1 è
`["C1", "C2", "C3", "Z1"]`, **quattro** e non tre — `Z1` c'è, `_riga_massa` trova l'azione di solo
peso proprio e la ragione «è una combinazione» non scatta mai.

### 0. Le premesse verificate lanciando il codice

**La risposta vera del confronto sul MURO 1, col solo telaio più `tests/fixture/abaqus_esempio.csv`.**
Mappa come la compila il form del piano (un caso per ogni caso corso, valore = il caso stesso,
`nodi_sommita: [3, 4]`), poi `C1 → GRAVITA` come fa il copione del fumo:

| misura | valore misurato |
|---|---|
| `run.casi` | `["C1", "C2", "C3", "Z1"]` — **4**, non 3 |
| righe della tabella | **23** = 1 massa + 4 casi × 4 grandezze + f1-f3 + 3 massa partecipante |
| `taglio_base` | **assente**: nessun passo mappato si chiama `SPINTA_ORIZZONTALE` (`nova/confronto.py:_PASSO_SPINTA`) |
| righe con `ragione` | **0** |
| note distinte (`noteDellaTabella`) | **2**, tutte e due `bias_atteso`: «massa: zapatas e tamponatura fuori dal telaio» e «tetraedri lineari più rigidi → … → telaio più deformabile» |
| righe attenuate (entrambe le classi `non_confrontabile`) | **21** su 23 |
| `testoConteggio` | «23 righe · 21 non confrontabili · verifica del codice, non validazione» |
| `conAbaqus` | **true** → **9 colonne** |
| righe appaiate col CSV | **2**: `reazione_z C1` (telaio 7545,44 N ↔ Abaqus 4250,1 → scarto 77,5 %, `lontano`) e `u_sommita_z C1` (−0,00208 ↔ −0,42 → 99,5 %, `lontano`) |
| `provenienza.commit_nova` | `7766f99`; `run_id_solido`, `sha256_deck_solido`, `versione_calculix` = `null` |

Con la **mappa vuota** (`{}`) le righe sono **7** e f1-f3 escono `telaio: null` con la ragione
«nessun modo del telaio con asse x dominante sui nodi di sommità»: senza `nodi_sommita` i modi non
si appaiano. Con i **soli** `nodi_sommita` e nessun caso: **7 righe**, tutte con un valore, nessuna
ragione. È l'ingresso degenere «`run.casi = []`» del piano, e si comporta come scritto — la
tabella ha massa + modi + massa partecipante e non solleva.

**`_valore_abaqus` non rende una ragione quando il CSV non ha la riga** (`nova/confronto.py:183-185`:
`riga is None` → `return None, None`). La ragione esce **solo** per unità discordi. Quindi un CSV
che non appaia niente è **muto**: da qui R7.

**Il pannello e la larghezza della tabella.** La colonna della griglia è
`minmax(220px, 20rem)` — e sta a **`stile.css:24`**, non `:22` (`:22` è `height: 100vh`; lo dicono
anche il piano e il brief, corretto qui). Tutti e due gli estremi sono definiti: la traccia non
può superare 320 px **qualunque** sia il contenuto. In più `#pannello` (`stile.css:53`) ha
`overflow: auto`, e la dimensione minima automatica di un grid item vale il contenuto **solo se**
l'`overflow` calcolato su quell'asse è `visible` (CSS Box Sizing 3 §4.1, «automatic minimum size»;
CSS Grid 1 §6.6): qui è `auto`, quindi `min-width` risolve a **0**. Due guardie indipendenti, e
bastano. Larghezza utile dentro il pannello: 320 − 8 − 8 di padding − 1 di bordo ≈ **303 px**.
Stima della tabella a font 11 px, avanzamento mono ≈ 0,6 em = 6,6 px/carattere, `padding: 2px 6px`
= 12 px per cella, celle più lunghe misurate sul MURO 1 (`massa_partecipante_x` 20 caratteri,
`non confrontabile` 17, intestazioni `scarto Abaqus` 13):

- **9 colonne ≈ 835 px** → 2,8 volte lo spazio: senza `overflow-x` la pagina scorrerebbe.
- **6 colonne ≈ 490 px** → 1,6 volte: scorre anche la tabella senza Abaqus.

`#confronto-scorri { overflow-x: auto; max-width: 100% }` dentro un `<section>` di blocco basta.
L'oracolo `documentElement.scrollWidth <= window.innerWidth` del fumo è il controllo vero.

**`navigator.clipboard` su loopback.** W3C *Secure Contexts* §3.1 «Is origin potentially
trustworthy?»: l'origine è affidabile se l'host corrisponde a `127.0.0.0/8` o `::1/128`, **oppure**
se l'host è `localhost` o finisce per `.localhost`. Quindi **sì a tutti e due**, `127.0.0.1` e
`localhost`. Il fumo gira su `http://127.0.0.1:${porta}/` (`tests/fumo/fumo.mjs:6`, riletta): «copia»
funziona lì. Il ramo «appunti assenti» resta coperto dal test di Task 2 con `appunti: null`.

**Il 400 del confronto passa da `messaggioErrore`.** Verificato lungo tutta la catena:
`nova/server.py:319-325` `_o_400` fa `raise HTTPException(400, detail=fin)` con `fin` dizionario;
`:455-458` `_http` rende `JSONResponse(status_code, content=exc.detail)` **appiattito**, non
annidato sotto `detail`; `static/file.js:15` legge `dati.motivo`. Nessun `JSONResponse` diverso sul
percorso del confronto. ✅ Il piano ha ragione. In più: `ConfrontoReq` (`nova/server.py:229-235`) è
`extra="forbid"` — il corpo deve essere **esattamente** `{telaio, solido, abaqus, mappa_casi}`, come
il piano lo scrive; una chiave in più uscirebbe 422.

### 1. I puntamenti che non combaciano

Corretti qui, non nel corpo del piano. Nessuno cambia *cosa* fare.

| citato | vero |
|---|---|
| `stile.css:22` = le colonne della griglia | **`:24`** (`:22` è `height: 100vh`) |
| `app.js:72` = `let motoRidotto = false;` | **`:70`** |
| `app.js:296-303` = `suApertura` | `suApertura` apre a **`:265`**; `:296-303` sta dentro `suImportazione` (che apre a `:291`). Le coppie `corsa.azzera(); risultati = null;` a **`:269-270`** e **`:294-295`** sono giuste |
| `app.js:776-812` = `ridisegna` | `ridisegna` apre a **`:755`**; `esito.disegna(…)` a `:810` è giusta |
| `app.js:36` = `selezione = {tipo, id}` | `:36` è `let selezione = null;` — la sostanza (una selezione sola) regge |
| `corsa.js:192-199` = `disegnaUltima` | la funzione apre a **`:191`** (`:192-193` è il commento sul solido che non invecchia) |
| `test/corsa.test.js:163-183` = `radiceCorsa()` | `:163` è lo stub di `globalThis.document`; `radiceCorsa` viene dopo |
| `docs/caso-studio/confronto.json` = **19 righe** | **20 righe**, 6 con `ragione`, 2 `bias_atteso` distinti. Prima riga `massa` 0,7694 ↔ 0,5551 → 38,62 % `lontano` (la prova a mano del Task 4 regge alla lettera) |
| `docs/ricerca/index.md:19` = ricerca 06; `:20` = 07; `:26` = 13 | **`:18`** = 06, **`:19`** = 07, **`:25`** = 13 — tutte e tre spostate di uno |
| `07-ux-modellatore.md:100` = «WCAG 1.4.1» | la riga cita **WCAG 1.4.11** (contrasto non testuale ≥ 3:1). Il criterio giusto per «il colore non è il solo canale» è **1.4.1 Uso del colore**: citare 1.4.1 nel commento CSS e non spacciarlo per la riga 100 |

**Combaciano**, aperte una per una qui e da non rileggere: `nova/server.py:367-383`, `:319-325`,
`:455-458`, `:189-190`, `:229-235`; `nova/sidecar.py:179-213`; `nova/confronto.py:7-8`, `:25`,
`:64`, `:68`, `:74-95`, `:98-105`, `:180-190`, `:214-243`, `:266-270`, `:294-301`, `:440-451`,
`:453-490`, `:470`, `:596-605`; `nova/corsa.py:23`; `nova/ccx.py:44`; `corsa.js:53`, `:81`, `:113`,
`:124`, `:263-264`, `:279-303`; `file.js:15`, `:24-39`; `numeri.js:155`, `:182`, `:195`;
`app.js:25`, `:177`, `:312-334`, `:337`, `:810`; `index.html:16-20`, `:74-76`, `:91`, `:109`,
`:110` (l'innesto fra `:109` e `:110` è esatto); `stile.css:12`, `:53`, `:117`, `:241`, `:307-311`,
`:381`, `:388-392`, `:400`; `fumo.mjs:6`, `:27`, `:47`; `test_fumo_chrome.py:22`, `:135`;
`06-dominio-analisi-verifiche-formati.md:110`, `:175`, `:178`; `13-solido-calculix.md:657`.

E due cose che il piano **non** dice e che valgono: `static/recenti.js` non tocca `localStorage`
all'import (il deposito arriva come argomento), e `corsa.js` importa già `file.js` — quindi
`confronto.js` può importare `./corsa.js` e `./file.js` dentro `node --test` senza DOM. Verificato
leggendo le teste dei due moduli, non dedotto.

### 2. I rischi, con il ruling

**R1 — la cella «— t» quando il telaio manca. Il piano ha torto: l'unità va solo col numero.**
`td(\`${r.telaio} ${r.unita}\`)` stampa «— Hz» su ogni riga senza valore del telaio, e sul MURO 1
con mappa vuota sono tre righe su sette. Ruling: `td(r.telaio === "—" ? "—" : \`${r.telaio} ${r.unita}\`)`.
Una riga senza valore del telaio è `non_confrontabile` su quel lato comunque, e l'unità piena sta
nel CSV. *Costo se sbaglio*: una riga con telaio nullo ma solido pieno perde l'unità a schermo.

**R2 — il `<sup>` con gli apici Unicode. Toglilo: cifre normali dentro il `<sup>`.** Il piano
codifica il numero della nota **due volte** — l'elemento `<sup>` *e* i glifi `¹ ² ³`. Gli screen
reader trattano U+00B9/B2/B3 in modo incoerente (VoiceOver legge «²» come "squared", NVDA spesso lo
salta): la ridondanza peggiora, non aiuta. Ruling: cancella `APICI` e `apice`; `sup.textContent =
note.join(" ")` e `sup.setAttribute("aria-label", \`nota ${note.join(", ")}\`)`. Il `<ol>` in fondo
già numera da 1 e i due numeri combaciano. Il test cambia: `celle[5].textContent === "lontano 1"`.
*Costo se sbaglio*: una nota a due cifre («10») si legge come numero e non come apice — accettabile,
il `<sup>` porta la semantica.

**R3 — `ultimoTelaio` che resta una corsa senza cartella.** Com'è scritto, `disegna` **svuota** il
campo (`percorsoRisultati` → `""`) e butta via un percorso ancora buono. Ruling: sovrascrivi solo
con un valore non vuoto —
`const p = percorsoRisultati(telaio, "telaio"); if (!toccato.telaio && p !== "") campoTelaio.value = p;`
e lo stesso per il solido. `azzera()` continua a svuotare a mano. Una condizione, non
un'astrazione. *Costo se sbaglio*: dopo una corsa fallita il campo mostra il percorso di quella
buona di prima — e il server dirà «illeggibile» se non c'è. Più economico che far ridigitare.

**R4 — `specchiaJson` a ogni `input`.** `JSON.stringify` di un oggetto da ≤ 10 chiavi, microsecondi.
Nessun `debounce`. Ruling: **lascia**. *Costo se sbaglio*: nessuno misurabile.

**R5 — la tabella a 9 colonne e il pannello.** Misurato in 0: due guardie indipendenti (traccia
`minmax` a estremi definiti; `min-width` risolto a 0 per l'`overflow: auto` di `#pannello`). Ruling:
il CSS del piano basta così. *Costo se sbaglio*: lo prende il fumo con `scrollWidth <= innerWidth`.

**R6 — `conAbaqus` che decide le colonne per tabella.** Sul MURO 1 misurato: 2 righe appaiate su
23, cioè **9 colonne con 21 righe di «—»**. Ruling: **lascia** il commutatore com'è. Nascondere le
colonne di un CSV che l'utente ha chiesto sarebbe un fallimento silenzioso; le 21 «non
confrontabili» del conteggio dicono già quanto è appaiato. Il caso davvero muto — **zero** righe
appaiate, che fa cadere `conAbaqus` a false e riporta a 6 colonne senza una parola — lo copre R7.

**R7 — il `<caption>` fisso «telaio ↔ solido ↔ Abaqus» mente, e copre anche il CSV muto.** Ruling:
una pura in più, la più corta che regge:

```js
export function testoDidascalia(tabella, { abaqusChiesto = false } = {}) {
  if (conAbaqus(tabella)) return "telaio ↔ solido ↔ Abaqus";
  return abaqusChiesto
    ? "telaio ↔ solido · il CSV Abaqus non ha righe appaiate ai casi"
    : "telaio ↔ solido";
}
```

`creaConfronto` la chiama con `abaqusChiesto: campoAbaqus.value.trim() !== ""` e scrive
`didascaliaEl.textContent`. Due rami, un test. *Costo se sbaglio*: una riga di didascalia in più da
mantenere. Costo di **non** farlo: l'utente incolla un CSV con i casi sbagliati, vede sei colonne e
crede che il CSV non l'abbia proprio dato.

**R8 — il fumo che dipende dal formato di `conciso` («4 250»).** Ruling: **tienilo**. Misurato:
`conciso(4250.1)` = `"4 250"` (U+202F fra le migliaia; sopra cento zero decimali). Non è fragilità,
è l'unico oracolo che prova che il valore Abaqus finisce nella **colonna giusta** — `children[4]` e
la stringa insieme. `conciso` ha già i suoi test in `numeri.test.js`: se cambia, cade lì per primo.

**R9 — `nodiInSommita` con tolleranza 1 mm su un telaio a due piani.** Prende solo l'ultimo piano,
ed è quel che serve: `_media_sommita` (`nova/confronto.py:294-301`) media sui nodi che gli dai, e il
`SET_SOMMITA` del solido è la faccia superiore. Ruling: **lascia**. Il campo è modificabile e la
precompilazione è un default, non un vincolo.

**R10 — lo stile dei campi è incompleto, e si vede a occhio.** `#confronto label` prende solo
`margin-top` dal piano, ma `display: block; font-size: 11px; color: var(--testo-tenue)` sta in
`stile.css:295` su `#file label, #corsa label, #risultati-controlli > label` — `#confronto` non c'è.
Idem per i campi: `width: 100%; font-family: var(--mono); background: var(--pannello); border` sta a
`:296` sulla lista `#file-percorso, #comando-campo, #corsa-inp, …`, e l'`outline` di fuoco a `:300`.
Senza questo i quattro campi escono nudi. Ruling, ed è la regola R12 che il file già si è data a
`:381` («un selettore solo»): **estendi i tre selettori esistenti** con
`#confronto label` (`:295`), `#confronto input[type="text"], #confronto-json` (`:296`),
`#confronto input[type="text"]:focus-visible, #confronto-json:focus-visible` (`:300`); poi togli dal
blocco in coda il `width: 100%` di `#confronto-json` e i `:focus-visible` duplicati. `#confronto
label.riga` resta `display: flex` — specificità più alta e più avanti nel file.

**R11 — `#confronto-vuoto`.** La classe `.vuoto` (`:241`) porta `padding: var(--passo)` e
`max-width: 24rem`, che in 303 px non hanno senso: è esattamente il motivo per cui `#corsa-vuoto`
esiste a `:400`. Ruling: `#confronto-vuoto` entra in quel selettore, non in una regola nuova.

### 3. Le domande aperte (nessun ruling: contraddirebbero C1-C4 o D7a)

1. Col solo telaio **21 righe su 23 sono attenuate**: la scheda è quasi tutta grigia. Vale la pena
   mostrarla senza né solido né CSV, o «confronta» dovrebbe pretendere un secondo lato? (C1a dice
   opzionali tutti e due.)
2. `Z1` compare nel form come caso mappabile, ma un passo solido «Z1» non esiste: la riga si mappa a
   sé stessa e non produce niente. Precompilare **vuoto** il passo per i casi `Z<n>`? (C2c: il form
   è minimo, un valore per caso.)
3. Ogni clic su «confronta» genera un `run_id` e una cartella nuova sotto `corse/`: dieci confronti,
   dieci cartelle, nessuna pulizia. Sta sotto `nova/` → fuori dalla 14b per C4a.
4. `#messaggio` è **condiviso**: `suErrore(null)` del confronto cancella un errore della corsa
   ancora a schermo. Una riga di stato per sezione cambierebbe la veste di tutto il pannello.

### 4. Chi esegue, con quale modello, in quale ordine

**Tutto in sequenza. Task 1 e Task 2 non vanno in parallelo**: scrivono lo **stesso file**,
`static/confronto.js` (Task 1 lo crea, Task 2 gli appende `creaConfronto`), e Task 2 importa le
pure di Task 1 — due agenti sullo stesso file producono un conflitto certo su un vantaggio nullo.
Task 3 dipende dall'export `creaConfronto` di Task 2. Il markup e il CSS di Task 2 toccano file
disgiunti (`index.html`, `stile.css`) ma restano nel Task 2: staccarli vorrebbe dire un agente che
scrive gli id e un altro che li legge, senza guadagno di tempo reale.

| Task | Subagente | Modello | Parallelo? | Skill-gate | Riferimento |
|---|---|---|---|---|---|
| 1 — le pure | `frontend-engineer` | `sonnet` | **no**, apre `confronto.js` | **sì** | `docs/ricerca/07-ux-modellatore.md:105` |
| 2 — `creaConfronto`, markup, stile | `frontend-engineer` | **`opus`** | **no**, stesso `confronto.js` + dipende da 1 | **sì** | `docs/ricerca/07-ux-modellatore.md:100` |
| 3 — `app.js` e il fumo | `frontend-engineer` | `sonnet` | **no**, dipende da 2 | **sì** | `docs/ricerca/06-dominio-analisi-verifiche-formati.md:175` |
| 4 — prova a mano, review, Esito | controller (non un subagente) | — | la review a cinque **sì**, in parallelo | n/a | `docs/ricerca/06-dominio-analisi-verifiche-formati.md:110` |

**Perché `opus` solo sul Task 2**: è l'unico che deve *decidere* mentre scrive — R2 (togliere gli
apici e rifare il test), R7 (una pura nuova con il suo test), R10 e R11 (tre selettori esistenti da
estendere invece di tre regole nuove), più 300 righe di factory con DOM e nove test asincroni. Task
1 e Task 3 sono trascrizione disciplinata di codice già scritto qui, con correzioni elencate una per
una: `sonnet` con questa annecatura in mano basta.

**Quale skill per il `frontend-engineer`**: `impeccable` su tutti e tre, ed è vincolante sul Task 2
— markup della tabella (`<caption>`, `<th scope>`, `<ol>` delle note), stile, doppio canale, copia
d'interfaccia. Sul Task 1 il gate è soddisfatto dalla stessa skill sulla copia delle uscite in
parole (`PAROLA_CLASSE`, `testoConteggio`, i messaggi d'errore); sul Task 3 sugli oracoli del fumo
che guardano la pagina resa.

### 5. I test dei Task 2 e 3, letti col DOM finto in mano

Il DOM finto del piano regge: `dispatch` rende la promessa dei listener (il `await` sul clic
funziona), il getter di `textContent` somma i figli (quindi «lontano ¹» viene dal `<sup>`),
`querySelectorAll("input")` guarda i nipoti e le righe caso sono `label > input` (funziona),
`createElement(nome)` porta il tag (`corsa.test.js:163` lo butta via, la copia nuova no: giusto).
Cinque correzioni, tutte misurate:

1. **Task 1, `righeDaMostrare`: `assert.equal(r[4].scartoAbaqus, "2,2 %")` cade.** Misurato:
   `stampaNumero(2.15, {decimali: 1})` = **`"2,1"`** — `toFixed` su un double che sta appena **sotto**
   2,15. Correzione minima: nella fixture `scarto_abaqus_pct: 2.15` → **`2.24`**, l'attesa resta
   «2,2 %».
2. **Task 1, `conciso` su tutti i valori della fixture** — verificati uno per uno lanciando
   `numeri.js`: `0,7694` ✅, `0` ✅ (lo zero è un valore), `7 545` ✅ (con U+202F), `4 250` ✅,
   `-0,0021`, `31,85`. `versioneBreve` rende `"3.8.0"`, `"2.22"` e **`null`** su `null` — quindi
   `nd(versioneBreve(...))` → «n/d» ✅, il test di `testoProvenienza` passa com'è.
3. **Task 2, la cella della classe con la nota**: con R2 l'attesa diventa
   `assert.equal(celle[5].textContent, "lontano 1")`, e resta
   `celle[5]._figli.at(-1)?.nome === "sup"`.
4. **Task 2, la didascalia (R7)**: aggiungi in coda al test «senza Abaqus le colonne sono sei»
   `assert.equal(el("didascalia").textContent, "telaio ↔ solido")`, e un caso nuovo con
   `#confronto-abaqus` pieno e una risposta senza righe appaiate →
   «telaio ↔ solido · il CSV Abaqus non ha righe appaiate ai casi».
5. **`el("abaqus").dispatch("input")` nel test 3 è un no-op**: `creaConfronto` non registra nessun
   listener su `campoAbaqus` (e non gli serve: non c'è `toccato.abaqus`). Non è un errore, non
   toglierlo — con R7 quel campo entra in `testoDidascalia` e il `dispatch` torna a servire.

**E il fumo, dove il piano sbaglia tre oracoli su quattro** (i numeri sono quelli di 0):

- `t["casi"] == ["C1→C1", "C2→C2", "C3→C3"]` → **`["C1→C1", "C2→C2", "C3→C3", "Z1→Z1"]`**.
- `t["righe"] >= 1` è troppo largo → **`t["righe"] == 23`**, e nel commento la scomposizione
  1 + 4×4 + 3 + 3. Se un giorno `run.casi` cambia, si vuole vederlo qui.
- `t["note"] >= 1` con la motivazione «la massa ha una ragione (C1 è una combinazione)» → la
  motivazione è **falsa**: `Z1` è nella corsa e la massa esce con il suo valore. Diventa
  **`t["note"] == 2`**, «due `bias_atteso` distinti — massa e tetraedri; nessuna `ragione`».
- `t["colonne"] == 9` ✅ misurato, e `t["abaqusC1"] == "4 250"` ✅ (riga `reazione_z`/`C1`,
  `children[4]`). `t["stato"]` sarà «23 righe · 21 non confrontabili · verifica del codice, non
  validazione»: l'asserzione su `endswith` regge.
- Aggiungi un oracolo per R7: `const didascalia = await ev(\`document.getElementById("confronto-didascalia").textContent\`)`
  e `assert t["didascalia"] == "telaio ↔ solido ↔ Abaqus"`. Costa una riga e prova che il CSV è
  entrato davvero.

### 6. La coerenza delle firme fra i task

Controllate a mano, contratto ↔ test ↔ codice: `percorsoRisultati`, `nodiInSommita`, `casiCorsi`,
`mappaDalForm`, `leggiMappaJson`, `conAbaqus`, `noteDellaTabella`, `righeDaMostrare`,
`testoConteggio`, `testoProvenienza`, `creaConfronto(radice, {suErrore, appunti}) → {disegna, azzera}`,
`disegna({modello, telaio, solido})`. **Combaciano tutte.** Con R7 entra `testoDidascalia(tabella,
{abaqusChiesto})`: va aggiunta al «Contratto dei moduli», all'`import` in cima al test e alla lista
di Task 1 — oppure scritta in Task 2 insieme a chi la usa. Preferisci **Task 1**: è pura, e Task 1
è il task che le pure le testa.

Due conferme sulla cucitura, lette in sessione: `suEsito` riceve l'oggetto `lavoro` intero
(`corsa.js:263-265`, `{run_id, secondi, fin, fasi, modello, solido, cartella}`), quindi
`esito.solido`, `esito.cartella` e `esito.fin.risultati.run.casi` esistono tutti e tre; e `suEsito`
chiama già `ridisegna()` su tutti e due i rami (`app.js:320-331`), quindi `confronto.disegna` parte
da sé dopo ogni corsa — niente da aggiungere.

### 7. Contratto degli ingressi, per task

Quelli già scritti sotto ogni task restano validi e sono stati controllati contro il codice. Si
aggiungono, misurati:

**Task 1** — `casiCorsi` su una corsa vera del MURO 1 → **`["C1","C2","C3","Z1"]`**, quattro voci:
`mappaDalForm` ne fa quattro chiavi, non tre. · `nodiInSommita` su un modello con un nodo senza `z`
→ `Math.max` dà `NaN` e il filtro rende `[]`: accettabile, **non** solleva (nessun modello di NOVA
arriva così, `modello.py` pretende x/y/z).

**Task 2** — CSV chiesto e **nessuna** riga appaiata → `conAbaqus` falso, 6 colonne, e la didascalia
lo **dice** (R7), non tace. · `tabella.righe = []` → «nessuna riga · <avvertenza>», `<thead>` con la
sola intestazione, note nascoste, didascalia «telaio ↔ solido».

**Task 3** — `run.casi` a **quattro** voci: le righe caso → passo sono quattro e il fumo le conta
tutte e quattro.

**Task 4** — nessun ingresso esterno (task del controller).

### 8. Nota di metodo

Questo piano cita la ricerca e **la cita giusta** sul contenuto (06:110, 06:175, 06:178, 13:657
dicono esattamente quel che il piano gli fa dire; 07:105 regge il principio data-ink, l'applicazione
«bias e ragioni in nota» è una decisione del piano, non della fonte). È il contrario di quanto
misurato su NOVA l'08/09/2026, quando nove ricerche esistevano e un piano solo le nominava una
volta. Solo i numeri di riga dell'`index.md` sono spostati di uno — vedi §1.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, commit; identificatori invariati. Chiavi della tabella alla lettera: `righe[k] = {grandezza, caso, unita, telaio, solido, abaqus, scarto_solido_pct, scarto_abaqus_pct, classe_solido, classe_abaqus, bias_atteso, ragione}` (`nova/confronto.py:74-88`), `classe ∈ {concorde, vicino, lontano, non_confrontabile}` (`:98-105`), `provenienza = {commit_nova, run_id_telaio, hash_modello, run_id_solido, sha256_deck_solido, versione_opensees, versione_calculix, data}` (`:440-451`), `avvertenza` (`:25`). Chiavi speciali di `mappa_casi`: `nodi_sommita`, `gravita`, `spinta`, `assi` (`:68`, `:453-461`).
- **Sotto `nova/` non cambia niente**: nessuna rotta che serve i file, nessun campo nuovo nella risposta. Gli export si raggiungono dal percorso stampato.
- **La massa è la prima riga**: la UI non riordina le righe del server (story 57 è già nel backend, `nova/confronto.py:470`).
- **Ogni tabella porta «verifica del codice, non validazione»** (story 61): nel conteggio in testa, dal campo `avvertenza` della risposta, mai una stringa cablata nel client.
- **Un solo rosso** `#b8321e`: nella sezione **nessun** rosso — le classi sono parole (`concorde`, `vicino`, `lontano`, `non confrontabile`), le righe non confrontabili sono **attenuate** (`--testo-tenue`) e la parola resta (doppio canale). Niente verde: nessun pass/fail (spec §Confronto).
- **Il pannello non si allarga e la pagina non scorre in orizzontale**: la tabella vive in `#confronto-scorri { overflow-x: auto }`; `document.documentElement.scrollWidth <= window.innerWidth` è un oracolo del fumo.
- **I campi percorso si precompilano solo finché l'utente non li tocca**: una corsa nuova riscrive un campo **non toccato**; un campo toccato resta com'è (`toccato` per campo, azzerato da `azzera()`).
- **Il JSON avanzato comanda solo se modificato**: finché il `<textarea>` non riceve un `input`, il suo testo è lo specchio del form (riscritto a ogni cambio del form); dopo, è la sorgente e il `<summary>` dice «avanzato: mappa_casi in JSON (in uso)». Un JSON non valido → messaggio in `#messaggio`, nessuna richiesta.
- **Stato in `app.js`** (`ultimoTelaio`, `ultimoSolido`), fuori da modello e cronologia; «apri»/«importa» azzerano il telaio (una corsa di un altro modello non è più «l'ultima») e la sezione (`azzera()`), **non** il solido: gira su un `.inp` del disco (`corsa.js:192-193`) e resta valido.
- Nessun bundler, nessuna rete a tempo d'uso; WCAG AA; `<table>` con `<caption>` e `<th scope="col">`; note come `<ol>` con `aria-label`.
- Comando dei test JS: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14b/static node --test test/*.test.js` — punto di partenza **819 pass, 0 fail** (429 ms), rimisurato l'11/09/2026 a `d2e8864`. Pytest: `/Users/mario/GitHub/NOVA-wt/interfaccia-14b/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-14b/tests -p no:cacheprovider --color=no --tb=short -rs --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-14b` — punto di partenza **744 passed, 3 skipped** (exit 0 a `d2e8864`; i tre skip sono `lab_telaio_v2/wall_model.inp`, non versionato, che però esiste in `/Users/mario/GitHub/NOVA/lab_telaio_v2/wall_model.inp` per la prova a mano); il fumo: **19** test raccolti in `tests/test_fumo_chrome.py`.
- Server per la prova: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-14b /Users/mario/GitHub/NOVA-wt/interfaccia-14b/.venv/bin/python -P -m nova --porta 8823`. **Mai la 8765, né 8766-8767, né 8817-8822.**
- Mai `git checkout --` per revertire un mutante; un comando per chiamata Bash, percorsi assoluti, `git -C`; commit per percorso, mai `-a`.

## Quel che c'è già, e non va reinventato

- `static/corsa.js:113-124` la forma di `creaCorsa(radice, {…})` (`q = radice.querySelector`, elementi presi una volta); `:124` `lavoro = {run_id, secondi, fin, fasi, modello, solido, cartella?}`; `:192-199` `disegnaUltima` con «· cartella …» per il solido; `:240-266` `lavora` (la `cartella` arriva da `avvio.cartella` o `s.cartella`); `:279-303` `conBottone(b, testoInAttesa, fn)` (spegne i bottoni, ripristina il testo, `suEsito` fuori dal `try`); `:81` `testoUltima(lavoro)` («corsa del solido ab12…»).
- `static/file.js:24-39` `chiediJson(rotta, corpo)` (POST se `corpo` c'è; su `!r.ok` un `Error` con `.dati` e `.stato`, messaggio dal `motivo`).
- `static/numeri.js:155` `stampaNumero(v, {decimali, migliaia})` (virgola decimale, `—` su non finito), `:182` `cifre`, `:195` `conciso` (le cifre giuste per un valore: 2 sotto 100, 4 sotto 1, migliaia sopra 100).
- `static/app.js:312-334` `creaCorsa` con `suEsito(esito)` (`esito.solido`, `esito.fin.risultati`); `:296-303` `suApertura` (azzera `risultati`, `percorso`, `impronta`); `:776-812` `ridisegna` (l'ordine dei `disegna`: file, corsa, esito, storia); `:36` `selezione = {tipo, id}` (una sola: **non** c'è selezione multipla, i nodi in sommità si calcolano dal modello); `:177` `dì(testo)`.
- `static/index.html:91-109` il blocco `#risultati` (la sezione nuova va **dopo**, prima di «Storia» a `:110`); `:74-76` il campo `#corsa-inp` e il bottone «corri il solido» (stessa veste per i campi percorso); `:16-20` `.file-azioni`.
- `static/stile.css:307-311` `.file-azioni button`; `:381` `#corsa label`; `:388-392` `#corsa-ultima` (font 11 px, `overflow-wrap: anywhere`) e `.stantia`; `:241` `.vuoto`; `:117` `.numero`; `:12` `--testo-tenue`; `:22` la colonna del pannello `minmax(220px, 20rem)`.
- `static/test/corsa.test.js:137-160` `elementoFinto` (con `disabled`, `_scritture`), `:163-183` `radiceCorsa()` (mappa `querySelector`), `:187-205` `fetchSequenza(risposte)` (fetch finta a sequenza con `spia.rotte`/`spia.corpi`).
- `tests/fumo/fumo.mjs:27-37` `apriECorri(fixture)` (apri, `⌘⏎`, aspetta `#corsa-ultima` e `#risultati-controlli`), `:44-51` `staDentro(sel, contenitore)`, `:296-306` il dispatch dei copioni; `tests/test_fumo_chrome.py:22` `FIXTURE`, `:135` `copione(nome, porta, cdp, **extra)`, `:245-262` la forma di un test della 14a.
- Fixture: `tests/fixture/muro_1.nova.json` (nodi 1-4, i due in sommità sono **3 e 4** a z = 1607,5; casi `C1 C2 C3` + modale «auto»); `tests/fixture/abaqus_esempio.csv` (`GRAVITA;reazione_z`, `SPINTA_ORIZZONTALE;reazione_x`, `GRAVITA;u_sommita_z` — i **casi Abaqus sono i nomi dei passi del solido**, e si appaiano per `solido_caso` della mappa: `nova/confronto.py:180-190,323-334`); la mappa del caso studio: `{"C1": "GRAVITA", "C2": "SPINTA_ORIZZONTALE", "C3": "CARICO_TOP", "nodi_sommita": [3, 4], "assi": {"x": "y", "y": "x", "z": "z"}}` (`docs/caso-studio/confronto-2026-09-05.md:27`); la tabella vera in `docs/caso-studio/confronto.json` (19 righe, prima `massa`).
- Il telaio da solo basta: `solido` e `abaqus` sono opzionali (`nova/confronto.py:7-8`), le colonne restano `null` e le classi `non_confrontabile` — nessuna eccezione. Con i casi `C<n>` (combinazioni) la riga `massa` esce `non_confrontabile` con la ragione «il caso di gravità … è una combinazione, serve un'azione Z<id> a coefficiente unitario» (`:266-270`) — sul MURO 1 è così, ed è **giusto** che la nota lo dica.

## Contratto dei moduli (le firme che i task condividono)

```js
// static/confronto.js — le pure
export const NOME_RISULTATI = Object.freeze({ telaio: "risultati.nova.risultati.json", solido: "risultati_solido.json" });
export function percorsoRisultati(lavoro, tipo)     // `${lavoro.cartella}/${NOME_RISULTATI[tipo]}`; senza lavoro o cartella → ""
export function nodiInSommita(m, tolleranza = 1)   // id (crescenti) dei nodi con z ≥ zMax − tolleranza; nessun nodo → []
export function casiCorsi(lavoro)                   // lavoro.fin.risultati.run.casi ?? []  (i casi che la corsa ha girato, nell'ordine del server)
export function mappaDalForm({ casi, nodi, assiScambiati })
// casi: [{caso, passo}] → una chiave per caso con `passo` non vuoto (spazi tolti); nodi: "3; 4" → nodi_sommita [3, 4]
//   (separatori `;` `,` spazi; vuoto → chiave assente; un pezzo non intero → Error("nodi in sommità: scrivi gli id separati da «;»"));
//   assiScambiati → assi {"x": "y", "y": "x"}; altrimenti niente `assi`
export function leggiMappaJson(testo)               // JSON.parse; non un oggetto (array, null, numero) o non valido → Error("mappa_casi: JSON non valido — <motivo>")
export const PAROLA_CLASSE = Object.freeze({ concorde: "concorde", vicino: "vicino", lontano: "lontano", non_confrontabile: "non confrontabile" });
export function conAbaqus(tabella)                  // true se una riga ha `abaqus` non null o `classe_abaqus` diversa da non_confrontabile
export function noteDellaTabella(tabella)
// → { note: [{n, testo}], perRiga: [[n, …], …] } — per ogni riga, prima `bias_atteso` (se non vuoto) poi `ragione` (se non null),
//   dedup per testo nell'ordine di prima comparsa; n da 1
export function righeDaMostrare(tabella)
// → [{ grandezza, caso ("—" se null), unita, telaio, solido, abaqus, scartoSolido, scartoAbaqus, classeSolido, classeAbaqus, attenuata, note }]
//   valori con `conciso`, null → "—"; scarti «38,6 %» (stampaNumero a 1 decimale), null → "—"; classi da PAROLA_CLASSE;
//   attenuata = entrambe le classi non_confrontabile; note = perRiga[k]
export function testoConteggio(tabella)             // «19 righe · 4 non confrontabili · verifica del codice, non validazione» (righe 0 → «nessuna riga · <avvertenza>»; non confrontabile = riga attenuata)
export function testoProvenienza(p)                 // «commit d2e8864 · run telaio 3fb8d0907967 · run solido 68f88432812d · OpenSees 3.8.0 · CalculiX 2.22 · 05/09/2026 17:51»
                                                    //   (campi null → «n/d»; versioni con `versioneBreve` di corsa.js; data ISO → gg/mm/aaaa hh:mm; p null → «»)

// static/confronto.js — il blocco
export function creaConfronto(radice, { suErrore, appunti = null })
// → { disegna({ modello, telaio, solido }), azzera() }
// disegna: precompila #confronto-telaio/#confronto-solido con percorsoRisultati (solo se non toccati), rifà le righe
//   caso → passo di #confronto-casi quando cambia il telaio (valori: caso = passo, come `mappaPredefinita`), #confronto-nodi con
//   nodiInSommita(modello) se non toccato; riscrive #confronto-json dal form se non «in uso»; il bottone «confronta» è spento senza telaio
// confronta(): POST /api/confronto {telaio, solido: ""→null, abaqus: ""→null, mappa_casi}; risposta → tabella, note, conteggio, provenienza,
//   cartella (+ «copia» → appunti.writeText(cartella), poi suErrore(null) e «copiato» accanto per un attimo… no: il bottone dice «copiato» finché non si ridisegna)
// 400/rete → suErrore(e.message), la tabella di prima resta
// azzera(): campi vuoti e non toccati, tabella/note/provenienza/cartella nascoste, JSON non in uso

// static/app.js
// let ultimoTelaio = null, ultimoSolido = null;   // riempiti in suEsito: esito.solido ? ultimoSolido : ultimoTelaio
// confronto.disegna({ modello: m, telaio: ultimoTelaio, solido: ultimoSolido }) in ridisegna, dopo esito.disegna
// suApertura / importa: ultimoTelaio = null; confronto.azzera()
```

---

### Task 1: `confronto.js` — le pure

**Files:**
- Create: `static/confronto.js` (solo le pure in questo task; `creaConfronto` nel Task 2)
- Create: `static/test/confronto.test.js`

**Interfaces:** vedi «Contratto dei moduli». Consuma `conciso`, `stampaNumero` (`numeri.js`), `versioneBreve` (`corsa.js:53`).

- [ ] **Step 1: i test** (`static/test/confronto.test.js`, fixture a mano dalla tabella vera):

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { NOME_RISULTATI, percorsoRisultati, nodiInSommita, casiCorsi, mappaDalForm, leggiMappaJson,
         PAROLA_CLASSE, conAbaqus, noteDellaTabella, righeDaMostrare, testoConteggio, testoProvenienza } from "../confronto.js";

const riga = (grandezza, caso, extra = {}) => ({
  grandezza, caso, unita: "N", telaio: 7545.4, solido: 4200.1, abaqus: null,
  scarto_solido_pct: 79.65, scarto_abaqus_pct: null, classe_solido: "lontano", classe_abaqus: "non_confrontabile",
  bias_atteso: "", ragione: null, ...extra,
});
const BIAS = "massa: zapatas e tamponatura fuori dal telaio";
const RUMORE = "entrambi i valori sotto il pavimento di rumore per «N» (< 0.01)";
const tabella = () => ({
  avvertenza: "verifica del codice, non validazione",
  provenienza: { commit_nova: "fa3b2e3", run_id_telaio: "3fb8d0907967", hash_modello: "0137", run_id_solido: "68f88432812d",
                 sha256_deck_solido: "c8d0", versione_opensees: "Version 3.8.0 64-Bit (6e55)", versione_calculix: "CalculiX Version 2.22, Copyright(C) 1998-2024 Guido Dhondt",
                 data: "2026-09-05T17:51:19" },
  righe: [
    riga("massa", null, { unita: "t", telaio: 0.7694, solido: 0.5551, scarto_solido_pct: 38.62, bias_atteso: BIAS }),
    riga("reazione_x", "C1", { telaio: 0, solido: 1.7e-5, scarto_solido_pct: null, classe_solido: "non_confrontabile", ragione: RUMORE }),
    riga("reazione_z", "C1"),
    riga("u_sommita_x", "C2", { unita: "mm", telaio: -0.19, solido: -0.17, scarto_solido_pct: 11.76, classe_solido: "vicino", bias_atteso: "tetraedri lineari più rigidi" }),
    riga("f1", null, { unita: "Hz", telaio: 20.45, solido: 21.1, scarto_solido_pct: 3.08, classe_solido: "concorde", abaqus: 20.9, scarto_abaqus_pct: 2.15, classe_abaqus: "concorde" }),
  ],
});

test("percorsoRisultati: cartella + nome fisso per tipo; senza lavoro o cartella → stringa vuota", () => {
  assert.equal(percorsoRisultati({ cartella: "corse/ab12" }, "telaio"), "corse/ab12/risultati.nova.risultati.json");
  assert.equal(percorsoRisultati({ cartella: "/tmp/c" }, "solido"), "/tmp/c/risultati_solido.json");
  assert.equal(NOME_RISULTATI.solido, "risultati_solido.json");
  assert.equal(percorsoRisultati(null, "telaio"), "");
  assert.equal(percorsoRisultati({ cartella: null }, "telaio"), "");
  assert.equal(percorsoRisultati({}, "solido"), "");
});

test("nodiInSommita: i nodi alla quota massima entro la tolleranza, id crescenti; nessun nodo → []", () => {
  const m = { nodi: [{ id: 4, x: 2262, z: 1607.5 }, { id: 1, x: 0, z: 0 }, { id: 3, x: 0, z: 1607.5 }, { id: 2, x: 2262, z: 0 }] };
  assert.deepEqual(nodiInSommita(m), [3, 4]);
  assert.deepEqual(nodiInSommita({ nodi: [{ id: 7, x: 0, z: 100 }, { id: 8, x: 1, z: 99.5 }] }), [7, 8]);   // entro 1 mm
  assert.deepEqual(nodiInSommita({ nodi: [{ id: 7, x: 0, z: 100 }, { id: 8, x: 1, z: 98 }] }), [7]);
  assert.deepEqual(nodiInSommita({ nodi: [] }), []);
  assert.deepEqual(nodiInSommita(null), []);
});

test("casiCorsi: i casi della corsa dal run, o [] senza risultati", () => {
  assert.deepEqual(casiCorsi({ fin: { risultati: { run: { casi: ["C1", "C2"] } } } }), ["C1", "C2"]);
  assert.deepEqual(casiCorsi({ fin: { esito: "errore" } }), []);
  assert.deepEqual(casiCorsi(null), []);
});

test("mappaDalForm: un caso per riga con passo non vuoto, nodi da «3; 4», assi solo se scambiati", () => {
  const mappa = mappaDalForm({ casi: [{ caso: "C1", passo: " GRAVITA " }, { caso: "C2", passo: "" }, { caso: "C3", passo: "CARICO_TOP" }],
                               nodi: "3; 4", assiScambiati: true });
  assert.deepEqual(mappa, { C1: "GRAVITA", C3: "CARICO_TOP", nodi_sommita: [3, 4], assi: { x: "y", y: "x" } });
  assert.deepEqual(mappaDalForm({ casi: [], nodi: "", assiScambiati: false }), {});
  assert.deepEqual(mappaDalForm({ casi: [], nodi: "3,4 5", assiScambiati: false }), { nodi_sommita: [3, 4, 5] });
  assert.throws(() => mappaDalForm({ casi: [], nodi: "3; quattro", assiScambiati: false }), /nodi in sommità: scrivi gli id separati da «;»/);
});

test("leggiMappaJson: un oggetto; array, null, numero e testo rotto → errore in parole", () => {
  assert.deepEqual(leggiMappaJson('{"C1": "GRAVITA", "nodi_sommita": [3]}'), { C1: "GRAVITA", nodi_sommita: [3] });
  assert.deepEqual(leggiMappaJson("  "), {});                                      // vuoto = nessuna mappa, non un errore
  for (const t of ["[1]", "null", "3", '{"C1": ']) assert.throws(() => leggiMappaJson(t), /mappa_casi: JSON non valido/, t);
});

test("conAbaqus: falso finché nessuna riga porta un valore o una classe Abaqus", () => {
  const t = tabella();
  assert.equal(conAbaqus(t), true);
  t.righe[4].abaqus = null; t.righe[4].classe_abaqus = "non_confrontabile";
  assert.equal(conAbaqus(t), false);
  assert.equal(conAbaqus({ righe: [] }), false);
});

test("noteDellaTabella: bias poi ragione, dedup per testo, numerate da 1, una lista di numeri per riga", () => {
  const { note, perRiga } = noteDellaTabella(tabella());
  assert.deepEqual(note.map((n) => n.testo), [BIAS, RUMORE, "tetraedri lineari più rigidi"]);
  assert.deepEqual(note.map((n) => n.n), [1, 2, 3]);
  assert.deepEqual(perRiga, [[1], [2], [], [3], []]);
  assert.deepEqual(noteDellaTabella({ righe: [] }), { note: [], perRiga: [] });
});

test("righeDaMostrare: numeri con la virgola, null → «—», classi in parole, attenuata solo se entrambe non confrontabili", () => {
  const r = righeDaMostrare(tabella());
  assert.equal(r.length, 5);
  assert.deepEqual([r[0].grandezza, r[0].caso, r[0].unita, r[0].telaio, r[0].solido, r[0].abaqus], ["massa", "—", "t", "0,7694", "0,5551", "—"]);
  assert.equal(r[0].scartoSolido, "38,6 %");
  assert.equal(r[0].scartoAbaqus, "—");
  assert.equal(r[0].classeSolido, "lontano");
  assert.equal(r[0].classeAbaqus, "non confrontabile");
  assert.equal(r[0].attenuata, false);
  assert.deepEqual(r[0].note, [1]);
  assert.equal(r[1].telaio, "0");
  assert.equal(r[1].scartoSolido, "—");
  assert.equal(r[1].attenuata, true, "rumore su entrambi i lati e niente Abaqus: attenuata");
  assert.deepEqual(r[1].note, [2]);
  assert.equal(r[2].telaio, "7 545", "sopra cento `conciso` toglie i decimali: le cifre piene stanno nel CSV");
  assert.equal(r[4].scartoAbaqus, "2,2 %");
  assert.equal(PAROLA_CLASSE.non_confrontabile, "non confrontabile");
  assert.deepEqual(righeDaMostrare({ righe: [] }), []);
});

test("testoConteggio: righe, quante attenuate, e l'avvertenza del server — mai cablata", () => {
  assert.equal(testoConteggio(tabella()), "5 righe · 1 non confrontabile · verifica del codice, non validazione");
  const t = tabella(); t.righe[2].classe_solido = "non_confrontabile";
  assert.equal(testoConteggio(t), "5 righe · 2 non confrontabili · verifica del codice, non validazione");
  assert.equal(testoConteggio({ righe: [], avvertenza: "prova" }), "nessuna riga · prova");
  assert.equal(testoConteggio({ righe: [tabella().righe[0]], avvertenza: "x" }), "1 riga · 0 non confrontabili · x");
});

test("testoProvenienza: commit, run, versioni brevi, data italiana; i null dicono n/d; null → vuoto", () => {
  assert.equal(testoProvenienza(tabella().provenienza),
    "commit fa3b2e3 · run telaio 3fb8d0907967 · run solido 68f88432812d · OpenSees 3.8.0 · CalculiX 2.22 · 05/09/2026 17:51");
  assert.equal(testoProvenienza({ commit_nova: null, run_id_telaio: "a", run_id_solido: null, versione_opensees: null, versione_calculix: null, data: "2026-01-02T03:04:05" }),
    "commit n/d · run telaio a · run solido n/d · OpenSees n/d · CalculiX n/d · 02/01/2026 03:04");
  assert.equal(testoProvenienza(null), "");
});
```

- [ ] **Step 2: rosso** (`Cannot find module '../confronto.js'`).
- [ ] **Step 3: il codice** — `static/confronto.js` (le pure):

```js
// La scheda «Confronto» (story 56-57, 61): telaio NOVA ↔ solido CalculiX ↔ CSV Abaqus, per caso e
// grandezza, con scarto, classe a tre valori e bias atteso. Il server fa tutto il calcolo
// (`POST /api/confronto`); qui stanno i percorsi, la mappa dei casi, e la tabella da mostrare.
import { conciso, stampaNumero } from "./numeri.js";
import { versioneBreve } from "./corsa.js";
import { chiediJson } from "./file.js";

// I nomi fissi dei file dei risultati (`nova/corsa.py:23`, `nova/ccx.py:44`): il server risponde
// con la **cartella** della corsa, e il file dentro ha sempre questo nome.
export const NOME_RISULTATI = Object.freeze({ telaio: "risultati.nova.risultati.json", solido: "risultati_solido.json" });

export function percorsoRisultati(lavoro, tipo) {
  const cartella = lavoro?.cartella;
  return typeof cartella === "string" && cartella !== "" ? `${cartella}/${NOME_RISULTATI[tipo]}` : "";
}

/** I nodi alla quota massima: la selezione è una sola (`app.js`), e i «nodi in sommità» del
 *  confronto sono quelli del piano più alto — su un telaio piano, i due (o più) a z massima. */
export function nodiInSommita(m, tolleranza = 1) {
  const nodi = m?.nodi ?? [];
  if (nodi.length === 0) return [];
  const zMax = Math.max(...nodi.map((n) => n.z));
  return nodi.filter((n) => n.z >= zMax - tolleranza).map((n) => n.id).sort((a, b) => a - b);
}

export const casiCorsi = (lavoro) => lavoro?.fin?.risultati?.run?.casi ?? [];

const leggiNodi = (testo) => {
  const pezzi = String(testo ?? "").split(/[;,\s]+/).filter((p) => p !== "");
  const nodi = pezzi.map((p) => (/^\d+$/.test(p) ? Number(p) : NaN));
  if (nodi.some((n) => Number.isNaN(n))) throw new Error("nodi in sommità: scrivi gli id separati da «;»");
  return nodi;
};

export function mappaDalForm({ casi, nodi, assiScambiati }) {
  const mappa = {};
  for (const { caso, passo } of casi ?? []) {
    const p = String(passo ?? "").trim();
    if (p !== "") mappa[caso] = p;
  }
  const ids = leggiNodi(nodi);
  if (ids.length) mappa.nodi_sommita = ids;
  if (assiScambiati) mappa.assi = { x: "y", y: "x" };
  return mappa;
}

export function leggiMappaJson(testo) {
  const t = String(testo ?? "").trim();
  if (t === "") return {};
  let letto;
  try { letto = JSON.parse(t); } catch (e) { throw new Error(`mappa_casi: JSON non valido — ${e.message}`); }
  if (letto === null || typeof letto !== "object" || Array.isArray(letto)) {
    throw new Error("mappa_casi: JSON non valido — serve un oggetto {\"C1\": \"GRAVITA\", …}");
  }
  return letto;
}

export const PAROLA_CLASSE = Object.freeze({ concorde: "concorde", vicino: "vicino", lontano: "lontano", non_confrontabile: "non confrontabile" });

export const conAbaqus = (tabella) => (tabella?.righe ?? []).some((r) => r.abaqus != null || (r.classe_abaqus ?? "non_confrontabile") !== "non_confrontabile");

/** Bias e ragioni fuori dalle celle (data-ink, `07-ux-modellatore.md:105`): una nota per testo
 *  distinto, nell'ordine in cui compare, e per ogni riga la lista dei suoi numeri. */
export function noteDellaTabella(tabella) {
  const note = [], indice = new Map(), perRiga = [];
  const numero = (testo) => {
    if (!indice.has(testo)) { indice.set(testo, note.length + 1); note.push({ n: note.length + 1, testo }); }
    return indice.get(testo);
  };
  for (const r of tabella?.righe ?? []) {
    const mie = [];
    if (r.bias_atteso) mie.push(numero(r.bias_atteso));
    if (r.ragione) mie.push(numero(r.ragione));
    perRiga.push(mie);
  }
  return { note, perRiga };
}

const valore = (v) => (v == null ? "—" : conciso(v));
const percento = (v) => (v == null ? "—" : `${stampaNumero(v, { decimali: 1 })} %`);
const parola = (classe) => PAROLA_CLASSE[classe] ?? String(classe ?? "—");
const nonConfrontabile = (r) => r.classe_solido === "non_confrontabile" && r.classe_abaqus === "non_confrontabile";

export function righeDaMostrare(tabella) {
  const { perRiga } = noteDellaTabella(tabella);
  return (tabella?.righe ?? []).map((r, k) => ({
    grandezza: r.grandezza, caso: r.caso ?? "—", unita: r.unita,
    telaio: valore(r.telaio), solido: valore(r.solido), abaqus: valore(r.abaqus),
    scartoSolido: percento(r.scarto_solido_pct), scartoAbaqus: percento(r.scarto_abaqus_pct),
    classeSolido: parola(r.classe_solido), classeAbaqus: parola(r.classe_abaqus),
    attenuata: nonConfrontabile(r), note: perRiga[k],
  }));
}

export function testoConteggio(tabella) {
  const righe = tabella?.righe ?? [];
  const avvertenza = tabella?.avvertenza ?? "";
  if (righe.length === 0) return `nessuna riga · ${avvertenza}`;
  const n = righe.filter(nonConfrontabile).length;
  return `${righe.length} ${righe.length === 1 ? "riga" : "righe"} · ${n} non confrontabil${n === 1 ? "e" : "i"} · ${avvertenza}`;
}

const dataItaliana = (iso) => {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(iso ?? ""));
  return m ? `${m[3]}/${m[2]}/${m[1]} ${m[4]}:${m[5]}` : "n/d";
};

export function testoProvenienza(p) {
  if (!p) return "";
  const nd = (v) => (v == null || v === "" ? "n/d" : String(v));
  return [`commit ${nd(p.commit_nova)}`, `run telaio ${nd(p.run_id_telaio)}`, `run solido ${nd(p.run_id_solido)}`,
          `OpenSees ${nd(versioneBreve(p.versione_opensees))}`, `CalculiX ${nd(versioneBreve(p.versione_calculix))}`,
          dataItaliana(p.data)].join(" · ");
}
```

- [ ] **Step 4: verde**: `env -C …/static node --test test/confronto.test.js`, poi tutti (819 + 11 nuovi).
- [ ] **Step 5: Commit** `feat(interfaccia): confronto.js — percorsi delle corse, nodi in sommità, mappa dei casi, righe e note della tabella`.

## Ingressi degeneri

- `percorsoRisultati(null, "telaio")` / `{cartella: null}` / `{}` → `""`, non solleva.
- `nodiInSommita(null)` / `{nodi: []}` → `[]`; un solo nodo → `[id]`.
- `casiCorsi(null)` / corsa in errore senza `risultati` → `[]`.
- `mappaDalForm` con `nodi: "3; quattro"` → `Error` in parole, nessuna mappa parziale; `casi: []`, `nodi: ""` → `{}`.
- `leggiMappaJson("")` → `{}`; `"[1]"`, `"null"`, `"3"`, JSON rotto → `Error("mappa_casi: JSON non valido — …")`.
- `righeDaMostrare({righe: []})` → `[]`; `telaio: 0` → `"0"`, non «—» (lo zero è un valore); `scarto_solido_pct: null` → «—».
- `noteDellaTabella` con `bias_atteso: ""` e `ragione: null` su ogni riga → `note: []`, `perRiga: [[], …]`.
- `testoConteggio({righe: []})` → «nessuna riga · <avvertenza>»; `avvertenza` assente → la stringa finisce con « · » e basta (non solleva).
- `testoProvenienza(null)` → `""`; `data` non ISO → «n/d»; versioni null → «n/d».

---

### Task 2: `creaConfronto` — il blocco nel pannello, il markup e lo stile

**Files:**
- Modify: `static/confronto.js` (in coda: `creaConfronto`)
- Modify: `static/index.html:109-110` (la sezione fra «Risultati» e «Storia»)
- Modify: `static/stile.css` (in coda: `#confronto`)
- Test: `static/test/confronto.test.js` (in coda)

**Interfaces:** consuma Task 1. Produce `creaConfronto(radice, { suErrore, appunti })` → `{ disegna({ modello, telaio, solido }), azzera() }`.

- [ ] **Step 1: il markup** in `index.html`, dopo `</section>` di `#risultati` (`:109`) e prima di `<h2 class="staccato">Storia</h2>` (`:110`):

```html
  <!-- Il confronto telaio ↔ solido ↔ Abaqus (story 56-57, 61): tre percorsi, la mappa dei casi da
       un form minimo (o dal JSON, se lo si tocca), la tabella con scarto e classe, le note a piè.
       Nessun rosso e nessun verde: non è un pass/fail, è «verifica del codice, non validazione». -->
  <h2 class="staccato">Confronto</h2>
  <section id="confronto" aria-label="confronto telaio e solido">
    <p class="vuoto" id="confronto-vuoto">Telaio contro solido, per caso e grandezza: scarto, classe di concordanza e bias atteso. Corri il telaio (e il solido, se c'è), poi «confronta».</p>
    <label for="confronto-telaio">risultati del telaio</label>
    <input id="confronto-telaio" type="text" spellcheck="false" placeholder="corse/<run>/risultati.nova.risultati.json">
    <label for="confronto-solido">risultati del solido (vuoto = senza)</label>
    <input id="confronto-solido" type="text" spellcheck="false" placeholder="corse/<run>/risultati_solido.json">
    <label for="confronto-abaqus">CSV Abaqus (vuoto = senza)</label>
    <input id="confronto-abaqus" type="text" spellcheck="false" placeholder="tests/fixture/abaqus_esempio.csv">
    <label for="confronto-nodi">nodi in sommità (id separati da ;)</label>
    <input id="confronto-nodi" type="text" class="numero" spellcheck="false" placeholder="3; 4">
    <div id="confronto-casi" aria-label="caso del telaio → passo del solido"></div>
    <label class="riga"><input id="confronto-assi" type="checkbox"> il solido ha x e y scambiati</label>
    <details id="confronto-avanzato">
      <summary id="confronto-avanzato-titolo">avanzato: mappa_casi in JSON</summary>
      <textarea id="confronto-json" class="numero" rows="4" spellcheck="false" aria-label="mappa_casi in JSON"></textarea>
    </details>
    <div class="file-azioni"><button id="confronto-confronta" type="button" disabled>confronta</button></div>
    <p id="confronto-stato" class="numero"></p>
    <div id="confronto-scorri" hidden>
      <table id="confronto-tabella">
        <caption id="confronto-didascalia">telaio ↔ solido ↔ Abaqus</caption>
        <thead id="confronto-testa"></thead>
        <tbody id="confronto-corpo"></tbody>
      </table>
    </div>
    <ol id="confronto-note" aria-label="note della tabella" hidden></ol>
    <p id="confronto-provenienza" class="numero"></p>
    <p id="confronto-cartella" class="numero" hidden>export in <span id="confronto-percorso"></span> <button id="confronto-copia" type="button">copia</button></p>
  </section>
```

- [ ] **Step 2: i test** (in coda a `confronto.test.js`; DOM finto **copiato** da `corsa.test.js:137-183`, con in più `checked`, `open`, `focus`):

```js
// --- creaConfronto: il blocco «Confronto» del pannello (Task 2) --------------------------------
import { creaConfronto } from "../confronto.js";

// In più rispetto a `corsa.test.js`: `checked` (la casella degli assi), `dataset` (il caso di ogni
// riga), `querySelectorAll("input")` sul contenitore delle righe, `dispatch` che **restituisce** la
// promessa dei listener (il clic su «confronta» è asincrono e il test lo aspetta), e un
// `textContent` che si legge dai figli quando ci sono — come nel DOM vero, dove la cella della
// classe è «lontano» + un nodo di testo + un `<sup>`.
function elementoFinto(iniziale = {}) {
  const listeners = {};
  let testo = "";
  const el = {
    value: "", hidden: false, title: "", className: "", type: "", checked: false, open: false,
    disabled: false, _figli: [], _attrs: {}, dataset: {},
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, argomento) { return Promise.all((listeners[ev] ?? []).map((fn) => fn(argomento))); },
    setAttribute(nome, valore) { this._attrs[nome] = String(valore); },
    getAttribute(nome) { return this._attrs[nome] ?? null; },
    append(...figli) { this._figli.push(...figli); },
    replaceChildren(...figli) { this._figli = figli; },
    querySelectorAll(sel) { return sel === "input" ? this._figli.flatMap((f) => f._figli.filter((g) => g.nome === "input")) : []; },
  };
  Object.defineProperty(el, "textContent", {
    enumerable: true,
    get: () => testo + el._figli.map((f) => f.textContent).join(""),
    set(v) { testo = String(v); el._figli = []; },   // come nel DOM: scrivere il testo butta i figli
  });
  return Object.assign(el, iniziale);
}
globalThis.document = {
  createElement: (nome) => elementoFinto({ nome }),
  createTextNode: (t) => ({ nome: "#text", textContent: String(t), _figli: [] }),
};
globalThis.navigator = {};

function radiceConfronto() {
  const ids = ["vuoto", "telaio", "solido", "abaqus", "nodi", "casi", "assi", "avanzato", "avanzato-titolo", "json", "confronta",
               "stato", "scorri", "tabella", "didascalia", "testa", "corpo", "note", "provenienza", "cartella", "percorso", "copia"];
  const elementi = Object.fromEntries(ids.map((id) => [`#confronto-${id}`, elementoFinto({ id: `confronto-${id}` })]));
  for (const id of ["scorri", "note", "cartella"]) elementi[`#confronto-${id}`].hidden = true;
  elementi["#confronto-confronta"].disabled = true;
  elementi["#confronto-avanzato-titolo"].textContent = "avanzato: mappa_casi in JSON";
  return { radice: { querySelector: (sel) => elementi[sel] ?? null }, el: (sel) => elementi[`#confronto-${sel}`] };
}

function fetchFinta(risposte) {
  const spia = { rotte: [], corpi: [] };
  let i = 0;
  globalThis.fetch = async (rotta, opzioni) => {
    spia.rotte.push(rotta); spia.corpi.push(opzioni?.body ? JSON.parse(opzioni.body) : null);
    const r = risposte[Math.min(i++, risposte.length - 1)];
    if (r.cade) throw new TypeError("Failed to fetch");
    return { ok: r.stato < 400, status: r.stato, json: async () => r.dati };
  };
  return spia;
}

const MURO = { nodi: [{ id: 1, x: 0, z: 0 }, { id: 2, x: 2262, z: 0 }, { id: 3, x: 0, z: 1607.5 }, { id: 4, x: 2262, z: 1607.5 }] };
const telaioLavoro = () => ({ run_id: "t1", solido: false, cartella: "corse/t1", fin: { esito: "ok", risultati: { run: { casi: ["C1", "C2", "C3"] } } } });
const solidoLavoro = () => ({ run_id: "s1", solido: true, cartella: "corse/s1", fin: { esito: "ok" } });
const risposta = () => ({ run_id: "k1", cartella: "corse/k1", esito: "ok", file: {}, tabella: tabella() });

test("disegna: precompila i percorsi dalle corse, i nodi dal modello, una riga per caso; il bottone si accende col telaio", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: null, solido: null });
  assert.equal(el("confronta").disabled, true);
  assert.equal(el("telaio").value, "");
  assert.equal(el("nodi").value, "3; 4");
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  assert.equal(el("telaio").value, "corse/t1/risultati.nova.risultati.json");
  assert.equal(el("solido").value, "corse/s1/risultati_solido.json");
  assert.equal(el("confronta").disabled, false);
  const righe = el("casi")._figli;
  assert.equal(righe.length, 3);
  assert.equal(righe[0].textContent, "C1 → ");
  assert.equal(righe[0]._figli[0].value, "C1", "il passo del solido parte uguale al caso");
  assert.equal(el("json").value, JSON.stringify({ C1: "C1", C2: "C2", C3: "C3", nodi_sommita: [3, 4] }, null, 1));
  assert.equal(el("vuoto").hidden, false, "finché non c'è una tabella lo stato vuoto resta");
});

test("un campo toccato non si riscrive; una corsa nuova riscrive quello non toccato", () => {
  const { radice, el } = radiceConfronto();
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("telaio").value = "mio/telaio.json"; el("telaio").dispatch("input");
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: "corse/t2" }, solido: solidoLavoro() });
  assert.equal(el("telaio").value, "mio/telaio.json");
  assert.equal(el("solido").value, "corse/s1/risultati_solido.json");
  c.azzera();
  assert.equal(el("telaio").value, "");
  c.disegna({ modello: MURO, telaio: { ...telaioLavoro(), cartella: "corse/t3" }, solido: null });
  assert.equal(el("telaio").value, "corse/t3/risultati.nova.risultati.json", "azzera() toglie anche il «toccato»");
});

test("confronta: la POST porta i percorsi (vuoti → null) e la mappa dal form; la tabella, le note, il conteggio e la cartella", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("casi")._figli[0]._figli[0].value = "GRAVITA"; el("casi")._figli[0]._figli[0].dispatch("input");
  el("abaqus").value = "tests/fixture/abaqus_esempio.csv"; el("abaqus").dispatch("input");
  el("assi").checked = true; el("assi").dispatch("change");
  await el("confronta").dispatch("click");
  assert.deepEqual(spia.rotte, ["/api/confronto"]);
  assert.deepEqual(spia.corpi[0], { telaio: "corse/t1/risultati.nova.risultati.json", solido: null, abaqus: "tests/fixture/abaqus_esempio.csv",
                                    mappa_casi: { C1: "GRAVITA", C2: "C2", C3: "C3", nodi_sommita: [3, 4], assi: { x: "y", y: "x" } } });
  assert.deepEqual(errori, []);
  assert.equal(el("scorri").hidden, false);
  assert.equal(el("vuoto").hidden, true);
  assert.equal(el("corpo")._figli.length, 5);
  const prima = el("corpo")._figli[0];
  assert.equal(prima._figli[0].textContent, "massa", "la massa è la prima riga (story 57)");
  assert.equal(prima._figli[0].nome, "th", "la grandezza è l'intestazione di riga");
  assert.equal(el("corpo")._figli[1].className, "attenuata");
  assert.equal(prima.className, "");
  // le colonne Abaqus ci sono perché la tabella le porta (f1 ha un valore Abaqus)
  assert.equal(el("testa")._figli[0]._figli.length, 9);
  assert.equal(el("note").hidden, false);
  assert.equal(el("note")._figli.length, 3);
  assert.equal(el("note")._figli[1].textContent, RUMORE);
  assert.equal(el("stato").textContent, "5 righe · 1 non confrontabile · verifica del codice, non validazione");
  assert.ok(el("provenienza").textContent.startsWith("commit fa3b2e3 · run telaio 3fb8d0907967"), el("provenienza").textContent);
  assert.equal(el("cartella").hidden, false);
  assert.equal(el("percorso").textContent, "corse/k1");
});

test("senza Abaqus le colonne sono sei; la nota della riga sta nella cella della classe come «¹»", async () => {
  const { radice, el } = radiceConfronto();
  const r = risposta(); r.tabella.righe[4].abaqus = null; r.tabella.righe[4].classe_abaqus = "non_confrontabile";
  fetchFinta([{ stato: 200, dati: r }]);
  const c = creaConfronto(radice, { suErrore: () => {} });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  await el("confronta").dispatch("click");
  assert.equal(el("testa")._figli[0]._figli.length, 6);
  assert.deepEqual(el("testa")._figli[0]._figli.map((th) => th.textContent), ["grandezza", "caso", "telaio", "solido", "scarto", "classe"]);
  const celle = el("corpo")._figli[0]._figli;
  assert.equal(celle[5].textContent, "lontano ¹");
  assert.equal(celle[5]._figli.at(-1)?.nome, "sup", "il numero della nota è un `<sup>`, non un carattere nel testo");
  assert.equal(celle[0].textContent, "massa");
  assert.equal(celle[0].getAttribute("scope"), "row");
  assert.equal(celle[2].textContent, "0,7694 t", "l'unità sta accanto al valore del telaio, una volta per riga");
});

test("un JSON toccato comanda, e il titolo lo dice; un JSON rotto ferma la richiesta col messaggio", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("json").value = '{"C1": "GRAVITA", "nodi_sommita": [3]}'; el("json").dispatch("input");
  assert.equal(el("avanzato-titolo").textContent, "avanzato: mappa_casi in JSON (in uso)");
  el("nodi").value = "4"; el("nodi").dispatch("input");
  assert.equal(el("json").value, '{"C1": "GRAVITA", "nodi_sommita": [3]}', "il form non riscrive un JSON in uso");
  await el("confronta").dispatch("click");
  assert.deepEqual(spia.corpi[0].mappa_casi, { C1: "GRAVITA", nodi_sommita: [3] });
  el("json").value = '{"C1": '; el("json").dispatch("input");
  await el("confronta").dispatch("click");
  assert.equal(spia.rotte.length, 1, "nessuna richiesta con un JSON rotto");
  assert.match(errori.at(-1), /mappa_casi: JSON non valido/);
  c.azzera();
  assert.equal(el("avanzato-titolo").textContent, "avanzato: mappa_casi in JSON");
});

test("un 400 del server arriva in parole e la tabella di prima resta; la rete che cade pure", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() },
                           { stato: 400, dati: { esito: "errore", fase: "confronto", motivo: "mappa_casi nomina il passo «X», assente nel solido (passi validi: GRAVITA)" } },
                           { stato: 200, cade: true }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m) });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: solidoLavoro() });
  await el("confronta").dispatch("click");
  await el("confronta").dispatch("click");
  assert.equal(errori.at(-1), "mappa_casi nomina il passo «X», assente nel solido (passi validi: GRAVITA)");
  assert.equal(el("corpo")._figli.length, 5, "la tabella buona resta");
  await el("confronta").dispatch("click");
  assert.equal(errori.at(-1), "il server non risponde");
  assert.equal(spia.rotte.length, 3);
  assert.equal(el("confronta").disabled, false, "il bottone si riaccende dopo l'errore");
});

test("nodi non interi: messaggio, nessuna richiesta; «copia» scrive la cartella negli appunti e lo dice", async () => {
  const { radice, el } = radiceConfronto();
  const spia = fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [], scritto = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m), appunti: { writeText: async (t) => { scritto.push(t); } } });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  el("nodi").value = "3; quattro"; el("nodi").dispatch("input");
  await el("confronta").dispatch("click");
  assert.equal(spia.rotte.length, 0);
  assert.match(errori.at(-1), /nodi in sommità/);
  el("nodi").value = "3; 4"; el("nodi").dispatch("input");
  await el("confronta").dispatch("click");
  await el("copia").dispatch("click");
  assert.deepEqual(scritto, ["corse/k1"]);
  assert.equal(el("copia").textContent, "copiato");
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  assert.equal(el("copia").textContent, "copia", "al ridisegno il bottone torna «copia»");
});

test("senza appunti (http non sicuro) «copia» dice perché, senza sollevare", async () => {
  const { radice, el } = radiceConfronto();
  fetchFinta([{ stato: 200, dati: risposta() }]);
  const errori = [];
  const c = creaConfronto(radice, { suErrore: (m) => errori.push(m), appunti: null });
  c.disegna({ modello: MURO, telaio: telaioLavoro(), solido: null });
  await el("confronta").dispatch("click");
  await el("copia").dispatch("click");
  assert.equal(errori.at(-1), "gli appunti non sono disponibili: copia il percorso a mano");
});
```

- [ ] **Step 3: rosso.**
- [ ] **Step 4: il codice** — `creaConfronto` in coda a `confronto.js`:

```js
/** Il blocco «Confronto»: tre percorsi, la mappa dei casi (form o JSON), «confronta», la tabella.
 *  Il DOM è suo come in `creaCorsa` (`corsa.js:113`): `app.js` gli passa lo stato e ridisegna. */
export function creaConfronto(radice, { suErrore, appunti = (globalThis.navigator?.clipboard ?? null) }) {
  const q = (sel) => radice.querySelector(sel);
  const vuotoEl = q("#confronto-vuoto"), campoTelaio = q("#confronto-telaio"), campoSolido = q("#confronto-solido");
  const campoAbaqus = q("#confronto-abaqus"), campoNodi = q("#confronto-nodi"), casiEl = q("#confronto-casi");
  const assiEl = q("#confronto-assi"), titoloAvanzato = q("#confronto-avanzato-titolo"), jsonEl = q("#confronto-json");
  const bConfronta = q("#confronto-confronta"), statoEl = q("#confronto-stato"), scorriEl = q("#confronto-scorri");
  const testaEl = q("#confronto-testa"), corpoEl = q("#confronto-corpo"), noteEl = q("#confronto-note");
  const provenienzaEl = q("#confronto-provenienza"), cartellaEl = q("#confronto-cartella");
  const percorsoEl = q("#confronto-percorso"), bCopia = q("#confronto-copia");

  const TITOLO = "avanzato: mappa_casi in JSON";
  // «toccato» per campo: una corsa nuova riscrive solo i campi che l'utente non ha mai scritto.
  const toccato = { telaio: false, solido: false, nodi: false };
  let jsonInUso = false;       // il textarea ha ricevuto un `input`: da lì comanda lui
  let casiInForm = [];         // i casi delle righe caso → passo, per rifarle solo se cambiano
  let cartella = null;         // della tabella a schermo, per «copia»
  let occupato = false;

  const righeCasi = () => casiEl.querySelectorAll("input");
  const statoForm = () => ({
    casi: [...righeCasi()].map((i) => ({ caso: i.dataset.caso, passo: i.value })),
    nodi: campoNodi.value, assiScambiati: Boolean(assiEl.checked),
  });
  const mappaCorrente = () => (jsonInUso ? leggiMappaJson(jsonEl.value) : mappaDalForm(statoForm()));
  function specchiaJson() {
    if (jsonInUso) return;
    let testo = "";
    try { testo = JSON.stringify(mappaDalForm(statoForm()), null, 1); } catch { testo = ""; }   // nodi rotti: lo dirà «confronta»
    if (jsonEl.value !== testo) jsonEl.value = testo;
  }

  function rifaiCasi(casi) {
    if (casi.length === casiInForm.length && casi.every((c, k) => c === casiInForm[k])) return;
    casiInForm = casi;
    casiEl.replaceChildren(...casi.map((caso) => {
      const label = document.createElement("label");
      label.className = "riga";
      label.textContent = `${caso} → `;
      const campo = document.createElement("input");
      campo.type = "text"; campo.value = caso; campo.className = "numero";
      campo.dataset.caso = caso;
      campo.setAttribute("aria-label", `passo del solido per il caso ${caso}`);
      campo.addEventListener("input", specchiaJson);
      label.append(campo);
      return label;
    }));
  }

  function disegna({ modello: m, telaio, solido }) {
    if (!toccato.telaio) campoTelaio.value = percorsoRisultati(telaio, "telaio");
    if (!toccato.solido) campoSolido.value = percorsoRisultati(solido, "solido");
    if (!toccato.nodi) campoNodi.value = nodiInSommita(m).join("; ");
    rifaiCasi(casiCorsi(telaio));
    specchiaJson();
    bConfronta.disabled = occupato || campoTelaio.value.trim() === "";
    bCopia.textContent = "copia";
  }

  const th = (testo, scope = "col") => { const e = document.createElement("th"); e.textContent = testo; e.setAttribute("scope", scope); return e; };
  const td = (testo) => { const e = document.createElement("td"); e.textContent = testo; return e; };
  // I numeri delle note in apice, nella cella della classe: «lontano ¹», «non confrontabile ² ³».
  // Un `<sup>` dopo un nodo di testo, non un carattere in più nel testo: lo screen reader legge
  // il numero come apice e chi guarda lo distingue dalla parola.
  const APICI = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const apice = (n) => String(n).split("").map((d) => APICI[Number(d)]).join("");
  const conNote = (cella, note) => {
    if (!note.length) return cella;
    const sup = document.createElement("sup");
    sup.textContent = note.map(apice).join(" ");
    cella.append(document.createTextNode(" "), sup);
    return cella;
  };

  function disegnaTabella(tabella) {
    const abq = conAbaqus(tabella);
    const intestazioni = abq ? ["grandezza", "caso", "telaio", "solido", "Abaqus", "scarto solido", "scarto Abaqus", "classe solido", "classe Abaqus"]
                             : ["grandezza", "caso", "telaio", "solido", "scarto", "classe"];
    const tr = document.createElement("tr");
    tr.append(...intestazioni.map((t) => th(t)));
    testaEl.replaceChildren(tr);
    corpoEl.replaceChildren(...righeDaMostrare(tabella).map((r) => {
      const riga = document.createElement("tr");
      riga.className = r.attenuata ? "attenuata" : "";
      const celle = [th(r.grandezza, "row"), td(r.caso), td(`${r.telaio} ${r.unita}`), td(r.solido)];
      if (abq) celle.push(td(r.abaqus), td(r.scartoSolido), td(r.scartoAbaqus), td(r.classeSolido), td(r.classeAbaqus));
      else celle.push(td(r.scartoSolido), td(r.classeSolido));
      conNote(celle.at(-1), r.note);
      riga.append(...celle);
      return riga;
    }));
    const { note } = noteDellaTabella(tabella);
    noteEl.replaceChildren(...note.map(({ testo }) => { const li = document.createElement("li"); li.textContent = testo; return li; }));
    noteEl.hidden = note.length === 0;
    statoEl.textContent = testoConteggio(tabella);
    provenienzaEl.textContent = testoProvenienza(tabella.provenienza);
    scorriEl.hidden = false; vuotoEl.hidden = true;
  }

  async function confronta() {
    if (occupato) return;
    let mappa_casi;
    try { mappa_casi = mappaCorrente(); } catch (e) { suErrore(e.message); return; }
    const telaio = campoTelaio.value.trim();
    if (telaio === "") { suErrore("scrivi il percorso dei risultati del telaio"); return; }
    const vuotoANull = (campo) => (campo.value.trim() === "" ? null : campo.value.trim());
    occupato = true; bConfronta.disabled = true;
    const riposo = bConfronta.textContent; bConfronta.textContent = "confronto…";
    try {
      const r = await chiediJson("/api/confronto", { telaio, solido: vuotoANull(campoSolido), abaqus: vuotoANull(campoAbaqus), mappa_casi });
      cartella = r.cartella ?? null;
      disegnaTabella(r.tabella ?? { righe: [], provenienza: null, avvertenza: "" });
      percorsoEl.textContent = cartella ?? "";
      cartellaEl.hidden = cartella === null;
      suErrore(null);
    } catch (e) {
      suErrore(e.message);
    } finally {
      occupato = false; bConfronta.disabled = false; bConfronta.textContent = riposo;
    }
  }

  async function copia() {
    if (cartella === null) return;
    if (!appunti?.writeText) { suErrore("gli appunti non sono disponibili: copia il percorso a mano"); return; }
    try { await appunti.writeText(cartella); bCopia.textContent = "copiato"; }
    catch { suErrore("gli appunti non sono disponibili: copia il percorso a mano"); }
  }

  function azzera() {
    for (const k of Object.keys(toccato)) toccato[k] = false;
    campoTelaio.value = ""; campoSolido.value = ""; campoAbaqus.value = ""; campoNodi.value = "";
    jsonInUso = false; jsonEl.value = ""; titoloAvanzato.textContent = TITOLO;
    casiInForm = []; casiEl.replaceChildren();
    cartella = null; percorsoEl.textContent = "";
    testaEl.replaceChildren(); corpoEl.replaceChildren(); noteEl.replaceChildren();
    statoEl.textContent = ""; provenienzaEl.textContent = "";
    scorriEl.hidden = true; noteEl.hidden = true; cartellaEl.hidden = true; vuotoEl.hidden = false;
    bConfronta.disabled = true;
  }

  campoTelaio.addEventListener("input", () => { toccato.telaio = true; bConfronta.disabled = occupato || campoTelaio.value.trim() === ""; });
  campoSolido.addEventListener("input", () => { toccato.solido = true; });
  campoNodi.addEventListener("input", () => { toccato.nodi = true; specchiaJson(); });
  assiEl.addEventListener("change", specchiaJson);
  jsonEl.addEventListener("input", () => { jsonInUso = true; titoloAvanzato.textContent = `${TITOLO} (in uso)`; });
  bConfronta.addEventListener("click", () => confronta());
  bCopia.addEventListener("click", () => copia());

  return { disegna, azzera };
}
```

- [ ] **Step 5: lo stile** in coda a `stile.css`:

```css
/* La scheda «Confronto»: la tabella scorre nel suo riquadro, mai la pagina (il pannello è al più
   20 rem, `grid-template-columns` sopra). Nessun rosso e nessun verde: le classi sono parole, e
   una riga non confrontabile si attenua **e** lo dice (WCAG 1.4.1: il colore non è il canale). */
#confronto label { margin-top: var(--passo); }
#confronto label.riga { display: flex; align-items: baseline; gap: 6px; font-size: 11px; }
#confronto label.riga input[type="text"] { flex: 1; min-width: 0; }
#confronto-casi { display: grid; gap: 2px; margin-top: var(--passo); }
#confronto-avanzato { margin-top: var(--passo); font-size: 11px; }
#confronto-avanzato summary { cursor: pointer; }
#confronto-avanzato summary:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
#confronto-json { width: 100%; font-size: 10px; margin-top: 4px; resize: vertical; }
#confronto-stato, #confronto-provenienza { margin: var(--passo) 0 0; font-size: 11px; overflow-wrap: anywhere; }
#confronto-scorri { overflow-x: auto; margin-top: var(--passo); max-width: 100%; }
#confronto-tabella { border-collapse: collapse; font-size: 11px; white-space: nowrap; }
#confronto-tabella caption { text-align: left; color: var(--testo-tenue); font-size: 10px; padding-bottom: 4px; }
#confronto-tabella th, #confronto-tabella td { padding: 2px 6px; text-align: right; border-bottom: 1px solid var(--tratto); }
#confronto-tabella th[scope="row"], #confronto-tabella td:nth-child(2) { text-align: left; font-weight: 400; }
#confronto-tabella thead th { color: var(--testo-tenue); font-weight: 600; }
#confronto-tabella td, #confronto-tabella th[scope="row"] { font-family: var(--mono); font-variant-numeric: tabular-nums; }
#confronto-tabella tr.attenuata { color: var(--testo-tenue); }
#confronto-note { margin: var(--passo) 0 0; padding-left: 1.2em; font-size: 10px; color: var(--testo-tenue); }
#confronto-cartella { margin: var(--passo) 0 0; font-size: 11px; overflow-wrap: anywhere; }
#confronto-cartella button { font: inherit; cursor: pointer; padding: 0 6px; margin-left: 4px; }
#confronto-cartella button:focus-visible, #confronto-confronta:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
```

- [ ] **Step 6: verde** (tutti i test JS); **Step 7: Commit** `feat(interfaccia): la sezione Confronto nel pannello — percorsi, mappa dei casi da form o JSON, tabella con note e conteggio, cartella con copia`.

## Ingressi degeneri

- `disegna({modello: null, telaio: null, solido: null})` → campi vuoti, bottone spento, nessuna eccezione.
- telaio con `cartella` null (corsa riagganciata senza cartella) → campo telaio vuoto, bottone spento.
- il telaio cambia ma i casi sono gli stessi → le righe caso → passo **non** si rifanno (i passi scritti restano).
- `#confronto-json` vuoto e in uso → `mappa_casi: {}` (il server accetta: nessun caso mappato, solo massa/modi).
- risposta 200 senza `tabella` → tabella vuota, «nessuna riga · », nessuna eccezione.
- risposta con `righe: []` → conteggio «nessuna riga · <avvertenza>», tabella con la sola intestazione, note nascoste.
- «copia» senza `navigator.clipboard` (http su un host non `localhost`) → messaggio, non solleva.
- clic su «confronta» mentre uno gira → ignorato (`occupato`).
- `azzera()` due volte di fila → idempotente.

---

### Task 3: la cucitura in `app.js`, il fumo

**Files:**
- Modify: `static/app.js` (`ultimoTelaio`/`ultimoSolido`, `creaConfronto`, `ridisegna`, `suApertura`, importa)
- Modify: `tests/fumo/fumo.mjs` (copione `confronto`)
- Modify: `tests/test_fumo_chrome.py` (un test)

**Interfaces:** consuma Task 2.

- [ ] **Step 1: `app.js`**:
  - `import { creaConfronto } from "./confronto.js";` (accanto a `:25`).
  - Dopo `let motoRidotto = false;` (`:72`): `let ultimoTelaio = null, ultimoSolido = null;` con il commento: «le due ultime corse per la scheda Confronto: `corsa.js` ne tiene una sola (`:124`) e il solido sovrascrive il telaio».
  - In `suEsito` (`:320`), **prima** del `return` sul `null`: no — dopo `if (esito === null) …`: `if (esito.solido) ultimoSolido = esito; else ultimoTelaio = esito;` (una corsa rifiutata o in errore è comunque «l'ultima»: `percorsoRisultati` la scarta se non ha cartella, e `casiCorsi` dà `[]`).
  - `const confronto = creaConfronto(document, { suErrore: (msg) => dì(msg) });` dopo `creaEsito` (`:337`).
  - In `ridisegna`, dopo `esito.disegna(...)` (`:810`): `confronto.disegna({ modello: m, telaio: ultimoTelaio, solido: ultimoSolido });`.
  - In `suApertura` (`app.js:269-270`, subito dopo `corsa.azzera(); risultati = null;`) e in `suImportazione` (`:294-295`, stessa coppia): `ultimoTelaio = null; confronto.azzera();` — il solido resta (gira su un `.inp` del disco, `corsa.js:192-193`).
- [ ] **Step 2: il fumo** — copione in `fumo.mjs` (dopo `pushover`):

```js
  // La scheda Confronto sul MURO 1: telaio corso qui, niente solido, il CSV Abaqus d'esempio.
  // La tabella arriva, la massa è la prima riga, le note e il conteggio ci sono, la pagina non
  // scorre in orizzontale e il riquadro della tabella sta nel pannello.
  async confronto() {
    await apriECorri(arg.fixture);
    const telaio = await ev(`document.getElementById("confronto-telaio").value`);
    const nodi = await ev(`document.getElementById("confronto-nodi").value`);
    const casi = await ev(`[...document.querySelectorAll("#confronto-casi input")].map((i) => i.dataset.caso + "→" + i.value)`);
    await ev(`(() => { const c = document.getElementById("confronto-abaqus"); c.value = ${JSON.stringify(arg.csv)}; c.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
    // il caso C1 appaiato al passo «GRAVITA» del CSV: la riga reazione_z C1 prende il valore Abaqus
    await ev(`(() => { const c = document.querySelector('#confronto-casi input[data-caso="C1"]'); c.value = "GRAVITA"; c.dispatchEvent(new Event("input", { bubbles: true })); return true; })()`);
    const json = await ev(`document.getElementById("confronto-json").value`);
    await ev(`(() => { document.getElementById("confronto-confronta").click(); return true; })()`);
    const righe = await finche(`document.querySelectorAll("#confronto-corpo tr").length`, 20000, 250);
    const prima = await ev(`document.querySelector("#confronto-corpo tr th").textContent`);
    const colonne = await ev(`document.querySelectorAll("#confronto-testa th").length`);
    const stato = await ev(`document.getElementById("confronto-stato").textContent`);
    const note = await ev(`document.querySelectorAll("#confronto-note li").length`);
    const provenienza = await ev(`document.getElementById("confronto-provenienza").textContent`);
    const percorso = await ev(`document.getElementById("confronto-percorso").textContent`);
    const abaqusC1 = await ev(`(() => { const r = [...document.querySelectorAll("#confronto-corpo tr")].find((t) => t.children[0].textContent === "reazione_z" && t.children[1].textContent === "C1"); return r ? r.children[4].textContent : null; })()`);
    const scorrePagina = await ev(`document.documentElement.scrollWidth > window.innerWidth`);
    const dentro = await staDentro("#confronto-scorri", "#pannello");
    const rossi = await ev(`[...document.querySelectorAll("#confronto *")].filter((e) => getComputedStyle(e).color === "rgb(184, 50, 30)").length`);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { telaio, nodi, casi, json, righe, prima, colonne, stato, note, provenienza, percorso, abaqusC1, scorrePagina, dentro, rossi, messaggio };
  },
```

  e il test in `test_fumo_chrome.py` (dopo quello della pushover):

```python
def test_muro_1_la_scheda_confronto_mostra_la_tabella_con_la_massa_prima(chrome_e_server, binario_opensees):
    """Telaio corso dalla UI, nessun solido, il CSV Abaqus d'esempio: la tabella arriva con la massa
    in testa (story 57), le note a piè e il conteggio con l'avvertenza (story 61); il pannello non
    si allarga e la pagina non scorre in orizzontale."""
    porta, cdp = chrome_e_server
    r = copione("confronto", porta, cdp, fixture=str(FIXTURE / "muro_1.nova.json"), csv=str(FIXTURE / "abaqus_esempio.csv"))
    assert r["ok"], r
    assert r["errori"] == [], r["errori"]
    t = r["trovato"]
    assert t["telaio"].endswith("/risultati.nova.risultati.json"), t["telaio"]
    assert t["nodi"] == "3; 4", t["nodi"]
    assert t["casi"] == ["C1→C1", "C2→C2", "C3→C3"], t["casi"]
    assert '"C1": "GRAVITA"' in t["json"], t["json"]
    assert t["righe"] >= 1 and t["prima"] == "massa", (t["righe"], t["prima"])
    assert t["colonne"] == 9, "col CSV Abaqus le colonne sono nove"
    assert t["abaqusC1"] == "4 250", t["abaqusC1"]   # `conciso`: sopra cento niente decimali
    assert t["stato"].endswith("· verifica del codice, non validazione"), t["stato"]
    assert t["note"] >= 1, "la massa del MURO 1 ha una ragione (C1 è una combinazione): almeno una nota"
    assert t["provenienza"].startswith("commit "), t["provenienza"]
    assert t["percorso"] != "", "la cartella degli export si stampa"
    assert t["scorrePagina"] is False, "la pagina non deve scorrere in orizzontale"
    assert t["dentro"] is True, "il riquadro della tabella sta nel pannello"
    assert t["rossi"] == 0, "nessun rosso nella scheda: non è un pass/fail"
    assert t["messaggio"] == "", t["messaggio"]
```

- [ ] **Step 3: tutti i test** (JS, pytest intero, fumo 20). **Step 4: Commit** `feat(interfaccia): la scheda Confronto cucita in app.js — ultime corse del telaio e del solido, fumo sul MURO 1 col CSV Abaqus`.

## Ingressi degeneri

- «apri» un altro modello → `ultimoTelaio = null`, sezione azzerata, `ultimoSolido` resta e il campo del solido si ricompila al ridisegno.
- corsa del telaio in errore (`fin.esito === "errore"`) → `ultimoTelaio` è quella, campo telaio con la sua cartella se c'è (il server dirà «illeggibile»), bottone acceso: l'errore arriva in parole dal 400.
- corsa riagganciata (409 → `cartella` null finché la GET non la porta) → campo telaio vuoto finché non finisce.
- il fumo senza `binario_opensees` → salta col motivo, come gli altri.

---

### Task 4: prova a mano su Chrome vero, review di ramo, Esito (controller)

- [ ] Server `--porta 8823`; MURO 1 aperto e corso; «corri il solido» con `/Users/mario/GitHub/NOVA/lab_telaio_v2/wall_model.inp` (deck vero, ≈ 1 min); nella sezione: C1 → `GRAVITA`, C2 → `SPINTA_ORIZZONTALE`, C3 → `CARICO_TOP`, «x e y scambiati» spuntato, «confronta» → la tabella deve dire **massa 0,7694 t | 0,5551 t | 38,6 % | lontano** come `docs/caso-studio/confronto-2026-09-05.md:38`; `confronto.csv` nella cartella stampata uguale (a meno di `hash_modello`/data) a `docs/caso-studio/confronto.csv`.
- [ ] A 1280 px e a 1920 px: la tabella scorre nel suo riquadro, la pagina no; le note leggibili; «copia» funziona su `127.0.0.1` (contesto sicuro).
- [ ] Review di ramo a cinque (`security-reviewer`, `code-reviewer`, `test-writer`, `craft-reviewer`, `spec-reviewer`), un fix di ramo, re-review; mutanti; Esito in coda a questo piano; PR.

## Ingressi degeneri

- nessun ingresso esterno (task del controller).

## Mutanti da provare a fine ramo (con controllo nullo)

1. `nodiInSommita`: `>=` → `>` (la tolleranza sparisce: i due nodi a 1607,5 restano, ma 100/99,5 no) → deve morire in `confronto.test.js`.
2. `noteDellaTabella`: dedup tolto (ogni ragione uguale una nota nuova) → muore («3 note» con due bias uguali).
3. `righeDaMostrare`: `attenuata` con `||` invece di `&&` → muore (f1 con Abaqus concorde diventerebbe attenuata).
4. `testoConteggio`: conta `classe_solido` sola invece di `nonConfrontabile` → muore (la riga 4 con Abaqus).
5. `creaConfronto`: `toccato.telaio = true` tolto → muore («un campo toccato non si riscrive»).
6. `creaConfronto`: `jsonInUso` mai messo a `true` → muore («un JSON toccato comanda»).
7. `creaConfronto`: `vuotoANull` che manda `""` invece di `null` → muore (`corpi[0].solido === null`).
8. `app.js`: `ultimoSolido = esito` anche per il telaio → muore nel fumo? **No** (il fumo non corre il solido): controllo nullo dichiarato — si prova a mano nel Task 4 (campo del solido che resta vuoto dopo una corsa del telaio).
