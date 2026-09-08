# The sensitivity method in finite element model updating: A tutorial (Mottershead, Link, Friswell 2011)

**URL** http://michael.friswell.com/PDF_Files/J188.pdf
**Catturato** 2026-09-08 · **strumento** curl 8.7.1 + pdftotext 26.08.0 (-layout)

> **Estratto, non copia integrale.** Questo file conserva le sole porzioni citate dalla
> ricerca, verbatim dalla fonte, perche' il riferimento resti verificabile quando l'originale
> cambia o sparisce. Il testo integrale sta all'URL qui sopra, presso il suo editore.

Mottershead J.E., Link M., Friswell M.I., *The sensitivity method in finite element model updating:
A tutorial*, Mechanical Systems and Signal Processing 25 (2011) 2275-2296,
doi:10.1016/j.ymssp.2010.10.012. PDF ospitato dal sito personale di M.I. Friswell (coautore).

## 2 — linearizzazione e matrice di sensitivita' (righe 127-152)

```

2. Sensitivity analysis

   The sensitivity method is based upon linearization of the generally non-linear relationship between measurable outputs,
such as natural frequencies, mode shapes or displacement responses and the parameters of the model in need of correction.
Thus the sensitivity method is developed from a Taylor series expansion truncated after the linear term
        ez ¼ zm zðhÞ  ri Gi ðhhi Þ                                                                                        ð1Þ

   The residual, ri, is deﬁned at the ith iteration as
        ri ¼ zm zi                                                                                                           ð2Þ

so that linearization is carried out at h = hi. The measured and analytically predicted outputs are denoted by zm and zi = z(hi),
which typically may be eigenfrequencies, mode-shapes or complex frequency response functions. The sensitivity matrix Gi is

                                    J.E. Mottershead et al. / Mechanical Systems and Signal Processing 25 (2011) 2275–2296             2277


given by
                 
              @zj
       Gi ¼                                                                                                                             ð3Þ
              @yk h ¼ hi

where j=1, 2, y, q denotes the output data points and k=1, 2, y, p is the parameter index. The sensitivity matrix Gi is computed at
the current value of the complete vector of parameters h = hi. The error, ez, is assumed to be small for parameters h in the vicinity of hi.
   At each iteration, Eq. (1) is solved for
```

## 2.1 — residuo sugli autovalori, mode pairing con MAC, sensitivita' analitica (righe 163-186)

```

   The linearised undamped eigenvalue residuals are deﬁned by the differences between the vector of measured eigenvalues
km and their analytical counterparts k(h), which being undamped are entirely real. The eigenvalues in this case are deﬁned as
the squares of the system natural frequencies, lj ¼ o2j , j ¼ 1,2, . . ., at the linearisation point, ‘i’. Thus the eigenvalue residual
and sensitivity are given by Eqs. (1)–(3) when z(h)= k(h); zm = km. It is necessary to ensure that the analytical and measured
eigenvalues correspond to the same physical mode. This process, usually referred to a mode pairing, may be achieved by
carrying out a modal correlation using the modal assurance criterion (MAC) [3].
   The terms in the sensitivity matrix may be determined analytically [6] by differentiation of the undamped eigenvalue equation
                               
      @lj            @M     @K
          ¼ uTj lj      þ       u                                                                                            ð6Þ
      @yk            @yk @yk j
where M, KARN  N are the FE mass and stiffness matrices, respectively, and uj is the jth mode shape. It is seen that only the jth
eigenvalue and eigenvector are needed to calculate all the jth-eigenvalue sensitivities. As well as the analytical approach to
calculating the sensitivity matrix terms, it is also possible to obtain numerical approximations by the simple procedure of
perturbing the parameters in turn by a suitably small quantity and determining numerically the change in the predicted
eigenvalues and eigenvectors. Although efﬁcient procedures exist in codes such as MSC-NASTRAN, there is a considerable
advantage in using analytically determined sensitivities when large-scale structures are to be updated.

2.2. Undamped mode-shape residual

    The linearised undamped mode-shape residuals are the differences between the measured mode shapes at a restricted
number of degrees of freedom corresponding to the location of sensors and the analytical modes shapes at the same
coordinates. The differences are determined at Nm oN measured degrees of freedom. Thus the mode-shape residual and
```

