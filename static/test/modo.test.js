import { test } from "node:test";
import assert from "node:assert/strict";
import { ghostDisegnabile, esitoScelta, contestoBarra, ruotaGhost, modoValido,
         puntoDelComando, esitoComando, AVVISO_ESTRUSIONE,
         ghostDelComando, esitoLunghezza } from "../modo.js";

const m = { nodi: [{ id: 1, x: 0, y: 0, z: 0 }, { id: 2, x: 1000, y: 0, z: 2000 }] };

// --- modoValido (giornata 11c: un annulla non lascia un modo appeso) --------
// Mutante 5 del brief: annullare non chiude un modo aperto, che resta appeso a un nodo
// sparito. Estratta da `app.js` (già inline in `ridisegna`) per lo stesso motivo di
// `ghostDisegnabile` & co.: testabile in Node solo fuori dal modulo che tocca il DOM.

test("modoValido: nessun modo resta nessun modo", () => {
  assert.equal(modoValido(m, null), null);
});

test("modoValido: il nodo di partenza sparito chiude il modo, non lo lascia appeso", () => {
  const modo = { tipo: "estrusione", da: 99, dx: 0, dz: 3000 };
  assert.equal(modoValido(m, modo), null);
});

test("modoValido: in asta, il secondo nodo sparito torna a `a: null` invece di restare appeso", () => {
  const modo = { tipo: "asta", da: 1, a: 99 };
  assert.deepEqual(modoValido(m, modo), { tipo: "asta", da: 1, a: null });
});

test("modoValido: coi nodi ancora tutti presenti il modo non cambia", () => {
  const modo = { tipo: "asta", da: 1, a: 2 };
  assert.deepEqual(modoValido(m, modo), modo);
});

// --- ghostDisegnabile -------------------------------------------------------

test("ghostDisegnabile: nessun modo → null, non solleva", () => {
  assert.equal(ghostDisegnabile(m, null), null);
});

test("ghostDisegnabile: estrusione → il ghost è dx/dz del modo, uguale al nodo di arrivo", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 500, dz: -300 };
  assert.deepEqual(ghostDisegnabile(m, modo), { da: 1, dx: 500, dz: -300 });
});

test("ghostDisegnabile: asta con secondo nodo scelto → dx/dz da 'da' verso 'a', non invertiti", () => {
  const modo = { tipo: "asta", da: 1, a: 2 };
  // mutante 4: da - a invece di a - da darebbe {dx:-1000, dz:-2000}
  assert.deepEqual(ghostDisegnabile(m, modo), { da: 1, dx: 1000, dz: 2000 });
});

test("ghostDisegnabile: asta con a === null → null (niente ghost finché non c'è il secondo nodo)", () => {
  const modo = { tipo: "asta", da: 1, a: null };
  assert.equal(ghostDisegnabile(m, modo), null);
});

test("ghostDisegnabile: asta il cui nodo di partenza è sparito dal modello → null, non solleva", () => {
  const modo = { tipo: "asta", da: 99, a: 2 };
  assert.equal(ghostDisegnabile(m, modo), null);
});

test("ghostDisegnabile: asta il cui nodo d'arrivo è sparito dal modello → null, non solleva", () => {
  const modo = { tipo: "asta", da: 1, a: 99 };
  assert.equal(ghostDisegnabile(m, modo), null);
});

// --- esitoScelta -------------------------------------------------------------

