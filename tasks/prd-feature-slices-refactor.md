# PRD: Feature Slices Architecture & Large File Refactor

## Introduction

Restructure all three apps (admin, client, landing) to use a feature slices architecture and split oversized files into focused, maintainable components. The codebase currently has route files up to 52 KB containing forms, tables, charts, hooks, and utilities all in one file. This refactor establishes a clear `features/` + `shared/` structure, thins out route files, and splits the Convex backend.

## Goals

- Establish a consistent `routes/features/shared` architecture across all apps
- Reduce the largest files from 24-52 KB to under 10 KB each
- Make route files thin orchestrators that compose feature components
- Split `convex/elevators.ts` (36 KB, 19 exports) into domain-focused modules
- Move reusable dumb UI components (StatCard, MultiSelectFilter, SortHeader, UploadZone) to `packages/ui`

## User Stories

### US-001: Establish feature slices folder structure
**Description:** As a developer, I want a clear folder convention so I know where to find and place code.

**Acceptance Criteria:**
- [ ] Admin app has `src/features/` with slices: `elevator/`, `maintenance/`, `modernization/`, `register/`, `import/`, `cms/`
- [ ] Client app has `src/features/` with slices: `elevator/`, `maintenance/`, `modernization/`, `register/`
- [ ] Each feature slice has `components/`, `hooks/`, `utils/` subdirectories (created as needed, not empty)
- [ ] Admin app has `src/shared/components/`, `src/shared/hooks/`, `src/shared/lib/`
- [ ] Client app has `src/shared/components/`, `src/shared/hooks/`, `src/shared/lib/`
- [ ] Existing `src/components/` and `src/lib/` files are moved into `src/shared/`
- [ ] Landing app keeps current flat structure (too small for features)
- [ ] All imports updated, no broken references
- [ ] Typecheck passes

### US-002: Split elevator edit form (admin)
**Description:** As a developer, I want the 52 KB edit form split into focused section components so each is easy to understand and modify.

**Acceptance Criteria:**
- [ ] `hiss.$id.redigera.tsx` route file is thin — imports and composes section components
- [ ] Extracted to `features/elevator/components/`: `BasicInfoSection`, `TechnicalSpecsSection`, `DoorsAndCabSection`, `MachinerySection`, `InspectionSection`, `ModernizationSection`, `EmergencyPhoneSection`, `CommentsSection`
- [ ] `useSuggestions` hook extracted to `features/elevator/hooks/use-suggestions.ts`
- [ ] Draft persistence logic extracted to `features/elevator/hooks/use-draft-persistence.ts`
- [ ] Form type converters (`serverToFormValues`, `toOptionalString`, `toOptionalNumber`) extracted to `features/elevator/utils/form-converters.ts`
- [ ] Form values type extracted to `features/elevator/types.ts`
- [ ] Route file under 10 KB
- [ ] Typecheck passes
- [ ] App works identically (no behavior changes)

### US-003: Split new elevator wizard (admin)
**Description:** As a developer, I want the 48 KB wizard split into step components and a reusable wizard shell.

**Acceptance Criteria:**
- [ ] `ny.tsx` route file is thin — imports wizard and step components
- [ ] Wizard container extracted to `features/elevator/components/ElevatorWizard.tsx` (step navigation, progress indicator)
- [ ] Each of the 9 steps extracted as separate components in `features/elevator/components/wizard-steps/`
- [ ] Step components reuse the same form section components from US-002 where fields overlap
- [ ] Review step (`Step 9`) is its own component showing a summary
- [ ] Shared hooks (`useSuggestions`, `useDraftPersistence`) reused from US-002 extractions
- [ ] Route file under 5 KB
- [ ] Typecheck passes
- [ ] App works identically

### US-004: Split admin import page
**Description:** As a developer, I want the 32 KB import wizard split into stage components.

**Acceptance Criteria:**
- [ ] `admin.import.tsx` route file is thin
- [ ] Extracted to `features/import/components/`: `UploadStage`, `ColumnMappingStage`, `PreviewStage`, `ImportingStage`, `ResultStage`
- [ ] `StatCard` component moved to `packages/ui` (reusable dumb component)
- [ ] `UploadZone` component moved to `packages/ui` (reusable dumb component)
- [ ] Import state machine logic extracted to `features/import/hooks/use-import-machine.ts`
- [ ] Route file under 5 KB
- [ ] Typecheck passes
- [ ] App works identically

### US-005: Split client dashboard pages (register, maintenance, modernization)
**Description:** As a developer, I want the three 24 KB client dashboard pages split into feature components.

**Acceptance Criteria:**
- [ ] `register.tsx` split: `MultiSelectFilter` and `SortHeader` moved to `packages/ui`, table/filter logic to `features/register/components/`
- [ ] `underhall.tsx` split: chart components and data cards to `features/maintenance/components/`
- [ ] `modernisering.tsx` split: timeline chart, budget breakdown, priority list to `features/modernization/components/`
- [ ] Each route file under 10 KB
- [ ] Typecheck passes
- [ ] Apps work identically

### US-006: Split admin dashboard pages (register, maintenance, modernization)
**Description:** As a developer, I want the admin dashboard pages split in the same pattern as client, with admin-specific org context.

**Acceptance Criteria:**
- [ ] Admin `register.tsx`, `underhall.tsx`, `modernisering.tsx` split into their respective `features/` slices
- [ ] Admin-specific logic (org selector, edit links) stays in admin feature components
- [ ] Components are NOT shared with client app — duplicated per app as agreed
- [ ] Each route file under 10 KB
- [ ] Typecheck passes
- [ ] Apps work identically

