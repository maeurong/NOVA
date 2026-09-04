# Ricerca: schema comparato dei modelli dati strutturali esistenti

Ricerca del 04/09/2026, condotta da un `researcher` dispacciato dopo le prime sette, quando due di esse erano convergenti su «il modello dati interno è un telaio» (`README.md` §1, §4). Domanda posta: come i formati e i progetti di riferimento rappresentano nodi, aste, sezioni, armature, carichi, combinazioni e risultati, e cosa insegnano al modello dati che questo progetto dovrà disegnare.

**Skill-gate:** `tech-stack-evaluator` saltata. Script (`stack_comparator.py:15-35`) pesano `performance/scalability/developer_experience/…` su stack eseguibili; qui confronto fra schemi/formati, nessun ingresso sensato. Stessa scelta degli altri sette.

**Premesse del brief verificate** [V]: `docs/ricerca/README.md:25,87`; `02-panorama-software.md:46,94`; `03-stack-tecnico.md:89,101`; `05-archeologia-linea-integrata.md:141-144,150`; `06-dominio-analisi-verifiche-formati.md:94,146`. Nessuna premessa falsa. `~/GitHub/Tesi` non toccato: MeshRec letto solo via `05-*.md`.

Tag: **[V]** verificato su fonte · **[M]** misurato in sessione · **[INF]** inferenza · **[NON TROVATO]**.

## Artefatti consultati

| sorgente | ref letta | come |
|---|---|---|
| `ogunc/opensees-studio` | `73b8d5d` 2026-05-22, `pyproject` 0.0.1, AGPL | clone depth 1 |
| `madil4/awatif` | `151ec51` 2026-08-16, `package.json` 3.3.0, MIT | clone depth 1 |
| `JWock82/Pynite` | `120dfad` 2026-08-22, `pyproject` 3.0.0 | clone depth 1 |
| `pynite-tools` | 0.7.0 PyPI, installato in venv con PyNiteFEA 3.0.0 | `pip install` [M] |
| `specklesystems/speckle-sharp` `Objects/Objects/Structural` | main `e4bb61d` 2025-07-11 | raw GitHub + API tree |
| SAF doc | tag `2.2.0` = `7d54cf4` 2023-04-13 + saf.guide/en/stable | clone + WebFetch |
| OpenSeesPy | 3.8.0 su Python 3.14.7 (venv scratchpad) | `printModel('-JSON')` eseguito [M] |

I cloni e i dump stavano nello scratchpad di sessione (effimero); i riferimenti a commit e file sono riportati per rifare la lettura.

---

## 1. opensees-studio

**Architettura** [V `docs/architecture.md:1-81`]: MVVM + service; `core` = Pydantic puro, «NO Qt imports. NO openseespy imports»; `services` = runner/persistenza/risultati; `viewmodels` = `QUndoStack`; `commands` = `QUndoCommand`. Persistenza: `.osmodel` JSON «validated by Pydantic», risultati `*.osresults.h5` HDF5 «one group per analysis case». Ordine comandi OpenSees imposto dal runner (12 passi, `architecture.md:61-80`).

**Entità e ID** [V `core/_base.py:15-26`]:
```python
class Entity(BaseModel):
    model_config = ConfigDict(frozen=False, extra="forbid", validate_assignment=True, populate_by_name=True)
    id: PositiveInt = Field(..., description="Unique tag within its kind. Used as the OpenSees tag.")
    name: str = Field(default="", description="Optional human-readable label.")
```
ID = tag OpenSees, interi, **per-tipo** (`Project._next_id` = max+1, `project.py:143-165`); unicità verificata in `_check_unique_ids` (`project.py:124-141`); riferimenti incrociati in `validate_references` (`project.py:186-259`). `Project` root: `schema_version: int = 1 (frozen)`, `meta{name,description,author,units}`, `ndm`, `ndf`, `coord_systems`, `nodes`, `materials`, `sections`, `elements`, `mp_constraints`, `time_series`, `load_patterns`, `spectra`, `analyses` (`project.py:50-109`). Migrazione legacy solo per `grid_system → coord_systems` (`project.py:62-73`).

**Nodo** [V `geometry/node.py:25-44`]: `coords: (x,y,z)` sempre 3D; `mass: (mx,my,mz,Ixx,Iyy,Izz)`; `restraint: (Ux,Uy,Uz,Rx,Ry,Rz) bool`. Vincolo = attributo del nodo, non entità.

**Elementi** [V `geometry/elements.py`]: union discriminata su `type`: `Truss`, `CorotTruss`, `ElasticBeamColumn(section_id, geom_transf)`, `ForceBeamColumn(section_id, integration_points 2..10, geom_transf, max_iter, tolerance)`, `DispBeamColumn`, `ZeroLength(material_ids, dofs)`, `ZeroLengthSection`, `BeamWithHinges(section_i_id, section_j_id, lp_i, lp_j, E,A,Iz,Iy,G,J)`, `Quad`. **Nessun rilascio di estremità** come attributo dell'asta; cerniera solo via `ZeroLength`/`BeamWithHinges`. **Nessun `rigidDiaphragm`**: solo `EqualDOFConstraint(retained_node, constrained_node, dofs)` (`constraints.py:9-19`). Gap-analysis interna lo conferma: `Point_Rigid_diaphragm ❌ P1` (`docs/gap-analysis-gidopensees.md:177,215`).

**Sezioni a fibre / armature** [V `sections/__init__.py`]: `ElasticSection(E,A,Iz,Iy,G,J)`; `FiberSection(GJ, patches[rect|circ], layers[straight], fibres[])` che **rispecchia 1:1 i comandi OpenSees** (`patch rect matTag nY nZ yI zI yJ zJ`, `layer straight matTag nBars area yStart zStart yEnd zEnd`); `SectionAggregator(section_id, pairings[{material_id, dof∈P,Mz,My,Vy,Vz,T}])`. Armatura = `StraightLayer{material_id, n_bars, bar_area, y_start…}`: **coordinate di fibra, non Ø/copriferro/staffe**. Esempio `rc_frame_pushover.osmodel` sez. `RC-Col`: 5 patch (core + 4 cover) + 3 layer da `bar_area 0.6` (in²) — l'ingegnere deve calcolare a mano posizione barre e copriferro. Nessun concetto di staffa, passo, `Ø`, `c`, quindi niente da cui derivare `V_Rd` o duttilità per NTC.

