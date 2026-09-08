# CalculiX CrunchiX USER'S MANUAL version 2.22 - Guido Dhondt, 5 agosto 2024

Estratto delle sole sezioni citate in `12-solido-non-lineare.md`, ottenuto con
`curl -o ccx_2.22.pdf http://www.dhondt.de/ccx_2.22.pdf` (6.224.727 byte) e
`pdftotext -layout`. Sezioni riportate: 5.15, 6.2.34-6.2.36, 6.8.11, 6.8.12,
6.8.18, 7.89, 7.90, 8.5.

## 5.15 Reinforced concrete cantilever beam
```
elements consequently improves the results.
    The results for a torque applied to a circular cross section beam is shown in

72                                           5 SIMPLE EXAMPLE PROBLEMS



Table 7: Results for the circular section beam subject to bending (5 elements).

                           result        value     reference
                           σzz (a)       59.77       63.41
                           σxz (a)      -0.322       -0.318
                            Fxx        -0.99996        -1.
                            Myy           102.        100.
                           σzz (b)        109.       90.03
                           σxz (b)      -0.322       -0.318
                             ux           3.86        4.24



Table 8: Results for the circular section beam subject to torsion (1 element).

                         result         value       reference
                         σxz (a)       -0.309         -0.331
                         σyz (a)       -0.309         -0.331
                          Mzz         0.999994          1.
                         σxz (b)       -0.535         -0.450
                         σyz (b)       -0.535         -0.450
                           uy        1.54 · 10−3   1.66 · 10−3



Table 8 (1 element; the results for 5 elements are identical).
    Again, it is remarkable that the torque is perfectly matched, although the
shear stress at the integration points is 6 % off. This leads to shear values at the
vertex nodes which are 19 % off. Interpolation to the facial integration points
yields shear stresses of -0.305 MPa. Integration of these stresses finally leads to
the perfect torque values. The torsion angle at the end of the beam is 7 %off.
    Summarizing, one can state that the use of C3D20R elements leads to quite
remarkable results:

     • For a rectangular cross section:

          – the section forces are correct
          – the stresses at the integration points are correct
          – the displacements for bending are correct, provided enough elements
            are used
          – the torsion angle is somewhat off (15 %).

     • For a circular cross section:

          – the shear force and torque section forces are correct
          – the bending moment is correct if enough elements are used

5.15 Reinforced concrete cantilever beam                                        73


        – the displacements for bending are correct, provided enough elements
          are used
        – the torsion angle is somewhat off (7 %).

     It is generally recommended to calculate the stresses from the section forces.
The only drawback is the C3D20R element may lead to hourglassing, leading to
weird displacements. However, the mean of the displacements across the cross
section is usually fine. An additional problem which can arise is that nonlinear
geometric calculations may not converge due to this hourglassing. This is reme-
died in CalculiX by slightly perturbing the coordinates of the expanded nodes
(by about 0.1 %).
     A similar exercise was performed for the B32 element, however, the results
were quite discouraging. The section forces were, especially for bending, way
off.

5.15     Reinforced concrete cantilever beam
Purpose of this exercise is to calculate the stresses in a reinforced concrete
cantilever beam due to its own weight. Special issues in this type of problem are
the treatment of the structure as a composite and the presence of a compression-
only material (the concrete).
   The input deck runs like:

*NODE, NSET=Nall
       1,1.000000000000e+01,0.000000000000e+00,0.000000000000e+00
...
*ELEMENT, TYPE=S8R, ELSET=Eall
     1,      1,      2,      3,      4,      5,      6,      7,                       8
     2,      2,      9,     10,      3,     11,     12,     13,                       6
...
** Names based on left
*NSET,NSET=Nleft
49,
50,
52,
** Names based on right
*NSET,NSET=Nright
1,
4,
8,
*MATERIAL,NAME=COMPRESSION_ONLY
*USER MATERIAL,CONSTANTS=2
  1.4e10,        1.e5
*DENSITY
2350.
*MATERIAL,NAME=STEEL

74                                         5 SIMPLE EXAMPLE PROBLEMS


*ELASTIC
210000.e6,.3
*DENSITY
7800.
*SHELL SECTION,ELSET=Eall,COMPOSITE
.09,,COMPRESSION_ONLY
.01,,STEEL
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
.1,,COMPRESSION_ONLY
*BOUNDARY
Nleft,1,6
```

