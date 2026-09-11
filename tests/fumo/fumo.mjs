// I copioni del test di fumo: pytest li lancia con un JSON in argv[2] e legge una riga JSON su
// stdout. Ogni copione preme tasti veri e legge il DOM vero: è l'unico test di `app.js`.
import { writeFileSync } from "node:fs";
import { apri, tasto, scrivi, ev, cmd, finche, viewport, erroriRaccolti, chiudi, pausa } from "./cdp.mjs";

const arg = JSON.parse(process.argv[2] ?? "{}");
const url = `http://127.0.0.1:${arg.porta}/`;

// Le coppie di `<text>` dell'SVG del piano che si sovrappongono, come rettangoli a schermo.
// I bordi che si toccano non contano. Vuoto = nessuna sovrapposizione.
const SOVRAPPOSTE = `(() => {
  const r = [...document.querySelectorAll("#piano svg text")].map((t) => [t.textContent, t.getBoundingClientRect()]);
  const s = [];
  for (let i = 0; i < r.length; i++) for (let j = i + 1; j < r.length; j++) {
    const a = r[i][1], b = r[j][1];
    if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) s.push([r[i][0], r[j][0]]);
  }
  return s;
})()`;

// Apri la fixture, corri, aspetta il blocco «Risultati». Scritta una volta per i due copioni
// della 14a invece che come sesta copia della sequenza.
//
// **R14** — l'attesa della corsa sta **sotto** il tetto di `copione(...)` (120 s,
// `tests/test_fumo_chrome.py:101`): un `finche` più lungo non aspetterebbe di più, farebbe morire
// node a metà con un `TimeoutExpired` che parla del processo e non della corsa. Il MURO 1 corre
// la modale in 0,3 s e la pushover in ≈ 2 s (`docs/caso-studio/README.md:208`).
const apriECorri = async (fixture, dimensioni) => {
  await apri(url, arg.cdp, dimensioni);
  await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(fixture)}; return true; })()`);
  await tasto("o", { meta: true });
  await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
  await tasto("Enter", { meta: true });   // ⌘⏎: corri
  await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 100000, 500);
  await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
};

// Il menu del caso come lo usa il mouse: `change` è l'evento che `esito.js` ascolta.
const scegliCaso = (valore) => ev(`(() => { const s = document.getElementById("risultati-caso"); s.value = ${JSON.stringify(valore)}; s.dispatchEvent(new Event("change", { bubbles: true })); return true; })()`);

const BADGE = `document.querySelector("#piano .risultati-badge").textContent`;

// Se un elemento in pixel sta dentro il suo riquadro, misurato col rettangolo vero del browser.
// A 1280 px la colonna del piano è ~430 px: il badge della pushover e quello di un modo a forma
// nulla ne uscivano a sinistra, tagliati proprio dove il testo comincia («er · passo…»), e il
// numero del taglio massimo della curva usciva «2 kN» da «72,12 kN» — un numero diverso, e
// plausibile. Mezzo pixel di tolleranza: i bordi che combaciano non sono un taglio.
const staDentro = (sel, contenitore) => ev(`(() => {
  const p = document.querySelector(${JSON.stringify(contenitore)}).getBoundingClientRect();
  const r = document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect();
  return r.left >= p.left - 0.5 && r.right <= p.right + 0.5;
})()`);

// La misura **resa** di un attributo SVG, la più piccola fra gli elementi: attributo × `getScreenCTM().a`,
// cioè in pixel dello schermo e non in millimetri del `viewBox`. `null` se non c'è nessun elemento.
const reso = (sel, attr, fattore = 1) => ev(`(() => { const v = [...document.querySelectorAll(${JSON.stringify(sel)})]
  .map((e) => parseFloat(e.getAttribute(${JSON.stringify(attr)})) * e.getScreenCTM().a * ${fattore}); return v.length ? Math.min(...v) : null; })()`);
const ETICHETTE_NODI = ["#piano svg g[data-tipo=nodo] text", "font-size"];
const ACCESA = `document.body.hasAttribute("data-presentazione")`;
const COLORI = `(() => { const l = document.querySelector("#piano .risultati-colori"); return l && !l.hidden ? l.textContent : null; })()`;

// Trenta intervalli fra fotogrammi, in ms. R5 aveva misurato `piano.disegna` nel DOM finto, che è
// un **pavimento** e non il costo in pagina: qui il numero è quello del browser vero, e la
// domanda a cui risponde è se il ridisegno sfori il budget di un fotogramma (16,7 ms a 60 Hz).
// Si legge due volte — animazione che gira e animazione ferma — perché è la differenza fra le due
// a dire quanto costa il nostro giro, non il valore assoluto (che il vsync tiene fermo comunque).
const INTERVALLI = `new Promise((ok) => { const t = []; const g = () => { t.push(performance.now()); if (t.length < 31) requestAnimationFrame(g); else ok(t.slice(1).map((v, i) => v - t[i])); }; requestAnimationFrame(g); })`;
const riassunto = (v) => ({ media: Math.round(v.reduce((a, b) => a + b, 0) / v.length * 100) / 100,
                            massimo: Math.round(Math.max(...v) * 100) / 100 });

const COPIONI = {
  // La pagina si apre, la tastiera risponde dal primo secondo, un nodo si posa da tastiera.
  async pagina() {
    await apri(url, arg.cdp);
    await tasto("n"); await scrivi("0; 0"); await tasto("Enter");
    const cerchi = await finche(`document.querySelectorAll("#piano svg circle").length`, 5000);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    const albero = await ev(`document.getElementById("albero-elenco").textContent`);
    return { cerchi, messaggio, albero };
  },

  // Apre un modello, lo corre, sceglie una vista, legge le etichette del piano e cerca le
  // sovrapposizioni fra i `<text>` a ogni larghezza chiesta.
  async risultati() {
    await apri(url, arg.cdp);
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await tasto("Enter", { meta: true });   // ⌘⏎: corri
    const ultima = await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 90000, 500);
    await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
    await tasto(arg.vista ?? "2");
    await pausa(300);
    const etichette = await ev(`[...document.querySelectorAll("#piano svg g.risultati text")].map((t) => t.textContent)`);
    const badge = await ev(`document.querySelector("#piano .risultati-badge").textContent`);
    const sovrapposte = {};
    for (const w of arg.larghezze ?? [1280, 1920]) {
      await viewport(w, Math.round(w * 0.625), 1);
      await pausa(300);
      sovrapposte[String(w)] = await ev(SOVRAPPOSTE);
    }
    // Lo zoom 200 %: 640×400 con dpr 2, come nelle giornate 11c-12.
    await viewport(640, 400, 2); await pausa(300);
    sovrapposte.zoom200 = await ev(SOVRAPPOSTE);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { ultima, etichette, badge, sovrapposte, messaggio };
  },

  // `app.js` non ha un file di test suo: il banco di prova è qui. Tre copioni per tre cuciture
  // che nessun test JS tocca — il campo di comando che perde il fuoco, l'azzeramento dei
  // risultati quando cambia il modello, e la verifica che non li butta via.

  // Il campo di comando aperto e **senza fuoco**: le cifre della vista non devono finirci dentro
  // né posare il nodo che si stava scrivendo. È la cucitura fra `tastiera.js` e il campo.
  async campoSenzaFuoco() {
    await apri(url, arg.cdp);
    await tasto("n");
    await scrivi("0; 0");
    const prima = await ev(`document.querySelectorAll("#piano svg circle").length`);
    await ev(`document.activeElement.blur()`);
    await pausa(100);
    await tasto("2");
    await pausa(200);
    return {
      prima,
      dopo: await ev(`document.querySelectorAll("#piano svg circle").length`),
      campo: await ev(`document.getElementById("comando-campo").value`),
      messaggio: await ev(`document.getElementById("messaggio").textContent`),
      strati: await ev(`document.querySelectorAll("#piano svg g.risultati").length`),
    };
  },

  // Aprire un altro modello butta i risultati della corsa di prima: sono di un altro telaio, e
  // mostrarli sopra questo sarebbe il difetto peggiore che ci sia — numeri veri, telaio sbagliato.
  async azzera() {
    await apri(url, arg.cdp);
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await tasto("Enter", { meta: true });
    await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 90000, 500);
    await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
    await tasto("2");
    await pausa(200);
    const conRisultati = {
      controlli: await ev(`!document.getElementById("risultati-controlli").hidden`),
      strati: await ev(`document.querySelectorAll("#piano svg g.risultati").length`),
    };
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.secondo)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 2`, 10000);
    await pausa(300);
    return {
      conRisultati,
      dopoApertura: {
        controlli: await ev(`!document.getElementById("risultati-controlli").hidden`),
        strati: await ev(`document.querySelectorAll("#piano svg g.risultati").length`),
        vuoto: await ev(`!document.getElementById("risultati-vuoto").hidden`),
        // Anche il «Confronto» parla della corsa di prima: i percorsi precompilati puntano alla
        // cartella di un altro telaio, e confrontarli sarebbe numeri veri sul modello sbagliato.
        confrontoVuoto: await ev(`!document.getElementById("confronto-vuoto").hidden`),
        confrontoTelaio: await ev(`document.getElementById("confronto-telaio").value`),
        confrontoSolido: await ev(`document.getElementById("confronto-solido").value`),
      },
      messaggio: await ev(`document.getElementById("messaggio").textContent`),
    };
  },

  // `⇧⌘⏎` verifica il modello: non è una corsa nuova e non deve toccare i risultati in vista.
  async verifica() {
    await apri(url, arg.cdp);
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await tasto("Enter", { meta: true });
    await finche(`(() => { const t = document.getElementById("corsa-ultima").textContent; return t.startsWith("corsa") ? t : ""; })()`, 90000, 500);
    await finche(`!document.getElementById("risultati-controlli").hidden`, 5000);
    await tasto("2");
    await pausa(200);
    const prima = {
      poligoni: await ev(`document.querySelectorAll("#piano svg g.risultati polygon").length`),
      badge: await ev(`document.querySelector("#piano .risultati-badge").textContent`),
    };
    await tasto("Enter", { meta: true, shift: true });
    await pausa(800);
    return {
      prima,
      dopo: {
        poligoni: await ev(`document.querySelectorAll("#piano svg g.risultati polygon").length`),
        badge: await ev(`document.querySelector("#piano .risultati-badge").textContent`),
        controlli: await ev(`!document.getElementById("risultati-controlli").hidden`),
      },
      messaggio: await ev(`document.getElementById("messaggio").textContent`),
    };
  },

  // La 14a. Modale sul MURO 1: si sceglie il modo 2 dal menu, la deformata si muove da sola;
  // Spazio la ferma e il badge lo dice. Che il piano si muova non lo può vedere nessun test JS —
  // ci vogliono due letture a 160 ms di distanza del `points` vero.
  async modale() {
    await apriECorri(arg.fixture);
    const voci = await ev(`[...document.querySelectorAll("#risultati-caso option")].map((o) => o.textContent)`);
    const statico = await ev(`document.querySelector("#risultati-caso option").value`);
    // **Tutte** le polilinee, non la prima: l'asta 1 del MURO 1 è il cordolo di base fra i due
    // nodi incastrati, e nel modo 2 la sua forma è zero — guardare quella sola direbbe «ferma»
    // di un'animazione che sta andando. Misurato l'11/09. Dalla 15a la deformata fresca è il bordo
    // `polyline.deformata-bordo` sotto i tratti in viridis: `polyline.deformata` resta solo da stantia.
    const punti = () => ev(`[...document.querySelectorAll("#piano svg polyline.deformata-bordo")].map((p) => p.getAttribute("points")).join("|")`);
    const fermo = async () => { const x = await punti(); await pausa(160); return x === await punti(); };

    // Spazio sul caso statico di partenza: non c'è animazione da fermare, e il messaggio lo dice.
    await tasto(" ");
    await pausa(150);
    const senzaModo = await ev(`document.getElementById("messaggio").textContent`);

    await scegliCaso("modo:2");
    await pausa(400);
    const a = await punti(); await pausa(160); const b = await punti();
    const badge = await ev(BADGE);
    // Senza la pushover scelta `←`/`→` restano al browser: nessun `preventDefault`, o si
    // porterebbe via lo scorrimento della pagina a chi sta solo guardando un modo.
    const frecciaLibera = await ev(`(() => { const e = new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }); document.body.dispatchEvent(e); return e.defaultPrevented; })()`);
    const conAnimazione = riassunto(await ev(INTERVALLI));

    await tasto(" ");
    await pausa(200);
    const ferma = await fermo();
    const badgeFerma = await ev(BADGE);
    const senzaAnimazione = riassunto(await ev(INTERVALLI));
    const badgeDentro = await staDentro("#piano .risultati-badge", "#piano");

    // Il `resize` ridisegna con la **stessa** fase su cui il modo si è fermato, non con 1: con 1
    // la forma saltava al massimo e ci restava. Due giri di viewport che tornano alla misura di
    // partenza — la geometria finale è identica, quindi i punti devono esserlo.
    const primaDelResize = await punti();
    await viewport(1281, 800, 1); await pausa(200);
    await viewport(1280, 800, 1); await pausa(250);
    const resizeTieneLaFase = (await punti()) === primaDelResize;

    // R2: nove modi su 42 del MURO 1 hanno la forma nulla sui nodi del modello. Si mostrano lo
    // stesso, il badge dice perché, e nel disegno non compare un `NaN`. È anche il badge più
    // lungo che il piano possa ricevere: se ci sta questo, ci stanno tutti.
    await scegliCaso("modo:6");
    await pausa(300);
    const badgeNulla = await ev(BADGE);
    const badgeNullaDentro = await staDentro("#piano .risultati-badge", "#piano");
    const nan = (await punti()).includes("NaN");

    // Spazio riprende, poi il caso torna statico: l'animazione si ferma da sé, e nessun
    // fotogramma orfano continua a ridisegnare la forma di prima.
    await scegliCaso("modo:2");
    await tasto(" ");
    await pausa(200);
    const riparte = !(await fermo());
    await scegliCaso(statico);
    await pausa(200);
    const fermaDopoCambio = await fermo();

    // R13/D2a: `prefers-reduced-motion: reduce` spegne il moto e il badge dice perché. La
    // preferenza si raccoglie al gesto dopo — qui il gesto è la scelta del caso.
    await cmd("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
    await scegliCaso("modo:2");
    await pausa(300);
    const badgeRidotto = await ev(BADGE);
    const fermaRidotto = await fermo();
    await tasto(" ");   // Spazio con il moto ridotto: alterna lo stato, ma non anima niente
    await pausa(200);
    const fermaRidottoDopoSpazio = await fermo();

    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { voci, senzaModo, siMuove: a !== b, frecciaLibera, ferma, badge, badgeFerma,
             badgeNulla, nan, riparte, fermaDopoCambio, badgeRidotto, fermaRidotto,
             fermaRidottoDopoSpazio, badgeDentro, badgeNullaDentro, resizeTieneLaFase,
             fotogramma: { conAnimazione, senzaAnimazione }, messaggio };
  },

  // Pushover sul MURO 1: il caso «pushover», la curva nella striscia, `←`/`→` sui passi, il clic
  // sulla striscia, lo stato delle sezioni e la sua legenda.
  async pushover() {
    await apriECorri(arg.fixture);
    await scegliCaso("pushover");
    await pausa(300);
    const badge1 = await ev(BADGE);
    const colori1 = await ev(COLORI);
    const cerchi = await ev(`document.querySelectorAll("#srotolato circle.passo").length`);
    await tasto("ArrowLeft"); await tasto("ArrowLeft"); await tasto("ArrowRight");
    await pausa(200);
    const badge2 = await ev(BADGE);
    // R11: il bersaglio del clic è il `<rect>` a tutta striscia, non i cerchi da 2,5 px — un
    // clic su un cerchio non arriva al listener, che sta su un fratello. `offsetX` a zero cade
    // sul passo più vicino all'origine, cioè il primo.
    await ev(`(() => { document.querySelector("#srotolato rect.passi").dispatchEvent(new MouseEvent("click", { bubbles: true })); return true; })()`);
    await pausa(200);
    const badge3 = await ev(BADGE);
    const colori3 = await ev(COLORI);
    const stati = await ev(`document.querySelectorAll("#piano svg circle.stato").length`);
    const legenda = await ev(`document.querySelector("#piano .risultati-legenda").hidden`);
    const sovrapposte = await ev(SOVRAPPOSTE);
    const dentro = { badge: await staDentro("#piano .risultati-badge", "#piano"),
                     legenda: await staDentro("#piano .risultati-legenda", "#piano"),
                     taglio: await staDentro("#srotolato svg text:nth-of-type(3)", "#srotolato") };
    // La guardia `!modo`: con un ghost aperto la freccia è del gesto, non dello scrubber. Il
    // ghost più economico da aprire è l'asta (`G` sceglie un nodo, `A` apre il modo), e
    // `ruotaGhost` l'asta non la gira — quindi la freccia non deve fare **niente**, e il passo
    // resta dov'è. Ultimo blocco del copione: `Esc` lo chiude, ma niente qui sotto ci conta.
    await tasto("g"); await tasto("a"); await tasto("ArrowRight");
    await pausa(200);
    const badgeConGhost = await ev(BADGE);
    await tasto("Escape");
    await pausa(150);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { badge1, badge2, badge3, badgeConGhost, colori1, colori3, cerchi, stati, legenda, dentro, sovrapposte, messaggio };
  },

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
    const didascalia = await ev(`document.getElementById("confronto-didascalia").textContent`);
    const provenienza = await ev(`document.getElementById("confronto-provenienza").textContent`);
    const percorso = await ev(`document.getElementById("confronto-percorso").textContent`);
    const abaqusC1 = await ev(`(() => { const r = [...document.querySelectorAll("#confronto-corpo tr")].find((t) => t.children[0].textContent === "reazione_z" && t.children[1].textContent === "C1"); return r ? r.children[4].textContent : null; })()`);
    const scorrePagina = await ev(`document.documentElement.scrollWidth > window.innerWidth`);
    const dentro = await staDentro("#confronto-scorri", "#pannello");
    const rossi = await ev(`[...document.querySelectorAll("#confronto *")].filter((e) => getComputedStyle(e).color === "rgb(184, 50, 30)").length`);
    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { telaio, nodi, casi, json, righe, prima, colonne, stato, note, didascalia, provenienza, percorso, abaqusC1, scorrePagina, dentro, rossi, messaggio };
  },

  // Il modo presentazione sul MURO 1 a 1920×1080 (story 62): P entra, le misure rese stanno sopra le
  // soglie, niente si sovrappone, la pagina non scorre; in scala di grigi i doppi canali restano
  // (story 63); Esc esce. Le misure si leggono sul **reso**: attributo × `getScreenCTM().a`.
  async presentazione() {
    await apriECorri(arg.fixture, { larghezza: 1920, altezza: 1080 });
    const bottoneFuori = await ev(`getComputedStyle(document.getElementById("riapri-pannelli")).display`);
    await tasto("p");
    await pausa(400);
    const misure = {
      etichette: await reso(...ETICHETTE_NODI),
      aste: await reso("#piano svg line[data-tipo=asta]", "stroke-width"),
      nodi: await reso("#piano svg g[data-tipo=nodo] circle", "r", 2),
      striscia: await ev(`parseFloat(getComputedStyle(document.getElementById("risultati-caso")).fontSize)`),
    };
    const nascosti = await ev(`["colonna", "barra", "storia-elenco"].map((id) => getComputedStyle(document.getElementById(id)).display === "none" || document.getElementById(id).offsetParent === null)`);
    const strisciaSotto = await ev(`document.getElementById("pannello").getBoundingClientRect().top >= document.getElementById("viste").getBoundingClientRect().bottom - 1`);
    const altezzaStriscia = await ev(`document.getElementById("pannello").getBoundingClientRect().height`);
    const piano = await ev(`[document.getElementById("piano").clientWidth, document.getElementById("piano").clientHeight]`);
    const proporzione = await ev(`document.getElementById("piano").clientWidth / document.getElementById("spazio").clientWidth`);
    const sovrapposte = await ev(SOVRAPPOSTE);
    const scorre = await ev(`document.documentElement.scrollWidth > window.innerWidth`);
    const colori = await ev(`new Set([...document.querySelectorAll("#piano svg line.deformata")].map((l) => l.getAttribute("stroke"))).size`);
    const legendaColori = await ev(COLORI);
    // Bianco e nero: il colore spento, i canali che restano. Il badge dice la scala a parole; il nodo
    // scelto è più grosso (non solo rosso); la deformata ha il bordo in inchiostro.
    await ev(`(() => { document.documentElement.style.filter = "grayscale(1)"; return true; })()`);
    await tasto("g");
    await pausa(200);
    const bn = {
      badge: await ev(BADGE),
      raggi: await ev(`[...document.querySelectorAll("#piano svg g[data-tipo=nodo] circle")].map((c) => parseFloat(c.getAttribute("r")))`),
      bordo: await ev(`document.querySelectorAll("#piano svg polyline.deformata-bordo").length`),
    };
    if (arg.screenshot) {
      const { data } = await cmd("Page.captureScreenshot", { format: "png" });
      writeFileSync(arg.screenshot, Buffer.from(data, "base64"));
    }
    await ev(`(() => { document.documentElement.style.filter = ""; return true; })()`);
    // G sceglie un nodo e non apre un gesto, quindi Esc non ha niente da chiudere ed esce dalla presentazione.
    await tasto("Escape");
    await pausa(300);
    const uscito = await ev(`!${ACCESA} && getComputedStyle(document.getElementById("colonna")).display !== "none"`);

    // Un modo in presentazione: la legenda dei colori è la forma normalizzata, 0 … 1, mai in mm.
    await tasto("p");
    await scegliCaso("modo:2");
    await pausa(400);
    const legendaModo = await ev(COLORI);

    // Il menu del caso in aula: scelto col mouse, il fuoco resta lì. P cerca nel menu e non cambia
    // layout; Esc esce lo stesso.
    await ev(`(() => { document.getElementById("risultati-caso").focus(); return true; })()`);
    await tasto("p");
    await pausa(150);
    const menu = { pTiene: await ev(`${ACCESA} && document.activeElement.id === "risultati-caso"`) };
    await tasto("Escape");
    await pausa(300);
    menu.escEsce = await ev(`!${ACCESA}`);

    const messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return { bottoneFuori, misure, nascosti, strisciaSotto, altezzaStriscia, piano, proporzione, sovrapposte, scorre,
             colori, legendaColori, bn, uscito, legendaModo, menu, messaggio };
  },

  // I bordi della presentazione, senza corsa: il campo del percorso, il bottone «pannelli», il ghost
  // dell'estrusione, Esc col campo di comando aperto, «apri» e il ridimensionamento dentro la
  // presentazione, i pannelli aperti con una selezione.
  async presentazioneBordi() {
    await apri(url, arg.cdp, { larghezza: 1920, altezza: 1080 });
    const acceso = () => ev(ACCESA);
    const nascosto = (id) => `(getComputedStyle(document.getElementById("${id}")).display === "none" || document.getElementById("${id}").offsetParent === null)`;
    const t = {};
    t.bottoneFuori = await ev(`getComputedStyle(document.getElementById("riapri-pannelli")).display`);

    // P col fuoco nel campo del percorso: la lettera va nel campo.
    await ev(`(() => { document.getElementById("file-percorso").focus(); return true; })()`);
    await tasto("p");
    t.campo = { valore: await ev(`document.getElementById("file-percorso").value`), acceso: await acceso() };
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ""; c.blur(); return true; })()`);

    // P senza nessuna corsa: la striscia porta lo stato vuoto di «Risultati».
    await tasto("p");
    await pausa(300);
    t.senzaCorsa = {
      acceso: await acceso(),
      vuoto: await ev(`parseFloat(getComputedStyle(document.getElementById("risultati-vuoto")).fontSize)`),
      visibile: await ev(`document.getElementById("risultati-vuoto").offsetParent !== null`),
      altezza: await ev(`document.getElementById("pannello").getBoundingClientRect().height`),
      bottone: await ev(`getComputedStyle(document.getElementById("riapri-pannelli")).display`),
    };

    // P col fuoco sul bottone «pannelli»: un bottone si tiene solo Invio, Spazio e ⌫, quindi P alterna.
    await ev(`(() => { document.getElementById("riapri-pannelli").focus(); return true; })()`);
    await tasto("p");
    await pausa(200);
    t.pSulBottone = !(await acceso());
    await ev(`(() => { document.activeElement.blur(); return true; })()`);

    // «apri» un modello dentro la presentazione: resta accesa, e le etichette restano quelle dell'aula.
    await tasto("p");
    await ev(`(() => { const c = document.getElementById("file-percorso"); c.value = ${JSON.stringify(arg.fixture)}; return true; })()`);
    await tasto("o", { meta: true });
    await finche(`document.querySelectorAll("#piano svg circle").length > 0`, 10000);
    await pausa(200);
    t.aperto = { acceso: await acceso(), etichette: await reso(...ETICHETTE_NODI) };

    // La finestra ridimensionata: il `resize` ridisegna il piano, e le variabili lette sul `body` restano.
    await viewport(1600, 900, 1);
    await pausa(300);
    t.ridimensionato = await reso(...ETICHETTE_NODI);
    await viewport(1920, 1080, 1);
    await pausa(300);

    // Esc col campo di comando aperto: il primo chiude il campo e resta, il secondo esce.
    await tasto("n");
    await pausa(150);
    const campoAperto = await ev(`!document.getElementById("comando").hidden`);
    await tasto("Escape");
    await pausa(200);
    t.primoEsc = { campoAperto, acceso: await acceso(), campoChiuso: await ev(`document.getElementById("comando").hidden`) };
    await tasto("Escape");
    await pausa(200);
    t.secondoEsc = !(await acceso());

    // Il ghost dell'estrusione aperto, col fuoco fuori dal campo: P torna al campo e non cambia layout.
    await tasto("g");
    await tasto("b");
    await pausa(150);
    await ev(`(() => { document.activeElement.blur(); return true; })()`);
    await tasto("p");
    await pausa(200);
    t.ghost = { acceso: await acceso(), campoAperto: await ev(`!document.getElementById("comando").hidden`) };
    await tasto("Escape");
    await pausa(200);

    // I pannelli aperti con una selezione: albero e ispettore tornano, «Niente di selezionato» e la
    // Storia restano nascosti.
    await tasto("p");
    await ev(`(() => { document.getElementById("riapri-pannelli").click(); return true; })()`);
    await pausa(200);
    await tasto("g");
    await pausa(200);
    t.pannelli = {
      colonna: await ev(`!${nascosto("colonna")}`),
      dati: await ev(`!${nascosto("pannello-dati")}`),
      vuotoNascosto: await ev(nascosto("pannello-vuoto")),
      storiaNascosta: await ev(nascosto("storia-elenco")),
      premuto: await ev(`document.getElementById("riapri-pannelli").getAttribute("aria-pressed")`),
      scorre: await ev(`document.documentElement.scrollWidth > window.innerWidth`),
    };
    // Uscire con i pannelli aperti li chiude: rientrando sono di nuovo ritratti.
    await tasto("Escape");
    await pausa(200);
    t.uscitoConPannelli = { acceso: await acceso(), pannelli: await ev(`document.body.hasAttribute("data-pannelli")`),
                            premuto: await ev(`document.getElementById("riapri-pannelli").getAttribute("aria-pressed")`) };
    await tasto("p");
    await pausa(200);
    t.rientro = { acceso: await acceso(), colonna: await ev(nascosto("colonna")) };
    await tasto("p");
    t.messaggio = await ev(`document.getElementById("messaggio").textContent`);
    return t;
  },
};

let esito;
try {
  const trovato = await COPIONI[arg.copione]();
  esito = { ok: true, trovato, errori: erroriRaccolti() };
} catch (e) {
  esito = { ok: false, errori: [...erroriRaccolti(), String(e?.stack ?? e)] };
} finally {
  chiudi();
}
process.stdout.write(JSON.stringify(esito) + "\n");
process.exit(0);
