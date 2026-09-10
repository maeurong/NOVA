// Pilota minimo di Chrome headless via CDP: tasti veri, DOM vero. Niente dipendenze —
// `WebSocket` è globale in node dal 22. Usato solo dal test di fumo (`tests/test_fumo_chrome.py`).
let ws, id = 0;
const attese = new Map();
const eventi = [];   // `Runtime.exceptionThrown` e `Log.entryAdded` di livello error: il copione li legge alla fine

export async function apri(url, cdp, { larghezza = 1280, altezza = 800, dpr = 1 } = {}) {
  const r = await fetch(`http://127.0.0.1:${cdp}/json/new?${url}`, { method: "PUT" });
  const t = await r.json();
  ws = new WebSocket(t.webSocketDebuggerUrl);
  await new Promise((ok, no) => { ws.onopen = ok; ws.onerror = no; });
  ws.onmessage = (m) => {
    const d = JSON.parse(m.data);
    if (d.id && attese.has(d.id)) { attese.get(d.id)(d); attese.delete(d.id); return; }
    if (d.method === "Runtime.exceptionThrown") eventi.push(`eccezione: ${d.params.exceptionDetails?.exception?.description ?? d.params.exceptionDetails?.text}`);
    // ponytail: Chrome chiede sempre `/favicon.ico`, che il server non serve; è rumore del
    // browser, non un errore di `app.js`. Se un giorno il server serve un favicon, questo filtro
    // diventa innocuo da solo.
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error" && !d.params.entry.url?.endsWith("/favicon.ico")) eventi.push(`console: ${d.params.entry.text}`);
  };
  for (const m of ["Page.enable", "Runtime.enable", "Network.enable", "Log.enable"]) await cmd(m);
  await cmd("Network.setCacheDisabled", { cacheDisabled: true });  // `?v=` non scavalca la cache dei moduli
  await viewport(larghezza, altezza, dpr);
  await cmd("Page.reload", { ignoreCache: true });
  await pausa(1500);
  return t.id;
}

export function cmd(method, params = {}) {
  return new Promise((ok, no) => {
    const mio = ++id;
    attese.set(mio, (d) => (d.error ? no(new Error(`${method}: ${JSON.stringify(d.error)}`)) : ok(d.result)));
    ws.send(JSON.stringify({ id: mio, method, params }));
  });
}

export const viewport = (width, height, deviceScaleFactor = 1) =>
  cmd("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor, mobile: false });

/** Valuta un'espressione nella pagina e ne rende il valore (attende le promesse). */
export async function ev(expr) {
  const r = await cmd("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? JSON.stringify(r.exceptionDetails));
  return r.result.value;
}

const MOD = { alt: 1, ctrl: 2, meta: 4, shift: 8 };
const SPECIALI = { Enter: 13, Escape: 27, Backspace: 8, Tab: 9, ArrowUp: 38, ArrowDown: 40, ArrowLeft: 37, ArrowRight: 39 };

/** Un tasto come lo preme una persona: `tasto("n")`, `tasto("o", {meta: true})`, `tasto("Enter")`. */
export async function tasto(k, mods = {}) {
  const modifiers = Object.entries(mods).reduce((s, [n, v]) => s + (v ? MOD[n] : 0), 0);
  const speciale = k in SPECIALI;
  const code = speciale ? k : (/^[a-z]$/i.test(k) ? `Key${k.toUpperCase()}` : (/^[0-9]$/.test(k) ? `Digit${k}` : undefined));
  const base = { key: k, code, modifiers, windowsVirtualKeyCode: speciale ? SPECIALI[k] : k.toUpperCase().charCodeAt(0) };
  // Invio: `keyDown` con `text: "\r"`, altrimenti il `<form>` non fa il submit implicito (misurato nella 11c).
  const testo = k === "Enter" ? "\r" : (speciale || mods.meta || mods.ctrl ? undefined : k);
  await cmd("Input.dispatchKeyEvent", { type: testo === undefined ? "rawKeyDown" : "keyDown", text: testo, unmodifiedText: testo, ...base });
  await cmd("Input.dispatchKeyEvent", { type: "keyUp", ...base });
  await pausa(60);
}

/** Scrive un testo carattere per carattere nel controllo a fuoco (keydown + input veri). */
export async function scrivi(testo) {
  for (const ch of testo) {
    await cmd("Input.dispatchKeyEvent", { type: "keyDown", key: ch, text: ch, unmodifiedText: ch });
    await cmd("Input.dispatchKeyEvent", { type: "keyUp", key: ch });
  }
  await pausa(60);
}

/** Aspetta che `expr` sia vero, al più `ms` millisecondi; rende l'ultimo valore. */
export async function finche(expr, ms = 30000, ogni = 250) {
  const fine = Date.now() + ms;
  let v;
  while (Date.now() < fine) { v = await ev(expr); if (v) return v; await pausa(ogni); }
  throw new Error(`tempo scaduto su: ${expr} (ultimo valore ${JSON.stringify(v)})`);
}

export const pausa = (ms) => new Promise((ok) => setTimeout(ok, ms));
export const erroriRaccolti = () => [...eventi];
export function chiudi() { ws?.close(); }
