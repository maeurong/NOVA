# 13 — Il solido lineare in CalculiX pilotato da NOVA

Ricerca del ticket [#36](https://github.com/maeurong/NOVA/issues/36) (parte di #31), 08/09/2026.
Domanda: **cosa serve, carta per carta, perché NOVA scriva e legga da sé il deck del solido
invece di lanciare com'è quello di MeshRec.**

Tag come in [`README.md`](README.md): **[V]** verificato su fonte primaria · **[M]** misurato in
sessione con comando · **[INF]** inferenza · **[NON TROVATO]**. Virgola decimale fuori dalle
citazioni verbatim e dai listati.

## Da dove vengono i numeri

| cosa | valore |
|---|---|
| cartella di lavoro | `/Users/mario/GitHub/NOVA/.claude/worktrees/agent-a25179cf22d9f5a50` (worktree isolato) |
| ramo · HEAD | `research/solido-calculix` · `0b81606` («Merge pull request #27 from maeurong/feat/non-lineare») |
| solutore | `~/.local/bin/ccx` → `~/.local/share/calculix-2.22/bin/ccx`; `ccx -v` → «This is Version 2.22» |
| costruzione del binario | pacchetto conda-forge `calculix-2.22-hf186d59_1`, con `libopenblas` (openmp), `arpack 3.9.1`, `llvm-openmp`; nessuna traccia di MKL/PARDISO |
| macchina | macOS 25.6.0, `arm64`, 6 cpu logiche (2 di prestazione + 4 di efficienza) |
| deck piccolo | `tests/fixture/solido_piccolo/trave.inp`: 315 nodi, 960 `C3D4`, mensola 200 × 100 × 1000 mm, `BASE` a z = 0, `TOP` a z = 1000 |
| deck grande | copia di `~/GitHub/Tesi/meshrec/runs/geoandgeo-lab/wall_model.inp`: 14.103 nodi, 51.913 `C3D4`, quattro passi, `*FREQUENCY 40` |
| documentazione | tarball ufficiale `ccx_2.22.htm.tar.bz2` e sorgente `ccx_2.22.src.tar.bz2`, scaricati oggi; estratti in [`fonti/`](fonti/) |

Le corse di misura sono state fatte in `tmp-ricerca/` dentro il worktree e **non sono
committate** (cartelle di corsa). Gli script che le producono stanno riassunti qui sotto in
forma di comando o di pseudocodice: ognuno gira in meno di un minuto.

Due premesse del brief corrette per strada, senza conseguenze sul compito:

- `leggi_frd` **non** sta in `~/GitHub/Tesi/meshrec/src/meshrec/core/solve.py` — in quel
  checkout `solve.py` non esiste più. Sta in `meshrec/core/solve.py:245-311` **dentro NOVA**,
  che vendorizza MeshRec (`pyproject.toml:23` impacchetta `nova` e `meshrec`).
- `~/GitHub/Tesi` è servito comunque, in sola lettura, per il deck grande.

---

## 1. Promozione C3D4 → C3D10

### 1.1 Perché

Il manuale non lascia margini sul tetraedro lineare [V]:

> This element is included for completeness, however, it is not suited for structural
> calculations unless a lot of them are used (the element is too stiff). Please use the
> 10-node tetrahedral element instead.

E sul quadratico:

> The element behaves very well and is a good general purpose element […] especially
> attractive because of the existence of fully automatic tetrahedral meshers.

**Quanto è troppo rigido, misurato** [M]. Stessa mesh, stessi carichi (gravità −z di
9810 mm/s² più una spinta +y di 981 mm/s², E = 31.447 MPa, ν = 0,2), fixture promossa a
`C3D10` con i nodi di lato a metà esatta:

| | nodi | equazioni | tempo | `uy` in sommità |
|---|---|---|---|---|
| `C3D4` | 315 | 900 | 0,06 s | 0,00650 mm |
| `C3D10` | 1.845 | 5.400 | 0,13 s | **0,01193 mm** |

Il lineare dà **il 45,5 % dello spostamento** del quadratico sulla stessa mesh: 1,84 volte più
rigido. Su una mensola tozza con maglio da 50 mm, cioè nel caso più benevolo.

### 1.2 Ordine dei nodi di lato

Il manuale rimanda a una figura (immagine, non testo). L'ordine si legge senza ambiguità dalle
funzioni di forma, `src/shape10tet.f:41-50` del sorgente 2.22 [V]:

```
shp(4, 5)=4.d0*xi*a      shp(4, 8)=4.d0*ze*a
shp(4, 6)=4.d0*xi*et     shp(4, 9)=4.d0*xi*ze
shp(4, 7)=4.d0*et*a      shp(4,10)=4.d0*et*ze
```

con `a = 1 − ξ − η − ζ`. Il nodo 5 è quello che vale 1 a metà fra il nodo 1 (dove `a` = 1) e il
nodo 2 (dove `ξ` = 1), e così via:

| nodo | 5 | 6 | 7 | 8 | 9 | 10 |
|---|---|---|---|---|---|---|
| lato | 1-2 | 2-3 | 1-3 | 1-4 | 2-4 | 3-4 |

È la convenzione Abaqus. Sbagliarla non fa fallire ccx: fa uscire un elemento con jacobiano
storto e tensioni plausibili e sbagliate.

### 1.3 Quota tributaria della gravità: la formula è giusta

`nova/inp.py:23` dice «Su C3D10 sarebbero −V/20 ai vertici e +V/5 ai nodi di lato». **Verificata
sul solutore vero** [M], con un metodo che aggira il fatto che `RF` non riporta la quota di
carico distribuito. Il manuale (`node206.html`) dichiara [V]:

> selecting RF gives you the sum of the reaction forces and the loading forces. This is equal
> to the reaction forces only if the elements belonging to the selected nodes are not loaded by
> a `*DLOAD` card […]

Prima conferma diretta: un solo tetraedro con **tutti** i nodi vincolati e `*DLOAD GRAV` stampa
`RF = 0` su tutti e quattro (`C3D4`) e su tutti e dieci (`C3D10`) i nodi, invece del peso [M].

Da lì la misura «lascia fuori uno»: vincolando tutti i nodi tranne il nodo *j*, la somma delle
`RF` sui vincolati vale −*w_j*, cioè proprio la quota del nodo lasciato libero. Su un tetraedro
di 368.333,33 mm³, ρ = 2,5·10⁻⁹ t/mm³, g = 9810 mm/s², W = 9,033375 N:

| elemento | nodo | quota / W | formula attesa |
|---|---|---|---|
| `C3D4` | 1…4 (vertici) | 0,250000 | V/4 |
| `C3D10` | 1…4 (vertici) | 0,050000 **di verso opposto al carico** | −V/20 |
| `C3D10` | 5…10 (lati) | 0,200000 nel verso del carico | +V/5 |

Somma delle dieci quote = W a 1,1·10⁻⁷ di scarto relativo. La formula è il vettore dei carichi
consistenti ∫N_i dV, e 4·(−1/20) + 6·(1/5) = 1 torna.

Lo stesso conto, con la stessa derivazione e la stessa avvertenza sul segno, è già scritto in
`meshrec/core/solve.py:1091-1157` — e lì è anche già misurato che il termine sbagliato falsava
il verdetto `reazioni` su ogni corsa `C3D10`. Quel codice resta **non riusabile**: `solve.py:1177`
chiama `abaqus.NODI_PER_ELEMENTO`, che in `meshrec/core/abaqus.py` non esiste (verificato:
nessuna occorrenza) e solleva `AttributeError`.

### 1.4 Il volume: la nota in `nova/inp.py` è vera solo a metà

`nova/inp.py:23-24` aggiunge «e il volume del tetraedro a lati dritti non è nemmeno quello
vero». **Falso a lati dritti** [M]. Chiedendo a ccx il proprio volume integrato
(`*EL PRINT, ELSET=…, TOTALS=ONLY` con chiave `EVOL`):

| geometria del `C3D10` | `EVOL` | scarto dal volume dei 4 vertici |
|---|---|---|
| nodi di lato a metà esatta | 368.333,30 mm³ | −9·10⁻⁸ (le cifre stampate) |
| nodo 5 spostato del 5 % del lato | 382.500,00 mm³ | **+3,846 %** |
| nodo 5 spostato del 10 % | 396.666,70 mm³ | +7,692 % |
| nodo 5 spostato del 20 % | 425.000,00 mm³ | +15,385 % |

Con i lati dritti la mappa isoparametrica è affine, lo jacobiano è costante e il volume è
esattamente quello del tetraedro a 4 vertici — stessa cosa sulla fixture intera, dove `EVOL`
vale 2,000000·10⁷ mm³ = 200 × 100 × 1000 sia in `C3D4` sia in `C3D10` [M]. La frase vale invece,
e di parecchio, per la **promozione geometrica**: se i nodi di lato vengono proiettati su una
superficie curva, il volume cambia in modo lineare con lo spostamento. Da correggere nel
commento, o da qualificare con «se i nodi di lato non stanno a metà».

**Conseguenza operativa**: il volume non è più un buon motivo per restare su `C3D4`. Si può
chiedere a ccx (`EVOL`) invece di ricalcolarlo, e `EMAS` dà massa, baricentro e inerzie.
Resta invece dipendente dal tipo di elemento la **quota tributaria**, che è una formula per
elemento e non un'uscita del solutore.

### 1.5 I tre inciampi della promozione

1. **Gli NSET.** I nodi di lato che cadono sulla faccia vincolata vanno aggiunti a `BASE`,
   altrimenti la base è incastrata a scacchiera. Vale per ogni set che entra in `*BOUNDARY`
   e in `*NODE PRINT`.
2. **I carichi nodali non si trasferiscono.** Un `*CLOAD` distribuito a mano sui nodi di
   sommità (com'è nel deck di MeshRec, passo `CARICO_TOP`) è calibrato sul `C3D4`. Sul `C3D10` la
   ripartizione consistente di una pressione uniforme su una faccia dà **zero ai vertici** e
   tutto ai nodi di lato (manuale, `node203.html`, figura 159) [V]. Va sostituito con una
   `*SURFACE` di facce più `*DLOAD` di tipo `P`, e lasciato fare a ccx.
3. **La dimensione.** 315 → 1.845 nodi sulla fixture (×5,9), 900 → 5.400 equazioni (×6). Sul
   deck grande sarebbero circa 85.000 nodi e 255.000 equazioni: da provare prima di prometterlo,
   perché il solutore locale è a singolo thread (§ 3).

---

## 2. Il `.frd`: cosa c'è dentro, e cosa NOVA non legge

### 2.1 Formato, dal sorgente

Il manuale descrive le carte, non il file. Il formato esatto sta in `src/frd.c` e
`src/frdselect.c` [V], e coincide con quello che il file scritto oggi mostra [M]:

```
  100CL  101 1.000000000         315                     0    1           1
 -4  STRESS      6    1                 <- etichetta e numero di componenti
 -5  SXX         1    4    1    1       <- nomi e ruolo delle componenti, in ordine
 -5  SYY … SZZ … SXY … SYZ … SZX
 -1         1-3.78541E-03-3.64695E-03-2.55961E-02-3.77276E-05-7.90340E-04-1.73857E-03
 -3                                     <- chiusura del blocco
```

- record dati: `fprintf(f1,"%3s%10d", " -1", nodo)` e poi un `%12.5E` per componente
  (`frdselect.c:79-104`). Il valore è **castato a `float`**: nel file ci sono sei cifre
  significative, non di più. Un integrale su 20.000 mm² eredita quella precisione;
  nelle misure di §5 pesa meno di 10⁻⁶.
- **sei valori per record.** Dal settimo in poi si va a capo su un record ` -2` seguito da
  dieci spazi (`frdselect.c:106`). `STRESS` ha 6 componenti, quindi ci sta in una riga; ma
  `PSTRESS` (`PHS`, 12 componenti) no — e `leggi_frd` (`meshrec/core/solve.py:289`) considera
  solo le righe che iniziano con ` -1`: su un blocco a più di 6 componenti leggerebbe **metà
  dati senza dirlo**.
- ordine delle componenti di `STRESS`, garantito da `frd.c:1015-1022`:
  **SXX, SYY, SZZ, SXY, SYZ, SZX**.

`leggi_frd` in NOVA legge già tutto questo: è generico sull'etichetta, e il blocco `STRESS`
arriva completo di nodi e sei componenti. Non c'è niente da scrivere per leggerlo.

### 2.2 Le tensioni sono già lì, e NOVA le butta

Il deck di MeshRec chiede `*EL FILE / S, E` in tutti e tre i passi statici
(`tests/fixture/solido_piccolo/trave.inp:1303-1304, 1316-1317, 1350-1351`), quindi il `.frd`
porta `STRESS`, `TOSTRAIN` e `ERROR` per ogni passo [M]. `nova/ccx.py:165` filtra:

```python
if b.grandezza != "DISP" or b.modale or b.passo != passo:
    continue
```

Le tensioni vengono lette dal disco, parsate in `numpy` e scartate.

### 2.3 Nodali contro Gauss

Il manuale è esplicito su cosa siano quei numeri [V], carta `*EL FILE`:

> This option is used to save selected element variables **averaged at the nodal points** in a
> frd file […] Remember that the frd file is node based, so element results are also stored at
> the nodes after extrapolation from the integration points.

e nella sezione sullo stimatore d'errore:

> The standard finite element procedure extrapolates these integration point values to the
> nodes. […] Usually, a node belongs to more than one element. The standard procedure averages
> the stress values obtained from each element to which the node belongs.

Quindi: `*EL FILE` (→ `.frd`) = **nodale, estrapolato e mediato fra elementi**; `*EL PRINT`
(→ `.dat`) = **valori nei punti di Gauss**, elemento per elemento, senza mediare (un punto per
`C3D4`, quattro per `C3D10`). Per il taglio libero servono i nodali: sono già interpolabili con
le funzioni di forma e non richiedono di ricostruire la posizione dei punti di Gauss. Per una
verifica puntuale «quanto vale davvero la tensione in questo elemento» servono i Gauss.

Tre effetti collaterali documentati e misurati:

- **`ERROR` compare da solo.** «Selection of S automatically triggers output of the error
  estimator ERR, unless NOE is selected after S» [V]; il `.frd` della fixture ha infatti un
  blocco `ERROR (STR(%))` per passo che nessuno ha chiesto [M].
- **`ZZS` è il campo migliorato** (Zienkiewicz-Zhu, recupero per patch). Su `C3D10` funziona e
  vale molto (§ 5.4). Su `C3D4` ccx **scrive il blocco `ZZSTR` pieno di zeri** [M]: sedici
  cifre di niente, non un errore, non un avviso. Chi lo integra ottiene 0,0000 N.
  `ZZS` ed `ERR` si escludono a vicenda [V].
- **`*NODE OUTPUT` / `*ELEMENT OUTPUT`** scrivono lo stesso contenuto in un `.frd` **misto
  binario/ASCII** [V]. `leggi_frd` legge il file come ASCII: NOVA deve scrivere `*NODE FILE` e
  `*EL FILE`, mai le due carte `OUTPUT`, e il lettore dovrebbe riconoscere e rifiutare il caso.

### 2.4 Quello che nel `.frd` non c'è

**Von Mises e tensioni principali non ci sono.** ccx scrive il tensore, non i suoi invarianti;
il von Mises delle figure del manuale lo calcola cgx. `PSTRESS` è la coppia
ampiezza/fase della dinamica in frequenza, `MSTRESS` è il massimo su tutti i tempi nelle
simmetrie cicliche: né l'una né l'altra è la tensione principale [V, `frd.c:2301` e `frd.c:2434`].
Si calcolano in NOVA, da SXX…SZX:

```
σ_vm = sqrt( ((σxx-σyy)² + (σyy-σzz)² + (σzz-σxx)²)/2 + 3(σxy² + σyz² + σzx²) )
σ_1 ≥ σ_2 ≥ σ_3 = autovalori di [[σxx,σxy,σzx],[σxy,σyy,σyz],[σzx,σyz,σzz]]
```

Con `numpy.linalg.eigvalsh` sono due righe per l'intera mesh. Per il calcestruzzo servono
soprattutto σ_1 (trazione, contro f_ctm) e σ_3 (compressione, contro f_cd): il von Mises su un
materiale con resistenze diverse a trazione e compressione è un numero da mostrare, non da
verificare.

---

## 3. Thread, e il solutore che c'è davvero

Il manuale elenca sei parallelizzazioni distinte, ognuna con la sua variabile [V]:
`CCX_NPROC_STIFFNESS` (assemblaggio), `CCX_NPROC_RESULTS` (tensioni nei punti di Gauss),
`CCX_NPROC_EQUATION_SOLVER` (SPOOLES multithread), `CCX_NPROC_VIEWFACTOR`, `CCX_NPROC_CFD`,
`CCX_NPROC_BIOTSAVART`; `OMP_NUM_THREADS` fa da valore di riserva per tutte, e
`NUMBER_OF_CPUS` sovrascrive il numero di core rilevato. Per SPOOLES però il manuale mette una
condizione:

> CalculiX CrunchiX must have been compiled with the USE_MT flag activated in the Makefile

**Il binario locale non lo è** [M], e la catena di prove è chiusa:

1. `strings` sul binario elenca `CCX_NPROC_STIFFNESS`, `CCX_NPROC_RESULTS`, `CCX_NPROC_CFD`,
   `CCX_NPROC_VIEWFACTOR`, `CCX_NPROC_BIOTSAVART`, `CCX_NPROC_SENS`,
   `CCX_NPROC_INTERPOLSTATE`, `OMP_NUM_THREADS`, `NUMBER_OF_CPUS` — e **non**
   `CCX_NPROC_EQUATION_SOLVER`.
2. Nel sorgente quella variabile si legge solo dentro `#ifdef USE_MT` (`src/spooles.c:644-706`);
   il ramo `#else` stampa la riga fissa `Using 1 cpu for spooles.` (`spooles.c:717`).
3. Ogni corsa, con qualunque valore di `OMP_NUM_THREADS`, stampa esattamente quella riga.
4. PARDISO e PaStiX non sono linkati: il binario contiene i messaggi
   `*ERROR in linstatic: the PARDISO library is not linked` e l'equivalente per PaStiX, SGI e
   TAUCS. Resta SPOOLES, seriale.

**Tempi sul deck grande** (14.103 nodi, 51.913 `C3D4`, 4 passi, 40 modi; minimo di tre
ripetizioni) [M]:

| | corsa 1 | corsa 2 | corsa 3 | minimo |
|---|---|---|---|---|
| `OMP_NUM_THREADS=1` | 6,60 | 7,05 | 7,53 | **6,60 s** |
| `OMP_NUM_THREADS=2` | 8,14 | 9,63 | 9,12 | 8,14 s |
| `OMP_NUM_THREADS=6` | 8,59 | 8,29 | 8,59 | 8,29 s |

Nessun guadagno: **peggiora**. Con 2 core di prestazione e 4 di efficienza, spalmare
l'assemblaggio su sei thread lo fa finire al ritmo dei core lenti, mentre la fattorizzazione —
che è la parte che conta — resta seriale comunque. `CCX_NPROC_STIFFNESS=6` con
`CCX_NPROC_RESULTS=6` ha dato 13,31 s in una prova singola.

Il manuale dice che PARDISO è «about a factor of two faster than SPOOLES» e che PaStiX su GPU
arriva a 3-8 volte PARDISO [V]: sono strade di ricompilazione, non di configurazione, e oggi
nessuna delle due è disponibile.

**Costo dell'uscita**, sullo stesso deck (minimo di tre) [M]:

| deck | tempo | `.frd` |
|---|---|---|
| con `*EL FILE / S, E` (com'è oggi) | 9,96 s | **155,0 MB** |
| solo `*NODE FILE / U` | 7,87 s | 34,8 MB |

Le tensioni costano quattro volte il file e circa due secondi su dieci. Il manuale offre la via
di mezzo: `*EL FILE, NSET=<insieme>` limita l'uscita ai nodi di un set [V] — cioè, per NOVA, ai
nodi che stanno intorno ai piani di taglio.

---

## 4. `*SECTION PRINT`: cosa dà e dove si ferma

La carta è documentata per intero (`node334.html`) [V] e **misurata** sulla fixture con una
superficie di 16 facce sul piano z = 500 [M]. Uscita nel `.dat`, verbatim:

```
 statistics for surface set TAGLIO and time  0.1000000E+01
   total surface force (fx,fy,fz) and moment about the origin(mx,my,mz)
   -4.233749E-04  1.365077E-04  2.500864E+02  1.259175E+04 -2.514715E+04  3.392706E+00
   center of gravity and mean normal
    1.000000E+02  5.000000E+01  5.000000E+02  0.000000E+00  0.000000E+00 -1.000000E+00
   moment about the center of gravity(mx,my,mz)
    8.749607E+01 -1.383001E+02  3.357887E+00
   area, normal force (+ = tension), shear force (size), torque and bending moment (size)
    2.000000E+04 -2.500864E+02  4.448378E-04 -3.357887E+00  1.636535E+02
```

Contro l'oracolo geometrico (peso del materiale sopra il piano: ρ·g·20.000·500 = 250,0863 N) la
forza normale vale −250,0864 N: **sette cifre**.

Cinque limiti, tutti dichiarati o misurati:

1. **Serve una superficie di facce.** `SURFACE` è obbligatorio e deve essere una superficie
   facciale (`*SURFACE, TYPE=ELEMENT`). Un piano arbitrario che tagli i tetraedri non ha facce:
   `*SECTION PRINT` non lo sa fare, e su un maglio tetraedrico non strutturato **nessun piano
   utile ha facce complanari** salvo coincidenza. Sulla fixture funziona solo perché è una
   griglia regolare da 50 mm.
2. **Taglio e momento escono in modulo.** «shear force (size)» e «bending moment (size)»: non
   c'è scomposizione su assi locali. Per N, V₂, V₃, M_t, M₂, M₃ nel riferimento della sezione
   serve comunque codice proprio — ma i tre campi vettoriali (forza totale, momento sull'origine,
   momento sul baricentro) ci sono, e da quelli la scomposizione si fa.
3. **Il segno dipende dal lato.** «for internal surfaces […] the sign of the force and the
   moment depends on the side the elements of which were selected» [V]. Nella misura la normale
   media è uscita (0, 0, −1) perché le facce erano state prese dagli elementi **sopra** il
   piano: la forza stampata ha il segno opposto a quella sul corpo inferiore.
4. **Precisione**: la carta lo dice da sé — le tensioni sulle facce vengono interpolate dai
   valori nodali, che a loro volta vengono da estrapolazione e media, «therefore they will not
   be accurate at locations where the stress jumps» [V].
5. **Va chiesto prima della corsa**, dentro il passo. Cambiare piano dopo vuol dire rilanciare
   ccx; il taglio libero si fa sul `.frd` già scritto, quante volte si vuole.

---

## 5. Il taglio libero

### 5.1 La matematica

Il teorema di Cauchy dà tutto: su un piano di normale unitaria **n**, il vettore tensione è
**t** = σ·**n**. Con **n** che punta dalla parte «sotto» verso la parte «sopra», **t** è la
forza per unità d'area che il corpo sopra esercita su quello sotto. Presi un polo **x₀** sul
piano e una terna locale (**n**, **e₁**, **e₂**):

```
F = ∫_A σ·n dA                    N  = F·n            (positiva = trazione)
                                  V  = F − (F·n)n     (V₁ = F·e₁, V₂ = F·e₂)
M = ∫_A (x − x₀) × (σ·n) dA       M_t = M·n           (torsione)
                                  M₁ = M·e₁, M₂ = M·e₂ (flessioni)
```

Il polo **x₀** conta solo per M: cambiarlo trasla il momento di (x₀' − x₀) × F. La scelta
naturale è il baricentro dell'area tagliata, che è quello che fa anche `*SECTION PRINT`.

**Controllo di segno, verificato** [M]: con **n** verso l'alto, ∫**t** dA è uguale alla
risultante dei **carichi esterni applicati alla parte sopra**. Sotto sola gravità −z esce
(0, 0, −W_sopra); aggiungendo una spinta +y di 0,1 g esce (0, +0,1·W_sopra, −W_sopra). È il
controllo che smaschera il segno invertito, che è l'errore tipico di questo pezzo di codice.

### 5.2 L'intersezione tetraedro-piano

Per ogni tetraedro con vertici x₀…x₃ e distanze con segno d_i = **n**·x_i − c:

- se tutte le d_i hanno lo stesso segno, il tetraedro non è tagliato;
- altrimenti, per ognuno dei **sei lati** (a, b) con d_a·d_b < 0 si prende il punto
  p = x_a + t (x_b − x_a) con **t = d_a / (d_a − d_b)**;
- i punti sono 3 (un vertice da una parte) o 4 (due e due): mai di più, mai di meno.
  Il caso a 4 punti è un quadrilatero **piano** ma non necessariamente convesso
  nell'ordine in cui esce: va ordinato per angolo attorno al baricentro nella base
  (e₁, e₂ = n × e₁) e poi triangolato a ventaglio.

È l'intersezione della «marching tetrahedra» di Doi e Koide (1991), qui usata per la superficie
di taglio invece che per un'isosuperficie; la coincidenza è il caso di test 3-punti/4-punti, che
è lo stesso. La sorgente originale non è risultata raggiungibile in accesso libero
([NON TROVATO], § 8), e nulla della formula dipende da lei: sono le stesse quattro righe che
`*SECTION PRINT` non può usare perché lavora sulle facce.

### 5.3 L'interpolazione della tensione, e la quadratura

Il campo tensionale del `.frd` è **nodale**. Dentro l'elemento si interpola con le stesse
funzioni di forma degli spostamenti:

- **`C3D4`**: σ(x) = Σ λ_i σ_i, con λ le coordinate baricentriche. Campo **lineare**: sul
  triangolo la forza si integra esattamente con la media dei tre vertici per l'area; il momento,
  che è quadratico perché moltiplica per (x − x₀), con la regola dei tre punti medi dei lati.
- **`C3D10`**: σ(x) = Σ N_i(λ) σ_i sulle dieci funzioni di forma di `shape10tet.f`. Campo
  **quadratico**, momento cubico: serve una regola di grado ≥ 4. Nelle misure è stata usata
  Dunavant a 6 punti di grado 4, che costa sei valutazioni per triangolo ed è esatta per il
  momento.

Le coordinate baricentriche di un punto di intersezione si ottengono senza risolvere niente: se
il punto sta sul lato (a, b) a frazione t, allora λ_a = 1 − t, λ_b = t, le altre zero; dentro il
triangolo si combinano con i pesi della regola di quadratura.

### 5.4 Validazione: tre oracoli indipendenti, tutti passati

Fixture 200 × 100 × 1000, che riempie esattamente la scatola. Oracoli: **area** = 20.000/n_z,
**F** = risultante dei carichi sopra il piano, **`*SECTION PRINT`** sullo stesso piano.

**a) Geometria** [M] — area del taglio, contro il valore analitico:

| piano | poligoni | area calcolata | area vera | scarto |
|---|---|---|---|---|
| z = 525 | 48 | 20.000,00 | 20.000,00 | +0,0000 % |
| inclinato n_y/n_z = 0,3 | 48 | 20.880,61 | 20.880,61 | +0,0000 % |
| obliquo (0,2 · 0,1 · 1) | 66 | 20.493,90 | 20.493,90 | +0,0000 % |

**b) Equilibrio, sola gravità** [M] — deck a un solo carico, taglio su piani che non sono piani
di maglio:

| piano | N calcolata | oracolo −W_sopra | scarto |
|---|---|---|---|
| z = 525 | −237,5819 N | −237,5820 N | +0,000 % |
| z = 500,001 | −250,0859 N | −250,0858 N | −0,000 % |
| inclinato n_y/n_z = 0,3 | −237,5819 N | −237,5820 N | +0,000 % |
| obliquo | −300,1083 N | −300,1036 N | −0,002 % |

**c) Contro `*SECTION PRINT`, stesso piano, stesso `.frd`** [M] — quattro combinazioni:

| caso | F_z da `*SECTION PRINT` | F_z dal taglio libero | oracolo | scarto dall'oracolo |
|---|---|---|---|---|
| `C3D4`, sola gravità | −250,0864 | −250,0859 | −250,0863 | 0,000 % |
| `C3D4`, gravità + spinta | −246,5909 | −246,5902 | −250,0863 | **+1,398 %** |
| `C3D10`, sola gravità | −250,0838 | −250,0832 | −250,0863 | 0,001 % |
| `C3D10`, gravità + spinta | −257,2481 | −257,2467 | −250,0863 | **−2,864 %** |

Le due colonne centrali coincidono a cinque-sei cifre in tutti e quattro i casi: **l'algoritmo
del taglio libero riproduce l'integrazione di ccx**. Lo scarto dall'oracolo, quando c'è, è del
**campo di tensione mediato**, non dell'integrazione — esattamente ciò che il manuale avverte, e
coerente con la misura già registrata in `meshrec/core/solve.py:1091` (`SOF` sbaglia dal 21,0 %
al 6,6 % su `C3D4` e dal 2,3 % all'1,1 % su `C3D10`, raffinando).

**d) `ZZS` al posto di `STRESS`** [M], stesso deck con flessione, stesso piano:

| elemento | campo | F_z | scarto | F_y | scarto |
|---|---|---|---|---|---|
| `C3D10` | `STRESS` | −257,2467 | −2,864 % | +25,9668 | +3,832 % |
| `C3D10` | **`ZZSTR`** | −251,0746 | **−0,395 %** | +24,9883 | **−0,081 %** |
| `C3D4` | `ZZSTR` | 0,0000 | −100 % | 0,0000 | −100 % |

Su `C3D10` il recupero di Zienkiewicz-Zhu divide l'errore per sette senza costare una corsa in
più: basta `*EL FILE / S, ZZS`. Su `C3D4` il blocco esiste ed è **tutto zero**: chi lo integra
senza controllare ottiene un taglio nullo, che è il modo peggiore di sbagliare.

### 5.5 I due modi in cui degenera (misurati)

| ingresso | cosa succede | oracolo |
|---|---|---|
| piano coincidente con un piano di maglio (z = 100, 250, 500, 750, 900 sulla fixture) | **0 poligoni**, area 0, N = 0: tutte le d_i sono nulle o dello stesso segno, e il test `d_a·d_b < 0` non scatta mai | deve dire «piano degenere» e proporre lo scostamento, non restituire zero. Con z = 500,001 lo stesso taglio dà il valore esatto |
| piano fuori dal solido (z = 1200) | 0 poligoni | deve dire «nessuna intersezione», non zero silenzioso |

Il rimedio è di una riga (spostare c di ε ≈ 10⁻⁶ della dimensione tipica, o classificare
d = 0 come positivo), ma **va scelto e dichiarato**: senza, il caso più naturale — «tagliami a
metà altezza» su un maglio strutturato — restituisce zero con l'aria di un risultato.

### 5.6 Come lo fa Abaqus, e perché non si può copiare

Il *Free Body cut* di Abaqus/CAE **non integra le tensioni**: somma le forze nodali di elemento
(`NFORC`), e per questo richiede quell'uscita nel database [V]:

> you can create a free body cut only when the current step and frame of the output database
> includes element force nodal output (NFORC)
> […] Cross-sections can be created along mesh boundaries only; you cannot specify a
> cross-section along an arbitrary plane.

Su un piano di maglio, la somma delle forze nodali soddisfa l'equilibrio **esattamente** (sono
le stesse forze che il solutore ha equilibrato), mentre l'integrale delle tensioni no — è la
differenza fra 0,000 % e 2,9 % delle tabelle di sopra. Il piano arbitrario, in Abaqus, è
un'altra funzione (le risultanti sul *view cut*), e la documentazione non ne dichiara
l'algoritmo.

**CalculiX non espone `NFORC`.** Non c'è carta che stampi le forze nodali interne di elemento:
`RF` esiste solo sui nodi vincolati o caricati, e il manuale, per il caso analogo dei
sottomodelli, consiglia proprio di ricavare le forze nodali con una corsa preliminare a
spostamenti imposti [V]. Restano due strade, ed è bene tenerle distinte:

- **risultante esatta per statica** [INF, corroborato dalle misure b) e c)]: se il piano
  **separa davvero il modello in due pezzi**, la risultante sul taglio è la somma dei carichi
  esterni e delle reazioni applicati a un pezzo — nessuna tensione coinvolta. È esatta ma non
  dà la distribuzione, e non vale per un piano che taglia solo un pilastro di un telaio, dove i
  due pezzi restano collegati altrove.
