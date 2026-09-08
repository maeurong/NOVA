# 14 — Studio italiano: combinazioni NTC, verifiche c.a., relazione §10.2.1, SAF, spettro

Ricerca del 08/09/2026 per il ticket [#37](https://github.com/maeurong/NOVA/issues/37) (blocco T8, figlio di #31).
Approfondisce — **non ripete** — `06-dominio-analisi-verifiche-formati.md` §3-§5 e `09-legami-costitutivi-ntc.md`.

Tag: **[V]** verificato su fonte primaria · **[M]** misurato in sessione col comando · **[INF]** inferenza · **[R]** da riscontrare · **[NON TROVATO]**.
Virgola decimale fuori dalle citazioni verbatim.

**Come sono state lette le NTC.** Il corpus ri-convertito è
`~/Backup-vault/current/NTC 2018 con circolari/riconversione-2026-09-07/` (`ntc2018.md`, `circolare2019.md`),
lo stesso che usa `norme-reviewer`. Il suo `LEGGIMI.md` avverte che **le formule di `ntc2018.md` sono [R]
finché non confrontate col PDF** e che **le formule di `circolare2019.md` sono inaffidabili**. Perciò ogni
formula qui sotto è stata riestratta dai PDF ufficiali in `fonte/` con `pdftotext -layout` [M] e citata con
il **numero di pagina della Gazzetta Ufficiale**, che è stabile; la riga di `ntc2018.md` è riportata dove
serve al `norme-reviewer`. La skill `ntc2018-expert` **non era invocabile** (non sta in `~/.claude/skills/`):
la fonte è il corpus letto per percorso, come il file del reviewer prescrive di dichiarare.

Riscontro fatto e riuscito: `[2.5.1]`-`[2.5.7]`, Tab. 2.5.I, Tab. 2.6.I, `[3.2.2]`-`[3.2.9]`, Tab. 3.2.IV/V,
`[4.1.3]`-`[4.1.7]`, `[4.1.13]`-`[4.1.17]`, `[4.1.18a]`-`[4.1.30]`, `[4.1.45]`-`[4.1.46]`, `[7.3.8]`-`[7.3.15]`,
`[7.4.1]`-`[7.4.12]`, Tab. 7.2.I, §10.1-§10.2.2 — tutte leggibili nel PDF e coincidenti col corpus. Restano
**[NON TROVATO] nel testo estratto** la `[C4.1.6]` della Circolare (ε_sm: è un'immagine nel PDF, p. 87) e la
`[C4.1.4]` (snellezza limite l/h).

---

## 1. Generatore di combinazioni NTC 2018 §2.5.3

### 1.1 Le sei combinazioni, verbatim dal PDF

NTC 2018 §2.5.3, GU p. 39 (`ntc2018.md:1547`) [V]:

| # | nome NTC | espressione | uso dichiarato dalla norma |
|---|---|---|---|
| `[2.5.1]` | fondamentale | γ_G1·G₁ + γ_G2·G₂ + γ_P·P + γ_Q1·Q_k1 + γ_Q2·ψ₀₂·Q_k2 + γ_Q3·ψ₀₃·Q_k3 + … | SLU |
| `[2.5.2]` | caratteristica (rara) | G₁ + G₂ + P + Q_k1 + ψ₀₂·Q_k2 + ψ₀₃·Q_k3 + … | SLE irreversibili |
| `[2.5.3]` | frequente | G₁ + G₂ + P + ψ₁₁·Q_k1 + ψ₂₂·Q_k2 + ψ₂₃·Q_k3 + … | SLE reversibili |
| `[2.5.4]` | quasi permanente | G₁ + G₂ + P + ψ₂₁·Q_k1 + ψ₂₂·Q_k2 + ψ₂₃·Q_k3 + … | effetti a lungo termine |
| `[2.5.5]` | sismica | E + G₁ + G₂ + P + ψ₂₁·Q_k1 + ψ₂₂·Q_k2 + … | SLU **e** SLE connessi a E |
| `[2.5.6]` | eccezionale | G₁ + G₂ + P + A_d + ψ₂₁·Q_k1 + ψ₂₂·Q_k2 + … | SLU per azioni eccezionali |

Attenzione al **ψ₁₁ solo sull'azione dominante** nella frequente: dal secondo termine in poi si torna a ψ₂ⱼ.
È esattamente il testo stampato, non un refuso dell'estrattore (riscontrato sul PDF).

Le masse sismiche non sono una combinazione ma una **regola a parte**, `[2.5.7]`: G₁ + G₂ + Σⱼ ψ₂ⱼ·Q_kj [V].
Due frasi vincolanti nello stesso paragrafo: «vengano omessi i carichi Q_kj che danno un contributo
**favorevole** ai fini delle verifiche e, se del caso, i carichi G₂» e «il simbolo "+" vuol dire
"combinato con"» [V].

### 1.2 Tab. 2.5.I — coefficienti ψ (GU p. 38, `ntc2018.md:1532`) [V]

| categoria / azione | ψ₀ⱼ | ψ₁ⱼ | ψ₂ⱼ |
|---|---|---|---|
| A — residenziale | 0,7 | 0,5 | 0,3 |
| B — uffici | 0,7 | 0,5 | 0,3 |
| C — ambienti suscettibili di affollamento | 0,7 | 0,7 | 0,6 |
| D — ambienti ad uso commerciale | 0,7 | 0,7 | 0,6 |
| E — immagazzinamento, biblioteche, archivi, magazzini, industriale | 1,0 | 0,9 | 0,8 |
| F — rimesse/parcheggi, autoveicoli ≤ 30 kN | 0,7 | 0,7 | 0,6 |
| G — rimesse/parcheggi, autoveicoli > 30 kN | 0,7 | 0,5 | 0,3 |
| H — coperture accessibili per sola manutenzione | 0,0 | 0,0 | 0,0 |
| I — coperture praticabili · K — coperture per usi speciali | **da valutarsi caso per caso** | | |
| Vento | 0,6 | 0,2 | 0,0 |
| Neve, quota ≤ 1000 m s.l.m. | 0,5 | 0,2 | 0,0 |
| Neve, quota > 1000 m s.l.m. | 0,7 | 0,5 | 0,2 |
| Variazioni termiche | 0,6 | 0,5 | 0,0 |

**Le categorie I e K non hanno un ψ.** La norma dice testualmente «da valutarsi caso per caso»: un
generatore che ci mette dentro 0,7 di default sta inventando. È un ingresso degenere del generatore, non
un dettaglio.

### 1.3 Tab. 2.6.I — coefficienti parziali γ_F (§2.6.1, GU p. 40, `ntc2018.md:1591`) [V]

| | | EQU | A1 (STR) | A2 (GEO) |
|---|---|---|---|---|
| γ_G1 permanenti strutturali | favorevoli | 0,9 | 1,0 | 1,0 |
| | sfavorevoli | 1,1 | 1,3 | 1,0 |
| γ_G2 permanenti non strutturali | favorevoli | 0,8 | 0,8 | 0,8 |
| | sfavorevoli | 1,5 | 1,5 | 1,3 |
| γ_Qi variabili | favorevoli | 0,0 | 0,0 | 0,0 |
| | sfavorevoli | 1,5 | 1,5 | 1,3 |

γ_P = 1,0 [V]. Nota (1) della tabella: se i permanenti non strutturali sono **ben definiti in fase di
progetto**, per essi si possono adottare i γ dei permanenti strutturali [V]. Per componenti che non
coinvolgono azioni geotecniche si usa **A1** [V] — che è il caso di un telaio in elevazione, cioè il caso di
NOVA. EQU e A2 servono a ribaltamento e fondazioni, fuori dal perimetro T8.

Il γ_Q **favorevole vale 0,0**: «omettere il carico variabile favorevole» e «moltiplicarlo per zero» sono la
stessa cosa, e il generatore può implementare l'omissione come coefficiente nullo senza cambiare la
semantica. Sui permanenti no: 0,9 e 1,0 non sono 0.

### 1.4 Sismica: la regola del ±30 % e le sue permutazioni

NTC §7.3.5, GU p. 221 (`ntc2018.md:4681`) [V]. Testo: «La risposta è calcolata unitariamente per le tre
componenti, applicando l'espressione **1,00·E_x + 0,30·E_y + 0,30·E_z** `[7.3.10]`. Gli effetti più gravosi
si ricavano dal confronto tra le **tre combinazioni ottenute permutando circolarmente** i coefficienti
moltiplicativi. In ogni caso: la componente verticale deve essere tenuta in conto unicamente nei casi
previsti al §7.2.2.»

Tre cose che la norma **non** dice e che vanno decise dal programma, non dedotte:

- **I segni.** §7.3.5 scrive coefficienti positivi. Con analisi modale a spettro le E sono grandezze
  quadratiche, senza segno: il segno lo mette chi combina. La pratica corrente e i codici commerciali usano
  ±, cioè 4 combinazioni di segno per ogni permutazione orizzontale [INF; la riga non esiste né nelle NTC
  né nella Circolare: **[NON TROVATO]** sull'articolo].
- **Quante permutazioni.** «Permutando circolarmente» su tre componenti dà 3 combinazioni. Se la verticale
  non serve (§7.2.2), restano 2 permutazioni orizzontali (1,00 E_x + 0,30 E_y e 0,30 E_x + 1,00 E_y).
- **L'eccentricità accidentale** è una *terza* moltiplicazione, non un caso di carico in più della
  combinazione: §7.2.6 (GU p. 205) impone e ≥ 0,05·L per gli edifici, «costante per entità e direzione su
  tutti gli orizzontamenti»; §7.3.3 (GU p. 218) dice che l'effetto si applica come **momenti torcenti
  statici** di piano [V]. Per un telaio piano 2D questa voce **non si applica** e va dichiarata assente, non
  silenziosamente saltata.

Combinazione modale: §7.3.3.1 (GU p. 218) prescrive la **CQC** `[7.3.4]` E = √(Σⱼ Σᵢ ρᵢⱼ Eᵢ Eⱼ), con ρᵢⱼ
dato dalla `[7.3.5a]` e, per smorzamenti uguali, dalla `[7.3.5b]`; β_ij = T_j/T_i [V]. Massa partecipante:
**tutti i modi con massa > 5 %** e un numero di modi con massa totale **> 85 %** [V] — conferma la
correzione già registrata in `06` §2 contro il 90 % che gira nei documenti di Tesi.

### 1.5 Quante combinazioni escono, e come si enumerano

La norma non dà un algoritmo. Dà i vincoli; l'enumerazione è **[INF]** con questi appoggi:

- per ogni azione variabile presente si genera una `[2.5.1]` con quella come **dominante** (γ_Q pieno) e le
  altre con ψ₀ⱼ: m combinazioni fondamentali con m variabili;
- per ogni combinazione i permanenti vanno provati **sfavorevoli e favorevoli** dove il loro effetto può
  invertirsi (mensole, sollevamento): ×2 su G₁ e su G₂, se il modello non sa dire il segno dell'effetto a
  priori;
- i variabili favorevoli si omettono (γ_Q = 0): l'insieme completo dei sottoinsiemi sarebbe 2^m, ma **il
  caso che governa è già coperto** dall'omissione in fase di verifica, non dall'enumerazione a monte;
- SLE: una caratteristica e una frequente per ogni dominante, una sola quasi permanente;
- sismica: 2 (o 3) permutazioni × 4 (o 2) segni × 2 direzioni, per ciascuno stato limite sismico richiesto
  (SLV per resistenza, SLD per rigidezza — §7.3.6.1).

**Inviluppo e caso che governa.** La norma non definisce «inviluppo». Lo impone solo come
rappresentazione: §10.2.1 chiede «i **diagrammi di inviluppo** associati alle combinazioni dei carichi
considerate» [V]. Perciò l'inviluppo è per grandezza e per stazione, e ogni valore d'inviluppo deve
**portare con sé il nome della combinazione che lo produce**: altrimenti la figura richiesta dal §10.2.1
non è tracciabile fino al numero.

### 1.6 Cosa c'è già in NOVA e cosa manca

`nova/modello.py:262-288` (letto in sessione) ha `Azione(natura: G1|G2|Q|E, categoria)` con il validatore
`_q_ha_la_categoria` che rifiuta una `Q` senza categoria d'uso, `Termine(azione, coefficiente)` e
`Combinazione(termini, tipo: fondamentale|caratteristica|frequente|quasi_permanente|sismica, generata: bool)`.
Le cinque `tipo` **coincidono una a una** con `[2.5.1]`-`[2.5.5]`; manca `[2.5.6]` eccezionale, che per T8
non serve. Il campo `generata` esiste già per distinguere ciò che il generatore produce da ciò che l'utente
scrive a mano.

Manca invece **il dato**: la ricerca di `psi` e `ψ` dentro `nova/*.py` non trova nulla [M] — Tab. 2.5.I e
Tab. 2.6.I non sono nel pacchetto. Manca anche la natura `P` (precompressione), che per c.a. ordinario non
serve, e manca un campo per l'**approccio** (A1/A2/EQU): oggi `Combinazione` non sa dire con quale colonna
di Tab. 2.6.I è stata generata, e la relazione §10.2.1 deve dirlo.

---

## 2. Verifiche c.a. — SLU e SLE del §4.1.2

### 2.1 Resistenze di progetto (§4.1.2.1.1, GU p. 72) [V]

| grandezza | formula | articolo | costanti fissate dalla norma |
|---|---|---|---|
| f_cd | α_cc · f_ck / γ_c | `[4.1.3]` | γ_c = 1,5 · **α_cc = 0,85** |
| f_ctd | f_ctk / γ_c | `[4.1.4]` | γ_c = 1,5 |
| f_yd | f_yk / γ_s | `[4.1.5]` | **γ_s = 1,15 sempre, per tutti gli acciai** |
| f_bd | f_bk / γ_c | `[4.1.6]` | γ_c = 1,5 |
| f_bk | 2,25 · η₁ · η₂ · f_ctk | `[4.1.7]` | η₁ = 1,0 buona aderenza / 0,7 no · η₂ = 1,0 per Φ ≤ 32 mm, (132−Φ)/100 oltre |

γ_c scende a 1,4 solo per produzioni continuative sotto controllo con CoV ≤ 10 % e sistema di qualità
§11.8.3 [V] — non è il caso di un telaio gettato in opera. Elementi piani gettati in opera di spessore
< 50 mm: f_cd e f_ctd ridotte a 0,80 [V].

Valori medi collegati, §11.2.10 (GU p. 313): f_ctm = 0,30·f_ck^(2/3) per classi ≤ C50/60 `[11.2.3a]`,
f_ctk,0.05 = 0,7·f_ctm e f_ctk,0.95 = 1,3·f_ctm, E_cm = 22.000·[f_cm/10]^0,3 N/mm² `[11.2.5]` [V].

Diagrammi (§4.1.2.1.2.1, GU p. 73): per classi ≤ C50/60 **ε_c2 = 0,20 %, ε_cu = 0,35 %, ε_c3 = 0,175 %,
ε_c4 = 0,07 %**; parabola-rettangolo (a), triangolo-rettangolo (b), stress block (c). Per compressione
approssimativamente uniforme si assume **ε_c2 al posto di ε_cu** [V] — è la regola che fa quadrare i
pilastri poco eccentrici. Acciaio (§4.1.2.1.2.2): ε_ud = 0,9·ε_uk, modelli bilineare incrudente (a) o
elastico-perfettamente plastico (b) [V]. Il confinamento `[4.1.12.b]`-`[4.1.12.i]` è già sviscerato in
`09-legami-costitutivi-ntc.md` e non si ripete.

### 2.2 SLU — pressoflessione (§4.1.2.3.4, GU p. 77-78) [V]

Ipotesi di base `4.1.2.3.4.1`: sezioni piane, perfetta aderenza acciaio-calcestruzzo, **resistenza a
trazione del calcestruzzo nulla** [V].

Verifiche `4.1.2.3.4.2`:

- `[4.1.18a]` M_Rd = M_Rd(N_Ed) ≥ M_Ed — il momento resistente è **funzione dello sforzo normale della
  combinazione**, non un numero per sezione;
- `[4.1.18b]` μ_Φ = μ_Φ(N_Ed) ≥ μ_Ed, richiesta solo dove il §7.4 la impone;
- **eccentricità minima**: per pilastri in compressione assiale si assume comunque M_Ed = e·N_Ed con
  e ≥ h_libera/200 e comunque **e ≥ 20 mm** [V]. In alternativa la Circolare C4.1.2.3.4.2 (GU Circ. p. 90)
  ammette N_Rd = 0,8·A_c·f_cd + A_s,tot·f_yd `[C4.1.11]` [V];
- **pressoflessione deviata** `[4.1.19]`: (M_Eyd/M_Ryd)^α + (M_Ezd/M_Rzd)^α ≤ 1, con ν = N_Ed/N_Rcd
  `[4.1.20]`, ω_t = A_t·f_yd/N_Rcd `[4.1.21]`, N_Rcd = A_c·f_cd. Per **sezioni rettangolari** α è tabellato:
  ν = 0,1 → α = 1,0 · ν = 0,7 → α = 1,5 · ν = 1,0 → α = 2,0, con interpolazione lineare; circolari ed
  ellittiche α = 2 [V];
- **duttilità di curvatura**: μ_Φ è il rapporto fra la curvatura a cui la resistenza flessionale cala del
  15 % (o si raggiunge ε_cu / ε_ud) e la curvatura convenzionale di prima plasticizzazione
  Φ_yd = (M_Rd/M'_yd)·Φ'_yd [V].

### 2.3 SLU — taglio (§4.1.2.3.5, GU p. 79) [V]

Senza armatura trasversale, `[4.1.23]`:

```
V_Rd = max{ [0,18·k·(100·ρ₁·f_ck)^(1/3)/γ_c + 0,15·σ_cp]·b_w·d ;  (v_min + 0,15·σ_cp)·b_w·d }
k = 1 + √(200/d) ≤ 2        v_min = 0,035·k^(3/2)·f_ck^(1/2)
ρ₁ = A_sl/(b_w·d) ≤ 0,02    σ_cp = N_Ed/A_c ≤ 0,2·f_cd     f_ck in MPa, d in mm
```

Con armatura trasversale, `[4.1.25]`-`[4.1.30]`:

```
1 ≤ cotg θ ≤ 2,5                                                   [4.1.25]
V_Rsd = 0,9·d·(A_sw/s)·f_yd·(cotg α + cotg θ)·sin α                [4.1.27]
V_Rcd = 0,9·d·b_w·α_c·ν·f_cd·(cotg α + cotg θ)/(1 + cotg²θ)        [4.1.28]   ν = 0,5
V_Rd  = min(V_Rsd, V_Rcd)                                          [4.1.29]
a₁ = (0,9·d·cotg θ)/2   traslazione del diagramma dei momenti      [4.1.30]
α_c = 1                     per membrature non compresse
    = 1 + σ_cp/f_cd         per 0 ≤ σ_cp < 0,25 f_cd
    = 1,25                  per 0,25 f_cd ≤ σ_cp ≤ 0,5 f_cd
    = 2,5 (1 − σ_cp/f_cd)   per 0,5 f_cd < σ_cp < f_cd
```

Nota di metodo che la norma mette per iscritto: «In presenza di significativi sforzi di trazione, la
resistenza a taglio del calcestruzzo è da considerarsi **nulla** e non è possibile adottare elementi
sprovvisti di armatura trasversale» [V]. E: le armature longitudinali agli appoggi devono assorbire uno
sforzo pari al taglio sull'appoggio, con fessure inclinate a 45° [V].

Armatura minima che rende ammissibile il calcolo, §4.1.6.1.1 (GU p. 84): A_s,min = 0,26·(f_ctm/f_yk)·b_t·d e
comunque ≥ 0,0013·b_t·d `[4.1.45]`; A_s,max = 0,04·A_c; staffe A_st ≥ 1,5·b mm²/m, **almeno tre staffe al
metro**, passo ≤ 0,8·d, almeno il 50 % del taglio affidato a staffe [V]. Pilastri §4.1.6.1.2: Φ ≥ 12 mm,
interasse ≤ 300 mm, A_s,min = max(0,10·N_Ed/f_yd; 0,003·A_c) `[4.1.46]`, staffe a passo
≤ min(12·Φ_long,min; 250 mm), Φ_staffa ≥ max(6 mm; ¼·Φ_long,max) [V].

### 2.4 SLE — tensioni, fessurazione, deformazione (§4.1.2.2, GU p. 75-77)

**Tensioni** §4.1.2.2.5 (`ntc2018.md:2195`) [V]:

```
σ_c,max ≤ 0,60·f_ck   combinazione caratteristica          [4.1.15]
σ_c,max ≤ 0,45·f_ck   combinazione quasi permanente        [4.1.16]
σ_s,max ≤ 0,80·f_yk   combinazione caratteristica          [4.1.17]
```

Elementi piani gettati in opera < 50 mm: limiti ridotti del 20 % [V]. La Circolare C4.1.2.2.5 (GU Circ.
p. 89) dà il metodo: sezione parzializzata, comportamento lineare, calcestruzzo teso trascurato,
E_s = 210.000 N/mm², e — se si vuole **una sola verifica indipendente dal tempo** — coefficiente di
omogeneizzazione **n = 15** [V].

**Fessurazione** §4.1.2.2.4 [V]. Tre stati limite in ordine di severità: decompressione (σ ovunque di
compressione, ≤ 0), formazione delle fessure (σ_t = f_ctm/1,2, `[4.1.13]`), apertura delle fessure con
**w₁ = 0,2 mm, w₂ = 0,3 mm, w₃ = 0,4 mm**. Combinazioni ammesse: **frequente e quasi permanente**
(§4.1.2.2.4.1). Condizioni ambientali → Tab. 4.1.III: ordinarie X0/XC1/XC2/XC3/XF1; aggressive
XC4/XD1/XS1/XA1/XA2/XF2/XF3; molto aggressive XD2/XD3/XS2/XS3/XA3/XF4 [V]. Scelta dello stato limite →
**Tab. 4.1.IV** (GU p. 76), colonna *armature poco sensibili* — cioè gli acciai ordinari, il caso di NOVA:

| esigenza | ambiente | combinazione | stato limite | w_k |
|---|---|---|---|---|
| A | ordinarie | frequente | apertura fessure | ≤ w₃ = 0,4 mm |
| A | ordinarie | quasi permanente | apertura fessure | ≤ w₂ = 0,3 mm |
| B | aggressive | frequente | apertura fessure | ≤ w₂ = 0,3 mm |
| B | aggressive | quasi permanente | apertura fessure | ≤ w₁ = 0,2 mm |
| C | molto aggressive | frequente | apertura fessure | ≤ w₁ = 0,2 mm |
| C | molto aggressive | quasi permanente | apertura fessure | ≤ w₁ = 0,2 mm |

Calcolo: `[4.1.14]` **w_k = 1,7·ε_sm·Δ_sm**, dove «per il calcolo di ε_sm e Δ_sm vanno utilizzati criteri
consolidati riportati in documenti di comprovata validità» [V] — la norma **delega**, e la Circolare
raccoglie la delega:

- `[C4.1.7]` **Δ_sm = (k₃·c + k₁·k₂·k₄·Φ/ρ_eff)/1,7** con k₁ = 0,8 (aderenza migliorata) / 1,6 (lisce),
  k₂ = 0,5 (flessione) / 1,0 (trazione), **k₃ = 3,4**, **k₄ = 0,425** [V, formula leggibile nel PDF Circ.
  p. 88];
- `[C4.1.6]` ε_sm: **[NON TROVATO]** nel testo estratto — è un'immagine nel PDF Circ. p. 87. Sono leggibili
  solo i parametri al contorno: α_e = E_s/E_cm, **k_t = 0,6 carichi di breve durata / 0,4 di lunga durata**,
  h_c,ef, A_c,eff [V]. Chi implementa deve **aprire il PDF**, non fidarsi del testo;
- **verifica senza calcolo diretto**, Tabelle C4.1.II e C4.1.III (GU Circ. p. 88), riscontrate sul PDF [V]:

| σ_s [MPa] | Φ max (mm) w₃ / w₂ / w₁ | spaziatura max (mm) w₃ / w₂ / w₁ |
|---|---|---|
| 160 | 40 / 32 / 25 | 300 / 300 / 200 |
| 200 | 32 / 25 / 16 | 300 / 250 / 150 |
| 240 | 20 / 16 / 12 | 250 / 200 / 100 |
| 280 | 16 / 12 / 8 | 200 / 150 / 50 |
| 320 | 12 / 10 / 6 | 150 / 100 / — |
| 360 | 10 / 8 / — | 100 / 50 / — |

**Deformazione** §4.1.2.2.2 [V]: le NTC **non danno un limite numerico** — «i valori limite devono essere
commisurati a specifiche esigenze e possono essere dedotti da documentazione tecnica di comprovata
validità». I numeri stanno nella Circolare C4.1.2.2.2 (GU Circ. p. 86), riscontrati sul PDF [V]: freccia a
lungo termine sotto **combinazione quasi permanente ≤ L/250**; sotto la stessa combinazione, per l'integrità
di tramezzi e tamponature, **≤ L/500** (depurabile della parte presente prima dell'esecuzione delle pareti,
e riferita a pareti divisorie in muratura). Per luci ≤ 10 m la verifica si può **omettere** se il rapporto
l/h rispetta la `[C4.1.4]` — espressione **[NON TROVATO]** nel testo estratto — con i valori limite di
Tabella C4.1.I: K = 1,0 appoggiata → l/h 14 (cls molto sollecitato) / 20 (poco sollecitato); K = 1,3 campata
terminale → 18/26; K = 1,5 campata intermedia → **[NON TROVATO]**, i due valori non sono ricostruibili dal
testo estratto; K = 1,2 piastra su pilastri → 17/24; K = 0,4 mensola → 6/8 [V]. Il metodo di calcolo è
l'interpolazione fra stato non fessurato e fessurato `[C4.1.2]`-`[C4.1.3]` con ζ = 1 − β·(σ_sr/σ_s)² e
β = 1 (carico singolo di breve durata) / 0,50 (permanenti o cicli ripetuti) [V].

**SLE sismico**: §7.3.6.1 (GU p. 221) è l'altro SLE che un telaio deve passare, e non sta nel §4.1.2.
Verifiche di rigidezza allo SLD per CU I e II: q·d_r ≤ 0,0050·h tamponature fragili `[7.3.11a]`,
≤ 0,0075·h duttili `[7.3.11b]`, ≤ 0,0100·h se progettate per non danneggiarsi `[7.3.12]`; muratura
ordinaria 0,0020·h `[7.3.13]`, armata 0,0030·h `[7.3.14]`, confinata 0,0025·h `[7.3.15]`. Per CU III e IV ci
si riferisce allo **SLO** e i limiti scendono a **2/3** [V]. d_r è calcolato **sul modello non comprensivo
delle tamponature** [V]. Gli spostamenti sismici non sono quelli dell'analisi: `[7.3.8]` d_E = μ_d·d_Ee, con
`[7.3.9]` μ_d = q se T₁ ≥ T_C, μ_d = 1 + (q−1)·T_C/T₁ se T₁ < T_C, e in ogni caso μ_d ≤ 5q − 4 [V].

### 2.5 Il confine col §7.4 — quello che T8 non copre ma tocca

Se il telaio è in zona sismica e dissipativo, le verifiche del §4.1.2 non bastano: §7.4.4 sovrascrive le
**domande**, non le capacità. Tab. 7.2.I (GU p. 211, `ntc2018.md:4451`) [V]: γ_Rd per c.a. gettato in opera
= travi taglio 1,20 (CD"A") / 1,10 (CD"B"); pilastri pressoflessione `[7.4.4]` 1,30 / 1,30; pilastri taglio
`[7.4.5]` 1,30 / 1,10; nodi taglio `[7.4.6-7, 7.4.11-12]` 1,20 / 1,10; pareti taglio 1,20 / —. Gerarchia:
Σ M_c,Rd ≥ γ_Rd · Σ M_b,Rd `[7.4.4]`; domanda a taglio del pilastro dalla `[7.4.5]`
V_Ed·l_p = γ_Rd·(M^s_i,d + M^i_i,d); domanda al nodo `[7.4.6]`/`[7.4.7]`; capacità del nodo
`[7.4.8]`-`[7.4.12]` con η = α_j·(1 − f_ck/250) `[7.4.9]`, α_j = 0,60 nodi interni / 0,48 esterni [V].
Limite sulla compressione: la domanda non può eccedere **55 % (CD"A")** o **65 % (CD"B")** della capacità a
compressione della sezione di solo calcestruzzo [V]. In CD"A", nelle zone dissipative delle travi si assume
**cotg θ = 1** [V]. Semplificazione ammessa: verifica a pressoflessione **retta** con capacità del pilastro
**ridotta del 30 %** [V].

### 2.6 Librerie esistenti — cosa copre cosa

| libreria | versione | licenza | copre | non copre |
|---|---|---|---|---|
| **structuralcodes** (fib) | 0.7.1 su PyPI, `main` a `0754aea` del 10/06/2026 [M] | **Apache-2.0** [M] | `BeamSection.calculate_bending_strength`, `calculate_moment_curvature`, `calculate_nm_interaction_domain`, `calculate_nmm_interaction_domain`, `calculate_mm_interaction_domain`, `calculate_strain_profile`; EC2-2004 `shear.py` (`VRdc`, `vmin`, `VRds`, `alpha_cw`, `v1`, `Asw_s_required`); EC2-2004 `_section_7_3_crack_control.py` (`sr_max_close`, `sr_max_far`, `eps_sm_eps_cm`, `wk`, `kt`, `k1`-`k4`, `As_min`); codici EC2-2004, EC2-2023, MC2010, MC2020 [V, sorgente] | nessun modulo NTC/italiano; **α_cc di default 1,0**, non 0,85; nessuna gerarchia delle resistenze, nessun nodo trave-pilastro, nessuna Tab. 4.1.IV |
| **concreteproperties** | 0.8.0, py ≥ 3.12 [M] | **MIT** [M] | sezioni RC di geometria arbitraria, momento-curvatura, dominio M-N, flessione deviata; repo vivo (push 06/07/2026, 241 stelle) [M] | `design_codes/` contiene **solo** `as3600.py` e `nzs3101.py` [M]: nessun EC2, nessuna NTC |
| taglio / nodi / gerarchia NTC | — | — | — | **nessuna libreria PyPI**: la ricerca su PyPI e GitHub non restituisce un pacchetto NTC 2018 [M / NON TROVATO] |

**La mappatura che conta.** Le formule NTC del taglio sono **le stesse di EN 1992-1-1**, con i parametri
dell'Appendice Nazionale già scritti nel testo:

- `[4.1.23]` = EC2 (6.2a) con C_Rd,c = 0,18/γ_c e k₁ = 0,15 → `VRdc(..., k1=0.15, gamma_c=1.5)`, che è già il
  default di `structuralcodes` [V, sorgente `shear.py:165-215`];
- `[4.1.27]` = EC2 (6.8/6.13) con z = 0,9·d → `VRds(Asw, s, z=0.9*d, theta, fyk, alpha)` [V, sorgente
  `shear.py:355-402`]. **Attenzione**: `VRds` **solleva `ValueError` per θ < 21,8° o θ > 45°**, mentre NTC
  `[4.1.25]` ammette 1 ≤ cotg θ ≤ 2,5, cioè 21,80° ≤ θ ≤ 45,00°. L'intervallo coincide, ma il controllo è
  agli estremi e va provato sul bordo, non assunto;
- `[4.1.14]` w_k = 1,7·ε_sm·Δ_sm con `[C4.1.7]` Δ_sm = s_r,max/1,7 è **algebricamente identico** a EC2 (7.8)
  w_k = s_r,max·(ε_sm − ε_cm): `wk(sr_max, eps_sm_eps_cm)` dà lo stesso numero, purché si passi s_r,max e
  **non** Δ_sm [V, sorgente + `[C4.1.7]`];
- `[4.1.3]` f_cd = α_cc·f_ck/γ_c con **α_cc = 0,85**: `structuralcodes` ha `alpha_cc` come parametro con
  **default 1,0** (`_concreteEC2_2004.py`, proprietà `alpha_cc` → `self._alpha_cc or 1.0`) [V, sorgente].
  Chi non lo passa esplicitamente calcola con una f_cd **del 17,6 % più alta** del dovuto. È il difetto più
  facile e più caro di questa integrazione.

Restano fuori da qualunque libreria: Tab. 2.5.I / 2.6.I, Tab. 4.1.IV, le tabelle C4.1.II / C4.1.III, i
limiti `[4.1.15]`-`[4.1.17]`, i minimi `[4.1.45]` / `[4.1.46]`, tutto il §7.4.4 e tutto il §7.3.6.1.

---

## 3. Relazione di calcolo — §10.2.1 e §10.2 come lista di sezioni

Fonti: NTC §10.1, §10.2, §10.2.1, §10.2.2 (GU p. 302-303, `ntc2018.md:5949`) e Circolare C10.1, C10.2.1,
C10.2.2 (GU Circ. p. 306-309), entrambe riscontrate sul PDF [V]. La Circolare **articola** il §10.2.1 in
a.1-a.5 e b.1-b.4: è quella la struttura da usare come indice, perché è la più fine.

### 3.1 Il documento di livello superiore (§10.1 + C10.1)

Il §10.1 elenca **cinque elaborati** del progetto strutturale [V]: relazione di calcolo strutturale;
relazione sui materiali; elaborati grafici e particolari costruttivi; piano di manutenzione della parte
strutturale; relazione sui risultati sperimentali. La C10.1 aggiunge che la relazione di calcolo deve
comprendere **almeno**: illustrazione dell'opera, uso, funzione e criteri normativi di sicurezza;
localizzazione, destinazione, tipologia, dimensioni principali, interferenze con le costruzioni limitrofe;
caratteristiche geomorfologiche e topografiche del sito; normative di riferimento; descrizione del modello
strutturale **correlato con quello geotecnico**; presentazione e sintesi dei risultati, «preferibilmente
anche in forma grafica» [V]. E tre relazioni specialistiche: geologica (§6.2.1), geotecnica (§6.2.2) e
**modellazione sismica** sulla pericolosità sismica di base (§3.2), «contenente il riferimento a tutti i
parametri ed i coefficienti in base ai quali sono state determinate le azioni sismiche» [V] — cioè ag, F₀,
T_C*, categoria di sottosuolo e topografica, V_R, P_VR, q.

### 3.2 L'indice del §10.2.1, articolato secondo C10.2.1

| # | sezione | contenuto obbligatorio | fonte |
|---|---|---|---|
| **a** | **Tipo di analisi svolta** | | §10.2.1 · C10.2.1 a) |
| a.1 | | statica o dinamica, lineare o non lineare, **e le sue motivazioni** | [V] |
| a.2 | | il metodo adottato per la risoluzione del problema strutturale | [V] |
| a.3 | | le metodologie seguite per la verifica o il progetto-verifica delle sezioni | [V] |
| a.4 | | le **combinazioni di carico adottate** e, se non lineare, i **percorsi di carico**; motivate «in specie con riguardo alla effettiva **esaustività** delle configurazioni studiate» | [V] |
| a.5 | | i criteri seguiti per la modellazione | [V] |
| **b** | **Origine, caratteristiche e validazione dei codici** | | §10.2 · C10.2.1 b) |
| b.1 | | titolo, autore, **produttore, distributore**, versione, estremi della licenza o altro titolo d'uso | [V] |
| b.2 | | la documentazione del produttore: basi teoriche e algoritmi, **campi d'impiego**, **casi di prova interamente risolti e commentati con i file di input** che consentano di riprodurre l'elaborazione | [V] |
| b.3 | | l'**esame preliminare del progettista** sull'affidabilità e sull'idoneità del programma al caso specifico | [V] |
| b.4 | | l'esame della documentazione su **modalità e procedure di validazione** del programma | [V] |
| **c** | **Modalità di presentazione dei risultati** | descrizione dell'opera e della tipologia strutturale; inquadramento normativo; definizione dei parametri di progetto; materiali e loro caratteristiche meccaniche; criteri di progettazione e modellazione; **combinazione delle azioni**; codice di calcolo impiegato; **rispetto delle verifiche per gli stati limite considerati** | §10.2.1 [V] |
| **d** | **Informazioni generali sull'elaborazione** | esame e controlli svolti sui risultati; valutazione complessiva del corretto comportamento del modello | §10.2.1 [V] |
| **e** | **Giudizio motivato di accettabilità** | confronto con **semplici calcoli di larga massima** su schemi noti; valutazione delle scelte di schematizzazione a partire dagli stati tensionali e deformativi; elenco e illustrazione sintetica dei controlli svolti, **quali l'equilibrio fra reazioni vincolari e carichi applicati** | §10.2.1 [V] |
| **f** | **Allegato** | i tabulati del programma **non fanno parte integrante** della relazione: ne costituiscono un allegato. La C10.2.1 spiega il perché: impedire che la relazione sia «costituita essenzialmente dal solo tabulato» | §10.2.1 · C10.2.1 [V] |

### 3.3 Le figure che la norma pretende, nominate una per una

Il §10.2.1 le elenca in una frase sola, ed è un elenco chiuso: «L'esito di ogni elaborazione deve essere
sintetizzato in disegni e schemi grafici contenenti, **almeno per le parti più sollecitate della
struttura**» [V]:

1. le **configurazioni deformate**;
2. la rappresentazione grafica delle **principali caratteristiche di sollecitazione** o delle componenti
   degli sforzi;
3. i **diagrammi di inviluppo** associati alle combinazioni dei carichi considerate;
4. gli **schemi grafici dei carichi applicati** e delle **corrispondenti reazioni vincolari**.

E su ognuna di esse, obbligatoriamente: «le **convenzioni sui segni**, i **valori numerici** e le **unità di
misura** di questi nei punti o nelle sezioni significative», più «i valori numerici necessari ai fini delle
verifiche di misura della sicurezza» [V]. La C10.2.1 rovescia l'ordine e lo rende più stringente: i valori
numerici vanno «**preceduti dall'indicazione della convenzione sui segni e delle unità di misura**» [V].

Una figura senza legenda di segni e unità **non soddisfa il §10.2.1**. Vale anche per un PNG di deformata.

### 3.4 §10.2.2 — valutazione indipendente

«I calcoli più importanti devono essere eseguiti nuovamente da soggetto diverso da quello originario
mediante **programmi di calcolo diversi** da quelli usati originariamente» [V]. La C10.2.2 la circoscrive a
«opere di particolare importanza, ritenute tali dal Committente» e la declina come «controllo incrociato sui
risultati» che il progettista **deve** comunque effettuare [V]. Per NOVA questa è la casella che il confronto
OpenSees ↔ CalculiX già occupa, come `06` §5 aveva notato.

---

## 4. SAF — versione, fogli, minimo per un telaio, validatori

### 4.1 La versione è 2.2.0, e non è «2.x»

`saf.guide` dichiara «Current version: 2.2.0» in home [V] e le release notes datano la 2.2.0 al
**28.11.2022**; la 2.1.0 al 18.11.2021, la 2.0.0 al 21.12.2020 [V]. La documentazione `latest` esiste ed è
etichettata «Version in progress» [M], senza numero: **non esiste una 2.3.0 pubblicata al 08/09/2026**. Il
valore `SAF Version` nel foglio `Model` è **obbligatorio** e va scritto per esteso: `2.2.0` [V + M sul file
di riferimento].

Corregge un dato di `06` §4: il repo della documentazione è fermo al 13/04/2023 [M, invariato], ma **l'SDK
C# non lo è**: il pacchetto NuGet `StructuralAnalysisFormat` è alla **1.7.3, pubblicata il 04/04/2025,
licenza Apache-2.0** [M]. Il formato non è morto; la sua documentazione sì.

### 4.2 Struttura del foglio

Un file SAF è un `.xlsx` in cui **ogni entità è un foglio** e ogni riga un'istanza; le colonne sono gli
attributi, con l'intestazione in **riga 1** e i dati **dalla riga 2** [M, misurato sul file di riferimento].
Le uniche due eccezioni sono `Project` e `Model`, dove le proprietà stanno **in colonna**: `A` = nome della
proprietà, `B` = valore [V + M].

Il file di riferimento ufficiale `SAF_example_HOUSE_metric_ZYX_220.xlsx` (133.350 byte, sha256
`5b0f8271edfcad66f87456390ec712edf32742d6146dff86bdc8e2ccae0bb93e`) porta **43 fogli, tutti presenti anche
quando vuoti** — ognuno ha almeno la riga di intestazione [M].

**Due trappole misurate sul file di riferimento**, che nessuna pagina di documentazione dichiara:

1. **Due nomi di foglio sono troncati a 31 caratteri**, il limite di Excel:
   `StructuralSurfaceActionDistribution` → `StructuralSurfaceActionDistri` e
   `StructuralPointSupportDeformation` → `StructuralPointSupportDef` [M]. Un lettore che cerca il nome
   completo non li trova.
2. **L'ordine delle colonne del file non è l'ordine della tabella di documentazione.** In
   `StructuralCurveMember` il file mette *Structural Y Ecc Beg · Y Ecc End · Z Ecc Beg · Z Ecc End*, la
   documentazione *Y Beg · Z Beg · Y End · Z End* [M]. Un lettore posizionale legge il numero sbagliato:
   **si mappa per intestazione**, sempre.

Regole di serializzazione dichiarate («Best practice for SAF implementation») [V]: separatore decimale
**punto**, invariante di cultura, **nessun separatore delle migliaia**; celle vuote come `null`, non stringa
vuota; valori numerici in formato «Number», mai testo; **nessun arrotondamento**; il separatore fra più
valori nella stessa cella è il **punto e virgola**. Sono raccomandazioni, non obblighi: la pagina lo dichiara
(«They are not obligatory») [V].

### 4.3 Entità minime per un export valido di un telaio

Colonne con `Required = yes` nella 2.2.0, dai fogli della documentazione [V]:

| foglio | perché serve al telaio | colonne obbligatorie |
|---|---|---|
| `Project` | intestazione | nessuna colonna obbligatoria |
| `Model` | **obbligatorio** | `SAF Version` (`2.2.0`), `Global coordinate system` (es. `Z vertical`), `LCS of cross-section` (es. `ZYX`), `System of units` (`Metric`), `National code` |
| `StructuralMaterial` | cls e acciaio | `Name`, `Type` (`Concrete`), `Quality` (es. `C25/30`) |
| `StructuralCrossSection` | sezione rettangolare | `Name`, `Material`, `Cross-section type` (`Parametric`), `Shape`, `Parameters [mm]` |
| `StructuralPointConnection` | nodi | `Name`, `Coordinate X/Y/Z [m]` |
| `StructuralCurveMember` | travi e pilastri | `Name`, `Cross section`, `Nodes` (`N1; N2`), `Segments` (`Line`), `LCS`, `LCS Rotation [deg]`, `Coordinate X/Y/Z [m]` (del vettore o punto che definisce l'LCS), `System line`, le **quattro** `Analysis * Eccentricity` (0 se nessuna), `Behaviour in analysis` (`Standard`) |
| `StructuralPointSupport` | vincoli | `Name`, `Boundary condition` (`In node`), `Node`, i sei gradi di libertà |
| `StructuralLoadGroup` | prerequisito dei casi | `Name`, `Load group type`, `Relation` (+ `Load type` se `Variable`) |
| `StructuralLoadCase` | casi di carico | `Name`, `Action type` (`Permanent` / `Variable` / `Accidental`), `Load group`, `Load type` (+ `Duration` se `Variable`) |
| `StructuralLoadCombination` | combinazioni | `Name`, `Category`, `Load Factor #`, `Multiplier #`, `Load Case name #` |
| carichi (`StructuralPointAction`, `StructuralCurveAction`, …) | i carichi veri | secondo il foglio |
| `ResultInternalForce1D` | sollecitazioni | `Result on`, `Member`, `Result for`, `Load case` / `Load combination`, `Section at [m]`, `Index`, `N`, `Vy`, `Vz`, `Mx`, `My`, `Mz` |

Quattro punti da leggere due volte:

- **Un carico non può esistere senza il suo gruppo.** `StructuralLoadCase.Load group` è obbligatorio e punta
  a `StructuralLoadGroup`, che a sua volta dichiara la `Relation` (`Exclusive` / `Standard` / `Together`)
  con cui il ricevente potrà rigenerare le combinazioni [V]. È la catena
  `LoadGroup → LoadCase → carico → LoadCombination`, e non se ne salta un anello.
- **Le NTC non sono nell'enum delle combinazioni.** `StructuralLoadCombination.National standard` ammette
  `EN-ULS (STR/GEO) Set B` / `Set C`, `EN-Accidental 1` / `2`, `EN-Seismic`, `EN-SLS Characteristic`,
  `EN-SLS Frequent`, `EN-SLS Quasi-permanent`, `IBC-*` — **e nient'altro** [V]. Non esiste un valore NTC. Il
  foglio `Model`, invece, ha `EC-UNI-EN (Italian NA)` fra i `National code` [V]: l'Italia c'è a livello di
  modello e **non** a livello di combinazione.
- Perciò una combinazione NTC va esportata come **`Category = ULS` / `SLS` + `Type = Linear` + i
  `Load Factor #` espliciti**, non come «according national standard»: la documentazione dice che in quel
  caso «the load factor is expected to be set by the national standard in the software, not prescribed in
  SAF» [V] — cioè i coefficienti NTC verrebbero **buttati via** e ricalcolati dal ricevente con gli
  Eurocodici. Il `Load Factor #` è obbligatorio proprio quando la categoria non è «according national
  standard» [V].
- I risultati per combinazione hanno `Combination key`, stringa `1.35*LC1+1.5*LC2+…`, **non obbligatoria**,
  ma è l'unico posto dove la composizione esatta sopravvive quando il ricevente rigenera gli inviluppi [V].
  `Index` è l'ordine della stazione lungo la trave, da 1, e serve a distinguere la sezione «a sinistra» da
  quella «a destra» dello stesso punto [V] — cioè il salto di taglio sotto un carico concentrato. Le
  stazioni Lobatto di NOVA ci mappano direttamente.

### 4.4 Validatori

- **Nessun validatore ufficiale a riga di comando.** L'organizzazione GitHub `StructuralAnalysisFormat` ha
  **quattro repo** — `documentation`, `StructuralAnalysisFormat-Doc`, `StructuralAnalysisFormat-Examples`,
  `test-rtd` — nessuno dei quali è uno strumento, e **nessuno dichiara una licenza** [M].
- **SDK C#**, `StructuralAnalysisFormat` su NuGet, 1.7.3, Apache-2.0, 04/04/2025 [M]: import/export, più tre
  pacchetti di contorno (due bootstrapper SimpleInjector, uno di test) [V]. È .NET, non Python.
- **SAF Viewer** di Structural Toolkit, `https://autoconverter.structuraltoolkit.com/en-GB/saf-viewer`,
  raggiungibile (HTTP 200) [M]: terza parte, chiuso, web. Utile come riscontro manuale, **non** come gate
  automatico.
- **Nessuna libreria Python.** La ricerca GitHub su «SAF structural analysis format» restituisce tre repo in
  tutto, di cui uno solo di terzi (`limian1761/StructuralAnalysisFormat-Protobuf`, Python, **senza
  licenza**, ultimo push 24/03/2023, 2 stelle) [M].
- **Il vero validatore disponibile è il file di riferimento**: `SAF_example_HOUSE_metric_ZYX_220.xlsx` nel
  repo `-Examples`, cartella `examples/2.2.0/` [M]. Confrontare nomi dei fogli, intestazioni e presenza
  delle colonne obbligatorie contro quel file è un controllo eseguibile in una decina di righe di `zipfile`
  più `xml.etree`, senza dipendenze nuove.

---

## 5. Spettro NTC §3.2.3 da ag, F₀, T_C*

### 5.1 Da dove vengono i tre numeri

§3.2 (GU p. 45) [V]: «le forme spettrali sono definite … a partire dai valori dei seguenti parametri su sito
di riferimento rigido orizzontale: **ag** accelerazione orizzontale massima al sito; **F₀** valore massimo
del fattore di amplificazione dello spettro in accelerazione orizzontale; **T_C*** valore di riferimento per
la determinazione del periodo di inizio del tratto a velocità costante». E: «Per i valori di ag, F₀ e T_C*
si fa riferimento agli **Allegati A e B al Decreto del Ministro delle Infrastrutture 14 gennaio 2008**,
pubblicato nel S.O. alla GU del 4 febbraio 2008, n. 29, ed eventuali successivi aggiornamenti» [V].

Cioè: i tre parametri **non** stanno nelle NTC 2018. Chiederli all'utente è quello che la norma stessa fa.

### 5.2 Le formule, verbatim (§3.2.3.2.1, GU p. 47-49) [V]

```
0 ≤ T < T_B    S_e(T) = a_g·S·η·F₀·[ T/T_B + 1/(η·F₀)·(1 − T/T_B) ]      [3.2.2]
T_B ≤ T < T_C  S_e(T) = a_g·S·η·F₀
T_C ≤ T < T_D  S_e(T) = a_g·S·η·F₀·(T_C/T)
T_D ≤ T        S_e(T) = a_g·S·η·F₀·(T_C·T_D/T²)

S   = S_S · S_T                                       [3.2.3]
η   = √(10/(5 + ξ)) ≥ 0,55        ξ in percentuale    [3.2.4]
T_C = C_C · T_C*                                      [3.2.5]
T_B = T_C / 3                                         [3.2.6]
T_D = 4,0·(a_g/g) + 1,6                               [3.2.7]
```

F₀ ha **valore minimo 2,2** [V]. Gli spettri valgono per **T ≤ 4,0 s**; oltre, servono analisi apposite o
storie temporali [V].

**Tab. 3.2.IV — S_S e C_C** (GU p. 48) [V], con a_g/g adimensionale e T_C* in secondi:

| sottosuolo | S_S | C_C |
|---|---|---|
| A | 1,00 | 1,00 |
| B | 1,00 ≤ 1,40 − 0,40·F₀·a_g/g ≤ 1,20 | 1,10·(T_C*)^(−0,20) |
| C | 1,00 ≤ 1,70 − 0,60·F₀·a_g/g ≤ 1,50 | 1,05·(T_C*)^(−0,33) |
| D | 0,90 ≤ 2,40 − 1,50·F₀·a_g/g ≤ 1,80 | 1,25·(T_C*)^(−0,50) |
| E | 1,00 ≤ 2,00 − 1,10·F₀·a_g/g ≤ 1,60 | 1,15·(T_C*)^(−0,40) |

**Tab. 3.2.V — S_T** (GU p. 49) [V]: T1 → 1,0; T2 (sommità del pendio) → 1,2; T3 (cresta di rilievo con
pendenza media ≤ 30°) → 1,2; T4 (cresta con pendenza > 30°) → 1,4. Il coefficiente **decresce linearmente**
dalla sommità (valore massimo) alla base (valore unitario) [V].

**Componente verticale** `[3.2.8]`: stessa forma con F_V al posto di F₀, e F_V = 1,35·F₀·(a_g/g)^0,5
`[3.2.9]`; Tab. 3.2.VI fissa per **tutte** le categorie A-E: S_S = 1,0, T_B = 0,05 s, T_C = 0,15 s,
T_D = 1,0 s [V]. Nota: nel primo ramo della `[3.2.8]` il denominatore resta **η·F₀**, non η·F_V [V].

**Spettro di progetto** §3.2.3.5 (GU p. 50) [V]: per SLD, SLV e SLC lo spettro di progetto è quello elastico
con **η sostituito da 1/q** nelle `[3.2.2]` e `[3.2.8]`; per l'analisi non lineare statica si pone **η = 1**;
per SLO (§3.2.3.4) lo spettro di progetto **è** l'elastico. E, in ogni caso, **S_d(T) ≥ 0,2·a_g** [V].

### 5.3 Il tranello del primo ramo, con i numeri

Con η = 1/q il primo ramo **non sale**: parte da S_d(0) = a_g·S e **scende** verso il plateau a_g·S·F₀/q
ogni volta che q > F₀. Esempio calcolato in sessione [M], a_g = 0,25 g, F₀ = 2,50, T_C* = 0,30 s, sottosuolo
C, categoria topografica T1, q = 3,9:

```
C_C = 1,562210   T_C = 0,468663 s   T_B = 0,156221 s   T_D = 2,600 s
S_S = 1,325000   S = 1,325000

  T [s]      S_e [g]      S_d(q=3,9) [g]
  0,000000   0,331250     0,331250
  0,100000   0,649309     0,255133
  0,156221   0,828125     0,212340   ← T_B, inizio plateau
  0,468663   0,828125     0,212340   ← T_C
  1,000000   0,388111     0,099516
  2,000000   0,194056     0,050000   ← taglio a 0,2·a_g
  4,000000   0,063068     0,050000
```

Il floor 0,2·a_g = 0,050 g **morde già a T ≈ 2 s**, cioè dentro il campo dei telai alti; e S_d(0) sta più del
50 % sopra il plateau. Chi implementa `[3.2.2]` come «rampa da zero al plateau» sbaglia entrambe le cose.

### 5.4 Un oracolo ufficiale esiste

Il Consiglio Superiore dei Lavori Pubblici pubblica **Spettri-NTC ver. 1.0.3**, un foglio Excel che «fornisce
gli spettri di risposta rappresentativi delle componenti (orizzontali e verticale) delle azioni sismiche di
progetto per il generico sito del territorio nazionale» [V]. Scaricato in sessione:
`Spettri-NTCver.1.0.3_0.zip` di **41.214.730 byte**, sha256
`263b9e85d30fdc956b9ebc87bef9435cd727197708c783b848d655b50eb7ffec`, contenente `Spettri-NTCver.1.0.3.xls`
di **46.354.944 byte** [M]. La pagina CSLP dichiara «accesso con nessuna restrizione» e scarica la
responsabilità d'uso sull'utente [V].

Due conseguenze: (i) è il **riscontro numerico** con cui tarare l'implementazione di §5.2, riga per riga;
(ii) i 46 MB sono la **griglia di pericolosità** completa — cioè ag, F₀ e T_C* per tutto il territorio
esistono già in forma tabellare pubblica, e l'inserimento a mano è una scelta, non un vincolo.

---

## 6. Raccomandazione per NOVA

Raccomandazioni, non decisioni: la scelta resta all'autore.

### 6.1 Combinazioni

**Tabelle come dati, non come codice.** Tab. 2.5.I e Tab. 2.6.I in un file (JSON o TOML) accanto al catalogo
materiali, con la clausola citata riga per riga: sono nove categorie più quattro azioni climatiche e sei
righe di γ, e cambiano solo con un decreto. Il generatore legge quel file, `Combinazione.generata` distingue
l'automatico dal manuale, e ogni `Termine.coefficiente` deve poter essere ricondotto a (articolo, riga della
tabella) per la sezione a.4 della relazione.

Il modello dati esistente regge: una combinazione NTC è una somma pesata di azioni, e
`nova/modello.py:277-288` la esprime senza adattatori.

Tre aggiunte piccole: (1) un campo per l'**approccio / colonna di Tab. 2.6.I** usata (`A1` per il telaio in
elevazione), perché la relazione deve dichiararlo; (2) la **categoria d'uso** come enum chiuso A-K, con
**rifiuto esplicito** di I e K finché l'utente non fornisce i tre ψ a mano; (3) per ogni combinazione
generata, un puntatore alla formula NTC di provenienza (`[2.5.1]`…`[2.5.5]`) — la stessa informazione che
`tipo` porta oggi, ma resa citabile.

Sulla sismica: **generare permutazioni e segni esplicitamente**, come combinazioni distinte con nome
parlante (`SLV Ex+0,30Ey ++`), e **non** nascondere il ±30 % dentro l'inviluppo. La relazione §10.2.1 a.4
chiede l'esaustività delle configurazioni, e un inviluppo opaco non la dimostra. Se il modello resta 2D,
dichiarare per iscritto che eccentricità accidentale (§7.2.6) e componente verticale (§7.2.2) sono fuori
perimetro.

### 6.2 Verifiche c.a.

`structuralcodes` (Apache-2.0, vivo, EC2-2004 più sezioni a fibre) ha il rapporto copertura/costo migliore,
e concreteproperties non lo batte: MIT è più permissiva, ma i suoi `design_codes` sono AS 3600 e NZS 3101 —
nessun EC2 — quindi il vantaggio di licenza non compra niente qui.

Va usata come **motore, non come autorità normativa**, con tre paletti scritti:

1. **`alpha_cc=0.85` passato esplicitamente ovunque**, con un test che fallisce se qualcuno lo dimentica: il
   default della libreria è 1,0 e la differenza è il 17,6 % sulla f_cd.
2. Un **guscio NTC sottile** che possiede ciò che nessuna libreria ha: Tab. 4.1.IV, i limiti
   `[4.1.15]`-`[4.1.17]`, i minimi `[4.1.45]` / `[4.1.46]`, il `[4.1.19]` con l'α tabellato, l'eccentricità
   minima h/200 ≥ 20 mm, e i verdetti a tre valori che NOVA già usa.
3. Ogni funzione del guscio porta **l'articolo nel nome o nel docstring**: è quello che il `norme-reviewer`
   verifica e quello che la relazione cita.

Ordine di implementazione suggerito, dal più fruttuoso: pressoflessione retta `[4.1.18a]` → taglio
`[4.1.23]` e `[4.1.27]`-`[4.1.29]` → tensioni `[4.1.15]`-`[4.1.17]` → pressoflessione deviata `[4.1.19]` →
fessurazione (prima la via **indiretta** delle tabelle C4.1.II / C4.1.III, che non ha formule mancanti; il
calcolo diretto `[4.1.14]` solo dopo aver letto la `[C4.1.6]` sul PDF) → deformazione (L/250 e L/500 sulla
quasi permanente). Il §7.4.4 è un blocco a sé e non va infilato dentro T8.

Manca un dato nel modello: la **classe di esposizione** (o almeno il gruppo ordinarie / aggressive / molto
aggressive), senza la quale la Tab. 4.1.IV non è applicabile. `nova/modello.py:128-141` ha b, h, copriferro,
file e staffe — cioè b_w, d, A_sl, A_sw, s — ma nulla sull'ambiente.

### 6.3 Relazione §10.2.1

L'indice del §3.2 di questa ricerca **è** l'indice del documento LaTeX: a.1-a.5, b.1-b.4, c, d, e, più
l'allegato tabulati come file separato. Il pezzo b.2 non è scrivibile a mano una volta: «basi teoriche, campi
d'impiego, **casi di prova interamente risolti con i file di input**» è documentazione di prodotto che NOVA
deve possedere, e il caso studio esistente ne è il primo esemplare.

Il vincolo tecnico più stringente non è il testo ma le **figure**: ogni PNG o SVG generato deve portare
convenzione dei segni, unità e valori numerici nelle sezioni significative, altrimenti non soddisfa il
§10.2.1. Conviene che il generatore di figure lo imponga per costruzione — legenda obbligatoria nella firma
della funzione — invece di lasciarlo alla diligenza di chi scrive.

Il §10.2.1 e) («giudizio motivato di accettabilità … verifiche di equilibrio tra reazioni vincolari e
carichi applicati») è **già un controllo eseguibile**, non prosa: è il C3 di `04-funzioni-intelligenti.md`.
Conviene che sia il programma a calcolarlo e a scrivere il numero nella relazione.

