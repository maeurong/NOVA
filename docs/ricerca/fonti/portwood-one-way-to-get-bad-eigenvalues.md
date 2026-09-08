### OpenSees Cloud

If one of the eigenvalues for your model is zero or negative, you likely made a modeling error. The error could be due to boundary conditions, element stiffness, or mass definition.

Let me show you how easy it is to make an error and get bad eigenvalues due to an error in mass definition.

Suppose you want to apply a 50 kip gravity load to a column. You plan to use a variable (always a good idea) and you remember that gravity acts “downward”, so you make the gravity load negative.

```python
Pgrav = -50*kip
```

Then when you define the nodal mass, you divide that variable by gravitational acceleration to get mass.

```python
m = Pgrav/g
ops.mass(2,m,m,0)
```

And because [mass and weight](https://portwooddigital.com/2020/11/20/mass-and-weight/) require separate input, you define the gravity load in a constant time series. The definition of `Pgrav` accounted for the “downward” direction of the gravity load, so no negative sign required here.

```python
ops.timeSeries('Constant',1)
ops.pattern('Plain',1,1)
ops.load(2,0,Pgrav,0)
```

Then, when you issue the `eigen()` command, the eigenvalues are negative!

```python
w2 = ops.eigen('-fullGenLapack',2)
print('FullGenLapack Eigenvalue Solver',w2)

w2 = ops.eigen(2)
print('Default Eigenvalue Solver',w2)
```
```
FullGenLapack Eigenvalue Solver [-44822.40000000003, -941.2704000000004]
Default Eigenvalue Solver [1.1143657371044e-311, 1.114365737223e-311]
```

The `FullGenLapack` solver returns two negative eigenvalues (correct magnitudes, wrong signs) while the default eigenvalue solver returns two numbers that are basically zero.

Due to the negative sign in `Pgrav`, you ended up with negative mass–an easy mistake to make. I’ve made it before.

Generally, you want to define your variables using magnitude, then assign direction or sense in the subsequent command. In this example, make `Pgrav` positive and use a negative sign in the `load()` command. Same goes for *Concrete23* –define the compressive strength, `fc`, as positive, then use a negative sign to denote compression in the input command.

Here is the full script for a simple cantilever column. Try it out for yourself.

```python
import openseespy.opensees as ops

kip = 1.0
sec = 1.0
ft = 1.0

inch = ft/12
g = 32.2*ft/sec**2

L = 100*inch
E = 29000*kip/inch**2
A = 20*inch**2
Iz = 1400*inch**4

Pgrav = -50*kip

ops.wipe()
ops.model('basic','-ndm',2,'-ndf',3)

ops.node(1,0,0); ops.fix(1,1,1,1)
m = Pgrav/g
ops.node(2,0,L); ops.mass(2,m,m,0)

ops.geomTransf('Linear',1)

ops.section('Elastic',1,E,A,Iz)
ops.beamIntegration('Lobatto',1,1,3)

ops.element('forceBeamColumn',1,1,2,1,1)

ops.timeSeries('Constant',1)
ops.pattern('Plain',1,1)
ops.load(2,0,Pgrav,0)

ops.system('UmfPack')

w2 = ops.eigen('-fullGenLapack',2)
print('FullGenLapack Eigenvalue Solver',w2)

w2 = ops.eigen(2)
print('Default Eigenvalue Solver',w2)
```