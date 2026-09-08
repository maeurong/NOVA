## ResultInternalForce1D

**Internal force 1D**

Internal forces on line, beam, member. Result in member axis (not in principal axis).

![](https://www.saf.guide/en/stable/_images/47_resultsinternal_force_1.gif)

## Specification in the excel

| Column header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Result on | Enum | On beam  On rib | yes | Specify object where the result is  On beam - [StructuralCurveMember](https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvemember.html)  On rib - [StructuralCurveMemberRib](https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvememberrib.html) |
| Member | String | B1 | yes, if Result on = On beam | Reference to the name of 1D member - [StructuralCurveMember](https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvemember.html) |
| Member Rib | String | B2 | yes, if Result on = On rib | Reference to the name of 1D member - rib [StructuralCurveMemberRib](https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvememberrib.html) |
| Result for | Enum | Load case  Load combination | yes | Specifies from where the result is coming from (from Load Case, Load Combination) |
| Load case | String | LC1 | yes, if Result for = Load case | Reference to the name of [StructuraLoadCase](https://www.saf.guide/en/stable/loads/structuralloadcase.html) |
| Load combination | String | COM1 | yes, if Result for = Combination | Reference to the name of [StructuralLoadCombination](https://www.saf.guide/en/stable/loads/structuralloadcombination.html) |
| Combination key | String | 1.35\*LC1+1.5\*LC2+1.5\*LC3+1.5\*LC4 | no | Allows to define exact combination per result section      Structure of string:   ”LoadFactor1\*LoadCase1+LoadFactor2\*LoadCase2  +LoadFactorN\*LoadCaseN”  For envelopes and national standard (code) combinations, this column specifies for which exact combination is the result |
| Section at \[m\] | Double | 0.100 | yes | X coordinate on the beam (distance from the start node) where the result is located |
| Index | Integer | 1 | yes | Index of the section on beam. See. |
| N \[kN\] | Double | 3.00 | yes | Result value of N  (Normal force) |
| Vy \[kN\] | Double | 3.00 | yes | Result value of Vy  (Shear force in Y axis direction) |
| Vz \[kN\] | Double | 3.00 | yes | Result value of Vz  (Shear force in Z axis direction) |
| Mx \[kNm\] | Double | 0.000 | yes | Result value of Mx  (Moment around X axis) |
| My \[kNm\] | Double | 4.500 | yes | Result value of My  (Moment around Y axis) |
| Mz \[kNm\] | Double | 4.500 | yes | Result value of Mz (Moment around Z axis) |

## Notes

> ### Multiple tables in one sheet
> 
> The amount of data can be limited due the [limitation of xlsx](https://support.microsoft.com/en-us/office/excel-specifications-and-limits-1672b34d-7043-467e-8e27-269d656771c3) format.
> 
> Therefore the results can be written to SAF in a form of multiple tables. In the similiar logic as the [StructuralProxyElement](https://www.saf.guide/en/stable/structural-analysis-elements/structuralproxyelement.html).

> ### Index
> 
> This attribute defines an order of the section on the beam, starting with 1 and increasing from the **start** to the **end** of the beam. This property helps to specify if the internal force is on the “left” or on the right side of the section.
> 
> See example below:
> 
> ![](https://www.saf.guide/en/stable/_images/47_resultinternalforce1d_2.gif)

> [!note] Hint
> See the index 6 and 7. One section, two values for normal (N) force.  
> Section with lower index (6) identifies value on the left (closer to the origin of X-axis of the beam).  
> Section with a higher index (7) identifies value on the right (further from the origin of X-axis of the beam).