- **integrazione delle tensioni**: dà distribuzione e risultante su qualunque piano, con
  l'errore misurato sopra. È la strada del taglio libero, e la prima serve a controllarla.

---

## 6. Raccomandazione per NOVA

Raccomandazione, non decisione: le scelte di prodotto (promuovere sempre o su richiesta, quanti
modi, quali piani) restano all'autore.

### 6.1 Cosa scrivere nel deck, carta per carta

| carta | cosa scrivere | perché |
|---|---|---|
| `*NODE` | nodi originali **più** i nodi di lato, numerati dopo il massimo esistente | promozione; i numeri originali restano stabili, il che tiene validi gli NSET dell'utente |
| `*ELEMENT, TYPE=C3D10` | `e, n1..n4, m12, m23, m13, m14, m24, m34` | ordine da `shape10tet.f` (§ 1.2). Un test che ricalcola `EVOL` e lo confronta col volume geometrico prende l'ordine sbagliato |
| `*NSET` | ricalcolare ogni set **dopo** la promozione, includendo i nodi di lato che soddisfano la stessa condizione geometrica | § 1.5.1 |
| `*SOLID SECTION`, `*MATERIAL`, `*ELASTIC`, `*DENSITY` | invariati | |
| `*BOUNDARY` | invariato, sui set ricalcolati | |
| `*STEP` + `*STATIC` | un passo per combinazione | |
| `*DLOAD … GRAV` | invariato | ccx distribuisce da sé con le quote di § 1.3 |
| carichi di superficie | `*SURFACE, TYPE=ELEMENT` + `*DLOAD` di tipo `P`, **mai** `*CLOAD` nodale ereditato dal `C3D4` | § 1.5.2 |
| `*NODE PRINT, NSET=BASE` / `RF` | invariato | reazioni nel `.dat`, come oggi |
| `*NODE FILE` / `U` | sempre | |
| `*EL FILE` / `S, ZZS` | **su `C3D10`**; su `C3D4` solo `S` (`ZZS` esce a zero) | § 2.3, § 5.4d |
| `*EL FILE, NSET=<intorno dei tagli>` | quando i piani di taglio sono noti prima della corsa | 155 → 35 MB (§ 3) |
| `*EL PRINT, ELSET=…, TOTALS=ONLY` / `EVOL` | una volta per corsa | il volume lo dà il solutore, per qualunque elemento (§ 1.4) |
| `*SECTION PRINT, SURFACE=…, NAME=…` / `SOF` | solo quando esiste una superficie di facce (base, interfacce) | seconda opinione gratuita sul taglio libero (§ 4) |
| `*FREQUENCY` + n | n scelto per arrivare all'85 % di massa partecipante (NTC 2018 §7.3.3.1, cfr. ricerca `06`), non un numero fisso | i fattori di partecipazione e la massa modale efficace escono già nel `.dat` |
| `*STEP, PERTURBATION` sul passo modale | quando i modi vanno presi **sotto carico** | «the load active in the last `*STATIC` step […] will be taken as preload» [V] |
| `*NODE OUTPUT`, `*ELEMENT OUTPUT` | **mai** | `.frd` misto binario, illeggibile dal lettore ASCII (§ 2.3) |

