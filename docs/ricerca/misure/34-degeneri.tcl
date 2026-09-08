# Ricerca 11 (ticket #34): i tre ingressi degeneri di `eigen`/`modalProperties`.
# Si esegue con `OpenSees 34-degeneri.tcl` in una cartella scrivibile; ogni caso
# stampa una riga `N34DEG`. Il caso A **uccide il processo** se il sorgente fa
# quello che dice (DomainModalProperties.cpp DMP_ERR -> exit(-1)): sta per ultimo
# apposta, così i due prima riescono comunque a stampare.
wipe
model BasicBuilder -ndm 3 -ndf 6
node 1 0 0 0
node 2 0 0 3000
fix 1 1 1 1 1 1 1
mass 2 1.0 1.0 1.0 0 0 0
geomTransf Linear 1 0 1 0
element elasticBeamColumn 1 1 2 40000 30000 12500 1.0e8 1.3e8 1.3e8 1

# --- B: `eigen` senza nessuna analisi definita (dopo `wipeAnalysis`) ---
wipeAnalysis
set rc [catch {eigen -fullGenLapack 2} res]
puts "N34DEG B eigen-senza-analisi rc=$rc val=$res"

# --- C: più modi dei gradi dinamici, con Arpack ---
set rc [catch {eigen 12} res]
puts "N34DEG C arpack-12-modi rc=$rc val=$res"

# --- D: `modalProperties` dopo un `eigen` riuscito ---
set rc [catch {eigen -fullGenLapack 3} res]
set rc2 [catch {modalProperties -print -file deg_ok.out -unorm} m]
puts "N34DEG D modalProperties-dopo-eigen rc=$rc2 $m"

# --- A: `modalProperties` senza nessun `eigen` prima ---
wipe
model BasicBuilder -ndm 3 -ndf 6
node 1 0 0 0
node 2 0 0 3000
fix 1 1 1 1 1 1 1
mass 2 1.0 1.0 1.0 0 0 0
geomTransf Linear 1 0 1 0
element elasticBeamColumn 1 1 2 40000 30000 12500 1.0e8 1.3e8 1.3e8 1
set rc [catch {modalProperties -print -file deg_senza_eigen.out -unorm} m]
puts "N34DEG A modalProperties-senza-eigen rc=$rc $m"
puts "N34DEG FINE: il processo e' sopravvissuto al caso A"
