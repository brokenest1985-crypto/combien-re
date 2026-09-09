# Combien

Premier prototype pour préparer un achat livré à La Réunion : **prix du produit + frais de livraison**.

**Prototype — taxes et octroi de mer non encore pris en compte.** Le résultat est provisoire et ne constitue pas une estimation fiscale du coût final.

## Prérequis

- Node.js **22.12 ou supérieur** (Node.js 22 recommandé ; `.nvmrc` fourni).
- npm (fourni avec Node.js).

Aucune variable d’environnement, clé API, base de données ou inscription n’est nécessaire. L’installation nécessite un accès à npm ; le calcul lui-même ne fait aucun appel réseau.

## Installer et démarrer

Depuis la racine du dépôt `combien-re` :

```bash
npm ci
npm run dev
```

Ouvrir **http://localhost:3000** dans le navigateur. Arrêter le serveur avec `Ctrl+C`.

Si le port 3000 est occupé : `npm run dev -- --port 3001`, puis ouvrir http://localhost:3001.

## Tester et valider

```bash
# Tests métier, une exécution
npm test

# Tests en continu pendant le développement
npm run test:watch

# Génération des types Next.js et vérification TypeScript stricte
npm run typecheck

# ESLint, aucun avertissement accepté
npm run lint

# Build de production
npm run build
```

Pour essayer le build de production :

```bash
npm run build
npm start
```

Ouvrir http://localhost:3000. Arrêter le serveur de développement avant de lancer celui de production sur le même port.

## Essai rapide dans le navigateur

1. Saisir `100` et `20`, puis cliquer sur **Calculer** : `Coût provisoire rendu : 120,00 €`.
2. Saisir `100` et `0` : `100,00 €`.
3. Saisir `19,99` et `4,95` : `24,94 €`.
4. Saisir `0.10` et `0.20` : exactement `0,30 €`.
5. Essayer `-1`, `abc`, un champ vide ou `1,234` : un message explique l’erreur et aucun total n’est affiché.
6. Modifier un montant après un calcul : le résultat précédent disparaît jusqu’au prochain calcul. La touche Entrée permet aussi de calculer.

Les deux champs sont obligatoires ; saisir `0` pour une livraison offerte. Virgule et point sont acceptés comme séparateur décimal, avec un ou deux chiffres après le séparateur. Les espaces autour de la saisie sont ignorés. Les séparateurs de milliers, symboles monétaires, exposants et décimales supplémentaires sont refusés.

## Choix techniques et structure

Next.js **16.3.4** (version du canal npm `latest` au démarrage du projet), App Router, React 19, TypeScript strict, ESLint et Vitest. Le fichier `package-lock.json` verrouille les versions pour `npm ci`.

Le build utilise explicitement l’API TypeScript stable (`experimental.useTypeScriptCli: false`) : le mode CLI activé par défaut dans cette version de Next.js ne restitue pas la sortie de `tsc --showConfig` dans certains environnements WSL. Le typecheck autonome reste exécuté avec `tsc --noEmit`.

```text
src/
  app/
    layout.tsx           Métadonnées et langue française
    page.tsx             Page d’accueil (Server Component)
    cost-calculator.tsx  Formulaire interactif (Client Component)
    globals.css          Styles adaptatifs sans bibliothèque UI
  domain/landed-cost/
    money.ts             Conversion, validation et formatage monétaires
    calculate.ts         Calcul pur, indépendant de React et Next.js
    index.ts             Exports du module métier
    landed-cost.test.ts  Tests métier et limites numériques
docs/PRODUCT.md          Périmètre et évolutions du produit
AGENTS.md                Consignes de développement
```

Les montants sont des **centimes entiers sûrs**, typés `Cents`. Les chaînes sont converties directement en chiffres de centimes : pas de `parseFloat`, de multiplication d’euros décimaux par 100, ni d’arrondi. L’addition et les entrées sont contrôlées avec `Number.isSafeInteger`. La limite technique d’un montant **et du total** est `9 007 199 254 740 991` centimes. Le formatage utilise une découpe de chaîne et préserve donc chaque centime, même à cette limite.

Le module métier reçoit un objet nommé et retourne `totalCents`. Il pourra évoluer sans déplacer les règles dans le formulaire. Aucune abstraction fiscale ni règle fictive n’est ajoutée à ce stade. Tout le calcul s’effectue dans le navigateur ; aucune saisie n’est conservée.

## Vercel

Projet Next.js standard compatible Vercel, sans configuration spécifique : importer le dépôt, conserver le preset **Next.js**, choisir Node.js **22.x**, utiliser `npm ci` pour l’installation et `npm run build` pour le build. Laisser le dossier de sortie par défaut. Aucune variable d’environnement requise. Cette tâche ne déploie pas automatiquement le site.

Les commandes suivent la [documentation officielle Next.js](https://nextjs.org/docs/app/getting-started/installation). ESLint est exécuté séparément du build.

## Suite

Voir [docs/PRODUCT.md](docs/PRODUCT.md) : TVA, octroi de mer, octroi de mer régional, catégories fiscales, frais de dossier, règles datées, puis comparaison locale. **Aucun de ces calculs ou services n’est implémenté dans cette version.**
