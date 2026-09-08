# Ricerca: finestra nativa, installer, firma e notarizzazione su macOS

Ricerca dell'08/09/2026, ticket wayfinder **#38** (figlio di #31), condotta da un `researcher` senza subagenti. Domanda: per un'app Python + browser che **localizza** OpenSees e CalculiX sul sistema senza incorporarli, cosa comporta davvero diventare un'applicazione macOS firmata, notarizzata e installabile.

**Non ripete `03-stack-tecnico.md`.** Là stanno il confronto fra shell (Tauri 2 / Electron / pywebview / PySide6), la tabella a nove criteri, `python-build-standalone`, la trappola `externalBin` di Tauri (#11992) e la raccomandazione a due tempi. Questa ricerca comincia dove quella si ferma: `codesign` e gli entitlements per un Python impacchettato, `notarytool` e lo stapling, Gatekeeper e la quarantena **quando l'app lancia binari esterni non firmati**, aggiornamenti, dimensione, costo, e come l'app trova i solutori.

Convenzione dei tag come in `README.md`: **[V]** fonte primaria letta · **[M]** misurato in sessione con comando · **[INF]** inferenza · **[NON TROVATO]**. Virgola decimale fuori dalle citazioni verbatim.

## 0. Ambiente delle misure

| cosa | valore | comando |
|---|---|---|
| macOS | 26.6.2, build 25G83 | `sw_vers` [M] |
| architettura | `arm64` | `uname -m` [M] |
| Xcode | 26.6 (17F113); `notarytool` **1.1.2 (41)** | `xcodebuild -version`, `xcrun notarytool --version` [M] |
| OpenSees | `~/.local/bin/OpenSees` è un wrapper `sh` di 199 B verso `~/.local/opt/opensees/OpenSees3.8.0/bin/OpenSees` | `cat`, `file` [M] |
| CalculiX | `~/.local/bin/ccx` verso `~/.local/share/calculix-2.22/bin/ccx`, installazione conda (26 MB) | `ls -l`, `du -sh` [M] |

Tutte le misure sono state fatte **su copie in `/tmp`**, poi cancellate. Nessun certificato installato, nessuna impostazione di sistema toccata, nessuna firma prodotta con identità reale.

---

## 1. Quello che si rompe il giorno in cui NOVA diventa una `.app`

Due misure, e sono le più importanti di tutta la ricerca, perché colpiscono codice che **oggi funziona**.

### 1.1 Il PATH di un'app lanciata dal Finder non è il PATH del terminale

Bundle minimo `/tmp/Prova.app` (solo `Info.plist` più uno script che scrive `env` e `pwd`), lanciato **via Finder** con `osascript` che dice al Finder di aprire quel percorso, per non ereditare l'ambiente della shell chiamante:

```
PWD=/
PATH=/usr/bin:/bin:/usr/sbin:/sbin
HOME=/Users/mario
```

[M] — quattordici variabili in tutto, elencate al §1.3.

Quel PATH è esattamente `_PATH_STDPATH`, cioè `"/usr/bin:/bin:/usr/sbin:/sbin"` come definito alla riga 67 di `/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include/paths.h` [M]. La variabile globale di `launchd` non è impostata su questa macchina [M], quindi i figli di `launchd` prendono il default del sistema, non il PATH di `~/.zshrc`.

Conseguenza diretta, misurata con lo stesso PATH ridotto e `shutil.which`:

```
which('OpenSees') -> None
which('ccx')      -> None
```

[M]

`meshrec/core/solve.py:1304` cerca il binario con `shutil.which(binario) or shutil.which(binario + ".exe")`. Dentro una `.app` quella riga rende `None` **su una macchina dove i due solutori ci sono e funzionano**, e l'utente riceve il messaggio di `DOVE_PRENDERLO` (`solve.py:1213-1227`) che gli dice di installare qualcosa che ha già installato. È il modo peggiore di sbagliare: il programma accusa l'utente.

Attenzione al falso negativo nel provare: aprire il bundle con `open` **da terminale** propaga l'ambiente della shell, e il PATH risulta quello completo [M]. Solo il lancio via Finder mostra il comportamento vero. Chiunque verifichi questa cosa con `open` conclude, sbagliando, che non c'è problema.

### 1.2 La cartella di lavoro di un'app è la radice

Stessa misura: `PWD=/` [M]. `nova/__main__.py:35` costruisce la cartella delle corse come `Path.cwd() / "corse"`: dentro una `.app` diventa `/corse`, che non è scrivibile. Il commento accanto («La cartella delle corse è assoluta, così non si sposta se qualcuno cambia la cwd del processo») risolve un problema diverso da questo. Serve una radice esplicita — `~/Library/Application Support/NOVA/corse` oppure `~/Documenti/NOVA` — decisa dall'autore, non ereditata dalla cwd.

### 1.3 Il resto dell'ambiente è quasi vuoto

Le variabili viste dall'app lanciata dal Finder [M]: `SHELL`, `TMPDIR`, `USER`, `COMMAND_MODE`, `SSH_AUTH_SOCK`, `PATH`, `__CFBundleIdentifier`, `PWD`, `XPC_FLAGS`, `XPC_SERVICE_NAME`, `SHLVL`, `HOME`, `LOGNAME`, `OSLogRateLimit`. Niente `LANG`, niente `LC_ALL`, niente variabili d'ambiente del progetto. Qualunque cosa NOVA legga oggi dall'ambiente (`NOVA_PORTA`, `nova/__main__.py:29`) va data anche per via di file di configurazione, o smette di esistere.

---

## 2. Firmare un Python impacchettato

### 2.1 Cosa la notarizzazione pretende, testualmente

Apple elenca sei protezioni obbligatorie [V]:

- «Enable code-signing for all of the executables you distribute, and ensure that executables have valid code signatures»;
- «Use a "Developer ID" application, kernel extension, system extension, or installer certificate … (Don't use a Mac Distribution, ad hoc, Apple Developer, or local development certificate.)»;
- «Enable the Hardened Runtime capability for your app and command line targets»;
- «Include a secure timestamp with your code-signing signature»;
- «Don't include the `com.apple.security.get-task-allow` entitlement with the value set to any variation of `true`»;
- «Link against the macOS 10.9 or later SDK»; entitlements «properly-formatted XML, ASCII-encoded».

Il timestamp sicuro ha un unico server ammesso: «macOS accepts only one secure timestamp server, namely `timestamp.apple.com`» [V] — cioè **firmare richiede rete**, e una build offline non è notarizzabile.

### 2.2 L'entitlement che serve per forza: disable-library-validation

Con l'hardened runtime la validazione delle librerie è attiva per default: «This security-hardening feature prevents a program from loading frameworks, plug-ins, or libraries unless they're either signed by Apple or signed with the same Team ID as the main executable» [V]. Un interprete Python impacchettato carica decine di `.so` (numpy, pydantic-core, PyObjC, uvloop…) che arrivano dalle ruote PyPI con la firma ad-hoc del linker, **senza Team ID**.

PyInstaller documenta l'errore esatto che si prende chi non ci pensa [V]:

> `[libname]: code signature in ([libname]) not valid for use in process using Library Validation: mapped file has no Team ID and is not a platform binary (signed with custom identity or adhoc?)`

Due strade, e sono diverse:

1. **Ri-firmare ogni `.so` con la propria identità Developer ID.** È quello che fa PyInstaller quando gli si passa l'opzione di identità: «By default, PyInstaller ad-hoc (re)signs all collected binaries and the generated executable itself», e con l'identità reale «PyInstaller also turns on *hardened runtime* by passing `--options=runtime`» [V]. Library validation resta attiva: più sicuro, ma ogni libreria dev'essere ri-firmata a ogni build.
2. **Dichiarare `com.apple.security.cs.disable-library-validation`.** È la scelta di default di briefcase, che concede da sé a ogni app macOS `com.apple.security.cs.allow-unsigned-executable-memory` e `com.apple.security.cs.disable-library-validation` [V]. Costo dichiarato da Apple: «Because library validation is such an important security-hardening feature, Gatekeeper runs extra security checks on programs that have it disabled» [V].

La strada 1 non basta se una libreria arriva a runtime (un'installazione fatta dall'utente dentro il bundle): quella non è firmata da te. NOVA oggi non lo fa, quindi la strada 1 resta praticabile [INF].

Terzo entitlement da valutare, non da mettere per riflesso: `com.apple.security.cs.allow-unsigned-executable-memory`. Serve a chi crea memoria scrivibile ed eseguibile fuori dal flag `MAP_JIT` [V]; per CPython entra in gioco con `ctypes`/`libffi` e con il JIT sperimentale. briefcase lo dà per scontato, PyInstaller no. **Da verificare misurando**, non da copiare [INF].

Da non mettere mai: `get-task-allow`. Apple: «this poses a security risk for a shipping app, because it can allow an attacker to inject code at runtime», e la notarizzazione fallisce con «The executable requests the com.apple.security.get-task-allow entitlement» [V].

### 2.3 I comandi di verifica, dalla doc

- `codesign` con le opzioni di verifica profonda e stretta — «The `strict` option increases the restrictiveness of the validation to match that required by notarization» [V];
- `codesign -dvv` sul percorso — se l'uscita porta `Timestamp` c'è il timestamp sicuro; se porta `Signed Time` **non** c'è [V];
- `codesign -d --entitlements` con destinazione lo standard output — se compare `bplist00` gli entitlements sono binari e il servizio li rifiuta; e «starting in macOS 10.15.4, processes with malformed embedded entitlements no longer run» [V];
- `plutil` in conversione XML e poi in lint sul file degli entitlements [V].

**`spctl` non è un test valido per un binario esterno.** Misurato: la valutazione `spctl` di tipo `exec` rifiuta sia `~/.local/bin/OpenSees` («rejected, source=no usable signature») sia `~/.local/bin/ccx` («rejected») — due binari che sulla stessa macchina girano senza un problema [M]. `spctl` risponde alla domanda «questo passerebbe Gatekeeper se fosse in quarantena», che è un'altra domanda (§4). Usarlo come controllo d'avvio produrrebbe un falso allarme permanente.

---

## 3. Notarizzazione: notarytool, stapling, tempi

Il flusso è tre passi [V]: `notarytool store-credentials` per mettere in portachiavi Apple ID, team e password specifica per app; `notarytool submit` dello ZIP con il profilo di portachiavi e l'attesa sincrona; `stapler staple` sul `.app`.

Fatti che contano, tutti [V] dalle pagine Apple:

- `altool` è morto: «Starting November 1, 2023, the Apple notary service no longer accepts uploads from `altool` or Xcode 13 or earlier».
- La password è **app-specific**: «Because App Store Connect requires two-factor authentication (2FA) on all accounts, you must create an app-specific password for `notarytool`».
- Il `.app` non si carica nudo: va in uno ZIP fatto con `ditto` in modalità archivio con il genitore, oppure in un DMG (UDIF) o in un `.pkg` firmato.
- Il ticket si attacca **all'app, non allo ZIP**: «While you can notarize a ZIP archive, you can't staple to it directly. Instead, run `stapler` against each item that you added to the archive.»
- E non si attacca ai binari sciolti: «Although tickets are created for standalone binaries, it's not currently possible to staple tickets to them.» Questo tocca il modello a sidecar: un eseguibile Python separato dentro il bundle riceve il ticket dell'app che lo contiene, ma da solo non è stapleabile [INF].
- Tempi: «Notarization completes for most software within 5 minutes, and for 98 percent of software within 15 minutes», con il consiglio di minimizzare il numero di file e di non mettere dati non eseguibili in `Contents/MacOS/`.
- **Limite: «Limit notarizations to 75 per day.»** Rilevante per una CI che notarizza a ogni push.
- Senza stapling l'app funziona lo stesso (Gatekeeper cerca il ticket online), ma smette di funzionare **offline**: «This ensures that Gatekeeper can find the ticket even when a network connection isn't available.»
- Doppio giro per gli installer di terze parti: «First you notarize the installer's payload … You then package the notarized (and stapled) items into the installer and notarize it as you would any other executable.»
- Leggere sempre il log: «Always check the log file, even if notarization succeeds, because it might contain warnings».

briefcase incapsula tutto questo: «By default, apps will be both signed and notarized when they are packaged», con le opzioni per saltare la notarizzazione, per non attendere e per riprendere una sottomissione interrotta dato il suo identificativo — e la doc avverte che «Apple's notarization server can take a long time to respond - in some cases, hours» [V], che contraddice in senso pessimistico i 5-15 minuti dichiarati da Apple. Le due affermazioni convivono: Apple dà la mediana, briefcase la coda.

---

## 4. Gatekeeper e la quarantena quando l'app lancia binari esterni

È il cuore del ticket, ed è la parte dove la doc pubblica dice poco. Qui la ricerca **misura**.

### 4.1 Com'è firmato oggi ciò che NOVA lancia

| binario | formato | firma | quarantena |
|---|---|---|---|
| `~/.local/opt/opensees/OpenSees3.8.0/bin/OpenSees` (30,3 MB) | Mach-O arm64 | `flags=0x20002(adhoc,linker-signed)`, `TeamIdentifier=not set` | solo `com.apple.provenance` |
| `~/.local/bin/OpenSees` (wrapper `sh`, 199 B) | script POSIX | «code object is not signed at all» | solo `com.apple.provenance` |
| `~/.local/share/calculix-2.22/bin/ccx` | Mach-O arm64 | `Signature=adhoc`, `CodeDirectory flags=0x2(adhoc)` | nessuno |

[M] con `codesign -dv` a verbosità 4 e `xattr -l`.

Il `linker-signed` sul binario di OpenSees è la prova diretta di come funziona macOS su Apple Silicon: il linker firma ad-hoc da sé. La stessa cosa la scrive PyInstaller: «With Apple Silicon M1 architecture, macOS introduced mandatory code signing, even if ad-hoc … `arm64` arch slices in collected binaries always come with signature» [V]. Sulla doc Apple in prima persona l'affermazione **non l'ho trovata**: sta in risposte di ingegneri Apple sui forum, quindi resta [INF] con la fonte — ma il §4.2 la misura.

### 4.2 Senza firma, il kernel uccide il processo

Copia di `ccx` in `/tmp`, rimozione della firma con `codesign --remove-signature`, verifica («code object is not signed at all»), esecuzione: **stato di uscita 137**, cioè 128 + 9, SIGKILL [M]. Nessun messaggio, nessuna finestra. Ri-firmando ad-hoc lo stesso file arriva a `dyld` ed esce 134 lamentando `libarpack.2.dylib` mancante [M]: cioè il controllo di firma è passato ed è caduto molto più avanti, per un motivo che non c'entra.

**Un binario `arm64` privo di firma non parte, punto.** Chi compila OpenSees da sorgente su Apple Silicon non incontra il problema (il linker firma ad-hoc), ma chi lo trasporta con un tool che riscrive gli header e non ri-firma sì.

### 4.3 La quarantena uccide anche un binario ad-hoc valido — in silenzio

Esperimento pulito: copia intera dell'installazione CalculiX in `/tmp/cx2`, attributo `com.apple.quarantine` di Safari messo a mano sul solo `ccx`. Tre esecuzioni consecutive, tre volte **stato 137** [M].

Controllo, stessa copia con l'attributo rimosso:

```
This is Version 2.22
stato di uscita: 201
```

[M] — 201 è il codice normale di `ccx -v`, già annotato in `meshrec/core/solve.py:1367`.

Riproducibile tre volte su tre. Il risultato: **SIGKILL, stdout vuoto, stderr vuoto, nessun dialogo**. Un'app che lancia il solutore con `subprocess` non vede un errore di Gatekeeper: vede un processo morto di segnale 9 e basta.

### 4.4 La catena completa che porta lì è quella normale

1. copia di `ccx` dentro uno ZIP, attributo di quarantena Safari messo sullo ZIP;
2. doppio clic sullo ZIP (Archive Utility);
3. il file estratto porta `com.apple.quarantine: 0083;68be0000;Safari;` [M] — l'attributo si propaga;
4. eseguito: stato 137 [M].

Cioè: **l'utente che scarica OpenSees dal sito di Berkeley con Safari e lo scompatta col doppio clic ottiene un binario che NOVA non riesce a lanciare, senza che nessuno gli dica perché.** Questo è il caso d'uso di default, non un caso limite.

Corollario nella doc Apple: «Gatekeeper also tracks the provenance of files written by downloaded software» [V]. Se un giorno NOVA scaricasse i solutori per conto dell'utente, i file scritti erediterebbero la stessa condizione [INF].

Attributo che invece è innocuo: `com.apple.provenance`, presente su quasi tutto ciò che è passato per gestori di pacchetti sulla macchina di prova, e senza effetto sull'esecuzione [M].

### 4.5 Chi mette la quarantena e chi no

Nessuno dei binari installati con gestori di pacchetti sulla macchina di prova porta `com.apple.quarantine` (§4.1) [M]. L'attributo lo mettono i browser e i client che dichiarano `LSFileQuarantineEnabled`. La pagina Apple di quella chiave è però **vuota di contenuto** oltre al titolo sull'API DocC: [NON TROVATO] su `https://developer.apple.com/documentation/bundleresources/information-property-list/lsfilequarantineenabled`. L'elenco esatto di chi la mette resta quindi non documentato qui.

### 4.6 Cosa vede e cosa può fare l'utente

Per un'app scaricata, macOS mostra un dialogo e la via d'uscita è **cambiata di versione**: da macOS Sequoia (15) «users will no longer be able to Control-click to override Gatekeeper when opening software that isn't signed correctly or notarized. They'll need to visit System Settings > Privacy & Security to review security information for software before allowing it to run» [V]. La procedura corrente sta nell'articolo di supporto 102445: aprire l'app, poi System Settings, Privacy & Security, «Open Anyway» [V].

**Per un binario da riga di comando lanciato da un altro processo quel percorso non scatta**: non c'è LaunchServices di mezzo, non c'è dialogo, non c'è la voce in Privacy & Security. Non ho trovato documentazione Apple che descriva questo caso: [NON TROVATO], sostituito dalle misure del §4.3. Il log di sistema non è leggibile da questa sessione [NON TROVATO], quindi la ragione precisa del SIGKILL resta [INF]: policy Gatekeeper su codice in quarantena non notarizzato.

Osservazione secondaria, riproducibile ma non spiegata: un file che è stato eseguito **una volta senza** quarantena continua a partire anche se gliela si rimette dopo [M]; una copia nuova con la quarantena dall'inizio viene uccisa sempre. Meccanismo [INF].

**La rimozione è una riga:** `xattr -d com.apple.quarantine` sul percorso. Se NOVA la sa spiegare, il problema passa da «il programma non funziona» a «clicca qui».

---

## 5. Come l'app trova i solutori, e cosa dice quando mancano

NOVA ha già l'ossatura giusta, ed è meglio di quanto il ticket lasci pensare:

- `meshrec/core/solve.py:1313-1322` `eseguibile()` — percorso dichiarato, altrimenti `shutil.which`;
- `solve.py:1325-1356` `disponibilita()` — «Lo sguardo rapido dell'avvio: c'è / non c'è, e da dove», **non esegue niente** e non solleva per un solutore assente;
- `solve.py:1358` e seguenti `verifica()` — «"C'è" non è "funziona"»: esegue il binario e cerca un marcatore, perché «il codice d'uscita non è il verdetto» (misurato in quel file: `ccx -v` esce 201, OpenSees 3.8.0 esce 0 anche su errore fatale);
- `solve.py:1213-1227` `DOVE_PRENDERLO` — il messaggio che dice all'utente dove prendere ciascun solutore;
- `nova/corsa.py:62-69` `verifica()` rende `{"esito": "assente"|"rotto"|"ok", "percorso", "motivo", "dove_prenderlo"}`, e `nova/server.py:185` lo espone insieme alla versione.

Tre buchi, uno per ciascuno dei fatti misurati sopra:

1. **`shutil.which` non basta dentro una `.app`** (§1.1). Serve una lista di percorsi candidati oltre al PATH: `~/.local/bin`, `/opt/homebrew/bin`, `/usr/local/bin`, `~/.local/opt/opensees/*/bin`, più un percorso dichiarato dall'utente che sopravviva ai riavvii (oggi `--solutore` è solo un argomento di riga di comando, `nova/__main__.py:24` — e una `.app` non ha riga di comando).
2. **`verifica()` distingue «assente» da «rotto», ma non distingue «ucciso dalla quarantena»**. Un codice di ritorno -9 (o 137) con stdout e stderr vuoti ha una causa quasi certa su macOS, e un rimedio di una riga. Il controllo costa una lettura di `com.apple.quarantine` sul percorso; il messaggio che ne esce è la differenza fra un utente che rinuncia e uno che risolve in dieci secondi.
3. **`DOVE_PRENDERLO` per OpenSees rimanda a `opensees.berkeley.edu` senza avvisare che lo ZIP scaricato dal browser arriva in quarantena.** Il testo, oggi, manda l'utente esattamente nel caso peggiore del §4.4.

Nessuno dei tre richiede di firmare niente: sono messaggi e ricerca di percorsi.

---

## 6. Le tre shell, sul solo asse macOS

`03-stack-tecnico.md` ha già il confronto generale. Qui solo ciò che cambia sulla catena firma/notarizzazione, dove il quadro è **meno equilibrato** di quanto dicesse il punteggio di `stack_comparator`.

| | pywebview + py2app | briefcase | Tauri 2 + sidecar Python | Electron + Python |
|---|---|---|---|---|
| chi firma | tu, a mano | briefcase, di default | bundler Tauri per l'app, **tu a mano** per `externalBin` (#11992 aperta dal 17/12/2024, [V] già in `03`) | `@electron/notarize` |
| chi notarizza | tu | briefcase, di default, con ripresa | tu | electron-builder |
| entitlements | li scrivi tu | due concessi di default [V] | li scrivi tu | li scrivi tu |
| lingue | Python + JS | Python + JS | Python + JS + **Rust** | Python + JS + Node |
| riuso del server NOVA di oggi | **totale** | totale | totale, ma due salti IPC | totale |
| aggiornamenti | niente incluso | niente incluso | plugin `updater` ufficiale | `autoUpdater` |

Sul riuso: `nova/__main__.py:37` fa già partire uvicorn su `127.0.0.1` e `nova/__main__.py:36` apre il browser con `webbrowser.open`. La finestra nativa sostituisce **quella riga sola**: `webview.create_window(titolo, url)` più `webview.start()` [V doc pywebview], mantenendo il middleware `Host`/`Origin` di `nova/server.py:159-163` così com'è. La superficie di sicurezza non cambia: il server resta su loopback, e una `WKWebView` che punta a `http://127.0.0.1:<porta>/` manda `Origin` e `Host` conformi a quelli già ammessi (`server.py:162-163`) [INF].

Nota di merito per briefcase: è l'unico dei quattro che notarizza per default e che ha già risolto il problema degli entitlements Python (§2.2). Nota di demerito: la sua licenza non è dichiarata su PyPI (`license: None`, versione 0,4,5) [M] — da verificare sul repo prima di adottarlo.

---

## 7. Impacchettare Python: py2app, PyInstaller, briefcase

Versioni all'08/09/2026 [M], dalle API JSON di PyPI:

| | versione | licenza | Python |
|---|---|---|---|
| py2app | 0.28.10 | MIT or PSF | ≥ 3,10 |
| PyInstaller | 6.22.2 | GPLv2-or-later **con eccezione** per distribuire programmi non liberi | ≥ 3,8, < 3,16 |
| briefcase | 0.4.5 | non dichiarata su PyPI | ≥ 3,11 |

- **pywebview indica py2app per macOS**, non PyInstaller: «macOS — Use py2app. For a reference setup.py for py2app, look here» [V]; PyInstaller lo consiglia per Windows/Linux, avvisando che «Pyinstaller picks all the dependencies found in pywebview, even if you don't use them» [V].
- **PyInstaller sa firmare bene**: l'opzione di identità accende da sé `--options=runtime`, un'opzione dedicata passa il file degli entitlements, e per i `.app` aggiunge la firma profonda; ma «Trying to use self-signed certificate as a codesign identity will result in shared libraries failing to load» [V] — il certificato autofirmato non è una scorciatoia praticabile, va comprato quello vero.
- **briefcase** copre firma, notarizzazione e formati `.dmg`/`.zip`/`.pkg` in un comando, con gli entitlements dichiarati nel `pyproject.toml` [V].

Vincolo dimenticabile ma vero: PyInstaller dichiara `< 3,16` su `requires_python`, cioè segue le versioni di Python con ritardo. NOVA oggi chiede `>=3.12` (`pyproject.toml:5`) [V].

---

## 8. Aggiornamenti

Nessuna delle strade Python porta un aggiornatore. Le opzioni, in ordine di costo crescente:

1. **Nessun aggiornamento automatico.** L'utente riscarica il `.dmg`. Per un'app di tesi con pochi utenti è la scelta onesta, e costa zero.
2. **Sparkle** (lo standard di fatto su macOS): richiede di legare un framework al bundle e di sistemare i «Runpath Search Paths» a `@loader_path/../Frameworks` [V]; e avverte che con library validation attiva serve firmare con certificato reale, «This is not an issue for distribution when you sign your application with a Developer ID certificate» [V]. È pensato per progetti Xcode: incastrarlo in un bundle py2app è lavoro vero, non configurazione.
3. **Tauri**, se un giorno si cambia colla: plugin `updater` ufficiale, che però impone una firma sua, separata da quella Apple — «Tauri's updater needs a signature to verify that the update is from a trusted source. This cannot be disabled», con chiave privata da custodire perché «if you lose this key you will NOT be able to publish new updates to the users that have the app already installed» [V]. Richiede Rust ≥ 1,77,2 [V].

Da tenere presente in tutti e tre i casi: ogni versione nuova va notarizzata di nuovo, con il tetto di 75 notarizzazioni al giorno [V].

---

## 9. Dimensione

Misure sull'ambiente reale di NOVA, non stime [M]:

| pezzo | dimensione | come |
|---|---|---|
| CPython 3.12.13 `python-build-standalone`, installato su disco | **57 MB** | `du -sh` sulla copia gestita da `uv` |
| dipendenze di NOVA più pywebview (`site-packages`) | **65 MB** | ambiente nuovo con `pydantic`, `numpy`, `pyyaml`, `fastapi`, `uvicorn`, `pywebview`; `du -sh` |
| di cui `PyObjCTest` (escludibile) | 16 MB | `du -sh` per pacchetto |
| di cui `numpy` 2.5.3 | 22 MB | idem |
| di cui `objc` (PyObjC core) | 9,8 MB | idem |
| codice NOVA più statici | 0,3 MB | `du -sh nova static` |

Somma grezza ≈ 122 MB; togliendo `PyObjCTest` e i test delle dipendenze si arriva realisticamente a **80-100 MB** di `.app` [INF]. I due solutori non entrano nel conto — è tutto il senso della scelta di localizzarli: OpenSees da solo è 30,3 MB e CalculiX 26 MB [M], e nessuno dei due è ridistribuibile senza affrontare la questione di licenza già segnalata nel `README.md` delle ricerche.

Ordine di grandezza: come un Electron vuoto, e per la ragione opposta (Python invece di Chromium).

---

## 10. Costo

«The Apple Developer Program annual fee is **99 USD** and the Apple Developer Enterprise Program annual fee is 299 USD, in local currency where available» [V]. Nessun'altra voce obbligatoria: `notarytool`, `stapler` e `codesign` arrivano con Xcode.

Due sconti da verificare, non da dare per acquisiti: «accredited educational institutions worldwide can enroll in the Apple Developer Program with a fee waiver» [V] — riguarda l'istituzione, non lo studente («While there isn't a developer program specifically for students…»). Se l'università di Mario è già iscritta, la strada esiste; se no, sono 99 USD l'anno, **ricorrenti**: alla scadenza il certificato smette di firmare cose nuove, mentre ciò che è già firmato, timestampato e notarizzato continua a funzionare [INF, dal fatto che il timestamp sicuro esiste proprio per questo].

---

## Raccomandazione per NOVA

**Non è una decisione: è la strada che le misure indicano.** La decisione resta dell'autore.

### Strada consigliata — «prima i messaggi, poi la finestra, la firma per ultima»

Le due misure del §1 dicono che oggi NOVA **non sopravviverebbe** all'incapsulamento in una `.app` per motivi che non hanno niente a che fare con Apple Developer ID. Ordine dei passi, dal più utile al più costoso:

1. **Riparare la ricerca dei solutori prima di impacchettare qualunque cosa** (§5, punti 1-3). Percorsi candidati oltre al PATH; percorso dichiarato che sopravviva al riavvio (file di configurazione, non solo `--solutore`); riconoscimento del codice -9/137 con stdout e stderr vuoti come «file in quarantena», con il comando di rimozione dell'attributo nel messaggio; avviso in `DOVE_PRENDERLO` che lo ZIP scaricato dal browser va sbloccato. Questo vale **anche senza finestra nativa**, perché già oggi chiunque scarichi OpenSees con Safari incappa nel §4.4.
2. **Radice dei dati esplicita** al posto di `Path.cwd() / "corse"` (`nova/__main__.py:35`).
3. **Finestra nativa con pywebview**, sostituendo `webbrowser.open` con `create_window` più `start` e lasciando intatti il server, il middleware `Host`/`Origin` e il sidecar. È la modifica più piccola che dà una finestra vera, e non impegna su nulla.
4. **`.app` con py2app** (via che pywebview documenta) oppure **briefcase** se si vuole il giro completo firma + notarizzazione + `.dmg` già scritto da altri. Fino a qui, firma ad-hoc: gira sulla macchina di chi la costruisce, non si distribuisce.
5. **Solo quando serve dare il `.dmg` a qualcuno**: iscrizione al Developer Program, certificato «Developer ID Application», hardened runtime, l'entitlement del §2.2 scelto con la misura e non per riflesso, sottomissione con attesa, stapling, verifica profonda e stretta con `codesign`, e lettura del log di notarizzazione anche quando passa.

### Piano B

Se il passo 5 non si può fare (99 USD non spesi, o certificato non ottenibile in tempo): **distribuire lo ZIP con istruzioni**, oppure restare all'avvio da riga di comando come oggi. Il piano B non è un ripiego tecnico — un'app di tesi con un utente conosciuto non ha bisogno di Gatekeeper — ma va detto chiaro all'utente, perché con macOS Sequoia e successivi la via d'uscita non è più il Control-clic ma System Settings, Privacy & Security [V], e l'utente che non lo sa si ferma lì.

Quello che **non** consiglio: mettere `disable-library-validation` per abitudine (Apple avvisa che Gatekeeper fa controlli extra su chi lo disattiva [V]); usare `spctl` come controllo d'avvio (falso allarme garantito, §2.3); e passare a Tauri **per** la firma — la firma dei binari esterni è proprio il punto dove Tauri ha una issue aperta da quasi due anni (#11992, già in `03`).

## Domande aperte per l'autore

1. **NOVA la userà qualcun altro?** Se la risposta è «no, io e il relatore», i passi 4-5 non servono e il §10 è una spesa evitata. Se è «sì», la firma va messa in conto adesso perché cambia il modo di costruire, non solo l'ultimo passo.
2. **L'università è iscritta all'Apple Developer Program?** Cambia 99 USD l'anno in zero, e la risposta si trova chiedendo, non cercando.
3. **Dove vivono i dati di un'app senza cwd?** `~/Library/Application Support/NOVA` (invisibile, ordinato) o `~/Documenti/NOVA` (visibile, l'utente ci arriva col Finder)? Per una tesi dove i risultati si allegano, la seconda ha un argomento forte.
4. **Chi installa i solutori: l'utente o NOVA?** Oggi l'utente. Se un domani NOVA li scaricasse da sé, la propagazione della quarantena del §4.4 diventa un problema di NOVA e non dell'utente — con il vantaggio che NOVA può togliere l'attributo appena scritto il file.
5. **Windows resta in nebbia?** Le decisioni dell'08/09 dicono di sì. Se cambia, tutto il §2-§4 va rifatto da capo: certificato EV, SmartScreen, nessuna quarantena ma reputazione (accennato in `03`).
6. **Aggiornamenti: servono davvero?** Se la risposta è «no» il §8 sparisce; se è «sì», è l'argomento più forte a favore di Tauri, più della dimensione del bundle.

