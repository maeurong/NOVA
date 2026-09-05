# Deck generato da NOVA (nova/deck.py). Unità: mm, N, MPa, t, s.
# Si esegue con la cartella di lavoro sulla cartella di uscita.
wipe
model BasicBuilder -ndm 3 -ndf 6

# --- nodi ---
node 1 0 0 0
node 2 5000 0 0
node 3 9000 0 0
node 4 0 0 3200
node 5 5000 0 3200
node 6 9000 0 3200

# --- vincoli dichiarati ---
fix 1 1 1 1 1 1 1
fix 2 1 1 1 1 1 1
fix 3 1 1 1 1 1 1

# --- materiali elastici (T1) e sezioni a fibre ---
uniaxialMaterial Elastic 1 31475.80621    ;# C25/30, sezione 1
uniaxialMaterial Elastic 2 200000    ;# B450C, sezione 1
section Fiber 1 -GJ 1.496084414e+13 {
    patch rect 1 10 10 -150 -150 150 150
    fiber -104 -104 201.0619298 2
    fiber -104 104 201.0619298 2
    fiber 104 -104 201.0619298 2
    fiber 104 104 201.0619298 2
}
uniaxialMaterial Elastic 3 31475.80621    ;# C25/30, sezione 2
uniaxialMaterial Elastic 4 200000    ;# B450C, sezione 2
section Fiber 2 -GJ 3.694959055e+13 {
    patch rect 3 10 10 -150 -250 150 250
    fiber -104 -204 201.0619298 4
    fiber 0 -204 201.0619298 4
    fiber 104 -204 201.0619298 4
    fiber -104 204 201.0619298 4
    fiber 0 204 201.0619298 4
    fiber 104 204 201.0619298 4
}

# --- trasformazioni ed elementi ---
geomTransf Linear 1 0 1 0
element forceBeamColumn 1 1 4 5 1 1 -mass 0.0002337000759
geomTransf Linear 2 0 1 0
element forceBeamColumn 2 2 5 5 1 2 -mass 0.0002337000759
geomTransf Linear 3 0 1 0
element forceBeamColumn 3 3 6 5 1 3 -mass 0.0002337000759
geomTransf Linear 4 0 0 1
element forceBeamColumn 4 4 5 5 2 4 -mass 0.0003887896138
geomTransf Linear 5 0 0 1
element forceBeamColumn 5 5 6 5 2 5 -mass 0.0003887896138

# ===== caso di carico Z1 =====
timeSeries Linear 1
pattern Plain 1 1 {
    eleLoad -ele 4 -type -beamUniform 0 -12.5 0
    eleLoad -ele 5 -type -beamUniform 0 -12.5 0
}
recorder Node -file Z1_spostamenti.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 disp
recorder Node -file Z1_reazioni.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 reaction
recorder Element -file Z1_localforce.out -precision 12 -eleRange 1 5 localForce
recorder Element -file Z1_sez1.out -precision 12 -eleRange 1 5 section 1 force
recorder Element -file Z1_sez2.out -precision 12 -eleRange 1 5 section 2 force
recorder Element -file Z1_sez3.out -precision 12 -eleRange 1 5 section 3 force
recorder Element -file Z1_sez4.out -precision 12 -eleRange 1 5 section 4 force
recorder Element -file Z1_sez5.out -precision 12 -eleRange 1 5 section 5 force
constraints Transformation
numberer RCM
system BandGeneral
test RelativeNormDispIncr 1.0e-8 10
algorithm Newton
integrator LoadControl 1.0
analysis Static
if {[analyze 1] != 0} {
    puts "MESHREC_FINE_MANCA: il caso Z1 non è arrivato a convergenza"
    exit 1
}
remove recorders
wipeAnalysis
remove loadPattern 1
reset