### 6.4 SAF

Scrivere **SAF 2.2.0**, mai «2.x», e metterlo nel foglio `Model`. Esportare **tutti i 43 fogli**, anche vuoti
con la sola intestazione, come fa il file di riferimento: costa niente ed è ciò che i lettori si aspettano.
Mappare per **nome di intestazione**, mai per posizione, e ricordare i due nomi troncati a 31 caratteri.

Le combinazioni NTC vanno esportate come `Category = ULS` / `SLS`, `Type = Linear`, con i `Load Factor #`
espliciti: `According national standard` **butterebbe via i coefficienti NTC**, perché nel suo enum le NTC
non ci sono. `National code = EC-UNI-EN (Italian NA)` nel foglio `Model` resta corretto e va messo.

Non esistendo un validatore Python, il gate ragionevole è un **confronto strutturale con il file di
riferimento** `SAF_example_HOUSE_metric_ZYX_220.xlsx` (nomi dei fogli, intestazioni, presenza delle colonne
obbligatorie): `zipfile` più `xml.etree` bastano, nessuna dipendenza nuova, e il SAF Viewer web resta il
riscontro manuale prima di dichiarare l'export riuscito.

### 6.5 Spettro

Implementare `[3.2.2]`-`[3.2.7]` con ingresso (a_g, F₀, T_C*, categoria di sottosuolo, categoria topografica,
ξ oppure q) e uscita S_e e S_d: sono venti righe, nessuna dipendenza. Tre invarianti da mettere nei test,
perché sono i tre punti dove si sbaglia: (i) il primo ramo **scende** quando q > F₀, e S_d(0) = a_g·S; (ii) il
floor **S_d ≥ 0,2·a_g** taglia davvero, e presto; (iii) i limiti di S_S sono un `clamp` **bilaterale**, non
un'unica disuguaglianza — la riga della categoria D parte da 0,90, non da 1,00.

