// La vista spaziale, in sola lettura: i gesti stanno nel piano SVG, qui si guarda e si
// riconosce la selezione. three.js è vendorizzato (`vendor/PROVENIENZA.md`): NOVA gira
// senza rete, e un `import` remoto sarebbe una vista che sparisce in aereo.
//
// Se three.js o WebGL non ci sono, questo modulo si dichiara assente e il piano SVG regge
// da solo: una pagina bianca sarebbe il modo peggiore di dirlo.
//
// `calcolaAspect` e `dimensioniSicure` sono pure, senza THREE: `node --test` non ha WebGL
// (`tests/test_js.py` guarda solo funzioni vere, non il DOM), quindi sono l'unico punto da
// cui gli ingressi degeneri di questo modulo si provano fuori dal browser.

// Stessi valori di `piano.js` (`INCHIOSTRO`, `ROSSO`): non importabili da lì, quel modulo
// non li esporta e non è nello scope di questo task toccarlo.
const INCHIOSTRO = 0x141414;
const ROSSO = 0xb8321e;

const DISTANZA_MINIMA = 4000; // mm: un modello con un nodo solo non detta una distanza

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

export async function creaSpazio(contenitore) {
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

  const inchiostro = new THREE.LineBasicMaterial({ color: INCHIOSTRO });
  const rosso = new THREE.LineBasicMaterial({ color: ROSSO });
  const puntoInchiostro = new THREE.PointsMaterial({ color: INCHIOSTRO, size: 6, sizeAttenuation: false });
  const puntoRosso = new THREE.PointsMaterial({ color: ROSSO, size: 10, sizeAttenuation: false });
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
    renderer.render(scena, camera);
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
  window.addEventListener("resize", () => { ridimensiona(); rendi(); });

  function disegna(m, { selezione = null } = {}) {
    scena.remove(disegnato);
    disegnato.traverse((o) => { o.geometry?.dispose(); });
    disegnato = new THREE.Group();

    const punti = (nodi, materiale) => {
      if (nodi.length === 0) return null;
      const g = new THREE.BufferGeometry().setFromPoints(nodi.map((n) => new THREE.Vector3(n.x, n.y, n.z)));
      return new THREE.Points(g, materiale);
    };
    const scelto = (tipo, id) => selezione?.tipo === tipo && selezione.id === id;

    for (const a of m.aste) {
      const i = m.nodi.find((n) => n.id === a.nodo_i);
      const j = m.nodi.find((n) => n.id === a.nodo_j);
      if (!i || !j) continue;
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(i.x, i.y, i.z), new THREE.Vector3(j.x, j.y, j.z),
      ]);
      disegnato.add(new THREE.Line(g, scelto("asta", a.id) ? rosso : inchiostro));
    }
    const normali = m.nodi.filter((n) => !scelto("nodo", n.id));
    const evidenziati = m.nodi.filter((n) => scelto("nodo", n.id));
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
