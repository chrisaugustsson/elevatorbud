# PRD: Hisshanteringssystem

## Introduction

Hisskompetens is an elevator inspection consultancy that surveys elevators for property management companies. Today, consultants document everything in Excel, leading to double data entry, data loss risk in the field, and customers receiving unwieldy spreadsheets with 42 columns.

This system replaces the Excel workflow with a web-based platform: a mobile-optimized field app for consultants (with localStorage draft persistence), a customer portal with dashboards and search, and a public landing page. The entire system lives in a pnpm monorepo deployed to Cloudflare Workers with Convex as the backend, Clerk for authentication, and Resend for transactional email.

All application code resides in the `elevatorbud/` directory.

## Goals

- Eliminate double data entry: consultants enter data once, directly in the field
- Zero data loss: form drafts persist to localStorage automatically, surviving network drops and page reloads
- Fast customer access: find any elevator within 5 seconds
- Better decision-making: dashboards with KPIs, modernization timelines, and budget views replace raw Excel
- Multi-tenant from day one: supports multiple customer organizations with strict data isolation
- Zero infrastructure cost: all services on free tiers (Cloudflare Workers, Convex, Clerk, Resend)

## Implementation Instructions

### Latest Versions Only (Mandatory)

**Every package installed MUST be the latest stable version. No exceptions.**

Before installing or adding any dependency:
1. **Check the latest version first** — use `npm info <package> version` or check the package's official documentation/release page via context7 MCP or web search
2. **Never assume a version** — verify it, even for well-known packages
3. **Use modern APIs** — e.g., Tailwind CSS v4 (CSS-based config, not `tailwind.config.js`), React 19, TanStack Start latest, etc.
4. **No legacy patterns** — if a library has deprecated an API in its latest version, use the new API. Read the latest docs (via context7 MCP) before implementing.

This applies to every dependency across the entire monorepo: framework packages, UI libraries, build tools, dev dependencies — everything.

### Reference Documentation (Mandatory)

When implementing integrations, **always fetch and follow the official docs** via context7 MCP or the URLs below. Do not rely on training data — APIs change between versions.

| Integration | Documentation |
|---|---|
| Clerk + Convex | https://clerk.com/docs/guides/development/integrations/databases/convex |
| Convex + Clerk auth | https://docs.convex.dev/auth/clerk |
| Clerk + TanStack Start | https://clerk.com/docs/tanstack-react-start/getting-started/quickstart |

These docs are the source of truth for auth setup (US-002, US-003). Read them before implementing.

### TanStack First (Mandatory)

**Before reaching for any library, always ask: "Does TanStack have something for this?" If yes, use it.**

TanStack is our primary ecosystem. Use these packages (all latest versions):
- **TanStack Start** — fullstack framework (routing, SSR, server functions)
- **TanStack Router** — type-safe routing (comes with Start)
- **TanStack Form** — all forms (elevator wizard, edit forms, admin forms, filters)
- **TanStack Table** — all data tables (elevator registry, user lists, organization lists, priority lists)
- **TanStack Query** — if needed for non-Convex data fetching (Convex has its own reactivity, but use TanStack Query for any external API calls)
- **TanStack Virtual** — if long lists need virtualization

Only use a non-TanStack alternative if TanStack genuinely doesn't cover the use case.

### Frontend UI/UX Skill (Mandatory)

**For ALL user stories that involve frontend/UI work, the `/ui-ux-pro-max` skill MUST be used.** This skill provides design intelligence including style systems, color palettes, font pairings, UX guidelines, and component patterns across multiple stacks.

Before implementing any UI component, page, or layout:
1. Invoke the `ui-ux-pro-max` skill to guide design decisions (colors, typography, spacing, component selection, interaction patterns)
2. Use its output to inform shadcn/ui component configuration, Tailwind theme, and layout choices
3. Apply its UX guidelines for the specific product type (B2B SaaS / field tool / customer portal)

This applies to every user story marked with "Verify in browser" in its acceptance criteria.

## User Stories

### US-001: Monorepo scaffolding

**Description:** As a developer, I need the monorepo structure set up so that all apps and packages can be developed and deployed independently.

