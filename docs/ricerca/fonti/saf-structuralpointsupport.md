## StructuralPointSupport

**Point support**

StructuralPointSupport represents a support of the analytical model in a node or on a beam. The support is defined by six separate parameters. Each parameter defines the constraint in one direction: translation in the direction of the X, Y, Z axis and rotation around the same axes.

![](https://www.saf.guide/en/stable/_images/19_structuralpointsupport.png)

## Specification in the excel

| Column header | Data type | Example / enum definition | Required | Description |
| --- | --- | --- | --- | --- |
| Name | String | Sn6 | yes | Human readable unique name of the support |
| Type | Enum | Fixed  Hinged  Sliding  Custom | no | Type of constraint support in general. Has just informative value. Actual boundary conditions are set per transition/rotation per direction. |
| Boundary condition | Enum | In node  On beam | yes | Specifies to which type of object the support is assigned |
| Node | String | N5 | yes, if Boundary condition = In node | The name of the node to which is point support related |
| Member | String | B1 | yes, if Boundary condition = On beam | The name of the [StructuralCurveMember](https://www.saf.guide/en/stable/structural-analysis-elements/structuralcurvemember.html) to which the support is assigned |
| Coordinate system | Enum | Global  Local | yes, if Boundary condition = On beam | Defined the coordinate system used by the support. Local coordinate system defined by 1D member. Support in a node is in global coordinate system only |
| Origin | Enum | From start  From end | yes, if Boundary condition = On beam | Specifies where the origin for the position x coordinate is. Start of the beam is where its first point is |
| Coordinate definition | Enum | Absolute  Relative | yes, if Boundary condition = On beam | Specifies the definition of the position |
| Position x \[m\] | Double | 5.25 (absolute value \[m\])  0.5 (relative value \[-\]) | yes, if Boundary condition = On beam | Defines the position of the support on the 1D member in local coordinate system in relative or in absolute coordinates \[m\] |
| ux | Enum | Rigid  Free  Flexible  Compression only  Tension only  Flexible compression only  Flexible tension only  Non linear | yes | Translation in X direction.   Free - That is it imposes no constraint in the direction.  Rigid - The support in fully rigid in the specified direction.  Flexible - The support is flexible (elastic) in the specified direction. Parameter Flexible can be linear only, non-linearity is not supported. Compression only acts only under compression. If the support gets under tension it stops acting. Tension only support acts only under tension.  See for direction of tension and compression. |
| uy | Enum | Rigid  Free  Flexible  Compression only  Tension only  Flexible compression only  Flexible tension only  Non linear | yes | Translation in Y direction.  Free - That is it imposes no constraint in the direction.  Rigid - The support in fully rigid in the specified direction.  Flexible - The support is flexible (elastic) in the specified direction. Parameter Flexible can be linear only, non-linearity is not supported. Compression only acts only under compression. If the support gets under tension it stops acting. Tension only support acts only under tension.  See for direction of tension and compression. |
| uz | Enum | Rigid  Free  Flexible  Compression only  Tension only  Flexible compression only  Flexible tension only  Non linear | yes | Translation in Z direction.  Free - That is it imposes no constraint in the direction.  Rigid - The support in fully rigid in the specified direction.  Flexible - The support is flexible (elastic) in the specified direction. Parameter Flexible can be linear only, non-linearity is not supported. Compression only acts only under compression. If the support gets under tension it stops acting. Tension only support acts only under tension.  See for direction of tension and compression. |
| fix | Enum | Free  Rigid  Flexible  Non linear | yes | Rotational stiffness around X axis. Parameter  Flexible can be linear only, non-linearity is not supported. |
| fiy | Enum | Free  Rigid  Flexible  Non linear | yes | Rotational stiffness around Y axis. Parameter Flexible can be linear only, non-linearity is not supported. |
| fiz | Enum | Free  Rigid  Flexible  Non linear | yes | Rotational stiffness around Z axis.  Parameter Flexible can be linear only, non-linearity is not supported. |
| Stiffness X \[MN/m\] | Double | 100 | yes, if Translation X = Flexible  yes, if Translation X = Non linear | The flexibility of the support in X direction |
| Stiffness Y \[MN/m\] | Double | 100 | yes, if Translation Y = Flexible  yes, if Translation Y = Non linear | The flexibility of the support in Y direction |
| Stiffness Z \[MN/m\] | Double | 100 | yes, if Translation Z = Flexible  yes, if Translation Z = Non linear | The flexibility of the support in Z direction |
| Stiffness Fix \[MNm/rad\] | Double | 50 | yes, if Rx = Flexible  yes, if Rx = Non linear | The flexibility in rotation of the connection around local X axis |
| Stiffness Fiy \[MNm/rad\] | Double | 50 | yes, if Ry = Flexible  yes, if Ry = Non linear | The flexibility in rotation of the connection around local Y axis |
| Stiffness Fiz \[MNm/rad\] | Double | 50 | yes, if Rz = Flexible  yes, if Rz = Non linear | The flexibility in rotation of the connection around local Z axis |
| Id | String | 39f238a5-01d0-45cf-a2eb-958170fd4f39 | no | Unique attribute designation |

## Notes

> Tension and compression supports act only in a specific direction. Tension supports prevent the movement in the positive direction of an axis. Compression supports prevent the movement in the opposite direction. Those supports are: compression only, tension only, flexible compression only, and flexible tension only.
> 
> Support in a node is always oriented in the global coordinate system. See the picture below for an example of tension only support which prevents the movement only in the positive direction of the global axes. Only if the support is assigned to a 1D member (instead of a node) it can be assigned local coordinate system defined by the 1D member.
> 
> [![../_images/19_point_support_directions.png](https://www.saf.guide/en/stable/_images/19_point_support_directions.png)](https://www.saf.guide/en/stable/_images/19_point_support_directions.png)
