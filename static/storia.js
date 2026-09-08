// La cronologia visibile (P4, giornata 11c): `etichette(cronologia)` esiste dalla giornata
// 10 e non la disegnava nessuno. Un listener per voce, come i recenti di `file.js` — non
// una delega sul click del `<ul>`, che nei test finti servirebbe `ev.target.closest`.

export function creaStoria(elenco, { suSalto }) {
  function disegna(voci) {
    const attivo = voci.findIndex((v) => v.attiva);
    const righe = voci.map((v, i) => {
      const li = document.createElement("li");
      li.tabIndex = 0;
      li.setAttribute("role", "button");
      // Doppio canale: chi è attivo porta «▸» e il grassetto, e lo dichiara con
      // `aria-current` — nessuno dei tre è un colore (WCAG 1.4.1, PRODUCT.md).
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
    });
    elenco.replaceChildren(...righe);
    // L'elenco adesso scorre per conto suo (`stile.css`), quindi la voce attiva gli può
    // finire fuori: dalla diciassettesima in poi era fuori campo e non la riportava dentro
    // niente. `block: "nearest"` e non `"center"`: se la voce si vede già non muove nulla —
    // che è il caso normale, e una cronologia che salta a ogni comando è peggio del difetto.
    righe[attivo]?.scrollIntoView?.({ block: "nearest" });
  }

  return { disegna };
}
