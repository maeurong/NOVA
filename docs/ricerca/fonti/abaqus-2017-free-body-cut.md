# Abaqus/CAE 2017 - Free Body toolset e risultanti sui tagli (estratto verbatim)

Catturato da `abaqus-docs.mit.edu`, che ospita una copia della documentazione
Abaqus/CAE 2017 di Dassault Systemes. Non e' il dominio del produttore: il testo e'
verbatim, il dominio no. Serve come termine di paragone per il taglio libero di NOVA.

## The Free Body toolset - `simacae-m-Fbd-sb.htm`

Free body cuts display the resultant forces and moments transmitted across a selected surface of your model. Free body cuts simply integrate the internal forces in an element over a section; therefore, they cannot be used accurately across sections containing surface tractions due to cohesive contact or other sources. The Free Body toolset is available only in the Visualization module, and you can create a free body cut only when the current step and frame of the output database includes element force nodal output (NFORC).

This chapter explains how to use the Free Body toolset to create and delete free body cuts, display or hide them in the viewport, and customize several aspects of their appearance.

Abaqus/CAE also enables you to generate reports or create X–Y data objects that describe the forces and moments in all active free body cuts in your session. See [Producing a tabular report](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-reportproduce.htm "You can produce tabular reports of X–Y data objects, field output results, free body cuts, and probe values."), and [Reading X–Y data from all active free body cuts](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-xypreadfreebody.htm), respectively.

Abaqus/CAE provides two other methods for displaying free body data:

- You can display resultant forces and moments along an arbitrary plane through your model by toggling on free body display for a planar view cut. For more information, see [Understanding view cuts](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-cutunderstand.htm "View cuts allow you to cut planar or deformable sections through a model to see the interior of the model.").
- You can display the free body nodal forces in a symbol plot to determine which nodes have an imbalance of forces or moments due to applied loads or to visualize the nodal force distribution on internal sections. For more information, see [Producing a symbol plot of free body nodal forces](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-symfreebody.htm).
In this section:  

[Resultant forces and moments on free body cuts in Abaqus/CAE](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-fbdintro.htm)  
[Creating or editing a free body cut](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-fbdhlpcreate.htm)  
[Selection methods for free body cross-sections](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-fbdhlpselect.htm)  
[Displaying, hiding, and highlighting free body cuts](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-fbdhlpdisplay.htm)  
[Customizing free body cut display](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-m-FbdHlpOptions-sb.htm "This section describes how you can customize the content and appearance of free body cuts using settings in the Free Body Plot Options dialog box.")

## Resultant forces and moments on free body cuts in Abaqus/CAE - `simacae-c-fbdintro.htm`

A free body cross-section in Abaqus/CAE is an area of your model across which you want to display resultant forces and moments. Once you define a cross-section, Abaqus/CAE displays vectors that show the magnitude and direction of the resultant forces and moments across the area you select. Force vectors are displayed with a single arrowhead and moment vectors with a double arrowhead, as shown in the example in [Figure 1](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-c-fbdintro.htm#simacae-c-fbdintro__simacae-c-fbd-arrows-example); by default, the force vectors are red and the moment vectors are blue.

Figure 1. Resultant force and moment display.  
![](https://abaqus-docs.mit.edu/2017/English/SIMACAERefImages/fbd-arrows.png)

You can define the nodes and elements that comprise the cross-section using processes that closely resemble the definition of display groups. Abaqus/CAE enables you to specify the components of the cross-section by including surfaces, display groups, and elements or nodes by number; and you can pick items from the viewport, either by feature angle or individually. See [Creating or editing a free body cut](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-fbdhlpcreate.htm), for detailed instructions. After you define the physical components of your free body cross-section, you can set the location of the summation point (about which resultant moments are taken), and you can indicate the coordinate system transformation that applies when vectors are displayed in component form.

Cross-sections can be created along mesh boundaries only; you cannot specify a cross-section along an arbitrary plane. You can create and display free body cuts only in the Visualization module.