**Acceptance Criteria:**
- [ ] `elevatorbud/` contains a pnpm workspace with Turborepo
- [ ] `apps/admin/` — TanStack Start app (React + Vite + Nitro targeting Cloudflare Workers)
- [ ] `apps/client/` — TanStack Start app (same stack)
- [ ] `apps/landing/` — TanStack Start app (same stack)
- [ ] `packages/ui/` — shared UI components built on **shadcn/ui** (+ 21st.dev components where appropriate), Tailwind CSS
- [ ] `packages/types/` — shared TypeScript types
- [ ] `packages/auth/` — Clerk client helpers, `ConvexProviderWithClerk` setup
- [ ] `packages/utils/` — shared utilities (formatting, parsing, Excel import helpers)
- [ ] `packages/email/` — React Email templates + Resend client
- [ ] `convex/` directory at monorepo root with `schema.ts` stub
- [ ] `turbo.json` with build/dev/lint pipelines
- [ ] `pnpm-workspace.yaml` listing all apps and packages
- [ ] Each app has `wrangler.toml` for Cloudflare Workers
- [ ] **All packages at latest stable versions** — verify each version before installing (e.g., Tailwind CSS v4, React 19, TanStack Start latest, shadcn/ui latest). Use `npm info <pkg> version` or context7 MCP to confirm.
- [ ] Tailwind CSS v4 setup (CSS-based configuration, no `tailwind.config.js`)
- [ ] `pnpm dev` starts all apps + Convex dev server concurrently
- [ ] `pnpm build` builds all apps successfully
- [ ] Typecheck passes across the entire monorepo

---

### US-002: Convex schema and auth helpers

**Description:** As a developer, I need the Convex database schema and authentication helpers so that all apps can read/write data with proper role-based access and tenant isolation.

**Acceptance Criteria:**
- [ ] `convex/schema.ts` defines all tables: `hissar`, `organisationer`, `anvandare`, `forslagsvarden`
- [ ] `hissar` table contains all fields from the data model (identification, technical spec, inspection, modernization, emergency phone, metadata)
- [ ] `organisationer` table: id, namn, organisationsnummer, kontaktperson, telefonnummer, email
- [ ] `anvandare` table: clerk_user_id, email, namn, roll ("admin" | "kund"), organisation_id (nullable), aktiv, skapad_datum, senaste_login
- [ ] `forslagsvarden` table: kategori, varde, aktiv, skapad_datum
- [ ] `convex/auth.ts` exports `getCurrentUser(ctx)`, `requireAdmin(ctx)`, `requireTenantAccess(ctx, organisationId)`
- [ ] Clerk + Convex integration following official docs: https://docs.convex.dev/auth/clerk and https://clerk.com/docs/guides/development/integrations/databases/convex
- [ ] Clerk webhook HTTP action (`clerk-webhook`) handles user.created, user.updated, user.deleted events and syncs `anvandare` table
- [ ] Appropriate indexes defined for common query patterns (hissar by organisation_id, by hissnummer; anvandare by clerk_user_id; forslagsvarden by kategori)
- [ ] Typecheck passes

---

### US-003: Clerk authentication integration

**Description:** As a user, I need to log in securely so that I can access the system with my assigned role and see only my organization's data.

**Acceptance Criteria:**
- [ ] Clerk configured with two apps (admin + client) or a single instance with domain-based routing
- [ ] `packages/auth/` exports `ConvexProviderWithClerk` wrapper component and Clerk client setup for TanStack Start — follow https://clerk.com/docs/tanstack-react-start/getting-started/quickstart
- [ ] Admin app: login page using Clerk `<SignIn />` component, only users with `roll === "admin"` can access
- [ ] Client app: login page using Clerk `<SignIn />`, only users with `roll === "kund"` can access
- [ ] Unauthenticated users are redirected to login
- [ ] After login, user's role and organisation_id are available via Convex `getCurrentUser()`
- [ ] Session persists across page reloads (Clerk JWT)
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-004: Organization management (admin)

**Description:** As an admin, I want to create and manage customer organizations so that I can onboard new property management companies.

**Acceptance Criteria:**
- [ ] Convex mutations: `organisationer.create`, `organisationer.update`
- [ ] Convex queries: `organisationer.list`, `organisationer.get`
- [ ] All functions require admin role
- [ ] Admin app page `/admin/organisationer` with table listing all organizations (namn, organisationsnummer, kontaktperson, email, antal hissar)
- [ ] "Create organization" form with **TanStack Form** (namn required, organisationsnummer format check)
- [ ] Click on organization opens edit view
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-005: User management (admin)