Come oracolo, il foglio CSLP **Spettri-NTC 1.0.3**: un pugno di siti confrontati riga per riga vale più di
qualunque test scritto a mano, e la sua provenienza (Consiglio Superiore dei LL.PP.) è citabile in relazione.

---

## 7. Domande aperte per l'autore

1. **Segni della combinazione sismica.** Le NTC non prescrivono il ±: §7.3.5 scrive coefficienti positivi e
   parla solo di permutazione circolare. NOVA genera 2 permutazioni × 4 segni = 8 combinazioni sismiche per
   stato limite, oppure 2 sole e lascia il segno all'inviluppo? La prima è difendibile in relazione, la
   seconda è più corta. Non l'ho trovato scritto da nessuna parte: è una decisione, non una lettura.
2. **CD"B" o non dissipativo?** Se il telaio è dissipativo, il §7.4.4 (gerarchia, γ_Rd, nodi, limite del
   55/65 % sulla compressione) diventa obbligatorio e T8 non basta. Se è non dissipativo (q ≤ 1,5), basta il
   §4.1.2 e il perimetro del ticket regge così com'è.
3. **Fessurazione: via diretta o indiretta?** La via indiretta (Tabelle C4.1.II / C4.1.III) è completa e
   leggibile; la diretta `[4.1.14]` richiede la `[C4.1.6]`, che nel PDF della Circolare è un'immagine (p. 87)
   e va trascritta a mano una volta per tutte. Vale la pena, o la via indiretta chiude il caso?