Sull'ambiente: **non impostare** `OMP_NUM_THREADS` (o metterlo a 1) e non promettere
scalabilità; sul binario locale i thread peggiorano i tempi e il solutore è seriale (§ 3). Se un
giorno la corsa diventa lunga, la leva è ricompilare con `USE_MT` o linkare PaStiX, non una
variabile d'ambiente.

### 6.2 Cosa leggere

1. `leggi_frd` è già sufficiente: **togliere il filtro** `nova/ccx.py:165` e tenere anche i
   blocchi `STRESS`, `ZZSTR`, `TOSTRAIN`, `ERROR`, indicizzati per (grandezza, passo).
2. **`.frd` senza blocco `STRESS`** (deck che non chiede `S`): il lettore deve restituire
   `{"tensioni": "assente"}` e il taglio libero deve dire `non_applicabile` con il motivo —
   non sollevare, e nemmeno restituire zero. È lo stesso registro dei verdetti già in uso
   (`nova/corsa.py`, `non_applicabile`). La distinzione che conta: `leggi_frd` **solleva** su
   file troncato (blocco aperto e mai chiuso), perché è un file rotto; un blocco che non è stato
   chiesto non è un file rotto.
3. **Blocco presente ma tutto zero** (`ZZSTR` su `C3D4`): controllare, e trattarlo come assente
   con un motivo diverso («ZZS non disponibile su elementi lineari»).
