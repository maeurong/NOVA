# Damage identification of a reinforced concrete frame by FE model updating using damage parameterization (Fang, Perera, De Roeck 2008)

**URL** https://oa.upm.es/3038/2/INVE_MEM_2008_61505.pdf
**Catturato** 2026-09-08 · **strumento** curl 8.7.1 + pdftotext 26.08.0 (-layout)

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

Fang S.-E., Perera R., De Roeck G., *Damage identification of a reinforced concrete frame by finite
element model updating using damage parameterization*, Journal of Sound and Vibration 313 (2008)
544-559, doi:10.1016/j.jsv.2007.11.057. Postprint nell'Archivo Digital UPM.

## Abstract (righe 12-30)

```
Abstract

   This paper develops a sensitivity-based updating method to identify the damage in a tested reinforced concrete (RC)
frame modeled with a two-dimensional planar finite element (FE) by minimizing the discrepancies of modal frequencies
and mode shapes. In order to reduce the number of unknown variables, a bidimensional damage (element) function is
proposed, resulting in a considerable improvement of the optimization performance. For damage identification, a reference
FE model of the undamaged frame divided into a few damage functions isfirstlyobtained and then a rough identification
is carried out to detect possible damage locations, which are subsequently refined with new damage functions to accurately
identify the damage. From a design point of view, it would be useful to evaluate, in a simplified way, the remaining bending
stiffness of cracked beam sections or segments. Hence, an RC damage model based on a static mechanism is proposed to
estimate the remnant stiffness of a cracked RC beam segment. The damage model is based on the assumption that the
damage effect spreads over a region and the stiffness in the segment changes linearly. Furthermore, the stiffness reduction
evaluated using this damage model is compared with the FE updating result. It is shown that the proposed bidimensional
damage function is useful in producing a well-conditioned optimization problem and the aforementioned damage model
can be used for an approximate stiffness estimation of a cracked beam segment.



1. Introduction
```

## 2.1 — funzione obiettivo e residui (righe 83-115)

```

2.1. Objective function

  Two modal parameters, modal frequency and mode shape are adopted to construct the residual vectors of
the objective function, which is stated as a nonlinear LS problem:

                                              r/(u)       r:
                      /(u) = ±||r(u)                                        with min/(u),                      (1)
                                              r m (ii)         ue

where ||-|| denotes the Euclidean norm, u denotes the vector containing the unknown updating parameters,
r represents the residual vector comprising the frequency residual Xf and the mode shape residual rm:

                                   rf(u) = 1<(u}        ?
                                                            \     rm(u) = <tf(u)-tf                            (2)
                                                   A
                                                    i
in which Xf and if are the square of the analytical and measured circular frequencies (X — (2nf)2),
respectively; <f>f and tpf are the mass-normalized analytical and measured mode shapes, respectively. It should
be mentioned that in this study, the measured mode shapes are also mass normalized because the impact force
was simultaneously recorded in the RC frame experiment. Alternatively, the mass matrix of the analytical
model might be used for mass normalization of the measured mode shapes [15].
   Meanwhile, the residuals can be weighted according to their importance and the accuracy level of
measurement when necessary. A weighted minimization problem can be denned as

                                                   mini||W 1/2 r(u)|| 2
with the weighting matrix W.

2.2. Updating parameter and correction factor

   Young's modulus of concrete, E, which alternatively reflects the section stiffness as the section inertia /does,
is selected to be the updating parameter in this analysis. A correction factor is used to represent the change of
Young's modulus. A dimensionless correction factor CE,t is used herein instead of an absolute value in order to
```

## 5.1.1 — prova, sensori, conteggio dei residui (righe 486-520)

```
                   -(1)C3                                                                       i C6 (15)

                               0.30                           1.90                       0.30
                                                              2.50
                                                            (Unit:m)

Fig. 5. Modal test of an RC frame: (a) In-situ modal test with spring boundary condition (top right corner), (b) Geometric dimensions and
accelerometer arrangement.




low-energy devices. And the frame was excited by an impulsive load given by an impact hammer and the
response was measured at different positions using piezoelectric accelerometers. The input and output
signals were recorded and analyzed using a self-developed modal testing and analysis program IDAS
and the modal frequencies and corresponding mass-normalized mode shapes were extracted from the
measured data. Fig. 6(a) shows the first three experimental bending modes of the beam and it can be seen that
the damage at the mid-span of beam causes a change in the mode shape. Table 1 presents a summary of the
first nine modal frequencies of the intact and damaged frame. As expected, the frequencies decrease due to
the damage.

                   --Ml



                   "   E4

                       i:

                                    Fig. 7. Substructural division of an RC model.




FE model. A total of ne — 756 plane elements were generated, as shown in Fig. 7. And none of nodes in the FE
```

