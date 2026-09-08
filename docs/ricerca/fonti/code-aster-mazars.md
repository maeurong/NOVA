# code_aster r7.01.08 - Modele d'endommagement de MAZARS

Fonte: https://codeaster.gitlab.io/doc/docaster/manuals/man_r/r7/r7.01.08/index.html

r7.01.08 Modèle d’endommagement de MAZARS — DocAster 
 Passer au contenu principal 
 Haut de page 
 Ctrl + K 
 r7.01.08 Modèle d’endommagement de MAZARS # 
 Résumé : 
 Cette documentation présente le modèle de comportement de MAZARS qui permet de décrire le comportement élastique-endommageable du béton. Ce modèle est 3D, isotrope et s’appuie sur un critère d’endommagement écrit en déformation et décrivant la dissymétrie traction-compression. Le modèle initial, ne rend pas compte de la restauration de rigidité en cas de «refermeture des fissures» et ne prend pas en compte les éventuelles déformations plastiques ou effets visqueux qui peuvent être observés au cours des déformations d’un béton. La version implémentée dans Code_Aster tient compte des dernières améliorations. Cette reformulation du modèle Mazars des années 1980 permet de mieux décrire le comportement du béton en bi-compression et en cisaillement pur. 
 La version \(\mathrm{1D}\) du modèle permet de rendre compte de la restauration de rigidité en cas de refermeture des fissures, elle est seulement utilisée avec les poutres multifibres [ R5.03.09 ]. 
 1. Introduction 
 1.1. Une loi de comportement élasto-endommageable 
 1.2. Limites et méthodes de régularisation 
 1.3. Couplage avec la thermique 
 1.4. Loi de Mazars en présence d’un champ de séchage ou d’hydratation 
 2. Les modèles de MAZARS 
 2.1. Modèle d’Origine de Mazars 
 2.2. Modèle Revisité de Mazars 
 3. Identification 
 4. Résolution numérique 
 4.1. Évaluation de la variable interne Y 
 4.2. Évaluation de l’endommagement 
 4.3. Calcul de la contrainte 
 4.4. Calcul de la matrice tangente 
 4.5. Variables internes stockées 
 5. Fonctionnalités et vérification 
 6. Bibliographie 
 7. Historique des versions du document 
 Montrer le code source
 so the DOM is not blocked -->
