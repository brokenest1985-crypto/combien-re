# Consignes pour travailler sur Combien

## Périmètre actuel

Conserver un prototype simple : prix du produit + livraison, sur une seule page. Afficher clairement « Prototype — taxes et octroi de mer non encore pris en compte. ». Lire `docs/PRODUCT.md` avant une évolution du périmètre.

Aucune base de données, authentification, API externe, collecte par scraping, IA ou fiscalité réelle dans cette première version. Ne pas ajouter d’infrastructure ou de bibliothèque sans besoin concret.

## Architecture et monnaie

- Utiliser Next.js App Router et TypeScript strict.
- Garder les composants React responsables de l’interaction et de l’affichage uniquement.
- Placer les calculs, conversions et validations de montants dans `src/domain/landed-cost/`, indépendant de React, Next.js et du réseau.
- Représenter les montants par le type `Cents` (entiers sûrs, positifs ou nuls). Utiliser `parseEuroAmount` ou `centsFromInteger` pour les construire.
- Ne jamais convertir une saisie en nombre flottant d’euros. Ne pas utiliser `parseFloat` ou `Math.round(euros * 100)`.
- Vérifier les limites des montants et du total. Refuser les décimales supplémentaires au lieu de les arrondir silencieusement.
- Ne pas inventer de taux fiscaux. Une future fiscalité devra avoir ses sources, dates d’effet, règles d’arrondi explicites et tests avant activation.

## Interface

Français, utilisable au clavier et sur mobile. Associer les labels aux champs, relier les erreurs avec `aria-describedby` et annoncer le résultat. Ne pas laisser un ancien résultat visible après modification des entrées.

## Validation avant livraison

Depuis la racine du dépôt :

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Corriger les échecs avant livraison. Après une modification du parcours, vérifier aussi le formulaire dans un navigateur : succès, centimes, erreurs et recalcul. Ne pas déclarer une commande réussie si elle n’a pas été exécutée.

Conserver le lockfile npm, documenter les nouvelles commandes dans `README.md` et les changements de périmètre dans `docs/PRODUCT.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
