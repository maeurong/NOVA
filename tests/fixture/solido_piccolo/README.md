# `solido_piccolo` — parallelepipedo a tetraedri per le prove su `ccx`

`trave.inp` lo scrive `genera.py`, deterministico: stessa uscita byte per byte a ogni giro.
Le parole chiave e l'ordine dei passi sono copiati da `lab_telaio_v2/wall_model.inp`
(righe 67272-70360), così la fixture ha la forma del deck vero ma si risolve in un quinto
di secondo.

```
python tests/fixture/solido_piccolo/genera.py
```

| voce | valore |
|---|---|
| `trave.inp` | 40 292 byte, sha256 `42e372e19f0e41d5f267d34e0f914157cd634f41fba2044bda263b73b89609fa` |
| geometria | 200 × 100 × 1000 mm, celle 4 × 2 × 20, 6 tetraedri di Kuhn per cella |
| mesh | 315 nodi, 960 `C3D4`; `BASE` = 15 nodi a z = 0, `TOP` = 15 nodi a z = 1000 |
| materiale | `E` 31 500 MPa, ν 0,2, ρ 2,5493e-9 t/mm³; `g` nel deck = 9 810 |
| passi | `GRAVITA`, `SPINTA_ORIZZONTALE` (0,1 g in +y), `CARICO_TOP` (gravità + Σ `*CLOAD` = −1 200 N su 15 nodi, −80,0 N ciascuno), `MODALE` (10 modi) |
| volume | 2,0e7 mm³ **esatto** (somma dei 960 volumi con segno: 2,0000000000000007e7) |
| massa (ρ·V) | 0,050986 t → ρ·V·g = 500,17266 N |

## Misure con `ccx` 2.22 (05/09/2026, `ccx -i solido` in una cartella temporanea)

exit 0, «Job finished», 0,20 s reali, 0 `*WARNING` e 0 `*ERROR`.
Uscite: `.dat` 15 742 B, `.frd` 1 133 276 B, `.sta`, `.cvg`, `.12d` (vuoto), `spooles.out` (vuoto).

| passo | Σ Fx | Σ Fy | Σ Fz | n nodi |
|---|---|---|---|---|
| 1 `GRAVITA` | −6e-6 | 0,000000 | **487,668350** | 15 |
| 2 `SPINTA_ORIZZONTALE` | −4e-6 | **−48,766843** | 487,668318 | 15 |
| 3 `CARICO_TOP` | −5e-6 | −7e-6 | **1 687,668370** | 15 |

**Σ Rz ≠ ρ·V·g, e non è un difetto della fixture.** `ccx` non riporta, nella `RF` di un nodo
vincolato che porta anche `*DLOAD, GRAV`, la quota di gravità che gli elementi assegnano a
quel nodo (manuale CalculiX §6.11.5, e `meshrec/core/solve.py:160-195`, che l'ha misurata in
forma chiusa su un tetraedro solo). La quota tributaria di `BASE` su questa mesh vale
0,00127465 t → 12,504 N, e l'identità torna:

    (ρ·V − quota) · g = 487,66834350 N   contro   487,668350 letti  (scarto relativo 1,3e-8)

Stessa identità sul deck vero: ρ·V = 0,5550556 t, quota `BASE` = 0,1219690 t,
(ρV − quota)·g = **4 248,5798** N contro i 4 248,58 misurati il 05/09.

## Modale (`*FREQUENCY`, 10 modi)

| modo | f [Hz] | direzione dominante |
|---|---|---|
| 1 | 76,9531 | y (asse debole, spessore 100) |
| 2 | 122,7747 | x |
| 3 | 457,0733 | y (seconda flessionale) |

`TOTAL EFFECTIVE MASS` del `.dat`: 0,04918025 t su tutte e tre le traslazioni — è la massa
al netto dei gradi vincolati, **non** la massa del corpo (0,050986 t).

## Spostamenti di `TOP` dal `.frd` (`DISP`, blocchi non modali)

| passo | u_z di modulo massimo | u_y di modulo massimo |
|---|---|---|
| 1 | −4,02422e-4 mm | +2,93943e-5 mm |
| 2 | −8,64289e-4 mm | +6,49297e-3 mm |
| 3 | −2,44142e-3 mm | −1,33879e-4 mm |
