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

/** Nome del file e cartella che lo contiene. Senza cartella, `cartella` è vuota — non solleva. */
export function separaPercorso(percorso) {
  const p = typeof percorso === "string" ? percorso : "";
  const i = p.lastIndexOf("/");
  return i === -1 ? { cartella: "", nome: p } : { cartella: p.slice(0, i), nome: p.slice(i + 1) };
}

/** La riga di stato sotto i bottoni. Nomina il file **aperto**, che dalla fix di `salva` non
 *  è più per forza quello scritto nel campo: si può digitare un percorso senza aprirlo, e la
 *  destinazione di un salvataggio resta il modello aperto. Senza il nome qui, l'unico posto
 *  che mostra un percorso è il campo, e mostrerebbe quello sbagliato senza dirlo. */
export const testoStato = ({ percorso, impronta, modificato }) =>
  percorso
    ? `${separaPercorso(percorso).nome} · impronta ${corto(impronta)}${modificato ? " · modificato" : ""}`
    : "nessun modello aperto";

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
  // Il modello finito su disco, nella forma esatta in cui è stato spedito. Da qui si
  // **deriva** «modificato», invece di tenerlo come una variabile che qualcuno deve
  // ricordarsi di alzare a ogni comando e di abbassare al momento giusto: una variabile
  // così è già bugiarda oggi, e con l'annulla della 11c lo diventerebbe di più.
  let salvato = null;

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
      // Il campo lo scrive `apri`, e solo **se** riesce: scriverlo qui lo faceva divergere
      // dal percorso aperto al primo 404, e il ⌘S dopo finiva nel file che aveva fallito.
      b.addEventListener("click", () => apri(p));
      li.append(b);
      return li;
    }));
  }

  // Rifiutare in silenzio è peggio che rifiutare: su un disco lento il secondo clic non fa
  // niente e non spiega niente, e l'utente ripete finché non pensa che sia rotto.
  const occupato = () => suErrore("un'operazione sul file è già in corso");

  async function apri(percorso) {
    if (inCorso) return occupato();
    const p = (typeof percorso === "string" ? percorso : campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso di un modello");
    inCorso = true;
    try {
      const { modello, impronta } = await chiedi("/api/modello/apri", { percorso: p });
      campo.value = p;
      salvato = JSON.stringify(modello);   // appena aperto, memoria e disco coincidono
      ricorda(p);
      suApertura(p, modello, impronta);
    } catch (e) {
      suErrore(e.message);
    } finally {
      inCorso = false;
    }
  }

  /** Salva `modello` in `percorso`. Senza un percorso esplicito ricade sul campo, e quello è
   *  l'unico caso in cui il campo è una destinazione: il primo salvataggio di un modello mai
   *  aperto. Il campo è la sorgente di `apri`, non la destinazione di `salva`. */
  async function salva(percorso, modello) {
    if (inCorso) return occupato();
    const p = (typeof percorso === "string" ? percorso : campo.value).trim();
    if (p === "") return suErrore("scrivi il percorso dove salvare");
    // Catturato **alla partenza**, non al ritorno: la risposta arriva dopo, e nel frattempo
    // un comando da tastiera può aver portato avanti la cronologia. Su disco finisce questo.
    const inviato = JSON.stringify(modello);
    inCorso = true;
    try {
      const { impronta } = await chiedi("/api/modello/salva", { percorso: p, modello });
      salvato = inviato;
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

  function disegna({ percorso, impronta, modello }) {
    if (percorso && campo.value === "") campo.value = percorso;
    // «Modificato» è una domanda, non un promemoria: *quello che ho in memoria è quello che
    // è finito su disco?* L'unica risposta esatta che si può dare qui è confrontarlo con ciò
    // che è stato spedito — la stessa forma su cui il server ha calcolato l'impronta, che in
    // JS non si ricalcola (vedi in testa al file). Le chiavi in ordine diverso darebbero un
    // «modificato» di troppo; è il verso giusto in cui sbagliare, perché il verso opposto —
    // dire «salvato» a un modello che su disco non c'è — è il lavoro perso.
    stato.textContent = testoStato({ percorso, impronta, modificato: modello !== undefined && JSON.stringify(modello) !== salvato });
  }

  disegnaRecenti();
  return { disegna, apri, salva, percorsoCorrente: () => campo.value.trim() };
}
