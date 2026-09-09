# Combien

Prototype V0.2a pour estimer le coût rendu à La Réunion d’un achat expédié depuis la France métropolitaine. Le moteur ventile valeur en douane, octroi de mer, octroi de mer régional, TVA Réunion et frais privés du transporteur.

**Mode expérimental : les taux OM/OMR sont saisis manuellement. Le résultat n’est pas une liquidation officielle.** Voir le [périmètre produit](docs/PRODUCT.md) et le [modèle fiscal documenté](docs/FISCAL_MODEL.md).

## Prérequis

- Node.js **22.12 ou supérieur** (Node.js 22 recommandé ; `.nvmrc` fourni) ;
- npm, fourni avec Node.js.

Aucune variable d’environnement, clé API, base de données ou inscription n’est nécessaire. L’installation a besoin d’un accès au registre npm ; le calcul ne fait ensuite aucun appel externe.

## Installer les dépendances

Depuis la racine du dépôt `combien-re` :

```bash
npm ci
```

## Démarrer en local

```bash
npm run dev
```

Ouvrir **http://localhost:3000**. Arrêter avec `Ctrl+C`. Si le port est occupé :

```bash
npm run dev -- --port 3001
```

Puis ouvrir http://localhost:3001.

## Tests et validation

Exécuter les tests unitaires une fois :

```bash
npm test
```

Les relancer automatiquement pendant le développement :

```bash
npm run test:watch
```

Lancer le typecheck TypeScript strict :

```bash
npm run typecheck
```

Lancer ESLint sans tolérer d’avertissement :

```bash
npm run lint
```

Créer le build de production :

```bash
npm run build
```

Tester ce build localement :

```bash
npm start
```

Ouvrir http://localhost:3000. Arrêter auparavant le serveur de développement s’il utilise ce port.

## Essai chiffré dans le navigateur

Saisir :

| Champ | Valeur |
| --- | ---: |
| Prix produit HT | 100,00 € |
| Livraison | 20,00 € |
| Assurance | 5,00 € |
| Taux OM | 6,50 % |
| Taux OMR | 2,50 % |
| Frais transporteur | 10,00 € |

Le résultat attendu avec la convention d’arrondi V0.2a est :

| Poste | Résultat |
| --- | ---: |
| Valeur en douane | 125,00 € |
| OM | 8,13 € |
| OMR | 3,13 € |
| TVA à 8,5 %, calculée sur 125,00 € hors OM/OMR | 10,63 € |
| Coût total estimé rendu | **156,89 €** |

Pour tester la franchise, conserver des taux non nuls et saisir successivement `21,99`, `22,00`, puis `22,01` comme prix produit HT. Les deux premiers cas affichent trois taxes nulles ; le troisième est taxé. Pour tester la validation, essayer `-1`, `abc`, un champ obligatoire vide ou un taux à trois décimales.

## Architecture

```text
src/
  app/
    layout.tsx           Métadonnées et langue française
    page.tsx             Page d’accueil (Server Component)
    cost-calculator.tsx  Formulaire et ventilation (Client Component)
    globals.css          Styles desktop/mobile sans bibliothèque UI
  domain/landed-cost/
    money.ts             Centimes, parsing, formatage, additions sûres
    fiscal-rate.ts       Taux exacts et stratégie d’arrondi centrale
    fiscal-profile.ts    Configuration fiscale datée/versionnée
    calculate.ts         Moteur pur et ventilation complète
    index.ts             API publique du module métier
    landed-cost.test.ts  Tests unitaires du modèle et des limites
docs/
  PRODUCT.md             Périmètre fonctionnel
  FISCAL_MODEL.md        Règles, sources, hypothèses et limites
AGENTS.md                Consignes de contribution
```

React ne contient aucune formule fiscale. Les montants sont des centimes entiers `Cents`, les taux des points de base entiers `FiscalRate`, et les calculs intermédiaires utilisent `bigint`. Le moteur refuse les valeurs hors de la plage sûre au lieu de les approximer. Les taux OM/OMR sont uniquement des entrées : aucun tarif OM/OMR officiel ou par défaut n’existe dans le dépôt.

Le profil `reunion-high-tech-v0.2a-2026-09-09` centralise le taux TVA de démonstration à 8,5 %, le seuil de franchise à 22 € et la stratégie d’arrondi provisoire. Le détail et les sources figurent dans [`docs/FISCAL_MODEL.md`](docs/FISCAL_MODEL.md).

Le build force actuellement l’API TypeScript stable (`experimental.useTypeScriptCli: false`) : le mode CLI de Next.js ne restitue pas correctement `tsc --showConfig` dans certains environnements WSL. Le typecheck autonome reste exécuté avec `tsc --noEmit`.

## Vercel

L’application est un projet Next.js App Router standard compatible Vercel. Importer le dépôt et sélectionner la branche `feature/fiscal-engine`, conserver le preset **Next.js**, Node.js **22.x**, `npm ci` pour l’installation et `npm run build` pour le build. Aucune variable d’environnement n’est nécessaire. Cette branche n’est pas déployée automatiquement par cette tâche.

## Ce qui reste volontairement à faire

Pas de code douanier automatique, connexion RITA, table réelle OM/OMR, scraping, prix locaux, base de données, authentification, achat pays tiers, accises, véhicules ou extension navigateur. La règle exacte d’arrondi doit encore être juridiquement confirmée. Voir [`docs/PRODUCT.md`](docs/PRODUCT.md) pour les étapes possibles.
