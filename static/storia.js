// La cronologia visibile (P4, giornata 11c): `etichette(cronologia)` esiste dalla giornata
// 10 e non la disegnava nessuno. Un listener per voce, come i recenti di `file.js` — non
// una delega sul click del `<ul>`, che nei test finti servirebbe `ev.target.closest`.

export function creaStoria(elenco, { suSalto }) {
  function disegna(voci) {
    const attivo = voci.findIndex((v) => v.attiva);
    elenco.replaceChildren(...voci.map((v, i) => {
      const li = document.createElement("li");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      // Doppio canale, come l'albero (`albero.js`): chi è attivo ha il rosso e «▸», non il
      // solo colore (WCAG 1.4.1, PRODUCT.md).
      li.setAttribute("aria-current", String(v.attiva));
      li.className = v.attiva ? "storia-attiva" : i > attivo ? "storia-futuro" : "";
      li.textContent = v.attiva ? `▸ ${v.etichetta}` : v.etichetta;
      li.addEventListener("click", () => suSalto(i));
      li.addEventListener("keydown", (ev) => {
        if (ev.key !== "Enter" && ev.key !== " ") return;
        ev.preventDefault();
        suSalto(i);
      });
      return li;
    }));
  }

  return { disegna };
}
