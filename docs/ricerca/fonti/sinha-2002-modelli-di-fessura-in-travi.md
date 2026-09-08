# Simplified models for the location of cracks in beam structures using measured vibration data (Sinha, Friswell, Edwards 2002)

**URL** http://michael.friswell.com/PDF_Files/J77.pdf
**Catturato** 2026-09-08 · **strumento** curl 8.7.1 + pdftotext 26.08.0 (-layout)

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

Sinha J.K., Friswell M.I., Edwards S., *Simplified models for the location of cracks in beam
structures using measured vibration data*, Journal of Sound and Vibration 251(1) (2002) 13-38,
doi:10.1006/jsvi.2001.3978. PDF ospitato dal sito personale di M.I. Friswell (coautore).

## 1 — le tre famiglie di modello di fessura (righe 104-128)

```
pattern recognition algorithms.
   There are a number of approaches to the modelling of cracks in beam-type structures
reported in the literature. Dimarogonas [27] and Ostachowicz and Krawczuk [28] gave
comprehensive surveys of crack modelling approaches. The simplest method for an FE
model is to use a reduced sti!ness for a complete element to simulate a small crack in that
element [8, 11, 13, 29, 30]. Another simple approach is to divide the beam-type structure

                            LOCATION OF CRACKS IN BEAMS                                 15
into two parts that are pinned at the crack location and the crack is simulated by the
addition of a rotational spring [12, 31}33]. These approaches are a gross simpli"cation of
the crack dynamics and do not involve the crack size and location directly. The alternative
is to model the dynamics close to the crack more accurately, for example producing
a closed-form solution giving the natural frequencies and mode shapes of cracked beam
directly [34] or using di!erential equations with compatible boundary conditions satisfying
the crack conditions [35}37]. Alternatively, two- or three-dimensional "nite element
meshes for beam-type structures with a crack may be used [38}40]. These methods produce
detailed and accurate FE models but are a complicated and computational intensive
approach for modelling simple structures like beams. Furthermore, the FE models will
contain modelling errors, the data will include measurement errors, and the use of
low-frequency vibration will tend to average out localized e!ects. The result is that these
very detailed models do not substantially improve the results from crack detection and
location algorithms. Lee and Chung [41] generated the #exibility matrix of a beam element
with a crack using an energy method. Most of the work was theoretical, although some
experimental validation has been performed either by using the ratios of the lower natural
frequencies or by direct comparison [33, 41].
```

## 2.1 — perche' il triangolo, e i limiti di molla e di elemento intero (righe 171-235)

```



2.1. CRACK MODELLING
   Clearly, some of the materials adjacent to the crack will not be stressed and thus will o!er
only a limited contribution to the sti!ness. The actual form of this increased #exibility is
quite complicated, but in this paper this phenomenon is approximated by a variation in the
local #exibility (EI). In reality, for a crack on one side of a beam, the neutral axis will change
in the vicinity of the crack, but this will not be considered here. Christides and Barr [44]
considered the e!ect of a crack in a continuous beam and calculated the sti!ness, EI, for
a rectangular beam to involve an exponential function given by

                                           EI
                             EI(x)"                    ,                                      (1)
                                   1#C exp(!2x!x /d)
                                                  H

where C"(I !I )/I , I "wd/12 and I "w(d!d )/12 are the second moment
                    AH AH                       AH           AH
of areas of the undamaged beam and at the jth crack. w and d are the width and depth of
the undamaged beam, and d is the crack depth. x is the position along the beam and x
                               AH                                                              H
the position of the crack.  is a constant that Christides and Barr estimated from
experiments to be 0)667. The inclusion of the sti!ness reduction of Christides and Barr
[44] in an FE model of a structure is complicated because the #exibility is not local to
one or two elements, and thus the integration required to produce the sti!ness matrix
for the beam would have to be performed numerically every time the crack position
changed. Furthermore, for complex structures, without uniform long beams, equation
(1) would only be approximate. The comparison of the proposed model with that of
Christides and Barr is intended to show the similarities of the current simpli"ed approach
with an established model.
   Figure 2 shows the variation of EI for a crack 25% of the beam depth using equation (1).
What is clear is that most of the #exibility is local to the crack, although there are also very
small changes in #exibility far away from the crack. In this paper, a simpli"ed form of the
sti!ness variation is used, where the #exibility varies linearly from the uncracked to cracked
beam section, as shown in Figure 2. The variation in EI starts from an e!ective length, l , on
                                                                                            A
either side of the crack location, and at the position of highest #exibility the sti!ness is the
second moment of area of the cracked section and is based on the crack depth. The
determination of the length l will be considered later. Although this model will not be
                                 A
accurate at high frequencies, for low-frequency vibration this model will produce a local
#exibility that gives a su$ciently accurate equivalent model of the beam with a crack. The
great advantage of this approach is simplicity. An alternative simple approach is to reduce
the sti!ness of a whole element. However, the number of elements must increase to
obtain good localization, and estimating the crack depth must be done a posteriori. Another
simple approach models the crack using a pinned connection and a rotary spring.
However, this spring must be introduced at a node and estimating the crack depth is

                                   LOCATION OF CRACKS IN BEAMS                                            17




  Figure 2. Comparison in the variation in sti!ness near a crack for the triangular reduction (solid) and the
approach of Christides and Barr [35] (dotted) for a crack depth of 25%.




       Figure 3. The eth beam element with a triangular variation in sti!ness used to model the crack.




```
