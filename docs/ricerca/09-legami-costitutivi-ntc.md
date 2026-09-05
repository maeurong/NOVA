# Ricerca: legami `Concrete02`/`Steel02` dalla classe NTC 2018 e confinamento

Ricerca del 04/09/2026 per l'issue [#12](https://github.com/maeurong/NOVA/issues/12) della mappa wayfinder #1, condotta da un `researcher` AFK sul ramo `research/legami-ntc`. Domanda posta: come si derivano i parametri di `Concrete02` e `Steel02` da una classe NTC (C25/30, B450C) e dalle staffe (confinamento), quale veste delle resistenze (caratteristiche `f_k`, medie `f_m`, di progetto `f_d`) usano norma e prassi per l'analisi non lineare, con fonti primarie ed esempi OpenSees pubblicati con numeri.

**Skill-gate.** `research` invocata (questo file ne è il prodotto); `caveman:caveman` per il report al thread. Nessuno script.

**Premesse del brief verificate** [V]: `docs/ricerca/06-dominio-analisi-verifiche-formati.md` §1-2 (articoli NTC per pushover e duttilità), `01-opensees-integrazione.md` §4 (catalogo materiali registrati: `Concrete01 02 04 07 ConcreteCM Steel01 02 Steel4 ReinforcingSteel`), `05-archeologia-linea-integrata.md` §4 (`armatura.py`, `materiali.py`; casella «veste delle resistenze» dichiarata non decisa in `opensees.py:290-293`), `~/GitHub/Tesi/docs/validazione/ricerca-armature-opensees-fibre.md` §3 (firme dei materiali, raccomandazione `Concrete01/04 + Steel02`, §3.4 «il confinamento è un calcolo a monte»), `ricerca-ntc-2018-numeri-per-il-catalogo.md` §1-4 (formule §11.2.10, B450C Tab. 11.3.Ib, legami §4.1.2.1.2). Nessuna premessa falsa. Non ripeto ciò che quei file dicono: li cito per sezione.

Tag: **[V]** verificato su fonte primaria · **[M]** misurato in sessione · **[INF]** inferenza o calcolo mio · **[NON TROVATO]**. Notazione numerica italiana fuori dalle citazioni verbatim. Unità MPa, mm, salvo dove l'esempio citato usa ksi.

## Artefatti consultati

| sorgente | come | cosa |
|---|---|---|
| NTC 2018 (DM 17/01/2018) cap. 4 e 7 | PDF G.U. in scratchpad → `pdftotext -layout` | §4.1.1.1, §4.1.1.3, §4.1.2.1.2.1 (incluso «Calcestruzzo confinato» [4.1.8]-[4.1.12.i]), §4.1.2.1.2.2, §4.1.2.3.9.3, §7.3.1, §7.3.4, §7.4.1 |
| Circolare 21/01/2019 n. 7 cap. 4, 7, 8 | idem | C4.1.2.1.2.1, C7.3.4.1, C7.4, C7.4.4, C8.5.4.2, C8.7.2.2, C8.7.2.3.2, C8.7.4 [C8.7.4.6] |
| EN 1998-1:2004 | PDF (phd.eng.br) → `pdftotext` | §4.3.3.4.1(1)-(7) |
| EN 1998-3:2005 | testo **non letto** [NON TROVATO: vdoc.pub 403]; usate le slide JRC di M.N. Fardis (Zagabria 2015) come secondaria | CF 1,35 / 1,2 / 1,0 sui valori medi |
| Mander, Priestley, Park 1988, *Theoretical Stress-Strain Model for Confined Concrete*, J. Struct. Eng. 114(8) 1804-1826 | PDF ITU → `pdftotext` | eq. (3)-(11), (21)-(29), Fig. 4, esempio numerico, conclusione 5 |
| OpenSees doc `Concrete02`, `Steel02`, `Concrete04` (opensees.github.io); `Concrete02`, `ConcreteCM` (openseespydoc) | WebFetch | firme, note, valori raccomandati |
| `SRC/material/uniaxial/Concrete02.cpp`, `Steel02.cpp` (OpenSees master) | raw GitHub | default quando si omettono argomenti |
| `LibMaterialsRC.tcl`, `BuildRCrectSection.tcl` (Mazzoni & McKenna 2006, wiki Berkeley) | download `wiki/images/c/cb/…`, `f/f8/…` | esempio 1 |
| OpenSeesPy doc 14.1.5 `RCFrameGravity`; `pyExamples/EarthquakeExamples/Example4/InelasticFiberSectionPortal2Dframe.py` | WebFetch / raw | esempio 2 e 4 |
| `AmirHosseinNamadchi/OpenSeesPy-Examples`, *Reinforced Concrete 3D Frame (FGU).ipynb* (2022, da F. Gutiérrez Urzúa) | raw notebook | esempio 3, metrico |
| opstool doc `mc_analysis` | WebFetch | esempio 5 (Concrete04) |
| M.H. Scott, *Making Sense Out of Concrete02*, portwooddigital 22/08/2021 | WebFetch | razionale dei default |
| Calcolo dell'esempio C25/30 + pilastro 30×50 | `calc_legami.py` in scratchpad, Python 3 | tutti i numeri marcati [INF] nelle §1-3 |

Budget `WebSearch` esaurito a metà sessione: le ricerche di paper italiani con C25/30-B450C in OpenSees non sono state completate (§6).

---

## 1. `Concrete02` dalla classe NTC

### 1.1 Cosa il materiale chiede e cosa impone

Firma [V] https://opensees.github.io/OpenSeesDocumentation/user/manual/material/uniaxialMaterials/Concrete02.html:

```
uniaxialMaterial Concrete02 $matTag $fpc $epsc0 $fpcu $epsU $lambda $ft $Ets
```

Due vincoli non negoziabili, entrambi verbatim dalla doc [V]: «Compressive concrete parameters should be input as negative values» e «The initial slope for this model is (2*$fpc/$epsc0)». Il secondo è confermato nel sorgente: `Concrete02.cpp:107,164` `2.0*fc/epsc0` [V]. **Il modulo elastico non è un parametro**: chi fissa `fpc` e `epsc0` ha già fissato `Ec`.