## Fonti

Ogni riferimento con tre campi: URL, perché conta qui, cosa se ne prende. Le pagine marcate [V] sono catturate in `docs/ricerca/fonti/` con il sidecar `.provenance.json` accanto.

- **URL** https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution · [V] · `fonti/apple-notarizzazione.md`
  **perché conta qui** è l'elenco in prima persona di ciò che Apple pretende, e ogni voce diventa un requisito di build
  **cosa se ne prende** le sei protezioni obbligatorie (§2.1), il divieto di firma ad-hoc per la distribuzione, l'ereditarietà degli entitlements dai plug-in all'host, la fine di `altool`
- **URL** https://developer.apple.com/documentation/security/customizing-the-notarization-workflow · [V] · `fonti/apple-notarytool-stapler.md`
  **perché conta qui** NOVA non ha un progetto Xcode: il flusso da riga di comando è l'unico applicabile
  **cosa se ne prende** i tre passi del §3, il fatto che allo ZIP non si stapla e ai binari sciolti nemmeno, i tempi 5/15 minuti e il tetto di 75 notarizzazioni al giorno
- **URL** https://developer.apple.com/documentation/security/resolving-common-notarization-issues · [V] · `fonti/apple-problemi-notarizzazione.md`
  **perché conta qui** dà i messaggi d'errore testuali, cioè permette di riconoscere il guasto invece di indovinarlo
  **cosa se ne prende** i comandi di verifica del §2.3, `timestamp.apple.com` come unico server, il divieto di `get-task-allow`, `--options=runtime` come modo manuale di accendere l'hardened runtime
