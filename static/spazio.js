// La vista spaziale, in sola lettura: i gesti stanno nel piano SVG, qui si guarda e si
// riconosce la selezione. three.js è vendorizzato (`vendor/PROVENIENZA.md`): NOVA gira
// senza rete, e un `import` remoto sarebbe una vista che sparisce in aereo.
//
// Se three.js o WebGL non ci sono, questo modulo si dichiara assente e il piano SVG regge
// da solo: una pagina bianca sarebbe il modo peggiore di dirlo.
//
// Le funzioni esportate prima di `creaSpazio` sono pure, senza THREE: `node --test` non ha WebGL
// (`tests/test_js.py` guarda solo funzioni vere, non il DOM), quindi sono l'unico punto da
// cui gli ingressi degeneri di questo modulo si provano fuori dal browser.

import { misureDi } from "./misure.js";
import { coloreSpostamento } from "./risultati.js";

// Stessi valori di `piano.js` (`INCHIOSTRO`, `ROSSO`): non importabili da lì, quel modulo
// non li esporta e non è nello scope di questo task toccarlo.
const INCHIOSTRO = 0x141414;
const ROSSO = 0xb8321e;

const DISTANZA_MINIMA = 4000; // mm: un modello con un nodo solo non detta una distanza

// Un passo di orbita per pressione: 0,12 rad, cioe' ventisei tasti per un giro intero. Lo stesso
// ordine di grandezza del trascinamento, che gira 0,006 rad per pixel di mouse.
const PASSO_ORBITA = 0.12;

/** L'orbita dopo una freccia, o `null` se il tasto non e' una freccia — e allora il `keydown` della
 *  tela lo lascia andare a chi lo aspetta: `P` alla presentazione, `Esc` all'uscita, una lettera al
 *  campo che la sta scrivendo. Il verso e' quello del trascinamento (`pointermove`: theta meno dx,
 *  phi meno dy): lo stesso gesto su due periferiche, un modello mentale solo. `phi` resta nella
 *  banda del trascinamento, 0,05 … pi meno 0,05 — oltre il polo `lookAt` con `up` sull'asse z
 *  ribalta l'inquadratura di scatto. Non muta l'orbita in ingresso: ad applicarla e' chi rende. */
export function orbitaDaTasto({ theta, phi }, tasto, passo = PASSO_ORBITA) {
  const dTheta = tasto === "ArrowLeft" ? passo : tasto === "ArrowRight" ? -passo : 0;
  const dPhi = tasto === "ArrowUp" ? passo : tasto === "ArrowDown" ? -passo : 0;
  if (dTheta === 0 && dPhi === 0) return null;
  return { theta: theta + dTheta, phi: Math.min(Math.PI - 0.05, Math.max(0.05, phi + dPhi)) };
}

/** Larghezza e altezza mai sotto 1px: un contenitore 0×0 (layout non ancora misurato) non
 *  deve produrre un `aspect` a 0 o `Infinity`. */
export function dimensioniSicure(larghezza, altezza) {
  return { w: Math.max(larghezza, 1), h: Math.max(altezza, 1) };
}

export function calcolaAspect(larghezza, altezza) {
  const { w, h } = dimensioniSicure(larghezza, altezza);
  return w / h;
}

/** Centro e distanza di camera da un elenco di nodi. Modello vuoto → centro nell'origine,
 *  distanza minima, nessuna divisione per zero. Un solo nodo → estensione zero, la distanza
 *  resta comunque `distanzaMinima`, mai zero. */
export function calcolaInquadratura(nodi, distanzaMinima = DISTANZA_MINIMA) {
  if (nodi.length === 0) return { centro: { x: 0, y: 0, z: 0 }, distanza: distanzaMinima };
  const xs = nodi.map((n) => n.x), ys = nodi.map((n) => n.y), zs = nodi.map((n) => n.z);
  const centrale = (v) => (Math.min(...v) + Math.max(...v)) / 2;
  const estensione = (v) => Math.max(...v) - Math.min(...v);
  const diagonale = Math.hypot(estensione(xs), estensione(ys), estensione(zs));
  return {
    centro: { x: centrale(xs), y: centrale(ys), z: centrale(zs) },
    distanza: Math.max(distanzaMinima, diagonale * 1.8),
  };
}

