# NOVA T5 — giornata 11b: sezioni, armatura, materiali, danno

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** un telaio disegnato da zero si può **salvare**: `S` → «300 × 500» crea la sezione (e, se mancano, C25/30 e B450C), la assegna all'asta, l'ispettore la disegna con le barre dove il deck le metterà davvero; un materiale mostra la sua curva con i valori usati accanto; un'asta porta il danno del rilievo; ogni modifica a un'entità importata la marca «modificata».

**Architecture:** due rotte di sola lettura sul server (catalogo e legame di un materiale) perché i valori nascono in `nova/legami.py` e duplicarli in JavaScript sarebbe una seconda verità; tre moduli puri nuovi (`sezione.js` per la geometria delle barre, `legame.js` per la curva, otto riduttori in `comandi.js`); l'ispettore guadagna tre editor con la forma di `editorVincolo`; l'albero due rami; il campo di comando tre lettere. La regola di collocazione delle barre è **una** e sta in `nova/deck.py:_barre`: il disegno JS la ricopia riga per riga e una fixture condivisa fra `pytest` e `node --test` prova che non divergono.

**Tech Stack:** moduli ES nativi, `node --test` per i moduli puri, `pytest` con `TestClient` per le due rotte, il server FastAPI di T1.

**Spec:** `docs/superpowers/specs/2026-09-05-nova-v1-design.md` — story 15-22 (righe 44-51), 55 (riga 103), forme JSON del modello (righe 160-180). Calendario: `docs/superpowers/plans/2026-09-06-t5-interfaccia-bozza.md`, riga 18 e sezione «Collocato l'08/09/2026» (11b = 15-22 + 55).

**Ricerca che questo piano applica** (`docs/ricerca/index.md`): riga 20, ricerca 08 — «armatura costruttiva → fibre derivate», le posizioni delle barre non si salvano mai; riga 21, ricerca 09 — i valori di `Concrete02`/`Steel02` dalla classe e dalla veste, medie nel modello; riga 26, ricerca 14 — le **verifiche** c.a. sono T8, non qui: questo piano mostra i valori, non giudica. Principi UX `docs/ricerca/07-ux-modellatore.md:146-157`: P8 (divulgazione progressiva: le barre compaiono solo con le staffe, i valori personalizzati solo con la spunta), P9 (unità ed espressioni nei campi: «30 cm × 50 cm» vale quanto «300 × 500»).

**Ramo:** `feat/interfaccia-11b` da `main` a `6406cfd`, worktree `/Users/mario/GitHub/NOVA-wt/interfaccia-11b` (venv pronto). PR verso `main`.

## Global Constraints

- **Lingua italiana** in interfaccia, commenti, messaggi di commit; identificatori tecnici invariati.
- **Notazione numerica italiana**: la virgola separa i decimali; `stampaNumero` in uscita, `leggiNumero`/`leggiLunghezza` in ingresso (`static/numeri.js`).
- **Unità `mm-N-MPa-t-s`**, dichiarate in un punto e su ogni numero.
- **Palette «colonna tensegrale»**: fondo `#dcdad5`, inchiostro `#141414`, **un solo rosso** `#b8321e` = attenzione. Mai «cream palette».
- **Nessun bundler, nessun `package.json`, nessuna rete a tempo d'uso.**
- **WCAG AA**; nessuna informazione sul solo colore; fuoco sempre visibile; ogni campo con nome accessibile.
- **Zero sovrapposizioni, zero testo tagliato**, verificato a 1280 e 1920 px e a zoom 200 %.
- **Backend: solo Task 1** tocca `nova/` (una funzione pubblica in `legami.py`, due rotte in `server.py`, un nome pubblico per le vesti). Nessun altro file sotto `nova/` cambia.
- **`meshrec/` non si tocca** (copia verbatim).
- **La regola delle barre è quella di `nova/deck.py:200-274`**, e la fixture `tests/fixture/barre_300x500.json` la prova da entrambi i lati.
- Riduttori **puri**: `(modello, argomenti) → modello nuovo`, `structuredClone`, mai mutare l'ingresso (`static/comandi.js:1-9`).
- Ogni comando che modifica un'entità con `origine` alza `origine.modificata` (story 55): **una riga**, tramite `marcaModificata`.
- Comando dei test JS (dalla cartella `static/`): `node --test test/*.test.js` — punto di partenza **297 pass**.
- Comando dei test Python:
  `/Users/mario/GitHub/NOVA-wt/interfaccia-11b/.venv/bin/python -P -m pytest /Users/mario/GitHub/NOVA-wt/interfaccia-11b/tests -p no:cacheprovider --color=no --rootdir=/Users/mario/GitHub/NOVA-wt/interfaccia-11b`
  `pytest -q` **non stampa il riepilogo**: vale l'exit code, e il conteggio si ricava con `tr -cd '.sFEx' | wc -c`. Punto di partenza **673** (670 pass + 3 skip).
- Server per la prova in browser: `env -C /Users/mario/GitHub/NOVA-wt/interfaccia-11b .venv/bin/python -P -m nova --porta 8811`. **Mai la 8765, né 8766-8767.** Spegnerlo a fine prova.
- **Mai `git checkout --` per revertire un mutante**: copiare il file prima, ripristinare dalla copia.

## Quel che il backend dà già, e non va reinventato