- **URL** https://developer.apple.com/documentation/security/hardened-runtime · [V] · `fonti/apple-hardened-runtime.md`
  **perché conta qui** l'hardened runtime è obbligatorio per notarizzare e rompe cose che un Python impacchettato fa normalmente
  **cosa se ne prende** l'elenco delle sei eccezioni di runtime, la regola «You add entitlements only to executables … in-process plug-ins inherit the entitlements of their host executable», e che un entitlement falso non va scritto affatto
- **URL** https://developer.apple.com/documentation/bundleresources/entitlements/com.apple.security.cs.disable-library-validation · [V] · `fonti/apple-disable-library-validation.md`
  **perché conta qui** è l'entitlement che decide se le `.so` delle ruote PyPI si caricano o no
  **cosa se ne prende** la definizione di library validation («signed by Apple or signed with the same Team ID») e il costo dichiarato: Gatekeeper fa controlli extra su chi la disattiva
- **URL** https://support.apple.com/guide/security/gatekeeper-and-runtime-protection-sec5599b66df/web · [V] · `fonti/apple-gatekeeper-sicurezza-piattaforma.md`
  **perché conta qui** è la descrizione ufficiale del perimetro di Gatekeeper, che serve a capire cosa **non** copre
  **cosa se ne prende** «all software in macOS is checked for known malicious content the first time it's opened» e «Gatekeeper also tracks the provenance of files written by downloaded software» (§4.4)