4. **Blocchi a più di 6 componenti**: `leggi_frd` ignora i record ` -2` e leggerebbe metà dati.
   Finché NOVA chiede solo `S`/`ZZS`/`E` il caso non si presenta; se un giorno servisse `PHS`,
   va esteso il lettore, non il chiamante.
5. Von Mises e principali si calcolano in NOVA (§ 2.4); nel `.frd` non ci sono.

### 6.3 Il taglio libero, in pseudocodice

```
taglio_libero(mesh, tensioni_nodali, n, x0, tipo_elemento) -> N, V1, V2, Mt, M1, M2, area, avvisi

  n  <- n / |n|                              # normale unitaria
  c  <- n . x0                               # il piano e' n.x = c
  e1 <- un versore ortogonale a n            # base locale della sezione
  e2 <- n x e1
  eps <- 1e-9 * dimensione_tipica(mesh)

  # degenere 1: piano che appoggia su un piano di maglio
  se esistono nodi con |n.x - c| < eps in numero > 0:
      avvisi += "il piano tocca <k> nodi: scostato di eps per evitare poligoni degeneri"
      c <- c + eps

  F <- 0; M <- 0; area <- 0; poligoni <- 0

  per ogni elemento e della mesh:
      d[i] <- n . x[i] - c        per i = 0..3      # solo i quattro vertici, anche su C3D10
      se tutte le d[i] > 0 oppure tutte < 0: continua

      punti <- []; lambda <- []
      per ogni lato (a,b) dei sei:
          se d[a] * d[b] < 0:
              t <- d[a] / (d[a] - d[b])
              punti  += x[a] + t*(x[b] - x[a])
              lambda += vettore con lambda[a]=1-t, lambda[b]=t, resto 0

      se |punti| < 3: continua                      # tocca in un vertice o su un lato
      ordina punti e lambda per atan2((p-g).e2, (p-g).e1), g = media dei punti
      poligoni += 1

      per ogni triangolo (0, i, i+1) del ventaglio:
          A <- |(p1-p0) x (p2-p0)| / 2
          area += A
          per ogni (peso w, coordinate baricentriche b) della regola:
              # C3D4: 3 punti medi dei lati (grado 2). C3D10: Dunavant 6 punti (grado 4)
              x_q  <- somma b[k] * p[k]
              lam  <- somma b[k] * lambda[k]        # coord. baricentriche nel tetraedro
              sigma <- se tipo == C3D4:  somma lam[i] * sigma_nodo[i]        (i = 0..3)
                       se tipo == C3D10: somma N_i(lam) * sigma_nodo[i]     (i = 0..9)
              t_q <- sigma . n
              F   += A * w * t_q
              M   += A * w * ((x_q - x0) x t_q)

  # degenere 2: nessuna intersezione
  se poligoni == 0:
      ritorna non_applicabile("il piano non interseca nessun tetraedro", avvisi)

  N  <- F . n;   V1 <- F . e1;  V2 <- F . e2
  Mt <- M . n;   M1 <- M . e1;  M2 <- M . e2

  # controllo di equilibrio, quando il piano separa il modello in due
  se separa_in_due(mesh, n, c):
      F_atteso <- somma dei carichi esterni e delle reazioni sul pezzo "sopra"
      se |F - F_atteso| / |F_atteso| > 0,05:
          avvisi += "scarto <x> % dall'equilibrio: maglio rado o campo di tensione mediato"

  ritorna N, V1, V2, Mt, M1, M2, area, avvisi
```