/** Millimetri di mondo per pixel CSS a `distanza` dalla camera, con `fov` verticale in gradi e il
 *  riquadro alto `altezza` px. Riquadro non ancora misurato o distanza non finita → 0: i cilindri
 *  escono a spessore nullo fino al primo `rendi` misurato, mai `NaN` o `Infinity` nella scala. */
export function pixelInMondo(distanza, fov, altezza) {
  const k = (2 * distanza * Math.tan((fov * Math.PI) / 360)) / altezza;
  return Number.isFinite(k) ? k : 0;
}

/** I tratti di una polilinea, `a`/`b` come `{x, y, z}` puri (la conversione in `Vector3` sta in
 *  `disegna`), colorati sulla media di |u| dei due capi. Due punti coincidenti o non finiti non
 *  hanno direzione: saltati, o `setFromUnitVectors` riceverebbe un vettore nullo. */
export function tratti(punti, uMax) {
  const fuori = [];
  for (let k = 1; k < punti.length; k++) {
    const p = punti[k - 1], q = punti[k];
    if (!(Math.hypot(q.x - p.x, q.y - p.y, q.z - p.z) > 0)) continue;
    fuori.push({ a: { x: p.x, y: p.y, z: p.z }, b: { x: q.x, y: q.y, z: q.z }, colore: coloreSpostamento((p.u + q.u) / 2, uMax) });
  }
  return fuori;
}

/** Tutti i tratti della deformata. Stantia → `colore: null`, cioè rossi: un colore di viridis su
 *  numeri che non corrispondono più al modello direbbe un valore falso. */
export function trattiDellaDeformata(deformata) {
  if (!deformata) return [];
  // N6: il massimo arriva da `app.js` e basta. Il ripiego di qui e quello di `piano.js` davano lo
  // stesso numero del calcolo di `risultatiInVista` solo finché `u` non porta la scala: tre padroni
  // dello stesso valore, destinati a divergere in silenzio al primo che gliela desse.
  const fuori = (deformata.aste ?? []).flatMap((d) => tratti(d.punti ?? [], deformata.uMax));
  return deformata.stantia ? fuori.map((t) => ({ ...t, colore: null })) : fuori;
}

/** Il capo più lontano dall'occhio, in distanza euclidea. Pura e **condivisa apposta**:
 *  `raggioCilindro` ci prende la misura e la sonda dello spessore ci prende il punto da proiettare.
 *  Se scegliessero capi diversi il diametro reso uscirebbe più sottile del voluto senza che nessuno
 *  se ne accorgesse — un'invariante che stava in un commento e in due conti paralleli, e che ora
 *  regge per costruzione. Elenco vuoto → `null`: nessun `Math.max` su niente. */
export function capoLontano(occhio, estremi) {
  let scelto = null, massima = -1;
  for (const p of estremi ?? []) {
    const d = Math.hypot(p.x - occhio.x, p.y - occhio.y, p.z - occhio.z);
    if (d > massima) { massima = d; scelto = p; }
  }
  return scelto;
}

/** Il diametro in pixel da due ascisse NDC: il centro del cilindro e il suo bordo, distante un
 *  **raggio**. x in NDC copre [-1, 1] sulla larghezza del riquadro, cioè metà larghezza per unità;
 *  quindi lo scarto di un raggio moltiplicato per la larghezza intera è il diametro. Pura perché è
 *  il conto della sonda, e una sonda che sbaglia manda a caccia di un difetto dei cilindri che non
 *  esiste: è già successo (9,48 px letti contro 6,03 veri). */