test("esitoScelta: in estrusione, bersaglio nodo → non permesso, messaggio dell'estrusione in corso", () => {
  const e = esitoScelta({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "nodo");
  assert.equal(e.permesso, false);
  assert.match(e.messaggio, /estrusione in corso/);
  assert.equal(e.aggiornaA, false);
});

test("esitoScelta: in asta, un bersaglio che non è un nodo → non permesso, e la frase dice cosa serve", () => {
  const e = esitoScelta({ tipo: "asta", da: 1, a: null }, "asta");
  assert.equal(e.permesso, false);
  assert.match(e.messaggio, /scegli un nodo: in modo asta serve il secondo nodo/);
  assert.equal(e.aggiornaA, false);
});

test("esitoScelta: in asta, bersaglio nodo → permesso, modo.a va aggiornato", () => {
  const e = esitoScelta({ tipo: "asta", da: 1, a: null }, "nodo");
  assert.equal(e.permesso, true);
  assert.equal(e.messaggio, null);
  assert.equal(e.aggiornaA, true);
});

test("esitoScelta: nessun modo aperto → permesso, nessun messaggio, niente da aggiornare", () => {
  const e = esitoScelta(null, "nodo");
  assert.equal(e.permesso, true);
  assert.equal(e.messaggio, null);
  assert.equal(e.aggiornaA, false);
});

// --- contestoBarra -------------------------------------------------------------

test("contestoBarra: senza modo e senza selezione → 'sempre'", () => {
  assert.equal(contestoBarra(null, null), "sempre");
});

test("contestoBarra: senza modo, con selezione → 'selezione'", () => {
  assert.equal(contestoBarra(null, { tipo: "nodo", id: 1 }), "selezione");
});

test("contestoBarra: modo estrusione → 'ghost', non 'asta'", () => {
  assert.equal(contestoBarra({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, { tipo: "nodo", id: 1 }), "ghost");
});

test("contestoBarra: modo asta → 'asta', non 'ghost' (la barra deve promettere G, non solo Invio/Esc)", () => {
  assert.equal(contestoBarra({ tipo: "asta", da: 1, a: null }, { tipo: "nodo", id: 1 }), "asta");
});

test("contestoBarra: col campo aperto → 'comando', e vince su tutto il resto", () => {
  assert.equal(contestoBarra(null, null, { testo: "" }), "comando");
  assert.equal(contestoBarra(null, { tipo: "nodo", id: 1 }, { testo: "0; 3" }), "comando");
});

// --- ruotaGhost (B2) -----------------------------------------------------------
// La decisione delle frecce sta qui e non in un secondo listener di `app.js`: due `keydown`
// sulla stessa `window` con regole d'ingresso diverse erano la causa, non il sintomo.

test("ruotaGhost: ogni freccia gira il ghost tenendone la lunghezza", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 0, dz: 3000 };
  assert.deepEqual(ruotaGhost(modo, "ArrowUp"), { ...modo, dx: 0, dz: 3000 });
  assert.deepEqual(ruotaGhost(modo, "ArrowDown"), { ...modo, dx: 0, dz: -3000 });
  assert.deepEqual(ruotaGhost(modo, "ArrowRight"), { ...modo, dx: 3000, dz: 0 });
  assert.deepEqual(ruotaGhost(modo, "ArrowLeft"), { ...modo, dx: -3000, dz: 0 });
});

test("ruotaGhost: la lunghezza è quella del ghost intero, non di una sua componente", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 3000, dz: 4000 };
  assert.deepEqual(ruotaGhost(modo, "ArrowRight"), { ...modo, dx: 5000, dz: 0 });
});

test("ruotaGhost: senza estrusione aperta la freccia non è nostra — resta al browser", () => {
  assert.equal(ruotaGhost(null, "ArrowUp"), null);
  assert.equal(ruotaGhost(undefined, "ArrowUp"), null);
  assert.equal(ruotaGhost({ tipo: "asta", da: 1, a: null }, "ArrowUp"), null);
});

