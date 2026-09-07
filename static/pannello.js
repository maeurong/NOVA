// L'ispettore della selezione, con l'editor del vincolo. Fuori da `app.js` perché con i sei
// gradi e le tre preimpostazioni raddoppia, e `app.js` ha già i due modi e la cucitura.

import { stampaNumero } from "./numeri.js";
import { nodo } from "./modello.js";
import { GRADI, PREIMPOSTAZIONI, nomePreimpostazione, descrizione } from "./vincoli.js";

const mm = (v) => `${stampaNumero(v, { decimali: 0, migliaia: true })} mm`;

/** Le righe della `<dl>` per la selezione corrente, o `null` se punta a un oggetto sparito —
 *  chi chiama azzera già la selezione, ma qui non ci si conta lo stesso. */
export function righe(m, selezione) {
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

/** Il vincolo con un solo grado cambiato, ricostruito sui sei — mai solo quello toccato:
 *  `impostaVincolo` (`comandi.js:143`) sovrascrive tutto il campo che riceve. `null` se il
 *  cambio lascia tutti i gradi liberi: è così che un nodo si libera. */
export function prossimoVincolo(vincoloAttuale, grado, acceso) {
  const nuovo = Object.fromEntries(GRADI.map((g) => [g, Boolean(vincoloAttuale?.[g])]));
  nuovo[grado] = acceso;
  return GRADI.some((g) => nuovo[g]) ? nuovo : null;
}

/** Una preimpostazione copiata, mai la costante congelata per riferimento — chi la riceve
 *  non deve poter far viaggiare la stessa identità fino a `vincoli.js`. `null` per "libero". */
export function copiaPreimpostazione(nome) {
  return nome === "libero" ? null : { ...PREIMPOSTAZIONI[nome] };
}

/** Se il bottone `nome` va mostrato premuto per questo vincolo. "libero" è premuto quando
 *  non c'è nessuna preimpostazione attiva **e** nessun grado è acceso: un vincolo tutto
 *  libero non è "nessuna corrispondenza", è "libero" (vincoli.js, `nomePreimpostazione`). */
export function presetPremuto(nome, vincolo) {
  const attivo = nomePreimpostazione(vincolo);
  if (nome === "libero") return attivo === null && !GRADI.some((g) => vincolo?.[g]);
  return nome === attivo;
}

function editorVincolo(n, suVincolo) {
  const box = document.createElement("div");
  box.id = "vincolo-editor";

  const fila = document.createElement("div");
  fila.className = "vincolo-preimpostazioni";
  for (const nome of [...Object.keys(PREIMPOSTAZIONI), "libero"]) {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = nome;
    // doppio canale: premuto è uno stato, non un colore (stile.css)
    b.setAttribute("aria-pressed", String(presetPremuto(nome, n.vincolo)));
    b.addEventListener("click", () => suVincolo(n.id, copiaPreimpostazione(nome)));
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
    c.addEventListener("change", () => suVincolo(n.id, prossimoVincolo(n.vincolo, g, c.checked)));
    et.append(c, document.createTextNode(g));
    gradi.append(et);
  }
  box.append(gradi);
  return box;
}

export function creaPannello(dati, vuoto, editor, { suVincolo }) {
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

    // Il vincolo è dei nodi: su un'asta l'editor non compare affatto, e sta **fuori** dalla
    // `<dl>` — bottoni e caselle dentro una lista di definizioni non sono né un termine né
    // una descrizione, e uno screen reader li leggerebbe come se lo fossero.
    const n = selezione.tipo === "nodo" ? nodo(m, selezione.id) : null;
    if (n) { editor.replaceChildren(editorVincolo(n, suVincolo)); editor.hidden = false; }
    else { editor.replaceChildren(); editor.hidden = true; }
  }

  return { disegna };
}
