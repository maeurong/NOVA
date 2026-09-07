# NOVA T5 — giornata 11a: file, ispettore, vincoli, asta fra due nodi

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** aprire il `muro_1.nova.json` vero, ispezionarlo, cambiargli un vincolo, risalvarlo e ritrovare la stessa impronta — e chiudere una maglia scegliendo due nodi invece di indovinare lunghezza e direzione.

**Architecture:** tre moduli puri nuovi (`recenti.js`, `vincoli.js`, e due riduttori in `comandi.js`), un modulo DOM per l'area file, e l'ispettore che esce da `app.js` in un file suo perché con i vincoli raddoppia. Lo stato di `app.js` resta minimo, ma il ghost diventa un **modo** con due forme — estrusione e asta — perché i due gesti hanno regole opposte sulla selezione.

**Tech Stack:** moduli ES nativi, `node --test` per i moduli puri, `pytest` come comando unico, il server FastAPI di T1 già in piedi.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 23 (vincoli), 65-67 (file), più il gesto dell'asta fra due nodi deciso il 07/09/2026 (`docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md`, §«Deciso a fine giornata 10»).

**Ramo:** `feat/interfaccia-11a`, **impilato su `feat/interfaccia`** (non su `main`, che non ha ancora la giornata 10). PR verso `feat/interfaccia`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti e messaggi di commit. Gli identificatori tecnici restano invariati.
- **Notazione numerica italiana**: la virgola separa i decimali, sempre.
- **Unità `mm-N-MPa-t-s`**, dichiarate in un punto e su ogni numero.
- **Palette «colonna tensegrale»**: fondo `#dcdad5`, inchiostro `#141414`, **un solo rosso** `#b8321e` — e vuol dire una cosa sola: attenzione. Mai «cream palette».
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.**
- **WCAG AA**; nessuna informazione sul solo colore; il fuoco sempre visibile.
- **Zero sovrapposizioni, zero testo tagliato**, verificato a 1280 e 1920 px.
- **Backend invariato**: nessun file sotto `nova/` cambia. Le rotte usate esistono già.
- Comando dei test:
  `/Users/mario/GitHub/NOVA-wt/interfaccia-11a/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-11a/tests -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-11a`
  `pytest -q` **non stampa la riga di riepilogo**: vale l'exit code, e il conteggio si ricava con `tr -cd '.sFEx' | wc -c`.
- Punto di partenza: **673 test `pytest`** (3 saltati, per `lab_telaio_v2/` assente in questo worktree), **70 `node --test`**.

## Quel che il backend dà già, e non va reinventato

- `POST /api/modello/apri {percorso}` → `{modello, impronta}`; **404** se il file non esiste, **400** con `{motivo}` se il JSON o il modello sono rifiutati (`nova/server.py:251-261`).
- `POST /api/modello/salva {percorso, modello}` → `{ok, impronta}`; **400** se il modello è rifiutato, **500** su errore di scrittura (`nova/server.py:262-276`).
- `nova/modello.py:carica` nomina **il campo sbagliato**: solleva `modello rifiutato — nodi.0.pinguino: campo non previsto`, con il percorso completo. La story 67 è già soddisfatta lato dati: alla UI resta mostrarla leggibile.
- `nova/modello.py:396` — `MIGRAZIONI` è **vuoto**, «vuoto finché lo schema è 1». La story 66 (aprire un modello di uno schema precedente) **non è esercitabile**: non esiste uno schema precedente. Quel che si prova è il rifiuto in avanti: `schema_version: 2` → «non supportata: questa NOVA legge fino a 1».
- `nova/modello.py:51-64` — `Vincolo` sono **sei booleani** (`ux, uy, uz, rx, ry, rz`), con `gradi()` che li rende nell'ordine.

## Due limiti da dichiarare, non da scoprire in browser

**Un telaio disegnato oggi non si può salvare.** `nova/modello.py:102` vuole `Asta.sezione: int` obbligatoria, e le aste nate dall'estrusione hanno `sezione: null` finché il catalogo delle sezioni non esiste (giornata 11b). `/api/modello/salva` rifiuta con `aste.0.sezione: campo obbligatorio`. **È atteso**: la 11a apre, ispeziona e risalva il **MURO 1 vero**, che le sezioni ce l'ha. Il messaggio dev'essere comprensibile, non nascosto.

**L'impronta non si ricalcola in JS.** Duplicare il canonico di `nova/modello.py:impronta` in JavaScript sarebbe una seconda verità che diverge. Si tiene invece l'impronta **che il server ha restituito** all'ultima apertura o salvataggio, e un flag `modificato` che diventa vero al primo comando riuscito. L'area file mostra l'impronta corta e, se il modello è cambiato, la parola «modificato».

## Struttura dei file

| file | responsabilità | puro |
|---|---|---|
| `static/recenti.js` | elenco dei percorsi aperti di recente: aggiunta, deduplica, tetto | sì |
| `static/vincoli.js` | le tre preimpostazioni e il riconoscimento di quale corrisponde | sì |
| `static/comandi.js` | **+2 riduttori**: `collega` (asta fra due nodi), `impostaVincolo` | sì |
| `static/tastiera.js` | **+ modificatori** e quattro voci nuove (`apri`, `salva`, `asta`, `vincolo`) | sì |
| `static/file.js` | area file: campo percorso, apri, salva, recenti, impronta | no |
| `static/pannello.js` | l'ispettore, estratto da `app.js`, con l'editor del vincolo | no |
| `static/app.js` | cucitura: i due modi, le guardie, il collegamento coi moduli nuovi | no |
| `static/index.html` | `<section id="file">` in cima alla colonna sinistra | — |
| `static/stile.css` | stile del campo percorso, dei recenti, della griglia dei sei gradi | — |

---

### Task 1: `recenti.js` — l'elenco dei percorsi

**Files:**
- Create: `static/recenti.js`
- Create: `static/test/recenti.test.js`

**Interfaces:**
- Consumes: niente.
- Produces: `TETTO` (numero), `aggiungi(elenco, percorso) → string[]`, `leggi(deposito) → string[]`, `scrivi(deposito, elenco) → void`.

`leggi`/`scrivi` prendono il deposito come **argomento** (`window.localStorage` in produzione, un oggetto finto nel test): è l'unico modo di provarli senza un browser, ed è lo stesso schema che `spazio.test.js` usa per `document`.

**Ingressi degeneri:**
- percorso vuoto o di soli spazi → l'elenco non cambia
- percorso già presente → risale in cima, **non** si duplica
- più di `TETTO` percorsi → i più vecchi cadono, l'ordine dei restanti tiene
- deposito che **solleva** in lettura o scrittura (finestra privata, dati del sito bloccati) → `leggi` torna `[]`, `scrivi` non solleva: i recenti sono una comodità, non possono rompere l'apertura di un file
- deposito che restituisce JSON malformato, o un JSON che non è un array di stringhe → `[]`

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `static/test/recenti.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { TETTO, aggiungi, leggi, scrivi } from "../recenti.js";

const deposito = (iniziale = {}) => {
  const dati = { ...iniziale };
  return {
    getItem: (k) => (k in dati ? dati[k] : null),
    setItem: (k, v) => { dati[k] = String(v); },
    _dati: dati,
  };
};

test("un percorso nuovo va in cima", () => {
  assert.deepEqual(aggiungi(["/b"], "/a"), ["/a", "/b"]);
});

test("un percorso già presente risale invece di duplicarsi", () => {
  assert.deepEqual(aggiungi(["/a", "/b", "/c"], "/c"), ["/c", "/a", "/b"]);
});

test("un percorso vuoto o di soli spazi non entra", () => {
  assert.deepEqual(aggiungi(["/a"], ""), ["/a"]);
  assert.deepEqual(aggiungi(["/a"], "   "), ["/a"]);
});

test("oltre il tetto cadono i più vecchi, in ordine", () => {
  const molti = Array.from({ length: TETTO }, (_, i) => `/f${i}`);
  const dopo = aggiungi(molti, "/nuovo");
  assert.equal(dopo.length, TETTO);
  assert.equal(dopo[0], "/nuovo");
  assert.equal(dopo.at(-1), `/f${TETTO - 2}`, "l'ultimo di prima è caduto");
});

test("legge quel che è stato scritto", () => {
  const d = deposito();
  scrivi(d, ["/a", "/b"]);
  assert.deepEqual(leggi(d), ["/a", "/b"]);
});

test("un deposito che solleva non rompe niente", () => {
  const rotto = {
    getItem() { throw new Error("dati del sito bloccati"); },
    setItem() { throw new Error("dati del sito bloccati"); },
  };
  assert.deepEqual(leggi(rotto), []);
  assert.doesNotThrow(() => scrivi(rotto, ["/a"]));
});

test("contenuto malformato nel deposito vale come elenco vuoto", () => {
  assert.deepEqual(leggi(deposito({ "nova.recenti": "{" })), []);
  assert.deepEqual(leggi(deposito({ "nova.recenti": '{"a":1}' })), []);
  assert.deepEqual(leggi(deposito({ "nova.recenti": '["/a", 7]' })), []);
});
```

