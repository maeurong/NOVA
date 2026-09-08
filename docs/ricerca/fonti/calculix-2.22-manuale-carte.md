# CalculiX CrunchiX 2.22 - sezioni del manuale utente (estratto verbatim)

Estratto dalla documentazione HTML ufficiale della versione 2.22
(`ccx_2.22.htm.tar.bz2`, `CalculiX/ccx_2.22/doc/ccx/node*.html`), convertita in testo.
Ogni sezione porta il file d'origine. Testo verbatim in inglese, non tradotto.

## Come far girare CalculiX in parallelo - `node3.html`

```
How to perform CalculiX calculations in parallel 

 Next: Units
 Up: CalculiX CrunchiX USER'S MANUAL
 Previous: Introduction.
   Contents 

How to perform CalculiX calculations in parallel 

Nowadays most computers have one socket with several cores, allowing for the calculations to be
performed in a parallel way. In CalculiX one can 

create the element stiffness matrices in parallel. No special compilation flag is needed. At execution
 time the environment variable OMP_NUM_THREADS or the environment variable CCX_NPROC_STIFFNESS must be set to the number of cores,
 default is 1. If both are set, CCX_NPROC_STIFFNESS takes
 precedence. The maximum number of cores is detected automatically by CalculiX
 by using
 the sysconf(_SC_NPROCESSORS_CONF) function. It can be overriden by the
 user by means of environment variable NUMBER_OF_CPUS.

Notice that older GNU-compiler versions (e.g. gcc 4.2.1) may have problems with this
 parallellization due to the size of the fields to be allocated within each
 thread (e.g. s(100,100) in routine e_3d.f). This should not be a problem
 with the actual compiler version.

solve the system of equations with the multithreaded version of
 SPOOLES. To this end

the MT-version of SPOOLES must have been compiled. For further
 information on this topic please consult the SPOOLES documentation

CalculiX CrunchiX must have been compiled with the USE_MT flag activated
 in the Makefile, please consult the README.INSTALL file.

at execution time the environment variable OMP_NUM_THREADS must have been set to the number of
 cores you want to use. In Linux this can be done by “export OMP_NUM_THREADS=n” on
 the command line, where n is the number of cores. Default is
 1. Alternatively, you can set the number of cores using the environment
 variable CCX_NPROC_EQUATION_SOLVER. If both are set, the latter takes
 precedence. 

solve the system of equations with the multithreaded version of
 PARDISO. PARDISO is proprietary. Look at the PARDISO documentation how to link the
 multithreaded version. At execution
 time the environment variable OMP_NUM_THREADS must be set to the number of cores,
 default is 1.

create material tangent matrices and calculate the stresses at the
 integration points in parallel. No special compilation flag is needed. At execution
 time the environment variable OMP_NUM_THREADS or the environment variable CCX_NPROC_RESULTS must be set to the number of cores,
 default is 1. If both are set, CCX_NPROC_RESULTS takes
 precedence. The maximum number of cores is detected automatically by CalculiX
 by using
 the sysconf(_SC_NPROCESSORS_CONF) function. It can be overriden by the
 user by means of environment variable NUMBER_OF_CPUS. Notice that if a
 material user subroutine (Sections 8.5 and 8.6) is used, certain rules have to be complied with in
 order to allow parallelization. These include (this list is possibly not exhaustive):

no save statements

no data statements

avoid logical variables

no write statements

calculate the viewfactors for thermal radiation computations in parallel. No special compilation flag is needed. At execution
 time the environment variable OMP_NUM_THREADS or the environment variable CCX_NPROC_VIEWFACTOR must be set to the number of cores,
 default is 1. If both are set, CCX_NPROC_VIEWFACTOR takes precedence. The maximum number of cores is detected automatically by CalculiX by using
 the sysconf(_SC_NPROCESSORS_CONF) function. It can be overriden by the
 user by means of environment variable NUMBER_OF_CPUS.

perform several operations in CFD calculations (computational fluid
 dynamics) in parallel. No special compilation flag is needed. At execution
 time the environment variable OMP_NUM_THREADS or the environment variable CCX_NPROC_CFD must be set to the number of cores,
 default is 1. If both are set, CCX_NPROC_CFD takes precedence. The maximum number of cores is detected automatically by CalculiX by using
 the sysconf(_SC_NPROCESSORS_CONF) function. It can be overriden by the
 user by means of environment variable NUMBER_OF_CPUS.

Calculate the magnetic intensity by use of the Biot-Savart law in parallel. No special compilation flag is needed. At execution
 time the environment variable OMP_NUM_THREADS or the environment variable CCX_NPROC_BIOTSAVART must be set to the number of cores,
 default is 1. If both are set, CCX_NPROC_BIOTSAVART takes precedence. The maximum number of cores is detected automatically by CalculiX by using
 the sysconf(_SC_NPROCESSORS_CONF) function. It can be overriden by the
 user by means of environment variable NUMBER_OF_CPUS.

Perform several vector and matrix operations needed by the SLATEC
 iterative solvers or by ARPACK in parallel. To this end the user must have
 defined the environment variable OMP_NUM_THREADS, and used the openmp
 FORTRAN flag in the Makefile. The parallellization is done in FORTRAN
 routines using openmp. The corresponding lines start with “c$omp”. If the
 openmp flag is not used, these lines are interpreted by the compiler as comment lines and no
 parallellization takes place. Notice that this parallellization only pays
 off for rather big systems, let's say 300,000 degrees of freedom for
 CFD-calculations or 1,000,000 degrees of freedom for mechanical frequency calculations.

Examples:

For some reason the function sysconf does not work on your computer
 system and leads to a segmentation fault. You can prevent using the function
 by defining the maximum number of cores explicitly using the NUMBER_OF_CPUS
 environment variable

You want to perform a thermomechanical calculation, but you are using a
 user defined material subroutine (Sections 8.5 and 8.6) which is not suitable for
 parallelization. You can make maximum use of parallelization (e.g. for the
 calculation of viewfactors) by setting the
 variable OMP_NUM_THREADS to the maximum number of cores on your system, and
 prevent parallelization of the material tangent and stress calculation step by setting
 CCX_NPROC_RESULTS to 1.

 Next: Units
 Up: CalculiX CrunchiX USER'S MANUAL
 Previous: Introduction.
   Contents
```

## Elemento tetraedrico a 4 nodi (C3D4) - `node33.html`

```
Four-node tetrahedral element (C3D4 and F3D4)

 Next: Ten-node tetrahedral element (C3D10)
 Up: Element Types
 Previous: C3D20R
   Contents 

Four-node tetrahedral element (C3D4 and F3D4)

The C3D4 is a general purpose tetrahedral element (1 integration point). The shape functions can be found in [112]. The node numbering follows the convention of Figure 62.

Figure 62:
4-node tetrahedral element

This element is included for completeness, however, it is not suited
for structural calculations unless a lot of them are used (the element
is too stiff). Please use
the 10-node tetrahedral element instead.

The F3D4 element is the corresponding fluid element.
```

