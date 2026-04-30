# JAT — Job Application Tracker

Un outil minimaliste pour suivre vos candidatures d'emploi.

## Démarrage rapide

```bash
pnpm install
pnpm dev
```

Ouvrir [http://localhost:5173](http://localhost:5173) dans le navigateur.

## Build production

```bash
pnpm build
pnpm preview
```

## Stack technique

- **React 18** + **TypeScript** (strict mode)
- **Vite** — build tool
- **Tailwind CSS v3** — styling
- **TanStack Query v5** — gestion d'état asynchrone
- **@dnd-kit** — drag & drop
- **React Router v6** — routing
- **Radix UI** — composants accessibles

## Architecture

Le projet utilise le **Repository Pattern** :

```
UI Components
    ↓ (hooks seulement)
useJobs() / useSettings()
    ↓ (TanStack Query)
jobRepository
    ↓ (interface)
LocalStorageRepository   ←→   ApiRepository (stub)
```

**Pour connecter un vrai backend**, il suffit de changer **une seule ligne** dans `src/repositories/index.ts` :

```ts
// Avant
export const jobRepository: JobRepository = new LocalStorageRepository()

// Après
export const jobRepository: JobRepository = new ApiRepository()
```

## Routes

| Route | Description |
|---|---|
| `/` | Tableau Kanban |
| `/stats` | Dashboard statistiques |
| `/settings` | Paramètres & export/import |

## Fonctionnalités

- 🎯 **Kanban board** avec drag & drop entre colonnes
- 📊 **Dashboard** avec taux de réponse et d'entretien
- 🔔 **Alertes de relance** configurables
- 📤 **Export / Import** JSON
- 🌙 **Mode sombre**
- 📱 Responsive (desktop + tablette)


