### OpenSees Cloud

With daily posts during NaBloPoMo, [LBUs](https://lukeoconnor.wordpress.com/2008/12/08/least-bloggable-and-tweetable-units-lbu/) are highly coveted. And I’m not afraid to partake in incremental blogging. Heck, LPUs and incremental publishing seem to be *de rigueur*.

Anyway, with zero shame, here’s an insidious variation of a recent post on [how to get bad eigenvalues](https://portwooddigital.com/2022/11/11/another-way-to-get-bad-eigenvalues/%7B$%20post_url%202022-11-10-one-way-to-get-bad-eigenvalues%20$%7D) from your OpenSees model.

If negative mass can lead to negative eigenvalues, it follows that negative stiffness can lead to the same outcome. Besides the obvious case of defining a material model with negative stiffness (assuming the constructor for the material model even allows negative stiffness), there is one common case where you can end up with negative stiffness despite your best intentions and well-defined material properties.

Consider the eigenvalue analysis of a cantilever column from the previous “bad eigenvalue” post, but with the correct mass definition and with a fiber section of elastic materials.

```python
import openseespy.opensees as ops

kip = 1.0
sec = 1.0
ft = 1.0

inch = ft/12
g = 32.2*ft/sec**2

L = 100*inch
E = 29000*kip/inch**2
d = 10*inch
b = 2*inch
Pgrav = 50*kip
m = Pgrav/g

ops.wipe()
ops.model('basic','-ndm',2,'-ndf',3)

ops.node(1,0,0); ops.fix(1,1,1,1)
ops.node(2,0,L); ops.mass(2,m,m,0)

ops.geomTransf('Linear',1)

ops.uniaxialMaterial('Elastic',1,E)
ops.section('Fiber',1)
ops.patch('quadr',1,10,10, d/2,b/2, d/2,-b/2, -d/2,-b/2, -d/2,b/2)

ops.beamIntegration('Lobatto',1,1,3)
ops.element('forceBeamColumn',1,1,2,1,1)

ops.timeSeries('Constant',1)
ops.pattern('Plain',1,1)
ops.load(2,0,-Pgrav,0)

ops.system('UmfPack')

w2 = ops.eigen('-fullGenLapack',2)
print('FullGenLapack Eigenvalue Solver',w2)

w2 = ops.eigen(1)
print('Default Eigenvalue Solver',w2)
```

The eigenvalue solvers give the following output.

```
FullGenLapack Eigenvalue Solver [-44822.40000000003, -27.733860000000014]
Default Eigenvalue Solver [-27.73386000000001]
```

Negative eigenvalues again! What happened?

The *I*, *J*, *K*, *L* points of the quadrilateral fiber patch were [defined in clockwise order around the section](https://portwooddigital.com/2022/06/05/rectangular-patches/), giving negative fiber areas. As a result, the cross-section area and second moments of area become negative, making the element stiffness negative, producing negative eigenvalues.

Another easy mistake to make, one that I have made many times.