4. **Categorie I e K.** Le NTC dicono «da valutarsi caso per caso». Il generatore rifiuta l'azione, oppure
   accetta tre ψ inseriti a mano e li marca come non normati nella relazione?
5. **ag, F₀, T_C* a mano: per sempre?** La griglia nazionale completa è dentro il foglio CSLP da 46 MB,
   pubblico e senza restrizioni. L'inserimento a mano resta la scelta giusta per la tesi, ma vale registrare
   che l'alternativa esiste e costa un'estrazione, non un servizio esterno.
6. **Classe di esposizione nel modello dati.** Senza di essa la Tab. 4.1.IV non si applica e la verifica di
   fessurazione non ha un limite. Campo obbligatorio sulla sezione, sull'asta, o parametro globale del
   modello?
7. **Il §10.2.1 b.2 chiede «casi di prova interamente risolti con i file di input».** NOVA deve produrre *la
   propria* documentazione di prodotto per essere usabile in una relazione vera. È dentro il perimetro della
   tesi o è un allegato successivo?

---

## 8. Riferimenti

Ogni riferimento porta tre campi: **URL** · **perché conta qui** · **cosa se ne prende**.

Le fonti marcate **[V]** sono catturate in `docs/ricerca/fonti/`, ognuna con il proprio
`<slug>.provenance.json`: **23 catture** al 08/09/2026, tutte con sha256 e byte verificati contro il
file salvato. I PDF normativi non si copiano interi: la cattura contiene le clausole citate, estratte
verbatim, e il sidecar punta all URL della Gazzetta Ufficiale.