## Elemento tetraedrico a 10 nodi (C3D10) - `node34.html`

```
Ten-node tetrahedral element (C3D10)

 Next: Modified ten-node tetrahedral element
 Up: Element Types
 Previous: Four-node tetrahedral element (C3D4
   Contents 

Ten-node tetrahedral element (C3D10)

The C3D10 element is a general purpose tetrahedral element (4 integration points). The shape functions can be found in [112]. The node numbering follows the convention of Figure 63.

Figure 63:
10-node tetrahedral element

The element behaves very well and is a good general purpose element,
although the C3D20R element yields still better results for the same
number of degrees of freedom. The C3D10 element is especially
attractive because of the existence of fully automatic tetrahedral
meshers.
```

## Analisi in frequenza: fattori di partecipazione e massa modale efficace - `node169.html`

```
Frequency analysis

 Next: Complex frequency analysis
 Up: Types of analysis
 Previous: Static analysis
   Contents 

Frequency analysis

In a frequency analysis the lowest eigenfrequencies and eigenmodes of the structure are calculated. In CalculiX, the mass matrix is not lumped, and thus a generalized eigenvalue problem has to be solved. The theory can be found in any textbook on vibrations or on finite elements, e.g. [112]. A crucial point in the present implementation is that, instead of looking for the smallest eigenfrequencies of the generalized eigenvalue problem, the largest eigenvalues of the inverse problem are determined. For large problems this results in execution times cut by about a factor of 100 (!). The inversion is performed by calling the linear equation solver SPOOLES. A frequency step is triggered by the key word *FREQUENCY and can be perturbative or not.

If the perturbation parameter is not activated on the *STEP card, the frequency analysis is performed on the unloaded structure, constrained by the homogeneous SPC's and MPC's. Any steps preceding the frequency step do not have any influence on the results.

If the perturbation parameter is activated, the stiffness matrix is augmented by contributions resulting from the displacements and stresses at the end of the last non-perturbative static step, if any, and the material parameters are based on the temperature at the end of that step. Thus, the effect of the centrifugal force on the frequencies in a turbine blade can be analyzed by first performing a static calculation with these loads, and selecting the perturbation parameter on the *STEP card in the subsequent frequency step. The loading at the end of a perturbation step is reset to zero.

If the input deck is stored in the file “problem.inp”, where
“problem” stands for any name, the eigenfrequencies are stored in
the “problem.dat” file (notice that the format of the storage depends on the
symmetry of the stiffness matrix; a nonsymmetric stiffness matrix results
e.g. from contact friction and can lead to complex eigenvalues). Furthermore, if the parameter STORAGE is set to yes
(STORAGE=YES) on the *FREQUENCY card the eigenfrequencies,
eigenmodes, stiffness matrix and mass matrix are stored in binary form in a "problem.eig" file for further use (e.g. in a linear dynamic step).

All output of the eigenmodes is normalized by means of the mass
matrix, i.e. the generalized mass is one. The eigenvalue of the generalized
eigenvalue problem is actually the square of the eigenfrequency. The
eigenvalue is guaranteed to be real (the stiffness and mass matrices are
symmetric; the only exception to this is if contact friction is included,
which can lead to complex eigenfrequencies), but it is positive only for positive definite stiffness
matrices. Due to preloading the stiffness matrix is not necessarily positive
definite. This can lead to purely imaginary eigenfrequencies which physically
mean that the structure buckles.

Apart from the eigenfrequencies the total effective mass and total effective
modal mass for all rigid body modes are also calculated and stored in the
.dat-file. There are six rigid body modes, three translations and three
rotations. Let us call any of these . It is a vector corresponding to a
unit rigid body mode, e.g. a unit translation in the global x-direction. The
participation factors are calculated by

(499)

They reflect the degree of participation of each mode in the selected rigid
body motion. Recall that the modes are mass-normalized, consequently the unit
of the mode is 
, the unit of the rigid body motion is
length. The effective modal mass is defined by , the total effective
modal mass by

(500)

(unit: mass 
   length). The total effective mass is the size of the rigid motion, i.e. it is the
internal product of the rigid motion with itself:

(501)

If one would calculate infinitely many modes the total effective modal mass
should be equal to the total effective mass. Since only a finite number of
modes are calculated the total effective modal mass will be less. By comparing
the total effective modal mass with the total effective mass one gains an
impression whether enough modes were calculated to perform good modal dynamics
calculation (at least for the rigid motions). 

A special kind of frequency calculations is a cyclic symmetry calculation for which the keyword cards *SURFACE, *TIE, *CYCLIC SYMMETRY MODEL and *SELECT CYCLIC SYMMETRY MODES are available. This kind of calculation applies to structures consisting of identical sectors ordered in a cyclic way such as in Figure 144.

Figure 144:
Cyclic symmetry structure consisting of four identical sectors

For such structures it is sufficient to model just one sector (also called datum sector) to obtain the eigenfrequencies and eigenmodes of the whole structure. The displacement values on the left and right boundary (or surfaces) of the datum sector are phase shifted. The shift depends on how many waves are looked for along the circumference of the structure. Figure 145 shows an eigenmode for a full disk exhibiting two complete waves along the circumference. This corresponds to four zero-crossings of the waves and a nodal diameter of two. This nodal diameter (also called cyclic symmetry mode number) can be considered as the number of waves, or also as the number of diameters in the structure along which the displacements are zero.

Figure 145:
Eigenmode for a full disk with a nodal diameter of two

The lowest nodal diameter is zero and corresponds to a solution which is
identical on the left and right boundary of the datum sector. For a structure
consisting of N sectors, the highest feasible nodal diameter is N/2 for N even
and (N-1)/2 for N odd. The nodal diameter is selected by the user on the
*SELECT CYCLIC SYMMETRY MODES card. On
the *CYCLIC SYMMETRY MODEL card, the number of base
sectors fitting in 
 is to be provided. On the same card the user
also indicates the number of sectors for which the solution is to be stored in
the .frd file. In this way, the solution can be plotted for the whole
structure, although the calculation was done for only one sector. The
rotational direction for the multiplication of the datum sector is from the
dependent surface (slave) to the independent surface (master).

Mathematically the left and right boundary of the datum sector are coupled by
MPC's with complex coefficients. This leads to a complex generalized
eigenvalue problem with a Hermitian stiffness matrix, which can be reduced to
a real eigenvalue problem the matrices of which are twice the size as those in
the original problem.

The phase shift between left and right boundary of the datum sector is given
by , where N is the nodal diameter and M is the number of base
sectors in 
. Whereas N has to be an integer, CalculiX allows M to
be a real number. In this way the user may enter a fictitious value for M,
leading to arbitrary phase shifts between the left and right boundary of the
datum sector (for advanced applications).

For models containing the axis of cyclic symmetry (e.g. a full disk), the
nodes on the symmetry axis are treated differently depending on whether the
nodal diameter is 0, 1 or exceeds 1. For nodal diameter 0, these nodes are
fixed in a plane perpendicular to the cyclic symmetry axis, for nodal diameter
1 they cannot move along the cyclic symmetry axis and for higher nodal
diameters they cannot move at all. For this kind of structures calculations
for nodal diameters 0 or 1 must be performed in separate steps.

The mass normalization of a sector subject to cyclic symmetry is done based on
the mass of the sector itself. If the normalization were done based on
360 the modes corresponding to a nodal diameter of 0 and M/2 (if M is
even) would have to be devided by , the others by 
. 

Figure 146:

Adjacent structures with datum sectors which differ in size can be calculated
by tying them together with the *TIE,MULTISTAGE keyword. The way this works is
illustrated in Figure 146. Two stages I and II with different cyclic
symmetry are adjacent to each other. To connect them, multiple point
constraints are created. The larger stage segment is defined as the dependent side,
the smaller as the independent. A point in between them, such as point A
(belonging to the dependent stage), can be
connected directly to the independent stage with a tie MPC. Other points, such
as B (also belonging to the dependent stage), are mapped into a point opposite
of 
the basis sector 0 (point B' belonging to the dependent side) by rotating them by a number of sectors, in this
case just 1 sector. Therefore, the displacements of B and B' are identical in
cylindrical coordinates apart from a shift by just one sector:

(502)

for nodal diameter . The displacements for point B' in the above equation
are obtained by a tie constraint of B' with the opposite independent face. For other nodal diameters the argument of the
exponential function has to be multiplied by . For point C one obtains:

(503)

and for point D:

(504)

If the frequency calculation is a perturbation step (by specifying the parameter PERTURBATION on
the *STEP card of the frequency step) preceded by a static step, the
multistage MPC's reduce to those above for N=0, i.e. the displacements in
cylindrical coordinates are the same for A and A', for B and B' etc. However,
this leads to inconsistent results in the presence of forces (axial and/or
tangential) in between the stages. Indeed, due to the larger size of the
dependent stage, an axial force in the independent stage has to be multiplied
by the ratio of the size of the stage segments. In the example in Figure
146 the force in the dependent stage has to be four times the
force in the independent stage. This is obtained by multiplying the
coefficient of the dependent node in the connecting multiple points
constraints by four ([24], Section 2.6.2). Therefore, the connecting
multistage constraints are different for a static step than for a frequency
step. Since the multistage constraints are created in CalculiX in the first
step, a static and a frequency step cannot be used in the same multistage
calculation. The solution to this is to perform the static step in a separate
calculation, store the stresses and displacements in the .dat-file, transform
them in the format of *INITIAL CONDITIONS for
stresses and displacements and include these in a subsequent perturbative frequency calculation.

The use of multistage conditions is illustrated
by file multistage.inp in the test examples.

Eigenmodes resulting from frequency calculations with cyclic symmetry can be
interpreted as traveling waves (indeed, all eigenmode solutions exhibiting a
complex nature, i.e. containing a real and imaginary part, are traveling
waves). Therefore, a circumferential traveling direction can be
determined. This traveling direction is determined in CalculiX and stored in the
.dat-file together with the axis reference direction.

To determine the traveling direction (cw or ccw) the displacement solution at
the center of each element is calculated:

(505)

where u,v and w are the displacement components, the subscript R denotes the
real part, I the imaginary part. The sum of the square amounts to

(506)

or

(507)

In the latter equation is the amplitude, the phase angle, both of
which depend on the actual location, here described by the cylindrical
coordinates , and . The motion of 
 is now
focussed on in order to determine the traveling direction of the eigenmodes. Taking the frequency of the eigenmode into
account one arrives at:

(508)

From this expression the wave character of the response is obvious. For an observer traveling around the axis (at constant and ) with the local wave velocity one has:

constant

(509)

or

(510)

leading to

(511)

From the last equation one finds that the traveling direction depends on the
sign of 
. If this quantity is positive the
 traveling direction is backwards (or ccw when looking in the positive direction of
 the axis), else it is forwards. The partial derivative of obtained by
 slightly moving the actual position in positive -direction out of
 the center of the element and reevaluating . This procedure is
 repeated for all elements. For good accuracy the response from the element
 for which 
 is maximum (always evaluated at the center of
 the element) is taken.

Finally one word of caution on frequency calculations with axisymmetric
elements. Right now, you will only get the eigenmodes corresponding to a nodal
diameter of 0, i.e. all axisymmetric modes. If you would like to calculate
asymmetric modes, please model a segment with volumetric elements and
perform a cyclic symmetry analysis.

 Next: Complex frequency analysis
 Up: Types of analysis
 Previous: Static analysis
   Contents
```