- **URL** https://support.apple.com/en-us/102445 · [V] · `fonti/apple-aprire-app-in-sicurezza.md`
  **perché conta qui** è ciò che l'utente vede e la procedura che dovrà seguire, da citare nei messaggi di NOVA
  **cosa se ne prende** i cinque dialoghi possibili e la sequenza System Settings, Privacy & Security, «Open Anyway»
- **URL** https://developer.apple.com/news/?id=saqachfa · [V] · `fonti/apple-sequoia-runtime-protection.md`
  **perché conta qui** la scorciatoia che tutti conoscono (Control-clic, poi Apri) non esiste più, e le istruzioni scritte prima del 2024 sono sbagliate
  **cosa se ne prende** «In macOS Sequoia, users will no longer be able to Control-click to override Gatekeeper»
- **URL** https://developer.apple.com/support/enrollment/ · [V] · `fonti/apple-costo-developer-program.md`
  **perché conta qui** il numero del §10, con la sua ricorrenza annuale
  **cosa se ne prende** 99 USD l'anno, 299 per l'Enterprise, e l'esenzione per le istituzioni accreditate (non per gli studenti)
- **URL** https://pyinstaller.org/en/stable/feature-notes.html · [V] · `fonti/pyinstaller-note-macos.md`
  **perché conta qui** è la fonte primaria più esplicita sul nodo firma più Python, e riporta l'errore di library validation parola per parola
  **cosa se ne prende** la ri-firma ad-hoc automatica, l'identità che accende `--options=runtime`, e perché il certificato autofirmato non funziona