### Fonti primarie normative

- **URL** <https://www.gazzettaufficiale.it/eli/gu/2018/02/20/42/so/8/sg/pdf> — copia locale
  `~/Backup-vault/current/NTC 2018 con circolari/riconversione-2026-09-07/fonte/ntc2018.pdf` (9.888.288 byte,
  372 pagine) e testo `ntc2018.md` · **[V]** · cattura in `fonti/ntc2018-clausole-citate.md`
  **perché conta qui** è il testo di legge da cui vengono tutte le formule dei punti 1, 2, 3 e 5: senza il PDF
  le formule del corpus restano [R] per dichiarazione del suo stesso `LEGGIMI.md`
  **cosa se ne prende** `[2.5.1]`-`[2.5.7]` e Tab. 2.5.I / 2.6.I (p. 38-40); `[3.2.2]`-`[3.2.9]`,
  Tab. 3.2.IV / V / VI e il floor 0,2·a_g del §3.2.3.5 (p. 45-50); `[4.1.3]`-`[4.1.7]`, ε_c2 / ε_cu,
  `[4.1.13]`-`[4.1.19]`, `[4.1.22]`-`[4.1.30]`, `[4.1.45]` / `[4.1.46]`, Tab. 4.1.III / 4.1.IV (p. 72-84);
  Tab. 7.2.I, `[7.3.4]`-`[7.3.15]`, `[7.4.4]`-`[7.4.12]`, la soglia 85 % / 5 % (p. 205-228); §10.1-§10.2.2
  integrale (p. 302-303); `[11.2.3a]` e `[11.2.5]` (p. 313)
