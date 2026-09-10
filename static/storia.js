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
    // niente. Si scorre **l'elenco**, a mano: `scrollIntoView` porta dentro anche ogni antenato
    // che scorre, e dopo un'importazione (11d) trascinava `#pannello` in fondo — il rendiconto,
    // che è la cosa da leggere, spariva sotto la Storia. Se la voce si vede già non muove
    // nulla: una cronologia che salta a ogni comando è peggio del difetto.
    const r = righe[attivo];
    if (r) {
      const sopra = r.offsetTop - elenco.offsetTop, sotto = sopra + r.offsetHeight;
      if (sopra < elenco.scrollTop) elenco.scrollTop = sopra;
      else if (sotto > elenco.scrollTop + elenco.clientHeight) elenco.scrollTop = sotto - elenco.clientHeight;
    }
  }

  return { disegna };
}
