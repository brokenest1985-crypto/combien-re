# Consignes pour travailler sur Combien

## Périmètre actuel — V0.2b1 expérimentale

Lire `docs/PRODUCT.md`, `docs/FISCAL_MODEL.md` et `docs/RITA_DATA.md` avant toute évolution métier ou tarifaire.

Le seul scénario couvert est celui d’un particulier consommateur qui achète une marchandise ordinaire à un vendeur professionnel, avec expédition depuis la France métropolitaine vers La Réunion et prix produit hors TVA métropolitaine. Accises, véhicules, achats directs depuis un pays tiers et autres origines/destinations sont exclus.

La nomenclature douanière est saisie par l’utilisateur. La V0.2b1 peut chercher OM/OMR dans un dataset issu d’un export officiel RITA, daté et importé dans le dépôt. Elle ne classe pas le produit. La saisie manuelle des taux reste disponible. Ne jamais présenter RITA ou Combien comme juridiquement opposable.

## Architecture, monnaie et fiscalité

- Utiliser Next.js App Router et TypeScript strict.
- Garder React responsable de l’interaction et de l’affichage, sans formule fiscale.
- Garder `src/domain/landed-cost/` indépendant de RITA, de React, de Next.js et du réseau.
- Placer la résolution pure dans `src/domain/tariffs/` et les formats de fichier dans `scripts/rita/`.
- Représenter les montants en `Cents`, les taux en `FiscalRate` (points de base entiers) et utiliser `bigint` pour les intermédiaires monétaires. Aucun flottant pour un calcul monétaire ou fiscal.
- Conserver explicitement OM/OMR hors de la base TVA et les frais privés du transporteur hors des taxes.
- Centraliser l’arrondi dans `applyFiscalRate`. La stratégie actuelle est provisoire et non juridiquement confirmée.
- Versionner les taux, seuils, dates et règles via des profils ou datasets explicites.

## Données RITA

- Source tarifaire autorisée : exclusivement l’Encyclopédie tarifaire RITA de la DGDDI.
- Ne jamais scraper le HTML ni dépendre d’un endpoint interne non documenté.
- Ne jamais créer une table OM/OMR supposée officielle à partir d’exemples ou de mémoire.
- Conserver nomenclature, type de mesure, code taxe, taux exact, territoire, dates, code additionnel, condition et provenance de ligne.
- Une ligne inconnue bloque l’import ; elle ne doit jamais disparaître silencieusement.
- Une pluralité de mesures, un code additionnel ou une condition produit un statut explicite `ambiguous` ; ne choisir ni le premier, ni le plus haut, ni le plus bas.
- Ne pas remonter automatiquement vers une nomenclature parente sans règle officielle justifiée.
- Les fixtures sous `test/fixtures/rita/` sont synthétiques, techniques et interdites dans le bundle applicatif.
- `src/data/rita-tariffs.generated.json` ne peut devenir disponible qu’après import et revue d’un fichier officiel contrôlé.

## Interface

L’interface est en français, utilisable au clavier et sur mobile. Associer labels et champs, annoncer les erreurs/résultats et effacer un calcul périmé. Afficher l’avertissement de saisie manuelle, le statut de résolution, les ambiguïtés et la provenance RITA. Ne jamais calculer automatiquement après une résolution ambiguë.

## Validation avant livraison

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Après modification du parcours, vérifier aussi desktop, mobile, cas manuels, lookup disponible/indisponible et console navigateur. Tester l’import avec un vrai export si accessible. Ne jamais annoncer une validation non exécutée.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
