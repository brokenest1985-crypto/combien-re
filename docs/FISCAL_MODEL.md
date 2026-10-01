# Modèle fiscal V0.2a — utilisé par la V0.2b2

Statut : **expérimental**. Date de revue des sources : **9 septembre 2026**. Profil de démonstration : `reunion-high-tech-v0.2a-2026-09-09`.

Ce document décrit ce que calcule le logiciel, les fondements vérifiés et les conventions qui restent à confirmer. Le résultat n’est pas une liquidation officielle.

## Périmètre strict

Le modèle concerne uniquement un particulier consommateur, achetant une marchandise ordinaire à un vendeur professionnel, avec expédition de France métropolitaine vers La Réunion et prix produit fourni hors TVA métropolitaine. Il exclut notamment accises, véhicules, pays tiers, régimes particuliers et droits de douane non explicitement modélisés.

## Représentations exactes

- Un montant est un `Cents`, entier positif ou nul dans la plage sûre JavaScript.
- Un `FiscalRate` est un entier de points de base : `1 bp = 0,01 %`. Ainsi, `8,5 % = 850 bp` exactement.
- Les saisies sont converties directement depuis des chaînes. Aucun montant en euros et aucun taux ne passent par un flottant.
- Les additions et multiplications intermédiaires utilisent `bigint`. Une sortie dépassant `Number.MAX_SAFE_INTEGER` est refusée.

## Formules implémentées

Soient :

- `G` : valeur du produit HT ;
- `T` : transport jusqu’au point d’entrée ;
- `A` : assurance jusqu’au point d’entrée ;
- `P` : frais accessoires postérieurs à l’entrée susceptibles d’intégrer la base TVA ;
- `F` : frais privés de traitement/dédouanement facturés par le transporteur.

```text
valeur en douane = G + T + A
base OM          = valeur en douane
base OMR         = valeur en douane
base TVA         = valeur en douane + P
coût total       = G + T + A + P + OM + OMR + TVA + F
```

**OM et OMR ne sont jamais ajoutés à la base TVA.** Cette exclusion apparaît dans le type de sortie (`vatBaseExcludesOctroiDeMer: true`), dans la composition du calcul et dans un test capable de détecter immédiatement l’erreur inverse.

La valeur intrinsèque utilisée pour la franchise correspond à `G`, car transport et assurance sont fournis séparément. Lorsque `G` est inférieur ou égal au seuil du profil (`2 200` centimes), `exemptionApplied` vaut `true` et TVA, OM et OMR valent zéro. Les autres coûts restent dus dans l’estimation.

## Règles confirmées par les sources consultées

