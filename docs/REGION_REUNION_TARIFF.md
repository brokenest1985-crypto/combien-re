# Tarif Région Réunion — snapshot du 12 juin 2026

Statut : **activé, tarif courant vérifié au 2026-10-01**. Le résultat demeure indicatif et dépend de la justesse de la nomenclature fournie.

## Source retenue

Le Conseil régional fixe les taux d’octroi de mer ; la Douane indique que ces taux figurent dans le tarif externe de la collectivité. La source V0.2b2 est l’**annexe 1 — Tarif général d’octroi de mer et d’octroi de mer régional** de la délibération `DCP2026_0296`, Conseil régional de La Réunion :

- séance : 5 juin 2026 ;
- publication, transmission et réception en préfecture : 12 juin 2026 ;
- document : `recueil_deliberations_cperma_du_05_juin_2026.pdf` ;
- pages PDF du tarif : 26 à 346, soit 321 pages numérotées 1/321 à 321/321 ;
- URL : <https://regionreunion.com/IMG/pdf/recueil_deliberations_cperma_du_05_juin_2026.pdf> ;
- SHA-256 : `d0b700238edf07a96de788f7bc03b54769a3908efaa232580bf6a6a3a459d3d6` ;
- récupération contrôlée : 10 septembre 2026.

L’annexe 2 du recueil est un tarif simplifié qui déclare ne pas avoir de portée juridique ; elle n’est pas importée. Seules les colonnes externes OME et OMER de l’annexe 1 alimentent Combien. OMI et OMIR restent hors périmètre.

Le manifest versionné se trouve dans [`data-sources/reunion-tariff/2026-06-12/source.json`](../data-sources/reunion-tariff/2026-06-12/source.json). Le PDF de 63 Mio n’est pas committé.

## Date d’effet et contrôle du tarif courant

La délibération ne porte pas une date d’effet distincte. Pour cet acte antérieur au nouveau régime applicable le 1er juillet 2026, la date retenue est donc le **12 juin 2026**, date à laquelle publication électronique et transmission/réception en préfecture sont toutes réunies, conformément au régime d’exécutivité de l’article L4141-1 du CGCT. Cette qualification est documentée, mais ne remplace pas un avis juridique.

