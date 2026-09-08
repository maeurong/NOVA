### OpenSees Cloud

There are three applications of eigenvalue analysis in structural engineering. Vibration analysis and buckling analysis involve generalized eigenvalue analysis. OpenSees does vibration eigenvalue analysis pretty well, but does not perform buckling eigenvalue analysis–although you might be able to fake the geometric stiffness matrix for simple frame models.

The third application of eigenvalue analysis is ordinary (non-generalized) spectral decomposition of the material stiffness matrix, ${\bf K}{\bf x}=\lambda {\bf x}$, which tells you how a structural model wants to deform. The lower the eigenvalue, $\lambda$, the easier it is for the model to deform in the shape of the associated eigenvector, ${\bf x}$. If you get a zero eigenvalue, there is a rigid body displacement mode in your model.

There are two approaches to finding the spectral decomposition of the stiffness matrix in OpenSees. The first approach is to use the default generalized eigenvalue solver in OpenSees after making the mass matrix equal to the identity matrix.

```python
#
# Define your model
#

NDF = ops.getNDF()[0]
ones = [1]*NDF # 1,1,...,1
for nd in ops.getNodeTags():
   ops.mass(nd,*ones)

Nmodes = 2 ;# Or whatever
lam = ops.eigen(Nmodes)
```

The second approach is to use the `'symmBandLapack'` option with the `eigen` command. This is not a generalized eigenvalue solver so you don’t have to worry about the “mass” matrix.

```python
#
# Define your model
#

Nmodes = 2 ;# Or whatever
lam = ops.eigen('standard','symmBandLapack',Nmodes)
```

The `'standard'` input is not entirely necessary. It’s there to make sure you’re aware the `eigen` command is not going to solve a generalized eigenvalue problem, like clicking “OK” before deleting a file.

There’s a third approach: get the stiffness matrix from `printA`, then use an eigenvalue solver in Python, e.g., `scipy.linalg.eig`. This is fine for getting eigenvalues, but you’ll have a hard time mapping the eigenvectors back to the structural model.

Consider a simple beam with two DOFs–the two end rotations. The stiffness matrix contains the basic stiffness coefficients $4EI/L$ and $2EI/L$.

IMAGE

The lowest eigenpair $(2EI/L, [1,-1])$ corresponds to symmetric bending, indicating this is the easiest way for the beam to flex while the highest eigenpair $(6EI/L, [1,1])$ corresponds to the more difficult case of anti-symmetric bending. The spectral decomposition tells us that, in the absence of member loads, the flexure of a simple beam is always some combination of symmetric and anti-symmetric bending.

After defining the model and calling the eigen command, you can use the `nodeEigenvector` command to see the components of the eigenvectors at each node.

```python
import openseespy.opensees as ops

L = 120
E = 29000
A = 12
I = 800

ops.wipe()
ops.model('basic','-ndm',2,'-ndf',3)

ops.node(1,0,0); ops.fix(1,1,1,0)
ops.node(2,L,0); ops.fix(2,1,1,0)

ops.geomTransf('Linear',1)
ops.element('elasticBeamColumn',1,1,2,A,E,I,1)
 
lam = ops.eigen('-standard','-symmBandLapack',2)
 
print('Computed eigenvalues:',lam)
print('Expected eigenvalues:',2*E*I/L,6*E*I/L)

assert isclose(lam[0],2*E*I/L)
assert isclose(lam[1],6*E*I/L)

print('Eigenvector 1')
print(ops.nodeEigenvector(1,1,3),ops.nodeEigenvector(2,1,3)) # node, mode, dof
print('Eigenvector 2')
print(ops.nodeEigenvector(1,2,3),ops.nodeEigenvector(2,2,3))

assert isclose(abs(ops.nodeEigenvector(1,1,3)),1/2**.5)
assert isclose(abs(ops.nodeEigenvector(2,1,3)),1/2**.5)
assert isclose(abs(ops.nodeEigenvector(1,2,3)),1/2**.5)
assert isclose(abs(ops.nodeEigenvector(2,1,3)),1/2**.5)
```

The `symmBandLapack` eigenvalue solver gives the expected results.

IMAGE

Note that the solver normalized the eigenvectors to have unit length.