- **URL** <https://www.gazzettaufficiale.it/eli/gu/2019/02/11/35/so/5/sg/pdf> — copia locale
  `…/fonte/circolare2019.pdf` (50.658.045 byte, 348 pagine) · **[V]** per la prosa, **[NON TROVATO]** per le
  formule non estraibili · cattura in `fonti/circolare2019-paragrafi-citati.md`
  **perché conta qui** le NTC delegano alla Circolare esattamente i tre punti che servono a T8: limiti di
  freccia, calcolo di w_k, articolazione del §10.2.1
  **cosa se ne prende** C4.1.2.2.2 (L/250, L/500, Tabella C4.1.I — p. 86); C4.1.2.2.4.5 (`[C4.1.7]` con
  k₁-k₄, k_t, Tabelle C4.1.II e C4.1.III — p. 87-88); C4.1.2.2.5 (n = 15, E_s = 210.000 — p. 89);
  `[C4.1.11]` N_Rd = 0,8 A_c f_cd + A_s,tot f_yd (p. 90); C10.1 e C10.2.1 con l'articolazione a.1-a.5 /
  b.1-b.4 (p. 306-308). **Non** si prendono la `[C4.1.6]` né la `[C4.1.4]`: sono immagini nel PDF
- **URL** <https://cslp.mit.gov.it/pareri/spettri-ntc-ver-103> · **[V]** · cattura in
  `fonti/cslp-spettri-ntc.md`
  **perché conta qui** è l'unico oracolo numerico ufficiale per lo spettro NTC, prodotto dallo stesso
  Consiglio Superiore che ha scritto la norma, quindi citabile in relazione
  **cosa se ne prende** il file `Spettri-NTCver.1.0.3.zip` (41.214.730 byte, sha256 `263b9e85…`) come
  riscontro riga per riga dell'implementazione di §5.2, e la constatazione che la griglia nazionale di ag,
  F₀ e T_C* è già pubblica

