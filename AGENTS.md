# Consignes pour travailler sur Combien

## Périmètre actuel — V0.2a expérimentale

Lire `docs/PRODUCT.md` et `docs/FISCAL_MODEL.md` avant toute évolution métier.

Le seul scénario couvert est celui d’un particulier consommateur qui achète une marchandise ordinaire auprès d’un vendeur professionnel, avec expédition depuis la France métropolitaine vers La Réunion. Le prix produit est fourni hors TVA métropolitaine. Sont exclus : accises, véhicules, achats directs depuis un pays tiers et toute autre origine ou destination.

Les taux d’octroi de mer (OM) et d’octroi de mer régional (OMR) sont obligatoirement saisis par l’utilisateur. Ne jamais ajouter de table, de taux OM/OMR par défaut ni présenter ces valeurs comme un tarif officiel. Le taux TVA et le seuil de franchise appartiennent à un profil fiscal daté et versionné.

Aucune base de données, authentification, API externe, collecte par scraping, IA, comparaison de prix locaux ou infrastructure supplémentaire sans besoin produit validé.

## Architecture, monnaie et fiscalité

- Utiliser Next.js App Router et TypeScript strict.
- Garder React responsable de l’interaction et de l’affichage uniquement.
- Placer tous les calculs, conversions et validations dans `src/domain/landed-cost/`, indépendant de React, Next.js et du réseau.
- Représenter les montants par `Cents` : centimes entiers sûrs, positifs ou nuls. Utiliser `parseEuroAmount` ou `centsFromInteger` pour les construire.
- Représenter les taux par `FiscalRate` en points de base entiers. Un point de base vaut exactement 0,01 %. Ne jamais calculer un montant ou un taux fiscal avec un flottant JavaScript.
- Employer `bigint` pour les produits et additions intermédiaires, puis refuser tout résultat supérieur à `Number.MAX_SAFE_INTEGER`.
- Centraliser tout arrondi dans `applyFiscalRate`. La stratégie V0.2a est une convention technique provisoire, pas une règle fiscale juridiquement confirmée.
- Conserver explicitement OM et OMR hors de la base TVA. Toute modification de cette composition exige un test dédié et une source juridique.
- Distinguer les frais accessoires intégrables à la base TVA des frais privés de traitement/dédouanement du transporteur. Ne jamais libeller ces derniers comme une taxe.
- Versionner toute évolution de taux, seuil, date ou arrondi dans un `FiscalProfile` et mettre à jour les sources de `docs/FISCAL_MODEL.md`.
- Ne pas inventer de règle fiscale. Une règle non confirmée doit être marquée comme hypothèse/provisoire et ne peut devenir silencieusement une vérité métier.

## Interface

Interface en français, utilisable au clavier et sur mobile. Associer les labels aux champs, relier les erreurs avec `aria-describedby`, placer le focus sur la première erreur et annoncer le résultat. Effacer un ancien résultat dès qu’une entrée change.

L’avertissement sur la saisie manuelle des taux OM/OMR doit rester visible à proximité des champs. La ventilation doit distinguer taxes, frais privés, total et bases de calcul.

## Validation avant livraison

Depuis la racine du dépôt :

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Corriger tous les échecs. Après une modification du parcours, vérifier aussi le formulaire dans un navigateur desktop et mobile, les cas de franchise, centimes, erreurs, recalcul et l’absence d’erreur console. Ne pas déclarer une commande réussie si elle n’a pas été exécutée.

Conserver le lockfile npm, documenter les commandes dans `README.md` et les changements de modèle dans `docs/PRODUCT.md` et `docs/FISCAL_MODEL.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