- [ ] **Step 2: Fai girare il test e verifica che fallisca**

Run: `/Users/mario/GitHub/NOVA-wt/interfaccia-11a/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-11a/tests/test_js.py -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-11a`
Expected: FAIL — `Cannot find module '../recenti.js'`.

- [ ] **Step 3: Scrivi `static/recenti.js`**

```js
// I percorsi aperti di recente. Vivono nel deposito del browser, che è una comodità:
// se non c'è o solleva, il programma apre i file lo stesso — non si rompe per una lista.
// Il deposito arriva come argomento e non da `window`, così il test lo può fingere.

export const TETTO = 8;
const CHIAVE = "nova.recenti";

/** Il percorso in cima, senza duplicati, entro il tetto. Vuoto o spazi: non entra. */
export function aggiungi(elenco, percorso) {
  const p = typeof percorso === "string" ? percorso.trim() : "";
  if (p === "") return elenco;
  return [p, ...elenco.filter((x) => x !== p)].slice(0, TETTO);
}

export function leggi(deposito) {
  try {
    const grezzo = deposito.getItem(CHIAVE);
    if (!grezzo) return [];
    const dati = JSON.parse(grezzo);
    // un JSON valido ma della forma sbagliata è come nessun dato: non si indovina
    if (!Array.isArray(dati) || !dati.every((x) => typeof x === "string")) return [];
    return dati.slice(0, TETTO);
  } catch {
    return [];
  }
}

export function scrivi(deposito, elenco) {
  try {
    deposito.setItem(CHIAVE, JSON.stringify(elenco.slice(0, TETTO)));
  } catch {
    // finestra privata, dati del sito bloccati: si perde la lista, non il lavoro
  }
}
```

- [ ] **Step 4: Fai girare il test e verifica che passi**

Run: lo stesso comando dello Step 2.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add static/recenti.js static/test/recenti.test.js
git commit -m "feat(interfaccia): elenco dei modelli aperti di recente"
```

---

### Task 2: `vincoli.js` — le tre preimpostazioni

**Files:**
- Create: `static/vincoli.js`
- Create: `static/test/vincoli.test.js`

**Interfaces:**
- Consumes: niente.
- Produces: `GRADI` (l'ordine dei sei nomi), `PREIMPOSTAZIONI` (oggetto nome → vincolo), `vincoloVuoto() → Vincolo`, `nomePreimpostazione(vincolo) → string | null`, `descrizione(vincolo) → string`.

**Le tre preimpostazioni, dichiarate qui perché la spec non le definisce** (story 23 le nomina e basta):

| nome | bloccati | liberi |
|---|---|---|
| `incastro` | tutti e sei | — |
| `cerniera` | `ux`, `uy`, `uz` | le tre rotazioni |
| `carrello` | `uz`, `uy` | `ux` e le tre rotazioni |

`carrello` blocca anche `uy` — fuori piano — e la ragione va nel commento: il modello è **spaziale**, e un telaio piano senza ritegno fuori piano ha un moto rigido che il Check Model rifiuta (`moti_rigidi`). Un carrello che lascia `uy` libero sarebbe corretto sulla carta e inutilizzabile qui.

**Ingressi degeneri:**
- vincolo `null` (nodo libero) → `nomePreimpostazione` torna `null`, `descrizione` dice «libero», nessuna eccezione
- vincolo con tutti e sei falsi → è **libero**, non una preimpostazione: `nomePreimpostazione` torna `null`
- vincolo che non corrisponde a nessuna delle tre → `null`, e `descrizione` elenca i gradi bloccati
- un oggetto con chiavi in più o in meno → trattato per le sei chiavi note, le altre ignorate, nessuna eccezione

- [ ] **Step 1: Scrivi il test che fallisce**

Crea `static/test/vincoli.test.js`:

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto, nomePreimpostazione, descrizione } from "../vincoli.js";

test("i sei gradi sono nell'ordine di nova/modello.py", () => {
  assert.deepEqual(GRADI, ["ux", "uy", "uz", "rx", "ry", "rz"]);
});

test("l'incastro blocca tutto", () => {
  assert.deepEqual(PREIMPOSTAZIONI.incastro, { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
});

test("la cerniera lascia libere le rotazioni", () => {
  const c = PREIMPOSTAZIONI.cerniera;
  assert.deepEqual([c.ux, c.uy, c.uz], [true, true, true]);
  assert.deepEqual([c.rx, c.ry, c.rz], [false, false, false]);
});

test("il carrello lascia libero ux e trattiene il fuori piano", () => {
  const c = PREIMPOSTAZIONI.carrello;
  assert.equal(c.ux, false, "il carrello scorre lungo x");
  assert.equal(c.uy, true, "fuori piano trattenuto: il modello e' spaziale");
  assert.equal(c.uz, true);
});

test("ogni preimpostazione si riconosce da sé", () => {
  for (const [nome, v] of Object.entries(PREIMPOSTAZIONI)) {
    assert.equal(nomePreimpostazione(v), nome);
  }
});

test("nessun vincolo, o tutto libero, non è una preimpostazione", () => {
  assert.equal(nomePreimpostazione(null), null);
  assert.equal(nomePreimpostazione(undefined), null);
  assert.equal(nomePreimpostazione(vincoloVuoto()), null);
});

test("un vincolo che non corrisponde a nessuna torna null", () => {
  assert.equal(nomePreimpostazione({ ...vincoloVuoto(), rx: true }), null);
});

test("chiavi in più non confondono il riconoscimento", () => {
  assert.equal(nomePreimpostazione({ ...PREIMPOSTAZIONI.incastro, pinguino: true }), "incastro");
});

test("un vincolo scritto a mano con 1 e 0 si riconosce lo stesso", () => {
  assert.equal(nomePreimpostazione(Object.fromEntries(GRADI.map((g) => [g, 1]))), "incastro");
  assert.equal(nomePreimpostazione(Object.fromEntries(GRADI.map((g) => [g, 0]))), null);
});

test("le preimpostazioni sono congelate: un modulo non le rompe per gli altri", () => {
  // Una costante condivisa modificabile è un difetto che viaggia: un `incastro` senza `ux`
  // smetterebbe di essere riconosciuto ovunque, non solo dove è stato toccato.
  const prima = { ...PREIMPOSTAZIONI.incastro };
  assert.throws(() => { PREIMPOSTAZIONI.incastro.ux = false; }, TypeError);
  assert.deepEqual(PREIMPOSTAZIONI.incastro, prima);
});

test("la descrizione elenca i gradi nell'ordine di GRADI, non delle chiavi", () => {
  assert.equal(descrizione({ rz: true, ux: true, uy: false, uz: false, rx: false, ry: false }),
               "bloccati: ux, rz");
});

test("la descrizione dice il nome quando c'è, i gradi quando non c'è", () => {
  assert.equal(descrizione(PREIMPOSTAZIONI.incastro), "incastro");
  assert.equal(descrizione(null), "libero");
  assert.equal(descrizione(vincoloVuoto()), "libero");
  assert.equal(descrizione({ ...vincoloVuoto(), ux: true, rz: true }), "bloccati: ux, rz");
});
```

- [ ] **Step 2: Fai girare il test e verifica che fallisca**