### SAF — documentazione ufficiale (tutte catturate in `fonti/`)

- **URL** <https://www.saf.guide/en/stable/index.html> · **[V]** · `fonti/saf-index.md`
  **perché conta qui** dichiara la versione corrente del formato, che il ticket chiede di non lasciare
  generica
  **cosa se ne prende** «Current version: 2.2.0» e l'elenco completo delle entità per gruppo (elementi,
  vincoli, carichi, risultati, allegati, SDK)
- **URL** <https://www.saf.guide/en/stable/getting-started/release-notes.html> · **[V]** ·
  `fonti/saf-release-notes.md`
  **perché conta qui** fissa la data della 2.2.0 e mostra cosa è cambiato dalla 2.0.0: serve a capire se un
  file scritto da un altro programma è compatibile
  **cosa se ne prende** 2.2.0 = 28.11.2022, 2.1.0 = 18.11.2021, 2.0.0 = 21.12.2020; la rimozione di
  «Begin node» / «End node» da `StructuralCurveMember`; l'aggiunta di `ResultInternalForce1D` in 2.1.0
- **URL** <https://www.saf.guide/en/stable/getting-started/saf-versions.html> · **[V]** ·
  `fonti/saf-versions.md`
  **perché conta qui** distingue `stable` da `latest`, che è ciò che impedisce di scambiare una bozza per una
  release
  **cosa se ne prende** semantic versioning dalla 2.0.0 in poi; `latest` è «Version in progress», senza numero
- **URL** <https://www.saf.guide/en/stable/getting-started/project-and-model-specifications/README.html> ·
  **[V]** · `fonti/saf-project-model-spec.md`
  **perché conta qui** `Model` è l'unico foglio con campi obbligatori che un esportatore deve inventare, e
  contiene la casella «Italia»
  **cosa se ne prende** i cinque obbligatori (`SAF Version`, `Global coordinate system`,
  `LCS of cross-section`, `System of units`, `National code`); il layout in colonna di `Project` e `Model`;
  la presenza di `EC-UNI-EN (Italian NA)` nell'enum dei `National code`
- **URL** <https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvemember.html> ·
  **[V]** · `fonti/saf-structuralcurvemember.md`
  **perché conta qui** è l'entità che porta travi e pilastri, cioè il grosso di un telaio
  **cosa se ne prende** l'elenco dei `Required = yes` (`Name`, `Cross section`, `Nodes`, `Segments`, `LCS`,
  `LCS Rotation`, `Coordinate X/Y/Z`, `System line`, le quattro `Analysis * Eccentricity`,
  `Behaviour in analysis`) e la semantica di `Nodes` come lista separata da punto e virgola
- **URL** <https://www.saf.guide/en/stable/structural-analysis-elements/structuralpointconnection.html> ·
  **[V]** · `fonti/saf-structuralpointconnection.md`
  **perché conta qui** è il foglio dei nodi, da cui dipende tutto il resto della geometria
  **cosa se ne prende** quattro sole colonne obbligatorie: `Name` e `Coordinate X/Y/Z [m]`, in GCS
- **URL** <https://www.saf.guide/en/stable/structural-analysis-elements/structuralcrosssection.html> ·
  **[V]** · `fonti/saf-structuralcrosssection.md`
  **perché conta qui** le sezioni di NOVA sono rettangolari parametriche, e SAF le tratta diversamente dai
  profilati
  **cosa se ne prende** `Cross-section type = Parametric` richiede `Shape` e `Parameters [mm]` separati da
  punto e virgola; A, I_y, I_z, I_t sono **facoltativi**, quindi il ricevente li ricalcola dalla forma
- **URL** <https://www.saf.guide/en/stable/structural-analysis-elements/structuralmaterial.html> · **[V]** ·
  `fonti/saf-structuralmaterial.md`
  **perché conta qui** è dove finiscono classe del calcestruzzo e acciaio, cioè il legame col catalogo NTC di
  NOVA
  **cosa se ne prende** obbligatori `Name`, `Type` (`Concrete`) e `Quality` (`C25/30`); E, G, ν e massa
  facoltativi; la raccomandazione di usare `Name` uguale a `Quality`
- **URL** <https://www.saf.guide/en/stable/supports-and-hinges/structuralpointsupport.html> · **[V]** ·
  `fonti/saf-structuralpointsupport.md`
  **perché conta qui** i vincoli di NOVA sono ai nodi, e dalla 2.2.0 SAF permette anche vincoli su membratura
  **cosa se ne prende** `Boundary condition = In node` rende obbligatorio `Node`; i sei gradi di libertà sono
  colonne separate
- **URL** <https://www.saf.guide/en/stable/loads/structuralloadgroup.html> · **[V]** ·
  `fonti/saf-structuralloadgroup.md`
  **perché conta qui** è l'anello che un esportatore ingenuo salta, e senza il quale i casi di carico non
  sono validi
  **cosa se ne prende** `Load group type` (Permanent / Variable / Accidental / Seismic / …) e `Relation`
  (Exclusive / Standard / Together) come semantica di combinabilità che sopravvive all'export
- **URL** <https://www.saf.guide/en/stable/loads/structuralloadcase.html> · **[V]** ·
  `fonti/saf-structuralloadcase.md`
  **perché conta qui** mappa uno a uno sulle `Azione` di NOVA e sulla loro natura NTC
  **cosa se ne prende** `Action type` ∈ {Permanent, Variable, Accidental} e `Load type` ∈ {Self weight,
  Standard, Seismic, …}; `Duration` obbligatoria solo per `Variable`; la nota che «Self weight» va usato solo
  per il peso proprio **generato automaticamente**
- **URL** <https://www.saf.guide/en/stable/loads/structuralloadcombination.html> · **[V]** ·
  `fonti/saf-structuralloadcombination.md`
  **perché conta qui** è il punto in cui le combinazioni NTC rischiano di essere buttate via dal ricevente
  **cosa se ne prende** l'enum `National standard` senza voci NTC; la regola che `Load Factor #` è
  obbligatorio se la categoria **non** è «According national standard»; le triplette indicizzate
  `Load Factor #` / `Multiplier #` / `Load Case name #` fino a 99
