// L'ispettore della selezione, con l'editor del vincolo. Fuori da `app.js` perché con i sei
// gradi e le tre preimpostazioni raddoppia, e `app.js` ha già i due modi e la cucitura.

import { stampaNumero } from "./numeri.js";
import { nodo } from "./modello.js";
import { GRADI, PREIMPOSTAZIONI, vincoloVuoto, nomePreimpostazione, descrizione } from "./vincoli.js";

const mm = (v) => `${stampaNumero(v, { decimali: 0, migliaia: true })} mm`;

function entitaSelezionata(m, selezione) {
  return selezione.tipo === "nodo" ? nodo(m, selezione.id) : (m.aste.find((k) => k.id === selezione.id) ?? null);
}

function righeDiNodo(n) {
  return [["identificatore", String(n.id)], ["nome", n.nome ?? "—"],
          ["x", mm(n.x)], ["z", mm(n.z)], ["vincolo", descrizione(n.vincolo)]];
}

function righeDiAsta(m, a) {
  const i = nodo(m, a.nodo_i), j = nodo(m, a.nodo_j);
  const lunghezza = i && j ? mm(Math.hypot(j.x - i.x, j.y - i.y, j.z - i.z)) : "—";
  return [["identificatore", String(a.id)], ["nome", a.nome ?? "—"],
          ["da → a", `${a.nodo_i} → ${a.nodo_j}`], ["lunghezza", lunghezza],
          ["sezione", a.sezione === null ? "non assegnata" : String(a.sezione)]];
}

const righeDe = (m, tipo, e) => (tipo === "nodo" ? righeDiNodo(e) : righeDiAsta(m, e));

/** Le righe della `<dl>` per la selezione corrente, o `null` se punta a un oggetto sparito —
 *  chi chiama azzera già la selezione, ma qui non ci si conta lo stesso. */
export function righe(m, selezione) {
  const e = entitaSelezionata(m, selezione);
  return e ? righeDe(m, selezione.tipo, e) : null;
}

/** Il vincolo con un solo grado cambiato, ricostruito sui sei — mai solo quello toccato:
 *  `impostaVincolo` (`comandi.js:143`) sovrascrive tutto il campo che riceve. Sempre i sei
 *  booleani, mai `null`: spegnere l'ultimo grado acceso **dichiara** il nodo libero, non
 *  cancella il campo — sono due stati diversi per `nova/check.py` (vedi `copiaPreimpostazione`). */
export function prossimoVincolo(vincoloAttuale, grado, acceso) {
  const nuovo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincoloAttuale?.[g])]));
  nuovo[grado] = acceso;
  return nuovo;
}

/** Una preimpostazione copiata, mai la costante congelata per riferimento — chi la riceve
 *  non deve poter far viaggiare la stessa identità fino a `vincoli.js`. "libero" dichiara il
 *  nodo libero (sei booleani falsi, `vincoloVuoto()`), non lo cancella: `null` resta lo stato
 *  di un nodo **mai toccato** (`nova/modello.py`, «una scelta dell'utente, non una
 *  dimenticanza»), e solo `comandi.js:147` lo produce, da un chiamante che non è più questo. */
export function copiaPreimpostazione(nome) {
  return nome === "libero" ? vincoloVuoto() : { ...PREIMPOSTAZIONI[nome] };
}

/** Se il bottone `nome` va mostrato premuto per questo vincolo. Il primo congiunto di
 *  "libero è premuto quando attivo === null e nessun grado è acceso" è implicato dal
 *  secondo — `vincoli.js` ritorna già `null` per `!vincolo` e per tutti i gradi falsi — quindi
 *  resta solo il secondo. */
export function presetPremuto(nome, vincolo) {
  if (nome === "libero") return !GRADI.some((g) => vincolo?.[g]);
  return nome === nomePreimpostazione(vincolo);
}

const NOME_GRADO = {
  ux: "traslazione X (ux)", uy: "traslazione Y (uy)", uz: "traslazione Z (uz)",
  rx: "rotazione X (rx)", ry: "rotazione Y (ry)", rz: "rotazione Z (rz)",
};