export const diametroInPixel = (centroX, bordoX, larghezza) => Math.abs(bordoX - centroX) * larghezza;

/** Raggio in mondo di un cilindro che deve uscire `tratto` px di diametro. Misurato sull'estremo
 *  più lontano dall'occhio: la prospettiva ingrossa il capo vicino, e il lontano non scende mai
 *  sotto il voluto. */
export function raggioCilindro(occhio, estremi, fov, altezza, tratto) {
  // ponytail: distanza euclidea, non profondità lungo l'asse della camera: è più grande, quindi il
  // tratto esce appena più spesso del voluto e mai più sottile.
  const p = capoLontano(occhio, estremi);
  if (!p) return 0;
  const lontano = Math.hypot(p.x - occhio.x, p.y - occhio.y, p.z - occhio.z);
  return (pixelInMondo(lontano, fov, altezza) * tratto) / 2;
}

/** La scala da dare a **ogni** figlio della scena perché il suo cilindro esca dello spessore voluto.
 *  Chi non è un cilindro (i punti dei nodi) prende `null`, non uno zero: l'array resta lungo quanto i
 *  figli, e chi lo applica salta il posto invece di scalare a caso. Elenco vuoto → `[]`, nessun
 *  `Math.max` su niente. Pura apposta: senza WebGL il ciclo di `rendi` non si prova, e cancellarlo
 *  lasciava tutti i raggi a 1 mm — aste invisibili — col fumo e i test a unità verdi (#85). */
export function scaleDeiTratti(oggetti, camera, altezza) {
  return oggetti.map((o) => (o.userData?.tratto
    ? raggioCilindro(camera.posizione, o.userData.estremi, camera.fov, altezza, o.userData.tratto)
    : null));
}

/** Non rigetta **mai**: un guasto qui torna uno spazio che si dichiara assente, e il piano
 *  SVG regge da solo. Con la `Promise` respinta il chiamante restava con `spazio = null` e la
 *  pagina continuava a dire «Vista spaziale in caricamento» per sempre — un guasto travestito
 *  da attesa, che è l'opposto di quel che P5 chiede. I due guasti previsti (three.js assente,
 *  WebGL assente) hanno il loro `catch` dentro; questo prende tutto il resto — la scena, i
 *  materiali, il primo `render`. */
export async function creaSpazio(contenitore) {
  try {
    return await costruisci(contenitore);
  } catch (e) {
    return assente(contenitore, "la vista 3D non si è costruita", e);
  }
}