**Materiali** [V `materials/__init__.py`]: `ElasticIsotropic`, `Elastic`, `Steel01`, `Steel02`, `Concrete01`, `Concrete02`, `ElasticPP`, `Hysteretic` — tutti parametri OpenSees (`fpc<0`, `epsc0<0`…). **Nessun `f_ck`/`f_yk`/classe/γ**: materiale = legame costitutivo, non materiale di norma.

**Carichi** [V `loads/__init__.py`]: `TimeSeries{Linear,Constant,Path}`, `ResponseSpectrum(periods[], accelerations[], damping_ratio)`, `PlainLoadPattern(time_series_id, nodal_loads[{node_id, forces(6)}], element_loads[{element_id, wy,wz,wx}])`, `UniformExcitationPattern`. Pattern = «caso di carico» OpenSees: **nessuna natura (G/Q/E)**, **nessuna combinazione con coefficienti**, nessun inviluppo (grep `combination|envelope` su `core/` → solo commenti su envelope isteretico, [M]). L'esempio `rc_frame_pushover` fa gravità + laterale come due pattern con `StaticCase{pattern_ids:[1], n_steps:10, load_factor_increment:0.1}` e `PushoverCase{control_node, control_dof, target_disp, step_size, base_nodes, preload_case_ids}`.

**Analisi** [V `analysis/__init__.py`]: `Static`, `Modal(n_modes, solver)`, `Transient(dt, n_steps, rayleigh…, preload_case_ids, remove_patterns)`, `Pushover`, `ResponseSpectrum(modal_case_id, spectrum_id, direction, combination SRSS|CQC)`. Parametri solutore (`system`, `constraints`, `integrator`, `algorithm`, `test`) sono **stringhe libere** nel modello.

**Risultati** [V `services/results.py:1-13`]: «plain dataclasses with NumPy arrays — Pydantic is intentionally avoided here because results are produced in bulk, never validated, and never persisted as JSON». `StaticResults{case_id, node_disp{nid→(n_steps,ndf)}, node_reaction, element_forces{eid→(n_steps,ncomp)}}`; `ModalResults{eigenvalues, mode_shapes{mode→nid→vec}}`; `ResponseSpectrumResults`: «All values are PEAK responses (positive by definition — SRSS/CQC sign is lost in the combination)» (`results.py:150-158`) — `combined_disp` solo spostamenti, **niente sollecitazioni combinate**. HDF5 layout: `time`, `nodes/{nid}/{kind}`, `elements/{eid}/forces` (`opensees_runner.py:1110-1128`), un file `case_{id}.h5` per caso. Risultati **per caso/analisi**, mai per combinazione.

**Unità** [V `units.py`]: enum di 4 sistemi coerenti (`SI (m, N, kg, s, Pa)`, `SI (mm, N, t, s, MPa)`, `US ft-kip`, `US in-kip`) — solo etichetta, «We don't auto-convert».

**Giudizio.** Buono: core puro senza Qt/solutore; `extra="forbid"`; ID = tag; union discriminate; `schema_version`; JSON diffabile (esempi 3-165 KB, `wc -c examples/*.osmodel` [M]); separazione modello (JSON) / risultati (HDF5). Manca per NTC: rilasci d'asta, diaframma, natura del carico, combinazioni, inviluppi, armatura in termini costruttivi (Ø/c/staffe), materiale di norma (fck/γ), sollecitazioni per combinazione modale, norma, verifiche (roadmap: «Code-checking (TBDY-2018, ASCE 41, Eurocode 8)» ancora ✂️, `docs/roadmap.md:128`). Un elemento fibra e uno elastico non condividono una «sezione geometrica»: la `FiberSection` non sa di essere 30×50.

## 2. awatif

**Modello** [V `components/data-model.ts`]: due livelli.
- `Geometry` (autoriale): `points: State<Map<number,[x,y,z]>>`, `lines: State<Map<number,[p1,p2]>>`, `polygons`, `selection`, `designs`. ID numerici, Map.
- `Mesh` (derivato): `nodes: number[][]`, `elements: number[][]` (indici posizionali), `geometryMapping{pointToNodes, lineToElements, polygonToElements}`, `supports: Map<nodeIdx,[6 bool]>`, `loads: Map<nodeIdx,[Fx,Fy,Fz,Mx,My,Mz]>`, `releases: Map<elemIdx,[My_start,Mz_start,My_end,Mz_end]>`, `elementsProps: Map<elemIdx,{elasticity,area,momentInertiaZ,momentInertiaY,shearModulus,torsionalConstant,thickness?,poissonRatio?}>`, risultati `positions`, `displacements`, `reactions`, `internalForces: Map<elemIdx,{N,Vy,Vz,Mx,My,Mz: [start,end]}>` con convenzione «sagging is negative».
- `Components` = `State<Map<ComponentsType, ComponentEntry[]>>`, `ComponentEntry{id?, name, templateId, geometry: number[] (id di point/line), params, loadCase?}`. Vincoli, carichi, rilasci, sezioni **non stanno sul nodo/asta**: sono componenti che referenziano geometria per ID e vengono «compilati» nella mesh (`main.ts:214-262`).

**Casi e combinazioni** [V `components/loads/data-model.ts:5-25`]:
```ts
export type LoadCase = "dead" | "live" | "wind";
export type LoadCombination = "uls-live" | "uls-wind";
export const ULS_COMBINATIONS = { "uls-live": { dead: 1.35, live: 1.5, wind: 0.9 }, "uls-wind": { dead: 1.35, live: 1.05, wind: 1.5 } };
```
Hardcoded, tre nature, due combinazioni; `getLoads` fattorizza i carichi **a monte del solutore** e risolve una combinazione alla volta (`getLoads.ts:31-62`). Nessun inviluppo. Nessuna massa/sismica. Unità: commento in testa a `main.ts:1-2` «Positions are in meters and forces are in Kilo-Newton, everything else propogate».

