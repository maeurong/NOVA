## StructuralLoadGroup

**Load group**

Load groups define “how the individual load cases may be combined together” if inserted into a load case combination. Thanks to the load groups, the user can easily specify which load cases MUST, MUST NOT, or CAN act together. Each load group may be used either for permanent loads or for variable loads. Permanent and variable loads cannot appear in the same group.

## Specification in the excel

| Column header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | LG1 | yes | Human readable unique name of the object |
| Load group type | Enum | Permanent  Variable  Accidental  Seismic  Moving  Tensioning  Fire | yes | This parameters tell whether the load group is used for permanent or variable loads.  Applicable Load group types for:  **Permanent load case:** Permanent  **Variable load case:** Variable, Seismic, Moving, Tensioning, Fire  **Accidental load case:** Accidental |
| Relation | Enum | Exclusive  Standard  Together | yes | The relation tells what the relation of load cases in the particular load group is.  **Exclusive**: Two load cases from the same load group of this type will never appear in the same combination.   Applicable for Load group types: Variable, Accidental, Seismic, Moving, Tensioning, Fire  **Standard**: It allows the user to sort load cases but it does not affect the process of generation of load case combinations.  Applicable for Load group types: All  **Together**: All load cases in the same load group of this type are always inserted into every new load case combination  Applicable for Load group types: Permanent |
| Load type | String | Domestic | yes, if Load group type = Variable | Define type of variable load, E.g. Domestic,  Offices,  Congregation,  Shopping,  Storage,  Vehicle < 30kN,  Vehicle > 30kN,  Roofs,  Snow,  Wind,  Temperature |
| Id | String | 39f238a5-01d0-45cf-a2eb-958170fd4f39 | no | Unique attribute designation |