Default quando si passano solo 4 argomenti (`Concrete02.cpp:69-81, 135-139`, PR #644 di M.H. Scott, merged 15/08/2021) [V]:

```
rat (lambda) = 0.1
ft  = 0.1*|fc|
Ets = 0.1*fc/epsc0        # cioè ft / epsc0
```

Razionale di Scott (portwooddigital 2021) [V]: «tensile rupture strength of concrete is typically about 10% of the compressive strength»; `λ = 0,1 «seems reasonable»`; `Ets` conta solo per la localizzazione in trazione.

### 1.2 Tabella di derivazione

| parametro | significato (doc) | da NTC 2018 | prassi OpenSees | nota |
|---|---|---|---|---|
| `fpc` | «compressive strength at 28 days» | `f_ck` = 0,83 `R_ck` [11.2.1]; `f_cm` = `f_ck` + 8 [11.2.2]; `f_cd` = 0,85 `f_ck`/1,5 [4.1.3] — **quale delle tre è la §4** | `fc` nominale (Mazzoni −4 ksi; FGU −25 MPa) | segno negativo |
| `epsc0` | «strain at maximum strength» | `ε_c2` = 0,20 % (§4.1.2.1.2.1, parabola-rettangolo, ≤ C50/60) | −0,002 (FGU, RCFrameGravity cover), −0,003 (Mazzoni copriferro), oppure `2·fpc/Ec` per imporre `Ec` (Mazzoni nucleo) | se si vuole `Ec` = `E_cm` = 22000 (`f_cm`/10)^0,3 [11.2.5] va posto `epsc0 = 2 fpc / E_cm` |
| `fpcu` | «crushing strength» | [NON TROVATO]: la norma non definisce un residuo | 0,2 `fpc` (Mazzoni `Kres`, FGU, Scott); 0 per il copriferro (RCFrameGravity) | |
| `epsU` | «strain at crushing strength» | `ε_cu` = 0,35 % non confinato (§4.1.2.1.2.1); confinato `ε_cu2,c` [4.1.11] | copriferro −0,006 / −0,01 / −0,05; nucleo −0,014 / −0,02 / 20·`epsc0` | 0,0035 come `epsU` del copriferro è la lettura letterale di §7.4.1 («perdita dei copriferri al raggiungimento … 0,35%») [V] |
| `lambda` | «ratio between unloading slope at epscu and initial slope» | [NON TROVATO] | 0,1 ovunque (Mazzoni, FGU, default sorgente) | |
| `ft` | «tensile strength» | `f_ctm` = 0,30 `f_ck`^(2/3) [11.2.3a]; `f_ctk` = 0,7 `f_ctm` (§11.2.10.2) | 0,1 `fpc` (default, FGU), 0,14 `fpc` (Mazzoni) | 0,1·33 = 3,3 contro `f_ctm` 2,57: la prassi sovrastima del 30 % per C25/30 [INF] |
| `Ets` | «tension softening stiffness» | [NON TROVATO] | `ft`/0,002 (Mazzoni, FGU); `ft`/`epsc0` (default) | |

### 1.3 Esempio numerico C25/30 [INF, calcolato]

Base NTC (`ricerca-ntc-2018-numeri-per-il-catalogo.md` §1.1 per le formule): `f_ck` 25 · `f_cm` 33 · `f_ctm` 2,565 · `f_ctk` 1,795 · `E_cm` 31 476 · `f_cd` 14,17 MPa.

| veste | `fpc` | `epsc0` per `Ec` = `E_cm` | `Ec` che risulta con `epsc0` = 0,002 | `ft` | `Ets` (`ft`/0,002) |
|---|---|---|---|---|---|
| caratteristica | −25,0 | −0,00159 | 25 000 (79 % di `E_cm`) | 1,80 (`f_ctk`) o 2,57 | 897 / 1 282 |
| **media** | **−33,0** | **−0,00210** | **33 000 (105 % di `E_cm`)** | **2,57 (`f_ctm`)** | **1 282** |
| di progetto | −14,17 | −0,00090 | **14 167 (45 % di `E_cm`)** | 1,20 (`f_ctd`) | 598 |

Il fatto che decide: con `epsc0` = `ε_c2` = 0,002, che è il valore che la norma dà per il diagramma di **progetto**, `Concrete02` con `fpc` = `f_cd` produce un calcestruzzo **due volte più deformabile** di quello che le NTC prescrivono per l'analisi (§4.1.1.1: «valori medi del modulo d'elasticità» [V]). Solo la coppia (`f_cm`, 0,002) riproduce `E_cm` a meno del 5 %. Chi usa `f_cd` deve abbassare `epsc0` a 0,0009 — e allora la parabola non è più quella di norma. Questo è il motivo tecnico, prima ancora che normativo, per cui la prassi non mette `f_cd` dentro `Concrete02`.

Riga pronta, C25/30 non confinato, veste media:

```
uniaxialMaterial Concrete02 2  -33.0 -0.0021  0.0 -0.0035   0.1  2.57  1282   ; # copriferro, epsU = eps_cu NTC
uniaxialMaterial Concrete02 2  -33.0 -0.0021 -6.6 -0.010    0.1  2.57  1282   ; # copriferro, prassi (Kres 0,2; epsU −0,01)
```

Le due righe differiscono solo nel ramo discendente; la scelta fra 0,0035 (norma) e 0,01 (prassi) cambia la convergenza della pushover dopo l'espulsione del copriferro, non la resistenza di picco [INF].

### 1.4 Alternative registrate nell'interprete

