# Consignes pour travailler sur Combien

## Périmètre actuel — V0.2b2 expérimentale

Lire `docs/PRODUCT.md`, `docs/FISCAL_MODEL.md`, `docs/REGION_REUNION_TARIFF.md` et `docs/RITA_DATA.md` avant toute évolution métier ou tarifaire.

Le seul scénario couvert est celui d’un particulier consommateur qui achète une marchandise ordinaire à un vendeur professionnel, avec expédition depuis la France métropolitaine vers La Réunion et prix produit hors TVA métropolitaine. Accises, véhicules, achats directs depuis un pays tiers et autres origines/destinations sont exclus.

La nomenclature douanière est saisie par l’utilisateur. La V0.2b2 peut rechercher OME/OMER dans un snapshot officiel Région Réunion vérifié jusqu’au 10 septembre 2026. Elle ne classe pas le produit. La saisie manuelle reste disponible. Ne jamais présenter une source tarifaire ou Combien comme juridiquement opposable.

## Architecture, monnaie et fiscalité

- Utiliser Next.js App Router et TypeScript strict.
- Garder React responsable de l’interaction et de l’affichage, sans formule fiscale.
- Garder `src/domain/landed-cost/` indépendant de RITA, de la Région, de React, de Next.js et du réseau.
- Placer les résolutions pures dans `src/domain/tariffs/` et les formats de fichiers dans leurs adaptateurs `scripts/rita/` ou `scripts/reunion-tariff/`.
- Charger tout dataset complet dans un module `server-only`. Ne jamais l’importer depuis un Client Component.
- Représenter les montants en `Cents`, les taux en `FiscalRate` (points de base entiers) et utiliser `bigint` pour les intermédiaires monétaires. Aucun flottant pour un calcul monétaire ou fiscal.
- Conserver explicitement OME/OMER hors de la base TVA et les frais privés du transporteur hors des taxes.
- Centraliser l’arrondi dans `applyFiscalRate`. La stratégie actuelle est provisoire et non juridiquement confirmée.

## Données tarifaires

- Distinguer explicitement les sources `REGION_REUNION` et `RITA` ; ne jamais transposer aux données Région des codes de mesure propres à RITA.
- Le snapshot Région actif provient de l’annexe 1 de `DCP2026_0296`. Son PDF n’est pas versionné ; manifest, SHA-256, dataset et rapport le sont.
- Toute réimportation doit valider le domaine officiel, le hash attendu, l’extraction native sans OCR, les 321 pages et la structure complète.
- Conserver code publié et normalisé, niveau, libellé, taux exacts, qualification, observations, page et provenance.
- Une ligne EX/SAUF, une observation, un doublon ou un parent non démontré produit `ambiguous`. Ne choisir ni le premier, ni le plus haut, ni le plus bas.
- Ne jamais hériter un taux parent sans preuve structurelle officielle.
- Un snapshot ne couvre aucune date antérieure à `effectiveFrom`, postérieure à `effectiveTo`, ni postérieure à `verifiedThrough`.
- L’import RITA reste séparé, strict et indisponible faute d’export de mesures vérifié. Ses fixtures synthétiques sont interdites dans le bundle applicatif.

## Interface

L’interface est en français, utilisable au clavier et sur mobile. Associer labels et champs, annoncer les erreurs/résultats et effacer un calcul périmé. Afficher source, date, délibération, statut et avertissement indicatif. Ne jamais calculer automatiquement après une résolution ambiguë.

## Validation avant livraison

```bash
npm ci
npm test
npm run typecheck
npm run lint
npm run build
```

Après modification du parcours, vérifier desktop, mobile, lookup résolu/ambigu/non trouvé, saisie manuelle et console navigateur. Contrôler aussi que le dataset complet est absent des chunks JavaScript clients. Ne jamais annoncer une validation non exécutée.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