**Sezioni/materiali/verifiche**: nessuna entità «sezione»/«materiale»: `DesignTemplate.getElementsProps(params)` produce `ElementProps` (E, A, I…) e `getDesign(lineElementForces, length, …)` la verifica; `concrete-member/nationalAnnexes.ts` porta `γC, γS, αcc, CRd,c, vmin, k1` per `EN 1992-1-1` e annex NL. Armatura = parametri del template, non dato del modello.

**Reattività** [V `main.ts:196-343`]: un solo `van.derive(async …)` che legge `geometry.*.val` + `components.val` + `display.loadCase.val` e ricalcola mesh→carichi→vincoli→rilasci→props→solve (WASM lineare o remoto non lineare) → scrive `mesh.*.val`. Token `latestAnalysis` scarta risultati stantii. Nessuno store, nessun comando: **ogni modifica = riesecuzione integrale dell'analisi**.

**Undo** [V `ui/undo/setupUndo.ts`]: snapshot completo (`points`, `lines`, `polygons`, `structuredClone(components)`), `HISTORY_LIMIT=50`, coalescenza 150 ms via `van.derive`, `Cmd/Ctrl+Z` fa `history.pop()` e riassegna gli stati; **nessun redo**; punti non «committed» esclusi dallo snapshot.

**Viewport** [V `ui/viewer/getViewer.ts`]: riceve `geometry/mesh/components/display` (State) e monta sottoscene (`getGeometry`, `getMesh`, `getLoads`, `getLineResults`…) ognuna con `van.derive` che ridisegna; il viewer **scrive** su `geometry.points.val` durante drag/append (`getGeometry.ts:89-471`), quindi la separazione modello/viewport è netta per i risultati e la mesh, non per l'editing geometrico.

## 3. SAF 2.2

Formato: **workbook `.xlsx`**, un foglio per entità, colonne = proprietà, riferimenti fra fogli **per `Name`** (stringa unica leggibile), `Id` UUID opzionale («Filling the cells with ID is not mandatory», `getting-started/introduction.md:151-153`). Fogli `Project` e `Model` trasposti; `Model` contiene `SAF Version`, `Global coordinate system ∈ {X|Y|Z vertical, minus …}`, `LCS of cross-section`, `System of units ∈ {Metric, Imperial}`, `National code` (include `EC-UNI-EN (Italian NA)`), `Ignored objects` [V `project-and-model-specifications/README.md`]. Unità **fisse** per sistema: kN, kNm, MPa, m (grandi), mm (piccole), kg/m³, deg [V `annexes/units.md`]. Versione 2.2.0 = 28.11.2022; repo doc fermo al 13.04.2023 [M].

