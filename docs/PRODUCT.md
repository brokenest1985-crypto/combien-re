# Combien — produit et première version

## Intention

Aider une personne à La Réunion à connaître, à terme, le coût réel d’un achat livré sur l’île et à le comparer aux prix locaux.

## Version 0.1 : prototype testable immédiatement

Une seule page affiche « Combien ça me coûte vraiment ? », deux champs « Prix du produit » et « Frais de livraison », et un bouton « Calculer ».

La seule formule est : **total = prix du produit + frais de livraison**.

Le résultat porte le libellé « Coût provisoire rendu : XXX,XX € ». L’avertissement « Prototype — taxes et octroi de mer non encore pris en compte. » reste visible avant et après le calcul.

Les deux montants sont obligatoires, en euros, positifs ou nuls, avec deux décimales maximum. La livraison offerte se saisit avec `0`. Point et virgule sont acceptés ; les saisies invalides ou négatives sont refusées. Aucun arrondi implicite. Le moteur protège aussi contre les dépassements des entiers sûrs JavaScript.

Le calcul est local au navigateur. Pas de compte, de sauvegarde, de données personnelles, de base de données ou d’appel à un service externe. Recharger la page efface les saisies.

## Critères d’acceptation

| Prix | Livraison | Résultat attendu |
| --- | --- | --- |
| 100 € | 20 € | 120,00 € |
| 100 € | 0 € | 100,00 € |
| 19,99 € | 4,95 € | 24,94 € |
| 0,10 € | 0,20 € | 0,30 € |
| 0 € | 0 € | 0,00 € |
| Négatif dans l’un des champs | — | Erreur, aucun total |
| Vide, texte ou plus de deux décimales | — | Erreur, aucun total |

Le formulaire fonctionne sur mobile et au clavier. Une erreur place le focus sur le premier champ concerné. Modifier une saisie invalide le résultat précédent.

## Évolutions prévues, non implémentées

Le module indépendant `src/domain/landed-cost/` est le point d’évolution du moteur. Son entrée sous forme d’objet pourra être enrichie et sa sortie pourra détailler les postes de coût lorsque cela sera utile.

Les étapes futures pourront traiter TVA, octroi de mer, octroi de mer régional, catégories fiscales, frais de dossier et règles applicables à une date donnée. Avant leur développement, préciser les données nécessaires, les sources officielles, les assiettes, exonérations, dates d’effet et arrondis, puis écrire des cas de référence vérifiés. La version actuelle ne contient ni taux fictifs, ni paramètres fiscaux inutilisés, ni moteur de règles générique.

La comparaison avec des prix locaux viendra ensuite ; ses sources et son mode de collecte restent à décider. Aucun scraping ni connecteur n’est prévu dans ce prototype. Une API, du stockage ou une authentification ne seront ajoutés que si une étape ultérieure les justifie.
