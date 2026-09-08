// L'albero del modello: trovare un'entità per nome senza cercarla nel viewport (story 6).
// La selezione è la stessa del piano e dello spazio: qui si legge e si scrive, non si copia.

import { asteDelNodo, asteDellaSezione } from "./modello.js";
import { stampaNumero } from "./numeri.js";

const mm = (v) => stampaNumero(v, { decimali: 0, migliaia: true });

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

  function disegna(m, { selezione = null } = {}) {
    const righe = [];
    // Un gruppo vuoto non compare: la divulgazione progressiva mostra i rami che ci sono, non
    // l'indice di quelli che non ci sono (P8, `docs/ricerca/07-ux-modellatore.md:149`).
    const gruppo = (nome, quante) => { if (quante) righe.push({ gruppo: nome }); };

    gruppo("Nodi", m.nodi.length);
    for (const n of m.nodi) {
      righe.push({
        tipo: "nodo", id: n.id,
        testo: `${n.nome ?? `nodo ${n.id}`} · ${stampaNumero(n.x, { decimali: 0, migliaia: true })} mm; ${stampaNumero(n.z, { decimali: 0, migliaia: true })} mm`,
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
      righe.push({
        tipo: "sezione", id: s.id,
        testo: `${s.nome} · ${mm(s.b)} × ${mm(s.h)} mm · ${quante} ${quante === 1 ? "asta" : "aste"}`,
      });
    }
    gruppo("Materiali", m.materiali.length);
    for (const k of m.materiali) {
      righe.push({
        tipo: "materiale", id: k.id,
        testo: `${k.nome} · ${k.classe}${k.personalizzato ? " · personalizzato" : ""}`,
      });
    }

    vuoto.hidden = righe.length > 0;
    elenco.hidden = righe.length === 0;
    elenco.replaceChildren(...righe.map((r) => {
      const li = document.createElement("li");
      // L'intestazione di un ramo non è una voce: niente `data-tipo` (quindi `closest` non la
      // trova e il clic non seleziona), niente fuoco, fuori dall'albero accessibile. Il rosso
      // vuol dire attenzione e nient'altro: un'intestazione non lo prende mai. Stile: Task 8.
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
      // Doppio canale: chi è selezionato ha il rosso e il segno «▸», non il solo colore.
      if (selezione?.tipo === r.tipo && selezione.id === r.id) {
        li.style.color = "var(--rosso)";
        li.textContent = `▸ ${r.testo}`;
      }
      return li;
    }));
  }

  return { disegna };
}