**Description:** As an admin, I want to create and manage user accounts (both admin and customer users) so that the right people have access to the right data.

**Acceptance Criteria:**
- [ ] Convex action `anvandare.create`: creates user in Clerk API + creates document in `anvandare` table with roll and organisation_id
- [ ] Convex action `anvandare.update`: updates name, email, roll, organisation — syncs to Clerk metadata
- [ ] Convex action `anvandare.inaktivera`: blocks user in Clerk + sets aktiv=false
- [ ] Convex action `anvandare.remove`: deletes from Clerk + Convex, historical references set to "Borttagen anvandare"
- [ ] Convex queries: `anvandare.list` (filterable by roll, organisation), `anvandare.get`, `anvandare.listByOrganisation`
- [ ] All functions require admin role
- [ ] Admin app page `/admin/anvandare` with user table (namn, email, roll, organisation, status, senaste inloggning)
- [ ] Filter by roll and organisation, search by name/email
- [ ] "Create user" form with **TanStack Form**: namn, email, roll (admin/kund), organisation (required if kund)
- [ ] Clerk sends invitation email — user sets password via Clerk UI
- [ ] Quick-action from organization view: add customer user directly
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-006: Suggestion values management (reference data)

**Description:** As an admin, I want to manage the suggestion values used in combobox fields (elevator types, manufacturers, districts, etc.) so that field data stays consistent.

**Acceptance Criteria:**
- [ ] Convex query `forslagsvarden.list`: returns values filtered by kategori (for combobox population)
- [ ] Convex mutations: `forslagsvarden.create`, `forslagsvarden.update` (rename — updates all elevators with old value), `forslagsvarden.merge` (merge duplicates), `forslagsvarden.deactivate`
- [ ] All mutations require admin role; query accessible to all authenticated users
- [ ] Admin app page `/admin/referensdata` showing all categories with their values
- [ ] Rename a value (propagates to all elevators)
- [ ] Merge duplicate values (e.g., "Centrum/Haga" and "Centrum/haga")
- [ ] Deactivate a value (no longer suggested, existing data preserved)
- [ ] Categories: hisstyp, fabrikat, distrikt, skotselforetag, besiktningsorgan, hissbeteckning, typ_dorrar, kollektiv, drivsystem, maskinplacering, atgarder_vid_modernisering
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-007: Elevator creation wizard (field app)

**Description:** As an admin (consultant in the field), I want a step-by-step mobile form to register a new elevator so that I can capture all technical data on-site without being overwhelmed.

**Acceptance Criteria:**
- [ ] Convex mutation `hissar.create` with all fields, requires admin role, auto-sets skapad_av and skapad_datum
- [ ] Form built with **TanStack Form** (validation, field state, step management)
- [ ] Mobile-optimized wizard at `/ny` with 9 steps:
  1. Identifiering (hissnummer, adress, hissbeteckning, distrikt)
  2. Teknisk specifikation (hisstyp, fabrikat, byggar, hastighet, lyfthojd, marklast, antal plan/dorrar)
  3. Dorrar och korg (typ_dorrar, genomgang, kollektiv, korgstorlek, dagoppning, barbeslag, dorrmaskin)
  4. Maskineri (drivsystem, upphangning, maskinplacering, typ_maskin, typ_styrsystem)
  5. Besiktning och underhall (besiktningsorgan, besiktningsmanad, skotselforetag, schaktbelysning)
  6. Modernisering (moderniserar, garanti, rekommenderat_moderniserar, budget_belopp, atgarder_vid_modernisering)
  7. Nodtelefon (har_nodtelefon, modell, typ, behover_uppgradering, pris)
  8. Kommentarer (fritext)
  9. Granska och spara (summary of all entered fields, ability to go back and correct)
- [ ] Hissnummer validated as unique in real-time
- [ ] Category fields use combobox pattern: filter existing suggestions + allow free text entry; new values auto-added to `forslagsvarden`
- [ ] Besiktningsmanad uses fixed enum (Jan-Dec)
- [ ] Boolean fields (genomgang, garanti, har_nodtelefon, etc.) use toggle switches
- [ ] Touch-optimized: minimum 44x44px touch targets, one field group per step, large buttons
- [ ] Works in portrait mode, no horizontal scrolling
- [ ] Organisation selector (admin can assign elevator to any org)
- [ ] "Save" sends Convex mutation; clear error if offline: "Ingen uppkoppling - forsok igen nar du har nat"
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-008: Form persistence (localStorage drafts)

