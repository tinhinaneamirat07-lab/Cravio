# Cravio front-end

React 19, Vite, TypeScript, Tailwind CSS v4, TanStack Query, Motion, Phosphor Icons, i18next (FR / EN / AR avec RTL).

## Lancer

1. Démarre l'API (voir `../backend/README.md`) sur le port 8000.
2. Puis :

```bash
npm install
npm run dev
```

Vite redirige `/api` vers `http://127.0.0.1:8000`, donc les cookies de session fonctionnent sans configuration CORS.

## Pages

| Route | Page |
| --- | --- |
| `/` | Landing |
| `/explore` | Recherche, filtres (type, cuisine, régime, temps), pagination |
| `/recipes/:slug` | Détail : portions ajustables, ingrédients à cocher, minuteurs, favoris |
| `/login`, `/register` | Authentification |
| `/favorites` | Recettes favorites (connecté) |

## Structure

```
src/
  api/          client fetch (cookies, rafraîchissement de session) et types
  features/     hooks de données par domaine (auth, recipes)
  pages/        une page par route, chargées à la demande
  components/   layout, landing, design system (ui/)
  i18n/         traductions fr, en, ar
```