- **URL** https://pywebview.flowrl.com/guide/freezing.html · [V] · `fonti/pywebview-freezing.md`
  **perché conta qui** decide con quale strumento si costruisce il `.app` se si sceglie pywebview
  **cosa se ne prende** «macOS — Use py2app», e l'avviso che PyInstaller trascina dentro dipendenze inutilizzate
- **URL** https://briefcase.readthedocs.io/en/stable/reference/platforms/macOS/index.html · [V] · `fonti/briefcase-macos.md`
  **perché conta qui** è l'unico strumento che firma e notarizza per default, e i suoi default sono una risposta già data al problema del §2.2
  **cosa se ne prende** i due entitlements concessi d'ufficio, le opzioni di salto e ripresa della notarizzazione, i tre formati, e l'avviso sulle ore d'attesa
- **URL** https://v2.tauri.app/plugin/updater/ · [V] · `fonti/tauri-updater.md`
  **perché conta qui** è l'unica delle quattro strade che porta un aggiornatore già fatto, e il §8 pesa questo contro il resto
  **cosa se ne prende** la firma dell'updater non disattivabile, la chiave privata che se persa chiude gli aggiornamenti, Rust ≥ 1,77,2
- **URL** https://sparkle-project.org/documentation/ · [V]
  **perché conta qui** è l'opzione 2 del §8, e la sua doc dice da sé quanto costa in un progetto non-Xcode
  **cosa se ne prende** i «Runpath Search Paths» a `@loader_path/../Frameworks`, e il rapporto fra library validation e firma di sviluppo