# ===== caso di carico Z2 =====
timeSeries Linear 2
pattern Plain 2 2 {
    load 4 20000 0 0 0 0 0
}
recorder Node -file Z2_spostamenti.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 disp
recorder Node -file Z2_reazioni.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 reaction
recorder Element -file Z2_localforce.out -precision 12 -eleRange 1 5 localForce
recorder Element -file Z2_sez1.out -precision 12 -eleRange 1 5 section 1 force
recorder Element -file Z2_sez2.out -precision 12 -eleRange 1 5 section 2 force
recorder Element -file Z2_sez3.out -precision 12 -eleRange 1 5 section 3 force
recorder Element -file Z2_sez4.out -precision 12 -eleRange 1 5 section 4 force
recorder Element -file Z2_sez5.out -precision 12 -eleRange 1 5 section 5 force
constraints Transformation
numberer RCM
system BandGeneral
test RelativeNormDispIncr 1.0e-8 10
algorithm Newton
integrator LoadControl 1.0
analysis Static
if {[analyze 1] != 0} {
    puts "MESHREC_FINE_MANCA: il caso Z2 non è arrivato a convergenza"
    exit 1
}
remove recorders
wipeAnalysis
remove loadPattern 2
reset

# ===== caso di carico C1 =====
timeSeries Linear 3
pattern Plain 3 3 {
    load 4 30000 0 0 0 0 0
    eleLoad -ele 4 -type -beamUniform 0 -18.75 0
    eleLoad -ele 5 -type -beamUniform 0 -18.75 0
}
recorder Node -file C1_spostamenti.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 disp
recorder Node -file C1_reazioni.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 reaction
recorder Element -file C1_localforce.out -precision 12 -eleRange 1 5 localForce
recorder Element -file C1_sez1.out -precision 12 -eleRange 1 5 section 1 force
recorder Element -file C1_sez2.out -precision 12 -eleRange 1 5 section 2 force
recorder Element -file C1_sez3.out -precision 12 -eleRange 1 5 section 3 force
recorder Element -file C1_sez4.out -precision 12 -eleRange 1 5 section 4 force
recorder Element -file C1_sez5.out -precision 12 -eleRange 1 5 section 5 force
constraints Transformation
numberer RCM
system BandGeneral
test RelativeNormDispIncr 1.0e-8 10
algorithm Newton
integrator LoadControl 1.0
analysis Static
if {[analyze 1] != 0} {
    puts "MESHREC_FINE_MANCA: il caso C1 non è arrivato a convergenza"
    exit 1
}
remove recorders
wipeAnalysis
remove loadPattern 3
reset

# ===== caso di carico Z3 =====
timeSeries Linear 4
pattern Plain 4 4 {
    eleLoad -ele 1 -type -beamUniform 0 0 -2.291814849
    eleLoad -ele 2 -type -beamUniform 0 0 -2.291814849
    eleLoad -ele 3 -type -beamUniform 0 0 -2.291814849
    eleLoad -ele 4 -type -beamUniform 0 -3.812723666 0
    eleLoad -ele 5 -type -beamUniform 0 -3.812723666 0
}
recorder Node -file Z3_spostamenti.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 disp
recorder Node -file Z3_reazioni.out -precision 12 -nodeRange 1 6 -dof 1 2 3 4 5 6 reaction
recorder Element -file Z3_localforce.out -precision 12 -eleRange 1 5 localForce
recorder Element -file Z3_sez1.out -precision 12 -eleRange 1 5 section 1 force
recorder Element -file Z3_sez2.out -precision 12 -eleRange 1 5 section 2 force
recorder Element -file Z3_sez3.out -precision 12 -eleRange 1 5 section 3 force
recorder Element -file Z3_sez4.out -precision 12 -eleRange 1 5 section 4 force
recorder Element -file Z3_sez5.out -precision 12 -eleRange 1 5 section 5 force
constraints Transformation
numberer RCM
system BandGeneral
test RelativeNormDispIncr 1.0e-8 10
algorithm Newton
integrator LoadControl 1.0
analysis Static
if {[analyze 1] != 0} {
    puts "MESHREC_FINE_MANCA: il caso Z3 non è arrivato a convergenza"
    exit 1
}
remove recorders
wipeAnalysis
remove loadPattern 4
reset

wipe
set _fine [open "fine.out" w]
puts $_fine "MESHREC_FINE"
close $_fine
