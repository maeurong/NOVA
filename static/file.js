// L'area dei file. Il percorso è un campo di testo, non un `prompt`: si incolla dal Finder
// e si preme Invio. Un dialog nativo, oltre a essere brutto qui, blocca l'automazione del
// browser — e questo pezzo va provato.
//
// L'impronta **non** si ricalcola in JS: duplicare il canonico di `nova/modello.py:impronta`
// sarebbe una seconda verità che diverge. Si tiene quella che il server ha restituito, e un
// flag che dice se da allora il modello è cambiato.

import { aggiungi, leggi, scrivi } from "./recenti.js";

/** Le prime 8 cifre dell'impronta, o un trattino se non c'è ancora. */
export const corto = (impronta) => (impronta ? impronta.slice(0, 8) : "—");

/** Il `motivo` del server se c'è, altrimenti lo stato HTTP — mai «undefined». */
export const messaggioErrore = (dati, stato) => dati.motivo || `il server ha risposto ${stato}`;

/** La riga di stato sotto i bottoni. */
export const testoStato = ({ percorso, impronta, modificato }) =>
  percorso
    ? `impronta ${corto(impronta)}${modificato ? " · modificato" : ""}`
    : "nessun modello aperto";

/** Nome del file e cartella che lo contiene. Senza cartella, `cartella` è vuota — non solleva. */
export function separaPercorso(percorso) {
  const p = typeof percorso === "string" ? percorso : "";
  const i = p.lastIndexOf("/");
  return i === -1 ? { cartella: "", nome: p } : { cartella: p.slice(0, i), nome: p.slice(i + 1) };
}

// `localStorage` può non solo mancare (`typeof` lo prende) ma anche **sollevare** al primo
// accesso: dati del sito bloccati (finestra privata rigida) lanciano `SecurityError` sul
// getter stesso, prima che si arrivi a chiamare `getItem`. Se questa riga solleva senza un
// deposito iniettato, `creaFile` non ritorna mai — l'area file intera sparisce per una lista.
export function depositoSicuro() {
  try {
    return localStorage;
  } catch {
    return null;
  }
}

export function creaFile(radice, { suApertura, suSalvataggio, suErrore, deposito = null }) {
  const campo = radice.querySelector("#file-percorso");
  const stato = radice.querySelector("#file-stato");
  const elenco = radice.querySelector("#file-recenti");
  const elencoVuoto = radice.querySelector("#file-recenti-vuoto");
  const deposito_ = deposito ?? depositoSicuro();
  let recenti = deposito_ ? leggi(deposito_) : [];
  // Uno scatto per comando: due Invio di fila non devono aprire due richieste in corsa,
  // dove vince chi risponde per ultimo invece di chi è partito per ultimo.
  let inCorso = false;

  async function chiedi(rotta, corpo) {
    const r = await fetch(rotta, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(corpo),
    });
    const dati = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(messaggioErrore(dati, r.status));
    return dati;
  }

  function ricorda(percorso) {
    recenti = aggiungi(recenti, percorso);
    if (deposito_) scrivi(deposito_, recenti);
    disegnaRecenti();
  }

  function disegnaRecenti() {
    const vuoto = recenti.length === 0;
    if (elencoVuoto) elencoVuoto.hidden = !vuoto;
    elenco.hidden = vuoto;
    elenco.replaceChildren(...recenti.map((p) => {
      const { cartella, nome } = separaPercorso(p);
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.title = p;
      const spanNome = document.createElement("span");
      spanNome.className = "nome";
      spanNome.textContent = nome;
      b.append(spanNome);
      if (cartella) {
        const spanCartella = document.createElement("span");
        spanCartella.className = "cartella";
        spanCartella.textContent = cartella;
        b.append(spanCartella);
      }
      b.addEventListener("click", () => { campo.value = p; apri(p); });
      li.append(b);
      return li;
    }));
  }

  async function apri(percorso) {
    if (inCorso) return;
    const p = (typeof percorso === "string" ? percorso : campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso di un modello");
    inCorso = true;
    try {
      const { modello, impronta } = await chiedi("/api/modello/apri", { percorso: p });
      campo.value = p;
      ricorda(p);
      suApertura(p, modello, impronta);
    } catch (e) {
      suErrore(e.message);
    } finally {
      inCorso = false;
    }
  }

  async function salva(percorso, modello) {
    if (inCorso) return;
    const p = (typeof percorso === "string" ? percorso : campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso dove salvare");
    inCorso = true;
    try {
      const { impronta } = await chiedi("/api/modello/salva", { percorso: p, modello });
      ricorda(p);
      // `suSalvataggio` e non `suApertura`: il modello in memoria è già quello giusto, e
      // ricominciare la cronologia qui cancellerebbe l'undo a ogni salvataggio.
      suSalvataggio(p, impronta);
    } catch (e) {
      suErrore(e.message);
    } finally {
      inCorso = false;
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
    stato.textContent = testoStato({ percorso, impronta, modificato });
  }

  disegnaRecenti();
  return { disegna, apri, salva, percorsoCorrente: () => campo.value.trim() };
}