### US-007: Split Convex backend elevators.ts
**Description:** As a developer, I want the 36 KB backend file split by domain so queries are easy to find.

**Decision:** Use `convex/elevators/` subdirectory. Convex file-based routing maps `convex/elevators/crud.ts` → `api.elevators.crud.get`. All frontend API paths will change (e.g., `api.elevators.get` → `api.elevators.crud.get`) — acceptable in a big-bang refactor.

**Acceptance Criteria:**
- [ ] `convex/elevators.ts` removed and split into:
  - `convex/elevators/crud.ts` — `get`, `search`, `create`, `update`, `archive`, `checkElevatorNumber`
  - `convex/elevators/listing.ts` — `list`, `exportData` (named `listing` to avoid `api.elevators.list.list`)
  - `convex/elevators/analytics.ts` — `stats`, `chartData`
  - `convex/elevators/modernization.ts` — `timeline`, `budget`, `priorityList`, `measures` (drop the `modernization` prefix since the module name provides it)
  - `convex/elevators/maintenance.ts` — `inspectionCalendar`, `companies`, `emergencyPhoneStatus`, `inspectionList`, `todaysElevators`
  - `convex/elevators/helpers.ts` — `autoAddSuggestedValues`, `fetchAndFilter`, `filterArgs` schema, org name cache (internal helpers, not exported via `api`)
- [ ] Shared filter args schema and types in `convex/elevators/helpers.ts`
- [ ] All frontend imports updated to new API paths across both apps:
  - `api.elevators.get` → `api.elevators.crud.get`
  - `api.elevators.list` → `api.elevators.listing.list`
  - `api.elevators.stats` → `api.elevators.analytics.stats`
  - `api.elevators.modernizationTimeline` → `api.elevators.modernization.timeline`
  - `api.elevators.inspectionCalendar` → `api.elevators.maintenance.inspectionCalendar`
  - (etc. for all ~30 call sites)
- [ ] Typecheck passes
- [ ] All existing functionality preserved

### US-008: Move reusable dumb UI components to packages/ui
**Description:** As a developer, I want generic UI components in the shared package so both apps can use them.

**Acceptance Criteria:**
- [ ] `MultiSelectFilter` added to `packages/ui/src/components/ui/`
- [ ] `SortHeader` added to `packages/ui/src/components/ui/`
- [ ] `StatCard` added to `packages/ui/src/components/ui/`
- [ ] `UploadZone` added to `packages/ui/src/components/ui/`
- [ ] All components exported from package index
- [ ] Components have no domain-specific logic (generic props only)
- [ ] Typecheck passes

## Functional Requirements

- FR-1: Every app must follow the structure: `src/routes/` (thin), `src/features/{slice}/` (domain logic), `src/shared/` (app-wide utilities)
- FR-2: Route files must only handle: layout composition, route params/data fetching, and composing feature components
- FR-3: Feature slices must not import from other feature slices — only from `shared/` or `packages/`
- FR-4: The Convex backend must split `elevators.ts` into a `convex/elevators/` directory with domain-focused modules
- FR-5: No behavior changes — this is a pure structural refactor
- FR-6: All dumb, reusable UI components must live in `packages/ui`
- FR-7: Domain-specific components and logic stay in the app, duplicated between admin and client as needed

## Non-Goals

- No new features or UI changes
- No changes to the landing app structure (it's small enough as-is)
- No shared feature packages between apps — duplication is intentional
- No changes to routing conventions (TanStack Router file-based routing stays)
- No refactoring of `packages/utils/excel-import` (already well-structured)
- No database schema changes

## Technical Considerations

- TanStack Router uses file-based routing — route files must stay in `src/routes/` with current naming
- Convex file-based routing: `convex/elevators/crud.ts` → `api.elevators.crud.get`. All ~30 frontend call sites must be updated to the new paths
- Draft persistence uses localStorage keys tied to elevator IDs — keys must remain stable
- Form validation with `@tanstack/react-form` — form context must flow through extracted components via props
- The `useSuggestions` hook fetches per-category — extracting it should preserve the same query pattern
- Wizard steps and edit form share the same section components (`BasicInfoSection`, etc.) — sections receive form instance via props and render fields. The wizard wraps one section per step; the edit page renders all sections in a single scrollable form

## Success Metrics

- No route file exceeds 10 KB
- No single file in `features/` exceeds 15 KB
- `convex/elevators.ts` no longer exists as a monolith
- Zero regressions — all existing behavior preserved
- Clear, discoverable file organization — a developer can find any component in under 10 seconds

## Resolved Decisions

- **Convex split:** Use `convex/elevators/` subdirectory. File names chosen to avoid stutter (e.g., `listing.ts` not `list.ts`, drop `modernization` prefix from function names). All frontend API paths will change — acceptable in big-bang refactor.
- **`useDraftPersistence`:** Stays feature-local in `features/elevator/hooks/`. Only elevator forms use it. Extract to shared if a second use case appears.
- **Wizard/edit form sharing:** Both use the same section components (`BasicInfoSection`, `TechnicalSpecsSection`, etc.). Sections receive the form instance via props. Edit page renders all sections; wizard renders one per step. Hooks and utils (`useSuggestions`, form converters, types) are shared in `features/elevator/`.
