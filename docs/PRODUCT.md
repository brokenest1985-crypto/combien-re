# Combien — périmètre produit

## Intention

Aider une personne à La Réunion à connaître le coût réel estimé d’un achat livré sur l’île et, à terme, à le comparer aux prix locaux.

## V0.2b2 — tarif officiel Région Réunion

La V0.2b2 conserve le moteur fiscal V0.2a et ajoute une source tarifaire réellement exploitable : le tarif externe consolidé OME/OMER annexé à la délibération Région Réunion `DCP2026_0296`. Le snapshot est applicable à compter du 12 juin 2026 et son état a été vérifié dans les publications régionales jusqu’au 1er octobre 2026. Il reste indicatif et ne garantit pas le montant liquidé.

Le scénario reste strict : particulier consommateur, vendeur professionnel, marchandise ordinaire vendue hors TVA métropolitaine, expédiée de France métropolitaine vers La Réunion. Accises, véhicules, pays tiers et régimes particuliers sont exclus.

## Parcours utilisateur

L’utilisateur saisit un code NC connu et une date. La classification automatique depuis un produit est hors périmètre.

- `resolved` renseigne OME/OMER depuis une correspondance exacte simple et expose libellé, date, source, délibération et page ;
- `ambiguous` signale qualification, exception, doublon ou parent non démontré et ne déclenche aucun calcul ;
- `not-found` indique qu’aucune règle n’a été trouvée ;
- `unsupported` signale une entrée invalide, un dataset absent ou une date non couverte/vérifiée.

La saisie manuelle des taux demeure le fallback expérimental. Le formulaire collecte prix HT, livraison, assurance et frais privés du transporteur. La TVA du profil de démonstration reste 8,5 %.

## Règles de résolution

Les espaces sont retirés sans changer les chiffres. Les niveaux à 2, 4, 6, 8 ou 10 chiffres sont conservés. Une correspondance exacte n’est résolue que si elle possède les deux taux, n’a ni EX/SAUF, ni observation, ni doublon.

La présence d’un parent tarifé ne prouve pas que tous ses descendants héritent du taux. Elle produit donc une ambiguïté. Le système n’infère jamais qu’un taux absent vaut 0 % : le zéro doit être explicite.

## Données, serveur et confidentialité

Le navigateur transmet uniquement nomenclature et date à une route interne Next.js. Le dataset complet reste côté serveur dans un fichier statique versionné ; aucune donnée tarifaire massive n’entre dans le JavaScript client. Il n’y a ni compte, cookie fonctionnel, base de données ni service tiers en production.

Les règles d’import, l’audit de source et l’échantillon humain sont dans [`REGION_REUNION_TARIFF.md`](REGION_REUNION_TARIFF.md). RITA est conservé comme source distincte pour une validation croisée future dans [`RITA_DATA.md`](RITA_DATA.md).

## Hors périmètre

Classification automatique ou IA, analyse d’URL produit, interprétation automatique des exceptions, scraping, actualisation réglementaire automatique, droits pays tiers, comparaison locale, PostgreSQL, authentification, application mobile et extension navigateur.

## Étapes suivantes envisagées

- acquérir un export RITA des mesures OM/OMR pour validation croisée ;
- modéliser les critères nécessaires aux EX/SAUF sans choix arbitraire ;
- poursuivre la revue des actes publiés après le 1er octobre 2026 et importer un nouveau snapshot dès qu’une modification tarifaire entre en vigueur ;
- faire confirmer l’arrondi et confronter des cas à des liquidations réelles ;
- traiter ultérieurement la classification et d’autres scénarios fiscaux.