Run: il comando dei test.
Expected: FAIL — `Cannot find module '../vincoli.js'`.

- [ ] **Step 3: Scrivi `static/vincoli.js`**

```js
// Il vincolo sono sei booleani, come in `nova/modello.py:51`. Le tre preimpostazioni
// della story 23 la spec le nomina e non le definisce: sono definite qui, e questo è
// l'unico posto dove esistono.

export const GRADI = ["ux", "uy", "uz", "rx", "ry", "rz"];

export const vincoloVuoto = () => Object.fromEntries(GRADI.map((g) => [g, false]));

// Congelate: sono una costante condivisa fra i moduli, e una costante condivisa che si
// può modificare è un difetto che viaggia. Un `incastro` a cui qualcuno togliesse `ux`
// smetterebbe di essere riconosciuto da `nomePreimpostazione` ovunque, non solo lì.
export const PREIMPOSTAZIONI = Object.freeze({
  incastro: Object.freeze({ ...vincoloVuoto(), ux: true, uy: true, uz: true, rx: true, ry: true, rz: true }),
  cerniera: Object.freeze({ ...vincoloVuoto(), ux: true, uy: true, uz: true }),
  // `uy` bloccato anche qui: il modello è spaziale, e un telaio piano senza ritegno fuori
  // piano ha un moto rigido — il Check Model lo rifiuta con `moti_rigidi`. Un carrello che
  // lascia `uy` libero è corretto sulla carta e inservibile in questo modello.
  carrello: Object.freeze({ ...vincoloVuoto(), uy: true, uz: true }),
});

const uguali = (a, b) => GRADI.every((g) => Boolean(a[g]) === Boolean(b[g]));

/** Il nome della preimpostazione che combacia, o `null`. Un vincolo tutto libero **non**
 *  è una preimpostazione: è l'assenza di vincolo, e si dice così. */
export function nomePreimpostazione(vincolo) {
  if (!vincolo) return null;
  if (GRADI.every((g) => !vincolo[g])) return null;
  return Object.keys(PREIMPOSTAZIONI).find((nome) => uguali(PREIMPOSTAZIONI[nome], vincolo)) ?? null;
}

export function descrizione(vincolo) {
  const nome = nomePreimpostazione(vincolo);
  if (nome) return nome;
  const bloccati = vincolo ? GRADI.filter((g) => vincolo[g]) : [];
  return bloccati.length === 0 ? "libero" : `bloccati: ${bloccati.join(", ")}`;
}
```

- [ ] **Step 4: Fai girare il test e verifica che passi**

Run: il comando dei test.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add static/vincoli.js static/test/vincoli.test.js
git commit -m "feat(interfaccia): i sei gradi del vincolo e le tre preimpostazioni"
```

---

### Task 3: due riduttori — `collega` e `impostaVincolo`

**Files:**
- Modify: `static/comandi.js`
- Modify: `static/test/comandi.test.js`

**Interfaces:**
- Consumes: `nodo`, `asta`, `prossimoId` da `static/modello.js`; `GRADI` da `static/vincoli.js`.
- Produces: `collega(m, {da, a, sezione}) → Modello`, `impostaVincolo(m, {id, vincolo}) → Modello`.

`collega` **non** passa da `estrudi`: i due identificatori sono già noti, e calcolare `dx`/`dz` per poi sperare che l'arrivo ricada entro la tolleranza sarebbe un giro inutile con un modo in più di sbagliare.

**Ingressi degeneri:**
- `collega` con `da === a` → `ErroreComando`: un'asta da un nodo a sé stesso è lunga zero
- `collega` con un nodo che non esiste (uno dei due, o entrambi) → `ErroreComando` che **nomina quale**
- `collega` fra due nodi già uniti da un'asta, **in qualunque verso** → `ErroreComando`: è quasi sempre un secondo clic per sbaglio, e un'asta duplicata il solutore la accetta in silenzio
- `impostaVincolo` con `vincolo: null` → il nodo torna libero, il campo sparisce dal modello
- `impostaVincolo` su un nodo che non esiste → `ErroreComando`
- `impostaVincolo` con chiavi estranee → si tengono solo i sei gradi noti: un campo in più diventerebbe un rifiuto di `/api/modello/salva`, che ha `extra="forbid"`
- entrambi: il modello ricevuto **non cambia mai**

- [ ] **Step 1: Scrivi i test che falliscono**

Aggiungi in fondo a `static/test/comandi.test.js`, e aggiorna la riga di `import` in cima per portare anche `collega` e `impostaVincolo`:

```js
test("collega crea l'asta fra due nodi scelti", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = collega(m, { da: 1, a: 2 });
  assert.deepEqual(m.aste[0], { id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: null });
});

test("collega non tocca il modello che riceve", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  const prima = structuredClone(m);
  collega(m, { da: 1, a: 2 });
  assert.deepEqual(m, prima);
});

test("collega un nodo a sé stesso si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => collega(m, { da: 1, a: 1 }), ErroreComando);
});

test("collega nomina il nodo che non esiste", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => collega(m, { da: 1, a: 9 }), /9/);
  assert.throws(() => collega(m, { da: 9, a: 1 }), /9/);
});

test("collega due nodi già uniti si rifiuta, in tutti e due i versi", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m = creaNodo(m, { x: 5000, z: 0 });
  m = collega(m, { da: 1, a: 2 });
  assert.throws(() => collega(m, { da: 1, a: 2 }), ErroreComando);
  assert.throws(() => collega(m, { da: 2, a: 1 }), ErroreComando);
});

test("impostaVincolo scrive i sei gradi e nient'altro", () => {
  const m = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }),
    { id: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true, pinguino: true } });
  assert.deepEqual(m.nodi[0].vincolo, { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true });
});

test("impostaVincolo con null libera il nodo e toglie il campo", () => {
  let m = impostaVincolo(creaNodo(modelloVuoto(), { x: 0, z: 0 }),
    { id: 1, vincolo: { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } });
  m = impostaVincolo(m, { id: 1, vincolo: null });
  assert.equal("vincolo" in m.nodi[0], false);
});

test("impostaVincolo non tocca il modello che riceve", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  const prima = structuredClone(m);
  impostaVincolo(m, { id: 1, vincolo: { ux: true } });
  assert.deepEqual(m, prima);
});

test("impostaVincolo su un nodo che non esiste si rifiuta", () => {
  const m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  assert.throws(() => impostaVincolo(m, { id: 9, vincolo: null }), ErroreComando);
});
```

- [ ] **Step 2: Fai girare i test e verifica che falliscano**

Run: il comando dei test.
Expected: FAIL — `collega is not defined` (o l'equivalente per `impostaVincolo`).

- [ ] **Step 3: Scrivi i due riduttori in `static/comandi.js`**

Aggiungi l'import in cima:

```js
import { GRADI } from "./vincoli.js";
```

e i due riduttori in fondo al file:

```js
/** L'asta fra due nodi già scelti. Non passa da `estrudi`: gli identificatori sono noti,
 *  e calcolare uno spostamento per poi sperare che l'arrivo ricada entro la tolleranza
 *  sarebbe un giro in più con un modo in più di sbagliare. */
export function collega(m, { da, a, sezione = null }) {
  if (da === a) throw new ErroreComando("un'asta da un nodo a sé stesso è lunga zero",
                                        "scegli due nodi diversi");
  for (const id of [da, a]) {
    if (!nodo(m, id)) throw new ErroreComando(`il nodo ${id} non esiste`, "scegli un nodo che c'è");
  }
  // Due nodi già uniti sono quasi sempre un secondo clic per sbaglio, e un'asta duplicata
  // il solutore la accetta senza dire niente: la vede solo il Check Model, alla corsa.
  const gia = m.aste.find((k) => (k.nodo_i === da && k.nodo_j === a) || (k.nodo_i === a && k.nodo_j === da));
  if (gia) throw new ErroreComando(`i nodi ${da} e ${a} sono già uniti dall'asta ${gia.id}`,
                                   "scegli un'altra coppia");
  const n = copia(m);
  const id = prossimoId(n, "asta");
  n.aste.push({ id, nome: null, nodo_i: da, nodo_j: a, sezione });
  n.contatori.asta = id;
  return n;
}

