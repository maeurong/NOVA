## StructuralLoadCombination

**Load Combination**

Object serves for definition a load combination. The combination is created from the existing load cases in the model, in [StructuralLoadCase](https://www.saf.guide/en/stable/loads/structuralloadcase.html) sheet.

## Specification in the excel

| Column header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | COM1 | yes | Human readable unique name of the object |
| Description | String | variable\_1 + dead load | no | The description of the load combination |
| Category | Enum | ULS (Ultimate Limit State)  SLS (Serviceability Limit State)  ALS (Accidental Limit State)  According national standard  Not defined | yes | The category of the load combination |
| National standard | Enum | EN-ULS (STR/GEO) Set B  EN-ULS (STR/GEO) Set C  EN-Accidental 1  EN-Accidental 2  EN-Seismic  EN-SLS  Characteristic  EN-SLS Frequent  EN-SLS Quasi-permanent  IBC-LRFD ultimate  IBC-ASD ultimate  IBC-ASD serviceability  IBC-ASD seismic  IBC-LRFD seismic | yes, If Category =According national standard | The National code application |
| Type | Enum | Envelope  Linear  Nonlinear | no, optional for Categories:      ULS (Ultimate Limit State)  SLS (Serviceability Limit State)  Not defined | For type ‘linear’, the exact content of the combination is presented.  For type ‘envelope’, linear combinations can be composed based on relations defined in [StrucutralLoadGroup](https://www.saf.guide/en/stable/loads/structuralloadgroup.html).  For type ‘nonlinear’, the exact content of combination is presented. Used for non-linear calculations. Other inputs like initial stress or deformation are to be set in analysis software. |
| Load factor # | double | 1.35 | yes, If Category is not “According national standard” | Load factor of the load case. # means indexing of the Load factor column, e.g. Load factor 1, Load factor 2, … Load factor 99. It depends on how many load cases are considered in the combination.  If the category is “According national standard”, then the load factor is expected to be set by the national standard in the software, not prescribed in SAF. |
| Multiplier # | double | 0.9 | yes | A multiplier for e.g. increase the selfweight of the structure. # means indexing of the Multiplier column, e.g. Multiplier 1, Multiplier 2, … Multiplier 99. It depends on how many load cases are considered in the combination. |
| Load case name # | String | LC1 | yes | Valid name of the load case ([StructuralLoadCase](https://www.saf.guide/en/stable/loads/structuralloadcase.html)). # means indexing of the load case name column, e.g. Load case name 1, Load case name 2, … load case name 99. It depends on how many load case is considered in combination. |
| Id | String | 39f238a5-01d0-45cf-a2eb-958170fd4f39 | no | Unique attribute designation |
