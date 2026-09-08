# The L-curve and its use in the numerical treatment of inverse problems (P.C. Hansen)

**URL** https://www.sintef.no/globalassets/project/evitameeting/2005/lcurve.pdf
**Catturato** 2026-09-08 · **strumento** curl 8.7.1 + pdftotext 26.08.0 (-layout)

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

P.C. Hansen, *The L-curve and its use in the numerical treatment of inverse problems*, Department of
Mathematical Modelling, Technical University of Denmark. Capitolo pubblicato in
*Computational Inverse Problems in Electrocardiology*, WIT Press, 2001.

## Abstract e Tikhonov (righe 1-45)

```
The L-curve and its use in the
numerical treatment of inverse problems
P. C. Hansen
Department of Mathematical Modelling,
Technical University of Denmark,
DK-2800 Lyngby, Denmark

Abstract
The L-curve is a log-log plot of the norm of a regularized solution versus
the norm of the corresponding residual norm. It is a convenient graphical
tool for displaying the trade-off between the size of a regularized solution
and its fit to the given data, as the regularization parameter varies. The
L-curve thus gives insight into the regularizing properties of the underlying
regularization method, and it is an aid in choosing an appropriate regu-
larization parameter for the given data. In this chapter we summarize the
main properties of the L-curve, and demonstrate by examples its usefulness
and its limitations both as an analysis tool and as a method for choosing
the regularization parameter.


1    Introduction
Practically all regularization methods for computing stable solutions
to inverse problems involve a trade-off between the “size” of the reg-
ularized solution and the quality of the fit that it provides to the
given data. What distinguishes the various regularization methods
is how they measure these quantities, and how they decide on the
optimal trade-off between the two quantities. For example, given the
discrete linear least-squares problem min kA x−bk2 (which specializes
to A x = b if A is square), the classical regularization method devel-
oped independently by Phillips [31] and Tikhonov [35] (but usually
referred to as Tikhonov regularization) amounts — in its most general

                                     1

form — to solving the minimization problem
                              n                                   o
           xλ = arg min kA x − bk22 + λ2 kL (x − x0 )k22 ,            (1)

where λ is a real regularization parameter that must be chosen by
the user. Here, the “size” of the regularized solution is measured
by the norm kL (x − x0 )k2 , while the fit is measured by the 2-norm
kA x−bk2 of the residual vector. The vector x0 is an a priori estimate
of x which is set to zero when no a priori information is available.
The problem is in standard form if L = I, the identity matrix.
    The Tikhonov solution xλ is formally given as the solution to the
```

## Curva L contro cross-validation generalizzata (righe 685-712)

```
    λ 2
 || x ||                                                100
             1
           10
                                                         50


             0
                                                          0
           10
              −2    −1                    0    1                −5              0
            10     10                10       10              10               10
                        || A xλ − b ||2                        Reg. param. λ



Figure 3: A typical L-curve (left) and a plot (right) of the corre-
sponding curvature κ as a function of the regularization parameter.


cross validation (GCV) developed in [10] and [38], are presented in
[22] and in Section 7.7.1 of [21]. The test problem in [22] is the
problem shaw from the Regularization Tools package [19], [20],
and the test problem in [21] is helio which is available via the author’s
home page. Both tests are based on ensembles with the same exact
right-hand side b perturbed by randomly generated perturbations e
that represent white noise.
      The conclusion from these experiments is that the L-curve cri-
```

## 8 — limiti della curva L (righe 740-760)

```
                       ° A          A xλ − b °°
                 min ° ° λI   z −             °
                                        0      2

and which can be computed by the same algorithm and the same
software as xλ . The vector zλ is identical to the correction vector
in the first step of iterated Tikhonov regularization, cf. Section 5.1.5
in [21].
     For large-scale problems where any direct method for computing
the Tikhonov solution is prohibitive, iterative algorithms based on
Lanczos bidiagonalization are often used. For these algorithms the
techniques presented in [1] and [12] can be used to compute envelopes
in the (ρ, η)-plane that include the L-curve.


8     Limitations of the L-curve criterion
Every practical method has its advantages and disadvantages. The
advantages of the L-curve criterion are robustness and ability to treat
perturbations consisting of correlated noise. In this section we de-
scribe two disadvantages or limitations of the L-curve criterion; un-
derstanding these limitations is a key to the proper use of the L-curve
```