Le [catalogue officiel des actes administratifs](https://regionreunion.com/la-region/les-actes-administratifs/article/commission-permanente-assemblee-pleniere) a été parcouru jusqu’au 1er octobre 2026. Le texte intégral, et non les seuls titres, des recueils suivants a été recherché pour toute modification de taux, nomenclature, exception ou règle d’application externe :

| Instance | Séance | Publication | Conclusion du contrôle intégral |
| --- | --- | --- | --- |
| Commission permanente | 19/06/2026 | 26/06/2026 | `DCP2026_0365` donne un avis sur un projet de décret ; aucune modification du tarif consolidé |
| Assemblée plénière | 25/06/2026 | 03/07/2026 | mentions budgétaires et de suivi, aucune modification tarifaire |
| Commission permanente | 10/07/2026 | 27/07/2026 | aucune modification tarifaire |
| Commission permanente | 07/08/2026 | 14/08/2026 | aucune modification tarifaire |
| Commission permanente | 21/08/2026 | 27/08/2026 | aucune modification tarifaire |
| Arrêtés et décisions | — | 22/09/2026 | recueil de 20 pages : arrêté `26006048` relatif à la commission du projet CESAR et arrêtés `SRE-2026-019-AT`, `SRN-2026-095-AT` à `SRN-2026-098-AT` relatifs à la circulation routière ; aucune modification d’OME, OMER, nomenclature, exception, exonération à l’importation ou règle du tarif externe |

Sur la période complémentaire du 11 septembre au 1er octobre 2026 inclus, le catalogue ne publie aucune nouvelle délibération d’assemblée plénière ou de commission permanente. La seule publication supplémentaire est le [recueil des arrêtés et décisions du 22 septembre 2026](https://regionreunion.com/IMG/pdf/recueil_arretes_du_22_septembre_2026.pdf), lu intégralement. Aucun de ses six actes ne modifie le tarif externe ni `DCP2026_0296`. Conclusion : **tarif courant vérifié au 2026-10-01**. La résolution refuse volontairement toute date ultérieure ; un nouveau contrôle des actes et, le cas échéant, un nouveau snapshot seront nécessaires.

## Extraction native et garde-fous

`scripts/reunion-tariff/` utilise PDF.js pour lire les fragments textuels et leurs coordonnées. Aucun OCR n’est employé. Les colonnes code, libellé, OME, OMER, liste/condition et observations sont reconstruites par leurs positions dans le tableau.

L’import échoue notamment si :

- le manifest ou son domaine institutionnel est invalide ;
- le SHA-256 du fichier diffère ;
- l’extraction n’est pas déclarée native sans OCR ;
- les 321 pages consécutives de l’annexe ne sont pas toutes détectées ;
- une ligne ne possède qu’un des deux taux externes ;
- plusieurs taux apparaissent dans une cellule ;
- un taux est illisible ou impossible ;
- une ligne simple tarifée a perdu son libellé.

Les pourcentages français sont convertis textuellement en points de base entiers : `4,00 %` devient `400`, `2,50 %` devient `250`, `0,00 %` devient `0`. Aucun flottant n’intervient. Le code publié reste intact ; une seconde valeur sans espaces sert à la comparaison.

Commande reproductible :

```bash
npm run reunion-tariff:import -- \
  --file /chemin/recueil_deliberations_cperma_du_05_juin_2026.pdf \
  --manifest data-sources/reunion-tariff/2026-06-12/source.json \
  --output data-sources/reunion-tariff/2026-06-12/dataset.json \
  --report data-sources/reunion-tariff/2026-06-12/import-report.json
```

## Rapport structurel

Le dataset déterministe [`dataset.json`](../data-sources/reunion-tariff/2026-06-12/dataset.json) mesure **5 586 162 octets**. Le rapport machine-readable [`import-report.json`](../data-sources/reunion-tariff/2026-06-12/import-report.json) donne :

| Contrôle | Nombre |
| --- | ---: |
| Lignes extraites | 13 683 |
| Codes normalisés distincts | 12 706 |
| Lignes avec couple OME/OMER | 10 801 |
| Lignes OME à 0 % / OMER à 0 % | 3 204 / 3 204 |
| Lignes EX / SAUF | 978 / 26 |
| Codes dupliqués | 725 |
| Lignes conservatrices ambiguës | 1 742 |
| Lignes automatiquement résolvables | 9 073 |
| OME sans OMER / OMER sans OME | 0 / 0 |
| Taux impossible ou non parsé | 0 |

Deux lignes ont un libellé vide dans l’extraction : une ligne `EX 1702 60 10`, donc automatiquement ambiguë, et un titre `8703 40` sans taux. Aucune ligne simple tarifée n’est vide.

## Contrôle humain de 17 lignes

Le code, le libellé complet, OME, OMER et le marqueur éventuel ont été comparés entre les cellules du PDF officiel et le JSON normalisé. Les libellés sont abrégés ci-dessous pour garder le tableau lisible ; chaque contrôle est conforme.

| Page PDF | Code publié | Libellé repère | OME | OMER | Qualif. | Résultat |
| ---: | --- | --- | ---: | ---: | --- | --- |
| 26 | `0101 21 00` | Chevaux reproducteurs de race pure | 0 % | 0 % | — | conforme |
| 26 | `0101 29 10` | Chevaux destinés à la boucherie | 4 % | 2,5 % | — | conforme |
| 27 | `0106 19 00` | Mammifères vivants | 4 % | 2,5 % | — | conforme |
| 27 | `EX 0106 19 00` | Cervidés vivants | 0 % | 0 % | EX | conforme |
| 76 | `1702 60 10` | Isoglucose > 50 % fructose | 4 % | 2,5 % | — | conforme |
| 76 | `EX 1702 60 10` | cellule libellé vide publiée | 0 % | 0 % | EX | conforme, ambigu |
| 82 | `2007 99 97` | Confitures, gelées… | 4 % | 2,5 % | SAUF `2007 99 97 10` | conforme, ambigu |
| 99 | `2203 00 01` | Bières de malt en bouteilles ≤ 10 l | 34 % | 2,5 % | — | conforme |
| 136 | `3006 30 00` | Préparations opacifiantes | 3 % | 2 % | — | conforme |
| 136 | `EX 3006 30 00` | Radiopharmaceutique fluor-18 | 0 % | 0 % | EX | conforme |
| 294 | `8471 30 00` | Machines portatives ≤ 10 kg | 4 % | 2,5 % | — | conforme |
| 294 | `8471 41 00` | Machines avec unité centrale/entrée/sortie | 4 % | 2,5 % | — | conforme |
| 294 | `8471 50 00` | Unités de traitement | 4 % | 2,5 % | — | conforme |
| 304 | `8517 13 00` | Téléphones intelligents | 4 % | 2,5 % | — | conforme, code ambigu par doublon EX |
| 304 | `EX 8517 13 00` | Télécommunication par fibre optique | 0 % | 0 % | EX | conforme, ambigu |
| 332 | `9006 30 00` | Appareils photographiques spécialisés | 15,5 % | 2,5 % | — | conforme |
| 346 | `9619 00 50` | Couches et langes textiles | 1 % | 4 % | — | conforme, OMER majoré |

## Résolution conservatrice

Une correspondance exacte unique, avec deux taux et sans qualification ni observation, est `resolved`. EX, SAUF, observation, doublon ou plusieurs règles donnent `ambiguous`. Une règle parente ne peut pas être héritée automatiquement : sa présence produit `ambiguous`. L’absence de règle produit `not-found`.

Ainsi `8471 30 00` est résolu à 4 % / 2,5 %, alors que `8517 13 00`, bien qu’il possède une ligne générale, reste ambigu à cause de la ligne EX portant le même code. Aucun taux ambigu n’est injecté dans le moteur fiscal.

## Séparation serveur/client

Le JSON complet est importé uniquement par `src/server/reunion-tariff-dataset.ts`, marqué `server-only`. Le Client Component appelle `GET /api/tariffs/reunion` avec code et date. La route Node effectue le lookup et renvoie un résultat compact. Les chunks client ne contiennent donc pas le tarif complet.

## Comparaison RITA et limites

RITA reste une source officielle distincte. Aucun export vérifié de ses mesures OM/OMR n’a pu être obtenu ; la comparaison ligne à ligne n’a donc pas été réalisée. Il n’existe à ce stade ni divergence constatée ni preuve de concordance. Le projet ne dépend pas d’un endpoint RITA interne non documenté et ne corrige jamais automatiquement une source par l’autre.

Autres limites : bonne classification à la charge de l’utilisateur, EX/SAUF non interprétés, snapshot non valable après le 1er octobre 2026 sans nouvelle revue, date d’effet qualifiée à partir des formalités de publication/transmission, arrondi fiscal encore provisoire et résultat non opposable.