/** Il vincolo di un nodo: i sei gradi, o `null` per liberarlo. Si tengono **solo** i sei
 *  gradi noti — un campo in più diventerebbe un rifiuto di `/api/modello/salva`, che ha
 *  `extra="forbid"` (`nova/modello.py:39`). */
export function impostaVincolo(m, { id, vincolo }) {
  if (!nodo(m, id)) throw new ErroreComando(`il nodo ${id} non esiste`);
  const n = copia(m);
  const bersaglio = n.nodi.find((k) => k.id === id);
  if (vincolo === null || vincolo === undefined) delete bersaglio.vincolo;
  else bersaglio.vincolo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincolo[g])]));
  return n;
}
```

- [ ] **Step 4: Fai girare i test e verifica che passino**

Run: il comando dei test.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add static/comandi.js static/test/comandi.test.js
git commit -m "feat(interfaccia): riduttori per l'asta fra due nodi e il vincolo"
```

---

### Task 4: `tastiera.js` — i modificatori e quattro voci nuove

**Files:**
- Modify: `static/tastiera.js`
- Modify: `static/test/tastiera.test.js`

**Interfaces:**
- Consumes: niente.
- Produces: `TASTI` con il campo nuovo `modificatore` (`"comando"` o assente), `voceDaEvento(evento)`, `vociDellaBarra(contesto)` — firme invariate.

Fino a ieri `voceDaEvento` tornava `null` **a qualunque** modificatore, perché `⌘K` e `⌘Z` erano di domani e rubarli sarebbe stato peggio che ignorarli. Oggi servono `⌘O` e `⌘S`, quindi il modificatore diventa parte della voce. La regola resta: **una combinazione non mappata resta al browser**.

Il modificatore di comando è `metaKey` **oppure** `ctrlKey`: ⌘ sul Mac, Ctrl sul PC. `altKey` non è mai un modificatore di comando.

Voci nuove:

| codice | tasto | modificatore | contesto |
|---|---|---|---|
| `apri` | `⌘O` | comando | `sempre` |
| `salva` | `⌘S` | comando | `sempre` |
| `asta` | `A` | — | `selezione` |
| `vincolo` | `V` | — | `selezione` |

Il contesto `asta` è nuovo: quando si sta scegliendo il secondo nodo, la barra mostra `⇥`, `Invio`, `Esc` — e **non** i comandi che il modo blocca.

**Ingressi degeneri:**
- `⌘O` → torna la voce `apri`; `Ctrl+O` → la stessa voce
- `O` senza modificatore → `null`: non deve aprire per sbaglio
- `⌘N`, `⌘P`, `⌘W`, o qualunque combinazione non mappata → `null`, così il browser la tiene
- `⌥S` (solo alt) → `null`
- `⌘⇧S` → `null`: non è mappata, e indovinare sarebbe peggio
- due voci con lo stesso `tasto` **e** lo stesso modificatore → il test lo vieta

- [ ] **Step 1: Scrivi i test che falliscono**

Sostituisci il test dei modificatori esistente e aggiungi i nuovi, in `static/test/tastiera.test.js`:

```js
test("il modificatore di comando apre e salva, su Mac e su PC", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: true, ctrlKey: false, altKey: false }).codice, "apri");
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: true, altKey: false }).codice, "apri");
  assert.equal(voceDaEvento({ key: "s", metaKey: true, ctrlKey: false, altKey: false }).codice, "salva");
});

test("senza modificatore quelle lettere non fanno niente", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: false, altKey: false }), null);
  assert.equal(voceDaEvento({ key: "s", metaKey: false, ctrlKey: false, altKey: false }), null);
});

test("una combinazione non mappata resta al browser", () => {
  for (const key of ["n", "p", "w", "b", "z", "k"]) {
    assert.equal(voceDaEvento({ key, metaKey: true, ctrlKey: false, altKey: false }), null, key);
  }
});

test("alt non è mai il modificatore di comando", () => {
  assert.equal(voceDaEvento({ key: "o", metaKey: false, ctrlKey: false, altKey: true }), null);
  assert.equal(voceDaEvento({ key: "n", metaKey: false, ctrlKey: false, altKey: true }), null);
});

test("⌘⇧S resta al browser: «salva con nome» non è nostra", () => {
  assert.equal(voceDaEvento({ key: "s", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
  assert.equal(voceDaEvento({ key: "o", metaKey: true, ctrlKey: false, altKey: false, shiftKey: true }), null);
});

test("i comandi senza modificatore continuano a rifiutare i modificatori", () => {
  assert.equal(voceDaEvento({ key: "n", metaKey: true, ctrlKey: false, altKey: false }), null);
  assert.equal(voceDaEvento({ key: "a", metaKey: true, ctrlKey: false, altKey: false }), null);
});

test("A collega, V vincola, entrambe con una selezione", () => {
  assert.equal(voceDaEvento({ key: "a", metaKey: false, ctrlKey: false, altKey: false }).codice, "asta");
  assert.equal(voceDaEvento({ key: "v", metaKey: false, ctrlKey: false, altKey: false }).codice, "vincolo");
  const conSelezione = vociDellaBarra("selezione").map((v) => v.codice);
  assert.ok(conSelezione.includes("asta"));
  assert.ok(conSelezione.includes("vincolo"));
});

test("scegliendo il secondo nodo la barra mostra solo quel che serve", () => {
  const codici = vociDellaBarra("asta").map((v) => v.codice);
  assert.deepEqual(codici.sort(), ["annulla", "conferma", "seleziona"].sort());
});

test("nessuna coppia tasto+modificatore è assegnata due volte", () => {
  const chiavi = TASTI.map((v) => `${v.tasto}|${v.modificatore ?? ""}`);
  assert.equal(new Set(chiavi).size, chiavi.length, `doppione in: ${chiavi.join(" ")}`);
});
```

- [ ] **Step 2: Fai girare i test e verifica che falliscano**

Run: il comando dei test.
Expected: FAIL — `apri` non esiste ancora fra le voci.

- [ ] **Step 3: Riscrivi la parte alta di `static/tastiera.js`**

```js
export const TASTI = [
  { codice: "nodo",      tasto: "N",     etichetta: "nodo",      aiuto: "x; z",            contesto: "salvo-ghost" },
  { codice: "seleziona", tasto: "⇥",     etichetta: "seleziona", aiuto: "gira fra i nodi", contesto: "salvo-ghost" },
  { codice: "apri",      tasto: "⌘O",    etichetta: "apri",      aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "salva",     tasto: "⌘S",    etichetta: "salva",     aiuto: null,              contesto: "salvo-ghost", modificatore: "comando" },
  { codice: "estrudi",   tasto: "B",     etichetta: "estrudi",   aiuto: "lunghezza, poi freccia", contesto: "selezione" },
  { codice: "asta",      tasto: "A",     etichetta: "asta",      aiuto: "poi il secondo nodo",    contesto: "selezione" },
  { codice: "vincolo",   tasto: "V",     etichetta: "vincolo",   aiuto: null,              contesto: "selezione" },
  { codice: "sposta",    tasto: "M",     etichetta: "sposta",    aiuto: "x; z",            contesto: "selezione" },
  { codice: "rinomina",  tasto: "R",     etichetta: "rinomina",  aiuto: null,              contesto: "selezione" },
  { codice: "elimina",   tasto: "⌫",     etichetta: "elimina",   aiuto: null,              contesto: "selezione" },
  { codice: "conferma",  tasto: "Invio", etichetta: "conferma",  aiuto: null,              contesto: "ghost" },
  { codice: "annulla",   tasto: "Esc",   etichetta: "annulla",   aiuto: null,              contesto: "ghost" },
];

// `key` dell'evento → codice, separati per modificatore. I tasti **stampati** sono quelli
// di questa tastiera, che è un Mac; chi ha un PC preme Ctrl e Canc lo stesso, ed è solo
// l'etichetta a scegliere.
const SENZA_MODIFICATORE = new Map([
  ["n", "nodo"], ["tab", "seleziona"], ["b", "estrudi"], ["a", "asta"], ["v", "vincolo"],
  ["m", "sposta"], ["r", "rinomina"], ["f2", "rinomina"],
  ["backspace", "elimina"], ["delete", "elimina"],
  ["enter", "conferma"], ["escape", "annulla"],
]);
const CON_COMANDO = new Map([["o", "apri"], ["s", "salva"]]);

export function voceDaEvento(evento) {
  // ⌘ sul Mac, Ctrl sul PC: lo stesso modificatore di comando. `alt` e `shift` non lo sono
  // mai, e una combinazione non mappata resta al browser — rubarla è peggio che ignorarla.
  // `⌘⇧S` è «salva con nome» in mezzo mondo: non è nostra.
  if (evento.altKey || evento.shiftKey) return null;
  const comando = Boolean(evento.metaKey || evento.ctrlKey);
  const tavola = comando ? CON_COMANDO : SENZA_MODIFICATORE;
  const codice = tavola.get(String(evento.key).toLowerCase());
  return codice ? TASTI.find((v) => v.codice === codice) : null;
}

// `salvo-ghost` vuol dire «sempre, tranne mentre c'è un modo aperto». `seleziona` fa
// eccezione: mentre si sceglie il secondo nodo di un'asta, `⇥` **è** il gesto.
export const vociDellaBarra = (contesto) =>
  TASTI.filter((v) => {
    if (v.codice === "seleziona") return contesto !== "ghost";
    if (v.contesto === "salvo-ghost") return contesto !== "ghost" && contesto !== "asta";
    if (v.contesto === "ghost") return contesto === "ghost" || contesto === "asta";
    return v.contesto === contesto;
  });
```

