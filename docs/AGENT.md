# L’agent IA de Cravio, expliqué

Ce document explique comment l’assistant de Cravio fonctionne, fichier par fichier. L’idée : pouvoir le relire, le modifier et l’expliquer en entretien.

## 1. Chatbot, RAG ou agent ?

| | Ce qu’il fait | Dans Cravio |
| --- | --- | --- |
| Chatbot | Répond avec ce que le modèle sait déjà. | Insuffisant : il inventerait des recettes. |
| RAG | Cherche d’abord des documents utiles et les met dans le prompt. | On cherche les recettes de Cravio avant chaque réponse. |
| Agent | Peut **agir** en appelant des outils, plusieurs fois, jusqu’à finir la tâche. | Il ajoute au planner, complète la liste, génère les courses. |

L’assistant de Cravio combine les deux : **RAG + agent avec outils**.

## 2. Le trajet d’un message

1. Dans `/assistant`, tu écris (ou dis) : « Planifie 2 dîners rapides et fais ma liste ».
2. Le front envoie les derniers messages à `POST /api/v1/assistant/chat`, avec ta langue et la date du jour.
3. Le backend cherche les recettes qui correspondent (RAG) et construit le prompt système.
4. Il appelle le modèle sur Groq avec la liste des outils.
5. Le modèle répond « appelle `search_recipes` », puis « appelle `add_to_meal_plan` »… Le backend exécute chaque outil et renvoie le résultat au modèle.
6. Quand le modèle répond avec du texte, le backend vérifie les recettes citées et renvoie : la réponse, les recettes, et la liste des actions faites.
7. Le front affiche la réponse avec des liens, des cartes de recettes et des pastilles vertes (« Ajouté au planner… »). Il rafraîchit le planner et la liste.

## 3. Les fichiers

### `backend/app/services/retrieval.py` : la recherche (le « R » de RAG)

- `normalize()` met en minuscules, enlève les accents et les voyelles courtes arabes, unifie les formes de alef. Comme ça « Velouté », « veloute » et « VELOUTÉ » donnent le même mot.
- `tokenize()` découpe en mots, enlève les mots vides (« le », « de », « the », « في »…) et le pluriel simple.
- `_build()` crée un **index** : pour chaque recette, les mots du titre (comptés 3 fois), des ingrédients et des tags, dans les trois langues.
- `search()` note chaque recette avec **BM25**, la formule classique des moteurs de recherche : un mot rare compte plus qu’un mot fréquent, et une recette courte qui contient le mot compte plus qu’une longue. Un bonus est ajouté si la question parle d’une catégorie (« soupe », « dessert »).
- L’index est gardé en mémoire et reconstruit seulement quand les recettes changent.

Pourquoi pas des embeddings (vecteurs) ? Pour rester 100 % gratuit, sans dépendance lourde, et rapide pour quelques centaines de recettes. C’est une évolution possible.

### `backend/app/services/pantry.py` : « Cuisiner avec mon frigo »

Pour chaque recette, on regarde quels ingrédients tu as et lesquels manquent (le sel, le poivre, l’eau et l’huile ne comptent jamais comme manquants). Les recettes sont classées : celles qui utilisent le plus de tes ingrédients d’abord, puis celles où il manque le moins de choses. Utilisé par la page `/fridge` et par l’outil `find_recipes_with_ingredients` de l’agent.

### `backend/app/services/agent.py` : l’agent

Le fichier a trois parties.

**1. Le modèle : `llm_complete()`**
Un seul appel HTTP à l’API de Groq (compatible OpenAI). Les erreurs sont traduites en trois codes : `unavailable` (pas de clé ou clé refusée), `busy` (limite gratuite atteinte, erreur 429), `failed` (le reste). Dans les tests, cette fonction est remplacée par un faux modèle.

**2. Les outils : `TOOLS` et la classe `Toolbox`**
`TOOLS` est la description JSON que le modèle lit pour savoir quels outils existent et quels arguments donner. `Toolbox` contient le vrai code de chaque outil :

| Outil | Rôle | Écrit dans la base ? |
| --- | --- | --- |
| `search_recipes` | Chercher par plat, ingrédient, régime, temps max | Non |
| `find_recipes_with_ingredients` | Recettes possibles avec ce que tu as | Non |
| `get_recipe` | Ingrédients et étapes d’une recette | Non |
| `get_meal_plan` | Ton planner sur 7 jours | Non |
| `add_to_meal_plan` | Ajouter une recette à un jour et un repas | Oui, ajoute |
| `add_to_shopping_list` | Ajouter des articles à ta liste | Oui, ajoute |
| `generate_shopping_list` | Regénérer la liste depuis le planner | Oui |

