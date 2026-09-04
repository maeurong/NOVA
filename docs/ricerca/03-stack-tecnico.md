# Ricerca: stack tecnico — shell, viewport 3D, ponte solutore, craft dell'interfaccia

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato in parallelo con altri sei. Domanda posta: con quale stack costruire un'app locale di modellazione e analisi strutturale con OpenSees come solutore, interfaccia web pulita, macOS Apple Silicon e Windows.

Skill invocate: `caveman:caveman`, `tech-stack-evaluator` (gate). `stack_comparator.py` eseguito con punteggi del researcher (vedi §1, tutti [INF]); `ecosystem_analyzer.py`/`tco_calculator.py` **saltati dichiaratamente**: moduli senza CLI (`grep "__main__"` su `/Users/mario/.claude/skills/tech-stack-evaluator/scripts/*.py` → zero risultati) che vogliono metriche già inserite a mano — i numeri sarebbero stati inventati. Sostituiti con metriche reali da registry npm / PyPI / GitHub API (tutte con comando).

Tag: **[V]** fonte primaria letta · **[M]** misurato in sessione (comando riportato) · **[INF]** inferenza · **[NON TROVATO]**.

## Artefatti consultati

| artefatto | come | stato |
|---|---|---|
| `/Users/mario/GitHub/Tesi/README.md:4-13`, `AGENTS.md:15-25` | letti | premesse brief confermate [V] |
| `/Users/mario/GitHub/Tesi/docs/validazione/ricerca-opensees-e-armature.md:16-21, 180-195, 505-518` | letti | convenzione tag + crash misurato + tabella wheel [V] |
| Tesi HEAD `782f507`, branch `feat/il-numero-di-prima` | `git -C /Users/mario/GitHub/Tesi rev-parse --short HEAD` | [M] |
| `meshrec/src/meshrec/ui/vendor/README.md` | letto | three **r180** vendorizzato [V] |
| `meshrec/src/meshrec/app/server.py:1918-1979`, `worker.py:25-60` | letti | FastAPI + SSE + `Popen` (lezioni ponte) [V] |
| `/Users/mario/.claude/skills/impeccable/SKILL.md` (v4.1.1) + `reference/{shape,init,operate,craft-floor}.md` + `scripts/detector/node/file-system.mjs:26-30` | letti | [V] |
| `/Users/mario/GitHub/Tesi/.impeccable/critique/*` (3 file, 14-16/08/2026) | letto il più recente | [V] |
| PyPI JSON: openseespy, openseespymac, openseespywin, opensees, xara, veux, PySide6, pywebview | `curl`/fetch | [V] |
| npm registry: three, camera-controls, three-mesh-bvh, @speckle/viewer, @thatopen/components, zundo, @kitware/vtk.js, @babylonjs/core | fetch | [V] |
| GitHub API: astral-sh/python-build-standalone latest, pbakaus/impeccable | `curl api.github.com` | [M] |
| Doc Tauri v2 (sidecar, sign macOS/Windows, windows-installer, webview-versions, IPC, calling-frontend, fs, plugin) | fetch | [V] |
| Doc Electron code-signing, LSP base protocol, SQLite appfileformat, immer patches | fetch | [V] |
| Sorgente OpenSees `SRC/element/elasticBeamColumn/ModElasticBeam2d.cpp` (master) + post M. Scott «No Exit» 2021, «Gotta Catch 'Em All» 2023 | fetch | [V] |

---

## 1. Shell applicativa

### Fatti verificati per criterio

**Peso distribuzione**
- Tauri 2: usa webview di sistema — WKWebView su macOS («comes preinstalled with macOS since 10.10 … updated with the regular OS updates»), WebView2 su Windows («can update itself … relatively recent chromium build») [V] https://v2.tauri.app/reference/webview-versions/. Hello-world 3-10 MB: solo fonti secondarie [INF] (https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/, https://www.gethopp.app/blog/tauri-vs-electron).
- WebView2 su Windows: `downloadBootstrapper` +0 MB (default), `embedBootstrapper` ~1.8 MB, `offlineInstaller` ~127 MB, `fixedVersion` ~180 MB; «On Windows 10 (April 2018 release or later) and Windows 11, the WebView2 runtime is distributed as part of the operating system» [V] https://v2.tauri.app/distribute/windows-installer/.
- Electron: bundla Chromium; 80-150 MB hello-world solo secondarie [INF]. Ultimo stabile 43.1.0 (8/7/2026) [V-snippet] https://releases.electronjs.org/.
- Runtime Python da portare dentro in ogni caso (A, B, C): python-build-standalone `20260901` (1/9/2026) `cpython-3.12.14 aarch64-apple-darwin install_only` **25,1 MB** tar.gz, `x86_64-pc-windows-msvc install_only_stripped` **22,0 MB** [M] `curl api.github.com/repos/astral-sh/python-build-standalone/releases/latest`. Mantenuto da Astral, licenza MPL-2.0, è la sorgente di `uv python install` [V] https://github.com/astral-sh/python-build-standalone.
- OpenSeesPy 3.8.0.0 (18/3/2026): `openseespymac` **10.115.801 B** `macosx_13_0_arm64`, `openseespywin` **6.787.016 B** `win_amd64` (`>=3.12`); ombrello `openseespy` 2.792 B meta-package [V] PyPI JSON. Niente Intel Mac, niente Windows ARM (già in `ricerca-opensees-e-armature.md:512-516`).