## Carichi distribuiti: numerazione delle facce e forze nodali equivalenti - `node203.html`

```
Facial distributed loading

 Next: Centrifugal distributed loading
 Up: Loading
 Previous: Point loads
   Contents 

Facial distributed loading

Distributed loading is triggered by the *DLOAD
card. Facial distributed loads are entered as pressure loads on the
element faces, which are for that purpose numbered according to
Figures 155, 156 and 157.

Figure 155:
Face numbering for hexahedral elements

Figure 156:
Face numbering for tetrahedral elements

Figure 157:
Face numbering for wedge elements

Thus, for hexahedral elements the faces are numbered as follows:

Face 1: 1-2-3-4

Face 2: 5-8-7-6

Face 3: 1-5-6-2

Face 4: 2-6-7-3

Face 5: 3-7-8-4

Face 6: 4-8-5-1

for tetrahedral elements:

Face 1: 1-2-3

Face 2: 1-4-2

Face 3: 2-4-3

Face 4: 3-4-1

for wedge elements:

Face 1: 1-2-3

Face 2: 4-5-6

Face 3: 1-2-5-4

Face 4: 2-3-6-5

Face 5: 3-1-4-6

for quadrilateral plane stress, plane strain and axisymmetric elements:

Face 1: 1-2

Face 2: 2-3

Face 3: 3-4

Face 4: 4-1

for triangular plane stress, plane strain and axisymmetric elements:

Face 1: 1-2

Face 2: 2-3

Face 3: 3-1

for beam elements:

Face 1: pressure in 1-direction

Face 2: pressure in 2-direction

For shell elements no face number is needed since there is only one kind of loading:
pressure in the direction of the normal on the shell. 

Applying a pressure to a face for which a pressure was specified in a
previous step replaces this pressure. The parameter OP=NEW on the
*DLOAD card removes all previous distributed loads. It only takes
effect for the first *DLOAD card in a step. A buckling step always removes all previous loads.

In a large deformation analysis the pressure is applied to the deformed face of the element. Thus, if you pull a rod with a constant pressure, the total force will decrease due to the decrease of the cross-sectional area of the rod. This effect may or may not be intended. If not, the pressure can be replaced by nodal forces. Figures 158 and 159 show the equivalent forces for a unit pressure applied to a face of a C3D20(R) and C3D10 element. Notice that the force is zero (C3D10) or has the opposite sign (C3D20(R)) for quadratic elements. For the linear C3D8(R) elements, the force takes the value 1/4 in each node of the face.

Figure 158:
Equivalent nodal forces for a face of a C3D20(R) element

Figure 159:
Equivalent nodal forces for a face of a C3D10 element

 Next: Centrifugal distributed loading
 Up: Loading
 Previous: Point loads
   Contents
```