- **`Concrete04`** [V] https://opensees.github.io/OpenSeesDocumentation/user/manual/material/uniaxialMaterials/Concrete04.html: `uniaxialMaterial Concrete04 $matTag $fc $ec $ecu $Ec <$fct $et> <$beta>` — Popovics in compressione, **`Ec` è un argomento indipendente**; nota verbatim «If the user defines Ec = 57000√(fcc) (in psi unit) then the envelope curve is identical to proposed by [Mander1988]». È il materiale che ospita Mander senza compromessi (§3.4).
- **`ConcreteCM`** [V] https://openseespydoc.readthedocs.io/en/latest/src/ConcreteCM.html: `('ConcreteCM', matTag, fpcc, epcc, Ec, rc, xcrn, ft, et, rt, xcrp, mon, '-GapClose', GapClose=0)` — Chang & Mander 1994, `Ec` indipendente, forma di Tsai con `rc`; sette parametri in più senza fonte di norma. Pagina opensees.github.io non raggiunta (404) [NON TROVATO].
- **`Concrete01`**: stessi quattro primi argomenti di `Concrete02`, trazione nulla (`ricerca-armature-opensees-fibre.md` §3.1).

---

## 2. `Steel02` da B450C

Firma e raccomandazioni verbatim [V] https://opensees.github.io/OpenSeesDocumentation/user/manual/material/uniaxialMaterials/Steel02.html: `uniaxialMaterial Steel02 $matTag $Fy $E $b $R0 $cR1 $cR2 <$a1 $a2 $a3 $a4 $sigInit>`; «Recommended values: R0=between 10 and 20, cR1=0.925, cR2=0.15». Se si passano solo `Fy E b`, il sorgente pone `R0 = 15.0; cR1 = 0.925; cR2 = 0.15` (`Steel02.cpp:76-84, 202-204`) [V]. Isotropo `a1..a4` opzionali, default 0/1/0/1 [V].

