# Combien — périmètre produit

## Intention

Aider une personne à La Réunion à connaître le coût réel estimé d’un achat livré sur l’île et, à terme, à le comparer aux prix locaux.

## V0.2a — moteur fiscal expérimental

Cette version permet de contrôler un premier modèle fiscal dans le navigateur. Elle ne constitue ni une liquidation douanière officielle ni une garantie du montant demandé à la livraison.

Le scénario couvert est volontairement étroit :

- particulier consommateur ;
- achat auprès d’un vendeur professionnel ;
- expédition depuis la France métropolitaine vers La Réunion ;
- marchandise ordinaire ;
- prix du produit facturé hors TVA métropolitaine ;
- aucune accise, aucun véhicule et aucun achat direct depuis un pays tiers.

Toute situation qui sort de cette liste sort aussi du modèle V0.2a.

## Parcours utilisateur

La page demande :

- prix du produit HT ;
- livraison jusqu’à La Réunion ;
- assurance facultative ;
- taux OM et OMR saisis manuellement ;
- frais privés du transporteur facultatifs.

Le taux de TVA du profil de démonstration est affiché à 8,5 %. Aucun taux OM ou OMR n’est prérempli ni déclaré officiel. Un avertissement permanent précise le caractère expérimental de leur saisie.

Après calcul, l’utilisateur voit le produit, le transport, l’assurance, la valeur en douane, OM, OMR, TVA Réunion, les frais privés du transporteur et le coût total estimé rendu. Un détail dépliable expose la valeur intrinsèque, la base OM/OMR et la base TVA hors OM/OMR.

Les champs monétaires acceptent le point ou la virgule et deux décimales au maximum. Les taux acceptent deux décimales de pourcentage au maximum. Les valeurs négatives, formats ambigus et dépassements d’entier sûr sont refusés. Modifier une entrée efface le résultat précédent.

## Règles de la version

Le moteur applique le modèle documenté dans [`FISCAL_MODEL.md`](FISCAL_MODEL.md). En synthèse :

1. valeur en douane = produit HT + transport jusqu’à l’entrée + assurance jusqu’à l’entrée ;
2. OM et OMR utilisent chacun cette valeur en douane ;
3. base TVA = valeur en douane + frais accessoires postérieurs à l’entrée susceptibles d’y entrer ;
4. OM et OMR sont explicitement exclus de la base TVA ;
5. les frais privés du transporteur sont ajoutés au total, sans être présentés comme une taxe ;
6. si la valeur intrinsèque du produit est inférieure ou égale au seuil configuré de 22 €, TVA, OM et OMR valent zéro ;
7. chaque taxe est arrondie par la stratégie centrale provisoire décrite dans le document fiscal.

L’interface V0.2a fixe les frais accessoires postérieurs à l’entrée à zéro, car ce champ ne fait pas encore partie du parcours. Le moteur les modélise séparément et les tests démontrent leur effet sur la seule base TVA.

## Données et confidentialité

Tout le calcul s’effectue localement dans le navigateur. Aucune saisie n’est transmise ni conservée. Il n’y a ni compte, ni base de données, ni API externe, ni cookie fonctionnel. Recharger la page efface les saisies.

## Hors périmètre

Ne sont pas développés dans cette version : code douanier automatique, connexion RITA, table réelle des taux OM/OMR, scraping, prix locaux, base de données, authentification, AliExpress ou autres imports depuis un pays tiers, accises, véhicules et extension navigateur.

## Étapes suivantes envisagées

- faire valider juridiquement et opérationnellement la règle d’arrondi ;
- déterminer automatiquement la nomenclature et les taux OM/OMR à partir de sources officielles versionnées ;
- exposer si nécessaire les frais accessoires postérieurs à l’entrée dans le parcours ;
- ajouter droits de douane, régimes particuliers, exclusions et autres provenances dans des profils distincts ;
- confronter des cas de référence aux liquidations réelles ;
- seulement ensuite étudier la comparaison avec des prix locaux.