## Carichi concentrati e forze di reazione (semantica di RF) - `node206.html`

```
Forces obtained by selecting RF

 Next: Temperature loading in a
 Up: Loading
 Previous: Gravity distributed loading
   Contents 

Forces obtained by selecting RF

This section has been included because the output when selecting RF on a *NODE
PRINT, *NODE FILE or *NODE OUTPUT card is not
always what the user expects. With RF you get the sum of all external forces
in a node. The external forces can be viewed as the sum of the
loading forces and the reaction forces. Let us have a look at a couple of examples:

Figure 160:
Point load in a node belonging to a 8-noded face

Figure 160 represents the upper surface of a plate of size 1 x 1 x 0.1, modeled by just
one C3D20R element. Only the upper face of the element is shown. Suppose the
user has fixed all nodes belonging to this face in loading direction. In node
1 an external point loading is applied of size P. Since this node is fixed in loading
direction, a reaction force of size R=P will arise. The size of the total
force, i.e. the point loading plus the reaction force is zero. This
is what the user will get if RF is selected for this node. 

Figure 161:
Equivalent forces of a uniform pressure on a plate (1 element)

Figure 161 shows the same face, but now the upper surface is
loaded by a pressure of size 1. Again, only one C3D20R element is used and the
equivalent point forces for the pressure load are as shown. We assume
that all nodes on the border of the plate are fixed in loading direction (in
this case this means all nodes, since all nodes are lying on the border). Therefore, in each node a
reaction force will arise equal to the loading force. Again, the total force in each
node is zero, which is the value the user will get by selecting RF on the
*NODE PRINT, *NODE FILE or *NODE OUTPUT card.

Figure 162:
Equivalent forces of a uniform pressure on a plate (4 elements)

Now, the plate is meshed with 4 quadratic elements. Figure 162
shows a view from above. All borders of the plate are fixed and the numbers at
the nodes represent the nodal forces corresponding to the uniform pressure of
size 1. Suppose the user would like to know the sum of the external forces at the
border nodes (e.g. by selecting RF on a *NODE PRINT card with parameter
TOTALS=ONLY). The external forces are the sum of the reaction forces and the
loading forces. The total reaction force is -1. The loading forces at the
border nodes are the non-circled ones in Figure 162, summing up to
5/12. Consequently the sum of the external forces at the border nodes is -7/12.

By selecting an even finer mesh the sum of the external forces at the border
nodes will approach -1.

Summarizing, selecting RF gives you the sum of the reaction forces and the
loading forces. This is equal to the reaction forces only if the elements
belonging to the selected nodes are not loaded by a *DLOAD card, and the nodes
themselves are not loaded by a *CLOAD card.

 Next: Temperature loading in a
 Up: Loading
 Previous: Gravity distributed loading
   Contents
```

## Stimatore d'errore di Zienkiewicz-Zhu - `node214.html`

```
Zienkiewicz-Zhu error estimator

 Next: Gradient error estimator
 Up: Error estimators
 Previous: Error estimators
   Contents 

Zienkiewicz-Zhu error estimator

The Zienkiewicz-Zhu error estimator [114],
[115] tries to estimate the error made by the finite element
discretization. To do so, it calculates for each node an improved stress and
defines the error as the difference between this stress and the one calculated
by the standard finite element procedure.

The stress obtained in the nodes using the standard finite element procedure
is an extrapolation of the stresses at the integration points
[24]. Indeed, the basic unknowns in mechanical calculations are the
displacements. Differentiating the displacements yields the strains, which can
be converted into stresses by means of the appropriate material law. Due to the
numerical integration used to obtain the stiffness coefficients, the strains
and stresses are most accurate at the integration points. The standard finite
element procedure extrapolates these integration point values to the
nodes. The way this extrapolation is done depends on the kind of element
[24]. Usually, a node belongs to more than one element. The standard
procedure averages the stress values obtained from each element to which the
node belongs.

To determine a more accurate stress value at the nodes, the Zienkiewicz-Zhu
procedure starts from the stresses at the reduced integration points. This 
applies to quadratic elements only, since only for these elements a reduced
integration procedure exists (for element types different from C3D20R the
ordinary integration points are taken instead) . The reduced integration points are
superconvergent points, i.e. points at which the stress is an order
of magnitude more accurate than in any other point within the element
[8]. To improve the stress at a node an element patch is defined,
usually consisting of all elements to which the nodes belongs. However, at
boundaries and for tetrahedral elements this patch can contain other elements
too. Now, a polynomial function is defined consisting of the monomials used
for the shape function of the elements at stake. Again, to improve the
accuracy, other monomials may be considered as well. The coefficients of the
polynomial are defined such that the polynomial matches the stress as well as
possible in the reduced integration points of the patch (in a least squares
sense). Finally, an improved stress in the node is obtained by evaluating this
polynomial. This is done for all stress components separately. For more
details on the implementation in CalculiX the user is referred to [63]. 

In CalculiX one can obtain the improved CalculiX-Zhu stress by selecting ZZS
underneath the *EL FILE keyword card. It is available for
tetrahedral and hexahedral elements. In a node belonging to tetrahedral,
hexahedral and any other type of elements, only the hexahedral elements are
used to defined the improved stress, if the node does not belong to hexahedral
elements the tetrahedral elements are used, if any. 

 Next: Gradient error estimator
 Up: Error estimators
 Previous: Error estimators
   Contents
```

## *EL FILE - `node271.html`