## 6.2.34-6.2.36 Truss elements T2D2 / T3D2 / T3D3
```
generates a knot, the knot is modeled as a hinge for any plane stress, plane
strain or axisymmetric elements involved in the knot. This is necessary to
account for the special nature of these elements (the displacement normal to
the symmetry plane and normal to the radial planes is zero for plane elements
and axisymmetric elements, respectively).
    The section of the beam must be specified on the *BEAM SECTION key-
word card. It can be rectangular (SECTION=RECT), elliptical (SECTION=CIRC),
pipe-like (SECTION=PIPE) or box-like (SECTION=BOX). A circular cross
section is a special case of elliptical section, pipe and box sections are special
cases of a rectangular cross section obtained through appropriate integration
point schemes. For a rectangular cross section the local axes must be defined
parallel to the sides of the section, for an elliptical section they are parallel
to the minor and major axes of the section. The thickness of a section is the
distance between the free surfaces, i.e. for a circular section it is the diameter.
    The thicknesses of the beam element (in 1- and 2-direction) can be defined
on the *BEAM SECTION keyword card. It applies to the complete element.
Alternatively, the nodal thicknesses can be defined in each node separately using
*NODAL THICKNESS. That way, a beam with variable thickness can be mod-
eled. Thicknesses defined by a *NODAL THICKNESS card take precedence
over thicknesses defined by a *BEAM SECTION card.

122                                                    6   THEORY




      Figure 75: Overlapping beam elements at a knot

6.2 Element Types                                                           123
```

## 6.8.11 Mohr-Coulomb plasticity (apertura)
```
   From this one can derive the equations

                − dp = dt11 = dt22 = dt33 = (ǫ11 + ǫ22 + ǫ33 )ρ0 rT          (377)
   and

                             dt12 = dt13 = dt23 = 0,                         (378)
     where t denotes the stress and ǫ the linear strain. This means that an
ideal gas can be modeled as an isotropic elastic material with Lamé constants
λ = ρ0 rT and µ = 0. This corresponds to a Young’s modulus E = 0 and a
Poisson coefficient ν = 0.5. Since the latter values lead to numerical difficulties
it is advantageous to define the ideal gas as an orthotropic material with D1111 =
D2222 = D3333 = D1122 = D1133 = D2233 = λ and D1212 = D1313 = D2323 = 0.

6.8.5    Ideal gas for large deformations
An ideal gas can also be modeled as a hyperelastic material. Indeed, the ideal
gas law
                                             ρ0 rT
                                p = ρrT =                                    (379)
                                               J

6.8 Materials                                                                  259


   can also be written as
```