- **URL** <https://www.saf.guide/en/stable/results/resultinternalforce1d.html> · **[V]** ·
  `fonti/saf-resultinternalforce1d.md`
  **perché conta qui** è l'unico formato aperto che porta **i risultati** e non solo il modello, ed è ciò che
  rende SAF interessante per una tesi
  **cosa se ne prende** N, V_y, V_z, M_x, M_y, M_z per stazione, obbligatori; `Section at [m]` più `Index`
  (da 1, distingue sinistra e destra della stessa sezione); `Combination key` come stringa `1.35*LC1+…`
- **URL** <https://www.saf.guide/en/stable/getting-started/best-practice-for-saf-implementation.html> ·
  **[V]** · `fonti/saf-best-practice.md`
  **perché conta qui** è l'unica pagina che dice come **serializzare**, e sono le regole che fanno fallire un
  import senza messaggio d'errore
  **cosa se ne prende** punto decimale invariante di cultura, nessun separatore delle migliaia, `null` e non
  stringa vuota, formato «Number», nessun arrotondamento, punto e virgola come separatore interno
- **URL** <https://www.saf.guide/en/stable/SDK/Introduction.html> · **[V]** · `fonti/saf-sdk-introduction.md`
  **perché conta qui** risponde alla domanda «esiste un validatore ufficiale»: sì, ma in C#
  **cosa se ne prende** quattro pacchetti NuGet, il principale fa import/export; nessun binding Python

### SAF — misure di sessione

- **URL** <https://github.com/StructuralAnalysisFormat/StructuralAnalysisFormat-Examples> — file
  `examples/2.2.0/SAF_example_HOUSE_metric_ZYX_220.xlsx` · **[M]**
  **perché conta qui** è il solo artefatto ufficiale contro cui verificare un export, in assenza di validatore
  **cosa se ne prende** 133.350 byte, sha256 `5b0f8271…`; 43 fogli tutti presenti; intestazione in riga 1;
  `SAF Version = 2.2.0` e `National code = EC-Standard-EN` nel `Model`; i due nomi troncati a 31 caratteri;
  l'ordine delle colonne di `StructuralCurveMember` diverso da quello della documentazione
- **URL** <https://api.github.com/orgs/StructuralAnalysisFormat/repos> · **[M]**
  **perché conta qui** stabilisce che non esiste uno strumento ufficiale open source, e con quale licenza
  **cosa se ne prende** quattro repo (`documentation`, `StructuralAnalysisFormat-Doc`, `-Examples`,
  `test-rtd`), **nessuna licenza dichiarata**, ultimo push 13/04/2023
- **URL** <https://www.nuget.org/profiles/StructuralAnalysisFormat> — metadati letti da
  `https://api.nuget.org/v3/registration5-semver1/structuralanalysisformat/index.json` · **[M]**
  **perché conta qui** corregge l'impressione, data dal repo fermo al 2023, che SAF sia abbandonato
  **cosa se ne prende** `StructuralAnalysisFormat` 1.7.3, **Apache-2.0**, pubblicato il 04/04/2025
- **URL** <https://autoconverter.structuraltoolkit.com/en-GB/saf-viewer> · **[M]** sulla raggiungibilità
  (HTTP 200), **[NON TROVATO]** su licenza e regole di validazione applicate
  **perché conta qui** è l'unico validatore interattivo esistente, ed è di terza parte
  **cosa se ne prende** un riscontro manuale prima di dichiarare valido un export; non è automatizzabile in CI

### Librerie

- **URL** <https://github.com/fib-international/structuralcodes> · PyPI
  <https://pypi.org/project/structuralcodes/> · **[V]** sorgente letto, **[M]** metadati
  **perché conta qui** è l'unica libreria che copre insieme dominio M-N, momento-curvatura e taglio EC2, cioè
  il grosso del §4.1.2 tradotto in Eurocodice
  **cosa se ne prende** 0.7.1, Apache-2.0, `main` a `0754aea` del 10/06/2026, py ≥ 3.10; codici EC2-2004,
  EC2-2023, MC2010, MC2020; nessun modulo italiano
- **URL** <https://raw.githubusercontent.com/fib-international/structuralcodes/0754aeaeb257d97b79f832e41ab38b9777c82878/structuralcodes/codes/ec2_2004/shear.py>
  · **[V]** letto in sessione, sha256 `3769580c…`, 551 righe · cattura in
  `fonti/structuralcodes-ec2-2004-shear.md`
  **perché conta qui** dimostra che `[4.1.23]` e `[4.1.27]`-`[4.1.29]` sono già implementate, coi parametri
  giusti come default
  **cosa se ne prende** `VRdc(..., k1=0.15, gamma_c=1.5)` con `CRdc = 0.18/gamma_c`;
  `vmin = 0,035·k^1,5·√f_ck`; `VRds(Asw, s, z, theta, fyk, alpha)` = `[4.1.27]` con z = 0,9 d; e il vincolo
  `21,8° ≤ θ ≤ 45°` che coincide con `[4.1.25]` ma **solleva** invece di saturare
- **URL** <https://raw.githubusercontent.com/fib-international/structuralcodes/0754aeaeb257d97b79f832e41ab38b9777c82878/structuralcodes/codes/ec2_2004/_section_7_3_crack_control.py>
  · **[V]** letto in sessione, sha256 `6bdd6d59…`, 941 righe · cattura in
  `fonti/structuralcodes-ec2-2004-crack-control.md`
  **perché conta qui** la `[C4.1.6]` è illeggibile nel PDF della Circolare: qui la stessa formula esiste già
  scritta e testata come EC2 (7.9)
  **cosa se ne prende** `eps_sm_eps_cm`, `sr_max_close` / `sr_max_far`, `wk(sr_max, eps_sm_eps_cm)`,
  `kt('short'|'long')`, `k1`-`k4`, `As_min`; e l'identità w_k(NTC) = w_k(EC2) purché si passi s_r,max e non
  Δ_sm
- **URL** <https://raw.githubusercontent.com/fib-international/structuralcodes/0754aeaeb257d97b79f832e41ab38b9777c82878/structuralcodes/sections/_beam_section.py>
  · **[V]** letto in sessione (1.906 righe, sha256 `de9638b2…`) · cattura in
  `fonti/structuralcodes-beam-section.md`
  **perché conta qui** è l'API che NOVA chiamerebbe per M_Rd(N_Ed) e per il dominio M-N
  **cosa se ne prende** `calculate_bending_strength`, `calculate_moment_curvature`,
  `calculate_nm_interaction_domain`, `calculate_nmm_interaction_domain`, `calculate_mm_interaction_domain`,
  `calculate_strain_profile`; e il rename `GenericSection` → `BeamSection` avvenuto in **0.7.0**, con la
  vecchia classe deprecata: un documento scritto prima della 0.7.0 cita un nome che sta per sparire
- **URL** <https://raw.githubusercontent.com/fib-international/structuralcodes/0754aeaeb257d97b79f832e41ab38b9777c82878/structuralcodes/materials/concrete/_concreteEC2_2004.py>
  · **[V]** letto in sessione (562 righe, sha256 `5caadcc6…`) · cattura in
  `fonti/structuralcodes-concrete-ec2-2004.md`
  **perché conta qui** contiene il default che rompe silenziosamente la conformità NTC
  **cosa se ne prende** `alpha_cc` è parametro con default **1,0** (`self._alpha_cc or 1.0`) mentre `[4.1.3]`
  impone 0,85; `gamma_c` default 1,5, coerente
- **URL** <https://pypi.org/project/concreteproperties/> · repo
  <https://github.com/robbievanleeuwen/concrete-properties> · **[M]**
  **perché conta qui** è l'alternativa che si cita sempre nel confronto, e va scartata per un motivo preciso,
  non per gusto
  **cosa se ne prende** 0.8.0, MIT, py ≥ 3.12, repo vivo (push 06/07/2026, 241 stelle); `design_codes/`
  contiene **solo** `as3600.py` e `nzs3101.py` — nessun EC2, nessuna NTC

### Interni al repo

- **percorso** `nova/modello.py:262-288` · **[V]** letto in sessione
  **perché conta qui** stabilisce che il generatore di combinazioni non ha bisogno di un modello dati nuovo
  **cosa se ne prende** `Azione(natura: G1|G2|Q|E, categoria)` col validatore `_q_ha_la_categoria`;
  `Termine(azione, coefficiente)`; `Combinazione(termini, tipo, generata)` con i cinque `tipo` che coincidono
  con `[2.5.1]`-`[2.5.5]`
- **percorso** `nova/modello.py:109-142` · **[V]** letto in sessione
  **perché conta qui** dice se le verifiche del §4.1.2 hanno i dati che chiedono
  **cosa se ne prende** `Sezione(b, h, copriferro, file[lato, n, diametro], staffe[diametro, passo, bracci])`:
  b_w, d, A_sl, A_sw e s ci sono tutti; **manca** la classe di esposizione, che serve alla Tab. 4.1.IV
- **percorso** `docs/ricerca/06-dominio-analisi-verifiche-formati.md:104-120` · **[V]**
  **perché conta qui** è la ricerca che questa estende, e va citata invece che ripetuta
  **cosa se ne prende** SAF spinto da SCIA / Allplan / IDEA e supportato da MasterSap; il §10.2.1 in forma
  compressa; `structuralcodes` come candidato e l'assenza di librerie per taglio, nodi e gerarchia NTC
- **percorso** `docs/ricerca/09-legami-costitutivi-ntc.md` · **[V]**
  **perché conta qui** copre già il §4.1.2.1.2 (legami, confinamento `[4.1.8]`-`[4.1.12.i]`, veste delle
  resistenze), che qui non si ripete
  **cosa se ne prende** la derivazione `Concrete02` / `Steel02` e la raccomandazione «medie nel modello,
  veste come campo del materiale»
- **percorso** `~/Backup-vault/current/NTC 2018 con circolari/riconversione-2026-09-07/LEGGIMI.md` · **[V]** ·
  cattura in `fonti/ntc-corpus-leggimi.md`
  **perché conta qui** è la ragione per cui ogni formula qui sopra è stata riestratta dal PDF invece che
  copiata dal corpus
  **cosa se ne prende** la scala di fiducia per documento (prosa NTC affidabile, simboli affidabili, formule
  **con riserva**; formule della Circolare **inaffidabili**) e la regola «una formula presa da `ntc2018.md`
  va confrontata con il PDF prima di citarla»
