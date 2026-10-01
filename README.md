# Combien

Prototype V0.2b2 pour estimer le coût rendu à La Réunion d’un achat vendu hors TVA métropolitaine et expédié depuis la France métropolitaine.

Cette version peut rechercher automatiquement les taux externes OME/OMER dans le tarif consolidé publié par le Conseil régional de La Réunion avec la délibération `DCP2026_0296`. Le snapshot est vérifié du 12 juin au 10 septembre 2026. La nomenclature reste fournie par l’utilisateur et les cas qualifiés ou multiples restent volontairement ambigus.

Le résultat est une estimation indicative, jamais une liquidation douanière juridiquement opposable. Voir [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/FISCAL_MODEL.md`](docs/FISCAL_MODEL.md), [`docs/REGION_REUNION_TARIFF.md`](docs/REGION_REUNION_TARIFF.md) et [`docs/RITA_DATA.md`](docs/RITA_DATA.md).

## Prérequis

- Node.js **22.x** (`.nvmrc` est fourni) ;
- npm, fourni avec Node.js.

Aucune variable d’environnement, clé API, base de données ou inscription n’est nécessaire.

## Installation et lancement

Depuis la racine du dépôt :

```bash
npm ci
npm run dev
```

Ouvrir http://localhost:3000. Si le port est occupé :

```bash
npm run dev -- --port 3001
```

## Tests, lint, typecheck et build

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Pour tester le build de production :

```bash
npm start
```

Pour travailler en tests continus :

```bash
npm run test:watch
```

## Réimporter le tarif Région Réunion

Télécharger le PDF officiel sans le modifier, puis exécuter :

```bash
npm run reunion-tariff:import -- \
  --file /chemin/recueil_deliberations_cperma_du_05_juin_2026.pdf \
  --manifest data-sources/reunion-tariff/2026-06-12/source.json \
  --output data-sources/reunion-tariff/2026-06-12/dataset.json \
  --report data-sources/reunion-tariff/2026-06-12/import-report.json
```

L’importeur exige le SHA-256 du manifest, les 321 pages de l’annexe 1 et des paires OME/OMER complètes. Il utilise le texte natif du PDF, jamais l’OCR. La provenance du fichier téléchargé reste à contrôler humainement. Le PDF de 63 Mio n’est pas versionné.

L’import RITA expérimental reste disponible séparément :

```bash
npm run rita:import -- --file /chemin/export-rita-mesures.csv --date 2026-09-09
```

## Essai chiffré

Rechercher la nomenclature `8471 30 00` au `10/09/2026` : le tarif Région fournit OME 4 % et OMER 2,5 %. Avec un produit à 100 €, livraison 20 €, assurance 5 € et frais transporteur 10 €, le calcul donne : valeur en douane 125 €, OME 5 €, OMER 3,13 €, TVA 8,5 % sur 125 € hors OME/OMER soit 10,63 €, total estimé **153,76 €**.

## Architecture

```text
data-sources/reunion-tariff/  Manifest, dataset normalisé et rapport versionnés
scripts/reunion-tariff/       Extraction PDF native et validation de provenance
scripts/rita/                 Import CSV RITA conservé pour validation croisée future
src/app/                      Interface App Router et route HTTP interne compacte
src/server/                   Chargement server-only du dataset complet
src/domain/landed-cost/       Moteur fiscal pur, indépendant des sources tarifaires
src/domain/tariffs/           Modèles, normalisation, lookup et orchestration purs
```

Le navigateur n’importe jamais le JSON de 5,6 Mio. Il appelle `/api/tariffs/reunion`; la route Node charge le snapshot côté serveur et ne renvoie que le résultat utile. Seul `resolved` peut injecter des `FiscalRate` dans `calculateLandedCost`. `ambiguous`, `not-found` et `unsupported` ne déclenchent aucun calcul.

## Vercel

Importer le dépôt et sélectionner la branche `feature/reunion-official-tariff`, le preset **Next.js**, Node.js **22.x**, `npm ci` puis `npm run build`. Aucune variable d’environnement n’est requise. Cette tâche ne déploie, ne pousse et ne fusionne pas la branche.

## Volontairement reporté

Classification automatique, interprétation des EX/SAUF, récupération automatique des nouveaux actes, validation croisée RITA, droits pays tiers, accises, véhicules, prix locaux, base de données, comptes et extension navigateur restent hors périmètre. La règle fiscale d’arrondi demeure provisoire.