## 5.1.2 — le tre fasi dell'aggiornamento (righe 521-540)

```
model was constrained in order to simulate the free boundary condition close to the experimental boundary
condition. Then a numeric modal analysis was carried out to obtain the first nine fundamental frequencies and
the corresponding mode shapes.
   For the updating problem, the analytical residual vector r comprises the first nine fundamental frequency
residuals and 90 mode shape residuals of corresponding modes (6 x 15 — 90, 6 is the number of the adopted
mode shapes and 15 is the number of the measured points, Fig. 5(b)), which means a total of nr — 9 + 90 — 99
residuals. But for the construction of sensitivity matrix, the first nine mode shapes are used resulting in
n' — 9 + 135 — 144 numeric residuals.

5.1.2. Updating procedures and performance of damage function
   The damage identification was performed in three updating steps. In the first step, the initially developed FE
model was divided into four (np — 4) substructures, El, E2, E3 and E4, as shown in Fig. 7. Then it was
updated to the reference state using the measured modal frequencies and mode shapes of the undamaged
frame. Subsequently, based on the reference model, the updating was repeated using the measured data
of the damaged frame and the possibly damaged substructure (El) was roughly identified. If a more detailed
damage pattern was required, an additional updating step could be implemented. Only those substructures
roughly detected in the second step would be updated again by dividing them into finer substructures.
In our particular study, the damaged substructure El detected in the previous step was refined into three
new substructures (El =^E1' + E2' + E3'), and the remainder beam segments were also assigned a new
substructure E4' in order to avoid misidentifying in the second step. Then Young's moduli of those new
```

## Tabella 2 — frequenze sperimentali integro/danneggiato (righe 592-605)

```
state, respectively.


5. Damage identification of an RC frame

5.1. Damage identification by FE updating

5.1.1. FE modeling and residual construction
   A 2D plane element having four nodes with two translation degrees of freedom at each node was used to
model the RC frame. The measured material properties and geometrical dimensions were used to develop the

Table 2
Updated modal frequencies of reference and damage states

Updating          Undamaged                                                          Damaged
```

## 5.1.3 / 5.1.4 — stato di riferimento e stato danneggiato (righe 653-690)

```
                                                                               20
                                                                                10
                                                                                0
                              3      4     5    6     7       8                             1     2     3       4    5 6      7   8     9
                                    Frequency Order                                                                 Mode

Fig. 8. Illustration of updated modal parameters: (a) comparison of initial and reference updating states and (b) comparison of reference
and damage updating states.

5.1.3. Reference state updating
   Young's moduli of the four substructures, E l , E2, E3 and E4, were updated separately to minimize the
discrepancies between the experimental and numerical modal data. The initial FE model was updated to the
reference state with the updating results shown in Tables 1 and 2, Figs. 6 and 8. Table 2 lists the relative
differences in modal frequencies with respect to the experimental results both for the initial and updated FE
models. It is evident that a clear improvement appears for most frequencies after updating. As can be observed
in Fig. 8, only minor differences appear in the MAC-values between the initial and the updated models, since
very small changes occur for the experimental mode shapes (Fig. 6(a)). Meanwhile, Table 1 shows that all
Young's moduli increase (negative correction factors) except that of the substructure at joint region (E2),
which decreases (positive correction factors) about 12% with respect to the initial value. This is reasonable due
to the fact that when casting, the concrete in the joint regions was not so compact as that of the concrete
specimens. On the contrary, the existence of reinforcement contributes to the increase of the stiffness of the
other substructures (for substructure E2, the contribution of reinforcement could not compensate the stiffness
reduction caused by casting).

5.1.4. Damage state updating
   The identification of the applied damage was performed in two steps. Firstly, the reference FE model was
updated again using the measured modal data of the damaged frame. The same optimization procedure with
the same residuals as in the reference updating was applied and Table 1 clearly indicates that El was seriously
damaged when compared with the other substructures. However, upon considering only four substructures for
the whole frame the damage identification could be very rough since the possible damage is supposed to spread
over a limited zone. Hence, in order to accurately locate the damage, El was refined into three new
substructures, El', E2' and E3' (Fig. 7, E4' was included as a supplement due to the consideration of updating
the whole beam), and the updating was repeated based on the reference FE model but only Young's moduli of
the four new substructures were adjusted to accurately locate and quantify the damage occurred in El' and E2'
(Table 1), which agree with the experimental observations. Furthermore, the substructure El' has a stiffness
reduction of 38% with respect to the reference value and E2' of 11% might also be lightly damaged, which is
also in agreement with the experimental results.
   To evaluate the consistency between the coarse mesh of damage elements and the refined mesh, an
```