**Description:** As an admin in the field, I need my in-progress form data to be automatically saved so that I never lose work due to network drops, page reloads, or closing the browser.

**Acceptance Criteria:**
- [ ] `lib/form-persistence.ts` in admin app: helpers for saving/loading/clearing drafts
- [ ] Form state auto-saved to localStorage on every field change (debounced ~500ms)
- [ ] Each form identified by key: `draft-ny-hiss` for new, `draft-hiss-{id}` for edit
- [ ] On page load, if draft exists: prompt "Du har ett sparat utkast. Vill du fortsatta dar du slutade?"
- [ ] On successful submit: draft cleared from localStorage
- [ ] Visual indicator "Utkast sparat" shown after each auto-save
- [ ] Draft survives: page reload, tab close, phone sleep mode
- [ ] No Service Worker, no IndexedDB, no sync queue — pure localStorage
- [ ] Applied to both the create wizard (US-007) and edit form (US-009)
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-009: Edit existing elevator (field app)

**Description:** As an admin, I want to search for and edit an existing elevator's data so that I can update information during field visits.

**Acceptance Criteria:**
- [ ] Convex mutation `hissar.update` with all fields, requires admin role, auto-sets senast_uppdaterad_av and senast_uppdaterad
- [ ] Search page at `/sok`: search by hissnummer or adress (debounced ~300ms), results list with hissnummer + adress + organisation
- [ ] Tapping a result navigates to `/hiss/:id/redigera`
- [ ] Edit form built with **TanStack Form**, shows current data, organized in same sections as creation wizard
- [ ] Clear marking of what has changed (diff highlight)
- [ ] Same localStorage draft persistence as creation (key: `draft-hiss-{id}`)
- [ ] Same combobox behavior for category fields
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-010: Daily overview (field app)

**Description:** As an admin, I want to see which elevators I've worked on today so that I can track my daily progress.

**Acceptance Criteria:**
- [ ] Home page at `/` (mobile view) shows:
  - "Ny hiss" button (prominent)
  - "Dagens hissar" list: elevators the current admin has created or updated today
  - Status per elevator: saved (checkmark) or draft in localStorage (pending icon)
  - "Sok befintlig hiss" button
- [ ] Convex query for elevators by skapad_av/senast_uppdaterad_av + date filter
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-011: Admin desktop layout and navigation

**Description:** As an admin on desktop, I need a sidebar navigation layout so that I can access all administrative and dashboard features.

**Acceptance Criteria:**
- [ ] Desktop layout with sidebar: Dashboard, Register, Modernisering, Underhall, Admin section (Organisationer, Anvandare, Import, Referensdata)
- [ ] Organisation selector dropdown in header (filter all views by selected org, or "Alla")
- [ ] Responsive: sidebar collapses on smaller screens; mobile users see the field app (US-010) instead
- [ ] Logo and "Hisskompetens" branding in header
- [ ] Active page highlighted in sidebar
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-012: Dashboard with KPIs and charts (admin + client)

**Description:** As an admin or customer, I want a dashboard with key metrics and visualizations so that I can understand the elevator fleet at a glance.

**Acceptance Criteria:**
- [ ] Convex query `hissar.stats`: returns aggregated KPIs (total count, average age, modernization within 3 years, total budget current year, count without modernization, latest inventory date)
- [ ] KPI cards displayed at top of dashboard
- [ ] Visualizations using Recharts:
  - Elevators per district (bar chart, descending)
  - Age distribution (histogram per decade)
  - Elevator types (pie chart)
  - Top-10 manufacturers (bar chart)
  - Modernization timeline: count per recommended year 2026-2045+ (bar chart)
  - Maintenance companies (donut chart)
- [ ] Admin dashboard at `/dashboard`: shows all orgs (or filtered by selected org)
- [ ] Client dashboard at `/` (client app): shows only the customer's own organization, no org selector
- [ ] Shared dashboard components in `packages/ui/`
- [ ] Convex tenant isolation: client queries automatically filtered by organisation_id
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-013: Elevator registry with search and filtering

**Description:** As an admin or customer, I want to search, filter, and browse the elevator registry so that I can quickly find specific elevators or subsets.

