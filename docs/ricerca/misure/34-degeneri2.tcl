# Ricerca 11 (ticket #34), caso E: `modalProperties` con un'analisi già definita
# (statica corsa) ma **senza** `eigen` prima. È lo scenario di NOVA se il passo
# modale sulla tangente venisse scritto senza `eigen` in mezzo.
# Atteso dal sorgente: DomainModalProperties.cpp DMP_ERR("No Eigenvalue provided") -> exit(-1).
wipe
model BasicBuilder -ndm 3 -ndf 6
node 1 0 0 0
node 2 0 0 3000
fix 1 1 1 1 1 1 1
mass 2 1.0 1.0 1.0 0 0 0
geomTransf Linear 1 0 1 0
element elasticBeamColumn 1 1 2 40000 30000 12500 1.0e8 1.3e8 1.3e8 1
timeSeries Linear 1
pattern Plain 1 1 { load 2 100.0 0 0 0 0 0 }
constraints Transformation
numberer RCM
system BandGeneral
test RelativeNormDispIncr 1.0e-8 10
algorithm Newton
integrator LoadControl 1.0
analysis Static
puts "N34DEG E analyze=[analyze 1]"
set rc [catch {modalProperties -print -file deg_e.out -unorm} m]
puts "N34DEG E modalProperties-senza-eigen-con-analisi rc=$rc $m"
puts "N34DEG E FINE: il processo e' sopravvissuto"