test("ruotaGhost: un tasto che non è una freccia non gira niente", () => {
  assert.equal(ruotaGhost({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "n"), null);
  assert.equal(ruotaGhost({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, undefined), null);
});

test("ruotaGhost: non tocca il modo che riceve", () => {
  const modo = { tipo: "estrusione", da: 1, dx: 0, dz: 3000 };
  ruotaGhost(modo, "ArrowRight");
  assert.deepEqual(modo, { tipo: "estrusione", da: 1, dx: 0, dz: 3000 });
});

// --- E: l'avviso dell'estrusione in corso, una stringa sola --------------------

test("l'avviso dell'estrusione in corso vive in un posto solo", () => {
  assert.equal(esitoScelta({ tipo: "estrusione", da: 1, dx: 0, dz: 1 }, "nodo").messaggio,
               AVVISO_ESTRUSIONE);
  assert.match(AVVISO_ESTRUSIONE, /Invio per confermarla, Esc per annullarla/);
});

// --- F: il campo di comando (giornata 11c, task C1) ----------------------------
// Il campo sostituisce `window.prompt` per N, e il ghost si muove **a ogni tasto**: per
// questo la lettura del testo è pura e sta qui, non dentro `app.js`, che il DOM lo tocca
// già ai primi `const` del modulo. Due funzioni e non una perché le domande sono due, e
// hanno risposte opposte sullo stesso testo: mentre si scrive «si disegna qualcosa?»
// (silenziosa), alla conferma «si esegue qualcosa, e se no cosa dico?».

test("puntoDelComando: «x; z» completo dà il punto", () => {
  assert.deepEqual(puntoDelComando("0; 3000"), { x: 0, z: 3000 });
});

// Mutante 6 del brief: la conferma esegue anche col campo vuoto.
test("puntoDelComando: campo vuoto non è un punto — nessun ghost, e Invio non esegue", () => {
  assert.equal(puntoDelComando(""), null);
  assert.equal(puntoDelComando("   "), null);
  assert.deepEqual(esitoComando(""), { punto: null, messaggio: null });
  assert.deepEqual(esitoComando("   "), { punto: null, messaggio: null });
});

// Mutante 5 del brief: un testo a metà produce un messaggio d'errore mentre si scrive.
test("puntoDelComando: il testo a metà non è un ghost e non è un errore — si sta scrivendo", () => {
  assert.equal(puntoDelComando("0;"), null);
  assert.equal(puntoDelComando("0; "), null);
  assert.equal(puntoDelComando("0"), null, "senza il punto e virgola manca la seconda coordinata");
  // Mentre si scrive il messaggio non esiste come possibilità, non è «esiste ma è vuoto»:
  // la strada del ghost passa solo di qui, e di qui esce un punto o niente. `esitoComando`,
  // che un messaggio ce l'ha, la percorre solo Invio.
  assert.equal(puntoDelComando("0; "), null);
});

test("esitoComando: il testo non valido parla alla conferma, e dice cosa scrivere", () => {
  const esito = esitoComando("pippo");
  assert.equal(esito.punto, null);
  assert.match(esito.messaggio, /coordinate non lette/);
  assert.match(esito.messaggio, /x; z/);
});

test("esitoComando: il testo che si legge torna il punto e nessun messaggio", () => {
  assert.deepEqual(esitoComando("0; 3000"), { punto: { x: 0, z: 3000 }, messaggio: null });
});

// Mutante 3 del brief: il campo usa `leggiNumero` invece di `leggiLunghezza`.
test("puntoDelComando: le unità si leggono — «2,5m» sono 2500 mm", () => {
  assert.deepEqual(puntoDelComando("0; 2,5m"), { x: 0, z: 2500 });
  assert.deepEqual(puntoDelComando("1,5m; 30cm"), { x: 1500, z: 300 });
});

test("puntoDelComando: le espressioni si leggono, con le parentesi", () => {
  assert.deepEqual(puntoDelComando("0; (1+1)*1500"), { x: 0, z: 3000 });
});

test("puntoDelComando: il segno unario si legge — una coordinata negativa è normale", () => {
  assert.deepEqual(puntoDelComando("-2262; 0"), { x: -2262, z: 0 });
  assert.deepEqual(puntoDelComando("0; -3*1000"), { x: 0, z: -3000 });
});

// Il ghost mostra solo ciò che c'è scritto: con tre numeri il terzo sparirebbe in
// silenzio, e l'anteprima direbbe una cosa che il testo non dice.
test("puntoDelComando: più di due coordinate non si legge, non si tronca", () => {
  assert.equal(puntoDelComando("0; 1000; 2000"), null);
});

test("puntoDelComando: un argomento che non è una stringa non solleva", () => {
  assert.equal(puntoDelComando(null), null);
  assert.equal(puntoDelComando(undefined), null);
  assert.equal(puntoDelComando(42), null);
});

// --- C2: lo stesso campo per B, M e R --------------------------------------------
// Tre grammatiche, un campo solo: `estrudi` legge una lunghezza e la stende lungo la
// direzione che danno le frecce, `sposta` legge lo stesso «x; z» di `nodo`, `rinomina`
// legge un nome e non ha nessuna geometria da mostrare.

const versoSu = { tipo: "estrusione", da: 1, dx: 0, dz: 1 };

test("ghostDelComando: campo chiuso → nessun ghost, non solleva", () => {
  assert.equal(ghostDelComando(null, null), null);
  assert.equal(ghostDelComando(undefined, versoSu), null);
});

test("ghostDelComando: `nodo` mostra il punto in anteprima, come prima del task", () => {
  assert.deepEqual(ghostDelComando({ tipo: "nodo", testo: "0; 3000" }, null),
                   { punto: { x: 0, z: 3000 } });
});

// `M` mostra dove il nodo finirà, con la stessa forma di `N`: la grammatica del testo è la
// stessa, e una seconda anteprima sarebbe una cosa in più da imparare per lo stesso gesto.
test("ghostDelComando: `sposta` mostra il punto in anteprima, la stessa forma di `nodo`", () => {
  assert.deepEqual(ghostDelComando({ tipo: "sposta", testo: "1000; 2000", bersaglio: { tipo: "nodo", id: 1 } }, null),
                   { punto: { x: 1000, z: 2000 } });
});

// Mutante 4 del brief: `R` guadagna un ghost che non deve avere.
test("ghostDelComando: `rinomina` non ha ghost, nemmeno con un testo che parrebbe un punto", () => {
  assert.equal(ghostDelComando({ tipo: "rinomina", testo: "piede sinistro" }, null), null);
  assert.equal(ghostDelComando({ tipo: "rinomina", testo: "0; 3000" }, null), null);
});

// I tre comandi della 11b hanno un `;` nella loro grammatica come «x; z», e cadevano nel
// ramo del punto in anteprima: «0,8; 0,9» disegnava un nodo a (0,8; 0,9), che `estensione`
// metteva nel `viewBox` — il piano si ridimensionava a ogni tasto. Un elenco esplicito, e
// il testo di ciascuno preso dal suo esempio.
test("ghostDelComando: `sezione`, `materiale` e `danno` non disegnano niente", () => {
  for (const [tipo, testo] of [["sezione", "300 × 500"], ["materiale", "C25/30"],
                               ["danno", "0,8; 0,9"], ["danno", "0,8; 0,9; martinetto 3"]]) {
    assert.equal(ghostDelComando({ tipo, testo }, null), null, `${tipo}: ${testo}`);
  }
});

// La stessa domanda posta dall'altra parte: un tipo che nessuno ha previsto non deve
// ereditare il punto per il fatto di non essere nell'elenco.
test("ghostDelComando: un tipo sconosciuto non eredita il punto in anteprima", () => {
  assert.equal(ghostDelComando({ tipo: "domani", testo: "0; 3000" }, null), null);
});

// Ingresso degenere: `B` col campo aperto e testo vuoto → nessun ghost.
test("ghostDelComando: `estrudi` col testo vuoto non disegna niente", () => {
  assert.equal(ghostDelComando({ tipo: "estrudi", testo: "" }, versoSu), null);
  assert.equal(ghostDelComando({ tipo: "estrudi", testo: "   " }, versoSu), null);
});

// Ingresso degenere: la lunghezza a metà («30» mentre si scrive «3000») è un ghost buono,
// non un errore — si aggiorna a ogni tasto e nessuno rimprovera chi sta ancora digitando.
test("ghostDelComando: `estrudi` stende la lunghezza scritta lungo la direzione delle frecce", () => {
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "30" }, versoSu), { da: 1, dx: 0, dz: 30 });
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "3000" }, versoSu), { da: 1, dx: 0, dz: 3000 });
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "3000" }, ruotaGhost(versoSu, "ArrowRight")),
                   { da: 1, dx: 3000, dz: 0 });
});