Funzioni di forma del `C3D10`, con `a = 1 − ξ − η − ζ` e (ξ, η, ζ) = (λ₁, λ₂, λ₃):

```
N1 = a(2a-1)     N5  = 4 ξ a     N8  = 4 ζ a
N2 = ξ(2ξ-1)     N6  = 4 ξ η     N9  = 4 ξ ζ
N3 = η(2η-1)     N7  = 4 η a     N10 = 4 η ζ
N4 = ζ(2ζ-1)
```

Quadrature: grado 2 sul triangolo = i tre punti medi dei lati, peso 1/3 ciascuno. Grado 4 =
Dunavant a 6 punti, con (0,108103018168070, 0,445948490915965, 0,445948490915965) peso
0,223381589678011 e (0,816847572980459, 0,091576213509771, 0,091576213509771) peso
0,109951743655322, entrambe in tutte le permutazioni.

**Un solo controllo eseguibile vale più di una suite**: sulla fixture, cutting a z = 525 sotto
sola gravità, `N` deve valere −237,5820 N a meno dello 0,01 %. Se il segno si inverte, se il
poligono si ordina male o se la quadratura sbaglia peso, quel numero cambia.

### 6.4 In che ordine conviene farlo

1. Togliere il filtro `DISP` e portare le tensioni nel JSON dei risultati: costo quasi nullo,
   sblocca tutto il resto.