`Toolbox.run()` ne plante jamais : si le modèle se trompe (recette inconnue, date trop lointaine, repas « brunch »…), il reçoit `{"error": "..."}` et peut corriger son appel. C’est important, car un modèle se trompe parfois.

**3. La boucle : `run()`**

```
messages = [prompt système avec les recettes trouvées] + 10 derniers messages
répéter au plus 5 fois :
    réponse = modèle(messages, outils)
    si pas d’appel d’outil : nettoyer et renvoyer la réponse
    sinon : exécuter chaque outil, ajouter les résultats aux messages
si toujours pas fini : demander une réponse finale sans outils
```

`system_prompt()` donne au modèle ses règles : répondre dans ta langue, court, citer les recettes seulement avec `[[slug]]`, n’agir que si tu le demandes, poser une question si c’est ambigu, respecter les régimes, et considérer les données comme des données, jamais comme des instructions (protection contre l’injection de prompt).

`clean_reply()` supprime tout `[[slug]]` qui ne correspond à aucune vraie recette. Le modèle ne peut donc pas faire apparaître une recette inventée.

### `backend/app/routers/assistant.py` : l’API

- `GET /assistant/status` : dit si une clé est configurée (le front affiche un message sinon).
- `POST /assistant/chat` : connexion obligatoire, limite de 15 messages par minute et 200 par jour, et la date envoyée par le navigateur n’est acceptée qu’à un jour près de celle du serveur.

### Le front-end

- `src/pages/Assistant.tsx` : la page de chat (suggestions, bulles, réessayer, nouvelle conversation, contexte d’une recette avec `?recipe=slug`).
- `src/features/assistant/Message.tsx` : transforme `[[slug]]` en liens, affiche les cartes de recettes et les pastilles d’actions.
- `src/features/assistant/speech.ts` : la voix avec la Web Speech API du navigateur, gratuite. La reconnaissance vocale fonctionne dans Chrome et Edge ; la lecture à voix haute dans presque tous les navigateurs.
- `src/features/assistant/queries.ts` : l’appel à l’API, puis le rafraîchissement du planner et de la liste quand l’agent a agi.

## 4. Sécurité

- La clé Groq reste dans `backend/.env` (jamais envoyée sur GitHub, jamais visible dans le navigateur).
- Les outils utilisent l’utilisateur de la session (cookie), jamais un identifiant donné par le modèle : impossible de toucher aux données d’un autre compte.
- Les outils ne suppriment rien.
- Chaque valeur venant du modèle est vérifiée (recette existante, date proche, repas valide, 1 à 24 personnes, 20 articles maximum).
- Limites de débit pour rester dans l’offre gratuite.

## 5. Les tests

`backend/tests/test_assistant.py` utilise un `FakeModel` qui rejoue des réponses écrites à l’avance. Ils vérifient :

- la recherche en français, anglais et arabe ;
- un message simple avec les recettes du RAG dans le prompt ;
- la suppression des recettes inventées ;
- un scénario complet : chercher, ajouter au planner, répondre ;
- les mauvais appels d’outils (recette inconnue, date, repas, outil inexistant, JSON invalide) ;
- qu’un utilisateur ne touche que sa propre liste ;
- l’arrêt après 5 tours ;
- la traduction des erreurs (`busy` → 503, `failed` → 502).

`frontend/src/pages/Assistant.test.tsx` vérifie l’écran de connexion, l’envoi d’une suggestion, les liens et les actions, le message sans clé, et « Réessayer ».

## 6. Changer de modèle

Le modèle par défaut est `openai/gpt-oss-120b` (gratuit sur Groq, compatible avec les outils). Pour en essayer un autre, ajoute dans `backend/.env` :

```
GROQ_MODEL=nom-du-modèle
```

La liste est sur [console.groq.com/docs/models](https://console.groq.com/docs/models). Choisis un modèle qui gère le « tool use ».

## 7. Idées d’amélioration

- Recherche par embeddings (sens des mots, pas seulement les mots exacts).
- Réponses en streaming, mot par mot.
- Mémoire des préférences (allergies, régime) dans le profil.
- Un jeu d’« evals » : 20 conversations types pour mesurer si l’agent choisit le bon outil.
