// L'albero del modello: trovare un'entità per nome senza cercarla nel viewport (story 6).
// La selezione è la stessa del piano e dello spazio: qui si legge e si scrive, non si copia.

import { asteDelNodo, asteDellaSezione } from "./modello.js";
import { millimetri as mm } from "./numeri.js";
import { NOME_TIPO_COMBINAZIONE } from "./carichi.js";
import { riassunto } from "./rilievo.js";

export function creaAlbero(elenco, vuoto, { suSelezione }) {
  const scegli = (voce) => voce && suSelezione(voce.dataset.tipo, Number(voce.dataset.id));

  elenco.addEventListener("click", (ev) => scegli(ev.target.closest("[data-tipo]")));

  // Le voci sono raggiungibili con ⇥ e si attivano con Invio o spazio: un elenco che si
  // apre solo al clic è un comando che chi usa la tastiera non ha (WCAG 2.1.1).
  elenco.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter" && ev.key !== " ") return;
    const voce = ev.target.closest("[data-tipo]");
    if (!voce) return;
    ev.preventDefault();
    scegli(voce);
  });

  function disegna(m, { selezione = null, rilievo = null } = {}) {
    const righe = [];
    // Un gruppo vuoto non compare: la divulgazione progressiva mostra i rami che ci sono, non
    // l'indice di quelli che non ci sono (P8, `docs/ricerca/07-ux-modellatore.md:149`).
    const gruppo = (nome, quante) => { if (quante) righe.push({ gruppo: nome }); };

    // Il rendiconto del rilievo viene prima del modello: è da lì che il modello importato
    // arriva, ed è l'unica voce che resta quando il rilievo non ha dato niente (P8: il ramo
    // compare solo dopo un'importazione).
    if (rilievo) {
      righe.push({ gruppo: "Rilievo" });
      righe.push({ tipo: "rilievo", id: 0, testo: riassunto(rilievo) });
    }

    gruppo("Nodi", m.nodi.length);
    for (const n of m.nodi) {
      righe.push({
        tipo: "nodo", id: n.id,
        testo: `${n.nome ?? `nodo ${n.id}`} · ${mm(n.x)} mm; ${mm(n.z)} mm`,
        conta: asteDelNodo(m, n.id).length,
      });
    }
    gruppo("Aste", m.aste.length);
    for (const a of m.aste) {
      righe.push({ tipo: "asta", id: a.id, testo: `${a.nome ?? `asta ${a.id}`} · ${a.nodo_i} → ${a.nodo_j}`, conta: null });
    }
    gruppo("Sezioni", m.sezioni.length);
    for (const s of m.sezioni) {
      // «1 asta», non «1 aste»: zero resta plurale, uno no. Stessa riga in `pannello.js`.
      const quante = asteDellaSezione(m, s.id).length;
      // Il nome di default **è** «b × h» (`comandi.js:creaSezione`): stamparlo e poi stampare
      // le dimensioni dava «300 × 500 · 300 × 500 mm». Le misure compaiono solo quando il
      // nome non le dice già.
      const misure = `${mm(s.b)} × ${mm(s.h)}`;
      const dimensioni = s.nome === misure ? "" : ` · ${misure} mm`;
      righe.push({
        tipo: "sezione", id: s.id,
        testo: `${s.nome}${dimensioni} · ${quante} ${quante === 1 ? "asta" : "aste"}`,
      });
    }
    gruppo("Materiali", m.materiali.length);
    for (const k of m.materiali) {
      righe.push({
        tipo: "materiale", id: k.id,
        testo: `${k.nome} · ${k.classe}${k.personalizzato ? " · personalizzato" : ""}`,
      });
    }

    const plurale = (n, uno, molti) => `${n} ${n === 1 ? uno : molti}`;
    gruppo("Azioni", m.azioni.length);
    for (const a of m.azioni) {
      righe.push({
        tipo: "azione", id: a.id,
        // `?? []`: un file vecchio può non avere il campo, e l'albero disegna prima di tutti
        // gli altri — se cade qui, l'ispettore che si guarda le spalle non serve a niente.
        testo: `${a.nome} · ${a.natura}${a.categoria ? ` ${a.categoria}` : ""} · ${plurale((a.carichi ?? []).length, "carico", "carichi")}${a.generata ? " · generata" : ""}`,
      });
    }
    gruppo("Combinazioni", m.combinazioni.length);
    for (const c of m.combinazioni) {
      // `TIPI_COMBINAZIONE` e `NOME_TIPO_COMBINAZIONE` sono due costanti gemelle in
      // `carichi.js` (righe 13 e 19-22): chi aggiunge un tipo alla prima e si scorda la
      // seconda vedrebbe «undefined» qui. Il fallback stampa la chiave grezza in quel caso.
      righe.push({
        tipo: "combinazione", id: c.id,
        testo: `${c.nome} · ${c.tipo ? (NOME_TIPO_COMBINAZIONE[c.tipo] ?? c.tipo) : "senza tipo"} · ${plurale((c.termini ?? []).length, "termine", "termini")}${c.generata ? " · generata" : ""}`,
      });
    }

    vuoto.hidden = righe.length > 0;
    elenco.hidden = righe.length === 0;
    elenco.replaceChildren(...righe.map((r) => {
      const li = document.createElement("li");
      // L'intestazione di un ramo non è una voce: niente `data-tipo` (quindi `closest` non la
      // trova e il clic non seleziona), niente fuoco, fuori dall'albero accessibile. Il rosso
      // vuol dire attenzione e nient'altro: un'intestazione non lo prende mai.
      if (r.gruppo) {
        li.textContent = r.gruppo;
        li.className = "gruppo";
        li.setAttribute("role", "presentation");
        return li;
      }
      li.dataset.tipo = r.tipo;
      li.dataset.id = r.id;
      li.textContent = r.testo;
      li.className = "numero";
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      li.setAttribute("aria-pressed", String(selezione?.tipo === r.tipo && selezione.id === r.id));
      // Doppio canale: chi è selezionato ha il segno «▸» e il filetto rosso a sinistra, non il
      // rosso come inchiostro — `--rosso` su `--fondo` è 4,28:1, sotto la soglia AA per un
      // testo di 11px. Il rosso fa il filetto, come in `.avviso` e `.non-ora`; la parola la
      // fa il segno. Classe e non `style`, così la regola sta tutta in `stile.css`.
      if (selezione?.tipo === r.tipo && selezione.id === r.id) {
        li.className = "numero scelto";
        li.textContent = `▸ ${r.testo}`;
      }
      return li;
    }));
  }

  return { disegna };
}