## 2.2 — residuo sulle forme ai soli gradi strumentati (righe 188-200)

```
vectors of the different analytical and measured mode shapes respectively. The analytical and experimental mode shapes
should be normalized in the same way.
    The determination of mode-shape sensitivities is a signiﬁcant computational task and several approaches are available.
In this article we consider only the method of Fox and Kapoor [6]. The method, based on expanding the gradients into a
weighted sum of the eigenvectors, is widely used due to its simplicity of implementation
       @uj        X
                  H
             ¼          ajkh uh ;   HrN                                                                                                 ð7Þ
       @yk        h¼1

which, after substitution of Eq. (7) into the derivative of the eigenvalue equation, produces the factor ajkh in the form
                               
             uTh lj @@M     @K
```

## 3 — piu' misure che parametri, subset selection (righe 288-305)

```

                                J.E. Mottershead et al. / Mechanical Systems and Signal Processing 25 (2011) 2275–2296           2279


  The ﬁrst step in parameter estimation is the deﬁnition of a residual containing the difference between analytical and
measured structural behaviour given explicity in Eq. (1). The objective is to minimise
      JðhÞ ¼ eTz We ez                                                                                                           ð16Þ
where the symmetric weighting matrix We has been included to account for the importance of each individual term in the
residual vector. We is difﬁcult to estimate, although at the very least this weighting should include scaling to equalise the
effect of amplitude and a reasonable choice is We = [diag(zm)]  2. In general the model response vector z(h) represents a non-
linear function of the parameters resulting in a non-linear minimisation problem. One of the techniques to solve this non-
linear optimisation problem is to expand the model vector into a Taylor series about the current parameter estimate, hi,
truncated after the linear term according to Eqs. (1) and (2).
    The case when fewer measurements than parameters are available in Eq. (1) (qop) leads to an underdetermined system
whose solution is not unique. Indeed, if rank(Gi)= q and riArange(Gi), then the model is able to reproduce the measurements,
i.e. ez = 0. Even if a minimum norm or a minimum parameter change solution is selected the resulting parameters will in
general not retain their physical meaning. In parameter updating the number of measurements should always be made larger
than the number of parameters (q4p) which yields overdetermined equation systems. A very effective way of choosing
suitable parameters is by the subset selection described by Lallement and Piranda [13], and Friswell et al. [14]. The data
should of course be sensitive to the selected parameters, which must be justiﬁed by physical understanding of the structure
and the test arrangement. For the overdetermined case we minimise J with respect to Dhi to give an improved parameter
```

## 4 — regolarizzazione, peso di Link, valore di lambda, curva L (righe 308-362)