```
*EL FILE

 Next: *EL PRINT
 Up: Input deck format
 Previous: *ELEMENT OUTPUT
   Contents 

*EL FILE

Keyword type: step

This option is used to save selected element variables averaged at the nodal
points in a frd file (extension .frd) for subsequent viewing by CalculiX
GraphiX. The following element variables can be selected (the label is square
brackets [] is the one used in the .frd file; for frequency calculations with
cyclic symmetry both a real and an imaginary part may be stored, in all other cases only the
real part is stored):

CEEQ [PE]: equivalent creep strain (is converted internally into PEEQ
 since the viscoplastic theory does not distinguish between the two;
 consequently, the user will find PEEQ in the frd file, not CEEQ)

E [TOSTRAIN (real),TOSTRAII (imaginary)]: strain. This is the total Lagrangian strain for (hyper)elastic
materials and incremental plasticity and the total Eulerian strain for deformation plasticity.

ECD [CURR]: electrical current density. This only applies to electromagnetic calculations.

EMFB [EMFB]: Magnetic field. This only applies to electromagnetic calculations.

EMFE [EMFE]: Electric field. This only applies to electromagnetic calculations.

ENER [ENER]: the energy density.

ERR [ERROR (real), ERRORI (imaginary)]: error estimator for structural calculations (cf. Section 6.12). Notice that ERR and ZZS
 are mutually exclusive.

HER [HERROR (real), HERRORI (imaginary)]: error estimator for heat transfer calculations(cf. Section
 6.12). 

HFL [FLUX]: heat flux in structures. 

HFLF [FLUX]: heat flux in CFD-calculations. 

MAXE [MSTRAIN]: maximum of the absolute value of the worst principal strain at all times for
 *FREQUENCY calculations with cyclic symmetry. It is
 stored for nodes belonging to the node set with name STRAINDOMAIN. This node
 set must have been defined by the user with the *NSET command. The worst principal strain is the maximum of the
 absolute value of the principal strains times its original sign.

MAXS [MSTRESS]: maximum of the absolute value of the worst principal stress at all times for
 *FREQUENCY calculations with cyclic symmetry. It is
 stored for nodes belonging to the node set with name STRESSDOMAIN. This node
 set must have been defined by the user with the *NSET command. The worst principal stress is the maximum of the
 absolute value of the principal stresses times its original sign.

ME [MESTRAIN (real), MESTRAII (imaginary)]: strain. This is the mechanical Lagrangian strain for (hyper)elastic
materials and incremental plasticity and the mechanical Eulerian strain for
deformation plasticity (mechanical strain = total strain - thermal strain).

PEEQ [PE]: equivalent plastic strain.

PHS [PSTRESS]: stress: magnitude and phase (only for *STEADY
 STATE DYNAMICS calculations and
*FREQUENCY calculations with cyclic symmetry).

S [STRESS (real), STRESSI (imaginary)]: true (Cauchy) stress in structures. For beam elements this tensor is replaced
 by the section forces if SECTION FORCES is selected. Selection of S
 automatically triggers output of the error estimator ERR, unless NOE is
 selected after S (either immediately following S, or with some other output
 requests in between, irrespective whether these output requests are on the
 same keyword card or on different keyword cards).

SF [STRESS]: total stress in CFD-calculations. 

SMID [STRMID]: true (Cauchy) stress at the midsurface of a shell. This can
 only be used for shell elements which have been defined as user
 elements. It cannot be used of shell elements the label of which starts with
 S, since these are expanded into volumetric elements. 

SNEG [STRNEG]: true (Cauchy) stress at the negative surface of a shell. This can
 only be used for shell elements which have been defined as user
 elements. It cannot be used of shell elements the label of which starts with
 S, since these are expanded into volumetric elements.

SPOS [STRPOS]: true (Cauchy) stress at the positive surface of a shell. This can
 only be used for shell elements which have been defined as user
 elements. It cannot be used of shell elements the label of which starts with
 S, since these are expanded into volumetric elements. 

SVF [VSTRES]: viscous stress in CFD-calculations. 

SDV [SDV]: the internal state variables.

THE [THSTRAIN]: strain. This is the thermal strain calculated by
 subtracting the mechanical strain (extrapolated to the nodes) from the total
 strain (extrapolated to the nodes) at the nodes. Selection of THE 
 triggers the selection of E and ME. This is needed to ensure that E (the
 total strain) and ME (the mechanical strain) are extrapolated to the nodes.

ZZS [ZZSTR (real), ZZSTRI (imaginary)]: Zienkiewicz-Zhu improved stress [114],
 [115](cf. Section 6.12). Notice that ZZS
 and ERR are mutually exclusive.

The selected variables are stored for the complete model. Due to the averaging process jumps at
material interfaces are smeared out unless you model the materials on
both sides of the interface independently and connect the coinciding
nodes with MPC's.

For frequency calculations with cyclic symmetry the eigenmodes are generated
in pairs (different by a phase shift of 90 degrees). Only the first one of
each pair is stored in the frd file. If S is selected (the stresses) two
load cases are stored in the frd file: a loadcase labeled STRESS
containing the real part of the stresses and a loadcase labeled STRESSI
containing the imaginary part of the stresses. For all other variables only
the real part is stored.

The key ENER triggers the calculation of the internal energy. If it is
absent no internal energy is calculated. Since in nonlinear
calculations the internal energy at any time depends on the
accumulated energy at all previous times, the selection of ENER in
nonlinear calculations (geometric or material nonlinearities) must
be made in the first step.

The first occurrence of an *EL FILE keyword card within a step wipes
out all previous element variable selections for file output. If no
*EL FILE card is used within a step the selections of the previous
step apply. If there is no previous step, no element variables will be stored.

There are ten optional parameters: FREQUENCY, FREQUENCYF, GLOBAL, OUTPUT,
OUTPUT ALL,
SECTION FORCES, TIME POINTS, NSET, LAST ITERATIONS and CONTACT ELEMENTS. The parameters FREQUENCY and TIME POINTS are mutually exclusive. 

FREQUENCY applies to
nonlinear calculations where a step can consist of several
increments. Default is FREQUENCY=1, which indicates that the results
of all increments will be stored. FREQUENCY=N with N an integer
indicates that the results of every Nth increment will be stored. The
final results of a step are always stored. If you only want the final
results, choose N very big. 
The value of N applies to 
*OUTPUT,*ELEMENT OUTPUT, 
*EL FILE, *ELPRINT, 
*NODE OUTPUT,
*NODE FILE, *NODE PRINT,
*SECTION PRINT ,*CONTACT OUTPUT,
*CONTACT FILE and *CONTACT PRINT. 
If the FREQUENCY parameter is used
for more than one of these keywords with conflicting values of N, the
last value applies to all. A frequency parameter stays active across several steps
until it is overwritten by another FREQUENCY value or the TIME POINTS
parameter.

The 3D fluid analogue of FREQUENCY is FREQUENCYF. In coupled calculations
FREQUENCY applies to the thermomechanical output, FREQUENCYF to the 3D fluid output.

With the parameter GLOBAL you tell the program whether you would like the
results in the global rectangular coordinate system or in the local element
system. If an *ORIENTATION card is applied to the element at stake, this card defines
the local system. If no *ORIENTATION card is applied to the
element, the local system coincides with the global rectangular
system unless for shell elements, for which a local system is automatically
defined by default (cf. Section 6.2.14). Default value for the GLOBAL parameter is GLOBAL=YES,
which means that the results are stored in the global system (the only
exception to this is for the shell stresses SNEG, SMID and SPOS, which are
always stored in the shell local system). If you prefer the
results in the local system, specify GLOBAL=NO.

The parameter OUTPUT can take the value 2D or 3D. This has only
effect for 1d and 2d elements such as beams, shells, plane stress, plane
strain and axisymmetric elements AND provided it is used in the first step. If
OUTPUT=3D, the 1d and 2d elements are stored in their expanded three-dimensional
form. In particular, the user has the advantage to see his/her 1d/2d elements
with their real thickness dimensions. However, the node numbers are new and do
not relate to the node numbers in the input deck. Once selected, this
parameter is active in the complete calculation. If OUTPUT=2D the fields in the expanded elements are averaged to obtain
the values in the nodes of the original 1d and 2d elements. In particular,
averaging removes the bending stresses in beams and
shells. Therefore, default for beams
and shells is OUTPUT=3D, for plane stress, plane strain and axisymmetric
elements it is OUTPUT=2D. If OUTPUT=3D is selected, the parameter NSET is deactivated.

The parameter OUTPUT ALL specifies that the data has to be stored for all
nodes, including those belonging to elements which have been
deactivated. Default is storage for nodes belonging to active elements only.

The selection of SECTION FORCES makes sense for beam elements
only. Furthermore, SECTION FORCES and OUTPUT=3D are mutually exclusive (if
both are used the last prevails). If
selected, the stresses in the beam nodes are replaced by the section
forces. They are calculated in a local coordinate system consisting of the
1-direction 
, the 2-direction 
 and 3-direction or
tangential direction 
 (Figure 74). Accordingly, the stress components now have
the following meaning:

xx: Shear force in 1-direction 

yy: Shear force in 2-direction

zz: Normal force

xy: Torque

xz: Bending moment about the 2-direction

yz: Bending moment about the 1-direction

For all elements except the beam elements the parameter SECTION FORCES has no
effect. If SECTION FORCES is not selected the stress tensor is averaged across
the beam section. 

With the parameter TIME POINTS a time point sequence can be referenced,
defined by a 
*TIME POINTS keyword. In that case, output will be
provided for all time points of the sequence within the step and additionally at the end of
the step. No other output will be stored and the FREQUENCY parameter is not
taken into account. Within a step only one time point sequence can be active. If more than
one is specified, the last one defined on any of the keyword cards
*NODE FILE, *EL FILE, *NODE
 PRINT or *EL PRINT will be active. The TIME
POINTS option should not be used together with the DIRECT option on the
procedure card. The TIME POINTS parameters stays active across several steps
until it is replaced by another TIME POINTS value or the FREQUENCY parameter.

The specification of a node set with the parameter NSET limits the output to
the nodes contained in the set. Remember that the frd file is node based, so
element results are also stored at the nodes after extrapolation from the
integration points. For cyclic symmetric structures the usage of the
parameter NGRAPH on the *CYCLIC SYMMETRY MODEL
card leads to output of the results not only for the node set specified by the
user (which naturally belongs to the base sector) but also for all
corresponding nodes of the sectors generated by the NGRAPH parameter. Notice
that for cyclic symmetric structures in modal dynamic and steady state
dynamics calculations the use of NSET is mandatory. In that case the stresses
will only be correct at those nodes belonging to elements for which ALL nodal
displacements were requested (e.g. by a *NODE FILE card).

The parameter LAST ITERATIONS leads to the storage of the
displacements in all iterations
of the last increment in a file with name ResultsForLastIterations.frd (can be opened with CalculiX GraphiX). This is
useful for debugging purposes in case of divergence. No such file is created if
this parameter is absent. 

Finally, the parameter CONTACT ELEMENTS stores the contact elements which have
been generated in each iteration in a file with the name
jobname.cel. When
opening the frd file with CalculiX GraphiX these files can be read with the
command “read jobname.cel inp” and visualized by
plotting the elements in the sets
contactelements_st_in_at_it, where 
is the step number, the increment number, the attempt number
and the iteration number.

Starting with version 2.14 of CalculiX the selection of “S” (stress)
automatically triggers the output the stress error estimator “ERR” as
well. This can only be avoided by selecting NOE in a position
after S (either immediately following S, or with some other output
requests in between, irrespective whether these output requests are on the same keyword card or on different keyword cards).

First line:

*EL FILE

Enter any needed parameters and their values.

Second line:

Identifying keys for the variables to be printed, separated by commas.

Example:

*EL FILE
S,PEEQ

requests that the (Cauchy) stresses and the equivalent plastic strain is stored in .frd format for subsequent viewing with CalculiX GraphiX.

Example files: beamt, fullseg, segment1, segdyn.

 Next: *EL PRINT
 Up: Input deck format
 Previous: *ELEMENT OUTPUT
   Contents
```