**Acceptance Criteria:**
- [ ] Convex query `hissar.list` with arguments: search (free text on hissnummer, adress, distrikt, fabrikat, hisstyp), distrikt[], hisstyp[], fabrikat[], skotselforetag[], byggarMin/Max, moderniserad (boolean), besiktningsorgan[], status, sort, order, page, limit
- [ ] Filter panel with multi-select dropdowns and range slider for byggar
- [ ] Free text search with real-time results (debounced ~300ms)
- [ ] Table view using **TanStack Table**: hissnummer, adress, distrikt, hisstyp, fabrikat, byggar, moderniserar, rekommenderat_moderniserar, budget_belopp
- [ ] Sortable columns, pagination (25/50/100 per page)
- [ ] Click on row opens detail view with all elevator info grouped in sections: Identifiering, Teknisk specifikation, Besiktning & underhall, Modernisering, Nodtelefon, Kommentarer
- [ ] Export function: CSV and Excel (Convex action `hissar.exportera`)
- [ ] Admin app at `/register`: full read/write (click edit navigates to edit form)
- [ ] Client app at `/register`: read-only, no edit buttons
- [ ] Tenant isolation for client queries
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-014: Modernization planning views

**Description:** As an admin or customer, I want to see modernization timelines, budgets, and priority lists so that I can plan elevator upgrades effectively.

**Acceptance Criteria:**
- [ ] Convex queries: `hissar.moderniseringTidslinje` (count per recommended year), `hissar.moderniseringBudget` (budget per year, district, type)
- [ ] Timeline view: horizontal timeline (current year - 2050) with elevator counts per recommended year
- [ ] Color coding: red (<=1 year), orange (2-4 years), yellow (5-9 years), green (10+ years)
- [ ] Clickable time periods filter the priority list below
- [ ] Budget overview: total budget per year (bar chart), cumulative curve, budget per district, budget per elevator type
- [ ] Priority list: table sorted by recommended modernization year with visual indicators (red/orange/green)
- [ ] Action summary: most common modernization actions with elevator counts
- [ ] Available at `/modernisering` in both admin and client apps (tenant-isolated for client)
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-015: Maintenance and inspection views

**Description:** As an admin or customer, I want to see inspection schedules, maintenance company overviews, and emergency phone status so that I can manage ongoing elevator maintenance.

**Acceptance Criteria:**
- [ ] Convex queries: `hissar.besiktningskalender` (count per month), `hissar.skotselforetag` (count per company, matrix by district), `hissar.nodtelefonstatus` (with/without, upgrade needs, total cost)
- [ ] Inspection calendar: visual monthly view showing elevator count per inspection month, list of elevators with upcoming inspection
- [ ] Maintenance company overview: count per company, matrix of company x district
- [ ] Emergency phone status: count with/without, count needing upgrade, total estimated upgrade cost, list per district
- [ ] Available at `/underhall` in both admin and client apps (tenant-isolated for client)
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-016: Excel import

**Description:** As an admin, I want to import elevator data from Excel files in Hisskompetens' existing "Statuslista" format so that I can migrate existing customer data into the system.

**Acceptance Criteria:**
- [ ] Convex actions: `importera.upload` (parse Excel), `importera.confirm` (execute import); query: `importera.preview`
- [ ] Upload .xlsx file at `/admin/import`
- [ ] System validates: file contains expected sheets ("Hissar" required, "Nodtelefoner" and "Rivna hissar" optional)
- [ ] Reads column headers from row 2 in "Hissar", validates mandatory columns (C, J, L, AB)
- [ ] Parses compound fields: marklast ("500*6"), antal plan/dorrar ("10*10"), korgstorlek ("1000*2050*2300"), dagoppning ("900*2000"), nodtelefon status, byggar (handles "Okant"), moderniserar (handles "Ej ombyggd", suffixes like "2007-vinga")
- [ ] "Nodtelefoner" sheet joined via hissnummer (column G)
- [ ] "Rivna hissar" sheet: same structure minus column AH (one column offset), status set to "rivd", no column headers
- [ ] Preview screen shows: count per sheet, new vs updated elevators, parsing warnings, invalid rows
- [ ] Admin confirms import; execution via Convex mutations with transaction guarantee
- [ ] Validation rules: unique hissnummer, required fields, reasonable byggar range, case-insensitive district matching
- [ ] New organization auto-created if customer name doesn't match existing
- [ ] New suggestion values auto-added to `forslagsvarden`
- [ ] Validation report generated post-import
- [ ] Supports ongoing imports (not just initial migration)
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-017: Client app layout and navigation