```
      Dhi ¼ ½GTi We Gi 1 GTi We ri                                                                                             ð17Þ
   Even in the overdetermined case the condition of the sensitivity matrix G plays an important role for the accuracy and the
uniqueness of the solution. A fundamental requirement to obtain a solution is that rank½GTi We Gi  ¼ p.

4. Regularisation

    The treatment of ill-conditioned, noisy systems of equations is a problem central to ﬁnite element model updating [15–18].
Such equations often arise in the correction of ﬁnite element models by using vibration measurements. The classical weighted
least squares method described above can be extended in cases where it difﬁcult to obtain a convergent solution because of an
ill-conditioned sensitivity matrix. The objective function, Eq. (16), is extended by the requirement that the parameter changes
Dh should be minimised, to give
                          2
      JðhÞ ¼ eTz We ez þ l DhTi Wy Dhi                                                                                           ð18Þ
   The parameter weighting matrix Wy should be chosen to reﬂect the uncertainty in the initial parameter estimates [19–21].
This may be formally related to Bayesian methods, where the optimum matrices We and Wy are the inverse of the output and
parameter variances respectively [22–23]. However, the variance of the initial parameter estimates are rarely known in
practice and an alternative given by Link [24] relates the choice of weighting matrix, Wy, to the inverse of the squared
sensitivity matrix according to
              meanðdiagðCÞÞ 1              h        i
       Wy ¼               1
                              C ; C ¼ diag GTi We Gi                                                              ð19Þ; ð20Þ
             meanðdiagðC ÞÞ
   This deﬁnition allows the parameter changes to be constrained according to their sensitivity. In consequence the
parameters remain unchanged if their sensitivity approaches zero. Wy = I represents the classical Tikonov regularisation [25]
used to solve ill conditioned systems of equations.
   Eq. (17) is easily extended to penalise differences between the updated parameters and the corresponding initial
estimates, or to penalise differences between nominally identical parameters [14,15]. For example, in a frame structure a
number of ‘T’ joints may exist that are nominally identical. Due to manufacturing tolerances the parameters of these joints
will be slightly different, although these differences should be small. Therefore a side constraint is placed on the parameters,
so that both the residual and the differences between nominally identical parameters are minimised.
   Minimising J in Eq. (18) gives the solution

      Dhi ¼ ½GTi We Gi þ l2 Wy 1 GTi We ri                                                                                     ð21Þ
    The question remains how to choose the regularisation parameter l, that provides a balance between the measurement
residual, Je(h)= eTWee, and the side constraint (or parameter change), Jy ðhÞ ¼ DhTi Wy Dhi . Link [24] suggested that the factor l2
lies in the range between 0 (no regularisation) and 0.3. High l values are used if there are many insensitive parameters and the
matrix GTi We Gi is strongly ill-conditioned. If the ill-conditioning is not too strong l2 =0.05. The higher the value of l the higher
is the necessary number of iteration steps to achieve convergence.
    This regularisation approach is very closely related to the optimisation of multiple objective functions. From Eq. (18) it is
clear that the residual and side constraint are functions of l: Je(l) and Jy(l). The way in which these two terms are balanced
depends on the size of the regularisation parameter l. If l is too small then the problem will be too close to the original
ill-posed problem, but if l is too large then the problem solved will have little connection with the original problem. A useful

2280                         J.E. Mottershead et al. / Mechanical Systems and Signal Processing 25 (2011) 2275–2296

                                                     pﬃﬃﬃﬃﬃﬃﬃﬃﬃ                               pﬃﬃﬃﬃﬃﬃﬃﬃﬃ
approach is to plot the norm of the side constraint, Jy ðlÞ, against the norm of the residual, Je ðlÞ, for different values of l. For
multi-objective function optimisation this is called the Pareto front and in regularisation is called the L curve. Hansen [26]
showed that the norm of the side constraint is a monotonically decreasing function of the norm of the residual. He pointed out
that for a reasonable signal-to-noise ratio and the satisfaction of the Picard condition, the curve is approximately vertical for
l o lopt, and soon becomes a horizontal line when l 4 lopt, with a corner near the optimal regularisation parameter lopt. The
curve is called the L-curve because of this behaviour. The optimum value of the regularisation parameter, lopt, corresponds to
the point with maximum curvature at the corner of the log–log plot of the L-curve. This point represents a balance between
conﬁdence in the measurements and the analyst’s intuition.
    One difﬁculty in model updating is that the relationship between the parameters and the measurements is non-linear, and
```

## 5 — parametrizzazione: quanti parametri, quali (righe 512-535)