## *EL PRINT - `node272.html`

```
*EL PRINT

 Next: *ELSET
 Up: Input deck format
 Previous: *EL FILE
   Contents 

*EL PRINT

Keyword type: step

This option is used to print selected element variables in an ASCII
file with the name jobname.dat. Some of the element variables are
printed in the integration points, some are whole element variables.
The following variables can be selected:

Integration point variables

true (Cauchy) stress in structures (key=S). 

viscous stress in CFD calculations (key=SVF). 

strain (key=E). This is the total Lagrangian strain for (hyper)elastic
materials and incremental plasticity and the total Eulerian strain for deformation plasticity.

strain (key=ME). This is the mechanical Lagrangian strain for (hyper)elastic
materials and incremental plasticity and the mechanical Eulerian strain for
deformation plasticity (mechanical strain = total strain - thermal strain).

equivalent plastic strain (key=PEEQ)

equivalent creep strain (key=CEEQ; is converted internally into PEEQ
 since the viscoplastic theory does not distinguish between the two;
 consequently, the user will find PEEQ in the dat file, not CEEQ)

the energy density (key=ENER)

the internal state variables (key=SDV)

heat flux for structures (key=HFL). 

heat flux in CFD calculations(key=HFLF).

global coordinates (key=COORD).

Whole element variables

the internal energy (key=ELSE)

the kinetic energy (key=ELKE)

the volume (key=EVOL)

the mass and the mass moments of inertia about the global axes ,
 , , , and , where

(870)

and similar for the other expressions. If TOTALS=YES or TOTALS=ONLY is
selected the center of gravity and the mass moments of inertia about the
global axes through the center of gravity are calculated too (key=EMAS).

the heating power (key=EBHE)

the rotational speed square () (key=CENT)

The keys ENER and ELSE trigger the calculation of the internal
energy. If they are
absent no internal energy is calculated. Since in nonlinear
calculations the internal energy at any time depends on the
accumulated energy at all previous times, the selection of ENER and/or
ELSE in
nonlinear calculations (geometric or material nonlinearities) must
be made in the first step.

There are six parameters, ELSET, FREQUENCY, FREQUENCYF, TOTALS, GLOBAL and TIME POINTS. The parameter ELSET is required, defining the set of elements for which these stresses should be printed. If this card is omitted, no values are printed. Several *EL PRINT cards can be used within one and the same step.

The parameters FREQUENCY and TIME POINTS are mutually exclusive. 

The FREQUENCY parameter is optional and applies to
nonlinear calculations where a step can consist of several
increments. Default is FREQUENCY=1, which indicates that the results
of all increments will be stored. FREQUENCY=N with N an integer
indicates that the results of every Nth increment will be stored. The
final results of a step are always stored. If you only want the final
results, choose N very big. 
The value of N applies to 
*OUTPUT,*ELEMENT OUTPUT, 
*EL FILE, *ELPRINT, 
*NODE OUTPUT,
*NODE FILE, *NODE PRINT,
*SECTION PRINT,*CONTACT OUTPUT,
*CONTACT FILE and *CONTACT PRINT. 
If the FREQUENCY parameter is used
for more than one of these keywords with conflicting values of N, the
last value applies to all. A frequency parameter stays active across several steps
until it is overwritten by another FREQUENCY value or the TIME POINTS parameter.

The 3D fluid analogue of FREQUENCY is FREQUENCYF. In coupled calculations
FREQUENCY applies to the thermomechanical output, FREQUENCYF to the 3D fluid output.

The optional parameter TOTALS only applies to whole element variables. If
TOTALS=YES the sum of the variables for the whole element set is
printed in addition to their value for each element in the set
separately. If TOTALS=ONLY is selected the sum is printed but the
individual element contributions are not. If TOTALS=NO (default) the
individual contributions are printed, but their sum is not.

With the parameter GLOBAL (optional) you tell the program whether you would like the
results in the global rectangular coordinate system or in the local element
system. If an *ORIENTATION card is applied to the element at stake, this card defines
the local system. If no *ORIENTATION card is applied to the
element, the local system coincides with the global rectangular
system. Default value for the GLOBAL parameter is GLOBAL=NO,
which means that the results are stored in the local system. If you prefer the
results in the global system, specify GLOBAL=YES. If the results are stored in
the local system the first 10 characters of the name of the applicable
orientation are listed at the end of the line.

With the parameter TIME POINTS a time point sequence can be referenced,
defined by a 
*TIME POINTS keyword. In that case, output will be
provided for all time points of the sequence within the step and additionally at the end of
the step. No other output will be stored and the FREQUENCY parameter is not
taken into account. Within a step only one time point sequence can be active. If more than
one is specified, the last one defined on any of the keyword cards
*NODE FILE, *EL FILE, *NODE
 PRINT, *EL PRINT or *SECTION PRINT will be active. The TIME
POINTS option should not be used together with the DIRECT option on the
procedure card. The TIME POINTS parameters stays active across several steps
until it is replaced by another TIME POINTS value or the FREQUENCY parameter.

The first occurrence of an *EL FILE keyword card within a step wipes
out all previous element variable selections for print output. If no
*EL FILE card is used within a step the selections of the previous
step apply, if any.

First line:

*EL PRINT

Enter the parameter ELSET and its value.

Second line:

Identifying keys for the variables to be printed, separated by commas.

Example:

*EL PRINT,ELSET=Copper
E

requests to store the strains at the integration points in the elements of set Copper in the .dat file.

Example files: beampt, beamrb, beamt4.

 Next: *ELSET
 Up: Input deck format
 Previous: *EL FILE
   Contents
```