- [ ] **Step 4: Fai girare i test e verifica che passino**

Run: il comando dei test.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add static/tastiera.js static/test/tastiera.test.js
git commit -m "feat(interfaccia): modificatore di comando, asta e vincolo nella mappa"
```

---

### Task 5: `file.js` — l'area dei file

**Files:**
- Create: `static/file.js`
- Modify: `static/index.html`
- Modify: `static/stile.css`

**Interfaces:**
- Consumes: `leggi`, `scrivi`, `aggiungi` da `static/recenti.js`.
- Produces: `creaFile(radice, {suApertura, suSalvataggio, suErrore, deposito}) → {disegna({percorso, impronta, modificato}), apri(percorso), salva(percorso, modello), percorsoCorrente()}`.
  - `suApertura(percorso, modello, impronta)` — il server ha restituito un modello nuovo: chi chiama **ricomincia** la cronologia.
  - `suSalvataggio(percorso, impronta)` — il modello in memoria è stato scritto: cambia solo l'impronta di riferimento. **Sono due callback e non una** perché salvare non deve toccare la cronologia: con una sola, ogni `⌘S` cancellerebbe l'undo.
  - `suErrore(messaggio)` — il `motivo` del server, così `app.js` lo mostra sul canale che già usa.

**Niente `prompt` qui.** Il percorso è un campo di testo vero: si incolla dal Finder, si preme Invio. Ha un effetto secondario che vale da solo — **il pezzo diventa verificabile da un agente**, mentre un dialog nativo blocca l'automazione del browser.

**Il DOM che questo task aggiunge**, in cima alla colonna sinistra dentro `#albero`:

```html
<section id="file" aria-label="file del modello">
  <h2>File</h2>
  <input id="file-percorso" type="text" spellcheck="false"
         placeholder="percorso del modello .nova.json"
         aria-label="percorso del modello">
  <div class="file-azioni">
    <button id="file-apri" type="button">apri</button>
    <button id="file-salva" type="button">salva</button>
  </div>
  <p id="file-stato" class="numero"></p>
  <ul id="file-recenti" aria-label="aperti di recente"></ul>
</section>
```

**Ingressi degeneri:**
- campo vuoto e `apri` → messaggio «scrivi il percorso di un modello», nessuna richiesta al server
- file che non esiste → il server risponde **404**, si mostra il suo `motivo`
- file con un campo sconosciuto → **400** con `modello rifiutato — nodi.0.pinguino: campo non previsto`: il campo va **mostrato**, è la story 67
- `schema_version: 2` → **400** «non supportata: questa NOVA legge fino a 1»
- salvare un telaio disegnato oggi → **400** `aste.0.sezione: campo obbligatorio`, ed è **atteso** finché il catalogo delle sezioni non esiste (11b)
- il deposito dei recenti che solleva → l'elenco resta vuoto, apertura e salvataggio funzionano lo stesso
- risposta del server senza `motivo` → si mostra lo stato HTTP, mai «undefined»

- [ ] **Step 1: Scrivi `static/file.js`**

```js
// L'area dei file. Il percorso è un campo di testo, non un `prompt`: si incolla dal Finder
// e si preme Invio. Un dialog nativo, oltre a essere brutto qui, blocca l'automazione del
// browser — e questo pezzo va provato.
//
// L'impronta **non** si ricalcola in JS: duplicare il canonico di `nova/modello.py:impronta`
// sarebbe una seconda verità che diverge. Si tiene quella che il server ha restituito, e un
// flag che dice se da allora il modello è cambiato.

import { aggiungi, leggi, scrivi } from "./recenti.js";

const corto = (impronta) => (impronta ? impronta.slice(0, 8) : "—");

export function creaFile(radice, { suApertura, suSalvataggio, suErrore, deposito = null }) {
  const campo = radice.querySelector("#file-percorso");
  const stato = radice.querySelector("#file-stato");
  const elenco = radice.querySelector("#file-recenti");
  const deposito_ = deposito ?? (typeof localStorage === "undefined" ? null : localStorage);
  let recenti = deposito_ ? leggi(deposito_) : [];

  async function chiedi(rotta, corpo) {
    const r = await fetch(rotta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = await r.json().catch(() => ({}));
    // un errore senza `motivo` è comunque un errore: si dice lo stato, mai «undefined»
    if (!r.ok) throw new Error(dati.motivo || `il server ha risposto ${r.status}`);
    return dati;
  }

  function ricorda(percorso) {
    recenti = aggiungi(recenti, percorso);
    if (deposito_) scrivi(deposito_, recenti);
    disegnaRecenti();
  }

  function disegnaRecenti() {
    elenco.replaceChildren(...recenti.map((p) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p;
      b.title = p;
      b.addEventListener("click", () => { campo.value = p; apri(p); });
      li.append(b);
      return li;
    }));
  }

  async function apri(percorso) {
    const p = (percorso ?? campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso di un modello");
    try {
      const { modello, impronta } = await chiedi("/api/modello/apri", { percorso: p });
      campo.value = p;
      ricorda(p);
      suApertura(p, modello, impronta);
    } catch (e) {
      suErrore(e.message);
    }
  }

  async function salva(percorso, modello) {
    const p = (percorso ?? campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso dove salvare");
    try {
      const { impronta } = await chiedi("/api/modello/salva", { percorso: p, modello });
      ricorda(p);
      // `suSalvataggio` e non `suApertura`: il modello in memoria è già quello giusto, e
      // ricominciare la cronologia qui cancellerebbe l'undo a ogni salvataggio.
      suSalvataggio(p, impronta);
    } catch (e) {
      suErrore(e.message);
    }
  }

  campo.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    apri();
  });
  radice.querySelector("#file-apri").addEventListener("click", () => apri());

  function disegna({ percorso, impronta, modificato }) {
    if (percorso && campo.value === "") campo.value = percorso;
    stato.textContent = percorso
      ? `impronta ${corto(impronta)}${modificato ? " · modificato" : ""}`
      : "nessun modello aperto";
  }

  disegnaRecenti();
  return { disegna, apri, salva, percorsoCorrente: () => campo.value.trim() };
}
```

Il bottone `#file-salva` lo collega `app.js` al Task 7, perché il salvataggio ha bisogno del modello corrente, che `file.js` non conosce.

- [ ] **Step 2: Aggiungi il DOM in `static/index.html`**

Dentro `<nav id="albero">`, **prima** dell'`<h2>Modello</h2>`, inserisci il blocco `<section id="file">` riportato sopra.

- [ ] **Step 3: Aggiungi lo stile in `static/stile.css`**