**Packaging / firma**
- macOS: Apple Developer Program, «Developer ID Application» + notarizzazione obbligatoria (Tauri: «Notarization is required when using a Developer ID Application certificate») [V] https://v2.tauri.app/distribute/sign/macos/. Electron idem via `@electron/notarize` [V] https://www.electronjs.org/docs/latest/tutorial/code-signing.
- **Trappola Tauri sidecar su macOS**: issue #11992 «MacOS - Codesigning and notarization issue when using ExternalBin», **aperta** da 17/12/2024, `needs triage` — il bundler firma l'app ma non i binari `externalBin`; firma manuale con `codesign` prima del bundle [V] https://github.com/tauri-apps/tauri/issues/11992. PyInstaller da parte sua ri-firma ad-hoc i binari raccolti e supporta `--codesign-identity` + entitlements + `runtime` hardened [V-snippet] https://pyinstaller.org/en/v6.3.0/feature-notes.html. → Catena firma a due stadi (PyInstaller firma il sidecar, Tauri firma l'app) [INF].
- Windows: OV → SmartScreen avvisa comunque; EV → reputazione immediata; guida OV «only applies to OV code signing certificates acquired before June 1st 2023» [V] https://v2.tauri.app/distribute/sign/windows/. Electron: «Since June 2023, Microsoft requires software to be signed with an 'extended validation' certificate», HSM FIPS 140-2 o cloud signing [V] doc Electron sopra. Costo cert EV: [NON TROVATO] su fonte primaria.
- PySide6 6.11.2 (18/8/2026) licenza `LGPL-3.0-only OR GPL-2.0-only OR GPL-3.0-only`, `>=3.10,<3.15` [V] PyPI JSON. Packaging via PyInstaller/`pyside6-deploy`, stessa firma/notarizzazione di sopra.
- pywebview 6.2.1, BSD-3, «does not bundle a heavy GUI toolkit or web renderer» (usa WKWebView/WebView2 come Tauri, ma dal lato Python) [V] PyPI + https://github.com/r0x0r/pywebview. Alternativa "A-bis": stessa UI web di A dentro finestra nativa senza Rust.

**Filesystem**
- Tauri fs plugin: scope allow/deny con `$APPDATA`, `$HOME`…; «deny take precedence over allow»; niente `..`; senza scope «calls will fail at runtime with a `forbidden path` error»; per file scelti dall'utente serve `dialog` + `persisted-scope` [V] https://v2.tauri.app/plugin/file-system/. Plugin ufficiali: shell, fs, dialog, store, **sql (sqlx)**, updater, process, window-state, log, persisted-scope [V] https://v2.tauri.app/plugin/.
- A/C/D: accesso diretto da Python/Node/Qt, nessuno scope. MeshRec oggi usa `tkinter.filedialog` dal server (`server.py:431-433`) [V].

**Viewport (prestazioni)**
- WebGL2 ovunque. WebGPU: Safari 26 lo abilita di default **solo su macOS Tahoe 26**: bug WebKit 299237 «navigator.gpu requires macOS Tahoe, iOS 26, visionOS 26 or later» (RESOLVED FIXED: feature nascosta su OS più vecchi) [V] https://bugs.webkit.org/show_bug.cgi?id=299237. In WKWebView dentro Tauri → dipende dal macOS dell'utente [INF]. WebView2: `navigator.gpu` presente, Chromium ≥113 [V-snippet] https://caniwebview.com/features/web-feature-webgpu/. Electron: Chromium proprio → WebGPU uniforme [INF].
- IPC Tauri: «all arguments and return data must be JSON serializable» [V] https://v2.tauri.app/concept/inter-process-communication/; per grandi array esiste `tauri::ipc::Response` (bytes → ArrayBuffer) [V] https://docs.rs/tauri/latest/tauri/ipc/struct.Response.html e `Channel` («fast and deliver ordered data … used internally for streaming operations such as … child process output») [V] https://v2.tauri.app/develop/calling-frontend/. Issue «Deprecate JSON in IPC» #7706 aperta dal 29/8/2023 [V-snippet]. Benchmark comunità: 10 MB binari ~5 ms macOS / ~200 ms Windows [INF] https://github.com/tauri-apps/tauri/discussions/11915. **Nota**: se il solutore è sidecar Python, i risultati passano Python→(Rust)→JS: due hop in B contro uno in A/C.