## *FREQUENCY - `node282.html`

```
*FREQUENCY

 Next: *FRICTION
 Up: Input deck format
 Previous: *FLUID SECTION
   Contents 

*FREQUENCY

Keyword type: step

This procedure is used to determine eigenfrequencies and the
corresponding eigenmodes of a structure. The frequency range of
interest can be specified by entering its lower and upper
value. However, internally only as many frequencies are calculated as
requested in the first field beneath the *FREQUENCY keyword
card. Accordingly, if the highest calculated frequency is smaller than
the upper value of the requested frequency range, there is no
guarantee that all eigenfrequencies within the requested range were
calculated. If the PERTURBATION parameter is used in the *STEP card, the load active in the last *STATIC step, if any, will be taken as preload. Otherwise, no preload will be active.

There are five optional parameters SOLVER, STORAGE, GLOBAL, CYCMPC and ALPHA.
SOLVER specifies which solver is used to perform a
decomposition of the linear equation system. This decomposition is done only
once. It is repeatedly used in the iterative procedure determining the eigenvalues. The following solvers
can be selected:

the SGI solver

PaStiX 

PARDISO

SPOOLES [3,4]. 

TAUCS 

MATRIXSTORAGE. This is not really a solver. Rather, it is an option
 allowing the user to store the stiffness and mass matrix.

Default is the first solver which has been installed of the following list:
SGI, PaStiX, PARDISO, SPOOLES and TAUCS. If none is installed, no eigenvalue analysis can be performed.

The SGI solver should by now be considered as outdated.SPOOLES is very fast, but has no
out-of-core capability: the size of systems you can solve is limited by your
RAM memory. With 32GB of RAM you can solve up to 1,000,000 equations. TAUCS is
also good, but my experience is limited to the decomposition, which
only applies to positive definite systems. It has an out-of-core capability
and also offers a decomposition, however, I was not able to run either of
them so far. PARDISO is the Intel proprietary solver and is about a factor of
two faster than SPOOLES. The most recent solver we tried is the freeware
solver PaStiX from INRIA. It is
really fast and can use the GPU. For large problems and a high end Nvidea graphical
 card (32 GB of RAM) we got an acceleration of a factor between 3 and 8
 compared to PARDISO. We modified PaStiX for this, therefore you have to
 download PaStiX from our website and compile it for your system. This can be
 slightly tricky, however, it is worth it!

If the MATRIXSTORAGE option is used, the stiffness and mass matrices are
stored in files jobname.sti and jobname.mas, respectively. These are ASCII
files containing the nonzero entries (occasionally, they can be zero;
however, none of the entries which are not listed are nonzero). Each line
consists of two integers and one real: the row number, the column number and
the corresponding value. The entries are listed column per
column. In addition, a file jobname.dof is created. It has as many entries as
there are rows and columns in the stiffness and mass matrix. Each line
contains a real number of the form “a.b”. Part a is the node number and
b is the global degree of freedom corresponding to selected row. Notice that
the program stops after creating these files. No further steps are
treated. Consequently, *FREQUENCY, SOLVER=MATRIXSTORAGE only makes sense as the last
step in a calculation. 

The parameter STORAGE indicates whether the eigenvalues, eigenmodes, mass and
stiffness matrix should be stored in binary form in file jobname.eig for
further use in a *MODAL DYNAMICS, *STEADY STATE DYNAMICS or *SENSITIVITY procedure. Default
is STORAGE=NO. Specify STORAGE=YES if storage is requested.

The parameters GLOBAL and CYCMPC only make sense in the presence of
SOLVER=MATRIXSTORAGE. GLOBAL indicates whether the matrices should be stored
in global coordinates, irrespective of whether a local coordinates system for
any of the nodes in the structure was defined. Default is GLOBAL=YES. For
GLOBAL=NO the matrices are stored in local coordinates and the directions in
file jobname.dof are local directions. Notice that the GLOBAL=NO only works if no single or multiple point constrains were defined and
one and the same coordinate system was defined for ALL nodes in the
structure. The second parameter (CYCMPC) specifies whether any cyclic multiple point
constraints should remain active while assembling the stiffness and mass matrix
before storing them. Default is CYCMPC=ACTIVE. CYCMPC=INACTIVE means that all
cyclic MPC's and any other MPC's containing dependent nodes belonging to
cyclic MPC's are removed before assembling the matrices. The CYCMPC parameter
only makes sense if GLOBAL=YES, since only then are MPC's allowed. 

The parameter ALPHA is only needed if the user wants to check the effect of
selective mass scaling in an explicit dynamics calculation for the same
structure. The maximum time step in a explicit dynamics calculation is
governed by the time a wave needs to travers the smallest element in the
mesh. This time can be increased by applying selective mass scaling, which
manipulates the element mass matrices by drawing the mass onto the diagonal
without changing it global value [73], [23]. Still, this procedure may change the
eigenfrequencies and eigenmodes of the structure, which may not be
desirable. To check this, the user can simulate the mass scaling by defining a
value for the numerical damping and the minimum desired time step in
the explicit dynamics calculation as the fourth argument underneath
*FREQUENCY. Specifying a strictly positive value of the time step
automatically leads to selective mass scaling. ALPHA takes a value between -1/3 and 0. It controls the dissipation of the high frequency
response: lower numbers lead to increased numerical damping
([65], [24]). The default value is -0.05.

For the iterative eigenvalue procedure ARPACK [51] is
used. The eigenfrequencies are always stored in file jobname.dat. 

At the start
of a frequency calculation all single point constraint boundary conditions,
which may be zero due to previous steps, are set to zero.

First line:

*FREQUENCY

Specify the parameter ALPHA and its value, if needed.

Second line:

Number of eigenfrequencies desired.

Lower value of requested eigenfrequency range (in cycles/time; default:0).

Upper value of requested eigenfrequency range (in cycles/time;
 default: ).

Minimum time step allowed in an explicit dynamic calculation for the
 same model.

Example:

*FREQUENCY
10

requests the calculation of the 10 lowest eigenfrequencies and corresponding eigenmodes. 

Example files: beam8f, beamf, beamfsms, segmenttetsms.

 Next: *FRICTION
 Up: Input deck format
 Previous: *FLUID SECTION
   Contents
```