| entità | campi (trascritti) | note |
|---|---|---|
| `StructuralMaterial` | `Name*`, `Type* ∈ {Concrete, Steel, Timber, Aluminium, Masonry, Other}`, `Subtype`, `Quality*` (es. `C25/30`), `Unit mass [kg/m3]`, `E modulus [MPa]`, `G modulus [MPa]`, `Poisson Coefficient`, `Thermal expansion [1/K]`, `Design properties` («label\|value; …», annex con Rt per sismica), `Id` | materiale di norma per grado; nessun legame costitutivo |
| `StructuralCrossSection` | `Name*`, `Material*` (più materiali «;»), `Cross-section type* ∈ {Parametric, Manufactured, Compound, General}`, `Shape`, `Parameters [mm]`, `Profile`, `Form code`, `Description ID of the profile`, `A [m2]`, `Iy`, `Iz`, `It`, `Iw [m6]`, `Wply`, `Wplz`, `Id` | shape parametrico (Rectangle, T…) + proprietà; **armatura assente** [NON TROVATO: grep `reinforc|rebar` su tutta la doc → solo `Subtype` «fiber-reinforced»] |
| `StructuralPointConnection` | `Name*`, `Coordinate X/Y/Z [m]*`, `Id` | nodo puro; massa assente |
| `StructuralCurveMember` | `Name*`, `Type` (General/Beam/Column/…), `Cross section*`, `Arbitrary definition`, `Nodes*` (sequenza), `Segments*`, `Internal nodes`, `Length`, `Geometrical shape`, `LCS* ∈ {y by vector, z by vector, y by point, z by point}`, `LCS Rotation [deg]*`, `Coordinate X/Y/Z*` (del vettore/punto), `System line* ∈ {Centre, Top, Bottom, Left, Right, …}`, `Structural/Analysis Y/Z Eccentricity Beg/End [mm]` (analysis «DO affects internal forces»), `Behaviour in analysis* ∈ {Standard, Axial force only, Compression only, Tension only}`, `Layer`, `Color`, `Parent ID`, `Id` | LCS: x = asse membro start→end, secondo asse da vettore/punto, terzo con mano destra; vettore non perpendicolare viene proiettato (`introduction.md` §LCS) |
| `RelConnectsStructuralMember` (hinge) | `Name*`, `Member*`, `Position* ∈ {Begin, End, Both}`, `ux/uy/uz/fix/fiy/fiz* ∈ {Free, Rigid, Flexible}`, `Stiffness X/Y/Z [MN/m]`, `Stiffness Fix/Fiy/Fiz [MNm/rad]`, `Parent ID`, `Id` | rilascio = entità separata, assi locali del membro |
| `StructuralPointSupport` | `Name*`, `Type ∈ {Fixed, Hinged, Sliding, Custom}` (informativo), `Boundary condition* ∈ {In node, On beam}`, `Node`/`Member`, `Coordinate system`, `Origin`, `Coordinate definition`, `Position x`, `ux/uy/uz ∈ {Free, Rigid, Flexible, Compression only, Tension only, Flexible compression only, Flexible tension only, Non linear}`, `fix/fiy/fiz ∈ {Free, Rigid, Flexible, Non linear}`, `Stiffness …`, `Id` | vincolo = entità separata dal nodo |
| `RelConnectsRigidLink` | `Name`, `Nodes` («N3; N4»), `Hinge position`, `ux…fiz`, `Stiffness`, `Resistance` | link rigido fra nodi; **nessun diaframma di piano**; `StructuralStorey{Name, Height level [m], Id}` esiste ma è solo quota |
| `StructuralLoadGroup` | `Name*`, `Load group type* ∈ {Permanent, Variable, Accidental, Seismic, Moving, Tensioning, Fire}`, `Relation* ∈ {Exclusive, Standard, Together}`, `Load type` (es. Domestic) | natura di norma vive qui |
| `StructuralLoadCase` | `Name*`, `Description`, `Action type* ∈ {Permanent, Variable, Accidental}`, `Load group*`, `Load type*` (Permanent: Self weight/Others/Prestress/Standard; Variable/Accidental: Others/Dynamic/Static/Temperature/Wind/Snow/Maintenance/Fire/Moving/**Seismic**/Standard), `Duration ∈ {Long, Medium, Short, Instantaneous}`, `Id` | «Individual loads are not defined freely. They must be included in load cases» |
| `StructuralLoadCombination` | `Name*`, `Description`, `Category* ∈ {ULS, SLS, ALS, According national standard, Not defined}`, `National standard ∈ {EN-ULS (STR/GEO) Set B/C, EN-Accidental 1/2, EN-Seismic, EN-SLS Characteristic/Frequent/Quasi-permanent, IBC-…}`, `Type ∈ {Envelope, Linear, Nonlinear}`, `Load factor #`, `Multiplier #`, `Load case name #` (# = 1..99 colonne orizzontali), `Id` | coefficiente esplicito **oppure** «According national standard» → coefficienti dedotti dal ricevente. NTC non è un valore dell'enum: passa per `EC-UNI-EN` nel `Model` |
| `StructuralCurveAction` | `Name*`, `Type`, `Load case*`, `Force action* ∈ {On beam, On edge, …}`, `Member`, `Direction* ∈ {X, Y, Z, Vector}`, `Value 1/2 [kN/m]`, `Vector 1/2`, `Distribution* ∈ {Uniform, Trapez}`, `Start/End point`, `Coordinate definition* ∈ {Absolute, Relative}`, `Origin*`, `Extent*`, `Coordinate system* ∈ {Global, Local}`, `Location* ∈ {Length, Projection}`, `Eccentricity ey/ez [mm]`, `Parent ID`, `Id` | carico = entità che referenzia caso + membro |
| `ResultInternalForce1D` | `Result on* ∈ {On beam, On rib}`, `Member*`, `Result for* ∈ {Load case, Load combination}`, `Load case` / `Load combination`, `Combination key` («1.35*LC1+1.5*LC2+…» — «Allows to define exact combination per result section»), `Section at [m]*`, `Index*` (≥1 crescente start→end; **due righe con stesso `Section at` e index diverso = discontinuità sinistra/destra**), `N, Vy, Vz [kN]*`, `Mx, My, Mz [kNm]*` | «Result in member axis (not in principal axis)»; **nessuna colonna min/max**: inviluppo = combinazione `Type=Envelope` + `Combination key` che dice quale permutazione ha generato il valore; segni [NON TROVATO] nella spec |

**Cosa manca in SAF** [V, cartella `results/` contiene solo `resultinternalforce1d.md` e `resultinternalforce2dedge.md`]: spostamenti nodali, reazioni, modi/frequenze, massa nodale, diaframma, armature, verifiche. Grep `seismic|mass|eigen|modal` → solo `Load type = Seismic` e `Unit mass`. È un formato di **modello analitico + sollecitazioni**, pensato per lo scambio FEM↔FEM; l'armatura è fuori scope per definizione.

## 4. PyNite 3.0.0 / pynite-tools 0.7.0 / Speckle

**PyNite** [V `Pynite/Node3D.py:28-80`, `Member3D.py:37-110`, `LoadCombo.py:8-27`, `FEModel3D.py`]: chiavi = **`name: str` scelto dall'utente**, `ID: int|None` assegnato dal programma all'analisi. Nodo: `X,Y,Z`, `NodeLoads: [(Direction, P, case)]`, `support_DX…RZ: bool`, `spring_DX…: [stiffness, direction, active]`, `EnforcedDX…`, risultati **`DX: Dict[combo_name, float]`** … `RxnMZ` (dict per combinazione). Membro: `i_node, j_node, material_name, section_name, rotation (deg), tension_only, comp_only, PtLoads[(Direction,P,x,case)], DistLoads[(Direction,w1,w2,x1,x2,case,self_weight)], Releases: [12 bool]` (DOF ordine `fxi fyi fzi mxi myi mzi fxj…`), `active: Dict[combo, bool]`. `PhysMember` = membro fisico che suddivide in `Member3D` ai nodi intermedi (`PhysMember.py:17-37`). `Material(name, E, G, nu, rho, fy)`, `Section(name, A, Iy, Iz, J)`, `SteelSection(+Zy, Zz, material_name)`. `LoadCombo(name, combo_tags: list[str], factors: {case: γ})`; caso di carico = **stringa libera** (`'Case 1'` default), esiste solo come chiave in `factors` (`FEModel3D.load_cases` le enumera dai carichi, `FEModel3D.py:170`). Se nessuna combo: creata `'Combo 1' = {'Case 1': 1.0}` (`Analysis.py:42`). **Risultati esistono solo per combinazione, mai per caso singolo** — un caso singolo = combo con fattore 1. Tag combo (`strength`/`serviceability`) filtrano `analyze(combo_tags=…)`. Nessuna natura del carico, nessuna norma, nessun diaframma, nessuna massa (no modale), nessuna armatura.

**pynite-tools `serialize`** [M, `pynite_tools/serialize.py:117-345` + dump eseguito]: Pydantic `*Schema` speculari alle classi (`Node3DSchema`, `MaterialSchema`, `SectionSchema`, `Member3DSchema`, `PhysMemberSchema(sub_members)`, `Spring3DSchema`, `LoadComboSchema`, `FEModel3DSchema{nodes, materials, sections, springs, members, quads, plates, meshes, load_combos}` come `dict[name → obj]`). **Denormalizzato**: `members.C1.i_node` e `.j_node` contengono il **nodo intero duplicato** (con vincoli, molle, carichi), `material` e `section` idem; 1 nodo + 1 asta = 5.268 byte [M]. Nessuna versione di schema nel JSON, nessuna unità; `combos.py` fa bulk-add `[{name, factors}]`; `envelope.py` = `envelope_tree(tree, levels, leaf, agg_func ∈ {absmax, absmin, max, min}, with_trace=True)` — inviluppo generico post-hoc su dict annidati, con traccia di quale combo ha vinto.

**Speckle `Objects.Structural`** [V raw main `e4bb61d`]:
- `Node{name, basePoint: Point, constraintAxis: Axis, restraint: Restraint, springProperty, massProperty: PropertyMass, damperProperty, units}`; `Restraint{code: "FFFRRR" (F/R/K per 6 DOF), stiffnessX…ZZ}` — vincolo come codice stringa.
- `Element1D{name, baseLine, property: Property1D, type: ElementType1D, end1Releases: Restraint, end2Releases: Restraint, end1Offset, end2Offset, orientationNode, orientationAngle, localAxis: Plane, parent, end1Node, end2Node, topology: List<Node>, units, displayValue}` — commento nel sorgente: «add unique id as base identifier, name can change too easily».
- `Property1D{memberType, material: StructuralMaterial, profile: SectionProfile, referencePoint, offsetY, offsetZ}`; `SectionProfile{name, shapeType, area, Iyy, Izz, J, Ky, Kz, weight}` + `Rectangular{depth, width, webThickness, flangeThickness}`, `Circular`… — **bug nel costruttore**: `this.Iyy = Izz;` (`SectionProfile.cs`, [V]).
- `StructuralMaterial{name, materialType, grade, designCode, codeYear, strength, elasticModulus, poissonsRatio, shearModulus, density, thermalExpansivity, dampingRatio, materialSafetyFactor}`; `Concrete : StructuralMaterial{compressiveStrength, tensileStrength, flexuralStrength, maxCompressiveStrain, maxTensileStrain, maxAggregateSize, lightweight}`; `CSIRebar : StructuralMaterial {}` vuota.
- `LoadCase{name, loadType ∈ {Dead, SuperDead, Soil, Live, LiveRoof, ReducibleLive, Wind, Snow, Rain, Thermal, Notional, Prestress, Equivalent, Accidental, SeismicRSA, SeismicAccTorsion, SeismicStatic, Other}, group, actionType ∈ {Permanent, Variable, Accidental}, description}`; `LoadCombination{name, loadCases: List<Base>, loadFactors: List<double>, combinationType ∈ {LinearAdd, Envelope, AbsoluteAdd, SRSS, RangeAdd}}`; `LoadNode{loadCase, nodes, loadAxis, direction, value}`.
- `Result{resultCase: LoadCase|LoadCombination, permutation: string («for enveloped cases?»), description}`; `Result1D{element, position, dispX..rotZZ, forceX..momentZZ, axialStress…combinedStressMin}` per **caso o combinazione** (due costruttori); `ResultNode{disp, reaction, constraint, vel, acc ×6}`; `ResultGlobal{load×6, reaction×6, mode, frequency, loadFactor, modalStiffness, modalGeoStiffness, effMassX…ZZ}`.
- `Model{specs: ModelInfo{…, settings: ModelSettings{modelUnits: ModelUnits{length, sections, displacements, stress, force, mass, time…}, steelCode, concreteCode, coincidenceTolerance}}, nodes, elements, loads, restraints, properties, materials, layerDescription}`. Diaframma solo nel kit CSI: `CSIDiaphragm{name, SemiRigid}`. Armatura: `CSIRebar` vuota, `CSIConcrete`; nessuna barra collocata. Unità: stringa per grandezza, non sistema coerente.

## 5. `printModel('-JSON')` — misurato

Comando eseguito su openseespy 3.8.0, Python 3.14.7, ndm 2 / ndf 3, 3 nodi, `fix`, `mass`, `Concrete01`, `Steel01`, `section Fiber` con `patch rect` + `layer straight`, `section Elastic`, `geomTransf Linear`, `forceBeamColumn` Lobatto 5, `elasticBeamColumn`, `timeSeries`, `pattern`, `load`, `eleLoad`. Output 2.067 byte, `json.load` valido [M]:

```json
{
"StructuralAnalysisModel": {
	"BIM": "unknown",
	"description": "",
	"engineer": "",
	"units": { "force": "", "length": "", "time": "", "temperature": "" },
	"properties": {
		"uniaxialMaterials": [
			{"name": "1", "type": "Concrete01", "Ec": 2.5e+10, "fc": -2.5e+07, "epsc": -0.002, "fcu": -2e+07, "epscu": -0.0035},
			{"name": "2", "type": "Steel01", "E": 2e+11, "fy": 4.5e+08, "b": 0.01, "a1": 0, "a2": 55, "a3": 0, "a4": 55}
		],
		"ndMaterials": [ ],
		"sections": [
			{"name": "1", "type": "FiberSection2d", "fibers": [
				{"coord": [-0.135, 0.0], "area": 0.009, "material": "1"},
				…
				{"coord": [-0.11, 0.0], "area": 0.000201, "material": "2"}
			]},
			{"name": "2", "type": "ElasticSection2d", "E": 3e+10, "A": 0.09, "Iz": 0.000675}
		],
		"crdTransformations": [ {"name": "1", "type": "LinearCrdTransf2d"} ]
	},
	"geometry": {
		"nodes": [
			{"name": 1, "ndf": 3, "crd": [0, 0]},
			{"name": 2, "ndf": 3, "crd": [0, 3]},
			{"name": 3, "ndf": 3, "crd": [4, 3], "mass": [10, 10, 0]}
		],
		"elements": [
			{"name": 1, "type": "ForceBeamColumn2d", "nodes": [1, 2], "sections": ["1", "1", "1", "1", "1"], "integration": {"type": "Lobatto"}, "massperlength": 0, "crdTransformation": "1"},
			{"name": 2, "type": "ElasticBeam2d", "nodes": [2, 3], "E": 3e+10, "A": 0.09, "Iz": 0.000675, "massperlength": 0, "release": 0, "crdTransformation": "1"}
		]
	}
}
}
```
Variante 3D (con `rigidDiaphragm`, `equalDOF`, `-GJ`, `PDelta`): `FiberSection3d{torsion: 1e9, fibers[{coord:[y,z]}]}`, `PDeltaCrdTransf3d{vecInLocXZPlane:[0,1,0]}`, `ElasticBeam3d{E,G,A,Jx,Iy,Iz,releasez,releasey}` [M].

**Cosa manca nel dump** (grep `fix|pattern|load|timeSeries|constraint|Diaphragm|equalDOF` → 0 occorrenze in entrambi i file [M]): **vincoli, MP constraints, diaframmi, carichi, pattern, serie temporali**. La sezione a fibre è già **esplosa in fibre**: patch e layer non tornano indietro; il tag materiale è stringa nelle proprietà (`"name": "1"`) ma intero nei nodi/elementi (`"name": 1`). Unità vuote. Leggibile come **dump diagnostico** di ciò che il dominio ha ricevuto (utile per test «il modello inviato è quello previsto»), **non** come formato di modello: non round-trip, non versione. Firma doc: `printModel('-JSON', '-file', filename, '-node', '-flag', flag, *nodes, *eles)` (openseespydoc), nessuna descrizione del contenuto JSON [V].

## 6. Tabella comparata entità × formato

Legenda: **P** presente · **∅** assente · **~** parziale.

| entità | opensees-studio `.osmodel` | awatif | SAF 2.2 | PyNite / pynite-tools | Speckle Structural | `printModel -JSON` |
|---|---|---|---|---|---|---|
| nodo | P `Node{id,coords,mass,restraint}` | P `points Map<id,[x,y,z]>` + `nodes` mesh posizionali | P `StructuralPointConnection{Name,X,Y,Z,Id}` | P `Node3D{name,X,Y,Z,…}` | P `Node{basePoint,restraint,mass…}` | P `{name,ndf,crd,mass?}` |
| asta | P 9 tipi OpenSees, `section_id` | ~ `lines Map<id,[p1,p2]>`, props via template design | P `StructuralCurveMember` (LCS, system line, eccentricità, comportamento) | P `Member3D`/`PhysMember{i,j,material,section,rotation}` | P `Element1D{baseLine,property,releases,offsets,localAxis}` | P per tipo OpenSees (sezioni/transf per tag) |
| rilascio | ∅ (solo `ZeroLength`/`BeamWithHinges`) | P `releases [My_s,Mz_s,My_e,Mz_e]` | P `RelConnectsStructuralMember` Free/Rigid/Flexible ×6 | P `Releases [12 bool]` | P `end1Releases/end2Releases: Restraint` | ~ `release`/`releasez,releasey` solo su ElasticBeam |
| sezione | P `Elastic`/`Fiber(patch,layer,fibre)`/`Aggregator` — costitutiva, non geometrica | ∅ entità; `ElementProps{E,A,Iz,Iy,G,J}` da template | P `StructuralCrossSection` shape parametrico + A,Iy,Iz,It,Iw,Wpl | P `Section{A,Iy,Iz,J}`, `SteelSection(+Z)` | P `Property1D{profile: SectionProfile(Rectangular…), material}` | P fibre esplose o `ElasticSection` |
| materiale | P legami OpenSees (`Concrete01`…), no fck | ∅ (E nel template) | P `StructuralMaterial{Type,Quality "C25/30",E,G,ν,ρ,Design properties}` | P `Material{E,G,nu,rho,fy}` | P `StructuralMaterial{grade,designCode,codeYear,…}` + `Concrete{fck,fctm,εcu…}` | P parametri costitutivi |
| armatura | ~ `StraightLayer{n_bars,bar_area,y/z}` fibre, no Ø/c/staffe | ~ parametro del template `concrete-member` | ∅ | ∅ | ~ `CSIRebar` vuota | ~ fibre acciaio indistinte |
| vincolo | P sul nodo, 6 bool | P `supports Map<node,[6 bool]>` via componente | P `StructuralPointSupport` Free/Rigid/Flexible/Compression only…, molle | P `support_*` bool + `spring_*` + `Enforced*` | P `Restraint code "FFFRRR"` + stiffness | ∅ |
| diaframma | ∅ (solo `EqualDOF`) | ∅ | ∅ (`RelConnectsRigidLink` fra nodi, `StructuralStorey` quota) | ∅ | ~ `CSIDiaphragm{SemiRigid}` (kit CSI) | ∅ |
| massa | P `Node.mass[6]` + `rho` elemento | ∅ | ∅ | ∅ | P `PropertyMass` | P `mass` nodale, `massperlength` |
| caso di carico | ~ `LoadPattern` + `TimeSeries` (semantica OpenSees) | P enum `dead|live|wind` hardcoded | P `StructuralLoadCase{Action type, Load type, Duration, Load group}` | ~ stringa libera in `factors`/carichi | P `LoadCase{loadType, actionType, group}` | ∅ |
| natura (G/Q/E) | ∅ | ~ 3 valori | P `Action type` + `Load type` (incl. Seismic) + `Load group{Relation}` | ∅ | P enum 19 `LoadType` + `ActionType` | ∅ |
| combinazione con coeff. | ∅ | ~ 2 hardcoded `{dead:1.35,…}` | P `StructuralLoadCombination{Category ULS/SLS/ALS, National standard, Type Linear/Envelope/Nonlinear, factor#, multiplier#, case#}` | P `LoadCombo{name, combo_tags, factors}` | P `LoadCombination{loadCases[], loadFactors[], combinationType}` | ∅ |
| risultato per caso / combinazione | ~ per **caso di analisi** (HDF5 + dataclass) | ~ una combinazione attiva alla volta, in memoria | P `ResultInternalForce1D{Result for ∈ case/combination, Combination key}` solo N,V,M | ~ solo per **combinazione** (`DX[combo]`) | P `Result1D/ResultNode/ResultGlobal` per caso o combinazione | ∅ |
| inviluppo | ∅ (RS: picchi senza segno, solo spostamenti) | ∅ | ~ `Type=Envelope` + `Combination key` che ricostruisce la permutazione | ~ `pynite_tools.envelope_tree(absmax…, with_trace)` post-hoc | ~ `CombinationType.Envelope` + `Result.permutation` | ∅ |
| norma di riferimento | ∅ | ~ `nationalAnnexes` EN 1992 / NL nel template | P `Model.National code` (es. `EC-UNI-EN`), `Combination.National standard` | ∅ | ~ `ModelSettings.steelCode/concreteCode` stringhe, `Material.designCode/codeYear` | ∅ |
| versione schema | P `schema_version: 1` (+ migrazione `grid_system`) | ∅ | P `Model.SAF Version` | ∅ | ~ versione libreria Speckle, nessun campo | ∅ |
| unità | P enum 4 sistemi coerenti, etichette | ~ commento «m, kN» | P `System of units ∈ {Metric, Imperial}`, unità fisse per colonna | ∅ | P `ModelUnits` per grandezza + `units` per oggetto | ~ campi vuoti |
| ID | int per tipo = tag OpenSees | int per tipo (Map) + indici posizionali di mesh | `Name` stringa unica + `Id` UUID opzionale | `name` stringa + `ID` int da programma | `id` hash Speckle + `applicationId` + `name` | tag |

## 7. Lezioni per il nuovo modello dati [INF]

1. **ID stabili e per-tipo, separati dal tag OpenSees.** opensees-studio fonde `id` e tag: comodo ma vincola l'app alla numerazione del solutore (un `PhysMember` suddiviso in N elementi non ha posto). PyNite ha già `name` (utente) + `ID` (programma); SAF `Name` + `Id` UUID; Speckle avverte «name can change too easily». → ID interno immutabile (UUID o int monotono mai riusato), `name` editabile, tag OpenSees **derivato** alla generazione del deck e salvato nella mappa tag↔id dentro il risultato.
2. **Asta fisica ≠ elemento finito.** PyNite `PhysMember→Member3D`, awatif `line→lineToElements`, SAF `Internal nodes` + `Parent ID`, MeshRec «una fetta = un'asta» (`05-*.md` §4). Chi non lo prevede (opensees-studio) non può avere «il diagramma di M sulla trave» ma solo per elemento.
3. **Separazione netta modello / risultati.** opensees-studio: JSON per il modello, HDF5 + dataclass per i risultati «never validated, never persisted as JSON». PyNite mescola (`Node3D.DX[combo]` dentro il nodo, poi finisce nel JSON di pynite-tools solo perché escluso). MeshRec `.vtu` a valle (`05-*.md` §3). → risultati in file separato, chiave `(id_run, caso|combinazione, entità, stazione)`, modello mai sporcato.
4. **Risultato per combinazione dal giorno 1, con tre forme.** SAF distingue `Result for ∈ {Load case, Load combination}` + `Combination key`; Speckle `Result.permutation`; PyNite risolve solo combinazioni. Servono: (a) per caso (lineare, con segno), (b) per combinazione lineare (somma pesata, con segno), (c) per combinazione modale CQC/SRSS — **senza segno**, opensees-studio lo scrive esplicitamente («sign is lost»), `06-*.md` domanda 6 lo chiede. Un solo campo `float` con segno non basta: serve `{valore, segno_definito: bool}` o coppia `(min, max)` per stazione, più «Combination key» per dire da dove viene.
5. **Inviluppo = risultato con provenienza.** SAF `Combination key`, pynite `envelope_tree(with_trace=True)`, Speckle `permutation`: tutti e tre conservano *quale* permutazione ha dato il massimo. Senza traccia l'inviluppo non è ripercorribile (`07`: «combinazioni generate e ripercorribili»).
6. **Verdetto ≠ numero.** Nessuno dei sei formati ha un'entità «verifica». MeshRec aveva `{applicabile, passato, ragione}` con «non applicabile ≠ non passato» (`05-*.md` §3). → entità `Verdetto{controllo, oggetto, stazione?, combinazione?, applicabile, esito, ragione, articolo_norma, valori}` separata da modello e da risultati grezzi.
7. **Natura del carico e norma sono dato, non commento.** SAF (`Action type`, `Load type`, `Load group{Relation}`, `Category`, `National standard`) e Speckle (`LoadType`, `ActionType`) le hanno; opensees-studio e PyNite no → combinazioni NTC impossibili da generare automaticamente (C4 di `04`). awatif hardcoda 3 nature e 2 combinazioni: da non copiare.
8. **Sezione geometrica + armatura costruttiva come sorgente, fibre come derivata.** opensees-studio salva le fibre (`patch`/`layer`) e perde b×h, Ø, copriferro, staffe; `printModel` perde persino i patch. SAF/Speckle hanno la forma parametrica ma zero armatura. → `Sezione{b,h,…}` + `Armatura{barre[{Ø, y, z}], staffe{Ø, passo, bracci}, copriferro}` → generatore `patch/layer` deterministico (MeshRec `armatura.colloca` già lo fa, `05-*.md` §4).
9. **Materiale di norma ≠ legame costitutivo.** SAF `Quality "C25/30"` + `Design properties`; Speckle `Concrete{compressiveStrength, designCode, codeYear}`; opensees-studio solo `Concrete01{fpc,epsc0…}`. → `Materiale{classe, fck, fyk, γ, Ecm}` → derivazione dei parametri `Concrete02/Steel02` esplicita e testabile (casella «veste delle resistenze» non decisa in `05`).
10. **Vincoli, rilasci, diaframmi come entità o attributi?** Attributo del nodo (opensees-studio, PyNite) = semplice, ma non riusabile e non parlante nel viewport; entità (SAF, awatif componenti) = referenzia per ID, può avere nome e molla. Diaframma manca ovunque tranne CSI: va disegnato in casa (`rigidDiaphragm` + nodo master con massa di piano).
11. **`extra="forbid"` + `schema_version` + migrazioni in-loader** (opensees-studio) sono il minimo; SAF mette la versione nel file. PyNite-tools senza versione e con nodi duplicati inline: non round-trip sicuro.
12. **Unità: sistema coerente dichiarato, nessuna conversione** (opensees-studio, SAF). OpenSees non converte; SAF fissa kN/m/MPa/mm. → un solo sistema interno (SI: N, m, Pa, oppure kN, m, MPa come SAF/MeshRec) dichiarato nel file, conversioni solo in UI.
13. **`printModel -JSON` non è un formato**: niente vincoli, carichi, pattern, MP, unità; fibre esplose. Vale come oracolo di test (nodi/elementi/sezioni ricevuti dal dominio) e per il C1 Check Model, non come persistenza.
14. **Reattività (awatif)**: un derive che rianalizza tutto è accettabile solo con solutore WASM lineare in-process; con OpenSees fuori processo (`01`, `03`, `05`) serve invalidazione esplicita («risultati stantii» come stato visibile, `07`) e comandi con inverse patch, non snapshot senza redo.

## Domande aperte per il brainstorming

1. ID: UUID (SAF/Speckle) o int monotono mai riusato (più leggibile nel deck e nei diff)? Tag OpenSees derivato o coincidente (opensees-studio)?
2. Asta fisica → elementi: suddivisione automatica ai nodi intermedi (PyNite) o dichiarata («fette» di MeshRec)?
3. Risultati per combinazione modale: campo `(min,max)` per stazione o `{valore, segno_definito}`? Chi conserva la `Combination key`?
4. Vincolo/rilascio/diaframma: attributo o entità nominata?
5. Armatura: modello costruttivo (Ø/c/staffe) come sorgente unica, con fibre derivate — confermare; interferro/aggregati (`dg`, `05-*.md` §4) nel materiale?
6. SAF come import/export di v1 (`06` raccomanda lettura+scrittura): accettare la perdita di armature, masse, vincoli-molla non lineari e risultati nodali?
7. Unità interne: SI base (N, m, Pa: opensees-studio SI_M_N) o kN/m/MPa (SAF, MeshRec)?

## Raccomandazioni (non decisioni)

- **R1** — Modello dati proprio in tre file/schemi distinti con `schema_version`: `modello` (nodi, aste fisiche, sezioni+armatura costruttiva, materiali di norma, vincoli/rilasci/diaframmi come entità, casi con natura, combinazioni con coefficienti e categoria), `risultati` (per run, per caso/combinazione, con `Combination key`, con segno esplicito o min/max), `verdetti` (`applicabile/esito/ragione/articolo`). Nessuno dei sei formati letti copre i tre insieme.
- **R2** — Prendere da opensees-studio la forma tecnica (Pydantic v2, `extra="forbid"`, union discriminate su `type`, `validate_references`, `schema_version`), **non** il contenuto (entità OpenSees-centriche, niente combinazioni/rilasci/diaframma). AGPL: leggere sì, copiare codice no se la licenza del progetto non è AGPL (domanda 9 di README).
- **R3** — Prendere da SAF il vocabolario delle nature/categorie (`Action type`, `Load type`, `Category ULS/SLS/ALS`, `Relation Exclusive/Standard/Together`) e la coppia `Name`+`Id`: rende l'export SAF quasi meccanico e i nomi già familiari a chi usa MasterSap/SCIA.
- **R4** — Generare `patch`/`layer` dall'armatura costruttiva (MeshRec `armatura.colloca`), mai salvarli: il `.osmodel` mostra cosa succede quando si salva l'esploso.
- **R5** — Usare `printModel('-JSON')` solo come oracolo di test del deck generato (nodi/elementi/sezioni/transf), sapendo che vincoli e carichi non compaiono e vanno verificati altrimenti.
- **R6** — Per undo: comandi con inverse patch (Immer patches, `03-*.md` §3), non snapshot; awatif mostra il limite (50 snapshot, niente redo, rianalisi integrale a ogni cambio).

## Fonti

Ricerche pre-brainstorming: `/Users/mario/GitHub/analisi-strutturale/docs/ricerca/{README,02-panorama-software,03-stack-tecnico,05-archeologia-linea-integrata,06-dominio-analisi-verifiche-formati}.md`.

Web: https://github.com/ogunc/opensees-studio · https://github.com/madil4/awatif · https://github.com/JWock82/Pynite · https://pypi.org/project/pynite-tools/0.7.0/ · https://github.com/admindev-buildwellai/MCP-Pynite · https://github.com/specklesystems/speckle-sharp (`Objects/Objects/Structural/`) · https://github.com/StructuralAnalysisFormat/StructuralAnalysisFormat-Doc (tag 2.2.0) · https://www.saf.guide/en/stable/structural-analysis-elements/structuralmaterial.html · …/structuralcrosssection.html · …/structuralpointconnection.html · …/structuralcurvemember.html · https://www.saf.guide/en/stable/supports-and-hinges/structuralpointsupport.html · https://www.saf.guide/en/stable/loads/structuralloadcase.html · …/structuralloadcombination.html · …/structuralcurveaction.html · https://www.saf.guide/en/stable/results/resultinternalforce1d.html · https://www.saf.guide/en/stable/annexes/units.html · https://www.saf.guide/en/stable/getting-started/saf-versions.html · https://openseespydoc.readthedocs.io/en/latest/src/printModel.html

Caveat: SAF doc ferma al 13/04/2023 (nessuna 2.3 vista); speckle-sharp `main` fermo a 07/2025 (Speckle v3 ha spostato Objects altrove, non verificato); `printModel` misurato su openseespy 3.8.0 macOS arm64, non sulla 3.5.1.12 pinnata da opensees-studio; SAF segni delle sollecitazioni [NON TROVATO] nella spec.
