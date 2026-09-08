### OpenSees Cloud

How to compute the eigenvalues (natural periods) of a structural model during an analysis, as the stiffness changes due to yielding, unloading, reloading, large displacement, etc., is a common question. In general, periods elongate during yielding events, then shorten again upon unloading. The extent and duration of period change depends on the constitutive models and loading.

Model behavior aside, the idea is quite simple. Perform your analysis in a loop and call the `eigen` command inside the loop. Then do what you need to do with the eigenvalues–either record them for plotting or update your loading in an adaptive analysis.

```python
import openseespy.opensees as ops

#
# Build your model, perform gravity load analysis
#

Nmodes = 4 # Or whatever for your purposes
Tf = 40
dt = 0.01
Nsteps = int(Tf/dt)

for i in range(Nsteps):
    ok = ops.analyze(1,dt)
    if ok < 0:
        break
    w2 = ops.eigen(Nmodes)
    #
    # Do what you want with w2
    #
```

OpenSees will assemble the current tangent stiffness into the eigenvalue solver each time `eigen` is called. However, this can be a heavy computational burden for large models. And do you really need to see the change in eigenvalues at every time step?

Following the advice of [Dr. Silvia Mazzoni](https://courses.silviasbrainery.com/), it’s better to call `eigen` periodically, e.g., every 10 time steps, instead of at every step. In general, you can use an extra variable in your script along with the modulo, or remainder, operator (%).

```python
# Same as above

NstepsEigen = 10 # Or whatever
for i in range(Nsteps):
    ok = ops.analyze(1,dt)
    if ok < 0:
        break
    if i % NstepsEigen == 0:
        w2 = ops.eigen(Nmodes)
        #
        # Do what you want with w2
        #
```

This procedure will also work in a static pushover analysis, just be sure to define mass.