// Il modo tiene la direzione, il campo la lunghezza: il ghost normalizza, così una direzione
// di modulo qualunque non moltiplica due volte quel che si è scritto.
test("ghostDelComando: `estrudi` normalizza la direzione — la lunghezza è quella del testo", () => {
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "1000" }, { tipo: "estrusione", da: 1, dx: 0, dz: 5 }),
                   { da: 1, dx: 0, dz: 1000 });
});

// Mutante 2 del brief: `B` usa `leggiNumero` invece di `leggiLunghezza`.
test("ghostDelComando: `estrudi` legge unità ed espressioni — «(1+1)*1,5m» sono 3000 mm", () => {
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "(1+1)*1,5m" }, versoSu), { da: 1, dx: 0, dz: 3000 });
  assert.deepEqual(ghostDelComando({ tipo: "estrudi", testo: "2,5m" }, versoSu), { da: 1, dx: 0, dz: 2500 });
});

// Ingresso degenere: lunghezza zero o negativa. L'asta lunga zero il modello la rifiuta, e
// una negativa girerebbe il ghost al contrario della freccia — l'unico gesto che resta.
test("ghostDelComando: `estrudi` non disegna una lunghezza zero o negativa", () => {
  assert.equal(ghostDelComando({ tipo: "estrudi", testo: "0" }, versoSu), null);
  assert.equal(ghostDelComando({ tipo: "estrudi", testo: "-3000" }, versoSu), null);
});