2. Taglio libero su `C3D4` (campo lineare), con i due degeneri e il controllo di equilibrio.
   È già verificabile contro `*SECTION PRINT` su un piano di facce.
3. Promozione a `C3D10` con `EVOL` come oracolo dell'ordine dei nodi, e `ZZS` in uscita.
4. Von Mises e principali per la vista a colori, che è un'altra faccenda dalle verifiche.

---

## 7. Domande aperte per l'autore

1. **La promozione è del deck o della mesh?** Promuovere in NOVA (leggere `C3D4`, scrivere
   `C3D10`) tiene MeshRec fermo, ma NOVA si prende la mesh in carico. Chiedere a MeshRec di
   emettere `C3D10` sposta il problema di là, dove peraltro c'è già la formula giusta della
   quota tributaria e c'è già un `TetConfig` quadratico.
2. **Che cosa deve dare il taglio libero, oltre a N, V, M?** La distribuzione lungo la sezione
   (per il confronto col telaio a fibre) o solo le sei risultanti? La prima cambia il formato
   dei risultati, la seconda no.
3. **Il piano di taglio da dove viene?** Scelto a mano nella vista, o generato dalla geometria
   del telaio (una sezione per estremità di asta, come le sollecitazioni di OpenSees)? Se è il
   secondo, il confronto solido/telaio diventa automatico — ed è il vero motivo per cui questa
   ricerca esiste.
