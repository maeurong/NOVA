# code_aster r7.01.04 - Loi de comportement ENDO_ISOT_BETON

## Indice del documento

Fonte: https://codeaster.gitlab.io/doc/docaster/manuals/man_r/r7/r7.01.04/index.html

r7.01.04 Loi de comportement ENDO_ISOT_BETON — DocAster 
 Passer au contenu principal 
 Haut de page 
 Ctrl + K 
 r7.01.04 Loi de comportement ENDO_ISOT_BETON # 
 Résumé: 
 Cette documentation présente l’écriture théorique et l’intégration numérique de la loi de comportement ENDO_ISOT_BETON qui décrit un mécanisme d’endommagement local asymétrique des bétons, avec effet de restauration de rigidité. 
 1. Introduction – Domaine d’application 
 2. Loi de comportement 
 2.1. Écriture théorique 
 2.2. Prise en compte du retrait et de la température 
 2.3. Identification des paramètres 
 2.4. Intégration numérique 
 2.5. Description des variables internes 
 3. Pilotage par prédiction élastique 
 4. Bibliographie 
 5. Fonctionnalités et vérification 
 6. Description des versions du document 
 Montrer le code source
 so the DOM is not blocked -->

## 1. Introduction - Domaine d'application

Fonte: https://codeaster.gitlab.io/doc/docaster/manuals/man_r/r7/r7.01.04/Introduction___Domaine_d_application.html

1. Introduction – Domaine d’application — DocAster 
 Passer au contenu principal 
 Haut de page 
 Ctrl + K 
 1. Introduction – Domaine d’application # 
 La loi de comportement ENDO_ISOT_BETON vise à modéliser le plus simplement possible un comportement de béton élastique fragile. Elle peut être vue comme une extension de la loi ENDO_FRAGILE (supprimée du code) (avec laquelle elle garde une proximité de formulation certaine) pour des applications de Génie Civil. 
 Comme pour la loi ENDO_FRAGILE, le matériau est isotrope. La rigidité peut décroître, la perte de rigidité mesurée par un scalaire évoluant de 0 (matériau sain) à 1 (matériau totalement endommagé). 
 En revanche, contrairement à ENDO_FRAGILE, la perte de rigidité distingue la traction de la compression, pour privilégier l’endommagement en traction. De plus cette perte de rigidité peut disparaître par retour en compression, il s’agit du phénomène de restauration de rigidité à la refermeture. Il faut aussi noter que cette loi d’endommagement vise à décrire la rupture du béton en traction; elle n’est donc pas du tout adapté à la description du comportement non linéaire du béton en compression. Elle suppose donc que le béton reste dans un état de compression modéré. 
 La loi ENDO_ISOT_BETON présente de l’adoucissement, ce qui entraîne généralement une perte d’ellipticité des équations du problème et par suite une localisation des déformations, d’où une dépendance pathologique au maillage. 
 Enfin, le caractère adoucissant du comportement entraîne également l’apparition d’instabilités, physiques ou parasites, qui se traduisent par des snap‑backs sur la réponse globale et rendent le pilotage du chargement indispensable en statique. Le pilotage de type PRED_ELAS [ R5.03.80 ] apparaît alors comme le mode de contrôle du chargement le plus adapté. 
 Montrer le code source
 so the DOM is not blocked -->
