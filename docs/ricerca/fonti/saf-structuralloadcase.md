## StructuralLoadCase

**Load case**

Individual loads are not defined “freely”. They must be included in load cases. A load case is a group, commonly used to group loads from the same action source. The load cases correspond with the professional terminology specified in national technical standards dealing with loads of civil engineering structures. The application of load cases follows the load management procedures that are usual and also obligatory in civil engineering practice.

## Specification in the excel

| Column header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | LC1 | yes | Human readable unique name of the object |
| Description | String | Offices – Cat.B | no | Description of the load case |
| Action type | Enum | Permanent  Variable  Accidental | yes | Type of load in general. Other parameters depend on the adjustment of the load case type |
| Load group | String | LG 1 | yes | Name reference to existing [StructuralLoadGroup](https://www.saf.guide/en/stable/loads/structuralloadgroup.html) object with appropriate settings of Load group type |
| Load type | Enum | Self weight  Others  Prestress  Dynamic  Static  Temperature  Wind  Snow  Maintenance  Fire  Moving  Seismic  Standard | yes | Define subtype of load. Depends on Action type property.  Subtypes for **Permanent**:  Self weight; Others;Prestress; Standard  Use value “Self weight” only for cases of automatically generated load.  If your app is exporting self weight load as load objects, use type “Standard” and use field “Description” to carry the information it is Self weight (example: “Self weight load impulses”)  Subtypes for **Variable**:  Others; Dynamic; Static; Temperature; Wind; Snow; Maintenance; Fire; Moving; Seismic; Standard  Subtypes for **Accidental**:  Others; Dynamic; Static; Temperature; Wind; Snow; Maintenance; Fire; Moving; Seismic; Standard |
| Duration | Enum | Long  Medium  Short  Instantaneous | yes, if Action type = Variable | For static standard loads, the duration of the load impact can be specified |
| Id | String | 39f238a5-01d0-45cf-a2eb-958170fd4f39 | no | Unique attribute designation |
