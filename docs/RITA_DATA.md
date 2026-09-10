# Données tarifaires RITA — V0.2b1

Statut du bundle applicatif : **indisponible**. Date de référence visée : **9 septembre 2026**.

## Source et avertissement

RITA est l’Encyclopédie tarifaire de la Direction générale des douanes et droits indirects. C’est l’unique source tarifaire autorisée pour la V0.2b1 : [nomenclatures](https://www.douane.gouv.fr/rita-encyclopedie/public/nomenclatures/init.action), [suivi des mesures](https://form.douane.gouv.fr/rita-encyclopedie/public/experts/mesures/init.action) et [téléchargements experts](https://form.douane.gouv.fr/rita-encyclopedie/public/experts/telechargements/init.action).

Les informations RITA sont indicatives ; les textes publiés au Journal officiel font foi. Combien ne produit donc jamais une liquidation juridiquement opposable.

## Ce qui a réellement été observé

L’interface publique RITA v5.3.1 accepte une nomenclature à 2, 4, 6, 8 ou 10 chiffres et une date. Le suivi avancé expose le domaine « Octroi de mer », le territoire `REUNI` et notamment les types `OEA`, `OEB`, `ORA` et `ORB`. La présence de codes taxe distincts, dont un taux OMR majoré pour La Réunion annoncé par la Douane, confirme qu’un simple couple statique n’est pas suffisant.

Les pages de téléchargement observées proposent CSV, XML ou XLS pour des nomenclatures et référentiels, ainsi qu’un téléchargement VFI. VFI signifie « valeurs forfaitaires à l’importation » et n’est pas un export générique des taux OM/OMR. Deux téléchargements officiels tentés dans l’environnement (VFI chapitre 84 et nomenclature chapitre 84) n’ont produit aucun fichier exploitable. Aucun schéma réel d’export des **mesures** OM/OMR n’a donc pu être contrôlé.

Conséquences :

- aucun taux réel n’est inventé ou embarqué ;
- `src/data/rita-tariffs.generated.json` indique `unavailable` ;
- `test/fixtures/rita/measures.synthetic.csv` est explicitement synthétique et uniquement utilisée par les tests ;
- l’adaptateur CSV est une enveloppe stricte à confronter au premier export officiel réellement obtenu.

## Obtenir manuellement le fichier

1. Ouvrir le [suivi des mesures RITA](https://form.douane.gouv.fr/rita-encyclopedie/public/experts/mesures/init.action).
2. Choisir la date `09/09/2026`, le domaine « Octroi de mer », le territoire La Réunion (`REUNI`) et, pour limiter la taille, un chapitre électronique pertinent tel que 84.
3. Demander un export officiel CSV/XML des mesures s’il est proposé au compte ou au parcours utilisé. Ne pas enregistrer le HTML des résultats et ne pas appeler un endpoint interne découvert dans les outils navigateur.
4. Conserver le fichier original sans modification. Si le portail public ne fournit toujours qu’un export VFI ou de nomenclature, demander à la DGDDI l’export officiel des mesures correspondant : ces fichiers ne peuvent pas remplacer les mesures OM/OMR.
5. Vérifier que le fichier contient bien nomenclature, type de mesure, code taxe, taux, territoire et dates de validité avant de lancer l’import.

Le fichier attendu est donc **un export officiel CSV de mesures OM/OMR**, et non un export VFI, une page HTML ou la fixture de test.

La personne qui réalise l’import doit obtenir ce fichier directement depuis RITA/DGDDI et en contrôler elle-même la provenance avant utilisation. Le statut interne neutre `rita-import` signifie uniquement que le fichier a été traité par l’importeur RITA de Combien : il ne constitue pas une certification de provenance. Le SHA-256 conservé permet d’identifier précisément le fichier importé et d’en contrôler l’intégrité, mais il ne prouve pas cryptographiquement que ce fichier provient de RITA ou de la DGDDI.

## Lancer l’import

```bash
npm run rita:import -- --file /chemin/export-rita-mesures.csv --date 2026-09-09
```

Sortie par défaut : `src/data/rita-tariffs.generated.json`. Une autre sortie peut servir à l’inspection :

```bash
npm run rita:import -- --file /chemin/export-rita-mesures.csv --date 2026-09-09 --out /tmp/rita-review.json
```

Le parseur reconnaît des variantes normalisées des colonnes suivantes : `NOMENCLATURE`, `TYPE_MESURE`, `CODE_TAXE`, `TAUX`, `TERRITOIRE`, `DATE_DEBUT`, `DATE_FIN`, `CODE_ADDITIONNEL`, `CODE_CONDITION`, et éventuellement `REFERENCE`. Les en-têtes sont insensibles à la casse, aux accents et aux séparateurs usuels. Le séparateur CSV peut être `;` ou `,`, avec guillemets CSV.

Cette liste correspond au contrat conservateur de V0.2b1, pas à un schéma RITA officiellement confirmé. Si le véritable export emploie d’autres colonnes, l’import doit échouer ; il faut alors adapter et tester le parseur sans perdre de donnée.

## Normalisation et format interne

- espaces de nomenclature retirés, chiffres inchangés ;
- dates converties en ISO `AAAA-MM-JJ`, bornes inclusives ;
- pourcentage converti textuellement en points de base entiers (`6,50 %` → `650`) ;
- `OEA`/`OEB` normalisés en OM, `ORA`/`ORB` en OMR ;
- `REUNI`, `REUNION` et `LA REUNION` normalisés en `REUNION` ;
- code taxe, code additionnel, condition, ligne source et champs bruts conservés ;
- fichier source identifié par son nom et son SHA-256 ;
- mesures triées et identifiant dérivé de la date et du hash, sans horodatage instable.

Exemple **structurel synthétique**, qui ne représente aucun tarif réel :

```json
{
  "nomenclatureCode": "8400000001",
  "measureType": "octroi-de-mer",
  "measureTypeCode": "OEA",
  "taxCode": "SYN-OM",
  "rateBasisPoints": 650,
  "territory": "REUNION",
  "validFrom": "2026-01-01",
  "validTo": "2026-12-31",
  "additionalCode": null,
  "conditionCode": null
}
```

Toute ligne non comprise est rapportée avec son numéro et ses champs bruts, puis l’import s’arrête **sans écrire** de dataset. Une fixture contenant les mots `synthetic` ou `synthétique` est aussi refusée par la commande d’import.

## Résolution et ambiguïtés

`lookupReunionTariffs` est pure. Elle filtre les dates, exige une correspondance exacte et retourne `resolved`, `ambiguous`, `not-found` ou `unsupported`. Un résultat résolu conserve les deux mesures sources. Un code parent avec descendants, plusieurs taux, une condition ou un code additionnel reste ambigu. Aucun taux n’est choisi arbitrairement et l’orchestrateur refuse d’appeler `calculateLandedCost` tant que le lookup n’est pas résolu.

## Limites

- Aucun dataset officiel daté du 09/09/2026 n’est livré dans cette branche.
- Le format CSV réel des mesures doit encore être rencontré et validé.
- Les conditions RITA et codes additionnels sont détectés mais pas résolus.
- L’exactitude de la nomenclature fournie demeure à la charge de l’utilisateur.
- Les évolutions RITA postérieures au dataset ne sont pas récupérées automatiquement.
- Le système ne remplace ni la Douane, ni un renseignement tarifaire contraignant, ni la facture du transporteur.
