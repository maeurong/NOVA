// L'area dei file. Il percorso è un campo di testo, non un `prompt`: si incolla dal Finder
// e si preme Invio. Un dialog nativo, oltre a essere brutto qui, blocca l'automazione del
// browser — e questo pezzo va provato.
//
// L'impronta **non** si ricalcola in JS: duplicare il canonico di `nova/modello.py:impronta`
// sarebbe una seconda verità che diverge. Si tiene quella che il server ha restituito, e un
// flag che dice se da allora il modello è cambiato.

import { aggiungi, leggi, scrivi } from "./recenti.js";

const corto = (impronta) => (impronta ? impronta.slice(0, 8) : "—");

export function creaFile(radice, { suApertura, suSalvataggio, suErrore, deposito = null }) {
  const campo = radice.querySelector("#file-percorso");
  const stato = radice.querySelector("#file-stato");
  const elenco = radice.querySelector("#file-recenti");
  const deposito_ = deposito ?? (typeof localStorage === "undefined" ? null : localStorage);
  let recenti = deposito_ ? leggi(deposito_) : [];

  async function chiedi(rotta, corpo) {
    const r = await fetch(rotta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = await r.json().catch(() => ({}));
    // un errore senza `motivo` è comunque un errore: si dice lo stato, mai «undefined»
    if (!r.ok) throw new Error(dati.motivo || `il server ha risposto ${r.status}`);
    return dati;
  }

  function ricorda(percorso) {
    recenti = aggiungi(recenti, percorso);
    if (deposito_) scrivi(deposito_, recenti);
    disegnaRecenti();
  }

  function disegnaRecenti() {
    elenco.replaceChildren(...recenti.map((p) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = p;
      b.title = p;
      b.addEventListener("click", () => { campo.value = p; apri(p); });
      li.append(b);
      return li;
    }));
  }

  async function apri(percorso) {
    const p = (percorso ?? campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso di un modello");
    try {
      const { modello, impronta } = await chiedi("/api/modello/apri", { percorso: p });
      campo.value = p;
      ricorda(p);
      suApertura(p, modello, impronta);
    } catch (e) {
      suErrore(e.message);
    }
  }

  async function salva(percorso, modello) {
    const p = (percorso ?? campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso dove salvare");
    try {
      const { impronta } = await chiedi("/api/modello/salva", { percorso: p, modello });
      ricorda(p);
      // `suSalvataggio` e non `suApertura`: il modello in memoria è già quello giusto, e
      // ricominciare la cronologia qui cancellerebbe l'undo a ogni salvataggio.
      suSalvataggio(p, impronta);
    } catch (e) {
      suErrore(e.message);
    }
  }

  campo.addEventListener("keydown", (ev) => {
    if (ev.key !== "Enter") return;
    ev.preventDefault();
    apri();
  });
  radice.querySelector("#file-apri").addEventListener("click", () => apri());

  function disegna({ percorso, impronta, modificato }) {
    if (percorso && campo.value === "") campo.value = percorso;
    stato.textContent = percorso
      ? `impronta ${corto(impronta)}${modificato ? " · modificato" : ""}`
      : "nessun modello aperto";
  }

  disegnaRecenti();
  return { disegna, apri, salva, percorsoCorrente: () => campo.value.trim() };
}
