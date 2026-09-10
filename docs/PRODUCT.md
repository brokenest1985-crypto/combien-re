# Combien — périmètre produit

## Intention

Aider une personne à La Réunion à connaître le coût réel estimé d’un achat livré sur l’île et, à terme, à le comparer aux prix locaux.

## V0.2b1 — résolution tarifaire expérimentale

La V0.2b1 conserve le moteur fiscal V0.2a et ajoute une couche indépendante capable de retrouver un couple OM/OMR depuis une nomenclature connue, une date et un dataset RITA officiel importé. Elle ne constitue ni une liquidation douanière officielle ni une garantie du montant réclamé.

Le scénario reste strict : particulier consommateur, vendeur professionnel, marchandise ordinaire vendue hors TVA métropolitaine, expédiée de France métropolitaine vers La Réunion. Accises, véhicules, pays tiers et régimes particuliers sont exclus.

## Parcours utilisateur

L’utilisateur peut saisir un code NC/TARIC connu et une date, puis demander une recherche. La classification automatique depuis un produit est hors périmètre.

Si un dataset officiel est disponible :

- `resolved` renseigne OM/OMR et expose nomenclature, date, codes taxe et références ;
- `ambiguous` demande une précision et ne déclenche aucun calcul ;
- `not-found` indique qu’aucun couple complet n’est applicable ;
- `unsupported` signale une entrée non prise en charge.

Faute d’export officiel vérifié dans cette version du dépôt, la recherche est désactivée par défaut. L’utilisateur peut toujours saisir manuellement OM/OMR et calculer le coût comme en V0.2a. Le formulaire collecte aussi prix HT, livraison, assurance et frais privés du transporteur. La TVA du profil de démonstration reste 8,5 %.

## Règles de résolution

La comparaison normalise les espaces, sans modifier les chiffres. Seuls les niveaux RITA à 2, 4, 6, 8 ou 10 chiffres sont acceptés. Les dates de validité sont inclusives. Aucune remontée vers un parent n’est inventée.

Un code parent avec descendants, plusieurs mesures actives, une condition ou un code additionnel donnent une ambiguïté explicite. Le système n’infère pas qu’une mesure absente vaut 0 % : OM et OMR doivent chacun être présents, y compris avec un taux explicite nul.

## Données et confidentialité

Le calcul et la recherche se font localement dans le navigateur sur le bundle versionné. Aucune saisie n’est transmise. Il n’y a ni compte, cookie fonctionnel, base de données ni appel réseau de production. Voir [`RITA_DATA.md`](RITA_DATA.md) pour l’import et la traçabilité.

## Hors périmètre

Classification automatique ou IA, analyse d’URL produit, scraping, connexion à RITA en production, table exhaustive des taux, droits pays tiers, comparaison de prix locale, PostgreSQL, authentification, AliExpress, application mobile et extension navigateur.

## Étapes suivantes envisagées

- obtenir et valider un export officiel de mesures OM/OMR au 9 septembre 2026 ;
- adapter le parseur à son schéma constaté, puis versionner un chapitre électronique pertinent ;
- guider les codes additionnels et conditions sans choix arbitraire ;
- faire confirmer l’arrondi et confronter des cas à des liquidations réelles ;
- traiter ultérieurement la classification et d’autres scénarios fiscaux.