```
parameter slightly less than that at the corner of the L-curve the stiffness changes are very close to those simulated, although
this is impossible to determine solely from the estimated results. Fig. 4 shows the results when using the parameter
weighting matrix given by Eqs. (19), (20). Although similar to the results of Fig. 3, the updated parameters at the corner of the
L curve are now much closer to the simulated values, as shown in Table 1.



  No regularisation                                                        0                                           1.779                                0.243                    0.304
  L curve corner, Fig. 3                                                   0.0093                                      1.149                                 0.889                     1.112
  L curve corner, Fig. 4                                                   0.0179                                      1.179                                 0.836                     1.046
  ‘Exact’                                                                                                              1.200                                 0.800                     1.000




measurements allow more parameters to be estimated necessarily. The number of parameters should be considerably
smaller than the number of measurements. The objective should be that the model-updating problem will be over-
determined. Often the resulting equations are ill-conditioned and it is then necessary to apply additional information in the
form of a side constraint by regularisation as described previously. The parameters should be justiﬁed by physical
understanding of the structure under test and the test set-up. Ideally the chosen parameters should have a physical meaning
directly, but this is not always possible in practice. Equivalent models and their parameters often lead to improved models
when ‘physical’ parameters cannot be found. The data should be sensitive to small changes in the parameters. Difﬁcult
features, such as joints, may be made more or less sensitive by choosing different types of parameters. A study that includes
several different parameterisations of the same joint in a space-frame structure is described by Mottershead et al. [27].
    When choosing parameters it is always advisable to try to understand the behaviour of the structure globally, and locally
in those regions where local modelling inaccuracies might be responsible for discrepancies in predictions. For example, close
study of ﬁnite element mode shapes is able to reveal the motion of joints at each of the measured natural frequencies.
Parameters can then be chosen that inﬂuence this motion and their signiﬁcance in model updating easily conﬁrmed by
sensitivity analysis and subset selection. In regions of high strain energy one would usually choose stiffness parameters
whereas mass parameters would be useful in regions of high kinetic energy. Stiffness is generally more difﬁcult to model than
mass and it is therefore more likely that errors in stiffness modelling are responsible for inaccurate predictions than mass
errors. Damping is in many respects a special case, whereas ﬁnite element mass and stiffness matrices may be readily derived
from variational or energy principles, similar derivations for damping are generally not available. Joints and boundary
conditions are particularly difﬁcult to model closely. In principle it is possible to design tests that increase the sensitivity of
chosen parameters, but this is extremely difﬁcult to achieve in practice.

5.1. Mass, damping and stiffness matrix multipliers
```

## 5.1 — moltiplicatori di matrice per elemento o per sottostruttura (righe 601-620)

```

   Probably the simplest parameters for model updating are non-dimensional scalar multipliers applied at the element or
substructure level. The updated model takes the form
        M ¼ M0 þ a1 M1 þ . . . þ ar Mr þ . . . þ aR MR                                                                                                                                    ð23Þ

                                 J.E. Mottershead et al. / Mechanical Systems and Signal Processing 25 (2011) 2275–2296        2283


      C ¼ C0 þ b1 C1 þ. . . þ bs Cs þ . . . þ bS CS                                                                            ð24Þ

      K ¼ K0 þ g1 K1 þ . . . þ gu Ku þ . . . þ gU KU                                                                           ð25Þ

where in this case U stiffness parameters, S damping parameters and R mass parameters are chosen for updating. The
subscript ‘0’ denotes the analytical model before updating. Of course the parameter ar, bs or gu may be applied to more than
just one element. In this way the parameters may be applied to substructures, when those elements sharing the same
updating parameter are connected, or there may be elements dispersed through the mesh that for some physical reason are to
be updated in the same way. One reason why different parts of the structure might be updated using the same parameter
would be the sensitivity of the eigenvalues (and eigenvectors) in the frequency range of interest to small changes in the
parameters is very similar. In that case separating the elements whose changes have a similar effect would be a bad choice,
possibly leading to ill-conditioning of the sensitivity matrix.
```

## 7.1 — i modi bassi non vedono il danno locale piccolo (righe 1202-1210)

```


    Parameter E1312001 represents the upper half of the tailcone, which is riveted, has many patches and open access points
that might lead to a stiffness reduction represented by a reduced Young’s modulus in the updated parameters. Another
possibility is that the added patches would lead to an increase in mass having the same effect as a stiffness reduction.
    Regions of connectivity between the tapered section of the cabin and tail-cone, and the tapered section and the cabin itself
are represented by parameters E1326203 and E1326209. The results suggest that these physical transitions are less stiff than
in the model.
    The region at the elbow of the tail-cone and at one end of the tie rods coincides with parameter E1335010. Again a stiffness
reduction is indicated.
    Parameters E1250000 and E1250001 represent the tail spar and tail plane. The tail spar has been modelled using a single
beam element. Over-stiffening of the joint in the FE model is the likely cause of the discrepancy.
    The three groups E1201081, E2190001 and E9170001 were linked together to form a single updating parameter affecting
```
