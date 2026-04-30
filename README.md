# JAT — Périodes & Fiches Entreprises

## Fichiers à créer (nouveaux)

```
src/types/index.ts                          ← remplace l'existant
src/lib/utils.ts                            ← remplace l'existant (formatDate accepte locale)
src/i18n/index.tsx                          ← remplace l'existant
src/App.tsx                                 ← remplace l'existant

src/repositories/LocalStoragePeriodRepository.ts   ← NOUVEAU
src/repositories/LocalStorageCompanyRepository.ts  ← NOUVEAU

src/hooks/usePeriods.ts                     ← NOUVEAU
src/hooks/useCompanies.ts                   ← NOUVEAU
src/hooks/useActivePeriod.tsx               ← NOUVEAU

src/components/periods/PeriodSelector.tsx   ← NOUVEAU
src/components/periods/PeriodForm.tsx       ← NOUVEAU

src/components/companies/CompanySheet.tsx   ← NOUVEAU
src/components/companies/CompanyCard.tsx    ← NOUVEAU

src/components/forms/JobForm.tsx            ← remplace l'existant
src/components/kanban/JobCard.tsx           ← remplace l'existant
src/components/kanban/KanbanBoard.tsx       ← remplace l'existant

src/pages/BoardPage.tsx                     ← remplace l'existant
src/pages/SettingsPage.tsx                  ← remplace l'existant
src/pages/CompaniesPage.tsx                 ← NOUVEAU
```

## Fichiers inchangés

```
src/main.tsx
src/index.css
src/hooks/useJobs.ts
src/hooks/useKanbanConfig.tsx
src/hooks/useSettings.ts
src/hooks/useToast.ts
src/repositories/index.ts
src/repositories/LocalStorageRepository.ts
src/components/kanban/KanbanColumn.tsx
src/components/kanban/KanbanConfigModal.tsx
src/components/stats/StatsBar.tsx
src/components/ui/* (tous)
src/pages/StatsPage.tsx
```

## Ce qui a changé

### types/index.ts
- Nouveau type `Period` (id, name, startDate, endDate?, color, createdAt)
- Nouveau type `CompanyProfile` (id, displayName, name, website, sector, notes, contacts[], createdAt, updatedAt)
- Nouveau type `CompanyContact` (id, name?, email?, role?)
- `JobApplication` + champs `periodId?` et `companyId?`
- Styles de couleurs `PERIOD_COLOR_STYLES` pour les périodes
- `ExportData` v2 enrichi avec `periods?` et `companies?`

### Flux principal
1. **Créer une période** → Settings → section "Périodes" → bouton "Créer"
2. **Filtrer le board** → pastilles période au-dessus du kanban
3. **Assigner une période** → formulaire de candidature → sélecteur de période
4. **Fiche entreprise depuis une carte** → ouvrir une card → icône Building2 → popup CompanySheet
5. **Page Entreprises** → sidebar → icône Building2 → grille des fiches

### Matching automatique
Les candidatures sont rattachées à une fiche entreprise soit par `companyId` (lien explicite),
soit par correspondance de nom normalisé (`company.toLowerCase().trim() === profile.name`).
Cela permet de voir l'historique même pour les candidatures créées avant la fiche.

### Migration
Aucune migration nécessaire — les champs `periodId` et `companyId` sont optionnels.
Les données existantes fonctionnent sans modification.
