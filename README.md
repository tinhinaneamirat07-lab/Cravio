# Cravio

**Cook it or find it.** Une seule app pour décider ce soir : cuisiner à la maison avec ce que tu as, ou trouver où sortir autour de toi en Algérie. Avec un assistant IA multi-agents en français, anglais, arabe et darija.

Cravio réunit deux projets : **Nuvia** (recettes, frigo, planner, courses, agent cuisine) et **GoSpot** (lieux OpenStreetMap, carte, météo, avis).

> Projet en cours de construction, phase par phase.

## Avancement

| Phase | Contenu | État |
| --- | --- | --- |
| 0 | Base reprise de Nuvia, renommée Cravio | ✅ |
| 1 | Design « Figue et cacao », nouvelle navigation, motion | ✅ |
| 2 | Back-end : lieux, météo, avis de GoSpot portés vers FastAPI | ✅ |
| 3 | Pages Sortir, Lieu, Trouver ma sortie ; Accueil et Favoris fusionnés | ⏳ |
| 4 | Assistant multi-agents (LangGraph : superviseur, Chef, Sorties) | ⏳ |
| 5 | Documentation, tests, CI | ⏳ |

## Stack

| Couche | Outils |
| --- | --- |
| Front-end | React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, i18next |
| Back-end | Python, FastAPI, SQLAlchemy 2, Alembic, SQLite |
| IA | Groq (offre gratuite), agent avec outils et RAG BM25 |
| Qualité | pytest, Vitest, Ruff, oxlint, GitHub Actions |

Tout est gratuit, sans carte bancaire.

## Lancer en local (Windows, PowerShell)

**1. L'API**

```powershell
cd backend
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements-dev.txt
copy .env.example .env      # remplis JWT_SECRET (et GROQ_API_KEY pour l'assistant)
alembic upgrade head
python -m app.seed
python -m app.importers.themealdb   # optionnel : ~300 recettes avec photos
uvicorn app.main:app --reload --port 8000
```

**2. Le site**, dans un deuxième terminal

```powershell
cd frontend
npm install
npm run dev
```

Ouvre http://localhost:5173. L'API est documentée sur http://localhost:8000/docs.

**Tests**

```powershell
cd backend;  pytest
cd frontend; npm test
```

## Crédits

- Recettes et photos en partie de [TheMealDB](https://www.themealdb.com).
- Projet personnel de portfolio conçu et développé par **Tina**.