async function costruisci(contenitore) {
  let THREE;
  try {
    THREE = await import("./vendor/three.module.js");
  } catch (e) {
    return assente(contenitore, "three.js non si è caricato da static/vendor/", e);
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true });
  } catch (e) {
    return assente(contenitore, "questo browser non ha WebGL", e);
  }

  const scena = new THREE.Scene();
  scena.background = new THREE.Color(0xdcdad5);
  const camera = new THREE.PerspectiveCamera(45, 1, 1, 1e6);
  contenitore.replaceChildren(renderer.domElement);
  // R5 della critique 15b — un `<canvas>` nudo e' un buco muto: nessun ruolo, nessun nome
  // accessibile, e fuori dal giro di ⇥ (WCAG 1.1.1 e 2.1.1). Il detector non lo vede nemmeno
  // (`docs/ricerca/07-ux-modellatore.md:123`), quindi questi attributi sono l'unica cosa che dica
  // a una tecnologia assistiva che qui c'e' un disegno e cosa disegna.
  //
  // `group` e non `img` (fix round 1): `img` e' un ruolo **statico**, e metterlo nel giro di ⇥
  // dice all'assistive technology «immagine» e all'utente «operabile» — due cose che si
  // contraddicono. `aria-roledescription` rimette la parola giusta al posto di «gruppo». E non
  // `application`: li' l'AT cede tutta la tastiera alla pagina, e qui la tastiera ha quattro
  // tasti soli.
  //
  // Il nome dice **cosa c'e'**, non come si usa: l'istruzione sui tasti stava dentro il nome e
  // un'AT la rileggeva a ogni fuoco.
  renderer.domElement.setAttribute("role", "group");
  renderer.domElement.setAttribute("aria-roledescription", "vista spaziale");
  renderer.domElement.setAttribute("aria-label", "vista spaziale del modello");
  renderer.domElement.tabIndex = 0;

  // Le linee WebGL non si ispessiscono (`linewidth` ignorato quasi ovunque): aste e deformata sono
  // cilindri, tutti sulla **stessa** geometria — alta 1 e di raggio 1 sull'asse y — che `rendi`
  // scala al tratto voluto in pixel. Condivisa: la pulizia di `disegna` non la butta. Senza tappi
  // (`openEnded`): i tappi del bordo, facce posteriori anche loro, tagliano di traverso il colorato
  // del tratto dopo, e con tratti corti la deformata esce a trattini neri (visto in Chrome).
  const cilindro = new THREE.CylinderGeometry(1, 1, 1, 8, 1, true);
  const asseY = new THREE.Vector3(0, 1, 0);
  // Gli appoggi della sonda dello spessore, tenuti qui fuori per non rifarli a ogni giro.
  // ponytail: nessuna misura dietro, ed è innocua — nello stesso fotogramma `disegna` costruisce
  // 68 mesh e qualche centinaio di vettori, e #87 dice che il giro intero non si vede dentro i
  // 16,7 ms: tre oggetti stanno due ordini di grandezza sotto il rumore.
  const destra = new THREE.Vector3(), centroNDC = new THREE.Vector3(), bordoNDC = new THREE.Vector3();
  const inchiostro = new THREE.MeshBasicMaterial({ color: INCHIOSTRO });
  const rosso = new THREE.MeshBasicMaterial({ color: ROSSO });
  // L'ombra dell'indeformata sotto la deformata: l'opacità la dicono le misure, riscritta a ogni `disegna`.
  const inchiostroTenue = new THREE.MeshBasicMaterial({ color: INCHIOSTRO, transparent: true, opacity: 0.3 });
  // Il bordo della deformata: le sole facce posteriori di un cilindro più grosso e coassiale. Il
  // colorato al centro le copre, ai lati restano scure. Con `renderOrder` e le facce anteriori il
  // depth test scarta il colorato, che sta dentro: un tubo tutto nero (misurato in r185).
  const bordo = new THREE.MeshBasicMaterial({ color: INCHIOSTRO, side: THREE.BackSide });
  // I materiali di viridis, uno per colore, **mai** svuotati: il tetto sono i colori che `viridis` può
  // rendere (648 misurati), e buttarli a ogni `disegna` costa 3× il fotogramma e fa ricompilare il
  // programma WebGL.
  const viridisDi = new Map();
  const puntoInchiostro = new THREE.PointsMaterial({ color: INCHIOSTRO, size: 10, sizeAttenuation: false });
  const puntoRosso = new THREE.PointsMaterial({ color: ROSSO, size: 16, sizeAttenuation: false });
  let disegnato = new THREE.Group();
  scena.add(disegnato);

  let orbita = { theta: 0.6, phi: 1.1, distanza: DISTANZA_MINIMA, centro: new THREE.Vector3() };
  // Chi ha mosso la rotella ha detto a che distanza vuole guardare: da lì in poi `inquadra`
  // sposta il centro (il modello cresce) ma non la distanza. Senza questo flag ogni comando
  // richiamerebbe `disegna` → `inquadra`, e la rotella sembrerebbe non funzionare.
  let cameraToccata = false;

  function ridimensiona() {
    const { w, h } = dimensioniSicure(contenitore.clientWidth, contenitore.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio || 1);
    // Senza il terzo argomento three.js scrive anche lo stile del canvas. Con `false` non lo
    // scrive, e su uno schermo retina il canvas resta grande il doppio in pixel CSS:
    // `#spazio { overflow: hidden }` ne taglia via tre quarti, in silenzio.
    renderer.setSize(w, h);
    camera.aspect = calcolaAspect(contenitore.clientWidth, contenitore.clientHeight);
    camera.updateProjectionMatrix();
  }

  function rendi() {
    // Coordinate sferiche con l'asse polare su `z`, perché `z` è l'alto qui come nel modello
    // e nel piano: con l'asse su `y` (il default di three.js) trascinare in su farebbe
    // ruotare attorno alla direzione sbagliata.
    const { theta, phi, distanza, centro } = orbita;
    camera.position.set(
      centro.x + distanza * Math.sin(phi) * Math.cos(theta),
      centro.y + distanza * Math.sin(phi) * Math.sin(theta),
      centro.z + distanza * Math.cos(phi),
    );
    camera.up.set(0, 0, 1);
    camera.lookAt(centro);
    // `near` segue la distanza: fisso a 1 mm, fra il colorato e la parete dietro del bordo restavano
    // pochi passi di profondità, e da lontano la deformata usciva a chiazze nere.
    const near = distanza / 100;
    if (camera.near !== near) { camera.near = near; camera.updateProjectionMatrix(); }
    const figli = disegnato.children;
    const scale = scaleDeiTratti(figli, { posizione: camera.position, fov: camera.fov }, contenitore.clientHeight);
    for (let k = 0; k < figli.length; k++) if (scale[k] !== null) figli[k].scale.x = figli[k].scale.z = scale[k];
    renderer.render(scena, camera);
    // La sonda **dopo** il render, non prima (fix round 1). Legge `matrixWorld` e
    // `matrixWorldInverse` della camera, e chi le aggiorna è il render: `lookAt` in r185 aggiorna
    // la matrice e **poi** scrive il quaternione, quindi prima del render la camera porta la
    // posizione nuova e ancora l'orientamento vecchio. Dopo un trascinamento di 200×60 px il
    // diametro usciva 9,48 px invece di 6,03, e ci restava. Il fumo non se ne accorgeva perché
    // nessun copione trascinava: ora `presentazione` trascina, e quel numero è asserito.
    sonda(figli);
  }

  /** La sonda dello spessore (#85): sul canvas, il diametro **reso** in pixel del primo cilindro e
   *  quello voluto in `--asta-tratto`. È l'unico posto da cui il fumo può vedere se il ciclo qui
   *  sopra è stato applicato davvero: legge `o.scale.x` **dalla mesh**, non il numero appena
   *  calcolato, e lo proietta con la camera vera invece che con `pixelInMondo` — una sonda che
   *  ricalcolasse la formula proverebbe sé stessa. Misurata dall'architect il 13/09 sul canvas di
   *  `#spazio`: 0,332 µs a scrittura, cioè 0,0003 ms per fotogramma, invisibili nei 16,7 ms del
   *  vsync (#87). Nessun cilindro in scena → le due voci **spariscono**: un fotogramma con meno
   *  aste non deve lasciare in giro il numero di quello di prima.
   *
   *  Misura il **primo** cilindro della scena, che oggi è un'asta perché `disegna` cicla le aste
   *  prima della deformata. Tre condizioni implicite, e non stanno scritte altrove: quell'ordine,
   *  nessun'asta selezionata (che porterebbe `--asta-tratto-scelta`) e almeno un'asta nel modello.
   *  Rompendone una la sonda misura un altro cilindro e il numero resta vero, ma non è più quello
   *  dell'asta d'aula — per questo il fumo non dà la colpa al CSS quando `trattoVoluto` non è 6. */
  function sonda(figli) {
    const dati = renderer.domElement.dataset;
    const o = figli.find((f) => f.userData.tratto);
    if (!o) { delete dati.trattoReso; delete dati.trattoVoluto; return; }
    // Lo stesso capo su cui `raggioCilindro` ha preso la misura, e **la stessa funzione**: finché
    // erano due conti paralleli l'invariante viveva in un commento.
    const lontano = capoLontano(camera.position, o.userData.estremi);
    destra.setFromMatrixColumn(camera.matrixWorld, 0);   // l'asse orizzontale della camera: l'offset resta alla stessa profondità
    centroNDC.copy(lontano).project(camera);
    bordoNDC.copy(lontano).addScaledVector(destra, o.scale.x).project(camera);
    dati.trattoReso = diametroInPixel(centroNDC.x, bordoNDC.x, contenitore.clientWidth).toFixed(2);
    dati.trattoVoluto = String(o.userData.tratto);
  }

  // Orbita e zoom a mano: venti righe contro un secondo file vendorizzato per un giro di
  // trascinamento.
  let trascina = null;
  renderer.domElement.addEventListener("pointerdown", (e) => { trascina = { x: e.clientX, y: e.clientY }; });
  window.addEventListener("pointerup", () => { trascina = null; });
  window.addEventListener("pointermove", (e) => {
    if (!trascina) return;
    orbita.theta -= (e.clientX - trascina.x) * 0.006;
    orbita.phi = Math.min(Math.PI - 0.05, Math.max(0.05, orbita.phi - (e.clientY - trascina.y) * 0.006));
    trascina = { x: e.clientX, y: e.clientY };
    rendi();
  });
  renderer.domElement.addEventListener("wheel", (e) => {
    e.preventDefault();
    cameraToccata = true;
    orbita.distanza = Math.max(DISTANZA_MINIMA / 8, orbita.distanza * (e.deltaY > 0 ? 1.1 : 0.9));
    rendi();
  }, { passive: false });
  // Da tastiera (R5): le frecce girano la vista, e nient'altro la tocca. Sulla **tela** e non
  // sulla finestra, cosi' il tasto arriva qui solo quando il fuoco e' qui — chi sta scrivendo nel
  // campo di comando si tiene le sue frecce, che li' muovono il cursore, e l'ingresso degenere si
  // chiude per costruzione invece che con una guardia da ricordare.
  // `stopPropagation` perche' il `keydown` globale sta su `window` (`app.js:912`) e la sua guardia
  // cerca `input, button, select, textarea, [role="button"]`: una tela non e' nessuno di quelli, e
  // senza questa riga `←`/`→` scorrerebbero **anche** i passi della pushover mentre girano la
  // vista — due gesti su un tasto solo. Un tasto che non e' una freccia non viene fermato:
  // `orbitaDaTasto` torna `null`, e `P` resta la presentazione anche col fuoco quaggiu'.
  renderer.domElement.addEventListener("keydown", (e) => {
    const girata = orbitaDaTasto(orbita, e.key);
    if (!girata) return;
    e.preventDefault();
    e.stopPropagation();
    orbita.theta = girata.theta;
    orbita.phi = girata.phi;
    rendi();
  });
  window.addEventListener("resize", () => { ridimensiona(); rendi(); });

  function disegna(m, { selezione = null, deformata = null } = {}) {
    scena.remove(disegnato);
    disegnato.traverse((o) => { if (o.geometry !== cilindro) o.geometry?.dispose(); });
    disegnato = new THREE.Group();

    // Una volta per cambio di layout, non a ogni fotogramma dell'animazione (`misure.js`). Come in
    // `piano.js`: senza `getComputedStyle` (i test) cade sui numeri d'oggi.
    const misure = misureDi(contenitore);
    inchiostroTenue.opacity = misure.ombra;
    puntoInchiostro.size = 2 * misure.raggioNodo;
    puntoRosso.size = 2 * misure.raggioNodo * 1.6;
    // Lo spessore vero lo scrive `rendi`, che conosce camera e riquadro: qui solo gli estremi e il tratto.
    const cilindroFra = (a, b, materiale, tratto) => {
      const o = new THREE.Mesh(cilindro, materiale);
      o.position.addVectors(a, b).multiplyScalar(0.5);
      const direzione = new THREE.Vector3().subVectors(b, a);
      o.scale.y = direzione.length();
      o.quaternion.setFromUnitVectors(asseY, direzione.normalize());
      o.userData = { tratto, estremi: [a, b] };
      disegnato.add(o);
    };
    const v = (p) => new THREE.Vector3(p.x, p.y, p.z);

    const punti = (nodi, materiale) => {
      if (nodi.length === 0) return null;
      const g = new THREE.BufferGeometry().setFromPoints(nodi.map((n) => new THREE.Vector3(n.x, n.y, n.z)));
      return new THREE.Points(g, materiale);
    };
    const scelto = (tipo, id) => selezione?.tipo === tipo && selezione.id === id;

    // Il secondo canale dell'asta scelta, oltre al tratto più spesso: i suoi due nodi d'estremo,
    // disegnati come i punti rossi del nodo selezionato — dice anche *quale* asta, non solo che
    // una è scelta.
    const astaScelta = selezione?.tipo === "asta" ? m.aste.find((a) => a.id === selezione.id) : null;
    const estremiAstaScelta = astaScelta ? new Set([astaScelta.nodo_i, astaScelta.nodo_j]) : null;

    for (const a of m.aste) {
      const i = m.nodi.find((n) => n.id === a.nodo_i);
      const j = m.nodi.find((n) => n.id === a.nodo_j);
      if (!i || !j) continue;
      if (!(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z) > 0)) continue;   // due nodi coincidenti: nessuna direzione
      if (scelto("asta", a.id)) cilindroFra(v(i), v(j), rosso, misure.trattoScelta);
      else cilindroFra(v(i), v(j), deformata ? inchiostroTenue : inchiostro, misure.trattoAsta);
    }
    // La deformata: la stessa `puntiDeformata` del piano, stessa scala. Un cilindro per tratto nel
    // colore del suo |u| sopra il bordo in inchiostro, che la stacca dal fondo chiaro anche dove
    // viridis arriva al giallo; rossa e senza bordo se stantia.
    for (const t of trattiDellaDeformata(deformata)) {
      const a = v(t.a), b = v(t.b);
      if (t.colore === null) { cilindroFra(a, b, rosso, misure.trattoDeformata); continue; }
      cilindroFra(a, b, bordo, misure.trattoDeformata + 2 * misure.bordoDeformata);
      if (!viridisDi.has(t.colore)) viridisDi.set(t.colore, new THREE.MeshBasicMaterial({ color: t.colore }));
      cilindroFra(a, b, viridisDi.get(t.colore), misure.trattoDeformata);
    }
    const evidenziato = (n) => scelto("nodo", n.id) || (estremiAstaScelta?.has(n.id) ?? false);
    const normali = m.nodi.filter((n) => !evidenziato(n));
    const evidenziati = m.nodi.filter(evidenziato);
    for (const p of [punti(normali, puntoInchiostro), punti(evidenziati, puntoRosso)]) if (p) disegnato.add(p);

    scena.add(disegnato);
    const { centro, distanza } = calcolaInquadratura(m.nodi);
    orbita.centro.set(centro.x, centro.y, centro.z);
    if (!cameraToccata) orbita.distanza = distanza;
    ridimensiona();
    rendi();
  }

  ridimensiona();
  rendi();
  return { disegna, disponibile: true };
}

function assente(contenitore, motivo, errore) {
  console.warn("spazio 3D non disponibile:", motivo, errore);
  const p = document.createElement("p");
  p.className = "vuoto";
  p.textContent = `Vista spaziale non disponibile: ${motivo}. Il piano di lavoro funziona lo stesso.`;
  contenitore.replaceChildren(p);
  return { disegna() {}, disponibile: false };
}