**Description:** As a customer, I need a clean portal layout with sidebar navigation so that I can access my organization's elevator data.

**Acceptance Criteria:**
- [ ] Client app layout with sidebar: Dashboard, Register, Modernisering, Underhall
- [ ] Organization name displayed as static text in header (no dropdown — customers see only their own org)
- [ ] No admin routes, no edit buttons, no user management — none of these exist in the client app bundle
- [ ] If a customer tries to access admin.hisskompetens.se, access is denied at login
- [ ] Unauthenticated users redirected to Clerk login
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-018: Landing page

**Description:** As a visitor, I want to see Hisskompetens' public website so that I can learn about their services and contact them.

**Acceptance Criteria:**
- [ ] TanStack Start app at `apps/landing/` deployed to Cloudflare Workers
- [ ] Pages: Startsida (`/`), Tjanster (`/tjanster`), Om oss (`/om-oss`), Kontakt (`/kontakt`)
- [ ] CMS-driven content via Convex: `cms.getPage`, `cms.listPages`, `cms.updatePage`, `cms.createPage` (admin-only mutations)
- [ ] `convex/cms.ts` with queries and mutations for page content
- [ ] Responsive design, Swedish language
- [ ] Professional look matching Hisskompetens brand
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-019: Email notifications (Resend + React Email)

**Description:** As an admin, I want to receive email reports after data imports so that I can verify the results.

**Acceptance Criteria:**
- [ ] `packages/email/` contains React Email templates
- [ ] Import report email template: shows successful/failed row counts, warnings, summary
- [ ] Resend integration in Convex action: sends email after import completion
- [ ] Sender domain: `noreply@hisskompetens.se` (requires DNS verification with Resend)
- [ ] Clerk handles all auth-related emails (invitations, password reset) — no custom templates needed for those
- [ ] Typecheck passes

---

### US-020: Elevator archive (demolished elevators)

**Description:** As an admin or customer, I want demolished or archived elevators to be hidden from default views but still searchable so that historical data is preserved.

**Acceptance Criteria:**
- [ ] `hissar.archive` mutation: sets status to "rivd" or "arkiverad", requires admin role
- [ ] Default views filter to `status === "aktiv"` only
- [ ] Filter option to show demolished elevators (status filter in registry)
- [ ] Archived elevators excluded from KPIs, budgets, and modernization planning
- [ ] Data preserved in database for historical reference
- [ ] Typecheck passes
- [ ] Use `/ui-ux-pro-max` skill for design guidance before implementing UI
- [ ] Verify in browser using dev-browser skill

---

### US-021: CI/CD pipeline

**Description:** As a developer, I need automated build, test, and deploy pipelines so that changes are deployed reliably.

**Acceptance Criteria:**
- [ ] `.github/workflows/` with CI/CD pipeline
- [ ] On push to main: typecheck all packages, build all apps, deploy to Cloudflare Workers via Wrangler, deploy Convex functions via `npx convex deploy`
- [ ] Domain routing: hisskompetens.se (landing), admin.hisskompetens.se (admin), app.hisskompetens.se (client)
- [ ] Environment variables/secrets configured for Clerk, Convex, Resend, Cloudflare
- [ ] Pipeline passes on a clean checkout

## Functional Requirements

- FR-1: Admin users can create, read, update, and archive elevator records across all organizations
- FR-2: Customer users can only read elevator data belonging to their own organization (tenant isolation enforced at Convex function level)
- FR-3: All category fields use combobox pattern: filter suggestions + allow free text; new values auto-added to suggestion table
- FR-4: Form data auto-saves to localStorage every 500ms; prompts to restore on page load; clears on successful submit
- FR-5: Fixed enums for: status (aktiv/rivd/arkiverad), besiktningsmanad (Jan-Dec), boolean fields (genomgang, garanti, har_nodtelefon, nodtelefon_behover_uppgradering)
- FR-6: Dashboard KPIs computed from live data: total count, average age, modernization needs within 3 years, total budget, count without modernization
- FR-7: Excel import supports the three-sheet "Statuslista" format with compound field parsing and validation
- FR-8: All user management (create, edit, deactivate, delete) performed by admin only — no customer self-service
- FR-9: Clerk handles all authentication, password management, invitation flows, and brute force protection
- FR-10: Convex provides real-time reactivity — changes by consultants appear in customer portals without refresh
- FR-11: All UI text in Swedish
- FR-12: Landing page content managed via CMS stored in Convex

