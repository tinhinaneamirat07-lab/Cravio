# Cravio API

FastAPI + SQLAlchemy 2 + Alembic. SQLite en développement, PostgreSQL en production.

## Démarrer (Windows, PowerShell)

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt

copy .env.example .env
# Ouvre .env et remplace JWT_SECRET par le résultat de :
python -c "import secrets; print(secrets.token_urlsafe(64))"

alembic upgrade head               # crée la base de données
python -m app.seed                 # ajoute les 12 recettes écrites pour Cravio (FR / EN / AR)
python -m app.importers.themealdb  # importe ~300 vraies recettes avec photos (TheMealDB)
uvicorn app.main:app --reload --port 8000
```

Documentation interactive : http://localhost:8000/docs

Sur macOS / Linux, remplace `.venv\Scripts\Activate.ps1` par `source .venv/bin/activate` et `copy` par `cp`.

## Les recettes

| Source | Nombre | Langues | Détails |
| --- | --- | --- | --- |
| `app/seed` (écrites pour Cravio) | 12 | FR, EN, AR | Temps, portions, difficulté, calories |
| [TheMealDB](https://www.themealdb.com) | ~300 | EN | Photo, origine (marocaine, italienne…), vidéo YouTube, lien source |

- L'import peut être relancé : les recettes déjà présentes sont mises à jour, pas dupliquées.
- Ce que TheMealDB ne fournit pas (temps, portions, difficulté) reste vide : rien n'est inventé.
- Les étiquettes `no-pork` et `no-alcohol` sont calculées à partir des ingrédients.
- La clé gratuite de TheMealDB est prévue pour le développement et les projets éducatifs : crédite TheMealDB là où ses recettes s'affichent, et un abonnement est nécessaire pour publier sur un store d'applications ([conditions](https://www.themealdb.com/terms_of_use.php)).

## Commandes utiles

| Commande | Rôle |
| --- | --- |
| `python -m pytest` | Lance les tests |
| `ruff check app tests` | Vérifie le code |
| `python -m app.create_admin email@exemple.com "Nom"` | Crée un compte admin |
| `python -m app.importers.themealdb --limit 20` | Import rapide pour tester |
| `alembic revision --autogenerate -m "message"` | Crée une migration après une modification des modèles |

## Endpoints (`/api/v1`)

| Méthode | Route | Accès |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Public (limité en fréquence) |
| POST | `/auth/refresh`, `/auth/logout`, `/auth/logout-all` | Session |
| GET | `/auth/me` | Connecté |
| PATCH, DELETE | `/users/me` | Connecté |
| GET | `/recipes?q=&cuisine=&category=&difficulty=&diet=&max_minutes=&page=` | Public (`diet` : halal, no-pork, no-alcohol, vegetarian, vegan, gluten-free) |
| GET | `/recipes/{slug}` | Public |
| PUT, DELETE | `/recipes/{slug}/favorite` | Connecté |
| GET | `/me/favorites` | Connecté |
| GET, PATCH, DELETE | `/admin/users` | Admin |

## Sécurité

- Mots de passe hachés avec Argon2id, jamais stockés en clair.
- Session en cookies `httpOnly` + `SameSite=Lax` (et `Secure` en production) : un jeton d'accès de 15 min et un jeton de rafraîchissement de 7 jours.
- Les jetons de rafraîchissement sont enregistrés (hachés) en base : déconnexion réelle, rotation à chaque usage, et toutes les sessions coupées si un ancien jeton est réutilisé.
- Limitation de fréquence sur l'inscription et la connexion, messages d'erreur identiques pour « email inconnu » et « mauvais mot de passe ».
- Routes admin vérifiées côté serveur, CORS limité aux origines de `CORS_ORIGINS`, en-têtes de sécurité HTTP.
- Tous les secrets viennent de `.env`, qui n'est jamais commité. En production, l'API refuse de démarrer avec le `JWT_SECRET` par défaut.

## Assistant IA (gratuit)

1. Crée une clé sur https://console.groq.com/keys (offre gratuite, sans carte bancaire).
2. Ajoute-la dans `.env` : `GROQ_API_KEY=...`
3. Redémarre l’API. `GET /api/v1/assistant/status` doit répondre `{"available": true}`.

Sans clé, l’assistant répond « non configuré » et le reste de l’API fonctionne. Les tests n’appellent jamais Groq.
Le fonctionnement de l’agent est expliqué dans [docs/AGENT.md](../docs/AGENT.md).

## Sortir : les lieux (repris de GoSpot)

Toutes les routes sont sous `/api/v1`. Les données viennent de services gratuits, sans clé :
OpenStreetMap (Overpass) pour les lieux, Wikimedia Commons pour les photos, Open-Meteo pour la météo.

| Route | Rôle |
| --- | --- |
| `GET /places/nearby?lat&lon&radius&category&limit&offset` | Lieux autour d'un point, du plus proche au plus loin |
| `GET /places/{id}` | Un lieu, sa note moyenne, favori ou non |
| `GET /places/{id}/photo` | Photo libre avec auteur et licence (cherchée une seule fois) |
| `GET/POST /places/{id}/reviews`, `DELETE /places/{id}/reviews/mine` | Avis (un par personne et par lieu) |
| `GET /places/{id}/info`, `GET /places/info?ids=` | Budget, taille du groupe, menu |
| `PUT /places/{id}/info`, `POST/DELETE /places/{id}/menu` | Réservé aux admins |
| `PUT/DELETE /places/{id}/favorite`, `GET /me/places` | Lieux favoris |
| `GET /weather?lat&lon` | Météo simplifiée : rain, cold, windy, hot, nice, ok |

- **Overpass une fois par zone et par semaine** : la zone (centre arrondi à environ 1 km + rayon) est notée
  dans `area_searches` ; les visiteurs suivants lisent notre base. Si Overpass est en panne, on renvoie les
  anciens lieux (`stale: true`).
- **Vie privée** : la position exacte n'est jamais enregistrée ; la météo reçoit une position arrondie.
- **Photos** : cherchées en arrière-plan après la réponse, 3 à la fois, 40 au maximum par recherche.
- **Tests** : `tests/test_places.py` remplace le réseau par un faux (`httpx.MockTransport`), donc aucun appel réel.
