# `prior_vuoto/12_wall.json` — un prior vero che non ha trovato nessuna membratura

Da dove viene: la corsa `lab_telaio_v2` di MeshRec sul telaio di laboratorio, 02/09/2026.
Originale: `~/GitHub/NOVA/lab_telaio_v2/12_wall.json` (fuori dal repo, `.gitignore`),
sha256 `b2e066e87da9d78e53000fc0c16ae8a6ed0fda420acd36a4609cb53f5b361118`.

Ridotto tenendo le sole chiavi che l'importatore legge —
`terna`, `centro`, `membrature` (vuota), `giunzioni` (vuota), `scartate`, `riscontri`,
`chiusura_volume` — e buttando le statistiche della pipeline (`plane_*`, `pavimento_*`,
`punti_dopo`, …). Nessuna voce di `scartate` è stata toccata: tutte e otto le regioni con
i loro `esiti`, e `punti` è il conteggio dei punti, non la lista degli indici.

Serve a un caso solo, ma è il caso vero: otto regioni scartate, zero membrature, e
l'importatore deve rendere un modello vuoto che `carica` accetta invece di sollevare.
