// L'albero del modello: trovare un'entità per nome senza cercarla nel viewport (story 6).
// La selezione è la stessa del piano e dello spazio: qui si legge e si scrive, non si copia.

import { asteDelNodo } from "./modello.js";
import { stampaNumero } from "./numeri.js";

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
    // Senza questo, l'Invio che attiva la voce risale al listener globale di `app.js`,
    // che lo legge come «conferma» e chiude anche un ghost pendente aperto altrove.
    ev.stopPropagation();
    scegli(voce);
  });

  function disegna(m, { selezione = null } = {}) {
    const righe = [];
    for (const n of m.nodi) {
      righe.push({
        tipo: "nodo", id: n.id,
        testo: `${n.nome ?? `nodo ${n.id}`} · ${stampaNumero(n.x, { decimali: 0, migliaia: true })} mm; ${stampaNumero(n.z, { decimali: 0, migliaia: true })} mm`,
        conta: asteDelNodo(m, n.id).length,
      });
    }
    for (const a of m.aste) {
      righe.push({ tipo: "asta", id: a.id, testo: `${a.nome ?? `asta ${a.id}`} · ${a.nodo_i} → ${a.nodo_j}`, conta: null });
    }

    vuoto.hidden = righe.length > 0;
    elenco.hidden = righe.length === 0;
    elenco.replaceChildren(...righe.map((r) => {
      const li = document.createElement("li");
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