- Pour une importation, l’assiette de l’octroi de mer est la valeur en douane. Fondement : [article 9 de la loi n° 2004-639](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000048639476) et [fiche Douane « Importer un bien dans un DROM »](https://www.douane.gouv.fr/demarche/importer-un-bien-dans-un-drom).
- L’octroi de mer régional est assis sur la même base que l’octroi de mer. Source : [Douane, importation dans un DROM](https://www.douane.gouv.fr/demarche/importer-un-bien-dans-un-drom).
- Le transport, l’assurance et les frais connexes jusqu’au lieu d’entrée sont des éléments à intégrer à la valeur en douane lorsqu’ils ne sont pas déjà compris. Source : [Douane, valeur en douane à l’importation](https://www.douane.gouv.fr/fiche/valeur-en-douane-de-votre-marchandise-limportation).
- La base de TVA à l’importation part de la valeur en douane et comprend certains impôts et frais accessoires jusqu’au premier lieu de destination. Fondement général : [article 292 du CGI](https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000041472118).
- Par dérogation explicite, l’octroi de mer et l’octroi de mer régional ne sont pas compris dans la base TVA. Fondement : [article 45 de la loi n° 2004-639](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000030818088).
- Le taux normal de TVA indiqué pour La Réunion est de 8,5 %. Source : [Douane, importation dans un DROM](https://www.douane.gouv.fr/demarche/importer-un-bien-dans-un-drom). Le moteur ne le contient qu’une fois, dans le profil de démonstration ; il accepte tout taux fourni par un autre profil.
- Les envois d’une valeur intrinsèque n’excédant pas 22 € importés à La Réunion bénéficient de la franchise de TVA prévue par [l’article 50 octies de l’annexe IV au CGI](https://www.legifrance.gouv.fr/loda/article_lc/LEGIARTI000043584984). Les instructions Douane sur les envois de faible valeur indiquent aussi, pour les flux commerciaux B2C/B2B vers les DROM, une franchise à 22 € pour TVA et octroi de mer : [Instructions EFV opérateurs (PDF)](https://www.douane.gouv.fr/sites/default/files/ba_files/da/2024-11/Instructions%20EFV%20Op%C3%A9rateurs.pdf).
- La valeur intrinsèque exclut les frais de transport et d’assurance présentés séparément. Source de définition : [FAQ Douane sur la valeur intrinsèque](https://www.douane.gouv.fr/fiche/faq-douane-macf-mecanisme-dajustement-carbone-aux-frontieres).
- Les frais de dossier ou de présentation réclamés par le transporteur rémunèrent un service privé et ne sont pas une taxation douanière. Source : [Douane, anticiper les frais d’un colis](https://www.douane.gouv.fr/fiche/anticiper-les-frais-de-douane-dun-colis).

## Hypothèses et choix provisoires

### Arrondi

Les sources actuellement intégrées au projet ne suffisent pas à confirmer la règle opérationnelle exacte d’arrondi applicable à chaque ligne de TVA, OM et OMR d’un colis individuel.

La V0.2a emploie donc une stratégie technique explicite et centralisée : **arrondi au centime le plus proche, avec le demi-centime vers le haut**, appliqué séparément à chaque taxe. Mathématiquement, pour une base en centimes et un taux en points de base :

```text
montant brut = base × taux / 10 000
```

Le quotient et le reste sont calculés en `bigint`. Cette convention est déterministe et testée aux limites, mais **elle n’est pas présentée comme une règle fiscale juridiquement validée**. Toute confirmation ultérieure devra créer une stratégie nommée, sourcée, datée et accompagnée de nouveaux cas de référence.

### Composition des données

- Le champ « livraison jusqu’à La Réunion » est assimilé, dans cette interface, au transport jusqu’au point d’entrée. Le détail d’un transport après l’entrée n’est pas collecté.
- Le moteur sait représenter `postEntryAccessoryCostsCents`, mais l’interface V0.2a lui fournit zéro. Il faudra qualifier chaque frais réel avant de l’ajouter à la base TVA.
- Les frais du transporteur saisis sont traités comme frais privés ajoutés après taxes. Si une facture réelle contient plusieurs natures de frais, leur ventilation devra être vérifiée.
- La marchandise est supposée éligible à la franchise et hors exclusions particulières. La couche tarifaire peut recevoir une nomenclature, mais le moteur fiscal ne vérifie ni sa classification ni les exclusions liées à la nature du bien.
- Le seuil, la TVA, la date de référence et l’arrondi sont versionnés dans le profil. La date est une date de revue du scénario, pas une garantie automatique de droit applicable à une date future.

## Éléments restant à automatiser

- identification fiable du code douanier ;
- récupération officielle, versionnée et datée des taux OM/OMR ;
- validation des exclusions de franchise selon la nature de la marchandise ;
- détermination des frais accessoires réellement inclus dans la base TVA ;
- choix de la règle d’arrondi juridiquement confirmée ;
- prise en compte des droits de douane et autres régimes hors périmètre ;
- sélection d’un profil selon origine, destination, qualité des parties et date du fait générateur.

## Limites de l’estimation

L’outil ne vérifie ni facture, ni Incoterm, ni nomenclature, ni origine préférentielle, ni décision du Conseil régional. Les taux OM/OMR saisis peuvent être erronés. Les frais du transporteur peuvent varier. Le montant réel reste celui liquidé par les autorités et facturé par les opérateurs compétents.

Une modification réglementaire postérieure à la date de référence n’est pas détectée automatiquement. Il faut revoir les sources et créer un nouveau profil avant d’utiliser ce modèle pour une autre date ou un autre scénario.

## Apport V0.2b2 : provenance des taux OM/OMR

Le moteur et ses formules ne sont pas modifiés. Une couche séparée peut fournir les deux `FiscalRate` après résolution d’une nomenclature et d’une date dans le snapshot Région Réunion `DCP2026_0296`. Seul un résultat `resolved` alimente `calculateLandedCost`; `ambiguous`, `not-found` et `unsupported` ne produisent aucun calcul automatique.

Le référentiel Région conserve les codes publiés et normalisés, niveaux NC, libellés, taux OME/OMER, EX/SAUF, observations, pages et référence de source. Les notions RITA de type de mesure ou code taxe ne lui sont pas imposées. Son import et ses limites sont détaillés dans [`REGION_REUNION_TARIFF.md`](REGION_REUNION_TARIFF.md). La saisie manuelle reste disponible pour les cas ambigus ou non couverts.

Le snapshot Région ne modifie pas la fiscalité du moteur : OME alimente le taux `octroiDeMerRate`, OMER le taux `octroiDeMerRegionalRate`, chacun en points de base exacts. Les deux restent calculés sur la valeur en douane et explicitement exclus de la base TVA.
