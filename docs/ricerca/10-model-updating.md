# Ricerca: model updating di un telaio in c.a. da frequenze e forme modali sperimentali

Ricerca dell'08/09/2026 per l'issue [#33](https://github.com/maeurong/NOVA/issues/33) della mappa
wayfinder [#31](https://github.com/maeurong/NOVA/issues/31), condotta da un `researcher` AFK sul ramo
`research/model-updating`. Domanda posta: quali metodi di model updating funzionano con **poche
frequenze e poche forme modali misurate su pochi sensori**, per un telaio di laboratorio in c.a.
portato a cinque stati di danno crescente da martinetti idraulici — formulazioni, funzione
obiettivo, parametrizzazione che resta ben posta, validazione, letteratura sui telai in c.a.,
librerie Python con licenza, formati dei dati modali.

Sblocca [#43](https://github.com/maeurong/NOVA/issues/43) (stato di danno nel modello dati e
importazione dei modi) e [#44](https://github.com/maeurong/NOVA/issues/44) (algoritmo: parametri,
funzione obiettivo, validazione).

Tag, come in [`README.md`](README.md): **[V]** verificato su fonte primaria · **[M]** misurato in
sessione con comando · **[INF]** inferenza o calcolo mio · **[NON TROVATO]**. Notazione numerica
italiana (virgola decimale) fuori dalle citazioni verbatim.

**Skill-gate.** `research` invocata (questo file ne è il prodotto); `caveman:caveman` per il report
al thread; `ponytail` nominata dal dispatch e onorata nella §9 — la raccomandazione sceglie il
gradino più alto della scala che regge, non il più completo. **Due scostamenti dichiarati**: (1) la
skill `research` chiede di dispacciare un agente in background per la lettura, il brief dice
«nessun subagente» — ha vinto il brief, la lettura l'ho fatta io; (2) la regola generale del
`researcher` chiede di aggiornare `docs/ricerca/index.md`, ma **quel file non esiste ancora** e la
sua creazione è il ticket [#39](https://github.com/maeurong/NOVA/issues/39), che è bloccato da
questo — non l'ho creato per non anticiparne il disegno con una riga sola. Vedi §11.

## Premesse del brief, verificate in sessione

| premessa | esito |
|---|---|
| `docs/ricerca/README.md:33` fissa la convenzione dei tag | **falsa nella riga, vera nel contenuto** [M] — la convenzione sta a `docs/ricerca/README.md:17`, non a `:33` (che è il paragrafo sulle funzioni intelligenti). Corretta e proseguito: non sposta il compito |
| `CONTEXT.md:91-96` definisce **Danno** come riduzione dichiarata di E e resistenze del calcestruzzo di un'asta | **vera** [V] — glossario, voce «Danno» |
| `CONTEXT.md:55-60` definisce **Riduzione** come mm di copriferro espulso per lato | **vera** [V] — glossario, voce «Riduzione» |
| Danno e Riduzione sono «i parametri candidati dell'updating» | **vera come candidatura, falsa come stato del codice**: `Danno` è dichiarato in `nova/modello.py:91-94` e appeso all'asta in `:105`, ma **nessuna riga di `nova/` lo legge** — `grep -rn danno nova/ static/` rende la sola `modello.py:105` [M]. `Riduzione` invece è cablata (`nova/deck.py:287,398,495,571-582`, `nova/legami.py:82-96`). Scostamento marginale: non cambia la domanda, cambia la §5 |
| «Modale già in `nova/modale.py`» | **vera** [V] — `leggi()` rende frequenze, masse per modo e cumulate, e la `forma` per nodo (`nova/modale.py:85-89`) |
| caso: telaio MURO 1, `docs/caso-studio/README.md` | **vera** [V] — geometria, armature e corsa modale ci sono; **i dati sperimentali dei cinque stati non sono nel repo** (il ticket #40 li dà per «da portare sul Mac»). `lab_telaio_v2/` nel checkout principale è l'uscita MeshRec del solido, non modi misurati |

## Artefatti consultati

| sorgente | come | cosa se ne prende |
|---|---|---|
| Simoen, De Roeck, Lombaert 2015, MSSP 56-57:123-149 | postprint KU Leuven → `pdftotext -layout` | funzione costo, residui modali, mal condizionamento, esempio su **trave in c.a. danneggiata in laboratorio**, lettura bayesiana della regolarizzazione |
| Mottershead, Link, Friswell 2011, MSSP 25:2275-2296 | PDF sul sito personale di Friswell (coautore) → `pdftotext` | metodo della sensitività per intero: linearizzazione, mode pairing, regolarizzazione di Tichonov e curva L, regola `q > p`, moltiplicatori di matrice |
| Fang, Perera, De Roeck 2008, JSV 313:544-559 | postprint Archivo Digital UPM → `pdftotext` | **telaio in c.a. di laboratorio**: funzione obiettivo, sottostrutture, procedura a tre passi, numeri veri di frequenza integro/danneggiato |
| Durmazgezer, Yucel, Ozcelik 2019, Bull. Earthq. Eng. 17:6041-6060 | pagina editore, **solo abstract** | **telaio in c.a. a mezza scala, martinetto in controllo di spostamento, livelli di danno crescenti**: schema a due passi e fattori di riduzione di rigidezza alle basi dei pilastri e alle estremità della trave |
| Sinha, Friswell, Edwards 2002, JSV 251(1):13-38 | PDF sul sito di Friswell (coautore) → `pdftotext` | le tre famiglie di modello di fessura a confronto: elemento intero declassato, molla rotazionale, riduzione triangolare |
| P.C. Hansen, *The L-curve…* (DTU) | PDF → `pdftotext` | scelta del parametro di regolarizzazione, curva L contro GCV, e i **limiti** della curva L |
| UC-SDRL, specifiche UFF data set 55 e 58 | `curl` | record, campi, stato («Obsolete» / «Current») |
| ARTeMIS Modal, pagina di aiuto UFF 55 | `curl` | cosa esporta il programma OMA più diffuso in laboratorio |
| `LICENSE` di pyuff, pyOMA2, SciPy | `curl` su raw | licenze verbatim |
| `nova/modello.py`, `nova/modale.py`, `nova/deck.py`, `nova/legami.py`, `meshrec/core/opensees.py`, `docs/caso-studio/README.md`, `pyproject.toml` | lettura e `grep` | stato reale del codice |
| `tests/test_caso_studio.py::test_modale_auto_…` | corsa vera su OpenSees | tempo di una modale completa [M] |

Le fonti citate `[V]` stanno in [`fonti/`](fonti/) come **estratti** (le sole porzioni citate,
verbatim) con il sidecar `.provenance.json` accanto: sono articoli sotto copyright dell'editore, e
copiarne il testo pieno in un repo pubblico sarebbe un'altra cosa. Le specifiche UFF, che sono
documenti di formato, sono salvate per intero.

---

## 1. Che cosa i modi possono e non possono dire

Il principio è uno solo, e va scritto prima dei metodi: **il danno localizzato riduce la rigidezza
locale, e la rigidezza locale sposta frequenze e forme**. Simoen 2015 §1.1 [V]: «The basic principle
behind this consists in assuming that localized structural damage results in a local reduction of
stiffness. As such, updating stiffness parameters of the FE model in several damage states provides
a (non-destructive) means to thoroughly and accurately investigate the condition of the structure.»

Da lì in poi sono quasi tutti avvertimenti.

**Il problema è mal posto, e non per colpa del rumore.** Simoen 2015 fig. 2 [V] mostra **sei
distribuzioni di rigidezza diverse lungo la stessa trave che danno proprietà modali quasi
identiche**. Non è un caso patologico costruito ad arte: è la ragione per cui la parametrizzazione
viene prima del metodo. Formalmente (§2.3 [V]): la rank-deficiency vera della matrice di sensitività
è rara, la **quasi**-rank-deficiency è comunissima, e rende la soluzione «very unstable with respect
to small changes in the data vector».

**I modi bassi non vedono il danno locale piccolo.** Mottershead 2011 §7.1 [V], verbatim: «It is well
known that low-frequency modal test data or static response data are not well suited for detecting
and quantifying small-sized local damage. Acceptable results can only be expected if high spatial
resolution of the response data is available.» Con pochi sensori, la risoluzione spaziale è bassa per
definizione: il metodo può dire **quanto** in media si è persa rigidezza in una zona, non **dove
esattamente** dentro quella zona.

**L'ordine di grandezza, sul caso più vicino a MURO 1.** Fang 2008, telaio in c.a. di laboratorio,
tabella 2 [V]: la prima frequenza scende da **30,16 Hz (integro) a 29,1 Hz (danneggiato)**, cioè
−3,5 %; la nona da 948,13 a 933,98 Hz, −1,5 %. L'aggiornamento su quegli stessi dati identifica in
una sottostruttura una **riduzione di rigidezza del 38 %** rispetto allo stato di riferimento [V].
Tre punti percentuali di frequenza per quaranta di rigidezza locale: **la sensibilità è bassa, e
tutto ciò che sporca la frequenza di un punto percentuale sporca la stima del danno di dieci** [INF].

**Verifica sul codice di NOVA di quanto sia facile spostare le frequenze di quel tanto.** Sul MURO 1,
le stesse aste con `suddivisioni: 4` danno 20,45 / 31,85 / 35,85 Hz e con `suddivisioni: 1` danno
18,64 / 24,46 / 28,90 Hz (`docs/caso-studio/README.md:149-151,159-160`) [V]: **fino a −23 % sul
secondo modo per una scelta di discretizzazione**, cioè sei volte l'effetto del danno di Fang.
Conseguenza operativa, e non è un dettaglio: la discretizzazione del modello va **congelata** prima
di aprire l'aggiornamento, e dichiarata accanto ai risultati; e il modello iniziale va portato allo
stato di riferimento (§6) prima di attribuire alcunché al danno.

## 2. Le formulazioni, e quale regge con pochi dati

### 2.1 Metodo della sensitività (minimi quadrati non lineari iterativi)

È lo standard. Mottershead 2011 §2 [V]: si linearizza col primo termine della serie di Taylor,
`ε_z = z_m − z(θ) ≈ r_i − G_i (θ − θ_i)`, dove `G_i = ∂z_j/∂θ_k` è la matrice di sensitività
valutata in `θ_i`; si risolve per `Δθ_i`, si aggiorna `θ_{i+1} = θ_i + Δθ_i`, si itera fino a
convergenza. La soluzione ai minimi quadrati pesati, §3 eq. (17) [V]:

```
Δθ_i = [G_i^T W_e G_i]^{-1} G_i^T W_e r_i
```

Il vincolo dimensionale è dichiarato senza sfumature, §3 [V] verbatim: «In parameter updating the
number of measurements should always be made larger than the number of parameters (q>p) which
yields overdetermined equation systems.» E in §5 [V]: «The number of parameters should be
considerably smaller than the number of measurements.»

**Sensitività: analitiche o alle differenze finite.** Per gli autovalori l'espressione analitica è
elementare, Mottershead eq. (6) [V]: `∂λ_j/∂θ_k = u_j^T (−λ_j ∂M/∂θ_k + ∂K/∂θ_k) u_j`, e serve solo
il modo *j*-esimo. Per le forme modali si passa da Fox e Kapoor (espansione sugli autovettori,
troncata) o da Nelson. Simoen §2.4 [V] è netta sull'alternativa pratica: «By far the most popular is
making use of the finite difference method; however, this approach is very time-consuming and only
locally accurate.»

Per NOVA la scelta è già decisa dall'architettura, non da una preferenza: il solutore vive **fuori
processo**, NOVA non ha in mano `K` né `M`, e le derivate analitiche chiederebbero le matrici
elementari. Differenze finite, quindi — e il costo è misurabile.

> **[M] misurato l'08/09/2026.** Comando:
> `/usr/bin/time -p /Users/mario/GitHub/NOVA/.venv/bin/python -m pytest …/tests/test_caso_studio.py -k modale_auto -q`
> dal worktree `research/model-updating` (HEAD `0b81606`). Esito: `1 passed`, **1,01 s** e **0,95 s**
> reali su due corse. Il caso è la modale «auto» completa del MURO 1, che percorre la scala
> `[3, 6, 12, 24, 42]` modi e comprende generazione del deck, corse OpenSees 3.8.0 e lettura.

[INF] Con `p` parametri e differenze finite in avanti servono `p + 1` corse per iterazione: `p = 6`
→ ≈ 7 s per iterazione, ≈ 1-2 minuti per un aggiornamento di 10-15 iterazioni, e ≈ 5-10 minuti per i
cinque stati di danno. Il costo **non è il vincolo** su un telaio di questa taglia. Il vincolo è il
numero di misure.

### 2.2 Minimi quadrati regolarizzati

Quando la parametrizzazione da sola non basta, si aggiunge un termine di penalità. Mottershead §4
eq. (18) e (21) [V]:

```
J(θ) = ε_z^T W_e ε_z + λ² Δθ_i^T W_θ Δθ_i
Δθ_i = [G_i^T W_e G_i + λ² W_θ]^{-1} G_i^T W_e r_i
```

`W_θ = I` è la Tichonov classica [V]. L'alternativa di Link, eq. (19)-(20) [V], lega `W_θ`
all'inverso della sensitività al quadrato, «This definition allows the parameter changes to be
constrained according to their sensitivity. In consequence the parameters remain unchanged if their
sensitivity approaches zero» — cioè un parametro che i dati non vedono **non si muove**, invece di
muoversi a caso. Per un telaio strumentato con pochi sensori questa è la scelta più difendibile
[INF].

Valore di `λ`: Link, citato da Mottershead §4 [V], «suggested that the factor λ² lies in the range
between 0 (no regularisation) and 0.3. […] If the ill-conditioning is not too strong λ²=0.05.»
La scelta principiata è la **curva L** (Hansen [V]): si diagrammano in log-log la norma del residuo e
la norma del vincolo laterale al variare di `λ`, e si prende l'angolo. Due avvertenze, entrambe dalle
fonti: Hansen §8 [V] elenca i limiti della curva L (soluzioni molto regolari e comportamento
asintotico), e nota che la cross-validation generalizzata «occasionally fails» ma «when GCV works it
usually gives» un valore migliore; Mottershead §4 [V] avverte che nell'iterazione non lineare
«often the corner of the L-curve disappears as the iterations progress […] it is often convenient to
set the regularisation parameter at the first iteration and retain this value until convergence».

Nell'esempio a due gradi di libertà di Mottershead, tabella 1 [V], i numeri parlano da soli:
senza regolarizzazione `k = 1,779 / 0,243 / 0,304` contro un vero `1,200 / 0,800 / 1,000`; con
`λ = 0,0179` all'angolo della curva L, `1,179 / 0,836 / 1,046`.

### 2.3 Bayesiana

Simoen 2015 §4 [V] è la trattazione completa. Il punto che conta qui è §4.5.1 [V]: la stima MAP
`θ̂ = arg min [− log L(θ|d̄) − log p(θ)]` con errore di predizione gaussiano a media nulla e
covarianza `Σ_η` dà `F_ML = ½ η^T Σ_η^{-1} η` — **cioè esattamente i minimi quadrati pesati**, e il
termine del prior «in fact corresponds to a regularization term […] the deterministic counterpart of
the Bayesian inference scheme incorporates regularization in a natural way, without having to revert
to re-parameterization or other standard regularization methods that require additional
decision-making and may appear heuristic».

Detto altrimenti [INF]: **la bayesiana con prior gaussiano e la Tichonov sono la stessa equazione**,
letta due volte. Ciò che la bayesiana dà in più è l'incertezza a posteriori: covarianza
`Σ_po = (J^T Σ_η^{-1} J + Σ_pr^{-1})^{-1}` nel caso lineare-gaussiano, eq. (30) [V], oppure per
approssimazione asintotica l'inverso dell'Hessiano nel punto MAP, eq. (32) [V] — «In many
optimization algorithms, the Hessian of the objective function F_MAP is computed as a by-product in
the solution of the optimization problem». Con `p` piccolo e senza campionamento MCMC, la barra
d'errore sul danno **si ottiene quasi gratis**, e su un problema mal posto è la cosa che manca di
più: un 38 % di riduzione senza intervallo non dice se il modello ha visto il danno o il rumore.

Il campionamento pieno (MCMC, TMCMC di Ching e Chen 2007) è l'ulteriore passo. Non l'ho letto: la
pagina ASCE è a pagamento [NON TROVATO: `https://ascelibrary.org/doi/10.1061/(ASCE)0733-9399(2007)133:7(816)`].
Per `p ≤ 8` e un solutore da un secondo a corsa sarebbe fattibile, ma è una dipendenza e una
complicazione che la §9 non raccomanda al primo giro.

### 2.4 Metodi che non entrano

- **Metodi diretti** (correzione secca delle matrici `K` e `M`): danno matrici che riproducono i
  modi ma non sono più fisiche — Fang 2008 §1 [V] li scarta per questo.
- **Constitutive Relation Error** (Ladevèze): Simoen §2.2.3 [V] lo cita; l'indicatore è energetico e
  chiede accesso alle matrici elementari, che fuori processo NOVA non ha [INF].
- **Ottimizzatori stocastici** (algoritmi genetici, sciami): compaiono in letteratura ma non
  risolvono il mal condizionamento, moltiplicano solo le corse del solutore [INF].

## 3. Funzione obiettivo

La forma canonica, Simoen eq. (14) [V], è la sola che ho trovato in due fonti indipendenti scritta
allo stesso modo (Fang §2.1 eq. (1)-(2) [V] è la stessa cosa senza normalizzazione esplicita):

```
F(θ) = ½ Σ_r a_r (λ̄_r − λ_r(θ))² / λ̄_r²  +  ½ Σ_r b_r ‖γ_r φ̄_r − L φ_r(θ)‖² / ‖γ_r φ̄_r‖²
```

Quattro decisioni ci stanno dentro, e vanno prese tutte:

**1. Autovalori, non frequenze.** `λ = ω² = (2πf)²` in entrambe le fonti [V]. La derivata analitica
è dell'autovalore, e il residuo normalizzato su `λ̄` pesa di più i modi bassi in termini di `f`.

**2. I gradi misurati, non tutti.** `L ∈ R^{No × Nd}` è una matrice binaria che **seleziona** i gradi
strumentati dai gradi del modello (Simoen eq. (10) [V]); Mottershead §2.2 [V] dice lo stesso: «the
differences between the measured mode shapes at a restricted number of degrees of freedom
corresponding to the location of sensors and the analytical mode shapes at the same coordinates».
Nessuna espansione modale, nessuna condensazione: si butta via ciò che non si è misurato. Per NOVA è
un pezzo di codice banale, perché `nova/modale.py:89` già rende la forma come dizionario
`{id_nodo: [x, y, z]}` [V].

**3. La scalatura, perché i modi sperimentali non sono normalizzati a massa.** Simoen eq. (11) [V]:
`γ_r = (φ̄_r^T L φ_r) / ‖φ̄_r‖²`, minimi quadrati fra misurato e calcolato, «necessary since in most
cases, the experimental modes are identified using output-only data, and therefore cannot be
mass-normalized». Fang 2008 [V] **poteva** normalizzare a massa perché la forzante del martello era
registrata («the measured mode shapes are also mass normalized because the impact force was
simultaneously recorded»); se il laboratorio di Mario fa OMA in sola uscita, non si può, e serve
`γ_r`. Vale anche dal lato NOVA: il registratore scrive `eigen k` sui gradi 1 2 3
(`meshrec/core/opensees.py:499-500`) e `modalProperties` gira con `-unorm` (`:506`) [V] — la
normalizzazione del vettore uscente non è un contratto su cui appoggiarsi, e la `γ_r` la rende
irrilevante [INF].

**4. I pesi `a_r`, `b_r`.** Simoen §2.2.3 [V]: idealmente inversi alle varianze osservate
(ottimo per Gauss-Markov), «However, in most cases the weighting factors are chosen based on
engineering judgment and/or trial-and-error»; nel suo esempio li pone tutti a 1. Mottershead §3 [V]
propone `W_e = [diag(z_m)]^{-2}`, che è la stessa normalizzazione scritta nella matrice dei pesi.
[INF] Per NOVA: partire da `a_r = b_r = 1` sui residui **già normalizzati**, ed esporre i pesi come
campo del modello, non come costante nel codice — sono un'ipotesi dell'analista, e ogni numero deve
portare il suo contraddittore.

### MAC e accoppiamento dei modi

Il MAC serve a **accoppiare** modo calcolato e modo misurato, non a costruire il residuo. Definizione,
Simoen eq. (12) [V]:

```
MAC(φ_i, φ̄_j) = |(L φ_i)^T φ̄_j|² / (‖L φ_i‖² ‖φ̄_j‖²)
```

Mottershead §2.1 [V]: «It is necessary to ensure that the analytical and measured eigenvalues
correspond to the same physical mode. This process, usually referred to as mode pairing, may be
achieved by carrying out a modal correlation using the modal assurance criterion (MAC)».

Tre trappole, tutte dalle fonti:

- **Modi vicini.** Simoen [V]: «In selected cases with many closely spaced or very similar modes, the
  MAC-approach may lead to erroneous mode matching»; il rimedio proposto è accoppiare minimizzando
  `1 − MAC(φ_i, φ̄_j) + |1 − λ_i/λ̄_j|`, eq. (13) [V], cioè forma **e** frequenza insieme.
- **Discontinuità dell'obiettivo.** Simoen [V], verbatim: «mode shape matching often results in
  non-smooth behavior of the objective function. As the parameter values vary, the mode shapes might
  get matched differently, resulting in sudden jumps in the objective function which can hinder the
  efficiency of gradient-based optimization algorithms significantly.» [INF] Rimedio pratico: fissare
  l'accoppiamento all'inizio dell'iterazione e ricalcolarlo solo se il MAC scende sotto una soglia,
  registrando l'evento — un salto silenzioso della coppia falsa il risultato senza far rumore.
- **Pochi sensori.** [INF] Il MAC fra due vettori di `No` componenti con `No` piccolo è quasi sempre
  alto: con 3 canali il MAC non discrimina quasi nulla. L'origine del criterio è Allemang 2003,
  *The Modal Assurance Criterion — Twenty Years of Use and Abuse*, Sound and Vibration 37:14-23;
  **testo pieno non letto** [NON TROVATO: `https://www.sandv.com/downloads/0308alle.pdf` rende una
  pagina HTML, ResearchGate risponde 403]. La definizione qui sopra viene da Simoen, letta.

### Smorzamento

I rapporti di smorzamento identificati sperimentalmente sono un dato che il laboratorio produce (UFF
55 li porta, §8) e che **il modello modale di NOVA non può consumare**: `eigen` è un problema non
smorzato. Vanno importati e conservati come dato dello stato, non entrano nella funzione obiettivo
[INF].

## 4. Parametrizzazione — la decisione che conta più del metodo

Simoen §2.3 [V] elenca le due regole in forma di ricetta: «ill-conditioning through parameterization
can be avoided or abated by (1) choosing physically relevant parameters that sufficiently affect the
observed data (thereby avoiding near-zero columns in the sensitivity matrix); and (2) avoiding
overparameterization along the structure (thereby avoiding nearly linearly dependent columns in the
sensitivity matrix for neighboring elements). The latter is usually accomplished by not defining the
updating parameter element-wise, but instead for sets of (adjacent) elements, also referred to as
substructures.» E ancora [V]: «it is often advantageous to select correction factors instead of the
physical parameters themselves».

### Le tre famiglie, a confronto

**(a) Moltiplicatore di rigidezza per asta o per tratto.** Mottershead §5.1 [V]:
`K = K_0 + γ_1 K_1 + … + γ_U K_U`, dove un parametro può coprire più elementi, «In this way the
parameters may be applied to substructures». Il motivo per raggrupparne più d'uno è esplicito [V]:
«One reason why different parts of the structure might be updated using the same parameter would be
the sensitivity of the eigenvalues (and eigenvectors) in the frequency range of interest to small
changes in the parameters is very similar. In that case separating the elements whose changes have a
similar effect would be a bad choice, possibly leading to ill-conditioning of the sensitivity
matrix.» E §5.2 [V]: le matrici di rigidezza e di massa elementari sono **lineari** in `E` e in `ρ`,
quindi il moltiplicatore di `E` è esattamente il moltiplicatore di `K_e`.

Fang 2008 lo fa così su un telaio in c.a. [V]: parametro = modulo di Young del calcestruzzo, con
fattore di correzione adimensionale «in order to avoid the different orders of different parameters
in their magnitudes»; quattro sottostrutture al primo giro, poi raffinamento della sola sottostruttura
sospetta in tre. Durmazgezer 2019 [V, abstract] lo fa su un telaio a portale a mezza scala con
martinetto: «Damage identification results are presented in terms of stiffness reduction factors
assigned to the column(s) bottom and beam ends» — cioè non un moltiplicatore per asta intera, ma
**per le zone di estremità**, che è dove le cerniere si formano.

**(b) Funzione di danno.** Simoen §2.3 [V]: «the variation of the parameter values along the
structure can be described by a function (e.g. a linear or quadratic interpolation function) which is
characterized by only a few parameters». Fang 2008 [V] propone una funzione di danno bidimensionale
proprio per questo, «resulting in a considerable improvement of the optimization performance».
[INF] Per un telaio piano con quattro membrature è sovradimensionata: le sottostrutture di estremità
fanno lo stesso lavoro con meno codice.

**(c) Cerniera o molla discreta.** Sinha, Friswell, Edwards 2002 §1 e §2.1 [V] confrontano le tre
opzioni. Sulla molla rotazionale, verbatim: «Another simple approach models the crack using a pinned
connection and a rotary spring. However, this spring must be introduced at a node and estimating the
crack depth is difficult.» Sull'elemento intero declassato [V]: «An alternative simple approach is to
reduce the stiffness of a whole element. However, the number of elements must increase to obtain good
localization, and estimating the crack depth must be done a posteriori.» La loro proposta è una terza
via, la **riduzione triangolare** di `EI` su una lunghezza efficace attorno alla fessura, che «has the
advantage that it involves the crack location and depth directly».

E il commento che chiude la questione per NOVA, Sinha §1 [V]: modelli 2D/3D dettagliati della fessura
«produce detailed and accurate FE models but are a complicated and computational intensive approach
[…] Furthermore, the FE models will contain modelling errors, the data will include measurement
errors, and the use of low-frequency vibration will tend to average out localized effects. The result
is that these very detailed models do not substantially improve the results from crack detection and
location algorithms.»

### Quanti parametri, in concreto

Fang 2008 §5.1.1 [V] conta i suoi residui: nove frequenze e 90 componenti di forma (6 modi × 15 punti
misurati) = **99 residui contro 4 parametri** al primo passo, poi 4 nuovi al secondo. Rapporto
`q/p ≈ 25`.

[INF] Applicato a MURO 1: con `N_m` modi accoppiati e `N_o` canali di accelerometro,
`q = N_m · (1 + N_o)`. Con 3 modi e 6 canali monoassiali, `q = 21`; con 4 modi e 8 canali, `q = 36`.
Rispettare `q > p` con margine (diciamo `q ≥ 5 p`, che è già cinque volte più lasco di Fang) dà
**`p ≤ 4` con 3 modi e 6 canali, `p ≤ 7` con 4 modi e 8 canali**. Un telaio a portale ha quattro
membrature: quattro moltiplicatori per asta ci stanno; otto zone di estremità (due per asta) non ci
stanno senza regolarizzazione forte, e vanno prese al secondo passo di raffinamento sulla sola zona
sospetta, come fa Fang.

### Cosa c'entrano `Danno` e `Riduzione` di NOVA

Su questa domanda il brief chiede una risposta secca. Eccola.

- **`Danno.fattore_E` è il parametro giusto.** È esattamente il moltiplicatore di rigidezza per asta
  della famiglia (a), è già per asta, è già adimensionale e limitato a `(0, 1]`
  (`nova/modello.py:91-94`) [V], ed è il fattore di correzione che Fang e Mottershead raccomandano.
  Manca solo una cosa: **oggi non lo legge nessuno** — `grep -rn danno nova/ static/` rende la sola
  dichiarazione `modello.py:105` [M]. Cablarlo in `deck.py` è il prerequisito di #43 e #44.
- **`Danno.fattore_fc` è invisibile alla modale.** La resistenza a compressione non entra nella
  matrice di rigidezza di un'analisi modale lineare: `eigen` usa la rigidezza tangente, e per una
  sezione scarica quella dipende da `E` (o dalla pendenza iniziale del legame), non da `f_c`. [INF]
  Un aggiornamento che mettesse `fattore_fc` fra le incognite avrebbe una colonna **nulla** nella
  matrice di sensitività — il caso (1) di Simoen §2.3, quello da evitare. `fattore_fc` va tenuto (per
  la pushover, dove conta), ma **fuori** dal vettore dei parametri dell'aggiornamento modale, o legato
  a `fattore_E` da una relazione dichiarata invece che stimato.
- **`Riduzione` non è un'incognita: è un dato.** Il glossario (`CONTEXT.md:55-60`) la definisce come
  millimetri **misurati** di copriferro espulso [V], e il codice la usa per tagliare il contorno di
  calcestruzzo (`nova/deck.py:495`, `nova/legami.py:82-96`) [V]. Cambia `K` e `M` insieme, e in modo
  non lineare. [INF] Entra come ingresso fisso dello stato, non fra i parametri stimati; e siccome
  cambia anche la massa, va applicata **prima** di calcolare le sensitività, non durante.

Manca invece un posto dove mettere il moltiplicatore **per tratto** (base del pilastro, estremità
della trave), che è ciò che Durmazgezer usa. [INF] Le vie sono due — un `Danno` per asta più una zona
dichiarata, oppure spezzare l'asta in tratti — ed è una decisione di modello dati, cioè di #43: qui
la segnalo, non la prendo.

## 5. Che cosa NOVA ha già, e che cosa manca

| pezzo | stato |
|---|---|
| corsa modale con frequenze, masse partecipanti e forme per nodo | **c'è** — `nova/modale.py:leggi()`, forme in `{id_nodo: [x, y, z]}` a `:89` [V] |
| soglia NTC di massa partecipante 0,85 | **c'è** — `nova/modale.py:32` [V] |
| ripiego del solutore agli autovalori quando Arnoldi fallisce (`eigen -fullGenLapack`) | **c'è** — `nova/deck.py:1057-1061` [V]; conta, perché un ciclo di aggiornamento chiama `eigen` centinaia di volte |
| `Danno` per asta nello schema | **dichiarato, inerte** — `nova/modello.py:91-93,105`; nessun lettore [M] |
| `Riduzione` per sezione | **cablata** — `deck.py`, `legami.py` [V] |
| serie degli stati di danno in un modello | **assente** — un `.nova.json` descrive un solo stato; è la domanda di #43 |
| modi **sperimentali** nel modello dati | **assenti** [V] |
| MAC, accoppiamento, residui, ottimizzatore | **assenti** [V] |
| `numpy` disponibile | **sì**, dipendenza dichiarata (`pyproject.toml`) [V]; `scipy` **no** [V] |
| dati sperimentali dei cinque stati | **non nel repo** [V] — sono il ticket #40 |

## 6. Validazione

### Il doppio passo, che non è opzionale

Sia Fang 2008 sia Durmazgezer 2019 fanno la stessa cosa, indipendentemente.

Durmazgezer 2019 [V, abstract]: «Damage identification is performed in two steps: (1) The initial
numerical model is updated to obtain a reference model using the modal parameters corresponding to
the undamaged frame and (2) the reference model is updated for increasing damage levels using the
modal parameters corresponding to these levels to identify existence of damage, its location and
extent.»

Fang 2008 §5.1.3 [V] mostra **perché**: aggiornando allo stato integro, tre sottostrutture su quattro
vedono il modulo **salire** (l'armatura irrigidisce, il modello nominale la ignora) e quella del nodo
scendere del 12 % («when casting, the concrete in the joint regions was not so compact»). Se quei
–12 % e quei +x % non si assorbono nello stato di riferimento, finiscono nel danno.

[INF] Per NOVA questo significa che lo **stato 0** non è «il modello nominale»: è un modello
aggiornato, con i suoi moltiplicatori, che diventa il denominatore di tutti gli altri. Il danno è
sempre `θ_stato / θ_riferimento`, mai `θ_stato / 1`.

### Leave-one-out sugli stati

Il brief lo chiede, e va detto con onestà da dove viene: **nessuna delle fonti lette valida così**.
Fang e Durmazgezer calibrano ogni stato per conto suo e confrontano con l'ispezione visiva; nessuno
dei due prevede lo stato successivo. [NON TROVATO] una fonte primaria che faccia leave-one-out sugli
stati di danno di un telaio in c.a.

[INF] La proposta, e va segnata come proposta: calibrare la **legge** che lega i parametri al
progredire del danno (per esempio i moltiplicatori dei quattro tratti sugli stati 0…3) e usarla per
**prevedere** frequenze e forme dello stato 4, confrontandole con la misura tenuta da parte. È il solo
controllo che distingue un aggiornamento che ha capito la struttura da uno che ha interpolato il
rumore — che è precisamente il rischio dei sei pattern di Simoen fig. 2. Con cinque stati si possono
fare cinque giri (uno per stato tenuto fuori) e riportare l'errore di previsione su `f` e il MAC.
Costo: cinque volte l'aggiornamento, cioè decine di minuti [INF, dal tempo misurato in §2.1].

Nota importante da non confondere: il *leave-one-out* della letteratura sulla regolarizzazione (la
GCV di Hansen [V]) sceglie `λ` lasciando fuori un **dato**, non uno **stato**. Sono due controlli
diversi e servono entrambi.

### Ciò che va riportato accanto al risultato

[INF, dalle pratiche di Fang tabelle 1-2 e Simoen tabella 1, entrambe [V]]: per ogni stato, frequenze
sperimentali e calcolate prima e dopo con lo scarto percentuale, i MAC prima e dopo, i parametri
aggiornati con il loro rapporto sullo stato di riferimento, e — se si passa dalla lettura bayesiana
di §2.3 — la deviazione standard a posteriori di ciascun parametro. Un numero di danno senza barra
d'errore, su un problema mal posto, è un numero che non porta il suo contraddittore.

## 7. Librerie Python e licenze

Regola verificata prima di tutto: NOVA è **MIT** (`pyproject.toml`, `license = "MIT"`) [V] e oggi
dipende da `pydantic`, `numpy`, `pyyaml`, `fastapi`, `uvicorn` [V]. Una libreria GPL qui non entra.

| libreria | a che serve qui | licenza | verdetto |
|---|---|---|---|
| **`numpy`** ≥ 1,26 | `lstsq`/`solve` per l'eq. (21), MAC, differenze finite, curva L | BSD-3-Clause (già dipendenza) | **basta per tutto il nucleo** [INF] |
| **`scipy`** | `optimize.least_squares` (Trust Region Reflective, come il trust region di Fang [V]); `io.loadmat` per i `.mat` | BSD-3-Clause, testo verbatim in [`fonti/licenza-scipy.md`](fonti/licenza-scipy.md) [V] | **dipendenza nuova**: sì solo se il ciclo scritto a mano non converge, o se arrivano `.mat` |
| **`pyuff`** (openmodal) | leggere/scrivere UFF data set 15, 55, 58, 58b, 82, 151, 164, 1858, 2400, 2411, 2412, 2414, 2420, 2429, 2467 (README verbatim [V]) | **MIT**, [`fonti/licenza-pyuff.md`](fonti/licenza-pyuff.md) [V] | **condizionata**: solo se il laboratorio esporta davvero `.unv`/`.uff` |
| **`pyOMA2`** | identificazione modale (SSI, FDD) dalle storie temporali; Pasca e Margoni 2025, JOSS 10(115):7656 | **MIT**, [`fonti/licenza-pyoma2.md`](fonti/licenza-pyoma2.md) [V] | **fuori perimetro**: sta a monte, NOVA riceve i modi già identificati |
| `UQpy` | quantificazione dell'incertezza | MIT ([raw LICENSE](https://raw.githubusercontent.com/SURGroup/UQpy/master/LICENSE) [V]) | non serve al primo giro |
| `PyMC` | inferenza bayesiana con MCMC | Apache-2.0 ([raw LICENSE](https://raw.githubusercontent.com/pymc-devs/pymc/main/LICENSE) [V]) | non serve al primo giro; §2.3 dà l'incertezza senza campionare |
| `emcee` | campionatore | MIT ([raw LICENSE](https://raw.githubusercontent.com/dfm/emcee/main/LICENSE) [V]) | idem |
| `quoFEM` (NHERI SimCenter) | calibrazione bayesiana **di modelli OpenSees**, con interfaccia | BSD-3, «Copyright (c) 2016-2017, The Regents of the University of California» ([raw LICENSE](https://raw.githubusercontent.com/NHERI-SimCenter/quoFEM/master/LICENSE) [V]) | è un'applicazione desktop a sé, non una libreria da incorporare; utile come **contraddittore** su un caso di prova |
| `opstool` | utilità OpenSees | **GPL-3.0**, già accertato in [`01-opensees-integrazione.md`](01-opensees-integrazione.md) | **escluso**, incompatibile con MIT |

Non ho trovato una libreria Python **di model updating strutturale** matura, con licenza permissiva e
manutenuta, da usare come nucleo: quello che c'è sono framework di UQ generici (UQpy, PyMC) e
applicazioni (quoFEM). [NON TROVATO] un equivalente Python del `FEMtools`/`Update` commerciale.
[INF] È coerente con il fatto che l'algoritmo, ridotto all'osso, è l'eq. (21) di Mottershead: una
decina di righe di `numpy` più il ciclo che chiama il solutore.

Un lavoro recente accoppia OpenSeesPy e PyMC per l'aggiornamento bayesiano — «Integrating Bayesian
Inference into Structural Parameter Estimation: A Python-Based Approach Using OpenSeesPy and PyMC»,
*Infrastructures* 11(8):291 — ma **non l'ho letto**: MDPI risponde 403 a `curl` con qualunque
user-agent [NON TROVATO: `https://www.mdpi.com/2412-3811/11/8/291`]. Lo segnalo come pista, non come
appoggio.

## 8. Formati dei dati modali sperimentali

### UFF / UNV: due data set diversi, e la confusione è comune

Il brief nomina «UFF/UNV 58». Le specifiche primarie dicono che **58 non è il data set dei modi**.

- **Data set 58 — «Function at Nodal DOF»**, `Status: Current` [V, [`fonti/uff-dataset-58-function-at-nodal-dof.md`](fonti/uff-dataset-58-function-at-nodal-dof.md)].
  Porta **funzioni** su un grado di libertà: il campo «Function Type» del record 6 elenca
  `1 - Time Response`, `2 - Auto Spectrum`, `4 - Frequency Response Function`, `9 - PSD`,
  `22 - Eigenvalue`, `23 - Eigenvector` [V]. È il formato delle **misure grezze e delle FRF**, cioè
  ciò che sta a monte dell'identificazione modale.
- **Data set 55 — «Data at Nodes»**, `Status: **Obsolete**`, «This dataset is written and read by
  I-DEAS Test» [V, [`fonti/uff-dataset-55-data-at-nodes.md`](fonti/uff-dataset-55-data-at-nodes.md)].
  È il formato dei **risultati modali**: con `Analysis Type = 2, Normal Mode`, il record 8 porta in
  ordine `Frequency (Hertz)`, `Modal Mass`, `Modal Viscous Damping Ratio`,
  `Modal Hysteretic Damping Ratio` [V], e i record successivi le componenti nodali (3 o 6 gradi,
  secondo il campo «Data Characteristic»).

«Obsolete» nella specifica **non** significa in disuso nei laboratori: ARTeMIS Modal, il programma di
analisi modale operazionale più diffuso, documenta il 55 così [V,
[`fonti/artemis-uff-55.md`](fonti/artemis-uff-55.md)]: «This is the Universal File Format data set for
Data at Nodes. […] In ARTeMIS Extractor it is used for export of modal results.» Contraddizione
registrata come tale: la specifica UC-SDRL (rev. 07-Mar-1997) lo marca obsoleto, il produttore nel
2026 lo usa per esportare. Vale il produttore per la pratica, la specifica per il parsing.

### Le altre strade

- **CSV / testo.** Ogni catena di laboratorio lo produce. Nessuna specifica, nessuna semantica: la
  corrispondenza sensore → nodo, la direzione e le unità stanno fuori dal file [INF].
- **`.mat`.** Comodissimo per chi lavora in MATLAB; per NOVA costa `scipy.io.loadmat`, cioè una
  dipendenza nuova per un formato che porta la stessa informazione del CSV [INF].
- **Formato interno NOVA.** `nova/modale.py:89` scrive già `{"forma": {id_nodo: [x, y, z]}}` accanto
  a frequenza e masse [V]. [INF] Il formato dei modi **misurati** dovrebbe essere il medesimo più tre
  cose che il calcolo non ha: lo smorzamento identificato, la mappa canale → (nodo, direzione), e
  l'origine (data della prova, strumento, protocollo del martinetto) — quest'ultima è la stessa
  disciplina di `origine.nota` già usata altrove nel modello.

[NON TROVATO] Quale programma usi il laboratorio di Mario e in che formato consegni: la domanda è
in §10 e va posta a lui, non dedotta.

---

## 9. Raccomandazione per NOVA

Non è una decisione: è ciò che le fonti lette sostengono. La scelta resta all'autore.

**Parametrizzazione.** Moltiplicatori adimensionali di rigidezza applicati al calcestruzzo, uno per
**tratto**, non per asta intera: base dei pilastri ed estremità della trave, come Durmazgezer [V];
`Danno.fattore_E` è già la forma giusta del parametro, va solo cablato e reso applicabile a un tratto.
`fattore_fc` **fuori** dal vettore dei parametri (colonna nulla nella sensitività, §4). `Riduzione`
ingresso fisso, non incognita. Al primo passo pochi parametri grossolani (una zona per membratura),
raffinamento della sola zona sospetta al secondo passo, come Fang [V]. Tetto: `p ≤ N_m(1+N_o)/5`
[INF, da `q > p` di Mottershead [V]].

**Funzione obiettivo.** Simoen eq. (14): residui su `λ = ω²` normalizzati su `λ̄²`, più residui di
forma sui **soli gradi strumentati** (matrice di selezione `L`), scalati con `γ_r` ai minimi quadrati
perché i modi OMA non sono normalizzati a massa; pesi `a_r = b_r = 1` all'inizio, esposti come campo
del modello. MAC per il solo accoppiamento, con il criterio combinato `1 − MAC + |1 − λ_i/λ̄_j|`, e
accoppiamento congelato dentro l'iterazione con registrazione di ogni ricalcolo.

**Metodo.** Gauss-Newton regolarizzato alla Tichonov con il peso di Link, eq. (21) di Mottershead:
sensitività alle differenze finite in avanti (il solutore è fuori processo, le derivate analitiche
chiederebbero `K_e` che NOVA non ha), `λ²` scelto con la curva L alla prima iterazione e tenuto fisso,
partendo da `λ² = 0,05` [V]. **Nessuna dipendenza nuova**: `numpy` basta, l'algoritmo è la soluzione
di un sistema `p × p` per iterazione. `scipy.optimize.least_squares` è il piano B, non il piano A. Il
costo misurato dice che si può: **≈ 1 s a corsa modale su MURO 1** [M]. La lettura bayesiana viene
dopo e quasi gratis (§2.3): l'inverso dell'Hessiano nel punto di minimo dà la covarianza a posteriori,
cioè la barra d'errore su ogni moltiplicatore, senza MCMC e senza PyMC.

**Validazione.** (1) Congelare la discretizzazione — su MURO 1 il passaggio da `suddivisioni: 1` a
`4` sposta il secondo modo del 23 % [V], sei volte l'effetto del danno di Fang. (2) Stato 0 come
**modello di riferimento aggiornato**, non nominale: tutti i danni si leggono rispetto a lui [V].
(3) Leave-one-out sugli stati: calibrare sugli stati tenuti dentro, prevedere quello tenuto fuori,
riportare l'errore su `f` e il MAC — **proposta [INF], nessuna fonte letta la usa**. (4) Ogni stato
riporta frequenze prima/dopo con scarto, MAC prima/dopo, parametri e loro rapporto sul riferimento, e
la deviazione standard a posteriori.

**Librerie.** `numpy` (già presente) per il nucleo; `scipy` (BSD-3) solo se serve l'ottimizzatore
pronto o i `.mat`; `pyuff` (MIT) solo se il laboratorio esporta `.unv`; `pyOMA2` (MIT) fuori
perimetro; `opstool` **escluso** (GPL-3.0 contro MIT). Nessuna libreria di model updating
strutturale da incorporare [NON TROVATO].

**Formato dei dati modali.** Ingresso nativo JSON con la stessa forma che `nova/modale.py` già
produce, più smorzamento identificato, mappa canale → (nodo, direzione) e origine della prova;
importatore UFF **55** (non 58) solo quando si sa che serve. Non inventare un formato prima di
sapere che cosa esce dal laboratorio.

## 10. Domande aperte per l'autore

1. **Che cosa esce dal laboratorio?** Programma, formato, e soprattutto: frequenze e forme già
   identificate, oppure storie temporali da identificare? Cambia se serve `pyuff`, se serve `pyOMA2`,
   e se le forme sono normalizzabili a massa (forzante registrata) o no.
2. **Quanti canali e dove?** Il numero di sensori fissa il tetto dei parametri (`p ≤ q/5`). Con tre
   canali si può stimare al più un parametro per membratura; con otto si arriva alle zone di
   estremità.
3. **Il moltiplicatore va per asta o per tratto?** Il tratto è ciò che la letteratura sui telai usa,
   ma richiede un posto nel modello dati che oggi non c'è: `Danno` più una zona dichiarata, o l'asta
   spezzata in tratti. È una decisione di #43.
4. **`fattore_fc` che fine fa?** Resta un dato dichiarato dal rilievo, o si lega a `fattore_E` con
   una relazione scritta? Non può essere stimato dai modi.
5. **La serie degli stati sta in un file o in cinque?** Un `.nova.json` oggi descrive un solo stato.
   Cinque file gemelli sono cinque impronte da tenere allineate; un file con una serie cambia lo
   schema. Anche questa è #43.
6. **Il leave-one-out sugli stati vale il suo costo?** Cinque aggiornamenti invece di uno, per un
   controllo che nessuna delle fonti lette esegue. Io lo raccomando; la spesa è di chi decide.
7. **Serve la barra d'errore in interfaccia?** L'incertezza a posteriori si ottiene quasi gratis, ma
   mostrarla significa una colonna in più nella tabella sperimentale/previsto/aggiornato di #44.

## 11. Riferimenti

Ogni riferimento porta i tre campi: **URL** · **perché conta qui** · **cosa se ne prende**.

- **URL** <https://lirias.kuleuven.be/server/api/core/bitstreams/8b82a5c7-cf19-490c-a3f3-a7a29a1549c0/content> · [V] · copia in [`fonti/simoen-2015-uncertainty-model-updating.md`](fonti/simoen-2015-uncertainty-model-updating.md)
  **perché conta qui** è la rassegna di riferimento sul model updating per la valutazione del danno,
  e il suo esempio conduttore è una **trave in c.a. danneggiata in laboratorio con carico statico
  controllato** — la situazione di MURO 1 meno il telaio.
  **cosa se ne prende** la funzione costo eq. (14) con residui su autovalori e forme; la matrice di
  selezione `L` dei gradi strumentati; il fattore di scala `γ_r` ai minimi quadrati; la definizione
  del MAC eq. (12) e il criterio di accoppiamento eq. (13); le due regole contro il mal
  condizionamento (parametri fisicamente rilevanti, sottostrutture invece di elementi); la figura 2
  dei sei pattern indistinguibili; l'identità MAP = minimi quadrati regolarizzati §4.5.1 e la
  covarianza a posteriori eq. (30) e (32).

- **URL** <http://michael.friswell.com/PDF_Files/J188.pdf> (versione pubblicata: MSSP 25:2275-2296, doi:10.1016/j.ymssp.2010.10.012) · [V] · copia in [`fonti/mottershead-2011-sensitivity-tutorial.md`](fonti/mottershead-2011-sensitivity-tutorial.md)
  **perché conta qui** è il tutorial canonico del metodo che questa ricerca raccomanda, scritto dai
  tre autori che lo hanno costruito, e ospitato dal sito personale di uno di loro.
  **cosa se ne prende** l'iterazione di Gauss-Newton eq. (1)-(5) e (17); la sensitività analitica
  degli autovalori eq. (6); la regola dimensionale `q > p` scritta a lettere; la regolarizzazione
  eq. (18)-(21) col peso di Link eq. (19)-(20) e l'intervallo `λ² ∈ [0; 0,3]` con `0,05` come valore
  di lavoro; la curva L e il consiglio di fissare `λ` alla prima iterazione; i moltiplicatori di
  matrice per elemento o sottostruttura eq. (23)-(25) e il motivo per raggruppare elementi a
  sensitività simile; l'avvertimento §7.1 che i modi bassi non vedono il danno locale piccolo.

- **URL** <https://oa.upm.es/3038/2/INVE_MEM_2008_61505.pdf> (versione pubblicata: JSV 313:544-559, doi:10.1016/j.jsv.2007.11.057) · [V] · copia in [`fonti/fang-2008-telaio-ca-damage-parameterization.md`](fonti/fang-2008-telaio-ca-damage-parameterization.md)
  **perché conta qui** è l'unico caso di cui ho letto il testo pieno che sia **un telaio in c.a. di
  laboratorio** aggiornato da frequenze e forme, con i numeri sperimentali stampati.
  **cosa se ne prende** la funzione obiettivo con residui su `λ` e forme normalizzate a massa; il
  fattore di correzione adimensionale sul modulo di Young; il conteggio dei residui contro i
  parametri (99 contro 4); la procedura a tre passi riferimento → grossolana → raffinata; i numeri di
  frequenza integro/danneggiato (30,16 → 29,1 Hz sul primo modo) contro il 38 % di riduzione di
  rigidezza identificata; il fatto che l'aggiornamento allo stato di riferimento **alza** il modulo
  dove c'è armatura e lo **abbassa** del 12 % al nodo mal costipato.

- **URL** <https://link.springer.com/article/10.1007/s10518-019-00690-5> · [V] limitato all'abstract, testo pieno [NON TROVATO] (paywall; il PDF `link.springer.com/content/pdf/…` rende HTML) · copia in [`fonti/durmazgezer-2019-telaio-ca-livelli-di-danno.md`](fonti/durmazgezer-2019-telaio-ca-livelli-di-danno.md)
  **perché conta qui** è il caso sperimentale più vicino in assoluto: telaio a portale in c.a. a
  mezza scala, drift crescenti imposti da **martinetto in controllo di spostamento**, identificazione
  a ogni livello di danno.
  **cosa se ne prende** lo schema a due passi (modello di riferimento sull'integro, poi ogni livello
  di danno contro il riferimento) e la parametrizzazione in **fattori di riduzione di rigidezza
  assegnati alle basi dei pilastri e alle estremità della trave**, con l'affermazione che i risultati
  concordano con l'ispezione visiva. Le formule e i numeri non li prendo: non ho letto il testo.

- **URL** <http://michael.friswell.com/PDF_Files/J77.pdf> (versione pubblicata: JSV 251(1):13-38, doi:10.1006/jsvi.2001.3978) · [V] · copia in [`fonti/sinha-2002-modelli-di-fessura-in-travi.md`](fonti/sinha-2002-modelli-di-fessura-in-travi.md)
  **perché conta qui** è la fonte che mette a confronto, con parole degli autori, le tre
  parametrizzazioni che il ticket #33 chiede di soppesare — elemento intero declassato, molla
  discreta, degrado distribuito.
  **cosa se ne prende** i limiti della molla rotazionale (va su un nodo, la profondità della fessura
  non si stima); i limiti dell'elemento intero (serve infittire per localizzare, la profondità si
  ricava dopo); e l'argomento che i modelli di fessura molto dettagliati non migliorano il risultato
  perché la vibrazione a bassa frequenza media gli effetti locali.

- **URL** <https://www.sintef.no/globalassets/project/evitameeting/2005/lcurve.pdf> · [V] · copia in [`fonti/hansen-curva-l.md`](fonti/hansen-curva-l.md)
  **perché conta qui** la regolarizzazione ha un solo parametro libero, `λ`, e sceglierlo a occhio
  significa scegliere il danno a occhio.
  **cosa se ne prende** la definizione della curva L come diagramma log-log fra norma della soluzione
  regolarizzata e norma del residuo; il confronto con la cross-validation generalizzata (la GCV
  fallisce a volte, ma quando funziona dà un valore migliore); e i due limiti dichiarati della curva
  L, che impediscono di usarla come oracolo cieco.

- **URL** <https://www.ceas3.uc.edu/sdrluff/files/55.asc> · [V] · copia in [`fonti/uff-dataset-55-data-at-nodes.md`](fonti/uff-dataset-55-data-at-nodes.md)
  **perché conta qui** è la specifica primaria del data set che i programmi di analisi modale usano
  per esportare i **risultati** modali, che è il dato che l'aggiornamento consuma.
  **cosa se ne prende** `Name: Data at Nodes`, `Status: Obsolete`; il record 6 con `Analysis Type = 2
  Normal Mode` e `Data Characteristic` a 3 o 6 gradi; il record 8 che porta, in quest'ordine,
  frequenza in Hz, massa modale, smorzamento viscoso e smorzamento isteretico.

- **URL** <https://www.ceas3.uc.edu/sdrluff/files/58.asc> · [V] · copia in [`fonti/uff-dataset-58-function-at-nodal-dof.md`](fonti/uff-dataset-58-function-at-nodal-dof.md)
  **perché conta qui** il brief chiamava «UFF/UNV 58» il formato dei modi: la specifica dice che il
  58 è un'altra cosa, e la distinzione decide che importatore scrivere.
  **cosa se ne prende** `Name: Function at Nodal DOF`, `Status: Current`; l'elenco dei tipi di
  funzione del record 6 (`1 Time Response`, `4 Frequency Response Function`, `22 Eigenvalue`,
  `23 Eigenvector`), che è ciò che rende il 58 il formato delle misure e delle FRF, non dei risultati
  modali.

- **URL** <https://www.svibs.com/resources/ARTeMIS_Modal_Help_v7/UFF%20Data%20Set%20Number%2055.html> · [V] · copia in [`fonti/artemis-uff-55.md`](fonti/artemis-uff-55.md)
  **perché conta qui** è documentazione del produttore del programma OMA più usato nei laboratori, e
  risponde alla domanda «cosa esportano i software di laboratorio» meglio di qualunque rassegna.
  **cosa se ne prende** la frase «In ARTeMIS Extractor it is used for export of modal results», che
  contraddice lo `Status: Obsolete` della specifica UC-SDRL e fissa il 55 come formato d'ingresso
  realistico.

- **URL** <https://raw.githubusercontent.com/openmodal/pyuff/master/LICENSE> e <https://raw.githubusercontent.com/openmodal/pyuff/master/README.rst> · [V] · copia in [`fonti/licenza-pyuff.md`](fonti/licenza-pyuff.md)
  **perché conta qui** se serve leggere UFF, questa è la libreria; e NOVA è MIT, quindi la licenza è
  una condizione d'ingresso, non un dettaglio.
  **cosa se ne prende** «MIT License» verbatim dal file, compatibile; e l'elenco dei data set
  supportati dal README, che include **55** e **58** — cioè copre entrambi i casi della §8.

- **URL** <https://raw.githubusercontent.com/dagghe/PyOMA2/main/LICENSE> (progetto: doi:10.21105/joss.07656) · [V] · copia in [`fonti/licenza-pyoma2.md`](fonti/licenza-pyoma2.md)
  **perché conta qui** è lo strumento che produrrebbe frequenze e forme dalle storie temporali, se il
  laboratorio consegnasse quelle invece dei modi.
  **cosa se ne prende** «MIT License» verbatim; e il fatto che il perimetro della libreria è
  l'identificazione modale (SSI, FDD, incertezza sui parametri), cioè **a monte** di NOVA: non è un
  candidato per il nucleo dell'aggiornamento.

- **URL** <https://raw.githubusercontent.com/scipy/scipy/main/LICENSE.txt> · [V] · copia in [`fonti/licenza-scipy.md`](fonti/licenza-scipy.md)
  **perché conta qui** è la sola dipendenza nuova che l'aggiornamento potrebbe giustificare
  (`optimize.least_squares`, `io.loadmat`), e il costo va deciso sapendo la licenza.
  **cosa se ne prende** il testo BSD a tre clausole verbatim, compatibile con MIT; e la conferma che
  **oggi scipy non è fra le dipendenze di NOVA** (`pyproject.toml`), quindi introdurla è una
  decisione, non un dato di fatto.

- **URL** <https://raw.githubusercontent.com/NHERI-SimCenter/quoFEM/master/LICENSE> · [V]
  **perché conta qui** è l'unico strumento libero maturo che fa calibrazione bayesiana **di modelli
  OpenSees**, e quindi è il contraddittore naturale di qualunque risultato NOVA produca.
  **cosa se ne prende** la licenza BSD «Copyright (c) 2016-2017, The Regents of the University of
  California»; e la collocazione: applicazione desktop a sé, non libreria da incorporare.

- **URL** <https://www.mdpi.com/2412-3811/11/8/291> · **[NON TROVATO]** (MDPI risponde 403 a `curl`
  con qualunque user-agent; nessun mirror trovato)
  **perché conta qui** accoppia esattamente OpenSeesPy e PyMC per l'aggiornamento bayesiano, che è la
  variante §2.3 di questa raccomandazione.
  **cosa se ne prende** nulla di sostanziale: solo l'esistenza della pista, da riaprire se e quando
  la §2.3 diventa lavoro.

- **URL** <https://ascelibrary.org/doi/10.1061/(ASCE)0733-9399(2007)133:7(816)> (Ching e Chen 2007, TMCMC) · **[NON TROVATO]** (a pagamento)
  **perché conta qui** è il campionatore standard per l'aggiornamento bayesiano quando la posteriore
  è multimodale, cioè il caso dei sei pattern di Simoen.
  **cosa se ne prende** nulla di verificato: citato per completezza della mappa dei metodi, non usato
  per nessuna affermazione di questo documento.

- **URL** <https://www.sandv.com/downloads/0308alle.pdf> (Allemang 2003, Sound and Vibration 37:14-23) · **[NON TROVATO]** (l'URL rende una pagina HTML, non il PDF; ResearchGate risponde 403)
  **perché conta qui** è l'articolo d'origine del MAC e dei suoi abusi, che è precisamente il rischio
  quando i sensori sono pochi.
  **cosa se ne prende** nulla di verbatim: la definizione del MAC usata in questo documento è quella
  di Simoen eq. (12), letta.

### Fonti interne al repo, citate per riga

- `docs/ricerca/README.md:17` — convenzione dei tag e della virgola decimale (il brief la dava a `:33`).
- `CONTEXT.md:55-60`, `:91-96` — glossario di **Riduzione** e **Danno**.
- `nova/modello.py:91-94`, `:105` — `Danno(fattore_E, fattore_fc, nota)` e `Asta.danno`.
- `nova/modale.py:85-89` — la forma per nodo, `{id_nodo: [x, y, z]}`; `:32` — `SOGLIA_MASSA = 0.85`.
- `nova/deck.py:495`, `:1057-1061`; `nova/legami.py:82-96` — `Riduzione` cablata; ripiego
  `eigen -fullGenLapack`.
- `meshrec/core/opensees.py:499-506` — registratore `eigen k` sui gradi 1 2 3 e
  `modalProperties -unorm`.
- `docs/caso-studio/README.md:149-151`, `:159-160` — frequenze del MURO 1 con `suddivisioni` 4 e 1.
- `pyproject.toml` — licenza MIT e dipendenze.

---

**Nota su `docs/ricerca/index.md`.** Il file non esiste ancora; crearlo è il ticket
[#39](https://github.com/maeurong/NOVA/issues/39), bloccato da questo e da altre cinque ricerche.
Non l'ho creato per non fissarne il disegno con una riga sola. La riga che gli spetta, quando
qualcuno lo scriverà:

> `10-model-updating.md` — quali metodi di model updating funzionano con poche frequenze e forme
> modali su pochi sensori, per un telaio in c.a. a stati di danno crescenti · chiusa · 08/09/2026