| parametro | da NTC 2018 / Circolare | valore | prassi | nota |
|---|---|---|---|---|
| `Fy` | `f_yk` = `f_y,nom` = 450 MPa, frattile 5 % (§11.3.2.1 Tab. 11.3.Ia-b); `f_yd` = 450/1,15 = 391,3 (§4.1.2.1.1.3) | 450 / 391,3 | Mazzoni 66,8 ksi; FGU 420; RCFrame 60 ksi | **`f_ym` per B450C: [NON TROVATO]** in NTC e Circolare. La norma dà solo un tetto: `(f_y/f_y,nom)_k` ≤ 1,25 al frattile 10 % (Tab. 11.3.Ib) |
| `E0` | Circolare C4.1.2.2.5: `E_s` = 210 000 (in un paragrafo SLE); EN 1992-1-1 §3.2.7(4): 200 000 | 200 000 (coerente con l'oracolo di `armatura.py`, `05-*.md` §4) | 29 000 ksi = 200 000; FGU 210 000 | divergenza già aperta in `ricerca-ntc-2018…` §2.3 |
| `b` | dal modello (a) di §4.1.2.1.2.2: retta da (`ε_yd`, `f_yd`) a (`ε_ud`, `k f_yd`), `k` = (`f_t/f_y`)_k, `ε_ud` = 0,9·0,075 = 0,0675 | `b` = (`k`−1)·`f_yd` / [(`ε_ud`−`ε_yd`)·`E_s`] = **0,0045** con `k` = 1,15; 0,0062 con `f_tk`/`f_yk` nominali 540/450; 0,0108 con `k` = 1,35 [INF] | 0,01 (Mazzoni, RCFrame), 0,005 (FGU) | `Steel02` non ha tetto a `ε_ud`: il ramo è indefinito, la deformazione limite va controllata a valle sulle fibre |

> **Nota del 05/09/2026 (T4).** Il codice calcola `b` con lo stesso `f_y` che dà a `Fy` (la veste dell'analisi:
> `f_yk` = 450 per `media`, o `fym` dichiarato), mai con `f_yd`, per il vincolo «mai `f_cd`/`f_yd` dentro il legame»
> del §7: `b` = 0,15·450 / [(0,0675 − 0,00225)·200 000] = **0,00517**. Lo 0,0045 qui sopra è con `f_yd`.
| `R0 cR1 cR2` | nessuna fonte di norma | 15-20 / 0,925 / 0,15 | 18 (Mazzoni), 20 (FGU, doc) | citabili dalla doc, non tarature |

Riga pronta:

```
uniaxialMaterial Steel02 3  450.0 200000.0 0.005  18 0.925 0.15   ; # B450C, f_yk, k = 1,15 → b ≈ 0,0045-0,006
```

Trappola di §2.1 di `ricerca-ntc-2018…`: B450A ha gli stessi 450/540 e cambia solo `ε_uk` (2,5 %) → `b` = 0,0049 con `k` = 1,05 [INF]; in un menu a tendina la differenza sta in `b` e nel limite di deformazione, non in `Fy`.

---

## 3. Confinamento

### 3.1 Il legame di norma: NTC §4.1.2.1.2.1 «Calcestruzzo confinato» [V]

La novità 2018 (Circolare C4.1.2.1.2.1: «La principale novità rispetto alle NTC precedenti è costituita dai diagrammi di progetto tensione-deformazione per il calcestruzzo confinato» [V]). Formule trascritte dal testo G.U., simboli ricostruiti [V]:

```
f_ck,c = f_ck (1,0 + 5,0 σ2/f_ck)        per σ2 ≤ 0,05 f_ck            [4.1.8]
f_ck,c = f_ck (1,125 + 2,5 σ2/f_ck)      per σ2 > 0,05 f_ck            [4.1.9]
ε_c2,c  = ε_c2 (f_ck,c/f_ck)²                                          [4.1.10]
ε_cu2,c = ε_cu + 0,2 σ2/f_ck                                           [4.1.11]
f_cd,c  = α_cc f_ck,c / γ_c                                            [4.1.12]
σ2 = α σ_l                                                             [4.1.12.a]
σ_l,x = A_st,x f_yk,st /(b_y s) ; σ_l,y = A_st,y f_yk,st /(b_x s)      [4.1.12.b]  (rettangolare)
σ_l = sqrt(σ_l,x σ_l,y)                                                [4.1.12.c]
σ_l = 2 A_st f_yk,st /(D0 s)                                           [4.1.12.d]  (circolare)
α = α_n α_s                                                            [4.1.12.e]
α_n = 1 − Σ b_i² /(6 b_x b_y) ; α_s = (1 − s/2b_x)(1 − s/2b_y)         [4.1.12.f-g]
α_n = 1 ; α_s = (1 − s/2D0)^β, β = 2 staffe, 1 spirale                 [4.1.12.h-i]
```

`b_x`, `b_y` alla linea media delle staffe; `b_i` interasse fra barre longitudinali consecutive **contenute**; `s` passo. Sono le stesse di EN 1992-1-1 §3.1.9 per (4.1.8)-(4.1.11) e di EN 1998-2 Annex E per la pressione [INF, la Circolare dice «in linea con l'UNI EN 1998-2» [V]].

Due regole d'uso che vincolano il modello a fibre, entrambe [V]: NTC §7.4.1 «si può tener conto dell'effetto del confinamento (v. § 4.1.2.1.2.1), purché si consideri la perdita dei copriferri al raggiungimento, in essi, della deformazione ultima di compressione del calcestruzzo non confinato (0,35%)» e tre strategie ammesse (trascurarlo / tutti gli elementi / solo secondari e zone dissipative allo spiccato); Circolare C4.1.2.1.2.1 «nelle analisi devono essere utilizzati legami diversi per il nucleo confinato e per le zone esterne alle staffe (copriferro)». È esattamente l'idioma core/cover di `BuildRCrectSection.tcl`.

### 3.2 Mander, Priestley, Park 1988 [V sul PDF]

Equazioni lette nel testo (numerazione dell'articolo):

```
f_c = f'cc x r /(r − 1 + x^r)                        (3)   Popovics
x = ε_c/ε_cc                                          (4)
ε_cc = ε_co [1 + 5 (f'cc/f'co − 1)]                   (5)   «generally ε_co = 0.002 can be assumed»
r = E_c/(E_c − E_sec)                                 (6)
E_c = 5000 sqrt(f'co)   MPa                           (7)
E_sec = f'cc/ε_cc                                     (8)
f'_l = k_e f_l                                        (9)
k_e = A_e/A_cc ; A_cc = A_c (1 − ρ_cc)                (10)(11)
A_e (rett.) = (b_c d_c − Σ (w'_i)²/6)(1 − s'/2b_c)(1 − s'/2d_c)     (21)
→ k_e = [1 − Σ(w'_i)²/(6 b_c d_c)] (1 − s'/2b_c)(1 − s'/2d_c) / (1 − ρ_cc)   (22)
f_lx = A_sx f_yh/(s d_c) = ρ_x f_yh ; f_ly = ρ_y f_yh (25)(26); f'_lx = k_e ρ_x f_yh (27)(28)
f'cc = f'co (−1,254 + 2,254 sqrt(1 + 7,94 f'_l/f'co) − 2 f'_l/f'co)   (29)  solo per f'_lx = f'_ly
```

Tre cose che la lettura del testo chiarisce e che le riscritture di seconda mano tacciono:
- la (29) vale «when the confined concrete core is placed in triaxial compression with **equal** effective lateral confining stresses» [V]; per sezione rettangolare con `f'_lx ≠ f'_ly` l'articolo rimanda alla **Fig. 4** (superficie di Willam-Warnke a cinque parametri), non a una formula. Esempio dell'articolo [V]: `f'co` 30, `f'_lx` 2,7, `f'_ly` 5,1 → `f'cc` = 1,65×30 = 49,5 MPa «by following the dotted line in Fig. 4». La sostituzione con la media (o con la minima) di `f'_lx` e `f'_ly` nella (29), che tutti i tool fanno, è un'approssimazione [INF];
- `w'_i` è la distanza **netta** fra barre e `s'` il passo **netto**, contro `b_i` interasse e `s` passo nelle NTC [V]; e Mander divide per (1 − ρ_cc), le NTC no. Le due `α`/`k_e` non coincidono per costruzione [INF];
- la deformazione ultima **non ha forma chiusa**: conclusione 5 verbatim «The ultimate concrete compressive strain of a section, defined as that strain at which first hoop fracture occurs, may be determined by tracing the work done on the confined concrete and longitudinal steel when deformed in compression. In this energy balance approach…» [V]. La formula `ε_cu = 0,004 + 1,4 ρ_s f_yh ε_su/f'cc` che la prassi attribuisce a Priestley, Seible, Calvi 1996 non è nell'articolo del 1988 e **non l'ho verificata su fonte primaria** [NON TROVATO].

Inoltre `E_c` = 5000√`f'co` (7) è 25 000 MPa per `f'co` 25 e 28 700 per 33 — sotto `E_cm` NTC di 20 % e 9 % [INF].

### 3.3 Esempio: pilastro 30×50, C25/30, B450C, 8φ20, staffe φ8/100 [INF, calcolato]

Ipotesi: copriferro netto 30 mm; nucleo alla linea media staffe `b_x` = 232, `b_y` = 432; 3 barre per faccia (8 totali, tutte contenute: staffa perimetrale + una legatura per direzione → 3 bracci φ8 = 150,8 mm² per direzione); `f_yk,st` 450; `Σ b_i²` = 4·116² + 4·216² = 240 448; `s'` = 92.

| grandezza | NTC [4.1.12] | Mander 1988 (media di `f'_lx`, `f'_ly`) |
|---|---|---|
| efficienza | `α_n` 0,600 · `α_s` 0,694 → **`α` = 0,416** | `k_e` = 0,460/(1−0,0251) = **0,472** |
| pressione laterale | `σ_l,x` 1,571 · `σ_l,y` 2,925 → `σ_l` 2,143 → `σ2` = **0,892** | `f'_lx` 0,742 · `f'_ly` 1,382 → `f'_l` = **1,062** |
| con `f_ck` = 25: resistenza confinata | `σ2/f_ck` 0,0357 ≤ 0,05 → `f_ck,c` = **29,46** (×1,178) | `f'cc` = **31,69** (×1,268) |
| picco | `ε_c2,c` = **0,00278** | `ε_cc` = **0,00468** |
| ultima | `ε_cu2,c` = **0,0106** | energia (nessuna forma chiusa); Priestley 1996 → 0,0189 [NON VERIFICATO] |

> **Nota del 05/09/2026 (T4, `nova/legami.py`).** I numeri della tabella idealizzano le barre d'angolo sullo
> spigolo della linea media delle staffe (`b_i` = 116 e 216). Il codice applica la [4.1.12.f] alla lettera, con le
> posizioni vere delle barre (`deck._barre`: angoli a ±102, ±202, cioè ~14 mm dentro lo spigolo): `Σb_i²` = 204 832,
> `α_n` = 0,659, **`α` = 0,457**, `σ2` = 0,980, `f_ck,c` = 29,90, `ε_cu2,c` = 0,01134. Sono i valori pinzati in
> `tests/test_legami.py`; la tabella resta come derivazione a mano. Regola in più del codice: senza una barra
> trattenuta entro `φ_st + φ/2 + 5 mm` da ogni spigolo del nucleo, `α` = 0 (nucleo = copriferro, con nota).
| con `f_cm` = 33 | `f_c,c` 37,46 (×1,135), `ε_c2,c` 0,00258, `ε_cu2,c` 0,0089 | `f'cc` 39,84 (×1,207), `ε_cc` 0,00407 |

Confronto con la prassi: `Kfc` 1,3 di Mazzoni è un segnaposto («mander model» in commento, nessun calcolo dalle staffe) [V]; 1,12 nel telaio FGU; 1,2 in `RCFrameGravity`. Il pilastro sopra, staffato come vuole §7.4.6 in CD"B", sta fra 1,14 e 1,27 [INF].

Righe `Concrete02` per il nucleo, veste media (`f_cm` 33), via NTC e via Mander:

```
; NTC [4.1.12]: fpc = -37.5, epsc0 = -0.00258 → Ec = 2·37,5/0,00258 = 29 000 MPa (92 % di E_cm)
uniaxialMaterial Concrete02 1  -37.5 -0.00258  -7.5 -0.0089   0.1  2.57  1282
; Mander: fpc = -39.8, epsc0 = -0.00407 → Ec = 19 600 MPa (62 % di E_cm)  ← vedi §3.4
uniaxialMaterial Concrete02 1  -39.8 -0.00407  -8.0 -0.0158   0.1  2.57  1282
```

### 3.4 L'incompatibilità Mander ↔ `Concrete02`, e il rimedio di Mazzoni

`Concrete02` è una parabola con `Ec` = 2 `fpc`/`epsc0`; Mander è una curva di Popovics con `Ec` indipendente e `ε_cc` che cresce con il confinamento. Mettere `ε_cc` di Mander in `epsc0` **abbassa** la rigidezza del nucleo proprio quando lo si confina di più: nell'esempio 19 600 MPa contro 28 700 di Mander stesso e 31 476 di `E_cm` [INF]. `LibMaterialsRC.tcl` lo evita ponendo `eps1C = 2·fc1C/Ec` [V] — cioè sceglie di conservare `Ec` e rinunciare a `ε_cc`. Le alternative pulite: `Concrete04` (Popovics, `Ec` esplicito, nota Mander nella doc) o `ConcreteCM`. Il legame NTC [4.1.10] soffre meno perché `ε_c2,c` cresce col quadrato di un rapporto vicino a 1 (0,00258 → 92 % di `E_cm`).

### 3.5 Formula EC8-3 nella Circolare

Per gli edifici esistenti la Circolare porta la forma dell'Annex A di EN 1998-3, qui per camicie d'acciaio ma dichiarata generale («come per le staffe») [V, C8.7.4 «Azione di confinamento», [C8.7.4.6]]:

```
f_cc = f_c [1 + 3,7 (0,5 α_n α_s ρ_s f_y / f_c)^0,86]
α_n = 1 − [(b−2R)² + (h−2R)²]/(3 b h) ; α_s = (1 − s/2b)(1 − s/2h)          [C8.7.4.7a-b]
```

e nella [C8.7.2.1] (rotazione ultima) il fattore `α` di confinamento [C8.7.2.2] è di nuovo `(1 − s_h/2b_o)(1 − s_h/2h_o)(1 − Σb_i²/(6 h_o b_o))` [V], identico ad `α_n α_s` di [4.1.12.f-g]. Tre formule per la resistenza confinata nello stesso corpo normativo (NTC [4.1.8-9], Circolare [C8.7.4.6], Mander per chi lo cita): il programma deve dire quale usa.

---

## 4. La veste delle resistenze

### 4.1 Cosa dicono NTC 2018 e Circolare, articolo per articolo

| dove | testo (verbatim o sintesi fedele) | veste |
|---|---|---|
| NTC §4.1.1.1 Analisi elastica lineare [V] | «valori medi del modulo d'elasticità» | media (solo `E`) |
| NTC §4.1.1.3 Analisi non lineare [V] | «Al materiale si può attribuire un diagramma tensioni-deformazioni che ne rappresenti adeguatamente il comportamento reale, verificando che le sezioni dove si localizzano le plasticizzazioni siano in grado di sopportare allo stato limite ultimo tutte le deformazioni non elastiche derivanti dall'analisi, tenendo in appropriata considerazione le incertezze» | **non detto** |
| NTC §4.1.2.1.2.1 [V] | «modelli … definiti in base alla resistenza di progetto fcd e alla deformazione ultima di progetto εcu» | progetto — ma è il diagramma per la **verifica di sezione** SLU |
| NTC §4.1.2.1.2.1 confinato [V] | [4.1.8]-[4.1.11] in `f_ck`, `f_yk,st`; [4.1.12] `f_cd,c` = `α_cc f_ck,c/γ_c` | caratteristica per il legame, poi progetto per la verifica |
| NTC §4.1.2.3.9.3 (stabilità elementi snelli, «Analisi non lineare») [V] | «parametri: fck …; Ecd = Ecm/γCE con γCE = 1,2; fyk …; Es» | caratteristica + `E` di progetto (γ_CE) |
| NTC §7.3.1 «Analisi non lineare» [V] | «Nei sistemi strutturali a comportamento dissipativo i legami costitutivi utilizzati devono tener conto anche della riduzione di resistenza e della resistenza residua, se significative» | non detto |
| NTC §7.3.4, §7.3.4.1, §7.3.4.2 [V] | scopi, distribuzioni, punto di controllo, confronto con la modale | **non detto** [NON TROVATO] |
| NTC §7.4.1 [V] | confinamento ammesso con perdita del copriferro a 0,35 % | — |
| Circolare C7.3.4.1 [V] | «I modelli … devono rispettare i requisiti del § 7.2.6 delle NTC … corretta rappresentazione … in termini di rigidezza, resistenza, e di comportamento post-elastico … capacità dissipativa per isteresi e … degrado» | non detto |
| Circolare C4.1.2.1.2.1 [V] | «Nell'utilizzo del legame tensione-deformazione del calcestruzzo confinato proposto dalle NTC, le resistenze dei materiali sono quelle caratteristiche, a meno di specifiche indicazioni riportate in altri Capitoli delle NTC o della circolare, quali ad esempio quelle relative alle verifiche di resistenza e di duttilità nelle costruzioni esistenti.» E per il legame con softening dell'Annex E di EN 1998-2: «deve essere utilizzato riferendosi a resistenze caratteristiche, medie o di calcolo, in funzione del tipo di verifica da eseguire» | caratteristica di default; **le tre vesti sono tutte previste** |
| Circolare C7.4.4 [V] | «per tener conto del degrado ciclico dei materiali, gli stessi coefficienti parziali γc e γs delle condizioni non sismiche»; confinamento «utilizzando modelli adeguati, così come specificato al Capitolo 4» | progetto per le verifiche di resistenza |
| Circolare C8.7.2.2 (esistenti) [V] | «Nel caso di analisi lineare con fattore di struttura q o di analisi non lineare, per gli elementi duttili la capacità si valuta dividendo le proprietà dei materiali esistenti per il fattore di confidenza FC, per gli elementi fragili … sia per il fattore di confidenza FC sia per il coefficiente parziale. Per i materiali nuovi o aggiunti si impiegano i valori di progetto.» | media/FC (duttili), media/FC/γ (fragili) |
| Circolare C8.5.4.2 [V] | i FC «vengono applicati ai valori medi delle resistenze dei materiali ottenuti dai campioni» | media |
| Circolare [C8.7.2.1] [V] | «fc, fy e fyw … ottenute come media delle prove eseguite in sito … divise per il fattore di confidenza» | media/FC |

Lettura d'insieme [INF]: per l'**edificio nuovo** le NTC non scrivono mai quale veste alimenta il modello di un'analisi non lineare (§4.1.1.3 e §7.3.4 tacciono). La Circolare, nell'unico punto in cui parla di legami per l'analisi, dice «caratteristiche» come default e ammette le altre due «in funzione del tipo di verifica». Per l'**edificio esistente** il quadro è esplicito e coincide con EC8-3: medie da prove, divise per FC. Il §4.1.2.3.9.3 è l'unico punto dove un'analisi non lineare di norma prescrive i parametri, e sceglie `f_ck` con `E_cd` = `E_cm`/1,2 — ma è il caso della stabilità, non della sismica.

### 4.2 Eurocodice 8

EN 1998-1:2004 §4.3.3.4.1(4), verbatim [V]: «Unless otherwise specified, element properties should be based on mean values of the properties of the materials. For new structures, mean values of material properties may be estimated from the corresponding characteristic values on the basis of information provided in EN 1992 to EN 1996 or in material ENs.» Quindi per EC8 la risposta è netta: **medie**, con `f_cm` = `f_ck` + 8 da EN 1992-1-1 Tab. 3.1 (= NTC [11.2.2]). Per l'acciaio EN 1992 non dà `f_ym` [NON TROVATO], e la frase «may be estimated» resta senza numero.

EN 1998-3:2005 non letto [NON TROVATO]. Fardis (JRC, 2015) [V sulle slide]: «limited knowledge … Confidence factor, equal to 1.35, corrects mean material strengths … (division or multiplication, whatever is less favorable)»; normal 1,2; full: medie senza CF. È lo schema che la Circolare C8.7.2.2 riprende.

### 4.3 Cosa fa la prassi OpenSees

Nessuno degli esempi pubblicati letti (§5) dichiara la veste: usano `fc` «nominal» (Mazzoni: 4 ksi), `f'c` (RCFrameGravity: 5-6 ksi), `f_c` 25 MPa (FGU). Il 25 di FGU coincide con `f_ck` di C25/30, non con `f_cm`; il 420 dell'acciaio è il grado nominale. **Nessun esempio usa valori di progetto** (`f_cd`, `f_yd`) [V per assenza]. Quando la letteratura di valutazione sismica (EC8-3, FEMA, ASCE 41) alimenta un modello a fibre, usa medie o «expected» — non l'ho verificato su primaria in questa sessione [NON TROVATO].

---

## 5. Esempi pubblicati con numeri

**1. `LibMaterialsRC.tcl` — Mazzoni & McKenna 2006, wiki Berkeley Ex. 5-9** [V, file scaricato]. Unità kip-in.

```
set fc  [expr -4.0*$ksi]                 ; # −27,6 MPa
set Ec  [expr 57*$ksi*sqrt(-$fc/$psi)]   ; # ACI 57000√f'c psi → 3 605 ksi = 24 900 MPa
set Kfc 1.3 ; set Kres 0.2
set fc1C [expr $Kfc*$fc]                 ; # CONFINED concrete (mander model), maximum stress
set eps1C [expr 2.*$fc1C/$Ec]            ; # strain at maximum stress  → −0,00288
set fc2C [expr $Kres*$fc1C] ; set eps2C [expr 20*$eps1C]   ; # −0,0577
set lambda 0.1
set fc1U $fc ; set eps1U -0.003 ; set fc2U [expr $Kres*$fc1U] ; set eps2U -0.01
set ftC [expr -0.14*$fc1C] ; set ftU [expr -0.14*$fc1U] ; set Ets [expr $ftU/0.002]
uniaxialMaterial Concrete02 $IDconcCore  $fc1C $eps1C $fc2C $eps2C $lambda $ftC $Ets
uniaxialMaterial Concrete02 $IDconcCover $fc1U $eps1U $fc2U $eps2U $lambda $ftU $Ets
set Fy [expr 66.8*$ksi] ; set Es [expr 29000.*$ksi] ; set Bs 0.01 ; set R0 18 ; set cR1 0.925 ; set cR2 0.15
uniaxialMaterial Steel02 $IDSteel $Fy $Es $Bs $R0 $cR1 $cR2
```

`BuildRCrectSection.tcl` (Mazzoni 2006 da Scott 2003) [V]: `proc BuildRCrectSection {id HSec BSec coverH coverB coreID coverID steelID numBarsTop barAreaTop numBarsBot barAreaBot numBarsIntTot barAreaInt nfCoreY nfCoreZ nfCoverY nfCoverZ}` — un `patch quadr` per il nucleo, quattro per il copriferro, quattro `layer straight`; «The core concrete ends at the NA of the reinforcement». Le staffe **non entrano**: il confinamento è tutto in `coreID` (§3.4 di `ricerca-armature-opensees-fibre.md` confermato).

**2. `RCFrameGravity` — OpenSeesPy doc 14.1.5** [V]. Unità kip-in, pilastro 15×24 in, copriferro 1,5 in, barre #7 (0,60 in²):

```
uniaxialMaterial('Concrete01', 1, -6.0, -0.004, -5.0, -0.014)   # core, confined  (K = 1,2; ε_cu 0,014)
uniaxialMaterial('Concrete01', 2, -5.0, -0.002,  0.0, -0.006)   # cover
uniaxialMaterial('Steel01',    3, 60.0, 30000.0, 0.01)          # fy 414 MPa, E 207 GPa
```

**3. *Reinforced Concrete 3D Frame (FGU)* — Namadchi 2022, da F. Gutiérrez Urzúa** [V, notebook]. Metrico, il più vicino alla pratica europea:

```
f_c_1 = -25*MPa ; f_c_2 = -28*MPa ; eps_c = -0.002 ; eps_u = -0.02 ; f_y = 420*MPa ; E_s = 210*GPa
Concrete02: fpc=f_c, epsc0=eps_c, fpcu=0.2*f_c, epsU=eps_u, lamda=0.1, ft=-0.1*f_c, Ets=ft/0.002
Steel02:    Fy=f_y, E0=E_s, b=0.005, R0=20.0, cR1=0.925, cR2=0.15
sezioni: trave 300×600, pilastro 300×400, copriferro 40, φ25
```

`Kfc` = 1,12; `Ec` implicito = 2·25/0,002 = 25 000 MPa; stesso `eps_u` per nucleo e copriferro (0,02) — scelta di convergenza, non di fisica [INF].

**4. OpenSeesPyDoc Example 4 `InelasticFiberSectionPortal2Dframe.py`** [V, raw]: traduzione Python di Mazzoni, solo non confinato: `fc −4 ksi`, `eps1U −0,003`, `fc2U 0,2 fc`, `eps2U −0,05`, `λ 0,1`, `ftU 0,14 fc`, `Ets ftU/0,002`; `Steel02 66,8 ksi / 29 000 ksi / R0 18 / 0,925 / 0,15`.

**5. opstool `mc_analysis`** [V, doc]: `Concrete04` copriferro `fc −32,4, ec −0,002, ecu −0,0042`, nucleo `fc −40,6, ec −0,004079, ecu −0,0144, Ec 3,55e7` (unità non dichiarate nella pagina; rapporto K = 1,25); `Steel01 300 / 2e8 / 0,01`; risultati `φ_y` 0,0017, `M_y` 20 680, `φ_u` 0,0434 con soglia nucleo −0,0144.

Cinque esempi, cinque `K` (1,12 · 1,2 · 1,25 · 1,3 · —) e nessuno calcolato dalle staffe nel file: il confinamento in prassi è un numero dichiarato a monte, come diceva `ricerca-armature-opensees-fibre.md` §3.4.

---

## 6. Domande aperte

1. **`f_ym` del B450C.** Nessun valore in NTC/Circolare/EN 1992 [NON TROVATO]. Tab. 11.3.Ib limita `(f_y/f_y,nom)_k` ≤ 1,25 al 10 %; JCSS/fib MC2010 danno stime probabilistiche non consultate. Da decidere: 450 (caratteristico, conservativo) o `1,1÷1,15·f_yk` dichiarato come assunzione.
2. **Sezione rettangolare in Mander.** La (29) vale solo per `f'_lx` = `f'_ly`; la Fig. 4 non ha forma chiusa nell'articolo. Media, minimo o Chang-Mander 1994: scelta di modellazione da esplicitare.
3. **Deformazione ultima del nucleo.** NTC [4.1.11] (0,0106 nell'esempio) contro bilancio energetico di Mander (nessuna forma chiusa) contro Priestley 1996 (0,0189, non verificata). Decide dove la pushover «cade».
4. **`epsU` del copriferro**: 0,0035 (lettera di §7.4.1) o 0,006-0,01 (prassi, convergenza).
5. **`E_s`** 200 000 o 210 000: già aperta in `ricerca-ntc-2018…` §2.3 e §10.2.
6. **EN 1998-3** letto solo per interposta persona; **ConcreteCM** doc ufficiale non raggiunta; **paper italiani** con C25/30-B450C in OpenSees non cercati (budget di ricerca esaurito).
7. **`Concrete02` o `Concrete04`** per il nucleo: dipende dalla risposta a (2)-(3) e dal peso che si dà alla rigidezza del nucleo (§3.4).

---

## 7. Raccomandazione (non decisione)

**Veste.** Per l'analisi non lineare (pushover §7.3.4.2, dinamica §7.3.4.1) di un **edificio nuovo**: modello a fibre con **valori medi** — `f_cm` = `f_ck` + 8, `E_cm` [11.2.5], `f_ctm` [11.2.3a]; acciaio `f_yk` = 450 finché `f_ym` non ha una fonte (domanda 1). Motivi: è l'unica prescrizione esplicita esistente (EN 1998-1 §4.3.3.4.1(4)); le NTC tacciono ma prescrivono `E` medio per l'analisi (§4.1.1.1) e la Circolare ammette le medie «in funzione del tipo di verifica»; ed è l'unica veste con cui `Concrete02` e `ε_c2` = 0,002 restituiscono `E_cm` (§1.3). **Mai `f_cd`/`f_yd` dentro il legame**: dimezza la rigidezza e non ha nessuna fonte. Le **verifiche** restano con la veste che il loro articolo prescrive: `f_cd`, `f_yd`, `f_cd,c` per resistenza e duttilità di sezione (§4.1.2, C7.4.4); medie/FC (duttili) e medie/FC/γ (fragili) per l'esistente (C8.7.2.2). Quindi la veste non è una costante del programma ma un **campo del materiale** con quattro valori — `caratteristica | media | progetto | esistente(FC)` — scelto per analisi (default `media`) e per verifica (default dall'articolo), stampato nella relazione §10.2.1 accanto al numero.

**Materiali.** Copriferro `Concrete02(−f_cm, −2·f_cm/E_cm, −0,2 f_cm, −0,0035 o −0,01, 0,1, f_ctm, f_ctm/0,002)`; nucleo con `f_c,c` ed `ε_c2,c` da **NTC [4.1.8]-[4.1.12.i]** come default (norma primaria, stessa `α` della Circolare C8, rigidezza del nucleo entro l'8 % di `E_cm`), `ε_cu2,c` [4.1.11]; Mander 1988 come opzione, e se Mander allora **`Concrete04`** con `Ec` = `E_cm` (§3.4). Acciaio `Steel02(450, 200000, 0,005, 18, 0,925, 0,15)` con controllo a valle delle fibre a `ε_ud` = 0,0675. Ingressi che il modello dati deve avere per il nucleo: `b_x, b_y` (da copriferro e φ staffa), `A_st,x, A_st,y` (bracci), `s`, elenco `b_i` (o «tutte contenute»), `f_yk,st` — nessuno misurabile, tutti dichiarati, come già in `08-modelli-dati-riferimento.md` (armatura costruttiva → fibre derivate).

**Oracoli per il codice** (da `calc_legami.py`, [INF]): C25/30 media → `E_c` = 2·33/0,0021 = 31 429 ≈ `E_cm` 31 476; pilastro 30×50 φ8/100 → `α` = 0,416, `σ2` = 0,892, `f_ck,c` = 29,46, `ε_cu2,c` = 0,0106; B450C `k` = 1,15 → `b` = 0,0045.

> Misurati poi in `nova/legami.py` con le posizioni vere delle barre e `f_y` al posto di `f_yd` (note ai §2 e §3.3):
> `α` = 0,457, `σ2` = 0,980, `f_ck,c` = 29,90, `ε_cu2,c` = 0,01134, `b` = 0,00517.

---

## Fonti

- NTC 2018, DM 17/01/2018, G.U. n. 42 del 20/02/2018 S.O. 8 — §4.1.1.1, §4.1.1.3, §4.1.2.1.2.1-2, §4.1.2.3.9.3, §7.3.1, §7.3.4-7.3.4.2, §7.4.1, §11.2.10, §11.3.2.
- Circolare 21/01/2019 n. 7 C.S.LL.PP., G.U. n. 35 del 11/02/2019 S.O. 5 — C4.1.2.1.2.1, C4.1.2.2.5, C7.3.4.1-2, C7.4, C7.4.4, C8.5.4.2, C8.7.2.2, C8.7.2.3.2, C8.7.4.
- EN 1998-1:2004 §4.3.3.4.1 — https://www.phd.eng.br/wp-content/uploads/2015/02/en.1998.1.2004.pdf
- M.N. Fardis, *EN 1998-3: Seismic assessment and retrofitting of existing buildings*, JRC Balkan WS 2015 — https://eurocodes.jrc.ec.europa.eu/sites/default/files/2022-06/1130_Eurocodes_Third_Balkan_WS_MNFardis.pdf
- Mander J.B., Priestley M.J.N., Park R. (1988), DOI 10.1061/(ASCE)0733-9445(1988)114:8(1804) — copia https://web.itu.edu.tr/darilmazk/file/Mander_Priestley_Park_StressStrainModelforConfinedConcrete.pdf
- OpenSees doc: https://opensees.github.io/OpenSeesDocumentation/user/manual/material/uniaxialMaterials/Concrete02.html · …/Steel02.html · …/Concrete04.html · https://openseespydoc.readthedocs.io/en/latest/src/Concrete02.html · …/ConcreteCM.html
- Sorgente: https://raw.githubusercontent.com/OpenSees/OpenSees/master/SRC/material/uniaxial/Concrete02.cpp · …/Steel02.cpp · PR https://github.com/OpenSees/OpenSees/pull/644
- M.H. Scott, *Making Sense Out of Concrete02* — https://portwooddigital.com/2021/08/22/making-sense-out-of-concrete02/ (redirect da openseesdigital.com)
- `LibMaterialsRC.tcl` https://opensees.berkeley.edu/wiki/images/c/cb/LibMaterialsRC.tcl · `BuildRCrectSection.tcl` https://opensees.berkeley.edu/wiki/images/f/f8/BuildRCrectSection.tcl · Ex. 5 https://opensees.berkeley.edu/wiki/index.php/OpenSees_Example_5._2D_Frame,_3-story_3-bay,_Reinforced-Concrete_Section_%26_Steel_W-Section
- `RCFrameGravity` https://openseespydoc.readthedocs.io/en/latest/src/RCFrameGravity.html · Example 4 https://github.com/zhuminjie/OpenSeesPyDoc/blob/master/pyExamples/EarthquakeExamples/Example4/InelasticFiberSectionPortal2Dframe.py
- FGU 3D frame https://github.com/AmirHosseinNamadchi/OpenSeesPy-Examples/blob/master/Reinforced%20Concrete%203D%20Frame%20(FGU).ipynb
- opstool https://opstool.readthedocs.io/en/latest/src/analysis/mc_analysis.html
- In casa: `docs/ricerca/01`, `05`, `06`, `08`; `~/GitHub/Tesi/docs/validazione/ricerca-armature-opensees-fibre.md`, `ricerca-ntc-2018-numeri-per-il-catalogo.md`.