## Non-Goals

- No Service Worker or PWA — the app requires connectivity to load (localStorage handles draft persistence only)
- No IndexedDB — localStorage is sufficient for form drafts (<50 KB per elevator)
- No offline sync queue — data submits directly via Convex mutation
- No conflict resolution — one consultant fills in one form and submits
- No photo uploads in v1 — consultants store photos on their phone separately
- No map view in v1
- No push notifications in v1
- No PDF report generation in v1
- No version history / audit trail for individual elevator changes in v1
- No MFA in v1 (Clerk supports it; can be enabled later without code changes)
- No pre-caching of elevator data for offline search

## Design Considerations

- **MANDATORY: Use the `/ui-ux-pro-max` skill for all frontend work** — invoke it before implementing any UI component, page, or layout. It provides style systems, color palettes, font pairings, UX guidelines, and component patterns. Every frontend task must be guided by this skill.
- Mobile field app: wizard pattern (one field group per step), touch-optimized (44x44px minimum), portrait mode, large buttons
- Desktop admin/client: sidebar navigation, data tables (TanStack Table), forms (TanStack Form), charts (Recharts)
- **shadcn/ui** as the base component library (Button, Input, Select, Dialog, Sheet, Table, Card, Tabs, Command, etc.) — installed into `packages/ui/` and shared across all apps
- **21st.dev** (via Magic MCP tools: `mcp__magic__21st_magic_component_builder`, `mcp__magic__21st_magic_component_inspiration`, `mcp__magic__21st_magic_component_refiner`, `mcp__magic__logo_search`) for higher-quality or specialized components — use `component_inspiration` to explore options, `component_builder` to generate, and `component_refiner` to polish. Use to enhance or replace default shadcn components when a better variant exists.
- Tailwind CSS for all styling — shadcn/ui's Tailwind-native approach keeps everything consistent
- Swedish language throughout — all labels, validation messages, help text, error messages

## Technical Considerations

- **TanStack Start** (React + TanStack Router + Vite + Nitro) for all three apps
- **Convex** as sole backend: schema, queries, mutations, actions, real-time, file storage
- **Clerk** (@clerk/tanstack-start) for authentication with `ConvexProviderWithClerk`
- **Cloudflare Workers** for hosting (via Nitro adapter)
- **Turborepo** + **pnpm workspaces** for monorepo management
- **shadcn/ui** as base component library (Tailwind-native, composable, accessible)
- **21st.dev** (Magic MCP: `mcp__magic__21st_magic_component_builder`, `mcp__magic__21st_magic_component_inspiration`, `mcp__magic__21st_magic_component_refiner`, `mcp__magic__logo_search`) — use for premium/specialized UI components alongside or in place of shadcn defaults
- **TanStack Form** for all forms (wizard, edit, admin forms, filters)
- **TanStack Table** for all data tables (sortable, paginated)
- **TanStack Virtual** for list virtualization if needed
- **TanStack-first rule**: before adding any library, check if TanStack has a solution — if yes, use it
- **Recharts** for dashboards and charts
- **React Email** + **Resend** for transactional emails
- **ALL dependencies must be latest stable versions** — verify before installing. Use modern APIs only (e.g., Tailwind v4 CSS-based config, not legacy JS config). Check docs via context7 MCP when unsure about current API.
- Convex free tier: 1 GB storage, 1M function calls/month — sufficient for <1000 elevators, <50 users
- Clerk free tier: up to 50,000 MAU
- Cloudflare Workers free tier: 100,000 requests/day

## Success Metrics

- Consultants use the app (not Excel) for all inventories within 1 month
- Zero reported data loss from network interruption within 6 months
- At least one customer logs in regularly within 2 months
- Customer finds a specific elevator within 5 seconds
- Customer prefers the portal over Excel delivery

## Open Questions

- Should Clerk be configured as a single instance with domain-based routing, or as two separate Clerk applications (admin + client)?
- Should the combobox component be built custom or use an existing library (e.g., cmdk, downshift)?
- Should the "Rivna hissar" sheet detection (missing column AH) be automatic or configurable?
- What branding assets (logo, colors, fonts) are available for the landing page?
- Should the budget year (currently hardcoded as 2026 in column AG) be configurable per import?