4. **Che tolleranza è accettabile sul confronto?** Le misure dicono: 0,0 % su stato assiale,
   1,4-2,9 % con flessione su maglio rado, 0,4 % con `C3D10` più `ZZS`. Una soglia di verdetto
   va scelta con l'uso in mente, non con la statistica.
5. **`*SECTION PRINT` resta o va via?** Costa una `*SURFACE` scritta prima della corsa e dà una
   seconda opinione sui soli piani di facce. Tenerlo come controllo incrociato in modo diagnostico
   è economico; farne una funzione utente no.
6. **Il numero di modi lo sceglie l'utente o il programma?** I dati per la scelta automatica
   (massa modale efficace per modo, massa efficace totale) escono già nel `.dat` e NOVA li legge
   già (`nova/ccx.py:_masse_per_modo`): manca solo la regola «rilancia con più modi finché
   l'85 % non è raggiunto», che è una decisione di prodotto.
7. **Il `.frd` da 155 MB va tenuto?** Con `NSET` si scende a 35, ma solo se i piani di taglio
   sono noti prima della corsa — cioè se la sezione la sceglie il modello e non l'occhio.

---

## 8. Riferimenti

Ogni voce: URL · perché conta qui · cosa se ne prende. Le pagine `[V]` sono salvate in
[`fonti/`](fonti/) con il loro sidecar di provenienza.