- `nova/modello.py:128-141` — `Sezione(id, nome, tipo="rettangolare", b>0, h>0, riduzione?, calcestruzzo: int, acciaio: int, copriferro≥0, file: [Fila], staffe?, origine?)`; `Fila(lato ∈ sup|inf|sx|dx, n≥1, diametro>0)` (109-113); `Staffe(diametro, passo, bracci≥2 default 2)` (115-119); `Riduzione(sup, inf, sx, dx ≥0 default 0)` (121-127); `senza_barre` (143-149): senza file **o senza staffe** non c'è nessuna barra.
- `nova/modello.py:91-95` — `Danno(fattore_E, fattore_fc ∈ (0, 1], nota: str)`; `Asta.danno?` (97-107). `Asta.sezione: int` è **obbligatoria** al salvataggio: è il limite dichiarato dalla 11a che questa giornata chiude.
- `nova/modello.py:189-208` — `Materiale(id, nome, tipo ∈ calcestruzzo|acciaio, classe, origine?, valori: {}, personalizzato: false, legame: Legame())`; se non `personalizzato` la classe deve stare nel catalogo, altrimenti il rifiuto elenca le classi (`meshrec/core/materiali.py:438-453`).
- `nova/modello.py:349-352` — `ImpostazioniAnalisi(fibre=10, veste="media")`: **la veste è una per modello**, non per materiale. Un editor che la mettesse per materiale contraddirebbe `AnalisiStatica` («i tag di sezione sono gli stessi», `nova/modello.py:290-303`).
- `nova/modello.py:43-49` — `Origine(sorgente, riferimento?, file?, nota?, modificata=False)`. **Nessuna riga di `nova/` né di `static/` lo alza oggi** (ricognizione dell'08/09): story 55 parte da zero.
- `nova/catalogo.py:16-42` — `valori(materiale)`: `E, nu, densita` sempre; `fck, fcm, fctm` per il calcestruzzo, `fyk, ftk, epsuk` per l'acciaio; `personalizzato` sovrascrive chiave per chiave da `materiale.valori`. **Questi sono i nomi delle chiavi che l'editor «personalizzato» mostra.**
- `nova/legami.py:43-79` — `veste_valori(materiale, veste)` → `{classe, veste, avvisi, note, fck, fc, fct, Ecm, articolo}` o `{…, fyk, fy, ftk, epsuk, articolo}`; `_VESTI` (riga 41) è privato: Task 1 lo espone come `VESTI`.
- `nova/legami.py:188-193` — `_concrete02(fc, epsc0, epsU, v, lg, articolo)` → `{tipo:"concrete02", fpc, epsc0, fpcu, epsU, lambda, ft, Ets, Ec, classe, veste, articolo}` con i segni di OpenSees (compressione negativa). `calcestruzzo()` (221-297) lo chiama per il copriferro con `epsc0 = 2 fc / Ecm` e articolo `f"{v['articolo']}, [11.2.5], §7.4.1"`; il nucleo vuole una sezione. `acciaio(materiale, veste)` (300-337) → `{tipo:"steel02", Fy, E, b, R0, cR1, cR2, eps_ud, k, classe, veste, avvisi, note, articolo}` e **solleva** `ValueError` se `ε_ud ≤ f_y/E_s`.
- `nova/deck.py:200-274` — `_barre(s, verticale)`: `y` lungo `b` e `z` lungo `h` **dal baricentro**; `inf`/`sup` con `armatura.colloca` (`meshrec/core/armatura.py:152-200`, `_fila` 256-272: interferro costante, estreme a filo, una sola in mezzo); `sx`/`dx` a filo dei lati, `z0 = −(h/2 − c − Øst − Ø/2)`, `passo = −2·z0/(n+1)`; una fila per lato; guardia «copriferri opposti» su `h` per tutte le file e su `b` per `sx`/`dx` (`2·(c + Øst + Ømax/2) ≥ dimensione` → rifiuto). Scostamento di una barra dal filo = `copriferro + Ø_staffa` (`armatura.py:169`).
- `nova/server.py:114-153` — le richieste sono `BaseModel` con `extra="forbid"` (`_CorpoBase`); rotte `apri`/`salva` a 251-275 come stampo dell'errore `HTTPException(400, detail={"motivo": …})`. `tests/test_server.py:16-21` — la fixture `cliente` con `create_app(SidecarInProcesso(), tmp_path / "corse")`.
- `meshrec/core/materiali.py:104-127` — `VoceMateriale.f_ctm` vale `None` **sull'acciaio**: è la chiave con cui il catalogo si divide in due liste. Classi: 17 calcestruzzi da `C8/10` a `C90/105`, acciai `B450C` e `B450A` (righe 207-226, 398, 411).
- `static/modello.js:20-33` — `modelloVuoto()` senza `impostazioni_analisi` (dichiarato mancante nel commento in testa, righe 6-8); `prossimoId` già generico su `sezione`/`materiale` (37-43).
- `static/comandi.js:15-21` `ErroreComando(messaggio, rimedio)`; `numero()` (23-26); `copia` (28); `LISTE` (102); `rinomina` accetta già `sezione`/`materiale` come tipo (104-117).
- `static/pannello.js:70-108` — `editorVincolo` con due `<fieldset>`/`<legend>`, ritorna `{elementi, bottoni, caselle}`; `creaPannello` (110-160) ricorda il controllo a fuoco per indice (`fuocoAttuale`) e lo ritrova dopo `replaceChildren`.
- `static/albero.js:22-53` — voci `<li tabindex=0 role="button" data-tipo data-id>`, selezionata con `▸` e rosso (doppio canale).
- `static/tastiera.js:14-37` `TASTI`; mappe 51-56; `daControllo` (85-97) tratta `select` e `role="button"` come controlli: gli editor nuovi non hanno bisogno di `stopPropagation`.
- `static/app.js` — `apriComando(voce, {bersaglio, esempio})` (129-138), `submit` del campo (176-183), `esegui` (259-270), `ridisegna` con la guardia `esiste` (272-297), dispatch su `voce.codice` (316-447). `file.js:62` usa `fetch(rotta, {…})` con JSON: stesso stampo per le due rotte nuove.
- `static/test/pannello.test.js:9-30` — il DOM finto: `elementoFinto()` con `_figli`, `_attrs`, `dispatch`, `focus()` che sposta `document.activeElement`; `document.createElement/createTextNode`.

## Tre decisioni prese qui, non da scoprire in browser

1. **I valori vengono dal server.** «Vedere accanto a ogni curva i valori usati» (story 22) passa da `POST /api/materiale/legame`, che chiama le stesse funzioni del deck. La curva si disegna in JS dai sette parametri ricevuti; nessun numero di norma vive in `static/`.
2. **La prima sezione porta con sé i materiali.** `S` su un modello senza materiali crea `C25/30` e `B450C` prima della sezione, e la Storia lo dice («sezione 300 × 500, con C25/30 e B450C»). Senza, la prima sezione chiederebbe due passaggi prima di esistere, e il modello disegnato non si salverebbe ancora.
3. **Una sola veste, in un solo posto.** Il selettore sta nell'editor del materiale con l'etichetta «veste per l'analisi (tutto il modello)» e scrive `impostazioni_analisi.veste`. Cambiarla ricalcola la curva di ogni materiale.

## Struttura dei file

| file | responsabilità | puro |
|---|---|---|
| `nova/legami.py` | `+ legame_copriferro(materiale, veste)`, `VESTI` pubblico | — |
| `nova/server.py` | `GET /api/catalogo`, `POST /api/materiale/legame` | — |
| `tests/test_server.py`, `tests/test_deck_barre_fixture.py` | contratti delle rotte; la fixture delle barre contro `deck._barre` | — |
| `tests/fixture/barre_300x500.json` | sezione + barre attese, condivisa | — |
| `static/modello.js` | `impostazioni_analisi`, `sezione`, `materiale`, `asteDellaSezione`, `sezioniDelMateriale`, `vesteDi` | sì |
| `static/sezione.js` | `LATI`, `VESTI`, `leggiDimensioni`, `geometriaImpossibile`, `posizioniBarre`, `contornoRidotto`, `svgSezione` | sì |
| `static/legame.js` | `puntiConcrete02`, `puntiSteel02`, `valoriDaMostrare`, `svgCurva` | sì |
| `static/comandi.js` | `marcaModificata`; `+8` riduttori: `creaSezione`, `modificaSezione`, `impostaFila`, `assegnaSezione`, `eliminaSezione`, `creaMateriale`, `modificaMateriale`, `eliminaMateriale`, `impostaDanno`, `impostaVeste`, `materialiDiDefault` | sì |
| `static/tastiera.js` | `S` sezione, `C` materiale, `D` danno | sì |
| `static/albero.js` | rami «Sezioni» e «Materiali» | no |
| `static/pannello.js` | `editorAsta`, `editorSezione`, `editorMateriale`; righe per sezione e materiale | no |
| `static/app.js` | cucitura: catalogo, legame con cache, tre comandi nel campo, callback degli editor | no |
| `static/index.html`, `static/stile.css` | `#pannello-editor`, stati vuoti, stile degli editor e del disegno | — |

---

### Task 1: le due rotte — catalogo e legame di un materiale

**Files:**
- Modify: `nova/legami.py:41` (`_VESTI` → `VESTI`), `nova/legami.py:221-240` (il copriferro esce in una funzione pubblica)
- Modify: `nova/server.py:114-153` (una richiesta), `nova/server.py:251` (due rotte prima di `apri`)
- Test: `tests/test_server.py`

**Interfaces:**
- Consumes: `legami.veste_valori`, `legami._concrete02`, `legami.acciaio`, `catalogo.valori`, `meshrec.core.materiali.CATALOGO`.
- Produces: `GET /api/catalogo → {calcestruzzo: [classe…], acciaio: [classe…], vesti: [4]}`; `POST /api/materiale/legame {materiale, veste="media"} → {valori, catalogo, legame}` con `valori` = `veste_valori`, `catalogo` = `catalogo.valori` (le chiavi sovrascrivibili), `legame` = i parametri di `Concrete02` del copriferro o di `Steel02`; **400** `{motivo}` su classe sconosciuta, veste sconosciuta, materiale malformato, acciaio con `ε_ud ≤ f_y/E_s`.

**Ingressi degeneri:**
- materiale con `classe` non a catalogo e `personalizzato: false` → 400, `motivo` nomina la classe ed elenca quelle che esistono
- veste `«mediana»` → 400, `motivo` elenca le quattro vesti
- corpo con un campo in più (`{"materiale": …, "veste": "media", "boh": 1}`) → 400 (`extra="forbid"` di `_CorpoBase`)
- acciaio personalizzato con `valori.epsuk = 0.001` → 400, `motivo` contiene «snervamento»
- calcestruzzo con veste `progetto` → 200 e `valori.avvisi` non vuoto (l'avviso di `veste_valori`)
- materiale senza `legame` nel corpo → 200 con i default di `Legame()`

- [ ] **Step 1: Scrivi i test che falliscono**

In coda a `tests/test_server.py`:

```python
# --- giornata 11b: catalogo e legame ------------------------------------------

def _cls(**extra):
    return {"id": 1, "nome": "cls", "tipo": "calcestruzzo", "classe": "C25/30", **extra}


def _acc(**extra):
    return {"id": 2, "nome": "acc", "tipo": "acciaio", "classe": "B450C", **extra}


def test_catalogo_elenca_le_classi_e_le_vesti(cliente):
    r = cliente.get("/api/catalogo")
    assert r.status_code == 200
    d = r.json()
    assert "C25/30" in d["calcestruzzo"] and "B450C" in d["acciaio"]
    assert "C25/30" not in d["acciaio"] and "B450C" not in d["calcestruzzo"]
    assert d["vesti"] == ["caratteristica", "media", "progetto", "esistente"]


def test_legame_del_calcestruzzo_in_veste_media(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "media"})
    assert r.status_code == 200
    d = r.json()
    assert d["valori"]["fc"] == 33.0 and d["legame"]["tipo"] == "concrete02"
    assert d["legame"]["fpc"] == -33.0 and d["legame"]["epsc0"] < 0
    assert d["catalogo"]["fck"] == 25.0 and "densita" in d["catalogo"]


def test_legame_dell_acciaio(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _acc()})
    assert r.status_code == 200
    d = r.json()
    assert d["legame"]["tipo"] == "steel02" and d["legame"]["Fy"] == 450.0
    assert d["valori"]["veste"] == "media"


def test_legame_con_classe_sconosciuta_e_400_con_le_classi(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(classe="C99/99")})
    assert r.status_code == 400
    assert "C99/99" in r.json()["motivo"] and "C25/30" in r.json()["motivo"]


def test_legame_con_veste_sconosciuta_e_400(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "mediana"})
    assert r.status_code == 400 and "caratteristica" in r.json()["motivo"]


def test_legame_con_campo_in_piu_e_400(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "media", "boh": 1})
    assert r.status_code == 400


def test_legame_acciaio_sotto_lo_snervamento_e_400(cliente):
    r = cliente.post("/api/materiale/legame",
                     json={"materiale": _acc(personalizzato=True, valori={"epsuk": 0.001})})
    assert r.status_code == 400 and "snervamento" in r.json()["motivo"]


def test_legame_in_veste_progetto_porta_l_avviso(cliente):
    r = cliente.post("/api/materiale/legame", json={"materiale": _cls(), "veste": "progetto"})
    assert r.status_code == 200 and r.json()["valori"]["avvisi"]
```

- [ ] **Step 2: Esegui i test e verifica che falliscano**

Run: il comando pytest dei Global Constraints con `-k "catalogo or legame_"`.
Expected: 8 fail (404 sulle rotte).

- [ ] **Step 3: La funzione pubblica in `legami.py`**

Riga 41: `VESTI = ("caratteristica", "media", "progetto", "esistente")` e sotto `_VESTI = VESTI` (il nome vecchio resta per `veste_valori`, che non si tocca). Poi, subito prima di `def calcestruzzo(`:

```python
def legame_copriferro(materiale: Materiale, veste: str) -> dict:
    """Il `Concrete02` **non confinato** di un calcestruzzo, senza sezione.

    È la curva «del materiale» che l'ispettore mostra accanto ai valori (story 22): il nucleo
    dipende dalle staffe e sta in `calcestruzzo(materiale, veste, sezione)`, che da qui prende
    il copriferro invece di ricalcolarlo — un solo punto in cui `epsc0 = 2 f_c / E_cm`.
    """
    if materiale.tipo != "calcestruzzo":
        raise ValueError(f"materiale «{materiale.nome}» ({materiale.classe}) è di tipo "
                         f"{materiale.tipo}, non calcestruzzo")
    v = veste_valori(materiale, veste)
    fc = v["fc"]
    return _concrete02(fc, 2 * fc / v["Ecm"], materiale.legame.epsU_copriferro, v, materiale.legame,
                       f"{v['articolo']}, [11.2.5], §7.4.1")
```

In `calcestruzzo()` (righe 233-237) le quattro righe `v = …`, `lg = …`, `fc = …`, `epsc0 = …`, `copriferro = _concrete02(…)` diventano:

```python
    copriferro = legame_copriferro(materiale, veste)
    v = veste_valori(materiale, veste)
    lg = materiale.legame
    fc = v["fc"]
    epsc0 = -copriferro["epsc0"]
```

(`epsc0` resta positivo per i chiamanti a valle: `_concrete02` lo restituisce negativo.) I test di `tests/test_legami.py` restano verdi: stessi numeri, una chiamata in più.

- [ ] **Step 4: Le rotte**

In `nova/server.py`, dopo `class SalvaReq` (122-125):

```python
class LegameReq(_CorpoBase):
    materiale: dict
    veste: str = "media"
```

Import in testa, accanto a `_modello`: `from nova import legami as _legami, catalogo as _catalogo` e `from meshrec.core import materiali as _materiali` (se non già importati: controlla le righe 20-35). Prima di `@app.post("/api/modello/apri")`:

```python
    @app.get("/api/catalogo")
    def catalogo():
        # `f_ctm` è `None` solo sull'acciaio (`meshrec/core/materiali.py:117-121`): è la riga
        # che divide le due famiglie senza un campo `tipo` che il catalogo non ha.
        voci = list(_materiali.CATALOGO)
        return {"calcestruzzo": [v.classe for v in voci if v.f_ctm is not None],
                "acciaio": [v.classe for v in voci if v.f_ctm is None],
                "vesti": list(_legami.VESTI)}

    @app.post("/api/materiale/legame")
    def legame(corpo: LegameReq):
        try:
            mat = _modello.Materiale.model_validate(corpo.materiale)
            valori = _legami.veste_valori(mat, corpo.veste)
            curva = (_legami.legame_copriferro(mat, corpo.veste) if mat.tipo == "calcestruzzo"
                     else _legami.acciaio(mat, corpo.veste))
            tabella = _catalogo.valori(mat)
        except ValueError as e:  # pydantic.ValidationError è un ValueError
            raise HTTPException(400, detail={"motivo": str(e)})
        return {"valori": valori, "catalogo": tabella, "legame": curva}
```

- [ ] **Step 5: Esegui tutti i pytest**

Expected: 681 raccolti (678 pass + 3 skip), exit 0. Contare con `tr -cd '.sFEx' | wc -c`.

- [ ] **Step 6: Commit**

```bash
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-11b add nova/legami.py nova/server.py tests/test_server.py
git -C /Users/mario/GitHub/NOVA-wt/interfaccia-11b commit -m "feat(server): il catalogo e il legame di un materiale, per l'ispettore"
```

---

### Task 2: `modello.js` — la forma completa e i lookup

**Files:**
- Modify: `static/modello.js`
- Test: `static/test/modello.test.js`

**Interfaces:**
- Produces: `modelloVuoto().impostazioni_analisi = {fibre: 10, veste: "media"}`; `sezione(m, id)`, `materiale(m, id)` (→ entità o `null`); `asteDellaSezione(m, id) → asta[]`; `sezioniDelMateriale(m, id) → sezione[]`; `vesteDi(m) → string` (default `"media"` se il campo manca: i modelli salvati prima di oggi non lo hanno).

**Ingressi degeneri:**
- `vesteDi` su un modello senza `impostazioni_analisi` → `"media"`, non `undefined`
- `sezione(m, 99)` con 99 assente → `null`
- `asteDellaSezione(m, id)` con nessuna asta → `[]`

- [ ] **Step 1: Test**

```js
test("il modello vuoto porta le impostazioni dell'analisi con la veste media", () => {
  assert.deepEqual(modelloVuoto().impostazioni_analisi, { fibre: 10, veste: "media" });
});
test("vesteDi regge un modello salvato senza impostazioni", () => {
  const m = modelloVuoto(); delete m.impostazioni_analisi;
  assert.equal(vesteDi(m), "media");
});
test("sezione e materiale tornano null su un identificatore assente", () => {
  assert.equal(sezione(modelloVuoto(), 99), null);
  assert.equal(materiale(modelloVuoto(), 99), null);
});
test("asteDellaSezione e sezioniDelMateriale elencano chi referenzia", () => {
  const m = modelloVuoto();
  m.materiali.push({ id: 1, nome: "C25/30", tipo: "calcestruzzo", classe: "C25/30", valori: {}, personalizzato: false });
  m.sezioni.push({ id: 1, nome: "300 × 500", tipo: "rettangolare", b: 300, h: 500, calcestruzzo: 1, acciaio: 2, copriferro: 30, file: [], staffe: null });
  m.aste.push({ id: 1, nome: null, nodo_i: 1, nodo_j: 2, sezione: 1 }, { id: 2, nome: null, nodo_i: 2, nodo_j: 3, sezione: null });
  assert.deepEqual(asteDellaSezione(m, 1).map((a) => a.id), [1]);
  assert.deepEqual(sezioniDelMateriale(m, 1).map((s) => s.id), [1]);
  assert.deepEqual(sezioniDelMateriale(m, 2).map((s) => s.id), [1]);
});
```

- [ ] **Step 2: Esegui, fallisce (export mancanti)**
- [ ] **Step 3: Implementazione**

In `modelloVuoto()` dopo `analisi: [],`: `impostazioni_analisi: { fibre: 10, veste: "media" },` e il commento in testa (righe 6-8) diventa «`impostazioni_analisi` c'è dalla giornata 11b: `nova/modello.py:349-352`, la veste è una per modello». In coda:

```js
export const sezione = (m, id) => m.sezioni.find((s) => s.id === id) ?? null;
export const materiale = (m, id) => m.materiali.find((k) => k.id === id) ?? null;
export const asteDellaSezione = (m, id) => m.aste.filter((a) => a.sezione === id);
export const sezioniDelMateriale = (m, id) => m.sezioni.filter((s) => s.calcestruzzo === id || s.acciaio === id);
/** La veste dell'analisi, una per modello (`nova/modello.py:349-352`). I file salvati prima
 *  della 11b non portano il campo: il server lo riempie col default, e qui si fa lo stesso. */
export const vesteDi = (m) => m.impostazioni_analisi?.veste ?? "media";
```

- [ ] **Step 4: Verde; commit** `feat(modello): impostazioni dell'analisi e lookup di sezioni e materiali`

---

### Task 3: `sezione.js` — la geometria delle barre, provata da due lati

**Files:**
- Create: `static/sezione.js`, `static/test/sezione.test.js`
- Create: `tests/fixture/barre_300x500.json`, `tests/test_deck_barre_fixture.py`

**Interfaces:**
- Consumes: `leggiLunghezza`, `stampaNumero` da `numeri.js`.
- Produces: `LATI = ["inf","sup","sx","dx"]`, `VESTI`, `leggiDimensioni(testo) → {b, h} | null`, `geometriaImpossibile(s) → string | null`, `posizioniBarre(s) → [{y, z, diametro}]`, `contornoRidotto(s) → {y0, y1, z0, z1}`, `svgSezione(s, {lato = 180}) → string`.

**La fixture**, `tests/fixture/barre_300x500.json` (numeri ricavati a mano dalla regola del deck, riportati qui perché il test Python li **rilegge** da `_barre` e li confronta):

```json
{
  "sezione": {"id": 1, "nome": "300 × 500", "tipo": "rettangolare", "b": 300, "h": 500,
              "calcestruzzo": 1, "acciaio": 2, "copriferro": 30,
              "file": [{"lato": "inf", "n": 3, "diametro": 16}, {"lato": "sup", "n": 2, "diametro": 16},
                       {"lato": "sx", "n": 1, "diametro": 12}, {"lato": "dx", "n": 1, "diametro": 12}],
              "staffe": {"diametro": 8, "passo": 150, "bracci": 2}},
  "barre": [{"y": -104, "z": -204, "diametro": 16}, {"y": 0, "z": -204, "diametro": 16}, {"y": 104, "z": -204, "diametro": 16},
            {"y": -104, "z": 204, "diametro": 16}, {"y": 104, "z": 204, "diametro": 16},
            {"y": -106, "z": 0, "diametro": 12}, {"y": 106, "z": 0, "diametro": 12}]
}
```

Conto: scostamento = 30 + 8 = 38; `inf` a `z = −(250 − 38 − 8) = −204`, luce 224, passo (224 − 16)/2 = 104, prima a −150 + 38 + 8 = −104; `sup` specchiata; `sx` a `y = −(150 − 38 − 6) = −106`, `z0 = −206`, passo 412/2 = 206 → `z = 0`.

**Ingressi degeneri:**
- sezione senza staffe → `posizioniBarre` = `[]` e `geometriaImpossibile` = `null` (non c'è geometria da giudicare: `senza_barre`)
- sezione con staffe e nessuna fila → `[]`
- 300×100, copriferro 40, staffe Ø8, `inf` 1Ø16 → `geometriaImpossibile` nomina «copriferri opposti» e `h` (2·(40+8+8) = 112 ≥ 100); `posizioniBarre` = `[]`
- `inf` con 20Ø16 su b = 300 → «ingombrano 320 mm e fra le staffe ce ne sono 224»; `[]`
- `leggiDimensioni("300x500")`, `("300 × 500")`, `("30 cm × 50 cm")`, `("300*500")` → `{b: 300, h: 500}`; `("300")`, `("0 × 500")`, `("")`, `("a × b")` → `null`
- `contornoRidotto` senza riduzione → il contorno intero; con `{sup: 20}` → `z1 = 230`
- `svgSezione` di una sezione senza barre → una stringa con un `<rect` e nessun `<circle`

- [ ] **Step 1: Test JS** (`static/test/sezione.test.js`)

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { leggiDimensioni, geometriaImpossibile, posizioniBarre, contornoRidotto, svgSezione, LATI } from "../sezione.js";

const FIXTURE = JSON.parse(readFileSync(new URL("../../tests/fixture/barre_300x500.json", import.meta.url), "utf8"));
const ordina = (b) => [...b].sort((p, q) => p.y - q.y || p.z - q.z);
const SENZA_STAFFE = { ...FIXTURE.sezione, staffe: null };

test("le barre stanno dove le mette nova/deck.py:_barre (fixture condivisa)", () => {
  assert.deepEqual(ordina(posizioniBarre(FIXTURE.sezione)), ordina(FIXTURE.barre));
});
test("senza staffe non c'è nessuna barra e nessun giudizio", () => {
  assert.deepEqual(posizioniBarre(SENZA_STAFFE), []);
  assert.equal(geometriaImpossibile(SENZA_STAFFE), null);
});
test("copriferri opposti che si scavalcano: il messaggio nomina h", () => {
  const s = { ...FIXTURE.sezione, h: 100, copriferro: 40, file: [{ lato: "inf", n: 1, diametro: 16 }] };
  assert.match(geometriaImpossibile(s), /copriferri opposti.*\bh\b/);
  assert.deepEqual(posizioniBarre(s), []);
});
test("troppe barre in una fila: il messaggio dà ingombro e luce", () => {
  const s = { ...FIXTURE.sezione, file: [{ lato: "inf", n: 20, diametro: 16 }] };
  assert.match(geometriaImpossibile(s), /320 mm.*224/);
});
test("leggiDimensioni legge x, ×, * e le unità", () => {
  for (const t of ["300x500", "300 × 500", "30 cm × 50 cm", "300*500"]) assert.deepEqual(leggiDimensioni(t), { b: 300, h: 500 });
  for (const t of ["300", "0 × 500", "", "a × b", "300 × 500 × 2"]) assert.equal(leggiDimensioni(t), null);
});
test("contornoRidotto restringe dal lato dichiarato", () => {
  assert.deepEqual(contornoRidotto(FIXTURE.sezione), { y0: -150, y1: 150, z0: -250, z1: 250 });
  assert.deepEqual(contornoRidotto({ ...FIXTURE.sezione, riduzione: { sup: 20, inf: 0, sx: 0, dx: 0 } }), { y0: -150, y1: 150, z0: -250, z1: 230 });
});
test("svgSezione disegna un cerchio per barra e niente cerchi senza staffe", () => {
  assert.equal((svgSezione(FIXTURE.sezione).match(/<circle/g) ?? []).length, 7);
  assert.equal((svgSezione(SENZA_STAFFE).match(/<circle/g) ?? []).length, 0);
  assert.match(svgSezione(SENZA_STAFFE), /<rect/);
});
test("LATI è l'ordine del deck", () => assert.deepEqual(LATI, ["inf", "sup", "sx", "dx"]));
```

- [ ] **Step 2: Test Python** (`tests/test_deck_barre_fixture.py`)

```python
"""La fixture delle barre è vera per il deck: se `deck._barre` cambia, questo test cade
prima che il disegno dell'ispettore menta (Task 3 della giornata 11b)."""
import json
from pathlib import Path

from nova import modello as _modello
from nova.deck import _barre

FIXTURE = Path(__file__).parent / "fixture" / "barre_300x500.json"


def test_la_fixture_delle_barre_coincide_con_deck_barre():
    d = json.loads(FIXTURE.read_text(encoding="utf-8"))
    s = _modello.Sezione(**d["sezione"])
    attese = sorted((b["y"], b["z"], b["diametro"]) for b in d["barre"])
    vere = sorted((round(b.y, 9), round(b.z, 9), b.diametro) for b in _barre(s, False))
    assert vere == attese
```

- [ ] **Step 3: Esegui entrambi, falliscono (modulo e fixture assenti)**
- [ ] **Step 4: Implementazione** (`static/sezione.js`)

```js
// La geometria della sezione rettangolare come la vede il deck: y lungo b, z lungo h, dal
// baricentro. **La regola è una** e sta in `nova/deck.py:_barre` (righe 200-274) con
// `meshrec/core/armatura.py:_fila` (256-272): qui è ricopiata riga per riga, e la fixture
// `tests/fixture/barre_300x500.json` la prova da tutti e due i lati. Se divergono, il disegno
// dell'ispettore mente sul deck — che è peggio di non disegnare.

import { leggiLunghezza, stampaNumero } from "./numeri.js";

export const LATI = ["inf", "sup", "sx", "dx"];
export const VESTI = ["caratteristica", "media", "progetto", "esistente"];

/** Scostamento di una barra dal filo esterno: copriferro alla staffa + staffa (`armatura.py:169`). */
const scostamento = (s) => s.copriferro + s.staffe.diametro;
const mm = (v) => stampaNumero(v, { decimali: 0, migliaia: true });

/** «b × h» in millimetri, con `x`, `×` o `*` in mezzo e le unità di `leggiLunghezza` (P9).
 *  Esattamente due misure positive, o `null`: con tre la terza sparirebbe in silenzio. */
export function leggiDimensioni(testo) {
  const parti = String(testo ?? "").split(/[x×*]/i);
  if (parti.length !== 2) return null;
  const [b, h] = parti.map((p) => leggiLunghezza(p.trim()));
  return b > 0 && h > 0 ? { b, h } : null;
}

/** Il motivo per cui il deck rifiuterebbe questa armatura, o `null`. Le stesse guardie di
 *  `deck._barre` (copriferri opposti su h per tutte le file, su b per sx/dx) e di
 *  `armatura._fila` (n·Ø nella luce fra le staffe, solo inf/sup: sx/dx là non sono verificate). */
export function geometriaImpossibile(s) {
  if (!s.staffe || s.file.length === 0) return null;  // senza staffe non c'è barra da collocare
  const st = scostamento(s);
  for (const [quota, dim, gruppo] of [["h", s.h, LATI], ["b", s.b, ["sx", "dx"]]]) {
    const diametri = s.file.filter((f) => gruppo.includes(f.lato)).map((f) => f.diametro);
    if (diametri.length === 0) continue;
    const mezza = Math.max(...diametri) / 2;
    const ingombro = st + mezza;
    if (2 * ingombro >= dim) {
      return `i copriferri opposti si sovrappongono su ${quota} (copriferro ${mm(s.copriferro)} + staffa ${mm(s.staffe.diametro)} + mezza barra ${stampaNumero(mezza, { decimali: 1 })} = ${mm(ingombro)} mm, metà di ${quota} = ${mm(dim / 2)} mm)`;
    }
  }
  const luce = s.b - 2 * st;
  for (const f of s.file) {
    if ((f.lato === "inf" || f.lato === "sup") && f.n * f.diametro > luce) {
      return `${f.n} barre da ${mm(f.diametro)} mm ingombrano ${mm(f.n * f.diametro)} mm e fra le staffe ce ne sono ${mm(luce)}`;
    }
  }
  return null;
}

/** Le barre nel piano della sezione, `{y, z, diametro}` dal baricentro. Vuoto senza staffe,
 *  senza file, o con una geometria impossibile: il deck in quei casi non ne colloca nessuna. */
export function posizioniBarre(s) {
  if (!s.staffe || s.file.length === 0 || geometriaImpossibile(s)) return [];
  const st = scostamento(s);
  const luce = s.b - 2 * st;
  // `armatura._fila`: interferro costante, le due estreme a filo, una sola sta in mezzo
  const fila = (f, z) => {
    if (f.n === 1) return [{ y: 0, z, diametro: f.diametro }];
    const passo = (luce - f.diametro) / (f.n - 1);
    const primo = -s.b / 2 + st + f.diametro / 2;
    return Array.from({ length: f.n }, (_, i) => ({ y: primo + i * passo, z, diametro: f.diametro }));
  };
  const barre = [];
  for (const f of s.file) {
    if (f.lato === "inf") barre.push(...fila(f, -(s.h / 2 - st - f.diametro / 2)));
    if (f.lato === "sup") barre.push(...fila(f, s.h / 2 - st - f.diametro / 2));
  }
  // sx/dx: a filo dei lati, equidistanti fra i due strati (`deck.py:266-273`)
  for (const [lato, segno] of [["sx", -1], ["dx", 1]]) {
    const f = s.file.find((k) => k.lato === lato);
    if (!f) continue;
    const y = segno * (s.b / 2 - st - f.diametro / 2);
    const z0 = -(s.h / 2 - st - f.diametro / 2);
    const passo = (-2 * z0) / (f.n + 1);
    for (let k = 0; k < f.n; k++) barre.push({ y, z: z0 + passo * (k + 1), diametro: f.diametro });
  }
  return barre;
}

/** Il contorno dopo la riduzione: restringe, non sposta le barre (glossario «Riduzione»). */
export function contornoRidotto(s) {
  const r = s.riduzione ?? { sup: 0, inf: 0, sx: 0, dx: 0 };
  return { y0: -s.b / 2 + (r.sx ?? 0), y1: s.b / 2 - (r.dx ?? 0), z0: -s.h / 2 + (r.inf ?? 0), z1: s.h / 2 - (r.sup ?? 0) };
}

/** Il disegno: contorno nominale, contorno ridotto tratteggiato se c'è riduzione, staffa al
 *  copriferro, una circonferenza per barra, «b × h» sotto. Un SVG in scala, inchiostro su
 *  niente: il rosso qui non ha posto, un disegno non è un'attenzione. z cresce in su, come
 *  nel piano di lavoro. */
export function svgSezione(s, { lato = 180 } = {}) {
  const scala = lato / Math.max(s.b, s.h);
  const X = (y) => y * scala, Y = (z) => -z * scala;
  const rect = (y0, y1, z0, z1, extra = "") =>
    `<rect x="${X(y0)}" y="${Y(z1)}" width="${(y1 - y0) * scala}" height="${(z1 - z0) * scala}" fill="none" stroke="currentColor" ${extra}/>`;
  const mezzo = lato / 2 + 10;
  const parti = [rect(-s.b / 2, s.b / 2, -s.h / 2, s.h / 2, 'stroke-width="1.5"')];
  const c = contornoRidotto(s);
  if (s.riduzione && (c.y0 !== -s.b / 2 || c.y1 !== s.b / 2 || c.z0 !== -s.h / 2 || c.z1 !== s.h / 2)) {
    parti.push(rect(c.y0, c.y1, c.z0, c.z1, 'stroke-dasharray="4 3"'));
  }
  if (s.staffe) {
    const k = s.copriferro;
    parti.push(rect(-s.b / 2 + k, s.b / 2 - k, -s.h / 2 + k, s.h / 2 - k, `rx="${s.staffe.diametro * scala}" stroke-width="${Math.max(1, s.staffe.diametro * scala)}"`));
  }
  for (const b of posizioniBarre(s)) {
    parti.push(`<circle cx="${X(b.y)}" cy="${Y(b.z)}" r="${(b.diametro / 2) * scala}" fill="currentColor"/>`);
  }
  parti.push(`<text x="0" y="${lato / 2 + 14}" text-anchor="middle" font-size="11" fill="currentColor">${mm(s.b)} × ${mm(s.h)} mm</text>`);
  return `<svg viewBox="${-mezzo} ${-mezzo} ${2 * mezzo} ${2 * mezzo + 8}" width="${2 * mezzo}" height="${2 * mezzo + 8}" role="img" aria-label="sezione ${mm(s.b)} per ${mm(s.h)} millimetri">${parti.join("")}</svg>`;
}
```

- [ ] **Step 5: Verde da entrambi i lati.** JS: `node --test test/*.test.js`; Python: il comando pytest con `-k barre_fixture`.
- [ ] **Step 6: Commit** `feat(sezione): la geometria delle barre come la vede il deck, con la fixture condivisa`

---

### Task 4: `legame.js` — la curva e i valori accanto

**Files:**
- Create: `static/legame.js`, `static/test/legame.test.js`

**Interfaces:**
- Consumes: i dizionari di `legami._concrete02` e `legami.acciaio` come arrivano da `/api/materiale/legame` (Task 1).
- Produces: `puntiConcrete02(legame, n = 24) → [[ε, σ]…]` (ε negativi in compressione, come OpenSees; il ramo di trazione fino a `ft` con `Ec`); `puntiSteel02(legame) → [[0,0],[εy,Fy],[ε_ud, σ_ud]]`; `valoriDaMostrare(legame) → [[nome, valore, unità]…]`; `svgCurva(punti, {larghezza = 220, altezza = 120}) → string` con gli assi per lo zero e i due estremi stampati.

**Ingressi degeneri:**
- `valoriDaMostrare({tipo: "concrete04"})` → solleva `Error` che nomina il tipo (Mander in v1 sta nel deck, non nell'ispettore; un tipo ignoto non deve produrre una tabella vuota)
- `puntiConcrete02` con `ft: 0` → nessun punto di trazione, il primo punto è `(epsU, fpcu)` e l'ultimo `(0, 0)`
- `puntiSteel02` con `b: 0` → il terzo punto ha `σ = Fy` (elastico-perfetto)
- `svgCurva([])` → una stringa con `<svg` e nessun `<path` (niente da disegnare, niente eccezione)
- `svgCurva` con punti tutti a σ = 0 → non divide per zero: la scala verticale usa 1 come intervallo minimo

- [ ] **Step 1: Test**

```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { puntiConcrete02, puntiSteel02, valoriDaMostrare, svgCurva } from "../legame.js";

const C25 = { tipo: "concrete02", fpc: -33, epsc0: -0.002, fpcu: -6.6, epsU: -0.0035, lambda: 0.1, ft: 2.6, Ets: 1300, Ec: 33000 };
const B450 = { tipo: "steel02", Fy: 450, E: 200000, b: 0.0052, R0: 18, cR1: 0.925, cR2: 0.15, eps_ud: 0.0675, k: 1.15 };

test("la curva del calcestruzzo passa per il picco e finisce alla deformazione ultima", () => {
  const p = puntiConcrete02(C25);
  assert.deepEqual(p[0], [-0.0035, -6.6]);
  assert.ok(p.some(([e, s]) => e === -0.002 && Math.abs(s - -33) < 1e-9));
  assert.deepEqual(p[p.length - 1], [2.6 / 33000, 2.6]);
});
test("senza trazione la curva finisce nello zero", () => {
  const p = puntiConcrete02({ ...C25, ft: 0 });
  assert.deepEqual(p[p.length - 1], [0, 0]);
});
test("l'acciaio è bilineare, e con b = 0 è elastico-perfetto", () => {
  assert.deepEqual(puntiSteel02(B450)[1], [450 / 200000, 450]);
  assert.equal(puntiSteel02({ ...B450, b: 0 })[2][1], 450);
});
test("i valori accanto alla curva hanno nome, valore e unità", () => {
  const v = valoriDaMostrare(C25);
  assert.deepEqual(v[0], ["f_c", 33, "MPa"]);
  assert.ok(v.some(([n]) => n === "E_c") && v.some(([n]) => n === "ε_U"));
  assert.deepEqual(valoriDaMostrare(B450)[0], ["f_y", 450, "MPa"]);
  assert.throws(() => valoriDaMostrare({ tipo: "concrete04" }), /concrete04/);
});
test("svgCurva regge la lista vuota e le curve piatte", () => {
  assert.match(svgCurva([]), /<svg/); assert.doesNotMatch(svgCurva([]), /<path/);
  assert.match(svgCurva([[0, 0], [0.01, 0]]), /<path/);
  assert.match(svgCurva(puntiSteel02(B450)), /<path d="M/);
});
```

- [ ] **Step 2: Fallisce (modulo assente)**
- [ ] **Step 3: Implementazione**

```js
// La curva di un legame dai suoi parametri, e i valori da stampare accanto (story 22:
// «nessuna costante resti nascosta»). I parametri vengono dal server (`/api/materiale/legame`,
// `nova/legami.py`): qui non c'è un numero di norma, solo il disegno.

import { stampaNumero } from "./numeri.js";

/** `Concrete02`: parabola di Kent-Park fino al picco, retta fino a (εU, fpcu); trazione lineare
 *  fino a `ft` con `Ec`. Segni di OpenSees: compressione negativa. Ordinati per ε crescente. */
export function puntiConcrete02({ fpc, epsc0, fpcu, epsU, ft = 0, Ec = null }, n = 24) {
  const punti = [[epsU, fpcu]];
  for (let i = n; i >= 0; i--) {
    const r = i / n;               // r = ε/ε0 in [0, 1], ε0 negativo
    punti.push([epsc0 * r, fpc * (2 * r - r * r)]);
  }
  if (ft > 0 && Ec) punti.push([ft / Ec, ft]);
  return punti;
}

/** `Steel02` come lo definisce la norma (§4.1.2.1.2.2 (a)): retta elastica fino a (εy, Fy),
 *  retta incrudente fino a (ε_ud, Fy + b·E·(ε_ud − εy)). La transizione R0 non si disegna. */
export function puntiSteel02({ Fy, E, b, eps_ud }) {
  const ey = Fy / E;
  return [[0, 0], [ey, Fy], [eps_ud, Fy + b * E * (eps_ud - ey)]];
}

export function valoriDaMostrare(lg) {
  if (lg.tipo === "concrete02") {
    return [["f_c", -lg.fpc, "MPa"], ["E_c", lg.Ec, "MPa"], ["ε_c0", -lg.epsc0, ""], ["ε_U", -lg.epsU, ""],
            ["f_cu", -lg.fpcu, "MPa"], ["f_t", lg.ft, "MPa"], ["λ", lg.lambda, ""]];
  }
  if (lg.tipo === "steel02") {
    return [["f_y", lg.Fy, "MPa"], ["E_s", lg.E, "MPa"], ["b", lg.b, ""], ["ε_ud", lg.eps_ud, ""], ["k", lg.k, ""]];
  }
  throw new Error(`legame sconosciuto: ${lg.tipo}`);
}

const cifre = (v) => stampaNumero(v, { decimali: Math.abs(v) < 1 ? 4 : 0, migliaia: true });

/** Un SVG con la curva, gli assi per lo zero e i due estremi stampati. Inchiostro su niente. */
export function svgCurva(punti, { larghezza = 220, altezza = 120 } = {}) {
  const m = 24;  // margine per le etichette
  if (punti.length === 0) return `<svg viewBox="0 0 ${larghezza} ${altezza}" width="${larghezza}" height="${altezza}" role="img" aria-label="nessuna curva"></svg>`;
  const es = punti.map((p) => p[0]), ss = punti.map((p) => p[1]);
  const e0 = Math.min(0, ...es), e1 = Math.max(0, ...es);
  const s0 = Math.min(0, ...ss), s1 = Math.max(0, ...ss);
  const de = Math.max(e1 - e0, 1e-9), ds = Math.max(s1 - s0, 1);
  const X = (e) => m + ((e - e0) / de) * (larghezza - 2 * m);
  const Y = (s) => altezza - m - ((s - s0) / ds) * (altezza - 2 * m);
  const d = punti.map(([e, s], i) => `${i === 0 ? "M" : "L"}${X(e).toFixed(1)} ${Y(s).toFixed(1)}`).join(" ");
  return `<svg viewBox="0 0 ${larghezza} ${altezza}" width="${larghezza}" height="${altezza}" role="img" aria-label="curva del legame">`
    + `<line x1="${m}" y1="${Y(0)}" x2="${larghezza - m}" y2="${Y(0)}" stroke="currentColor" stroke-opacity="0.35"/>`
    + `<line x1="${X(0)}" y1="${m}" x2="${X(0)}" y2="${altezza - m}" stroke="currentColor" stroke-opacity="0.35"/>`
    + `<path d="${d}" fill="none" stroke="currentColor" stroke-width="1.5"/>`
    + `<text x="${m}" y="${altezza - 6}" font-size="9" fill="currentColor">ε ${cifre(e0)}</text>`
    + `<text x="${larghezza - m}" y="${altezza - 6}" font-size="9" text-anchor="end" fill="currentColor">${cifre(e1)}</text>`
    + `<text x="2" y="${m}" font-size="9" fill="currentColor">${cifre(s1)} MPa</text>`
    + `<text x="2" y="${altezza - m}" font-size="9" fill="currentColor">${cifre(s0)}</text>`
    + `</svg>`;
}
```

- [ ] **Step 4: Verde; commit** `feat(legame): la curva del materiale dai parametri del server, con i valori accanto`

---

### Task 5: i riduttori — sezioni, materiali, danno, veste, e `origine.modificata`

**Files:**
- Modify: `static/comandi.js`
- Test: `static/test/comandi.test.js`

**Interfaces:**
- Consumes: `sezione`, `materiale`, `asteDellaSezione`, `sezioniDelMateriale` (Task 2); `LATI`, `VESTI`, `geometriaImpossibile` (Task 3).
- Produces:
  - `marcaModificata(entita)` (non esportata): se `entita.origine` c'è, `origine.modificata = true`.
  - `creaSezione(m, {nome = null, b, h, calcestruzzo, acciaio, copriferro = 30})`; nome di default `«b × h»` con `stampaNumero`.
  - `modificaSezione(m, {id, b?, h?, copriferro?, calcestruzzo?, acciaio?, staffe?, riduzione?})` — solo i campi presenti; `staffe: null` e `riduzione: null` cancellano.
  - `impostaFila(m, {id, lato, n, diametro})` — sostituisce la fila di quel lato; `n: 0` la toglie.
  - `assegnaSezione(m, {asta, sezione})` — `sezione: null` toglie l'assegnazione.
  - `eliminaSezione(m, {id})` — rifiuta se un'asta la usa; `eliminaMateriale(m, {id})` — rifiuta se una sezione lo usa.
  - `creaMateriale(m, {tipo, classe, nome = classe, classi = null})` — con `classi` (dal catalogo) la classe deve starci.
  - `modificaMateriale(m, {id, classe?, personalizzato?, valori?, legame?})` — `valori` e `legame` si **fondono** chiave per chiave; `valori: {k: null}` toglie la chiave.
  - `impostaDanno(m, {asta, danno})` — `danno: null` toglie; altrimenti `{fattore_E, fattore_fc ∈ (0, 1], nota}`.
  - `impostaVeste(m, {veste})` — in `VESTI`, scrive `impostazioni_analisi.veste` (crea il campo se manca).
  - `materialiDiDefault(m) → {modello, aggiunti: string[]}` — aggiunge `C25/30` e/o `B450C` se il tipo manca.
  - `DEFAULT_CALCESTRUZZO = "C25/30"`, `DEFAULT_ACCIAIO = "B450C"`.
  - **Story 55:** `spostaNodo`, `rinomina`, `impostaVincolo` guadagnano la riga `marcaModificata(bersaglio)`.

**Ingressi degeneri:**
- `creaSezione` con `b: 0`, `h: -1`, `NaN`, `"300"` → `ErroreComando` con rimedio; con `calcestruzzo` che non esiste o che è un acciaio → `ErroreComando` «materiale 2 è acciaio, non calcestruzzo»
- `creaSezione` senza `copriferro` → 30
- `modificaSezione` con un campo che rende la geometria impossibile (`h: 100` su una sezione armata con copriferro 40) → `ErroreComando` col messaggio di `geometriaImpossibile` e rimedio «riduci il copriferro o le barre»
- `modificaSezione` con `staffe: null` su una sezione con file → **accettata** (il deck non colloca barre, e l'ispettore lo dice), non un errore
- `impostaFila` con `lato: "nord"` → `ErroreComando` che elenca i quattro lati; `n: 0` toglie la fila; `n: 2.5` o `diametro: 0` → `ErroreComando`
- `impostaFila` che sfonda la luce (20Ø16 su 300) → `ErroreComando` col messaggio della geometria
- `assegnaSezione` con asta o sezione assenti → `ErroreComando`; `sezione: null` → `asta.sezione = null`
- `eliminaSezione` con un'asta che la usa → `ErroreComando` «la usano le aste 1, 2»; senza → sparisce e i contatori restano
- `creaMateriale` con `tipo: "legno"` → `ErroreComando`; con `classi: ["C25/30"]` e `classe: "C99/99"` → `ErroreComando` che elenca; senza `classi` → accettata (la verifica la fa il server al salvataggio)
- `modificaMateriale` con `valori: {E: "x"}` → `ErroreComando`; con `valori: {E: 31000}` su un materiale non personalizzato → **accettata** ma i valori contano solo con `personalizzato: true` (`nova/catalogo.py:38-40`): la riga resta, non si perde
- `impostaDanno` con `fattore_E: 0` o `1.2` → `ErroreComando` «fra 0 escluso e 1 compreso»; `nota` mancante → `""`; `danno: null` → il campo sparisce
- `impostaVeste` con `"mediana"` → `ErroreComando` che elenca le vesti
- `materialiDiDefault` su un modello che ha già i due tipi → `aggiunti = []` e il modello **identico** (`deepEqual`)
- ogni riduttore: il modello in ingresso resta intatto (`deepEqual` prima/dopo)
- story 55: `spostaNodo` su un nodo con `origine: {sorgente: "rilievo", modificata: false}` → `modificata: true`; su un nodo senza `origine` → nessun campo `origine` compare

- [ ] **Step 1: Test** — un `test(…)` per riga degli ingressi degeneri, con questo stampo:

```js
import { creaSezione, modificaSezione, impostaFila, assegnaSezione, eliminaSezione, creaMateriale, modificaMateriale,
         eliminaMateriale, impostaDanno, impostaVeste, materialiDiDefault, DEFAULT_CALCESTRUZZO, DEFAULT_ACCIAIO } from "../comandi.js";

const conMateriali = () => {
  let m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C25/30" });
  return creaMateriale(m, { tipo: "acciaio", classe: "B450C" });
};
const conSezione = () => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });

test("creaSezione: nome di default «300 × 500», copriferro 30, contatore aggiornato", () => {
  const m = conSezione();
  assert.deepEqual(m.sezioni[0], { id: 1, nome: "300 × 500", tipo: "rettangolare", b: 300, h: 500, calcestruzzo: 1, acciaio: 2, copriferro: 30, file: [], staffe: null });
  assert.equal(m.contatori.sezione, 1);
});
test("creaSezione rifiuta un materiale del tipo sbagliato", () => {
  assert.throws(() => creaSezione(conMateriali(), { b: 300, h: 500, calcestruzzo: 2, acciaio: 1 }), /acciaio, non calcestruzzo/);
});
test("impostaFila poi modificaSezione che schiaccia h: rifiutata col messaggio della geometria", () => {
  let m = modificaSezione(conSezione(), { id: 1, staffe: { diametro: 8, passo: 150, bracci: 2 }, copriferro: 40 });
  m = impostaFila(m, { id: 1, lato: "inf", n: 1, diametro: 16 });
  assert.throws(() => modificaSezione(m, { id: 1, h: 100 }), /copriferri opposti/);
});
test("story 55: spostare un nodo importato lo marca modificato, uno disegnato resta senza origine", () => {
  let m = creaNodo(modelloVuoto(), { x: 0, z: 0 });
  m.nodi[0].origine = { sorgente: "rilievo", modificata: false };
  m = spostaNodo(m, { id: 1, x: 10 });
  assert.equal(m.nodi[0].origine.modificata, true);
  const n = spostaNodo(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { id: 1, x: 10 });
  assert.equal("origine" in n.nodi[0], false);
});
test("materialiDiDefault non tocca un modello che ha già i due tipi", () => {
  const m = conMateriali();
  const { modello, aggiunti } = materialiDiDefault(m);
  assert.deepEqual(aggiunti, []); assert.deepEqual(modello, m);
  assert.deepEqual(materialiDiDefault(modelloVuoto()).aggiunti, [DEFAULT_CALCESTRUZZO, DEFAULT_ACCIAIO]);
});
```

```js
test("impostaFila: lato ignoto rifiutato con i quattro lati, n = 0 toglie la fila", () => {
  const m = modificaSezione(conSezione(), { id: 1, staffe: { diametro: 8, passo: 150, bracci: 2 } });
  assert.throws(() => impostaFila(m, { id: 1, lato: "nord", n: 2, diametro: 16 }), /inf, sup, sx, dx/);
  const con = impostaFila(m, { id: 1, lato: "inf", n: 3, diametro: 16 });
  assert.deepEqual(con.sezioni[0].file, [{ lato: "inf", n: 3, diametro: 16 }]);
  assert.deepEqual(impostaFila(con, { id: 1, lato: "inf", n: 0, diametro: 16 }).sezioni[0].file, []);
  assert.throws(() => impostaFila(m, { id: 1, lato: "inf", n: 20, diametro: 16 }), /ingombrano/);
});
test("assegnaSezione: null toglie, una sezione assente rifiuta", () => {
  let m = estrudi(creaNodo(conSezione(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  m = assegnaSezione(m, { asta: 1, sezione: 1 });
  assert.equal(m.aste[0].sezione, 1);
  assert.equal(assegnaSezione(m, { asta: 1, sezione: null }).aste[0].sezione, null);
  assert.throws(() => assegnaSezione(m, { asta: 1, sezione: 9 }), /sezione 9 non esiste/);
});
test("eliminaSezione rifiuta se un'asta la usa e nomina le aste", () => {
  let m = estrudi(creaNodo(conSezione(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  m = assegnaSezione(m, { asta: 1, sezione: 1 });
  assert.throws(() => eliminaSezione(m, { id: 1 }), /aste 1/);
  const via = eliminaSezione(assegnaSezione(m, { asta: 1, sezione: null }), { id: 1 });
  assert.deepEqual(via.sezioni, []); assert.equal(via.contatori.sezione, 1);
});
test("creaMateriale: tipo ignoto, classe vuota, classe fuori catalogo", () => {
  assert.throws(() => creaMateriale(modelloVuoto(), { tipo: "legno", classe: "x" }), /calcestruzzo o acciaio/);
  assert.throws(() => creaMateriale(modelloVuoto(), { tipo: "acciaio", classe: "  " }), /vuota/);
  assert.throws(() => creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C99/99", classi: ["C25/30"] }), /C25\/30/);
  const m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C99/99" });  // senza catalogo: passa, giudica il server
  assert.equal(m.materiali[0].classe, "C99/99");
});
test("modificaMateriale fonde i valori, null toglie una chiave, un testo si rifiuta", () => {
  let m = modificaMateriale(conMateriali(), { id: 1, personalizzato: true, valori: { E: 31000, fck: 28 } });
  m = modificaMateriale(m, { id: 1, valori: { fck: null, nu: 0.2 } });
  assert.deepEqual(m.materiali[0].valori, { E: 31000, nu: 0.2 });
  assert.throws(() => modificaMateriale(m, { id: 1, valori: { E: "x" } }), ErroreComando);
});
test("eliminaMateriale rifiuta se una sezione lo usa", () => {
  assert.throws(() => eliminaMateriale(conSezione(), { id: 1 }), /sezioni 1/);
  assert.equal(eliminaMateriale(conMateriali(), { id: 1 }).materiali.length, 1);
});
test("impostaDanno: fuori intervallo rifiutato, nota di default vuota, null toglie", () => {
  let m = estrudi(creaNodo(modelloVuoto(), { x: 0, z: 0 }), { da: 1, dx: 3000, dz: 0 });
  assert.throws(() => impostaDanno(m, { asta: 1, danno: { fattore_E: 0, fattore_fc: 1 } }), /fra 0 escluso e 1 compreso/);
  assert.throws(() => impostaDanno(m, { asta: 1, danno: { fattore_E: 1.2, fattore_fc: 1 } }), ErroreComando);
  m = impostaDanno(m, { asta: 1, danno: { fattore_E: 0.8, fattore_fc: 0.9 } });
  assert.deepEqual(m.aste[0].danno, { fattore_E: 0.8, fattore_fc: 0.9, nota: "" });
  assert.equal("danno" in impostaDanno(m, { asta: 1, danno: null }).aste[0], false);
});
test("impostaVeste: ignota rifiutata, altrimenti scrive le impostazioni anche se mancano", () => {
  assert.throws(() => impostaVeste(modelloVuoto(), { veste: "mediana" }), /caratteristica, media, progetto, esistente/);
  const m = modelloVuoto(); delete m.impostazioni_analisi;
  assert.deepEqual(impostaVeste(m, { veste: "progetto" }).impostazioni_analisi, { fibre: 10, veste: "progetto" });
});
test("nessun riduttore nuovo tocca il modello che riceve", () => {
  const m = conSezione(); const prima = structuredClone(m);
  modificaSezione(m, { id: 1, b: 400 }); impostaFila(modificaSezione(m, { id: 1, staffe: { diametro: 8, passo: 150 } }), { id: 1, lato: "inf", n: 2, diametro: 16 });
  creaMateriale(m, { tipo: "acciaio", classe: "B450A" }); impostaVeste(m, { veste: "progetto" });
  assert.deepEqual(m, prima);
});
```

- [ ] **Step 2: Fallisce (export mancanti)**
- [ ] **Step 3: Implementazione** — in coda a `comandi.js`, con gli import in testa aggiornati:

```js
import { prossimoId, nodo, asteDelNodo, nodoVicino, TOLLERANZA_MM, sezione, materiale, asteDellaSezione, sezioniDelMateriale } from "./modello.js";
import { GRADI } from "./vincoli.js";
import { LATI, VESTI, geometriaImpossibile } from "./sezione.js";
import { stampaNumero } from "./numeri.js";
```

```js
// --- story 55: l'editing non cancella l'origine, la marca -------------------------------
/** Una riga in ogni riduttore che modifica un'entità: se viene dal rilievo, ora è anche
 *  dell'utente. Senza `origine` non si inventa niente (`nova/modello.py:43-49`). */
const marcaModificata = (e) => { if (e.origine) e.origine = { ...e.origine, modificata: true }; };
```

In `spostaNodo` prima del `return n;`: `marcaModificata(bersaglio);`. In `rinomina` dopo `bersaglio.nome = …`: `marcaModificata(bersaglio);`. In `impostaVincolo` prima del `return n;`: `marcaModificata(bersaglio);`.

```js
// --- sezioni ------------------------------------------------------------------------------
export const DEFAULT_CALCESTRUZZO = "C25/30";
export const DEFAULT_ACCIAIO = "B450C";
const TIPI_MATERIALE = ["calcestruzzo", "acciaio"];

const positivo = (v, nome) => {
  numero(v, nome);
  if (v <= 0) throw new ErroreComando(`${nome} deve essere maggiore di zero`, "scrivi una misura in millimetri");
  return v;
};
const materialeDiTipo = (m, id, tipo) => {
  const k = materiale(m, id);
  if (!k) throw new ErroreComando(`il materiale ${id} non esiste`, "premi C e scrivi una classe, per esempio C25/30");
  if (k.tipo !== tipo) throw new ErroreComando(`il materiale ${id} è ${k.tipo}, non ${tipo}`, `scegli un ${tipo}`);
  return k;
};
const sezioneEsistente = (m, id) => {
  const s = sezione(m, id);
  if (!s) throw new ErroreComando(`la sezione ${id} non esiste`, "seleziona una sezione dall'albero e ripeti");
  return s;
};
/** La geometria si giudica **dopo** la modifica, sul risultato: è quello che il deck vedrà. */
const geometriaAccettabile = (s) => {
  const motivo = geometriaImpossibile(s);
  if (motivo) throw new ErroreComando(motivo, "riduci il copriferro, il diametro o il numero delle barre");
};

export function creaSezione(m, { nome = null, b, h, calcestruzzo, acciaio, copriferro = 30 }) {
  positivo(b, "b"); positivo(h, "h"); numero(copriferro, "copriferro");
  if (copriferro < 0) throw new ErroreComando("il copriferro non può essere negativo", "scrivi zero o una misura");
  materialeDiTipo(m, calcestruzzo, "calcestruzzo"); materialeDiTipo(m, acciaio, "acciaio");
  const n = copia(m);
  const id = prossimoId(n, "sezione");
  const mm = (v) => stampaNumero(v, { decimali: 0, migliaia: true });
  n.sezioni.push({ id, nome: nome ?? `${mm(b)} × ${mm(h)}`, tipo: "rettangolare", b, h, calcestruzzo, acciaio, copriferro, file: [], staffe: null });
  n.contatori.sezione = id;
  return n;
}

export function modificaSezione(m, { id, ...campi }) {
  sezioneEsistente(m, id);
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  if ("b" in campi) s.b = positivo(campi.b, "b");
  if ("h" in campi) s.h = positivo(campi.h, "h");
  if ("copriferro" in campi) { numero(campi.copriferro, "copriferro"); if (campi.copriferro < 0) throw new ErroreComando("il copriferro non può essere negativo", "scrivi zero o una misura"); s.copriferro = campi.copriferro; }
  if ("calcestruzzo" in campi) { materialeDiTipo(n, campi.calcestruzzo, "calcestruzzo"); s.calcestruzzo = campi.calcestruzzo; }
  if ("acciaio" in campi) { materialeDiTipo(n, campi.acciaio, "acciaio"); s.acciaio = campi.acciaio; }
  if ("staffe" in campi) {
    if (campi.staffe === null) s.staffe = null;
    else {
      const { diametro, passo, bracci = 2 } = campi.staffe;
      positivo(diametro, "diametro delle staffe"); positivo(passo, "passo delle staffe");
      if (!Number.isInteger(bracci) || bracci < 2) throw new ErroreComando("i bracci delle staffe sono almeno due", "scrivi 2 o più");
      s.staffe = { diametro, passo, bracci };
    }
  }
  if ("riduzione" in campi) {
    if (campi.riduzione === null) delete s.riduzione;
    else {
      const r = Object.fromEntries(LATI.map((l) => [l, campi.riduzione[l] ?? 0]));
      for (const l of LATI) { numero(r[l], `riduzione ${l}`); if (r[l] < 0) throw new ErroreComando(`la riduzione ${l} non può essere negativa`, "millimetri mancanti, zero o più"); }
      s.riduzione = r;
    }
  }
  geometriaAccettabile(s);
  marcaModificata(s);
  return n;
}

export function impostaFila(m, { id, lato, n: quante, diametro }) {
  sezioneEsistente(m, id);
  if (!LATI.includes(lato)) throw new ErroreComando(`lato «${lato}» sconosciuto`, `i lati sono ${LATI.join(", ")}`);
  if (!Number.isInteger(quante) || quante < 0) throw new ErroreComando("il numero di barre è un intero, zero o più", "zero toglie la fila");
  const n = copia(m);
  const s = n.sezioni.find((k) => k.id === id);
  s.file = s.file.filter((f) => f.lato !== lato);
  if (quante > 0) { positivo(diametro, "diametro"); s.file.push({ lato, n: quante, diametro }); }
  s.file.sort((a, b) => LATI.indexOf(a.lato) - LATI.indexOf(b.lato));
  geometriaAccettabile(s);
  marcaModificata(s);
  return n;
}

export function assegnaSezione(m, { asta, sezione: idSezione }) {
  const a = m.aste.find((k) => k.id === asta);
  if (!a) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  if (idSezione !== null) sezioneEsistente(m, idSezione);
  const n = copia(m);
  const b = n.aste.find((k) => k.id === asta);
  b.sezione = idSezione;
  marcaModificata(b);
  return n;
}

export function eliminaSezione(m, { id }) {
  sezioneEsistente(m, id);
  const usata = asteDellaSezione(m, id).map((a) => a.id);
  if (usata.length) throw new ErroreComando(`la sezione ${id} la usano le aste ${usata.join(", ")}`, "assegna loro un'altra sezione, poi elimina");
  const n = copia(m);
  n.sezioni = n.sezioni.filter((s) => s.id !== id);
  return n;  // i contatori restano: un identificatore eliminato non si riusa
}

// --- materiali ----------------------------------------------------------------------------
export function creaMateriale(m, { tipo, classe, nome = null, classi = null }) {
  if (!TIPI_MATERIALE.includes(tipo)) throw new ErroreComando(`tipo «${tipo}» sconosciuto`, "calcestruzzo o acciaio");
  const c = String(classe ?? "").trim();
  if (c === "") throw new ErroreComando("la classe non può essere vuota", "per esempio C25/30 o B450C");
  if (classi && !classi.some((k) => k.toUpperCase() === c.toUpperCase())) {
    throw new ErroreComando(`classe «${c}» non a catalogo`, `le classi sono ${classi.join(", ")}`);
  }
  const n = copia(m);
  const id = prossimoId(n, "materiale");
  n.materiali.push({ id, nome: nome ?? c, tipo, classe: c, valori: {}, personalizzato: false });
  n.contatori.materiale = id;
  return n;
}

export function modificaMateriale(m, { id, ...campi }) {
  if (!materiale(m, id)) throw new ErroreComando(`il materiale ${id} non esiste`, "seleziona un materiale dall'albero");
  const n = copia(m);
  const k = n.materiali.find((x) => x.id === id);
  if ("classe" in campi) { const c = String(campi.classe ?? "").trim(); if (c === "") throw new ErroreComando("la classe non può essere vuota"); k.classe = c; }
  if ("personalizzato" in campi) k.personalizzato = Boolean(campi.personalizzato);
  if ("valori" in campi) {
    for (const [chiave, v] of Object.entries(campi.valori ?? {})) {
      if (v === null) delete k.valori[chiave];
      else { numero(v, chiave); k.valori[chiave] = v; }
    }
  }
  if ("legame" in campi) k.legame = { ...(k.legame ?? {}), ...campi.legame };
  marcaModificata(k);
  return n;
}

export function eliminaMateriale(m, { id }) {
  if (!materiale(m, id)) throw new ErroreComando(`il materiale ${id} non esiste`);
  const usato = sezioniDelMateriale(m, id).map((s) => s.id);
  if (usato.length) throw new ErroreComando(`il materiale ${id} lo usano le sezioni ${usato.join(", ")}`, "cambia loro il materiale, poi elimina");
  const n = copia(m);
  n.materiali = n.materiali.filter((k) => k.id !== id);
  return n;
}

/** I due materiali che una sezione pretende, se mancano. La prima sezione di un modello
 *  disegnato da zero li porta con sé (decisione 2 del piano): la Storia dice quali. */
export function materialiDiDefault(m) {
  const aggiunti = [];
  let n = m;
  for (const [tipo, classe] of [["calcestruzzo", DEFAULT_CALCESTRUZZO], ["acciaio", DEFAULT_ACCIAIO]]) {
    if (!n.materiali.some((k) => k.tipo === tipo)) { n = creaMateriale(n, { tipo, classe }); aggiunti.push(classe); }
  }
  return { modello: n, aggiunti };
}

// --- danno e veste ------------------------------------------------------------------------
export function impostaDanno(m, { asta, danno }) {
  if (!m.aste.some((k) => k.id === asta)) throw new ErroreComando(`l'asta ${asta} non esiste`, "seleziona un'asta e ripeti");
  const n = copia(m);
  const a = n.aste.find((k) => k.id === asta);
  if (danno === null || danno === undefined) delete a.danno;
  else {
    const { fattore_E, fattore_fc, nota = "" } = danno;
    for (const [v, nome] of [[fattore_E, "fattore su E"], [fattore_fc, "fattore su fc"]]) {
      numero(v, nome);
      if (v <= 0 || v > 1) throw new ErroreComando(`${nome} deve stare fra 0 escluso e 1 compreso`, "1 vuol dire integro, 0,8 vuol dire un quinto in meno");
    }
    a.danno = { fattore_E, fattore_fc, nota: String(nota) };
  }
  marcaModificata(a);
  return n;
}

export function impostaVeste(m, { veste }) {
  if (!VESTI.includes(veste)) throw new ErroreComando(`veste «${veste}» sconosciuta`, `le vesti sono ${VESTI.join(", ")}`);
  const n = copia(m);
  n.impostazioni_analisi = { ...(n.impostazioni_analisi ?? { fibre: 10 }), veste };
  return n;
}
```

- [ ] **Step 4: Verde (tutti i test JS); commit** `feat(comandi): sezioni, materiali, danno, veste, e l'origine che si marca modificata`

---

### Task 6: `tastiera.js` — `S`, `C`, `D`

**Files:**
- Modify: `static/tastiera.js:14-37` (tre voci), `:51-56` (tre chiavi)
- Test: `static/test/tastiera.test.js`

**Interfaces:**
- Produces: voci `{codice: "sezione", tasto: "S", etichetta: "sezione", aiuto: "b × h in mm, o il nome di una sezione", contesto: "salvo-ghost", esempio: "300 × 500", campo: "sezione"}`, `{codice: "materiale", tasto: "C", etichetta: "materiale", aiuto: "una classe: C25/30 o B450C", contesto: "salvo-ghost", esempio: "C25/30", campo: "classe"}`, `{codice: "danno", tasto: "D", etichetta: "danno", aiuto: "fattori su E; fc, poi la nota", contesto: "selezione", esempio: "0,8; 0,9; martinetto 3", campo: "danno di"}`; `SENZA_MODIFICATORE` con `s`, `c`, `d`.

**Ingressi degeneri:**
- `⌘S` resta `salva` e `S` nudo è `sezione`: `voceDaEvento({key: "s", metaKey: true})` → `salva`, senza modificatore → `sezione`
- `⇧S` (maiuscola senza comando) → `sezione`, come `⇧N` fa `nodo`
- ogni tasto senza modificatore compare **una volta** fra le chiavi di `SENZA_MODIFICATORE` (un `Map` lo garantisce: il test conta le voci di `TASTI` senza `modificatore` contro le chiavi distinte, per intercettare una lettera assegnata due volte a codici diversi)
- la barra col campo aperto stampa ancora solo `conferma` e `annulla` (`vociDellaBarra("comando")` non cambia)

- [ ] **Step 1: Test**

```js
test("S nudo è sezione, ⌘S resta salva", () => {
  assert.equal(voceDaEvento({ key: "s" })?.codice, "sezione");
  assert.equal(voceDaEvento({ key: "s", metaKey: true })?.codice, "salva");
  assert.equal(voceDaEvento({ key: "S", shiftKey: true })?.codice, "sezione");
});
test("C e D aprono materiale e danno", () => {
  assert.equal(voceDaEvento({ key: "c" })?.codice, "materiale");
  assert.equal(voceDaEvento({ key: "d" })?.codice, "danno");
});
test("nessuna lettera nuda serve due codici", () => {
  const codici = new Set();
  for (const k of "abcdefghijklmnopqrstuvwxyz") { const v = voceDaEvento({ key: k }); if (v) codici.add(v.codice); }
  const attesi = TASTI.filter((v) => !v.modificatore && /^[A-Z]$/.test(v.tasto)).map((v) => v.codice);
  assert.deepEqual([...codici].sort(), [...new Set(attesi)].sort());
});
test("col campo aperto la barra resta a due voci", () => {
  assert.deepEqual(vociDellaBarra("comando").map((v) => v.codice), ["conferma", "annulla"]);
});
```

- [ ] **Step 2: Fallisce; Step 3: le tre voci** dopo `rinomina` in `TASTI`, e in `SENZA_MODIFICATORE`: `["s", "sezione"], ["c", "materiale"], ["d", "danno"],`. Commento accanto a `["s", "sezione"]`: «`s` nudo e `⌘S` stanno in due mappe: il modificatore le separa prima del `get` (`voceDaEvento`)».
- [ ] **Step 4: Verde; commit** `feat(tastiera): S sezione, C materiale, D danno`

---

### Task 7: `albero.js` — i rami «Sezioni» e «Materiali»

**Files:**
- Modify: `static/albero.js:22-53`
- Create: `static/test/albero.test.js`

**Interfaces:**
- Produces: dopo nodi e aste, le voci `{tipo: "sezione", id, testo: "<nome> · <b> × <h> mm · <k> aste"}` e `{tipo: "materiale", id, testo: "<nome> · <classe>[ · personalizzato]"}`, ognuna preceduta dal suo gruppo (`<li class="gruppo" role="presentation">Sezioni</li>`) **solo se il gruppo non è vuoto**; anche «Nodi» e «Aste» guadagnano il loro gruppo, per coerenza. La selezione e la tastiera funzionano come per nodi e aste.

**Ingressi degeneri:**
- modello con nodi e nessuna sezione → nessuna riga «Sezioni»
- sezione usata da zero aste → «0 aste», non «aste» nudo né `undefined`
- materiale `personalizzato: true` → il testo porta «personalizzato»; `false` → no
- clic su una voce «gruppo» → `suSelezione` **non** chiamata (non ha `data-tipo`)
- Invio su una voce sezione → `suSelezione("sezione", id)`

- [ ] **Step 1: Test** — DOM finto come `pannello.test.js`, con in più `dataset: {}`, `style: {}`, `closest(sel)` che torna `this` se `this.dataset.tipo` c'è, altrimenti `null`:

```js
function elementoFinto() {
  const listeners = {};
  return {
    textContent: "", hidden: false, className: "", tabIndex: -1, dataset: {}, style: {}, _figli: [], _attrs: {},
    setAttribute(k, v) { this._attrs[k] = String(v); }, getAttribute(k) { return this._attrs[k]; },
    addEventListener(ev, fn) { (listeners[ev] ??= []).push(fn); },
    dispatch(ev, dati = {}) { (listeners[ev] ?? []).forEach((fn) => fn({ target: this, preventDefault() {}, ...dati })); },
    append(...f) { this._figli.push(...f); }, replaceChildren(...f) { this._figli = f; },
    closest() { return this.dataset.tipo ? this : null; },
  };
}
globalThis.document = { createElement: () => elementoFinto(), createTextNode: (t) => ({ textContent: t }) };

test("l'albero elenca sezioni e materiali con i loro gruppi, e i gruppi vuoti non compaiono", () => {
  const elenco = elementoFinto(), vuoto = elementoFinto();
  const scelte = [];
  const albero = creaAlbero(elenco, vuoto, { suSelezione: (t, id) => scelte.push([t, id]) });
  let m = creaMateriale(modelloVuoto(), { tipo: "calcestruzzo", classe: "C25/30" });
  m = creaMateriale(m, { tipo: "acciaio", classe: "B450C" });
  m = creaSezione(m, { b: 300, h: 500, calcestruzzo: 1, acciaio: 2 });
  albero.disegna(m, {});
  const testi = elenco._figli.map((li) => li.textContent);
  assert.ok(testi.includes("Sezioni") && testi.includes("Materiali") && !testi.includes("Nodi"));
  assert.ok(testi.includes("300 × 500 · 300 × 500 mm · 0 aste"));
  assert.ok(testi.includes("C25/30 · C25/30"));
  const voce = elenco._figli.find((li) => li.dataset.tipo === "sezione");
  voce.dispatch("keydown", { key: "Enter" });
  assert.deepEqual(scelte, [["sezione", 1]]);
});
```

(Il listener `keydown` è sull'elenco, non sulla voce: nel test si chiama `elenco.dispatch("keydown", { key: "Enter", target: voce })` — adegua `dispatch` perché `target` passato vinca su `this`.)

- [ ] **Step 2: Fallisce; Step 3: implementazione** — in `disegna`, prima del ciclo dei nodi, un helper `gruppo(nome)` che spinge `{gruppo: nome}` solo se seguono voci; dopo le aste:

```js
    if (m.sezioni.length) righe.push({ gruppo: "Sezioni" });
    for (const s of m.sezioni) {
      righe.push({ tipo: "sezione", id: s.id, testo: `${s.nome} · ${mm(s.b)} × ${mm(s.h)} mm · ${asteDellaSezione(m, s.id).length} aste` });
    }
    if (m.materiali.length) righe.push({ gruppo: "Materiali" });
    for (const k of m.materiali) {
      righe.push({ tipo: "materiale", id: k.id, testo: `${k.nome} · ${k.classe}${k.personalizzato ? " · personalizzato" : ""}` });
    }
```

e nel `map` che costruisce i `<li>`: se `r.gruppo`, un `<li class="gruppo" role="presentation">` con il solo testo, senza `tabIndex`, `dataset` né `aria-pressed`. «Nodi» e «Aste» allo stesso modo prima dei rispettivi cicli.

- [ ] **Step 4: Verde; commit** `feat(albero): i rami delle sezioni e dei materiali`

---

### Task 8: `pannello.js` — tre editor con la forma di `editorVincolo`

**Files:**
- Modify: `static/pannello.js`
- Modify: `static/index.html` (`#pannello-vincolo` → `#pannello-editor`; stato vuoto del pannello che nomina `S` e `C`)
- Modify: `static/stile.css` (classi `.editor`, `.editor-campi`, `.sezione-disegno`, `.curva`, `.avviso`, `select`, `.gruppo`)
- Test: `static/test/pannello.test.js`

**Interfaces:**
- Consumes: Task 2-5; `svgSezione`, `geometriaImpossibile` (Task 3); `puntiConcrete02`, `puntiSteel02`, `valoriDaMostrare`, `svgCurva` (Task 4).
- Produces:
  - `righe(m, selezione)` regge `sezione` e `materiale`; `righeDiAsta` guadagna `sezione` **per nome** («300 × 500», non «1») e `danno` («E ×0,8 · fc ×0,9 · martinetto 3» o «nessuno»); `righeDiSezione`: identificatore, nome, dimensioni, copriferro, calcestruzzo e acciaio per nome, staffe («Ø8 / 150, 2 bracci» o «nessuna»), barre («inf 3Ø16 · sup 2Ø16 · sx 1Ø12 · dx 1Ø12» o «nessuna»), riduzione, «usata da k aste», origine («rilievo, modificata» / «utente» / «—»); `righeDiMateriale`: identificatore, nome, tipo, classe, personalizzato, origine.
  - `creaPannello({dati, vuoto, editor}, azioni)` con `azioni = {suVincolo, suSezione(id, campi), suFila(id, lato, n, diametro), suAssegna(asta, sezione|null), suDanno(asta, danno|null), suMateriale(id, campi), suVeste(veste), suAvviso(testo)}`; `disegna(m, selezione, {catalogo = null, legame = null} = {})`.
  - Gli editor ritornano `{elementi, controlli}` e `creaPannello` ritrova il fuoco per indice in `controlli` (la forma vecchia `{bottoni, caselle}` di `editorVincolo` si appiattisce in `controlli: [...bottoni, ...caselle]`).
  - **`editorAsta`**: `<fieldset>` «sezione» con un `<select>` («— non assegnata» + una voce per sezione, per nome) → `suAssegna`; `<fieldset>` «danno dal rilievo» con `fattore su E`, `fattore su fc` (campi numerici), `nota` (testo), e il bottone «togli danno» se c'è → `suDanno(asta, {…})` con i tre valori correnti a ogni cambio.
  - **`editorSezione`**: «dimensioni» (b, h, copriferro in mm); «materiali» (due `<select>` filtrati per tipo); «staffe» (bottone «aggiungi staffe Ø8 / 150» se mancano, altrimenti diametro, passo, bracci e «togli staffe»); «barre per lato» (quattro righe `lato · n · Ø`, con `n = 0` che toglie); «riduzione, mm mancanti» (quattro campi); il disegno (`svgSezione` in un `<div class="sezione-disegno">` via `innerHTML`); sotto il disegno, se `geometriaImpossibile` non è `null`, un `<p class="avviso">` col motivo — **preceduto dalla parola «attenzione:»**, così il rosso non è l'unico canale. Senza staffe, sotto il disegno: «senza staffe il deck non colloca le barre: aggiungile per vederle».
  - **`editorMateriale`**: «classe» (`<select>` da `catalogo[tipo]`, o la sola classe corrente se il catalogo non è arrivato); «personalizzato» (casella) → `suMateriale(id, {personalizzato})`; se personalizzato, «valori» con un campo per chiave di `legame.catalogo` (E, nu, densita, fck…/fyk…) precompilato con il valore in vigore → `suMateriale(id, {valori: {[k]: v}})`; «veste per l'analisi (tutto il modello)» (`<select>` fra le quattro) → `suVeste`; «legame» con la curva (`svgCurva`), la `<dl>` dei `valoriDaMostrare` (valori con `stampaNumero`, unità accanto), l'`articolo`, gli `avvisi` in un `<p class="avviso">` con «attenzione:», le `note` in un `<p class="nota">`. Con `legame === null`: «valori in arrivo dal server…»; con `legame.errore`: `<p class="avviso">attenzione: ${errore}</p>`.
  - Ogni campo numerico: `<input type="text" class="numero" inputmode="decimal">` con `aria-label` completo, che legge con `leggiNumero` al `change` e, se non legge, **ripristina il testo di prima** e chiama `suAvviso("«testo» non è un numero")`.

**Ingressi degeneri:**
- selezione che punta a una sezione sparita (`⌘Z` dopo `S`) → `righe` = `null`, editor vuoto, `editorAttuale = null`
- asta con `sezione: null` → riga «sezione: non assegnata» e il `<select>` sulla voce vuota
- asta con `danno` senza `nota` → riga «E ×0,8 · fc ×0,9» senza trattino appeso
- sezione senza staffe e con file → nessun cerchio nel disegno e la frase «senza staffe il deck non colloca le barre»
- sezione con geometria impossibile → il disegno c'è (contorno e staffa), nessun cerchio, e l'avviso col motivo
- materiale con `catalogo === null` → il `<select>` della classe ha una sola voce, quella corrente, e resta abilitato
- materiale con `legame === null` → «valori in arrivo dal server…», nessuna `<dl>`
- materiale con `legame = {errore: "…"}` → l'avviso, nessuna curva
- campo `b` con testo «trecento» → `suAvviso` chiamata, `suSezione` **non** chiamata, il campo torna a «300»
- cambio del valore in un campo, poi ridisegno → il fuoco resta su quel campo (per indice in `controlli`)
- `suDanno` da un campo con gli altri due vuoti → i tre valori inviati sono `{fattore_E: 1, fattore_fc: 1, nota: ""}` con il solo campo cambiato diverso

- [ ] **Step 1: Test** — nello stesso file di test, con il DOM finto esteso (`value`, `innerHTML`, `selected`, `dispatch` con `target`). Uno per riga degli ingressi degeneri; due per intero:

```js
test("editorAsta: scegliere una sezione dal select chiama suAssegna con l'identificatore", () => {
  const { pannello, editor, chiamate } = pannelloFinto();
  const m = conSezioneEAsta();  // due nodi, un'asta, una sezione
  pannello.disegna(m, { tipo: "asta", id: 1 });
  const select = editor._figli[0]._figli[1]._figli[1];  // fieldset «sezione» → label → select
  select.value = "1"; select.dispatch("change");
  assert.deepEqual(chiamate.suAssegna, [[1, 1]]);
  select.value = ""; select.dispatch("change");
  assert.deepEqual(chiamate.suAssegna[1], [1, null]);
});
test("editorSezione: un testo che non è un numero avvisa, non modifica, e ripristina", () => {
  const { pannello, editor, chiamate } = pannelloFinto();
  pannello.disegna(conSezione(), { tipo: "sezione", id: 1 });
  const campoB = editor._figli[0]._figli[1]._figli[1];  // fieldset «dimensioni» → label b → input
  campoB.value = "trecento"; campoB.dispatch("change");
  assert.equal(chiamate.suSezione.length, 0);
  assert.equal(chiamate.suAvviso[0], "«trecento» non è un numero");
  assert.equal(campoB.value, "300");
});
```

- [ ] **Step 2: Fallisce; Step 3: implementazione.** Due helper condivisi in testa agli editor:

```js
const testoNumero = (v) => (v === null || v === undefined ? "" : stampaNumero(v, { decimali: Number.isInteger(v) ? 0 : 3 }));

/** Un campo numerico con nome accessibile intero, che legge con `leggiNumero` al `change`.
 *  Se il testo non si legge, torna com'era e lo dice: un campo che tiene «trecento» a schermo
 *  e un modello che tiene 300 sono due verità. */
function campoNumero({ etichetta, nome = etichetta, valore, unita = "", alCambio, suAvviso }) {
  const et = document.createElement("label");
  const c = document.createElement("input");
  c.type = "text"; c.className = "numero"; c.value = testoNumero(valore);
  c.setAttribute("inputmode", "decimal"); c.setAttribute("aria-label", nome);
  c.addEventListener("change", () => {
    const v = leggiNumero(c.value);
    if (v === null) { suAvviso(`«${c.value}» non è un numero`); c.value = testoNumero(valore); return; }
    alCambio(v);
  });
  et.append(document.createTextNode(etichetta), c);
  if (unita) et.append(document.createTextNode(unita));
  return { etichetta: et, controllo: c };
}

function scelta({ etichetta, nome = etichetta, opzioni, valore, alCambio }) {
  const et = document.createElement("label");
  const s = document.createElement("select");
  s.setAttribute("aria-label", nome);
  for (const [v, testo] of opzioni) {
    const o = document.createElement("option"); o.value = String(v); o.textContent = testo;
    if (String(v) === String(valore ?? "")) o.selected = true;
    s.append(o);
  }
  s.addEventListener("change", () => alCambio(s.value));
  et.append(document.createTextNode(etichetta), s);
  return { etichetta: et, controllo: s };
}

function gruppo(legenda, classe) {
  const f = document.createElement("fieldset"); f.className = classe;
  const l = document.createElement("legend"); l.textContent = legenda; f.append(l);
  return f;
}
```

`editorAsta(m, a, azioni)`:

```js
function editorAsta(m, a, azioni) {
  const controlli = [];
  const sez = gruppo("sezione", "editor");
  const s = scelta({ etichetta: "sezione", nome: `sezione dell'asta ${a.id}`,
                     opzioni: [["", "— non assegnata"], ...m.sezioni.map((k) => [k.id, k.nome])], valore: a.sezione,
                     alCambio: (v) => azioni.suAssegna(a.id, v === "" ? null : Number(v)) });
  sez.append(s.etichetta); controlli.push(s.controllo);

  const d = a.danno ?? { fattore_E: 1, fattore_fc: 1, nota: "" };
  const danno = gruppo("danno dal rilievo", "editor editor-campi");
  const invia = (campo, v) => azioni.suDanno(a.id, { ...d, [campo]: v });
  for (const [campo, etichetta] of [["fattore_E", "fattore su E"], ["fattore_fc", "fattore su fc"]]) {
    const c = campoNumero({ etichetta, nome: `${etichetta} dell'asta ${a.id}`, valore: d[campo], alCambio: (v) => invia(campo, v), suAvviso: azioni.suAvviso });
    danno.append(c.etichetta); controlli.push(c.controllo);
  }
  const et = document.createElement("label");
  const nota = document.createElement("input");
  nota.type = "text"; nota.value = d.nota; nota.setAttribute("aria-label", `nota sul danno dell'asta ${a.id}`);
  nota.addEventListener("change", () => invia("nota", nota.value));
  et.append(document.createTextNode("nota"), nota);
  danno.append(et); controlli.push(nota);
  if (a.danno) {
    const via = document.createElement("button"); via.type = "button"; via.textContent = "togli danno";
    via.addEventListener("click", () => azioni.suDanno(a.id, null));
    danno.append(via); controlli.push(via);
  }
  return { elementi: [sez, danno], controlli };
}
```

`editorSezione(m, s, azioni)` — stessa forma: «dimensioni» (tre `campoNumero` con `unita: " mm"` → `azioni.suSezione(s.id, {b: v})` ecc.), «materiali» (due `scelta` sui materiali filtrati per tipo → `suSezione(s.id, {calcestruzzo: Number(v)})`), «staffe» (se `s.staffe` è `null`: un bottone «aggiungi staffe Ø8 / 150» → `suSezione(s.id, {staffe: {diametro: 8, passo: 150, bracci: 2}})`; altrimenti tre `campoNumero` → `suSezione(s.id, {staffe: {...s.staffe, diametro: v}})` e il bottone «togli staffe» → `{staffe: null}`), «barre per lato» (per ogni `lato` di `LATI`: la fila corrente o `{n: 0, diametro: 16}`; due `campoNumero` «n» e «Ø» → `suFila(s.id, lato, n, diametro)` con i valori correnti dell'altra casella), «riduzione, mm mancanti» (quattro `campoNumero` → `suSezione(s.id, {riduzione: {...r, [lato]: v}})`), poi:

```js
  const disegno = document.createElement("div");
  disegno.className = "sezione-disegno";
  disegno.innerHTML = svgSezione(s);
  const elementi = [dim, mat, staffe, barre, rid, disegno];
  const motivo = geometriaImpossibile(s);
  if (motivo) {
    const p = document.createElement("p"); p.className = "avviso"; p.textContent = `attenzione: ${motivo}`;
    elementi.push(p);
  } else if (!s.staffe && s.file.length) {
    const p = document.createElement("p"); p.className = "nota"; p.textContent = "senza staffe il deck non colloca le barre: aggiungile per vederle";
    elementi.push(p);
  }
  return { elementi, controlli };
```

`editorMateriale(m, k, azioni, {catalogo, legame})`:

```js
function editorMateriale(m, k, azioni, { catalogo, legame }) {
  const controlli = [];
  const classi = catalogo?.[k.tipo] ?? [k.classe];
  const cl = gruppo("classe", "editor");
  const s = scelta({ etichetta: "classe di norma", opzioni: classi.map((c) => [c, c]), valore: k.classe,
                     alCambio: (v) => azioni.suMateriale(k.id, { classe: v }) });
  cl.append(s.etichetta); controlli.push(s.controllo);
  const et = document.createElement("label");
  const pers = document.createElement("input"); pers.type = "checkbox"; pers.checked = k.personalizzato;
  pers.setAttribute("aria-label", "valori personalizzati, sovrascrivono la tabella");
  pers.addEventListener("change", () => azioni.suMateriale(k.id, { personalizzato: pers.checked }));
  et.append(pers, document.createTextNode("personalizzato")); cl.append(et); controlli.push(pers);

  const elementi = [cl];
  if (k.personalizzato && legame?.catalogo) {
    const val = gruppo("valori (sovrascrivono la tabella NTC)", "editor editor-campi");
    for (const [chiave, v] of Object.entries(legame.catalogo)) {
      const c = campoNumero({ etichetta: chiave, nome: `${chiave} di ${k.nome}`, valore: v,
                              alCambio: (x) => azioni.suMateriale(k.id, { valori: { [chiave]: x } }), suAvviso: azioni.suAvviso });
      val.append(c.etichetta); controlli.push(c.controllo);
    }
    elementi.push(val);
  }

  const ve = gruppo("veste per l'analisi (tutto il modello)", "editor");
  const v = scelta({ etichetta: "veste", opzioni: VESTI.map((x) => [x, x]), valore: vesteDi(m), alCambio: (x) => azioni.suVeste(x) });
  ve.append(v.etichetta); controlli.push(v.controllo);
  elementi.push(ve);

  const lg = gruppo("legame", "editor curva");
  if (legame === null) {
    const p = document.createElement("p"); p.className = "vuoto"; p.textContent = "valori in arrivo dal server…"; lg.append(p);
  } else if (legame.errore) {
    const p = document.createElement("p"); p.className = "avviso"; p.textContent = `attenzione: ${legame.errore}`; lg.append(p);
  } else {
    const c = legame.legame;
    const disegno = document.createElement("div");
    disegno.innerHTML = svgCurva(c.tipo === "concrete02" ? puntiConcrete02(c) : puntiSteel02(c));
    const dl = document.createElement("dl");
    for (const [nome, valore, unita] of valoriDaMostrare(c)) {
      const dt = document.createElement("dt"); dt.textContent = nome;
      const dd = document.createElement("dd"); dd.className = "numero";
      dd.textContent = `${stampaNumero(valore, { decimali: Math.abs(valore) < 1 ? 4 : 0, migliaia: true })}${unita ? ` ${unita}` : ""}`;
      dl.append(dt, dd);
    }
    const art = document.createElement("p"); art.className = "nota"; art.textContent = c.articolo;
    lg.append(disegno, dl, art);
    for (const a of legame.valori?.avvisi ?? []) { const p = document.createElement("p"); p.className = "avviso"; p.textContent = `attenzione: ${a}`; lg.append(p); }
    for (const n of legame.valori?.note ?? []) { const p = document.createElement("p"); p.className = "nota"; p.textContent = n; lg.append(p); }
  }
  elementi.push(lg);
  return { elementi, controlli };
}
```

`creaPannello`: `disegna(m, selezione, contesto = {})` sceglie l'editor per `selezione.tipo` (`nodo` → `editorVincolo` appiattito, `asta` → `editorAsta`, `sezione` → `editorSezione`, `materiale` → `editorMateriale(…, contesto)`), `fuocoAttuale` cerca in `editorAttuale.controlli`, e il commento sopra («il vincolo è dei nodi: su un'asta l'editor non compare affatto») si aggiorna: ora ogni tipo ha il suo.

`index.html`: `<div id="pannello-vincolo" hidden>` → `<div id="pannello-editor" hidden>`; lo stato vuoto del pannello: «Niente di selezionato. Premi <kbd>G</kbd> per girare fra i nodi, <kbd>S</kbd> per una sezione, <kbd>C</kbd> per un materiale, oppure clicca nel piano o nell'albero.»

`stile.css`, dopo le regole `.vincolo-*`:

```css
/* Gli editor della 11b: stessa forma di `.vincolo-gradi` (fieldset nativo, legenda piccola),
   etichetta e campo su una riga, i numeri in mono. Il rosso compare solo in `.avviso`, e
   sempre dopo la parola «attenzione»: il colore è il secondo canale, mai il primo. */
.editor { border: 0; padding: 0; margin: 6px 0 0; }
.editor legend { font-size: 10px; color: var(--testo-tenue); letter-spacing: 0.06em; text-transform: uppercase; padding: 0; }
.editor label { display: flex; gap: 6px; align-items: center; font-size: 11px; margin-top: 3px; }
.editor label > input[type="text"], .editor label > select { flex: 1 1 4em; min-width: 3em; font: inherit;
  font-family: var(--mono); background: var(--pannello); color: var(--inchiostro); border: 1px solid var(--tratto-forte); border-radius: 3px; padding: 1px 4px; }
.editor-campi { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 8px; }
.editor-campi legend { grid-column: 1 / -1; }
.editor button { font: inherit; font-size: 11px; padding: 2px 8px; margin-top: 4px; border: 1px solid var(--tratto-forte);
  border-radius: 3px; background: var(--pannello); color: var(--inchiostro); }
.editor input:focus-visible, .editor select:focus-visible, .editor button:focus-visible { outline: 2px solid var(--rosso); outline-offset: 1px; }
.editor input[type="checkbox"] { accent-color: var(--inchiostro); }
.sezione-disegno { margin-top: 6px; color: var(--inchiostro); }
.sezione-disegno svg, .curva svg { max-width: 100%; height: auto; display: block; }
.curva dl { margin: 4px 0 0; display: grid; grid-template-columns: auto 1fr; gap: 0 8px; font-size: 11px; }
.curva dt { color: var(--testo-tenue); } .curva dd { margin: 0; }
.avviso { color: var(--rosso); font-size: 11px; margin: 4px 0 0; }
.nota { color: var(--testo-tenue); font-size: 11px; margin: 4px 0 0; }
#albero li.gruppo { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--testo-tenue);
  margin-top: var(--passo); cursor: default; }
#albero li.gruppo:hover { background: none; }
```

- [ ] **Step 4: Verde; commit** `feat(pannello): gli editor di asta, sezione e materiale, con il disegno e la curva`

---

### Task 9: `app.js` — la cucitura

**Files:**
- Modify: `static/app.js` (import, stato, fetch del catalogo e del legame, callback degli editor, tre comandi nel campo, `esiste`, rami di `voce.codice`)

**Interfaces:**
- Consumes: tutto quanto sopra. `fetch` con lo stampo di `file.js:62`.
- Produces:
  - `catalogo` caricato una volta all'avvio (`GET /api/catalogo`); se la richiesta fallisce resta `null` e l'editor del materiale mostra la sola classe corrente (nessun blocco: P5).
  - `legamePer(m, id)`: cache `Map` con chiave `JSON.stringify([materiale, vesteDi(m)])`; alla prima richiesta il valore è `null` (l'ispettore dice «in arrivo»), poi `{valori, catalogo, legame}` o `{errore}`; ogni arrivo chiama `ridisegna()`. Le richieste in volo per una chiave non si duplicano.
  - callback: `suSezione → modificaSezione`, `suFila → impostaFila`, `suAssegna → assegnaSezione`, `suDanno → impostaDanno`, `suMateriale → modificaMateriale`, `suVeste → impostaVeste`, `suAvviso → dì`, ognuna con l'etichetta della Storia («sezione 1: b», «fila inf della sezione 1», «sezione dell'asta 3», «danno dell'asta 3», «materiale 1: classe», «veste media»).
  - `S`: con un'asta selezionata apre il campo «sezione di asta N» (`{...voce, campo: "sezione di"}`), altrimenti «sezione». Alla conferma: «b × h» → `materialiDiDefault` + `creaSezione` (+ `assegnaSezione` se c'è l'asta); un nome o un identificatore esistente → `assegnaSezione`; altrimenti ««…» non è né b × h né il nome di una sezione». Etichetta della Storia: «sezione 300 × 500» + «, con C25/30 e B450C» se aggiunti + « → asta 3» se assegnata. Dopo, la selezione è la sezione nuova (o resta l'asta).
  - `C`: apre il campo «classe»; alla conferma il tipo si deduce dalla classe (`/^c\s*\d/i` calcestruzzo, `/^b\s*\d/i` acciaio, altrimenti «una classe comincia per C (calcestruzzo) o B (acciaio)»); `creaMateriale(m, {tipo, classe, classi: catalogo?.[tipo] ?? null})`; selezione sul materiale nuovo.
  - `D`: solo con un'asta selezionata («il danno vuole un'asta: clicca un'asta nel piano o nell'albero»); campo «danno di asta N»; testo «fE; ffc[; nota]» letto con `leggiEspressione` sui primi due (`;` come separatore, come «x; z»); `impostaDanno`.
  - `esiste` in `ridisegna` regge i quattro tipi: `{nodo: m.nodi, asta: m.aste, sezione: m.sezioni, materiale: m.materiali}[s.tipo] ?? []`.
  - `scegli` su sezione/materiale con un modo `asta` aperto: `esitoScelta` (`modo.js:64-75`) rifiuta già tutto ciò che non è un nodo → il messaggio «scegli un nodo, non un'asta» diventa «scegli un nodo: in modo asta serve il secondo nodo — Esc per annullare» (una stringa, in `modo.js`, e il suo test).

**Ingressi degeneri:**
- `S` con il campo «300» (una misura sola) → ««300» non è né b × h né il nome di una sezione», il campo resta aperto col testo
- `S` su un modello vuoto → nascono C25/30, B450C e la sezione; la Storia ha **una** voce, «sezione 300 × 500, con C25/30 e B450C»
- `S` con un'asta selezionata e il nome di una sezione esistente → `assegnaSezione`, nessuna sezione nuova
- `C` con «C25/30» due volte → due materiali (identificatori 1 e 2, nomi uguali): la story 12 lo permette, l'albero li distingue per identificatore
- `C` con «legno» → il messaggio sul prefisso, campo aperto
- `D` senza asta selezionata → messaggio, il campo non si apre; con «0,8» solo (una parte) → «scrivi due fattori, «E; fc», e se vuoi una nota»
- `⌘Z` dopo `S` con la sezione selezionata → la selezione sparisce (`esiste`), l'editor si svuota, nessuna eccezione
- server che non risponde a `/api/catalogo` → `catalogo = null`, la pagina funziona, l'editor del materiale ha la classe corrente sola
- `/api/materiale/legame` che risponde 400 → `{errore: motivo}` in cache e l'avviso nell'editor; cambiando la classe la chiave cambia e la richiesta riparte
- cambio di veste con tre materiali → tre richieste nuove, tre ridisegni, mai una risposta vecchia sopra una nuova (la chiave contiene la veste)
- apertura di un file mentre un legame è in volo → la risposta arriva, entra in cache con la sua chiave, e non ridisegna niente di sbagliato (la chiave non combacia con nessun materiale del file nuovo, o combacia ed è giusta)

- [ ] **Step 1: I test dei moduli puri restano il contratto**: `app.js` non ha test `node` (è cucitura). La prova è il Task 10. Prima di scrivere, rileggi `app.js:316-447` per intero.
- [ ] **Step 2: Implementazione** — frammenti da cucire nei punti indicati:

Import:

```js
import { modelloVuoto, nodo, materiale, vesteDi } from "./modello.js";
import { ErroreComando, creaNodo, estrudi, collega, spostaNodo, eliminaNodo, rinomina, impostaVincolo,
         creaSezione, modificaSezione, impostaFila, assegnaSezione, creaMateriale, modificaMateriale,
         impostaDanno, impostaVeste, materialiDiDefault } from "./comandi.js";
import { leggiDimensioni } from "./sezione.js";
import { leggiEspressione } from "./numeri.js";
```

Stato e fetch, dopo `let percorso = null, impronta = null;`:

```js
// Il catalogo delle classi e i legami dei materiali vengono dal server, dove i numeri di norma
// vivono già (`nova/catalogo.py`, `nova/legami.py`): qui non ce n'è nessuno. Il catalogo si
// chiede una volta; il legame per materiale e veste, con una cache — cambiare veste cambia
// la chiave, e una risposta vecchia non può atterrare sopra una nuova.
let catalogo = null;
const legami = new Map();

async function chiediJson(rotta, corpo) {
  const r = await fetch(rotta, corpo === undefined ? {} : {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(corpo),
  });
  const dati = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(dati.motivo || `il server ha risposto ${r.status}`);
  return dati;
}

chiediJson("/api/catalogo").then((c) => { catalogo = c; ridisegna(); })
  .catch(() => { catalogo = null; });  // l'editor regge senza: mostra la classe che c'è (P5)

function legamePer(m, id) {
  const k = materiale(m, id);
  if (!k) return null;
  const chiave = JSON.stringify([k, vesteDi(m)]);
  if (legami.has(chiave)) return legami.get(chiave);
  legami.set(chiave, null);  // in volo: «valori in arrivo», e nessuna seconda richiesta
  chiediJson("/api/materiale/legame", { materiale: k, veste: vesteDi(m) })
    .then((d) => { legami.set(chiave, d); ridisegna(); })
    .catch((e) => { legami.set(chiave, { errore: e.message }); ridisegna(); });
  return null;
}
```

`creaPannello` con le azioni:

```js
const pannello = creaPannello(
  { dati: $("pannello-dati"), vuoto: $("pannello-vuoto"), editor: $("pannello-editor") },
  {
    suVincolo: (id, vincolo) => { esegui((m) => impostaVincolo(m, { id, vincolo }), `vincolo del nodo ${id}`); ridisegna(); },
    suSezione: (id, campi) => { esegui((m) => modificaSezione(m, { id, ...campi }), `sezione ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suFila: (id, lato, n, diametro) => { esegui((m) => impostaFila(m, { id, lato, n, diametro }), `fila ${lato} della sezione ${id}`); ridisegna(); },
    suAssegna: (asta, sezione) => { esegui((m) => assegnaSezione(m, { asta, sezione }), `sezione dell'asta ${asta}`); ridisegna(); },
    suDanno: (asta, danno) => { esegui((m) => impostaDanno(m, { asta, danno }), `danno dell'asta ${asta}`); ridisegna(); },
    suMateriale: (id, campi) => { esegui((m) => modificaMateriale(m, { id, ...campi }), `materiale ${id}: ${Object.keys(campi).join(", ")}`); ridisegna(); },
    suVeste: (veste) => { esegui((m) => impostaVeste(m, { veste }), `veste ${veste}`); ridisegna(); },
    suAvviso: (testo) => dì(testo),
  },
);
```

In `ridisegna`: `const esiste = (s) => ({ nodo: m.nodi, asta: m.aste, sezione: m.sezioni, materiale: m.materiali }[s.tipo] ?? []).some((e) => e.id === s.id);` e `pannello.disegna(m, selezione, { catalogo, legame: selezione?.tipo === "materiale" ? legamePer(m, selezione.id) : null });`.

Il `submit`: `if (comando.tipo === "sezione") return confermaSezione(); if (comando.tipo === "materiale") return confermaMateriale(); if (comando.tipo === "danno") return confermaDanno();` prima di `confermaPunto()`.

```js
function confermaSezione() {
  const testo = comando.testo.trim();
  if (testo === "") return;
  const m = corrente(cronologia);
  const dims = leggiDimensioni(testo);
  const esistente = dims ? null : m.sezioni.find((s) => s.nome === testo || String(s.id) === testo);
  if (!dims && !esistente) { dì(`«${testo}» non è né b × h né il nome di una sezione`); return; }
  const asta = comando.bersaglio?.id ?? null;
  // L'etichetta della Storia si compone **prima**: `applica` la riceve insieme al riduttore.
  // `materialiDiDefault` è pura e costa niente: qui dice cosa nascerà, dentro il riduttore
  // lo fa davvero sul modello che riceve.
  const { aggiunti } = dims ? materialiDiDefault(m) : { aggiunti: [] };
  const etichetta = (dims ? `sezione ${quota(dims.b)} × ${quota(dims.h)}` : `sezione ${esistente.nome}`)
    + (aggiunti.length ? `, con ${aggiunti.join(" e ")}` : "")
    + (asta !== null ? ` → asta ${asta}` : "");
  const fatto = esegui((mm) => {
    let n = mm, id;
    if (dims) {
      n = materialiDiDefault(n).modello;
      const cls = n.materiali.find((k) => k.tipo === "calcestruzzo").id, acc = n.materiali.find((k) => k.tipo === "acciaio").id;
      n = creaSezione(n, { b: dims.b, h: dims.h, calcestruzzo: cls, acciaio: acc });
      id = n.sezioni[n.sezioni.length - 1].id;
    } else id = esistente.id;
    return asta === null ? n : assegnaSezione(n, { asta, sezione: id });
  }, etichetta);
  if (!fatto) { ridisegna(); return; }
  if (asta === null) { const n = corrente(cronologia); selezione = { tipo: "sezione", id: n.sezioni[n.sezioni.length - 1].id }; }
  chiudiComando(); ridisegna();
}

function confermaMateriale() {
  const classe = comando.testo.trim();
  if (classe === "") return;
  const tipo = /^c\s*\d/i.test(classe) ? "calcestruzzo" : /^b\s*\d/i.test(classe) ? "acciaio" : null;
  if (!tipo) { dì("una classe comincia per C (calcestruzzo, C25/30) o per B (acciaio, B450C)"); return; }
  if (esegui((m) => creaMateriale(m, { tipo, classe, classi: catalogo?.[tipo] ?? null }), `materiale ${classe}`)) {
    const n = corrente(cronologia);
    selezione = { tipo: "materiale", id: n.materiali[n.materiali.length - 1].id };
    chiudiComando();
  }
  ridisegna();
}

function confermaDanno() {
  const parti = comando.testo.split(";").map((p) => p.trim());
  if (comando.testo.trim() === "") return;
  if (parti.length < 2) { dì("scrivi due fattori, «E; fc», e se vuoi una nota: «0,8; 0,9; martinetto 3»"); return; }
  const [fattore_E, fattore_fc] = parti.slice(0, 2).map(leggiEspressione);
  const asta = comando.bersaglio.id;
  if (esegui((m) => impostaDanno(m, { asta, danno: { fattore_E, fattore_fc, nota: parti.slice(2).join("; ") } }), `danno dell'asta ${asta}`)) chiudiComando();
  ridisegna();
}
```

Rami di `voce.codice`, dopo `rinomina`:

```js
  if (voce.codice === "sezione") {
    const bersaglio = selezione?.tipo === "asta" ? { ...selezione } : null;
    apriComando(bersaglio ? { ...voce, campo: "sezione di" } : voce, { bersaglio });
    return;
  }
  if (voce.codice === "materiale") { apriComando(voce); return; }
  if (voce.codice === "danno") {
    if (selezione?.tipo !== "asta") { dì("il danno vuole un'asta: clicca un'asta nel piano o nell'albero"); return; }
    apriComando(voce, { bersaglio: { ...selezione } });
  }
```

`modo.js:70`: il messaggio diventa `"scegli un nodo: in modo asta serve il secondo nodo — Esc per annullare"`, e il test che lo verifica in `modo.test.js` si aggiorna alla stringa nuova.

- [ ] **Step 3: Tutti i test JS verdi (contano anche `modo.test.js`); commit** `feat(interfaccia): S, C e D nel campo di comando, e gli editor cuciti al modello`

---

### Task 10: la verifica che conta

**Files:** nessuno — è la prova a mano, e chiude il limite dichiarato dalla 11a («un telaio disegnato oggi non si può salvare», piano 11a righe 38-40).

- [ ] **Step 1: Server** su `8811` (Global Constraints), Chrome su `http://127.0.0.1:8811/?v=11b` (la query scavalca la cache degli `static/`).
- [ ] **Step 2: Da zero.** `N` «0; 0», `B` «3000» ↑ Invio, `B` «4000» → Invio (un portale 2×1 a tre aste: aggiungi la terza con `A`). Seleziona un'asta con un clic, `S` «300 × 500» Invio: nell'albero compaiono «Materiali» con C25/30 e B450C e «Sezioni» con «300 × 500 · 1 aste»; la Storia ha **una** voce «sezione 300 × 500, con C25/30 e B450C → asta 1». Assegna la stessa alle altre due aste con `S` «300 × 500» (nome esistente). `V` sui due piedi. `⌘S` su `/tmp/portale-11b.nova.json` → **salvato**, impronta a schermo. È il limite della 11a che cade.
- [ ] **Step 3: Le barre.** Clic sulla sezione nell'albero: l'editor mostra dimensioni, materiali, «aggiungi staffe Ø8 / 150». Premi il bottone; poi «inf» n 3 Ø 16, «sup» n 2 Ø 16: il disegno mostra cinque cerchi dove la fixture li mette (tre sotto a −104, 0, 104; due sopra). Scrivi «trecento» in `b`: messaggio ««trecento» non è un numero», il campo torna a «300». Scrivi `h` = 100: messaggio «copriferri opposti…», il modello non cambia (la Storia non cresce).
- [ ] **Step 4: Il materiale.** Clic su C25/30: dopo un attimo la curva e i valori (`f_c 33 MPa`, `E_c 31 476 MPa`, `ε_c0`, `ε_U 0,0035`); cambia la veste in «progetto»: i valori cambiano e compare «attenzione:» con l'avviso di `veste_valori`; torna a «media». Spunta «personalizzato»: compaiono i campi `E, nu, densita, fck, fcm, fctm`; scrivi `E` = 25000: la curva si aggiorna (nuova chiave, nuova richiesta). `C` «C99/99»: rifiutato con l'elenco delle classi. `C` «legno»: rifiutato col prefisso.
- [ ] **Step 5: Il danno.** Seleziona un'asta, `D` «0,8; 0,9; martinetto 3» Invio: l'ispettore dice «E ×0,8 · fc ×0,9 · martinetto 3». «togli danno»: sparisce. `⌘Z` due volte: torna e poi sparisce di nuovo, la Storia lo racconta.
- [ ] **Step 6: Il MURO 1.** Apri `docs/caso-studio/muro_1.nova.json`: le sezioni e i materiali del caso studio nell'albero, l'ispettore li disegna, l'impronta è quella del file. Cambia il copriferro di una sezione e ripristinalo con `⌘Z`: «modificato» compare e sparisce. Salva su `/tmp/muro-11b.nova.json` e riapri: **stessa impronta** del salvataggio.
- [ ] **Step 7: Story 55.** Su un modello con `origine` (usa `tests/fixture/` dell'importatore, o aggiungi `"origine": {"sorgente": "rilievo", "modificata": false}` a un'asta del portale salvato e riaprilo): sposta un nodo → l'ispettore dell'asta/nodo dice «rilievo, modificata». Salva: nel JSON `modificata: true`.
- [ ] **Step 8: Larghezze e zoom.** 1280 e 1920 px, zoom 200 %: nessun testo tagliato, nessuna sovrapposizione, il pannello scorre in verticale e mai in orizzontale, il disegno della sezione sta nella larghezza del pannello.
- [ ] **Step 9: Spegni il server.** Conteggi finali: JS e pytest come da Global Constraints, riportati nel report con i numeri.

## Mutanti da dichiarare rossi, per chi esegue

Con controllo nullo verde prima di ogni mutante; copia del file prima, ripristino dalla copia.

1. `sezione.js:posizioniBarre` — `sup` non specchiata (segno di `z` come `inf`) → `sezione.test.js` rosso (fixture).
2. `sezione.js:geometriaImpossibile` — la guardia su `b` per `sx`/`dx` rimossa → il test «copriferri opposti» con una sezione stretta (aggiungilo: 60×500, sx 1Ø16, copriferro 30, staffe 8 → 2·46 ≥ 60).
3. `comandi.js:marcaModificata` — corpo vuoto → il test di story 55 rosso.
4. `comandi.js:modificaSezione` — `geometriaAccettabile(s)` rimossa → il test «h: 100» rosso.
5. `tastiera.js` — `["s", "sezione"]` rimossa → «S nudo è sezione» rosso.
6. `albero.js` — il gruppo «Sezioni» stampato anche a lista vuota → il test dell'albero rosso.
7. `pannello.js:campoNumero` — il ripristino del testo rimosso → il test «trecento» rosso.
8. `server.py` — `legame_copriferro` sostituita da `acciaio` per entrambi i tipi → `test_legame_del_calcestruzzo_in_veste_media` rosso.
9. `tests/fixture/barre_300x500.json` — una `z` cambiata di 1 → **entrambi** i test della fixture rossi (è la prova che i due lati guardano lo stesso file).

## Fuori da questa seduta

Le azioni, i carichi, le combinazioni, la palette `⌘K` (11c del calendario); l'importatore in interfaccia (11d); le verifiche c.a. (T8, ricerca 14); il legame `Concrete04`/Mander nell'ispettore (il deck lo fa, la curva del nucleo vuole una sezione: T8 o T10); l'eliminazione di sezioni e materiali dalla tastiera (i riduttori ci sono, il gesto `⌫` su una sezione selezionata è una riga in `app.js` che si aggiunge quando l'albero avrà il fuoco — oggi `⌫` elimina solo nodi, e la frase lo dice).