## 6.8.12 Tension-only and compression-only materials
```

                   √            p
  Defining k ∗ := 2 k and m∗ :=  2(1 + m2 )/3 the yield equation now
amounts to:

               f = a · (σ trial             ∗   peq        ∗
                          n+1 − ∆γn+1 s) − k c(ǫn + ∆γn+1 m ) = 0.         (420)
   This is a nonlinear equation in ∆γn+1 . Using the Newton-Raphson proce-
dure the first derivative is needed, which yields:

                            ∂f                     ∂c
                                 = −a · s − k ∗ m∗ peq .                   (421)
                          ∂∆γn+1                  ∂ǫn+1
                                   0                               (k+1)   (k)
  Starting with an initial guess ∆γn+1 = 0, one arrives at ∆γn+1 = ∆γn+1 +
   (k)
∆∆γn+1 by solving the equation:

               (k)        (k)               (k)        (k)   (k)
          f (∆γn+1 + ∆∆γn+1 ) ≈ f (∆γn+1 ) + f ′ (∆γn+1 )∆∆γn+1 = 0,       (422)

     or

"                                #
               ∗  ∂c ∗                (k)
                                               h
                                                          (k)
                                                               i
                                                                       peq,(k)
    −a · s − k m    peq
                                   ∆∆γn+1 = a · σ trial            ∗
                                                  n+1 − ∆γn+1 s − k c(ǫn+1     ),
                 ∂ǫ      peq,(k)
                        ǫn+1
                                                                         (423)
     where
                                peq,(k)               (k)
                                ǫn+1      = ǫpeq  ∗
                                             n + m ∆γn+1 .                 (424)
    This works as long a the return is to a face of the yield surface. Since the
return vector for sector 1 is s1 = D · b1 one can graphically plot the region in
three-dimensional principal stress space which is returned to the yield face in
sector 1 (Figure 143). It is the space for which


      (σ trial                              trial
         n+1 − sa ) · (s1 × r1 ) ≥ 0 AND (σ n+1 − sa ) · (s1 × r6 ) ≤ 0.   (425)

    This is called region I. The space within sector 1 in between region I and
sector 2 and underneath the apex is mapped onto the intersection line of face 1
and face 2 of the yield surface (characterized by the equation sa + λr1 , λ ∈ R).
It is characterized by the equations


      (σ trial                              trial
         n+1 − sa ) · (s1 × r1 ) ≤ 0 AND (σ n+1 − sa ) · (s1 × s2 ) ≤ 0.   (426)

    and is called region II of sector 1. Similary for the space in between region
I and sector 6 and underneath the apex satisfying


      (σ trial                              trial
         n+1 − sa ) · (s1 × r6 ) ≥ 0 AND (σ n+1 − sa ) · (s6 × s1 ) ≤ 0.   (427)

270                                                             6   THEORY




                                            s x s
                                             6   1
                                                     s1 x s 2




                             r6
```

## 6.8.18 User materials
```
6.8.15   The Cailletaud single crystal creep model.
This is the Cailletaud single crystal model reduced to the creep case, i.e. the
yield surface is reduced to zero.
    The material definition consists of a *MATERIAL card defining the name of
the material. This name HAS TO START WITH ”SINGLE CRYSTAL CREEP”
but can be up to 80 characters long. Thus, the last 60 characters can be freely
chosen by the user. Within the material definition a *USER MATERIAL card
has to be used satisfying:
    First line:

   • *USER MATERIAL

   • Enter the CONSTANTS parameter and its value, i.e. 7.

   Following line:


   • C1111 .

   • C1122 .

   • C1212 .

   • K β (octaeder slip system).

   • nβ (octaeder slip system).
```

## 7.89 *MOHR COULOMB e 7.90 *MOHR COULOMB HARDENING
```
     coordinate system x-y-z.

   • Value of fifth initial strain increase component (xz) in the GLOBAL co-
     ordinate system x-y-z.

   • Value of sixth initial strain increase component (yz) in the GLOBAL co-
     ordinate system x-y-z.

Repeat this line if needed. The strain components should be given as Lagrange
strain components for nonlinear calculations and linearized strain components
for linear computations.

540                                               7 INPUT DECK FORMAT


Examples:

*INITIAL STRAIN INCREASE
20,5,0.01,0.,0.01,0.,0.,0.

   increases the initial strain at integration point 5 of element 20 by a nor-
mal global x and normal global z component of 0.01, the other strains remain
unchanged.

   Example files: inistrain2.


7.79    *KINEMATIC
Keyword type: model definition
     With this keyword kinematic constraints can be established between each
node belonging to an element surface and a reference node. A kinematic con-
straint specifies that the displacement in a certain direction i at a node corre-
sponds to the rigid body motion of this node about a reference node. Therefore,
the location of the reference node is important.
     This card must be immediately preceded by a *COUPLING keyword card. If
no ORIENTATION was specified on the *COUPLING card, the degrees of free-
dom entered immediately below the *KINEMATIC card (these are the degrees
of freedom i which take part in the rigid body motion) apply to the global rect-
angular system, if an ORIENTATION was used, they apply to the local system.
If the local system is cylindrical, the degrees of freedom 1, 2 and 3 correspond
to the displacement in radial direction, the circumferential angle and the dis-
placement in axial direction, respectively (as defined by the *ORIENTATION
card; the position of the reference node is immaterial to that respect).
     The degrees of freedom in the reference node (1 up to 3 for translations, 4
up to 6 for rotations; they apply to the global system unless a *TRANSFORM
card was defined for the reference node) can be constrained by a *BOUNDARY
card. Alternatively, a force (degrees of freedom 1 up to 3) or moment (degrees
of freedom 4 up to 6) can be applied by a *CLOAD card. In the latter case the
resulting displacements (degrees of freedom 1 up to 3) can be printed in the .dat
file by selecting U on the *NODE PRINT card for the reference node. However,
the corresponding selection of RF on the *NODE PRINT card does not work for
the reference node. Instead, the user should use *SECTION PRINT to obtain
the global force and moment on the selected surface.

   First line:

   • *KINEMATIC

   Following line:

   • first degree of freedom (only 1, 2 or 3 allowed)

7.80 *MAGNETIC PERMEABILITY                                                    541


   • last degree of freedom (only 1, 2 or 3 allowed); if left blank the last degree
     of freedom coincides with the first degree of freedom.
Repeat this line if needed to constrain other degrees of freedom.

Example:

*NODE
262,.5,.5,8.
*ORIENTATION,NAME=OR1,SYSTEM=CYLINDRICAL
.5,.5,0.,.5,.5,1.
*COUPLING,REF NODE=262,SURFACE=S1,ORIENTATION=OR1,CONSTRAINT NAME=CN1
*KINEMATIC
2
*STEP
```