- **URL** https://developer.apple.com/forums/thread/740680 · [INF] (forum, non doc: per la regola d'ingresso di questo ticket non può essere [V])
  **perché conta qui** è dove un ingegnere Apple dice che su Apple Silicon tutto il codice dev'essere firmato e che il linker firma ad-hoc da sé
  **cosa se ne prende** l'affermazione, tenuta come inferenza e sostituita dalla misura del §4.2 e dal `linker-signed` osservato sul binario di OpenSees
- **URL** https://developer.apple.com/documentation/bundleresources/information-property-list/lsfilequarantineenabled · **[NON TROVATO]**
  **perché conta qui** avrebbe dato l'elenco ufficiale di chi mette `com.apple.quarantine`
  **cosa se ne prende** niente: la pagina rende solo il titolo, e il §4.5 resta una misura sui file presenti sulla macchina

Fonti locali lette in sessione: `nova/__main__.py:24-45`, `nova/server.py:34-52, 159-163, 177-185`, `nova/corsa.py:62-69`, `meshrec/core/solve.py:1213-1227, 1302-1310, 1313-1322, 1325-1356, 1358-1377`, `pyproject.toml:1-13`, `docs/ricerca/03-stack-tecnico.md:29-75, 162-183`, `docs/ricerca/README.md`.

## Caveat

- Tutte le misure vengono da **una sola macchina**, macOS 26.6.2 arm64, con Gatekeeper nella configurazione di default («App Store and identified developers») e SIP nello stato di fabbrica non verificato. Una macchina gestita da MDM può comportarsi diversamente [V, dall'articolo 102445: «These settings might not be available if your Mac is managed by a system administrator»].
- **Nessuna firma con identità reale è stata provata**: non c'è un certificato Developer ID su questa macchina, quindi tutto il §2 e il §3 sono letti, non eseguiti. La prima sottomissione vera può scoprire cose che la doc non dice.
- Il comportamento del §4.3-4.4 è **misurato ma non spiegato**: manca l'accesso al log di sistema che direbbe quale policy uccide il processo.
- Le versioni si muovono: `notarytool` 1.1.2, Xcode 26.6, py2app 0.28.10, PyInstaller 6.22.2, briefcase 0.4.5, pywebview 6.2.1, tutte all'08/09/2026. Il requisito Apple cambiato di recente, quello che invalida le guide più vecchie, è Sequoia sul Control-clic.
- La licenza di briefcase non è dichiarata su PyPI: prima di adottarlo va letta sul repo.
