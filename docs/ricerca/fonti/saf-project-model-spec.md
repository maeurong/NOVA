## Project and model specifications

Structure of sheets “Project” and “Model” is different from all the other sheets. Properties are oriented in columns not in rows as usual.

## Project

In the list called “Project”, you can specify basic information about your project.

### The specification in excel

| Row header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | Park Office | no | The name of the project |
| Description | String | Administrative complex | no | The description of the project |
| Project nr | String | 23/2019 | no | Project numerical designation |
| Created | Date Time | 2018-12-16 15:48:50 | no | Creation time, in UTC, in format yyyy-mm-dd hh:mm |
| Last update | Date Time | 2018-12-23 23:58:59 | no | Last update time, in UTC, in format yyyy-mm-dd hh:mm |
| Project type | String | Building construction | no | The type of the project. The project type can be assigned to e.g. “Building construction” or “Infrastructure construction” |
| Project kind | String | New building | no | The kind of the project. The project kind can be assigned to e.g. “Extension”, “Finish”, “New building”, “Reconstruction” |
| Building type | String | Business | no | Kind of use of the building such as Administrative, Residential, etc… |
| Status | String | Planning stage | no | Status of the project |
| Location | String | South Bohemia | no | Location of the designed project |
| Id | String | bba1ede8-4106-47fd-b5e1-48637ab87f50 | no | ID of project. |

## Model

In the list called “model” you can specify basic info about your project.

### The specification in excel

| Row header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | Park Office - object A | no | The name of the model |
| Description | String | Highrise | no | The description of the model |
| Discipline | String | Load-bearing structure | no | Discipline can be set as Undefined, Architecture, HVAC, Load-bearing structure, Terrain, Facility etc. |
| Level of detail | String | Draft | no | Describe level of detail of the model |
| Status | String | Planning stage | no | Description of model status |
| Owner | String | Person A | no | Define the owner of the model |
| Revision number | String | rev.02 | no | Current revision number |
| Created | Date Time | 2018-12-16 | no | Creation time, in UTC, in ISO format year-month-day |
| Last update | Date Time | 2018-12-19 | no | Last update time, in UTC, in ISO format year-month-day |
| Source type | String | Structural analysis model | no | Definition of the source data |
| Source application | String | Scia Engineer | no | Definition of the source application |
| SAF Version | String | 1.0.3 | yes | Definition of used version of the Structural Analysis Format |
| Source company | String | Statical company | no | Define the author company of source data |
| Global coordinate system | Enum | X vertical  Y vertical  Z vertical  minus X vertical  minus Y vertical  minus Z vertical | yes | Define the space orientation of the coordinates system for model  Right hand rule applies all the time.  X vertical - X axis goes against gravity  Y vertical - Y axis goes against gravity  Z vertical - Z axis goes against gravity  minus X vertical - X axis goes in direction of gravity  minus Y vertical - Y axis goes in direction of gravity  minus Z vertical - Z axis goes in direction of gravity  \* For further explanation see notes below |
| LCS of cross-section | Enum | ZYX  MinusYZX  MinusZMinusYX  YMinusZX  YZMinusX  MinusZYMinusX  MinusYMinusZMinusX  ZMinusYMinusX | yes | Define the LCS orientation of used cross-section.  With row “LCS of cross-section” the user is able to define, how the LCS of cross section is defined in his software. This will give opportunity to receiving application of SAF file to correctly interpret LCS of cross section with different standard. The x-axis is always in the centre line and all possible cases are described by this enum.  For further explanation see notes below |
| System of units | Enum | Metric  Imperial | yes | Define the type of units system used in model |
| National code | Enum | EC-Standard-EN  EC-ONORM-EN (Austrian NA)  EC-TKP-EN (Belarusian NA)  EC-NBN-EN (Belgian NA)  EC-BAS-EN (Bosnian and Herzegovinian NA)  EC-BS-EN (British NA)  EC-BDS-EN (Bulgarian NA)  EC-CYS-EN (Cypriot NA)  EC-CSN-EN (Czech NA)  EC-DS-EN (Danish NA)  EC-NEN-EN (Dutch NA)  EC-EVS-EN (Estonian NA)  EC-SFS-EN (Finnish NA)  EC-NF-EN (French NA)  EC-DIN-EN (German NA)  EC-ELOT-EN (Greek NA)  EC-MSZ-EN (Hungarian NA)  EC-IST-EN (Icelandic NA)  EC-IS-EN (Irish NA)  EC-UNI-EN (Italian NA)  EC-LVS-EN (Latvian NA)  EC-LST-EN (Lithuanian NA)  EC-LU-EN (Luxembourgian NA)  EC-MS-EN (Malaysian NA)  EC-MSA-EN (Maltese NA)  EC-MKC-EN (North Macedonian NA)  EC-NS-EN (Norwegian NA)  EC-PN-EN (Polish NA)  EC-NP-EN (Portuguese NA)  EC-SR-EN (Romanian NA)  EC-SRPS-EN (Serbian NA)  EC-SS-EN (Singaporean NA)  EC-STN-EN (Slovakian NA)  EC-SIST-EN (Slovenian NA)  EC-UNE-EN (Spanish NA)  EC-SS-EN (Swedish NA)  EC-SN-EN (Swiss NA)  EC-TS-EN (Turkish NA)C  IBC  NBR  SIA 26x | yes | Sets national code used for structural analysis |
| Ignored objects | String | StructuralCrossSection;StructuralPointAction | no | Field used for update work-flow  Specify the object(s) that should be excluded from update  Multiple objects are divided by a semicolon  See [Ignored objects and groups](https://www.saf.guide/en/stable/annexes/ignore.html) for all SAF objects |
| Ignored groups | String | SupportsAndHinges;StructuralLoad | no | Field used for update work-flow  Specify the groups(s) that should be excluded from update  Groups are parent to objects - each group consists of multiple objects  Multiple groups are divided by a semicolon  See [Ignored objects and groups](https://www.saf.guide/en/stable/annexes/ignore.html) for all SAF groups |
| Id | String | bba1ede8-4106-47fd-b5e1-48637ab87f47 | no | ID of model. |

## Notes

> ### Global coordinate system:
> 
> [![../../_images/5_model_gcs.jpg](https://www.saf.guide/en/stable/_images/5_model_gcs.jpg)](https://www.saf.guide/en/stable/_images/5_model_gcs.jpg)

> ### LCS of cross-section:
> 
> - The graphical interpretation of values for row “ **LCS of cross-section** ” is represented below. Please keep in mind that x-axis is always in centre-line of the member. “ **LCS of cross-section** ” desribes how is LCS of CSS library handled and how is CSS applied on the the member.
> - The first axis of the enum is the vertical one, positive direction is Zref. The second axis of the enum is the horizontal one, positive direction is Yref. Last is the axis in cente-line of the member, positive direction is Xref.
> [![../../_images/5_model_lcs_of_css.jpg](https://www.saf.guide/en/stable/_images/5_model_lcs_of_css.jpg)](https://www.saf.guide/en/stable/_images/5_model_lcs_of_css.jpg)

> ### System of units
> 
> - Column headers should respect this setting and change unit accordingly, also values should be in specified units
> - See [table](https://www.saf.guide/en/stable/annexes/units.html) of units for headers