- **URL** http://www.dhondt.de/ccx_2.22.htm.tar.bz2 · [V] · salvata in
  [`fonti/calculix-2.22-manuale-carte.md`](fonti/calculix-2.22-manuale-carte.md)
  **perché conta qui** è il manuale utente della versione esatta del binario locale (2.22), e
  contiene la semantica di tutte le carte che NOVA deve scrivere e di tutte le uscite che deve
  leggere
  **cosa se ne prende** il verdetto sul `C3D4` («too stiff, use the 10-node element instead»),
  la semantica di `RF` (reazioni + carichi nodali), `*EL FILE` nodale-mediato contro `*EL PRINT`
  ai punti di Gauss, l'elenco delle sei parallelizzazioni con le loro variabili e la condizione
  `USE_MT` per SPOOLES, l'uscita completa di `*SECTION PRINT` con i suoi limiti dichiarati, le
  chiavi `EVOL`/`EMAS`, `ZZS` contro `ERR`, `*FREQUENCY` con `PERTURBATION` e la massa modale
  efficace, la numerazione delle facce del tetraedro (S1 = 1-2-3, S2 = 1-4-2, S3 = 2-4-3,
  S4 = 3-4-1) usata per costruire la `*SURFACE` del controllo incrociato

- **URL** http://www.dhondt.de/ccx_2.22.src.tar.bz2 · [V] · salvata in
  [`fonti/calculix-2.22-sorgente.md`](fonti/calculix-2.22-sorgente.md)
  **perché conta qui** il formato del `.frd` e l'ordine dei nodi del `C3D10` non stanno nel
  manuale in forma testuale (l'uno non c'è, l'altro è una figura): il sorgente è l'unica fonte
  primaria che li dichiara senza ambiguità
  **cosa se ne prende** l'ordine dei nodi di lato del `C3D10` dalle funzioni di forma
  (`shape10tet.f:41-50`), il formato esatto dei record `.frd` (`%3s%10d` + `%12.5E` per
  componente, sei valori per riga, continuazione su ` -2`, cast a `float`) da `frd.c:1008-1030` e
  `frdselect.c:70-132`, e la prova che `CCX_NPROC_EQUATION_SOLVER` si legge solo dentro
  `#ifdef USE_MT` (`spooles.c:644-717`), che spiega il «Using 1 cpu for spooles» di ogni corsa

- **URL** http://www.dhondt.de/ · [V]
  **perché conta qui** è l'indice ufficiale delle versioni, e dice che la corrente oggi è la
  **2.23**, non la 2.22 su cui gira NOVA
  **cosa se ne prende** l'avvertenza di obsolescenza: tutto ciò che sta qui è verificato su
  2.22, e prima di aggiornare il binario vanno rifatte almeno le misure di §3 e §5, perché il
  formato del `.frd` e le variabili d'ambiente possono cambiare fra minori

- **URL** https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-m-Fbd-sb.htm · [V] ·
  salvata in [`fonti/abaqus-2017-free-body-cut.md`](fonti/abaqus-2017-free-body-cut.md)
  **perché conta qui** il *Free Body cut* è il termine di paragone nominato dal ticket, e questa
  è la pagina che dichiara da cosa è calcolato
  **cosa se ne prende** che il taglio libero di Abaqus somma le **forze nodali di elemento**
  (`NFORC`), non le tensioni — da cui la distinzione fra risultante esatta per statica e
  integrazione delle tensioni, e la ragione per cui in CalculiX la prima strada non è
  disponibile allo stesso modo

- **URL** https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-fbdintro.htm · [V] ·
  salvata nella stessa fonte
  **perché conta qui** dichiara il limite geometrico del meccanismo che NOVA vuole superare
  **cosa se ne prende** «Cross-sections can be created along mesh boundaries only; you cannot
  specify a cross-section along an arbitrary plane»: il piano arbitrario è esattamente ciò che
  il taglio libero di NOVA aggiunge, e Abaqus lo tratta con un meccanismo diverso (le risultanti
  sul *view cut*) di cui non dichiara l'algoritmo

- **URL** https://globals.ieice.org/en_transactions/information/10.1587/e74-d_1_214/_p ·
  **[NON TROVATO]**
  **perché conta qui** è la fonte originale della «marching tetrahedra» (Doi, A. e Koide, A.,
  *An efficient method of triangulating equi-valued surfaces by using tetrahedral cells*, IEICE
  Trans. Inf. & Syst. 74(1), 214-224, 1991), cioè della casistica 3-punti/4-punti
  dell'intersezione tetraedro-piano
  **cosa se ne prende** niente di operativo: il testo non è risultato raggiungibile (HTTP 405
  sul portale IEICE, estrazione fallita su Semantic Scholar), e la casistica è stata verificata
  in sessione contando i poligoni (48 su ogni piano orizzontale della fixture, 66 su un piano
  obliquo) invece che citata

- **URL** riferimenti [8], [114] e [115] della bibliografia del manuale 2.22 (Barlow, J.,
  *Optimal stress locations in finite element models*, IJNME 10, 243-251, 1976; Zienkiewicz,
  O.C. e Zhu, J.Z., *The superconvergent patch recovery and a posteriori error estimates*,
  Parti 1 e 2, IJNME 33, 1331-1364 e 1365-1382, 1992) · [V] **solo come citazione nel manuale**,
  i testi non sono stati letti
  **perché conta qui** sono la base di `ZZS`, che nelle misure divide per sette l'errore del
  taglio libero su `C3D10`
  **cosa se ne prende** il perché del guadagno — il recupero per patch parte dai punti
  superconvergenti (Barlow) invece che dalla media fra elementi — e nient'altro: l'entità del
  guadagno è misurata qui, non presa da loro

### Fonti interne (codice letto in questa sessione)

- `nova/ccx.py:165` — il filtro `b.grandezza != "DISP"` che scarta le tensioni già lette
- `nova/ccx.py:47,53,57` — marcatore di fine, set `TOP`, timeout di 1800 s
- `nova/inp.py:23-29` — la nota su `C3D10` e `TIPO_ESATTO = "C3D4"`, di cui §1.3 conferma la
  formula e §1.4 corregge la parte sul volume
- `meshrec/core/solve.py:245-311` — `leggi_frd`: generico sull'etichetta, ignora i record ` -2`
- `meshrec/core/solve.py:1091-1177` — `_quota_tributaria_gravita`: stessa formula, stessa
  avvertenza sul segno, e la misura già registrata dell'errore di `SOF`; non riusabile per la
  chiamata a `abaqus.NODI_PER_ELEMENTO`, che in questo checkout non esiste
- `tests/fixture/solido_piccolo/trave.inp:1294-1353` — i quattro passi del deck di MeshRec
- `docs/ricerca/06-dominio-analisi-verifiche-formati.md` — l'85 % di massa partecipante di
  NTC 2018 §7.3.3.1 (contro il 90 % dell'EC8), citato in §6.1
