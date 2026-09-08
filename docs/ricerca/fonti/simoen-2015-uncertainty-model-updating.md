# Dealing with uncertainty in model updating for damage assessment: a review (Simoen, De Roeck, Lombaert 2015)

**URL** https://lirias.kuleuven.be/server/api/core/bitstreams/8b82a5c7-cf19-490c-a3f3-a7a29a1549c0/content
**Catturato** 2026-09-08 · **strumento** curl 8.7.1 + pdftotext 26.08.0 (-layout)

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

Simoen E., De Roeck G., Lombaert G., *Dealing with uncertainty in model updating for damage
assessment: a review*, Mechanical Systems and Signal Processing 56-57 (2015) 123-149,
doi:10.1016/j.ymssp.2014.11.001. Postprint dell'autore nel repository istituzionale KU Leuven.

## 1.3 — la trave in c.a. di laboratorio (righe 152-158 del testo estratto)

```
(section 4) and a non-probabilistic fuzzy approach (section 5). Arguably, these two methods constitute the
most popular of their corresponding domains.

1.3. An illustrative example of FE model updating
    Throughout this paper, a simple but instructive engineering application will serve as a running example
to illustrate the workings of both UQ methods. The application concerns the damage assessment of a
reinforced concrete (RC) beam with a length of 6 m and dimensions as shown in figure 1a. The beam was
built in a laboratory environment, and controlled damage was induced by applying a static load of 25 kN
at two thirds of the length of the beam (figure 1b). After applying the damage, free-free vibration tests
```

## Fig. 2 — sei pattern di rigidezza diversi, stessi modi (righe 178-182)

```
Figure 1: (a) Cross-section of the reinforced concrete beam, (b) set-up of static loading and (c) image of vibration testing [21].


                                        60                                                                      0.1




```

## 2.2.3 — funzione costo e pesi (righe 319-345)

```
                                  j=1                                           j=1

where each Kj and Mj are substructure contributions to the global stiffness and mass matrix, specified by
the finite element model of the structure.

2.2.3. Cost function
    As previously indicated, essential in the model updating scheme is the confrontation of the measured
and computed data in a cost function F (equation (2)). Many alternative formulations are possible for the
cost function, but most often it is expressed as a weighted least squares fit between the predictions GM (θM )
and the data d̄ as follows:
                                        1                   1
                           F (θM ) =      η(θM )T W η(θM ) = k W1/2 η(θM ) k22                            (5)
                                        2                   2
where k · k2 denotes the Euclidian or 2-norm of a vector, and where W ∈ RN ×N is a weighting matrix. The
residual vector η(θM ) = d̄ − GM (θM ) ∈ RN contains the difference between the model predictions and the
data; it is therefore often referred to as the prediction error.
    In most practical applications, a diagonal weighting matrix W is assumed, where the weighting coeffi-
cients are chosen proportionate to the inverse measured data so that the individual residuals are in effect



                                                      6

normalized:
                                                  N
                                                1 X (d¯k − yk (θM ))2
                                      F (θM ) =     ak                                                      (6)
```

## 2.3 — mal condizionamento e parametrizzazione (righe 395-425)

```
to having a sensitivity matrix J of full column rank. Even though rank-deficiency of J is usually not a
problem in model updating, near -rank-deficiency is extremely common. This so-called ill-conditioning of
J causes the Hessian to become near-singular and difficult to invert accurately, which results in a solution
that is very unstable with respect to small changes in the data vector d̄ and the model predictions.
    When the relationship between model parameters and model outputs is nonlinear – as is most often the
case – the least squares problem in equation (7) cannot be solved directly anymore, but requires an iterative

                                                         7

 approach. Although a multitude of efficient methods has been developed [5, 37, 38], local gradient-based
 iterative algorithms such as the Gauss-Newton approach are most often employed. It can be shown that
 these methods require the solution of a set of equations very similar to (8) in each iteration, only now the
 Jacobian J and Hessian H are local approximations, which can be computed numerically or analytically
 (see below). In other words, both in the linear and in the nonlinear case, the uniqueness and stability of the
 solution are determined by the conditioning of the sensitivity matrix J.
     By far the most common cause of ill-conditioning in model updating is found in the incompatibility of
 the prediction model and its parameterization with the resolution and type of the observational data [39].
 In general, ill-conditioning through parameterization can be avoided or abated by (1) choosing physically
 relevant parameters that sufficiently affect the observed data (thereby avoiding near-zero columns in the sen-
 sitivity matrix); and (2) avoiding overparameterization along the structure (thereby avoiding nearly linearly
 dependent columns in the sensitivity matrix for neighboring elements). The latter is usually accomplished
 by not defining the updating parameter element-wise, but instead for sets of (adjacent) elements, also re-
 ferred to as substructures. Alternatively, the variation of the parameter values along the structure can be
 described by a function (e.g. a linear or quadratic interpolation function) which is characterized by only
 a few parameters, thus reducing the number of updating parameters significantly [40]. Additionally, it is
 often advantageous to select correction factors instead of the physical parameters themselves; as such it is
 avoided that largely varying orders of magnitude cause numerical difficulties (inaccuracy) when inverting
 the Hessian matrix.
     When ill-conditioning cannot be resolved by well thought out parameterization of the model, regular-
 ization techniques may provide an answer. The basic idea behind these methods is to replace the ill-posed
 problem with a well-conditioned one that behaves similarly and produces an approximate solution to the
```

## 2.4 — residui modali, scalatura, MAC (righe 459-520)

