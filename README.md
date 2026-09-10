# Combien

Prototype V0.2b1 pour estimer le coût rendu à La Réunion d’un achat expédié depuis la France métropolitaine. Le moteur fiscal ventile valeur en douane, octroi de mer (OM), octroi de mer régional (OMR), TVA Réunion et frais privés du transporteur.

La V0.2b1 ajoute une résolution tarifaire datée par nomenclature à partir d’un export officiel RITA importé localement. Aucun export officiel de mesures OM/OMR n’a cependant pu être récupéré et vérifié dans l’environnement de développement : la recherche automatique livrée est donc désactivée par défaut et la saisie manuelle V0.2a reste disponible. Les fixtures synthétiques sont réservées aux tests.

RITA et le résultat de Combien ont un caractère indicatif : ils ne constituent pas une liquidation juridiquement opposable. Voir [`docs/PRODUCT.md`](docs/PRODUCT.md), [`docs/FISCAL_MODEL.md`](docs/FISCAL_MODEL.md) et [`docs/RITA_DATA.md`](docs/RITA_DATA.md).

## Prérequis

- Node.js **22.12 ou supérieur** (`.nvmrc` est fourni) ;
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

## Import RITA

Après obtention et contrôle d’un export officiel CSV contenant les mesures OM/OMR :

```bash
npm run rita:import -- --file /chemin/vers/export-rita.csv --date 2026-09-09
```

La sortie déterministe est `src/data/rita-tariffs.generated.json`. L’import échoue sans écrire de dataset si l’en-tête est invalide, si une ligne est inconnue ou si une fixture synthétique est détectée. Le fichier doit être revu avant commit. Les colonnes reconnues et le parcours de téléchargement sont détaillés dans [`docs/RITA_DATA.md`](docs/RITA_DATA.md).

## Essai chiffré manuel

Saisir :

| Champ | Valeur |
| --- | ---: |
| Prix produit HT | 100,00 € |
| Livraison | 20,00 € |
| Assurance | 5,00 € |
| Taux OM | 6,50 % |
| Taux OMR | 2,50 % |
| Frais transporteur | 10,00 € |

Résultat attendu avec l’arrondi provisoire V0.2a : valeur en douane 125,00 €, OM 8,13 €, OMR 3,13 €, TVA à 8,5 % sur 125,00 € hors OM/OMR 10,63 €, total **156,89 €**.

## Architecture

```text
scripts/rita/                  Adaptateur et commande d’import CSV RITA
src/app/                       Interface App Router desktop/mobile
src/data/                      Bundle tarifaire généré (indisponible par défaut)
src/domain/landed-cost/        Moteur fiscal pur, indépendant de RITA
src/domain/tariffs/            Dataset, normalisation, lookup et orchestration
test/fixtures/rita/            Données synthétiques exclusivement techniques
docs/                          Produit, fiscalité et provenance RITA
```

Le flux automatique est strictement séparé : nomenclature → `lookupReunionTariffs` → `FiscalRate` OM/OMR → `calculateLandedCost`. Un statut `ambiguous`, `not-found` ou `unsupported` ne possède aucun résultat fiscal calculé. Les montants sont des centimes entiers, les taux des points de base entiers et les intermédiaires monétaires utilisent `bigint`.

## Vercel

Importer le dépôt et sélectionner la branche `feature/rita-tariffs`, le preset **Next.js**, Node.js **22.x**, `npm ci` et `npm run build`. Aucune variable d’environnement n’est requise. Cette tâche ne déploie ni ne fusionne la branche.

## Volontairement reporté

Classification automatique, table tarifaire exhaustive, connexion à un endpoint RITA interne, scraping, codes additionnels guidés, conditions complexes, droits pays tiers, accises, véhicules, prix locaux, base de données, comptes et extension navigateur restent hors périmètre. La règle fiscale d’arrondi demeure provisoire.
