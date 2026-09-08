# ARTeMIS Modal — UFF Data Set Number 55 (Structural Vibration Solutions)

**URL** https://www.svibs.com/resources/ARTeMIS_Modal_Help_v7/UFF%20Data%20Set%20Number%2055.html
**Catturato** 2026-09-08 · **strumento** curl 8.7.1

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

Pagina di aiuto di **ARTeMIS Modal** (Structural Vibration Solutions A/S), il programma di
analisi modale operazionale piu' diffuso nei laboratori. Documenta quale data set UFF il
programma usa per **esportare i risultati modali**.

## Descrizione (meta `Description`)

```
UFF Data Set Number 55
This is the Universal File Format data set for Data at Nodes. For more information see e.g. WEB-site of the Structural Dynamics Research Laboratory at University of Cincinnati, Ohio. In ARTeMIS Extractor it is used for export
```

## Struttura dei record, come la documenta il produttore

```
RECORD 1: Format (40A2)
Field 1
ID Line 1.
RECORD 2: Format (40A2)
Field 1
ID Line 2.
RECORD 3: Format (40A2)
Field 1
ID Line 3.
RECORD 4: Format (40A2)
Field 1
ID Line 4.
RECORD 5: Format (40A2)
Field 1
ID Line 5.
RECORD 6: Format (6I10)
Data Definition Parameters
Field 1
Model Type
0: Unknown
1: Structural
2: Heat Transfer
3: Fluid Flow
Field 2
Analysis Type
0: Unknown
1: Static
2: Normal Mode
3: Complex eigenvalue first order
4: Transient
5: Frequency Response
6: Buckling
7: Complex eigenvalue second order
Field 3
Data Characteristic
0: Unknown
1: Scalar
2: 3 DOF Global Translation Vector
3: 6 DOF Global Translation & Rotation Vector
4: Symmetric Global Tensor
5: General Global Tensor
Field 4
Specific Data Type
0: Unknown
1: General
2: Stress
3: Strain
4: Element Force
5: Temperature
6: Heat Flux
7: Strain Energy
8: Displacement
9: Reaction Force
10: Kinetic Energy
11: Velocity
12: Acceleration
13: Strain Energy Density
14: Kinetic Energy Density
15: Hydro-Static Pressure
16: Heat Gradient
17: Code Checking Value
18: Coefficient Of Pressure
Field 5
Data Type
2: Real
5: Complex
```