test("ghostDelComando: `estrudi` senza un modo da cui prendere la direzione → null, non solleva", () => {
  assert.equal(ghostDelComando({ tipo: "estrudi", testo: "3000" }, null), null);
});

// --- esitoLunghezza: la decisione di Invio mentre si estrude ----------------------

test("esitoLunghezza: campo vuoto non estrude e non parla — si è appena aperto", () => {
  assert.deepEqual(esitoLunghezza(""), { lunghezza: null, messaggio: null });
  assert.deepEqual(esitoLunghezza("   "), { lunghezza: null, messaggio: null });
});

test("esitoLunghezza: zero, negativa e testo illeggibile parlano alla conferma", () => {
  for (const t of ["0", "-3000", "pippo"]) {
    const esito = esitoLunghezza(t);
    assert.equal(esito.lunghezza, null, t);
    assert.match(esito.messaggio, /maggiore di zero/, t);
  }
});

test("esitoLunghezza: la lunghezza che si legge torna in millimetri, unità comprese", () => {
  assert.deepEqual(esitoLunghezza("3000"), { lunghezza: 3000, messaggio: null });
  assert.deepEqual(esitoLunghezza("1,5m"), { lunghezza: 1500, messaggio: null });
});

// --- la barra col campo aperto ---------------------------------------------------
// Mutante 3 del brief: le frecce durante `B` se le mangia il campo. La barra è il primo
// posto dove la promessa si vede, e story 14 vuole stampato solo ciò che funziona.

test("contestoBarra: col campo aperto su `estrudi` la barra promette anche le frecce", () => {
  assert.equal(contestoBarra(versoSu, { tipo: "nodo", id: 1 }, { tipo: "estrudi", testo: "" }),
               "comando-direzione");
});

test("contestoBarra: gli altri comandi del campo non hanno nessuna direzione da dare", () => {
  for (const tipo of ["nodo", "sposta", "rinomina", "sezione", "materiale", "danno"]) {
    assert.equal(contestoBarra(null, { tipo: "nodo", id: 1 }, { tipo, testo: "" }), "comando", tipo);
  }
});

// Cosa torna **oggi** con i due tipi selezionabili nuovi dell'albero, non cosa dovrebbe
// tornare: «selezione», lo stesso di un nodo, quindi la barra promette anche `B`, `A`, `V` e
// `M`, che lì rispondono con un messaggio. Parcheggiato: il contesto per tipo è un cambio di
// `tastiera.js`, non di questa funzione. Il test è qui perché il giorno che cambia si veda.
test("contestoBarra: sezione e materiale selezionati danno «selezione», come un nodo (oggi)", () => {
  assert.equal(contestoBarra(null, { tipo: "sezione", id: 1 }), "selezione");
  assert.equal(contestoBarra(null, { tipo: "materiale", id: 1 }), "selezione");
});