## 8.5 User-defined mechanical material laws (apertura)
```

         subroutine sdvini(statev,coords,nstatv,ncrds,noel,npt,
        & layer,kspt)
!
!       user subroutine sdvini
!
!
!       INPUT:
!
!       coords(1..3)            global coordinates of the integration point
!       nstatv                  number of internal variables (must be
!                               defined by the user with the *DEPVAR card)
!       ncrds                   number of coordinates
!       noel                    element number
!       npt                     integration point number
!       layer                   not used
!       kspt                    not used
!
!       OUTPUT:
!

630                                                 8   USER SUBROUTINES.


!       statev(1..nstatv) initial value of the internal state
!                         variables


8.3.2    Initial stress field (sigini.f )

This subroutine is used for user-defined initial stresses, characterized by the
parameter USER on the *INITIAL CONDITIONS,TYPE=STRESS card. The
header and variable description is as follows:

         subroutine sigini(sigma,coords,ntens,ncrds,noel,npt,layer,
        & kspt,lrebar,rebarn)
!
!       user subroutine sigini
!
!       INPUT:
!
!       coords                 coordinates of the integration point
!       ntens                  number of stresses to be defined
!       ncrds                  number of coordinates
!       noel                   element number
!       npt                    integration point number
!       layer                  currently not used
!       kspt                   currently not used
!       lrebar                 currently not used (value: 0)
```

## 8.5.1 Calling mechanical behaviour defining shared libraries
```
!                       1-3: displacements; 4: static pressure;
!                       5-7: rotations)
!     ilmpc(1..nmpc)    ilmpc(i) is the MPC number corresponding
!                       to the reference number in ikmpc(i)
!     rho               local density
!     amat              material name
!     mi(1)             max # of integration points per element (max
!                       over all elements)
!     mi(2)             max degree of freedomm per node (max over all
!                       nodes) in fields like v(0:mi(2))...
!
!     OUTPUT:

636                                                8   USER SUBROUTINES.


!
!       f                     magnitude of the distributed load
!       iscale                determines whether the flux has to be
!                             scaled for increments smaller than the
!                             step time in static calculations
!                             0: no scaling
!                             1: scaling (default)
!

8.4.5    Heat convection (film.f )
This subroutine is used for nonuniform convective heat flux, characterized by
distributed load labels of the form FxNUy, cf *FILM. The load label can be
up to 20 characters long. In particular, y can be used to distinguish different
nonuniform film patterns. The header and variable description is as follows:

         subroutine film(h,sink,temp,kstep,kinc,time,noel,npt,
```