**Cosa comporta il core Rust in Tauri, in concreto** (trade-off onesto)
- Obbligatorio: toolchain Rust, `src-tauri/` con `Cargo.toml`, `tauri.conf.json`, `capabilities/*.json` (permessi espliciti per ogni plugin, es. `shell:allow-spawn` con `"sidecar": true`) [V] https://v2.tauri.app/develop/sidecar/. Per un'app che parla con un sidecar Python via stdio si può restare a **poche decine di righe Rust** (spawn + pipe eventi) usando `@tauri-apps/plugin-shell` da JS senza scrivere `#[tauri::command]` [INF].
- Costo reale: compile time Rust in CI per due target; debugging di due mondi (Rust panics vs Python tracebacks); la webview è quella del sistema → differenze di rendering macOS/Windows da testare entrambe; `externalBin` con suffisso target-triple per ogni piattaforma (`-aarch64-apple-darwin`, `-x86_64-pc-windows-msvc`) [V].
- Beneficio reale: installer piccolo, RAM bassa, updater/plugin integrati, sandbox permessi. Non serve scrivere il solutore o il modello in Rust: Rust qui è **colla**, non dominio.

### Tabella confronto

| criterio | (a) Python+server+browser | (b) Tauri 2 + sidecar Py | (c) Electron + Py | (d) PySide6 | (d') pywebview |
|---|---|---|---|---|---|
| shell | browser dell'utente | ~5 MB [INF] + webview OS | 80-150 MB [INF] | Qt ~ decine MB [INF] | pochi MB + webview OS [V] |
| runtime Py+OpenSees | PBS 25 MB + 10 MB [M/V] | idem, come sidecar | idem | idem | idem |
| firma macOS | non c'è app da firmare (ma Gatekeeper su binario Py) | app + **sidecar a mano** (#11992) | app via notarize | app | app |
| firma Windows | idem | EV o SmartScreen | EV | EV | EV |
| filesystem | pieno (Python) | scope + dialog | pieno (Node) | pieno | pieno |
| viewport | browser scelto (Chrome=WebGPU) | WKWebView/WebView2; WebGPU solo Tahoe 26 | Chromium proprio | QtWebEngine o Qt3D/VTK | come Tauri |
| lingue da mantenere | Py + JS | Py + JS + **Rust colla** | Py + JS + Node | Py (+QML) | Py + JS |
| finestra/menu nativi | no (tab browser) | sì | sì | sì | sì (base) |
| continuità con MeshRec | massima | UI riusabile, server no | UI riusabile | zero | massima |

### `stack_comparator.py` [INF — punteggi del researcher, pesi: DX 25, perf 15, ecosistema 15, curva 15, doc 10, community 10, enterprise 10, scalabilità 0]
Totali pesati: **Electron 81,0 · Python+browser 75,2 · Tauri 72,0 · PySide6 67,8**, confidenza 51,5 % («close call»). Lo script premia ecosistema/community: dice solo che non c'è vincitore netto, non decide. Il fatto decisivo fuori dallo script: la webview di Tauri su macOS è legata alla versione OS.

---

## 2. Viewport 3D

**Versioni** [V] registry npm, `curl https://registry.npmjs.org/three` (`time`):
- three `0.185.1` latest (1/7/2026); r180 = 3/9/2025 (quello in MeshRec, 5 release indietro); r183 18/2/2026, r184 16/4/2026, r185 25/6/2026. WebGPURenderer con fallback WebGL2 [V] https://threejs.org/manual/en/webgpurenderer.html.
- `camera-controls` 3.1.2 MIT, peer `three >=0.126.1`; `three-mesh-bvh` 0.9.14 MIT, peer `three >=0.159.0`; `@babylonjs/core` 9.25.0 Apache-2.0; `@kitware/vtk.js` 36.11.0 BSD-3 (WebGPU «preliminary … examples may break») [V] https://kitware.github.io/vtk-js/docs/develop_webgpu.html.
- `TransformControls` (addon): `setTranslationSnap/setRotationSnap/setScaleSnap`; snap traslazione assoluto su griglia, rotazione relativo [V] https://threejs.org/docs/pages/TransformControls.html.

**Come lo fanno gli altri** [V salvo nota]:
- **Speckle viewer** `@speckle/viewer` 2.31.14 Apache-2.0: viewer-core + extensions (CameraController, Selection, Measurements, Filtering, SectionTool…), «automatic object batching», «multi level BVH»; **dipende da `three ^0.140.0` e `three-mesh-bvh 0.5.17`** — pin vecchio, non mischiabile con three moderno nello stesso bundle. https://docs.speckle.systems/developers/viewer/overview
- **That Open Engine** `@thatopen/components` 3.4.8 MIT: `three >=0.182.0`, `camera-controls >=3.1.2`, `three-mesh-bvh 0.9.9`, `web-ifc` — orientato BIM/IFC, stack three moderno. https://www.npmjs.com/package/@thatopen/components
- **awatif** (MIT, 176★, 758 commit): strutturale in browser, telai+gusci, solver C++/WASM lineare, `three ^0.183.2`, `vanjs-core` + `lit-html`, «reactive objects with the signal approach», undo presente [V] `curl raw.githubusercontent.com/madil4/awatif/main/ui/package.json`. **Il riferimento più vicino al dominio.** https://github.com/madil4/awatif
- **chili3d** (AGPL-3.0, ~4.800★): CAD in browser, `three 0.184` + OCCT 8 WASM, monorepo `core/three/ui/app/storage`, «transaction-based undo/redo system», persistenza IndexedDB [V] https://github.com/xiangechen/chili3d. Ottimo per leggere come si struttura viewport+comandi+documento; AGPL → solo ispirazione, non copia.
- **veux** 0.0.43 (4/9/2026, C. Perez, STAIRLab, 41★): rende modelli OpenSees/xara in **glTF/.glb o HTML** (plotly/matplotlib alternativi), `veux.serve` con bottle; dipende da `opensees`, `xara`, `shps`, `pygltflib`… [V] PyPI + https://github.com/STAIRLab/veux. È un post-processore Python, non una libreria viewport JS: utile come **esportatore** (glTF caricabile in three) o come ispirazione per estrusione sezioni/deformate. Note: «geometrically exact simulations of constrained bodies like rods and shells» → gestisce rotazioni finite nelle deformate.
- Karamba3D: nessun viewer web three.js trovato [NON TROVATO].

**Rendering deformate/diagrammi** [INF, prassi]: deformata = ricampionare l'asta con funzioni di forma (Hermite) su N punti moltiplicati per scala; diagrammi M/V/N = `BufferGeometry` a nastro nel piano locale dell'asta con `LineSegments`/`Mesh` a doppia faccia e etichette sprite/`troika-three-text` (usato da Speckle); modi = animazione con `sin(ωt)` su vettore modale. Selezione: `three-mesh-bvh` sulle mesh estruse; per aste come linee usare `Raycaster.params.Line.threshold` o meglio picking GPU per colore [INF].

---

## 3. Stato e modello dati lato client

- **Comando/undo con patch**: `zundo` 2.3.0 (middleware zustand, peer `zustand ^4.3||^5`, <700 B) salva snapshot interi per default, diff opzionale [V] https://github.com/charkour/zundo. Alternativa più precisa: `immer` `produceWithPatches` → `patches` + `inversePatches`, `applyPatches` per undo/redo; `enablePatches()` esplicito da v6; formato ~RFC-6902 [V] https://immerjs.github.io/immer/patches. Le patch inverse sono lo stesso meccanismo di un event log: ogni comando = (patch, inversePatch, label).
- **awatif** usa signal + oggetti reattivi, no store globale [V]; **chili3d** usa transazioni sul documento [V]. Per un'app di modellazione il pattern è: modello immutabile (nodi, aste, sezioni, materiali, carichi, casi) → comandi puri → undo via inverse patch → viewport come proiezione derivata (mai stato nel viewport) [INF].
- **File progetto**: SQLite come formato — scritture atomiche anche su crash, «SQLite can read and write smaller BLOBs (less than about 100KB) … faster than … separate files», aggiornamenti incrementali vs ZIP che riscrive tutto; caveat: «review the defense against dark arts document … untrusted database files» [V] https://www.sqlite.org/appfileformat.html. Tauri ha `plugin-sql` via sqlx [V]; Python ha `sqlite3` stdlib. JSON: leggibile/diffabile in git, ma un file solo riscritto ogni salvataggio [INF]. Ibrido comune: JSON per modello (piccolo, versionabile), SQLite/HDF5/NPZ per risultati (grandi) [INF].
- **Da evitare** [INF]: stato del modello duplicato in oggetti three.js; undo a snapshot su modelli con risultati dentro (i risultati non vanno nello store dell'undo); ID ricalcolati per indice (usare ID stabili); salvataggio su ogni `change` senza coalescenza (difetto già rilevato in MeshRec: critique 16/08 euristica 3 «Ogni `change` su un parametro scrive su disco») [V].

---

## 4. Ponte UI ↔ solutore

**Protocollo**
- stdio + JSON-RPC 2.0 con framing LSP: header `Content-Length: N\r\n\r\n` ascii, body JSON UTF-8 [V] https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#baseProtocol. Alternativa più semplice: NDJSON (una riga = un messaggio) — è quello che Tauri legge nativamente con `CommandEvent::Stdout(line_bytes)` [V] https://v2.tauri.app/develop/sidecar/. Zero porte, zero CORS, un processo figlio per progetto.
- HTTP locale (FastAPI + SSE): è MeshRec oggi — `server.py:1918-1979` SSE «Una direzione sola, quindi SSE: WebSocket aggiungerebbe un secondo protocollo … EventSource riconnette da solo» [V]. Funziona in A e in C/D'; in B è un hop in più e una porta da gestire.
- WebSocket: bidirezionale, serve solo se il solutore deve ricevere comandi durante l'analisi (annulla, cambia passo) e la latenza conta [INF].
- Risultati grandi: non via JSON riga per riga; scrivere su file (NPZ/SQLite/glTF) e passare il percorso, oppure `tauri::ipc::Response` bytes [V].

**Lezioni MeshRec riusabili** (`worker.py:25-60`) [V]: pipe del figlio con `encoding="utf-8", errors="replace"` + `PYTHONIOENCODING=utf-8`/`PYTHONUTF8=1` perché librerie C++ scrivono su fd saltando `sys.stdout`; `deque(maxlen=2000)` per il log; `exit_code`/`annullato` nel frame di stato (che la UI poi non leggeva: P0 della critique 16/08).

**Crash del solutore — confermato**
- Sorgente: `ModElasticBeam2d.cpp` (master) contiene **8** `exit(…)` dopo `opserr` (costruttore e `setDomain`: dominio nullo, nodo inesistente, DOF errati, lunghezza zero) [V] https://raw.githubusercontent.com/OpenSees/OpenSees/master/SRC/element/elasticBeamColumn/ModElasticBeam2d.cpp. M. Scott, «No Exit» (24/10/2021): «over 2,000 calls to exit()» → «OpenSees.exe closes abruptly, or 'Kernel died' in Jupyter»; causa: costruttori C++ non possono restituire errori; storicamente c'era `g3ErrorHandler` [V] https://openseesdigital.com/2021/10/24/no-exit/.
- Parziale rete: `OpenSeesError` esiste, «put OpenSees commands in a try-except block» (input insufficienti, eigen, database) [V] https://openseesdigital.com/2023/09/10/gotta-catch-em-all/ — ma non copre gli `exit()` (il post non li tratta) [INF].
- **Misurato in casa**: `eleResponse(1,'stresses')` su `TenNodeTetrahedron` → `malloc(): unaligned tcache chunk detected / Aborted (exit 134)` (`ricerca-opensees-e-armature.md:184-189`) [M già in sessione precedente].
- Conseguenza architetturale: il solutore **deve** vivere in un processo separato dalla UI (mai `import openseespy` nel processo che tiene lo stato del modello); il ponte deve trattare la morte del figlio come esito normale: `exit_code`, ultime N righe stderr, stato «fallito», riavvio del sidecar al comando successivo [INF]. Vale per A, B, C, D indistintamente.
- **xara** (Perez, 0.0.33, 2/9/2026): «Model class … isolated model that is safe from global state corruption», compatibilità OpenSeesPy [V] https://xara.so/about/features/index.html; dipende da `opensees>=0.1.31` che ha wheel **win_amd64 + manylinux** cp39-cp314 ma **nessun macosx arm64 in 0.1.31** (0.1.27 del 23/1/2026 ce l'aveva `macosx_15_0_arm64`) [M] `curl https://pypi.org/pypi/opensees/json`. Se elimina gli `exit()`: [NON TROVATO] in chiaro. Candidato da approfondire (vedi `01-opensees-integrazione.md`).

---

## 5. Craft: impeccable, «shape», vincoli allo stack

**Cosa richiede impeccable a un progetto** [V] `SKILL.md`, `reference/init.md`, `reference/shape.md`:
- `PRODUCT.md` alla radice con `<!-- impeccable:product-schema 1 -->`, sezioni `Platform` (bare: `web`|`ios`|`android`|`adaptive`), `Stack` (solo greenfield: «the stack is a user decision, not yours: ask once whether they want plain static HTML/CSS, a specific framework, or your recommendation … record the outcome under ## Stack»), Users, Purpose, Positioning, Operating Context, Capabilities/Constraints, Evidence on Hand, Principles (`init.md:56-100`).
- `DESIGN.md` (via `document`, formato Google Stitch) opzionale; `.impeccable/config.json` (`buildPath: comp|code`, live config); cartella `.impeccable/critique/` per gli esiti (Tesi ne ha 3).
- Setup per sessione: `node <base>/scripts/context.mjs [--target path]`; poi playbook del comando; `craft-floor.md` prima di editare UI.
- **Piattaforma**: «a native wrapper around a website does not make its design language native» (`init.md:23`) → Tauri/Electron/pywebview = `web`; PySide6 = fuori dal perimetro impeccable (niente HTML) [V/INF]. Flutter idem.
- Modo per questa app: **Operate** («Scanability, consistency, native expectations … outrank expression»); `operate.md` prescrive: una sola famiglia tipografica, scala rem fissa ratio 1.125-1.2, accento solo per azione primaria/selezione/stato, «Modal as first thought. Modals are usually laziness», motion 150-250 ms, skeleton non spinner, «Standard navigation patterns: top bar + side nav, breadcrumbs, tabs, command palettes» [V].

**«shape»** — **trovato, non è uno strumento separato**: è il sottocomando `shape [feature]` di impeccable, «Plan UX/UI before writing code» (`SKILL.md:48`, `reference/shape.md`). Fa: discovery interview (2-3 domande/round, max 2 round) → direzione (via `new-work.md`) → **brief senza codice** in 7 punti (job/audience, outcome, direction, scope, states/ranges, interaction/layout, constraints) → conferma e stop: «shape never writes code or a direction contract» [V]. Cercato altrove: `~/.claude/skills/` (nessuna skill «shape»; le occorrenze in altre skill sono la parola comune), `~/.claude/plugins/` (no), `~/Jarvis/_jarvis/skills-library/INDICE.md` (nessuna voce) [M] `grep -rli shape …`. Sul web «shape» come tool di design UI distinto: [NON TROVATO]. Quindi «impeccable o shape» nel brief = stessa skill, due fasi: `shape` prima (brief), `new-work`/`polish`/`audit` dopo.

**Provenienza/staleness**: skill locale v4.1.1 (`SKILL.md:4`); upstream pbakaus/impeccable ultima release `skill-v4.1.3` del 2/9/2026, 65.461★, Apache-2.0, push 4/9/2026 [M] `curl api.github.com/repos/pbakaus/impeccable/releases/latest`. Due patch indietro.

**Vincoli tecnici allo stack** [V]:
- Detector statico scansiona solo `.html .htm .css .scss .sass .less .jsx .tsx .js .ts .vue .svelte .astro .blade.php` (`file-system.mjs:26-30`) → qualunque frontend web va bene, **niente Tailwind obbligatorio** (Tailwind è solo riconosciuto in `document.md:87,309`). Nessun vincolo su framework: vanilla (come MeshRec), React, Svelte, Vue tutti dentro.
- `live` mode richiede dev server con HMR e iniezione in `index.html`/`app.vue`/`src/app.html` (`live-setup.md:23-31`) → con Tauri si usa `tauri dev` + Vite: compatibile; con MeshRec-style senza bundler funziona su `index.html` singolo.
- `craft-floor.md` vieta glifi unicode/emoji come icone («Icons are drawn, from a real library or authored SVG»), system display font per pagine own-world (non vale in Operate: «System fonts and familiar sans defaults» permessi), bordi colorati >1px, testo in gradiente [V].

---

## 6. Riferimenti UI CAE/CAD — pattern concreti

| prodotto | pattern verificato | fonte |
|---|---|---|
| **Shapr3D** | Adaptive UI: «predicts which tool you need based on what you select. If you click an edge, it suggests a fillet; if you click a face, it suggests an offset»; parti adattive vs fisse marcate visivamente («anchor-like points») | [V-snippet] https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface, https://www.shapr3d.com/blog/behind-the-shapr3d-user-interface-refresh |
| **Plasticity** | Command palette con `F`, «commands are executed by typing their name … assign shortcuts to any command or pin»; toolbar contestuale sulla selezione; Outliner; P-Menu | [V-snippet] https://doc.plasticity.xyz/plasticity-essentials/plasticity-interface/command-palette |
| **Onshape** | Toolbar «change based on the current workflow» (Document/Feature/Sketch/Assembly/Drawing); «The last used feature or tool moves to the top of the tool group»; Feature list + rollback bar; context menu per entità in grafica e in lista | [V] https://cad.onshape.com/help/Content/ui-basics.htm |
| **Rhino 8** | Containers unificati Windows/Mac (panel + toolbar nello stesso contenitore), Window Layouts salvabili, dark mode che segue il sistema | [V-snippet] https://developer.rhino3d.com/guides/general/rhino-ui-system/ |
| **Fusion 360** | Toolbar a tab per workspace; contextual environment che sostituisce i tab; marking menu radiale su tasto destro | [V-snippet] https://help.autodesk.com/cloudhelp/ENU/Fusion-GetStarted/files/GS-THE-FUSION-INTERFACE.htm |
| **Blender** | Paradigmi HIG: Non-Overlapping («editors side-by-side»), Non-Blocking («doesn't pop up requesters that require the user to fill in data before things execute»), Non-Modal («first indicate which data you work on, and then what you want to do»; operator redo panel dopo l'esecuzione) | [V-snippet] https://developer.blender.org/docs/features/interface/human_interface_guidelines/paradigms/ (pagina 403 al fetch diretto; citazioni da snippet di ricerca) |
| **Speckle** | Estensioni separate per selezione/misura/filtri/sezione: la UI è composizione di extension sul viewer-core | [V] doc viewer |

Sintesi pattern per «pulito» [INF, derivata dai sopra + `operate.md`]: (1) command palette come accesso universale + scorciatoie; (2) toolbar contestuale sulla selezione (nodo→vincolo/carico, asta→sezione/rilascio/carico distribuito); (3) property panel unico a destra che mostra l'oggetto selezionato con **unità esplicite in ogni campo** (difetto MeshRec: «Le metriche non portano unità», critique 16/08 euristica 2); (4) albero/outliner del modello (nodi, aste, sezioni, materiali, casi di carico, combinazioni); (5) niente modali: operatori con pannello «redo» post-esecuzione alla Blender; (6) stato analisi sempre visibile, non in un popup; (7) un solo font, accento solo per selezione/azione primaria.

---

## Domande aperte per il brainstorming

1. Quanto conta la **finestra nativa** (menu, dock, file association)? Se poco → A/pywebview; se sì → Tauri/Electron.
2. Il viewport deve girare su Mac **pre-Tahoe**? Allora WebGL2 baseline, WebGPU solo progressive enhancement.
3. Solutore: **OpenSeesPy ufficiale** (3.8.0.0, exit() noti) o **xara** (Model isolato, ma wheel macOS arm64 assente in 0.1.31)? Vedi `01-opensees-integrazione.md`.
4. Formato progetto: JSON versionabile o SQLite? Dimensione attesa dei risultati (time-history? solo statica+modale?).
5. Distribuzione: serve davvero installer firmato/notarizzato al giorno 1, o basta «apri il terminale, `uv run`» come MeshRec finché è uso personale? Cambia il peso di tutta la colonna firma.
6. UI framework: vanilla come MeshRec (3.692 righe `app.js` già oggi [M] `grep -c`) o componenti (Svelte/React) per property panel/outliner? impeccable non vincola.

## Raccomandazioni (non decisioni)

- **Raccomandazione 1 — solutore sempre fuori processo**, qualunque shell: sidecar Python con NDJSON/JSON-RPC su stdio, `exit_code` e stderr trattati come esito, riavvio automatico. Motivo: >2.000 `exit()` [V] + abort misurato [M].
- **Raccomandazione 2 — viewport three.js moderno** (0.185.x, WebGL2 default, WebGPURenderer opzionale) + `camera-controls` + `three-mesh-bvh` + `TransformControls`; studiare awatif (MIT, stesso dominio) e chili3d (solo lettura, AGPL). Non Babylon/vtk.js: nessun vantaggio per telai, ecosistema CAD-web è su three.
- **Raccomandazione 3 — shell in due tempi**: partire da **A/pywebview** (riuso diretto di ciò che MeshRec sa fare: FastAPI+SSE, Popen, UI vanilla) e tenere la UI **agnostica dal trasporto** (un modulo `bridge.js` con `invoke()/subscribe()`), così il passaggio a **Tauri 2** resta un cambio di colla (poche decine di righe Rust) se servono finestra nativa/installer piccolo. Electron solo se serve Chromium identico ovunque e il peso non conta. Rust proposto come colla, con il costo della firma sidecar (#11992 aperta) e della webview OS-dipendente sul piatto.
- **Raccomandazione 4 — stato**: store immutabile + immer patches per undo (o zundo se basta lo snapshot), risultati fuori dall'undo, file progetto JSON per il modello + SQLite per i risultati.
- **Raccomandazione 5 — craft**: `PRODUCT.md` con `Platform: web` e `Stack` deciso in brainstorming, poi `/impeccable shape <superficie>` per il brief; modo Operate; command palette + toolbar contestuale + property panel con unità come spina dorsale.

## Fonti

Locali: `/Users/mario/GitHub/Tesi/README.md`, `AGENTS.md`, `docs/validazione/ricerca-opensees-e-armature.md`, `meshrec/src/meshrec/app/server.py`, `worker.py`, `meshrec/src/meshrec/ui/vendor/README.md`, `.impeccable/critique/2026-08-16T11-21-22Z__meshrec-src-meshrec-ui-index-html.md`; `/Users/mario/.claude/skills/impeccable/SKILL.md`, `reference/shape.md`, `init.md`, `operate.md`, `craft-floor.md`, `live-setup.md`, `scripts/detector/node/file-system.mjs`; `/Users/mario/.claude/skills/tech-stack-evaluator/scripts/stack_comparator.py`.

Web: https://v2.tauri.app/develop/sidecar/ · https://v2.tauri.app/distribute/sign/macos/ · https://v2.tauri.app/distribute/sign/windows/ · https://v2.tauri.app/distribute/windows-installer/ · https://v2.tauri.app/reference/webview-versions/ · https://v2.tauri.app/concept/inter-process-communication/ · https://v2.tauri.app/develop/calling-frontend/ · https://v2.tauri.app/plugin/file-system/ · https://v2.tauri.app/plugin/ · https://docs.rs/tauri/latest/tauri/ipc/struct.Response.html · https://github.com/tauri-apps/tauri/issues/11992 · https://github.com/tauri-apps/tauri/issues/7706 · https://github.com/tauri-apps/tauri/discussions/11915 · https://www.electronjs.org/docs/latest/tutorial/code-signing · https://releases.electronjs.org/ · https://github.com/astral-sh/python-build-standalone · https://pyinstaller.org/en/v6.3.0/feature-notes.html · https://pypi.org/pypi/openseespy/json · https://pypi.org/pypi/openseespymac/json · https://pypi.org/pypi/openseespywin/json · https://pypi.org/pypi/opensees/json · https://pypi.org/pypi/xara/json · https://pypi.org/pypi/veux/json · https://pypi.org/pypi/PySide6/json · https://pypi.org/pypi/pywebview/json · https://github.com/r0x0r/pywebview · https://xara.so/about/features/index.html · https://github.com/STAIRLab/veux · https://raw.githubusercontent.com/OpenSees/OpenSees/master/SRC/element/elasticBeamColumn/ModElasticBeam2d.cpp · https://openseesdigital.com/2021/10/24/no-exit/ · https://openseesdigital.com/2023/09/10/gotta-catch-em-all/ · https://registry.npmjs.org/three · https://registry.npmjs.org/camera-controls/latest · https://registry.npmjs.org/three-mesh-bvh/latest · https://registry.npmjs.org/@speckle/viewer/latest · https://registry.npmjs.org/@thatopen/components/latest · https://registry.npmjs.org/zundo/latest · https://registry.npmjs.org/@kitware/vtk.js/latest · https://registry.npmjs.org/@babylonjs/core/latest · https://threejs.org/manual/en/webgpurenderer.html · https://threejs.org/docs/pages/TransformControls.html · https://docs.speckle.systems/developers/viewer/overview · https://github.com/madil4/awatif · https://github.com/xiangechen/chili3d · https://kitware.github.io/vtk-js/docs/develop_webgpu.html · https://bugs.webkit.org/show_bug.cgi?id=299237 · https://webkit.org/blog/16993/news-from-wwdc25-web-technology-coming-this-fall-in-safari-26-beta/ · https://caniwebview.com/features/web-feature-webgpu/ · https://github.com/charkour/zundo · https://immerjs.github.io/immer/patches · https://www.sqlite.org/appfileformat.html · https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#baseProtocol · https://github.com/pbakaus/impeccable · https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface · https://www.shapr3d.com/blog/behind-the-shapr3d-user-interface-refresh · https://doc.plasticity.xyz/plasticity-essentials/plasticity-interface/command-palette · https://cad.onshape.com/help/Content/ui-basics.htm · https://developer.rhino3d.com/guides/general/rhino-ui-system/ · https://help.autodesk.com/cloudhelp/ENU/Fusion-GetStarted/files/GS-THE-FUSION-INTERFACE.htm · https://developer.blender.org/docs/features/interface/human_interface_guidelines/paradigms/ · https://www.dolthub.com/blog/2025-11-13-electron-vs-tauri/ · https://www.gethopp.app/blog/tauri-vs-electron

Caveat globali: dimensioni hello-world Electron/Tauri solo da secondarie; pagine Blender/Shapr3D/Plasticity restituivano 403 al fetch diretto, citazioni prese dagli snippet di ricerca sulle stesse URL; `stack_comparator` usa punteggi del researcher, non misure; `opensees` 0.1.31 senza wheel macOS arm64 può cambiare alla prossima release (cadenza ~mensile osservata).