```css
#file { border-bottom: 1px solid var(--tratto); padding-bottom: var(--passo); margin-bottom: var(--passo); }
#file-percorso { width: 100%; font-family: var(--mono); font-size: 12px;
                 background: var(--pannello); color: var(--inchiostro);
                 border: 1px solid var(--tratto-forte); border-radius: 2px; padding: 4px 6px; }
#file-percorso:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
.file-azioni { display: flex; gap: 6px; margin-top: 6px; }
.file-azioni button { font: inherit; cursor: pointer; padding: 2px 10px;
                      background: var(--pannello); color: var(--inchiostro);
                      border: 1px solid var(--tratto-forte); border-radius: 2px; }
.file-azioni button:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
#file-stato { margin: 6px 0 0; font-size: 11px; color: var(--testo-tenue); }
#file-recenti { margin: 6px 0 0; padding: 0; list-style: none; }
#file-recenti button { font-family: var(--mono); font-size: 11px; background: none; border: 0;
                       color: var(--testo-tenue); cursor: pointer; padding: 1px 0;
                       max-width: 100%; overflow: hidden; text-overflow: ellipsis;
                       white-space: nowrap; display: block; text-align: left; }
#file-recenti button:hover { color: var(--inchiostro); }
#file-recenti button:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
```

Il `text-overflow: ellipsis` sui recenti è deliberato: un percorso lungo si tronca **con i puntini** e ha il `title` completo, invece di allargare la colonna o di essere tagliato di netto.

- [ ] **Step 4: Guarda l'area file in browser**

```bash
/Users/mario/GitHub/NOVA-wt/interfaccia-11a/.venv/bin/python -m nova --porta 8810
```

**Non uccidere il processo sulla porta 8765** (prototipo) **né 8766-8767** (`claude-science`). A `http://127.0.0.1:8810/`, con la console:

```js
const { creaFile } = await import("/static/file.js");
const f = creaFile(document, { suApertura: (p, m, i) => console.log("aperto", p, i, m.nodi.length),
                               suErrore: (msg) => console.warn("errore:", msg) });
f.disegna({ percorso: null, impronta: null, modificato: false });
```

Poi incolla nel campo `docs/caso-studio/muro_1.nova.json` e premi Invio: la console deve stampare `aperto`, l'impronta, e **4 nodi**. Riprova con `docs/caso-studio/non-esiste.json` e verifica che l'errore sia leggibile.

- [ ] **Step 5: Commit**

```bash
git add static/file.js static/index.html static/stile.css
git commit -m "feat(interfaccia): area file con percorso, recenti e impronta"
```

---

### Task 6: `pannello.js` — l'ispettore esce da `app.js`

**Files:**
- Create: `static/pannello.js`
- Modify: `static/index.html` (aggiunge `<div id="pannello-vincolo" hidden>` dopo `#pannello-dati`)
- Modify: `static/app.js`
- Modify: `static/stile.css`

**Interfaces:**
- Consumes: `stampaNumero` da `static/numeri.js`; `nodo` da `static/modello.js`; `GRADI`, `PREIMPOSTAZIONI`, `nomePreimpostazione`, `descrizione` da `static/vincoli.js`.
- Produces: `creaPannello(dati, vuoto, editor, {suVincolo}) → {disegna(modello, selezione)}`.
  - `suVincolo(id, vincolo)` — `vincolo` è l'oggetto dei sei gradi, oppure `null` per liberare.
  - `editor` è un contenitore **fratello** della `<dl>`, non un figlio: bottoni e caselle dentro una lista di definizioni non hanno senso semantico, e uno screen reader li leggerebbe come se fossero un termine o una descrizione. Va aggiunto a `index.html` subito dopo `#pannello-dati`:

```html
<div id="pannello-vincolo" hidden></div>
```

L'ispettore esce da `app.js` perché con l'editor del vincolo passa da venticinque righe a una sessantina, e `app.js` ha già i due modi e la cucitura.

**L'editor del vincolo:** tre bottoni per le preimpostazioni (`incastro`, `cerniera`, `carrello`), un bottone `libero`, e sei caselle per i gradi singoli. Il bottone della preimpostazione attiva è **premuto** (`aria-pressed="true"`) e non solo colorato — doppio canale.

**Ingressi degeneri:**
- nessuna selezione → il pannello dei dati è `hidden`, quello vuoto visibile, e i `<dd>` di prima non restano leggibili da uno screen reader
- nodo senza vincolo → «libero», nessuna preimpostazione premuta, sei caselle vuote
- nodo con un vincolo che non è una delle tre → nessun bottone premuto, le caselle mostrano i gradi veri, e la descrizione elenca i bloccati
- asta selezionata → l'editor del vincolo **non** compare: il vincolo è dei nodi
- selezione che punta a un oggetto sparito → il pannello non solleva (chi chiama azzera già la selezione, ma il pannello non ci conta)

- [ ] **Step 1: Scrivi `static/pannello.js`**

```js
// L'ispettore della selezione, con l'editor del vincolo. Fuori da `app.js` perché con i sei
// gradi e le tre preimpostazioni raddoppia, e `app.js` ha già i due modi e la cucitura.

import { stampaNumero } from "./numeri.js";
import { nodo } from "./modello.js";
import { GRADI, PREIMPOSTAZIONI, nomePreimpostazione, descrizione } from "./vincoli.js";

const mm = (v) => `${stampaNumero(v, { decimali: 0, migliaia: true })} mm`;

export function creaPannello(dati, vuoto, editor, { suVincolo }) {
  function righe(m, selezione) {
    if (selezione.tipo === "nodo") {
      const n = nodo(m, selezione.id);
      if (!n) return null;
      return [["identificatore", String(n.id)], ["nome", n.nome ?? "—"],
              ["x", mm(n.x)], ["z", mm(n.z)], ["vincolo", descrizione(n.vincolo)]];
    }
    const a = m.aste.find((k) => k.id === selezione.id);
    if (!a) return null;
    const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
    const lunghezza = i && j ? mm(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z)) : "—";
    return [["identificatore", String(a.id)], ["nome", a.nome ?? "—"],
            ["da → a", `${a.nodo_i} → ${a.nodo_j}`], ["lunghezza", lunghezza],
            ["sezione", a.sezione === null ? "non assegnata (giornata 11b)" : String(a.sezione)]];
  }

  function editorVincolo(n) {
    const box = document.createElement("div");
    box.id = "vincolo-editor";
    const attivo = nomePreimpostazione(n.vincolo);

    const fila = document.createElement("div");
    fila.className = "vincolo-preimpostazioni";
    for (const nome of [...Object.keys(PREIMPOSTAZIONI), "libero"]) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = nome;
      const premuto = nome === "libero" ? attivo === null && !GRADI.some((g) => n.vincolo?.[g]) : nome === attivo;
      // doppio canale: premuto è uno stato, non un colore
      b.setAttribute("aria-pressed", String(premuto));
      b.addEventListener("click", () => suVincolo(n.id, nome === "libero" ? null : { ...PREIMPOSTAZIONI[nome] }));
      fila.append(b);
    }
    box.append(fila);

    const gradi = document.createElement("div");
    gradi.className = "vincolo-gradi";
    for (const g of GRADI) {
      const et = document.createElement("label");
      const c = document.createElement("input");
      c.type = "checkbox";
      c.checked = Boolean(n.vincolo?.[g]);
      c.addEventListener("change", () => {
        const nuovo = Object.fromEntries(GRADI.map((k) => [k, Boolean(n.vincolo?.[k])]));
        nuovo[g] = c.checked;
        suVincolo(n.id, GRADI.some((k) => nuovo[k]) ? nuovo : null);
      });
      et.append(c, document.createTextNode(g));
      gradi.append(et);
    }
    box.append(gradi);
    return box;
  }

  function disegna(m, selezione) {
    const r = selezione ? righe(m, selezione) : null;
    vuoto.hidden = r !== null;
    dati.hidden = r === null;
    if (r === null) { dati.replaceChildren(); editor.replaceChildren(); editor.hidden = true; return; }

    dati.replaceChildren(...r.flatMap(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v; dd.className = "numero";
      return [dt, dd];
    }));

    // Il vincolo è dei nodi: su un'asta l'editor non compare affatto. E sta **fuori** dalla
    // `<dl>`, perché bottoni e caselle dentro una lista di definizioni non sono né un
    // termine né una descrizione.
    const n = selezione.tipo === "nodo" ? nodo(m, selezione.id) : null;
    if (n) { editor.replaceChildren(editorVincolo(n)); editor.hidden = false; }
    else { editor.replaceChildren(); editor.hidden = true; }
  }

  return { disegna };
}
```