## *SECTION PRINT - `node334.html`

```
*SECTION PRINT

 Next: *SELECT CYCLIC SYMMETRY MODES
 Up: Input deck format
 Previous: *ROBUST DESIGN
   Contents 

*SECTION PRINT

Keyword type: step

This option is used to print selected facial variables in file
jobname.dat. The following variables can be
selected:

Fluid dynamic drag stresses (key=DRAG), only makes sense for 3D fluid calculations

Heat flux (key=FLUX), only makes sense for heat calculations (structural
 or CFD)

Section forces, section moments and section areas(key=SOF or key=SOM or key=SOAREA), only makes
 sense for structural calculations

The drag stresses are printed in the integration points of the faces. The
output lists the element, the local face number, the integration point, the
x-, y- and z- component of the surface stress vector in the global coordinate system,
the normal component, the shear component and the global coordinates of the
integration point. At the end of the listing the surface stress vectors are integrated to
yield the total force on the surface.

The heat flux is also printed in the integration points of the faces. The
output lists the element, the local face number, the integration point, the
heat flux (positive = flux leaving the element through the surface defined by
the parameter SURFACE) and the global coordinates of the
integration point. At the end of the listing the heat flux vectors are
integrated to yield the total heat flow through the surface.

The section forces, section moments and section areas are triggered by the keys SOF,
SOM and SOAREA. All three keys are equivalent, i.e. asking for SOF (the section forces) will
also trigger the calculation of the section moments and the section areas. This
implementation was selected because the extra work needed to calculate the
moments and areas once the forces are known is neglegible. The output lists 

the components of the total surface force and moment about the origin in
 global coordinates

the coordinates of the center of gravity and the components of the mean normal

the components of the moment about the center of gravity in global
 coordinates

the area, the normal force on the section (+ is tension, - is
 compression) and the size (absolute value) of the shear force.

Notice that, for
internal surfaces (i.e. surfaces which have elements on both sides) the sign
of the force and the moment depends on the side the elements of which were
selected in the definition of the *SURFACE. Please look at
example beamp.inp for an illustration of this.

Since the section forces are obtained by integration of the stresses at the
integration points of the faces, which are obtained by interpolation from the stress
values 
at the facial nodes (which in turn are determined through extrapolation from the integration point values inside
the volumetric elements and subsequent averaging over the elements to which
the node belongs) they will not be accurate at locations where the stress
jumps, such as at interfaces between different materials.

There are four parameters,
SURFACE, NAME, FREQUENCYF and TIME POINTS. The parameter SURFACE is
required, defining the facial surface for which the requested items are to be
printed. The parameter NAME is required too, defining a name for the section
print. So far, this name is not used.

The parameters FREQUENCYF and TIME POINTS are mutually exclusive. 

The parameter FREQUENCYF is optional, and applies to
nonlinear calculations where a step can consist of several
increments. Default is FREQUENCYF=1, which indicates that the results
of all increments will be stored. FREQUENCYF=N with N an integer
indicates that the results of every Nth increment will be stored. The
final results of a step are always stored. If you only want the final
results, choose N very big. 
The value of N applies to 
*OUTPUT,*ELEMENT OUTPUT, 
*EL FILE, *ELPRINT, 
*NODE OUTPUT,
*NODE FILE, *NODE PRINT,
*SECTION PRINT,*CONTACT OUTPUT,
*CONTACT FILE and *CONTACT PRINT. 
If the FREQUENCYF parameter is used
for more than one of these keywords with conflicting values of N, the
last value applies to all. A FREQUENCYF parameter stays active across several steps
until it is overwritten by another FREQUENCYF value or the TIME POINTS parameter.

With the parameter TIME POINTS a time point sequence can be referenced,
defined by a 
*TIME POINTS keyword. In that case, output will be
provided for all time points of the sequence within the step and additionally at the end of
the step. No other output will be stored and the FREQUENCYF parameter is not
taken into account. Within a step only one time point sequence can be active. If more than
one is specified, the last one defined on any of the keyword cards
*NODE FILE, *EL FILE, *NODE
 PRINT or *EL PRINT will be active. The TIME
POINTS option should not be used together with the DIRECT option on the
procedure card. The TIME POINTS parameters stays active across several steps
until it is replaced by another TIME POINTS value or the FREQUENCYF parameter.

The first occurrence of an *SECTION PRINT keyword card within a step wipes
out all previous facial variable selections for print output. If no
*SECTION PRINT card is used within a step the selections of the previous
step apply, if any. 

Several *SECTION PRINT
cards can be used within one and the same step.

First line:

*SECTION PRINT

Enter the parameter SURFACE and its value.

Second line:

Identifying keys for the variables to be printed, separated by commas.

Example:

*SECTION PRINT,SURFACE=S1,NAME=SP1
DRAG

requests the storage of the drag stresses for the faces belonging to (facial)
set N1 in the .dat file. The name of the section print is SP1.

Example files: fluid2, beamp.

 Next: *SELECT CYCLIC SYMMETRY MODES
 Up: Input deck format
 Previous: *ROBUST DESIGN
   Contents
```