function editorVincolo(n, suVincolo) {
  const fila = document.createElement("fieldset");
  fila.className = "vincolo-preimpostazioni";
  const legendaFila = document.createElement("legend");
  legendaFila.textContent = "preimpostazione";
  fila.append(legendaFila);
  const bottoni = [];
  for (const nome of [...Object.keys(PREIMPOSTAZIONI), "libero"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = nome;
    // doppio canale: premuto è uno stato, non un colore (stile.css)
    b.setAttribute("aria-pressed", String(presetPremuto(nome, n.vincolo)));
    b.addEventListener("click", () => suVincolo(n.id, copiaPreimpostazione(nome)));
    fila.append(b);
    bottoni.push(b);
  }

  const gradi = document.createElement("fieldset");
  gradi.className = "vincolo-gradi";
  const legendaGradi = document.createElement("legend");
  legendaGradi.textContent = "gradi bloccati";
  gradi.append(legendaGradi);
  const caselle = [];
  for (const g of GRADI) {
    const et = document.createElement("label");
    const c = document.createElement("input");
    c.type = "checkbox";
    c.checked = Boolean(n.vincolo?.[g]);
    // il testo visibile resta "ux": il nome accessibile lo contiene e basta (WCAG 2.5.3)
    c.setAttribute("aria-label", NOME_GRADO[g]);
    c.addEventListener("change", () => suVincolo(n.id, prossimoVincolo(n.vincolo, g, c.checked)));
    et.append(c, document.createTextNode(g));
    gradi.append(et);
    caselle.push(c);
  }

  return { elementi: [fila, gradi], bottoni, caselle };
}

export function creaPannello({ dati, vuoto, editor }, { suVincolo }) {
  // L'editor in piedi ora, per ritrovare il controllo a fuoco dopo un `replaceChildren`:
  // ricostruirlo staccherebbe dal DOM il controllo che l'utente sta usando, e il fuoco
  // tornerebbe a `body` — sei ripartenze di tabulazione per spuntare sei gradi.
  let editorAttuale = null;

  function fuocoAttuale() {
    if (!editorAttuale) return null;
    const attivo = document.activeElement;
    let indice = editorAttuale.bottoni.indexOf(attivo);
    if (indice !== -1) return { lista: "bottoni", indice };
    indice = editorAttuale.caselle.indexOf(attivo);
    return indice !== -1 ? { lista: "caselle", indice } : null;
  }

  function disegna(m, selezione) {
    const e = selezione ? entitaSelezionata(m, selezione) : null;
    const r = e ? righeDe(m, selezione.tipo, e) : null;
    vuoto.hidden = r !== null;
    dati.hidden = r === null;
    if (r === null) {
      dati.replaceChildren(); editor.replaceChildren(); editor.hidden = true; editorAttuale = null;
      return;
    }

    dati.replaceChildren(...r.flatMap(([k, v]) => {
      const dt = document.createElement("dt"); dt.textContent = k;
      const dd = document.createElement("dd"); dd.textContent = v; dd.className = "numero";
      return [dt, dd];
    }));

    // Il vincolo è dei nodi: su un'asta l'editor non compare affatto, e sta **fuori** dalla
    // `<dl>` — bottoni e caselle dentro una lista di definizioni non sono né un termine né
    // una descrizione, e uno screen reader li leggerebbe come se lo fossero.
    const n = selezione.tipo === "nodo" ? e : null;
    if (n) {
      const fuoco = fuocoAttuale();
      const { elementi, bottoni, caselle } = editorVincolo(n, suVincolo);
      editor.replaceChildren(...elementi);
      editorAttuale = { bottoni, caselle };
      editor.hidden = false;
      if (fuoco) editorAttuale[fuoco.lista][fuoco.indice]?.focus?.();
    } else {
      editor.replaceChildren();
      editorAttuale = null;
      editor.hidden = true;
    }
  }

  return { disegna };
}
