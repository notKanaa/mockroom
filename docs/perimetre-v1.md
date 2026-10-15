# Mockroom : périmètre de la v1

> Un simulateur open source d'entretiens techniques, animé par une IA, qui tourne sur ton ordi.
>
> **En clair :** tu choisis une techno (ou tu colles une offre d'emploi), une IA te fait passer un entretien
> comme un vrai recruteur, puis te donne un bilan détaillé de ce qu'il faut réviser. Gratuit, privé, en français ou en anglais.

## Pourquoi ce projet

- Les outils payants coûtent cher : de 20 à 150 $ par mois.
- Les projets open source existants sont soit des projets étudiants (0 à 10 étoiles), soit abandonnés : GPTInterviewer depuis 2024, Interviewer depuis 2025.
- Presque tout est en anglais seulement.
- Le projet d'entraînement le plus suivi (go-interview-practice, environ 2 500 étoiles) a réussi grâce au contenu ajouté par sa communauté.

## Ce que fait la v1

| Sujet | Décision | En clair |
|---|---|---|
| Type d'entretien | Questions techniques sur une techno, avec relances | « Explique-moi useEffect », puis l'IA creuse ta réponse |
| Interface | Appli web locale lancée par `npx mockroom` | Un site qui tourne sur ton ordi, ouvert dans le navigateur |
| IA | Au choix : clé OpenAI, Anthropic ou Gemini, **ou** Ollama en local | Meilleure qualité avec une clé, gratuit sans clé |
| Langues | Français + anglais (entretiens et interface) | Ce qui nous distingue des autres outils |
| Mode de réponse | Écrit (chat) | La voix viendra plus tard |
| Sujets | **Packs communautaires** + **offre d'emploi collée** | Packs écrits par la communauté ; l'offre d'emploi oriente l'entretien |
| Fin d'entretien | Bilan détaillé par question : points forts, manques, meilleure réponse, ressource pour réviser | Une correction bienveillante, sans note |
| Historique | Enregistré en local, sans compte | Revoir ses anciens entretiens, tout reste chez toi |
| Stack | React + Node, tout en TypeScript | Un seul langage |

## Ce que la v1 ne fait PAS (plus tard)

- Entretien à l'oral (micro et voix)
- Exercices de code exécuté (façon LeetCode)
- Conception de système, entretien comportemental
- Note chiffrée
- Site hébergé en ligne, comptes utilisateurs
- Appli de bureau installable (piste : C# / .NET)

## Comment se déroule un entretien

1. L'utilisateur choisit un **pack** (ex. « React, junior ») **et/ou** colle une **offre d'emploi**.
2. Si une offre est fournie, l'IA en extrait les technos et le niveau, puis choisit les packs correspondants.
3. L'IA pose environ 5 à 8 questions et relance quand une réponse est vague ou incomplète, comme un vrai recruteur.
4. À la fin, elle produit le bilan détaillé, enregistré dans l'historique local.

## Les packs communautaires

Un pack est un simple fichier texte (YAML ou Markdown) dans le dépôt, par exemple `packs/react/junior.yaml`. Il contient :

- la techno, le niveau et la langue ;
- les thèmes à couvrir (ex. hooks, rendu, état) ;
- pour chaque thème, des exemples de questions et les **points clés d'une bonne réponse**, qui permettent à l'IA de corriger de façon fiable ;
- des ressources pour réviser (liens vers la documentation officielle).

**En clair :** n'importe qui peut ajouter un pack Symfony ou Java en ouvrant une pull request, sans écrire de code.

Packs de départ suggérés : React, JavaScript, Python, Java, Symfony/PHP, C#, en français et en anglais.

## Questions encore ouvertes

- **Licence :** je propose MIT, la plus simple et la plus courante. En clair : tout le monde peut utiliser et modifier le projet librement.
- **Appli de bureau plus tard :** une réécriture en C# / .NET est possible, mais Tauri ou Electron permettraient d'emballer l'appli React telle quelle, sans tout réécrire. À trancher le moment venu.
- **Format exact des packs :** YAML ou Markdown, à fixer en écrivant le premier pack.