```
                 Figure 3: First four experimental bending modes and corresponding natural frequencies for the damaged state.



                                                                                8

                                   1     2     3     4    5   6   7       8         9   10

                              Figure 4: Definition of the 10 substructures in the RC beam.



Cost function. In view of the employed modal data, the prediction error can be partitioned as η = {ηλ ; ηφ },
where the eigenvalue and mode shape residual vectors are defined as ηλ = {. . . ; ηλ,r ; . . .} ∈ RNm and
ηφ = {. . . ; ηφ,r ; . . .} ∈ RNm No , respectively. In the present work, it is chosen to define the individual modal
residuals as follows:

                           ηλ,r = λ̄r − λr (θM )                                             ∈ R                 (9)
                                                                                                   No
                           ηφ,r = γr φ̄r − Lφr (θM )                                         ∈ R                (10)

where r = 1 . . . Nm , and the binary matrix L ∈ RNo ×Nd selects the No observed degrees of freedom from the
Nd degrees of freedom present in the FE model. The coefficient γr is a scaling factor to ensure that simulated
and measured mode shapes are scaled equally. This is necessary since in most cases, the experimental modes
are identified using output-only data, and therefore cannot be mass-normalized. The scaling factor can be
obtained from a reference value at a single observation point or, alternatively, through a least squares fit
between measured and computed mode shapes, which yields:

                                                          φ̄T
                                                            r Lφr (θM )
                                                   γr =                                                         (11)
                                                             k φ̄r k22

The construction of the cost function further requires a matching of the Nd calculated modes to the Nm
experimental mode shapes, in order to ensure that corresponding modes are compared. To this end, the
modal assurance criterion (MAC) is frequently applied, which consists of computing so-called MAC-values
as a measure for the correspondence between a calculated mode shape φi and a measured mode shape φ̄j :
                                                                       T
                                                               | (Lφi ) φ̄j |2
                                         MAC(φi , φ̄j ) =                                                       (12)
                                                              k Lφi k22 k φ̄j k22

The MAC-values always lie between 0 and 1, where values closer to 1 represent a better agreement between
the considered mode shapes. In selected cases with many closely spaced or very similar modes, the MAC-
approach may lead to erroneous mode matching; therefore, alternative mode matching methods often include
an eigenfrequency or eigenvalue residual as well, for instance by matching modes that result in the lowest
value of the following quantity:

                                                                              λi
                                             1 − MAC(φi , φ̄j ) + 1 −                                           (13)
                                                                              λ̄j

It is important to note that mode shape matching often results in non-smooth behavior of the objective
function. As the parameter values vary, the mode shapes might get matched differently, resulting in sudden
jumps in the objective function which can hinder the efficiency of gradient-based optimization algorithms
significantly.
    A normalized least squares cost function as defined in equation (6) is adopted, which in this case leads
to the following reformulation of the objective function:
                                    Nm                           Nm
                                  1X       (λ̄r − λr (θM ))2   1X       k γr φ̄r − Lφr (θM ) k22
                      F (θM ) =         ar                   +       br                                         (14)
                                  2 r=1             2
```

## 2.4 — risultati sulla trave: tabella 1 e riduzione del 50 % (righe 576-590)

```
stiffness values along the beam are shown in figure 5, where the damage induced by the static load at
about 4 m is clearly reflected by a decrease of the bending stiffness by about 50% at this location. This
application shows how a relatively limited amount of modal data and a simple FE prediction model can help
identifying, locating, and quantifying structural damage. The question that now arises is how measurement




                                                       10

and modeling uncertainty affect the updating results.
                 ×106
                10

                 8



   EI [Nmm2 ]
                 6                                          Mode   finit   fexp ∆finit MACinit   fupd ∆fupd MACupd
                                                                    [Hz]    [Hz]  [%]     [-]     [Hz] [%]     [-]
```

## 4.5.1 — il MAP e' il minimi quadrati regolarizzato (righe 927-950)

```
applications, the reader is referred to [146, 151].

4.5. The posterior PDF
    When the prior PDF and likelihood function are determined, equation (21) allows for the updating of
the PDFs of the model parameters based on experimental observations of the system. For most practical
applications where multiple parameters are involved, computing the joint and marginal PDFs requires
solving high-dimensional integrals, therefore use is often made of approximate measures (section 4.5.3) or
sampling methods such as Markov chain Monte Carlo (MCMC) methods (section 4.5.4). In selected cases,
the posterior PDF can be determined analytically, for instance when conjugate priors are used (as e.g. in
section 4.5.2), or numerically, for instance when the number of parameters remains limited to a few.
    Once the posterior PDF is computed, estimated or approximated, it can be used to obtain information
on the so-called resolution of the parameters through the Bayesian scheme, i.e. how much the uncertainty
on the parameters is reduced by the observed data and prior information. A resolution analysis typically
includes comparing standard posterior statistics (mean values, standard deviations, covariance matrices),
and can be complemented by performing an eigenvalue analysis to help identify well-resolved features or
parameter combinations [152].

4.5.1. Relation to deterministic model updating
    The Bayesian model updating approach also provides important insight into the often ill-posed determin-
istic model updating problem (section 2.3). This is most easily demonstrated by considering the maximum
a posteriori (MAP) estimate, i.e. the peak or mode of the posterior PDF. The MAP estimate is defined as
the parameter set that maximizes the posterior PDF, or, equivalently, minimizes the negative log posterior
PDF:

          θ̂ MAP = arg min FMAP       where      FMAP = − log L(θ | d̄) − log p(θ) = FML + FMAPr          (27)
                      θ

Assuming a zero-mean Gaussian prediction error characterized by a covariance matrix Ση , the maximum
```