- [ ] **Step 2: Aggiungi lo stile in `static/stile.css`**

```css
.vincolo-preimpostazioni { display: flex; gap: 4px; flex-wrap: wrap; margin-top: var(--passo); }
.vincolo-preimpostazioni button { font: inherit; font-size: 11px; cursor: pointer; padding: 2px 8px;
                                  background: var(--pannello); color: var(--inchiostro);
                                  border: 1px solid var(--tratto-forte); border-radius: 2px; }
/* Premuto è uno stato, non una tinta: il bordo cambia spessore oltre al colore. */
.vincolo-preimpostazioni button[aria-pressed="true"] { border-color: var(--rosso); border-width: 2px;
                                                       padding: 1px 7px; font-weight: 700; }
.vincolo-preimpostazioni button:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
.vincolo-gradi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 2px 6px; margin-top: 6px; }
.vincolo-gradi label { font-family: var(--mono); font-size: 11px; display: flex; gap: 4px; align-items: center; }
```

- [ ] **Step 3: Togli `disegnaPannello` da `static/app.js`**

Cancella la funzione `disegnaPannello` e la sua chiamata dentro `ridisegna`; le sostituisce il Task 7.

- [ ] **Step 4: Fai girare la suite**

Run: il comando dei test.
Expected: PASS, conteggi invariati — questo task non aggiunge test JS, è DOM.

- [ ] **Step 5: Commit**

```bash
git add static/pannello.js static/app.js static/stile.css
git commit -m "feat(interfaccia): ispettore in un modulo suo, con l'editor del vincolo"
```

---

### Task 7: `app.js` — i due modi e la cucitura

**Files:**
- Modify: `static/app.js`

**Interfaces:**
- Consumes: tutto quel che i task 1-6 producono.
- Produces: la pagina che apre, ispeziona, vincola, collega e salva. Nessun altro modulo dipende da questo.

**Il punto delicato di tutta la giornata.** Ieri ho chiuso il difetto per cui, con un ghost aperto, cliccare un altro nodo spostava la selezione lasciando il ghost indietro: la guardia blocca i cambi di selezione mentre il ghost c'è. Ma l'**asta fra due nodi** *è* «scegli il secondo nodo»: la stessa guardia la renderebbe impossibile.

Servono quindi **due modi**, non un ghost solo:

```js
// modo === null                                  → si comanda liberamente
// modo === { tipo: "estrusione", da, dx, dz }    → la selezione è **ferma**: cambiarla è il difetto di ieri
// modo === { tipo: "asta", da, a }               → la selezione **è** il gesto: `a` la segue
```

`piano.js` non cambia: riceve sempre un ghost della forma `{da, dx, dz}`, e in modo `asta` è `app.js` a calcolare `dx`/`dz` dal secondo nodo.

**Ingressi degeneri:**
- `A` senza selezione → messaggio, nessun modo aperto
- in modo `asta`, `⇥` o un clic su un nodo → il ghost segue il nuovo nodo, e la selezione cambia (è il gesto)
- in modo `asta`, `Invio` con `a === null` → messaggio «scegli il secondo nodo», il modo resta aperto
- in modo `asta`, `Invio` sul nodo di partenza → `ErroreComando` da `collega`, il modo resta aperto
- in modo `estrusione`, un clic su un altro nodo → **rifiutato**, con la ragione (il difetto di ieri, che deve restare chiuso)
- `Esc` in qualunque modo → il modo sparisce, il modello non cambia
- il nodo di partenza eliminato mentre un modo è aperto → il modo si azzera
- `⌘S` con un telaio disegnato oggi → **400** dal server con `aste.0.sezione: campo obbligatorio`, mostrato com'è: è il limite dichiarato, non un difetto
- qualunque comando riuscito → `modificato` diventa vero, e l'area file lo dice

- [ ] **Step 1: Riscrivi la testa di `static/app.js`**

```js
import { modelloVuoto, nodo } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, collega, spostaNodo, eliminaNodo, rinomina, impostaVincolo } from "./comandi.js";
import { nuovaCronologia, applica, corrente } from "./cronologia.js";
import { voceDaEvento, vociDellaBarra } from "./tastiera.js";
import { creaPiano } from "./piano.js";
import { creaSpazio } from "./spazio.js";
import { creaAlbero } from "./albero.js";
import { creaPannello } from "./pannello.js";
import { creaFile } from "./file.js";
import { leggiNumero, stampaNumero } from "./numeri.js";

let cronologia = nuovaCronologia(modelloVuoto());
let selezione = null;
// null · {tipo:"estrusione", da, dx, dz} · {tipo:"asta", da, a}
// Due modi e non un ghost solo: in estrusione la selezione è ferma, in asta la selezione
// **è** il gesto. La stessa guardia per entrambi renderebbe l'asta impossibile.
let modo = null;
let percorso = null, impronta = null, modificato = false;
```

- [ ] **Step 2: Sostituisci la selezione, il ghost e il ridisegno**

```js
const $ = (id) => document.getElementById(id);
const messaggio = $("messaggio");
function dì(testo) { messaggio.textContent = testo ?? ""; }

// Il ghost che il piano disegna ha sempre la stessa forma, qualunque sia il modo.
function ghostDisegnabile(m) {
  if (!modo) return null;
  if (modo.tipo === "estrusione") return { da: modo.da, dx: modo.dx, dz: modo.dz };
  const da = nodo(m, modo.da), a = modo.a === null ? null : nodo(m, modo.a);
  if (!da || !a) return null;
  return { da: modo.da, dx: a.x - da.x, dz: a.z - da.z };
}

function scegli(tipo, id) {
  if (modo?.tipo === "estrusione") {
    dì("c'è un'estrusione in corso: Invio per confermarla, Esc per annullarla");
    return;
  }
  if (modo?.tipo === "asta") {
    // Scegliendo il secondo nodo, un'asta non è un bersaglio: accettarla lascerebbe
    // `modo.a` fermo su quello di prima, e Invio costruirebbe verso un nodo che non è
    // quello evidenziato — lo stesso difetto silenzioso del ghost, di lato.
    if (tipo !== "nodo") { dì("scegli un nodo, non un'asta — Esc per annullare"); return; }
    modo = { ...modo, a: id };
  }
  selezione = { tipo, id };
  ridisegna();
}

const piano = creaPiano($("piano"), { suSelezione: scegli, suSfondo: () => { if (!modo) { selezione = null; ridisegna(); } } });
const albero = creaAlbero($("albero-elenco"), $("albero-vuoto"), { suSelezione: scegli });
const pannello = creaPannello($("pannello-dati"), $("pannello-vuoto"), $("pannello-vincolo"), {
  suVincolo: (id, vincolo) => { esegui((m) => impostaVincolo(m, { id, vincolo }), `vincolo del nodo ${id}`); ridisegna(); },
});
const spazio = await creaSpazio($("spazio"));
const file = creaFile(document, {
  suApertura: (p, m, i) => {
    cronologia = nuovaCronologia(m, `aperto ${p}`);
    selezione = null; modo = null;
    percorso = p; impronta = i; modificato = false;
    dì(null);
    ridisegna();
  },
  // Salvare non tocca né il modello né la cronologia: cambia solo l'impronta di riferimento.
  suSalvataggio: (p, i) => { percorso = p; impronta = i; modificato = false; dì(null); ridisegna(); },
  suErrore: (msg) => dì(msg),
});
$("file-salva").addEventListener("click", () => file.salva(null, corrente(cronologia)));

function esegui(fn, etichetta) {
  try {
    cronologia = applica(cronologia, fn, etichetta);
    modificato = true;
    dì(null);
    return true;
  } catch (e) {
    if (!(e instanceof ErroreComando)) throw e;
    dì(e.rimedio ? `${e.message} — ${e.rimedio}` : e.message);
    return false;
  }
}

function ridisegna() {
  const m = corrente(cronologia);
  if (selezione && !(selezione.tipo === "nodo" ? m.nodi : m.aste).some((e) => e.id === selezione.id)) selezione = null;
  if (modo && !m.nodi.some((n) => n.id === modo.da)) modo = null;
  if (modo?.tipo === "asta" && modo.a !== null && !m.nodi.some((n) => n.id === modo.a)) modo = { ...modo, a: null };

  const ghost = ghostDisegnabile(m);
  piano.disegna(m, { selezione, ghost });
  spazio.disegna(m, { selezione });
  albero.disegna(m, { selezione });
  pannello.disegna(m, selezione);
  file.disegna({ percorso, impronta, modificato });
  disegnaBarra();
}

function disegnaBarra() {
  const contesto = modo ? (modo.tipo === "asta" ? "asta" : "ghost") : (selezione ? "selezione" : "sempre");
  $("barra").replaceChildren(...vociDellaBarra(contesto).map((v) => {
    const span = document.createElement("span");
    span.className = "tasto";
    const kbd = document.createElement("kbd"); kbd.textContent = v.tasto;
    span.append(kbd, document.createTextNode(v.etichetta));
    if (v.aiuto) {
      const aiuto = document.createElement("span");
      aiuto.className = "aiuto"; aiuto.textContent = v.aiuto;
      span.append(aiuto);
    }
    return span;
  }));
}
```

- [ ] **Step 3: Sostituisci lo smistamento dei tasti**

Nel gestore globale, dopo `annulla` e prima degli altri comandi:

```js
  if (voce.codice === "annulla") { modo = null; dì(null); ridisegna(); return; }

  // Con un modo aperto passano solo conferma, annulla e — in modo asta — la selezione.
  if (modo && voce.codice !== "conferma" && !(modo.tipo === "asta" && voce.codice === "seleziona")) {
    dì(modo.tipo === "asta"
      ? "scegli il secondo nodo, poi Invio — Esc per annullare"
      : "c'è un'estrusione in corso: Invio per confermarla, Esc per annullarla");
    return;
  }

  if (voce.codice === "apri") { file.apri(); return; }
  if (voce.codice === "salva") { file.salva(null, corrente(cronologia)); return; }

  if (voce.codice === "asta") {
    if (selezione?.tipo !== "nodo") { dì("un'asta parte da un nodo: selezionane uno"); return; }
    modo = { tipo: "asta", da: selezione.id, a: null };
    ridisegna();
    return;
  }

  if (voce.codice === "vincolo") {
    if (selezione?.tipo !== "nodo") { dì("il vincolo è di un nodo: selezionane uno"); return; }
    const n = nodo(corrente(cronologia), selezione.id);
    const id = selezione.id;
    // `V` alterna fra incastro e libero: il gesto rapido. Le altre preimpostazioni e i
    // gradi singoli stanno nel pannello, dove si vedono.
    const libero = !n.vincolo || !["ux", "uy", "uz", "rx", "ry", "rz"].some((g) => n.vincolo[g]);
    esegui((m) => impostaVincolo(m, { id, vincolo: libero ? { ux: true, uy: true, uz: true, rx: true, ry: true, rz: true } : null }),
           `vincolo del nodo ${id}`);
    ridisegna();
    return;
  }
```

E la conferma, che ora deve distinguere i due modi:

```js
  if (voce.codice === "conferma") {
    if (!modo) return;
    if (modo.tipo === "asta") {
      if (modo.a === null) { dì("scegli il secondo nodo, poi Invio"); return; }
      const { da, a } = modo;
      if (esegui((m) => collega(m, { da, a }), `asta ${da} → ${a}`)) { modo = null; selezione = { tipo: "nodo", id: a }; }
      ridisegna();
      return;
    }
    const g = { da: modo.da, dx: modo.dx, dz: modo.dz };
    if (esegui((m) => estrudi(m, g), `asta da ${g.da}`)) {
      modo = null;
      const m = corrente(cronologia);
      selezione = { tipo: "nodo", id: m.aste[m.aste.length - 1].nodo_j };
    }
    ridisegna();
    return;
  }
```

Le frecce, che valgono solo in estrusione:

```js
window.addEventListener("keydown", (ev) => {
  if (modo?.tipo !== "estrusione") return;
  const l = Math.hypot(modo.dx, modo.dz);
  const verso = { ArrowUp: [0, l], ArrowDown: [0, -l], ArrowRight: [l, 0], ArrowLeft: [-l, 0] }[ev.key];
  if (!verso) return;
  ev.preventDefault();
  modo = { ...modo, dx: verso[0], dz: verso[1] };
  ridisegna();
});
```

E `estrudi` che apre il modo invece del ghost:

```js
    modo = { tipo: "estrusione", da: selezione.id, dx: 0, dz: l };
```

- [ ] **Step 4: Fai girare la suite**

Run: il comando dei test.
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add static/app.js
git commit -m "feat(interfaccia): due modi, file e vincolo nella cucitura"
```

---

### Task 8: la verifica che conta

**Files:** nessuno — è la prova a mano.

- [ ] **Step 1: Avvia il server**

```bash
/Users/mario/GitHub/NOVA-wt/interfaccia-11a/.venv/bin/python -m nova --porta 8810
```

**Non uccidere il processo sulla 8765** (prototipo con Firefox attaccato) **né 8766-8767** (`claude-science`).

- [ ] **Step 2: Il giro dell'impronta**

Su `http://127.0.0.1:8810/`:

1. incolla `docs/caso-studio/muro_1.nova.json` nel campo e premi Invio;
2. l'albero mostra **4 nodi e 4 aste**, l'area file mostra un'impronta e **nessun** «modificato»;
3. annota l'impronta corta;
4. `⌘S` senza toccare nulla → l'impronta mostrata deve essere **la stessa**;
5. cambia il vincolo del nodo 1 in `cerniera` dal pannello → compare «modificato»;
6. rimettilo a `incastro` → «modificato» resta (il modello è stato toccato due volte), ma `⌘S` deve dare **di nuovo l'impronta di partenza**: è lo stesso modello.

Il punto 6 è la prova vera che l'impronta è del **contenuto** e non della storia.

- [ ] **Step 3: L'asta fra due nodi**

Con il MURO 1 aperto: seleziona il nodo 1, `A`, poi `⇥` fino al nodo 4, `Invio`. Nasce l'asta diagonale. Poi riprova la stessa coppia: deve **rifiutare** con «i nodi 1 e 4 sono già uniti dall'asta 5».

- [ ] **Step 4: I casi degeneri**

- `A` senza selezione → messaggio, nessun modo;
- in modo `asta`, `Invio` senza secondo nodo → «scegli il secondo nodo»;
- in modo `estrusione` (`B`), un **clic** su un altro nodo → rifiutato con la ragione;
- percorso inesistente → il `motivo` del server, leggibile;
- un file con un campo inventato → il **nome del campo** nel messaggio (story 67);
- un file con `schema_version: 2` → «non supportata: questa NOVA legge fino a 1». È l'unica metà della story 66 che oggi si può provare: uno schema *precedente* non esiste, perché `MIGRAZIONI` è vuoto;
- `⌘S` su un telaio disegnato da zero → `aste.0.sezione: campo obbligatorio`, atteso;
- `⌘P` e `⌘⇧S` → il browser se li tiene: non li abbiamo rubati.

- [ ] **Step 5: Le due larghezze**

1280 e 1920 px: nessuna sovrapposizione, nessun testo tagliato, la colonna sinistra regge il campo percorso e i recenti con i puntini di troncamento.

- [ ] **Step 6: Commit finale e PR**

PR verso **`feat/interfaccia`**, non verso `main`.

## Fuori da questa seduta

Catalogo delle sezioni, editor delle barre, materiali con veste (**11b**) · azioni, carichi, combinazioni, palette `⌘K`, cronologia visibile (**11c**) · Check Model e corsa (12) · risultati e diagrammi (13).

`⌘Z` non entra qui: il magazzino c'è dalla giornata 10, ma la sua interfaccia è della 11c, insieme alla palette.
