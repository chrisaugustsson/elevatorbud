# PRD: CMS-admin for landningssidan

## Introduction

Administratörer behöver kunna redigera textinnehållet på landningssidans 4 sidor (Startsida, Om oss, Tjänster, Kontakt) utan att ändra kod. Convex-backend med `pages`-tabell och CMS-funktioner finns redan (`convex/cms.ts`). Landningssidorna (`apps/landing/`) läser redan från CMS:et och faller tillbaka på hårdkodat innehåll. Det som saknas är ett admin-UI i `apps/admin/` för att skapa och redigera sidinnehåll.

Lösningen är enkel: en ny route i admin-appen med flikar för de 4 sidorna, formulärfält för varje sektions textinnehåll, och en publicera-toggle. Sidstrukturen är fast — inga drag-and-drop, ingen sidbyggare, inget tillägg/borttagning av sektioner.

## Goals

- Ge administratörer möjlighet att redigera landningssidans innehåll via admin-appen
- Formulär med fasta fält som matchar varje sidas sektioner — användaren fyller i text
- Publicera/avpublicera sidor med en toggle
- Inga kodändringar ska behövas för att uppdatera landningssidans text

## User Stories

### US-001: Ny sidebar-länk "Webbplats"
**Description:** As an admin, I want a "Webbplats" link in the sidebar so that I can navigate to the CMS editor.

**Acceptance Criteria:**
- [ ] New sidebar group "Webbplats" with a Globe icon added below the main nav group
- [ ] Links to `/webbplats` route
- [ ] Active state highlights correctly when on `/webbplats`
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-002: CMS-sida med flikar för de 4 sidorna
**Description:** As an admin, I want to see tabs for Startsida, Om oss, Tjänster, and Kontakt so that I can switch between pages to edit.

**Acceptance Criteria:**
- [ ] Route `/webbplats` created at `apps/admin/src/routes/_authenticated/webbplats.tsx`
- [ ] 4 tabs rendered: "Startsida", "Om oss", "Tjänster", "Kontakt"
- [ ] Each tab loads the corresponding page data from `api.cms.getPage` using the slug (`startsida`, `om-oss`, `tjanster`, `kontakt`)
- [ ] When no CMS data exists yet, the form fields are empty (not pre-filled with fallback content)
- [ ] Active tab persists via URL search param (e.g. `?sida=om-oss`)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-003: Formulär för Startsida
**Description:** As an admin, I want a form with fields matching the Startsida sections so that I can edit its content.

The Startsida has 4 sections: `hero`, `features`, `stats`, `cta`. The form must have fields for each.

**Acceptance Criteria:**
- [ ] **Hero-sektion:** text input for `title`, textarea for `subtitle`, text input for CTA `text`, text input for CTA `href`
- [ ] **Features-sektion:** text input for section `title`, textarea for section `subtitle`, plus 6 fixed item groups each with: text input for `title`, textarea for `description`, icon selector (dropdown with icon names: ClipboardCheck, Wrench, BarChart3, Shield, Building2, Phone)
- [ ] **Stats-sektion:** 4 fixed item groups each with: text input for `value` (mapped to item `title`), text input for `label` (mapped to item `description`)
- [ ] **CTA-sektion:** text input for `title`, textarea for `subtitle`, text input for CTA `text`, text input for CTA `href`
- [ ] Each section is a visually distinct card/group with a section heading
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-004: Formulär för Om oss
**Description:** As an admin, I want a form with fields matching the Om oss sections so that I can edit its content.

The Om oss page has 4 sections: `hero`, `mission`, `values`, `story`.

**Acceptance Criteria:**
- [ ] **Hero-sektion:** text input for `title`, textarea for `subtitle`
- [ ] **Mission-sektion:** text input for `title`, textarea for `content`
- [ ] **Values-sektion:** text input for section `title`, plus 4 fixed item groups each with: text input for `title`, textarea for `description`, icon selector (Target, Eye, Users, Award)
- [ ] **Story-sektion:** text input for `title`, textarea for `content` (paragraphs separated by blank lines `\n\n`)
- [ ] Each section is a visually distinct card/group
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Formulär för Tjänster
**Description:** As an admin, I want a form with fields matching the Tjänster sections so that I can edit its content.

The Tjänster page has 2 sections: `hero`, `services` (plus a hardcoded CTA at the bottom that does not need CMS fields).

**Acceptance Criteria:**
- [ ] **Hero-sektion:** text input for `title`, textarea for `subtitle`
- [ ] **Services-sektion:** 6 fixed service groups each with: text input for `title`, textarea for `description`, icon selector (ClipboardCheck, Wrench, BarChart3, Shield, Building2, Phone)
- [ ] Each section is a visually distinct card/group
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Formulär för Kontakt
**Description:** As an admin, I want a form with fields matching the Kontakt sections so that I can edit its content.

The Kontakt page has 3 sections: `hero`, `contact`, `form`.

**Acceptance Criteria:**
- [ ] **Hero-sektion:** text input for `title`, textarea for `subtitle`
- [ ] **Contact-sektion:** text input for section `title`, textarea for section `subtitle`, plus 4 fixed item groups each with: text input for `title`, text input for `description`, icon selector (Mail, Phone, MapPin, Clock)
- [ ] **Form-sektion:** text input for `title`, textarea for `subtitle`
- [ ] Each section is a visually distinct card/group
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Spara innehåll
**Description:** As an admin, I want to save my edits so that the landing page reflects the new content.

**Acceptance Criteria:**
- [ ] "Spara" button at the bottom of the form
- [ ] If no page exists in the database for this slug, calls `api.cms.createPage` with the form data
- [ ] If a page already exists, calls `api.cms.updatePage` with the changed data
- [ ] Form data is converted to the correct `sections` array format before saving
- [ ] Shows a success toast (e.g. "Sidan har sparats") after successful save
- [ ] Shows an error toast if save fails
- [ ] Button shows loading state while saving
- [ ] Typecheck passes

### US-008: Publicera/avpublicera toggle
**Description:** As an admin, I want to toggle whether a page is published so that I can prepare content before making it live.

**Acceptance Criteria:**
- [ ] Switch/toggle labeled "Publicerad" in the form header area, next to the page title
- [ ] Toggle state is saved together with the page content when clicking "Spara"
- [ ] Visual indicator showing current publish state (e.g. green badge "Publicerad" / gray badge "Utkast")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

## Functional Requirements

- FR-1: Add a "Webbplats" item to the admin sidebar with a Globe icon, placed as a new sidebar group
- FR-2: Create route `apps/admin/src/routes/_authenticated/webbplats.tsx`
- FR-3: Render 4 tabs corresponding to the 4 landing pages (slugs: `startsida`, `om-oss`, `tjanster`, `kontakt`)
- FR-4: Each tab fetches existing page data via `useQuery(api.cms.getPage, { slug })` and populates the form if data exists
- FR-5: Form fields are empty when no CMS data exists (not pre-filled with fallback values)
- FR-6: Each page tab renders a hardcoded form matching that page's section structure (see US-003 through US-006)
- FR-7: Icon selectors are simple dropdowns with the available icon names for that section
- FR-8: "Spara" button calls `createPage` (if new) or `updatePage` (if existing), converting form state to the `sections` array format
- FR-9: "Publicerad" toggle is included in the save payload
- FR-10: Success/error feedback via toast notifications after save

## Non-Goals

- No drag-and-drop reordering of sections
- No adding or removing sections — the structure per page is fixed
- No adding or removing items within a section — the item count is fixed
- No visual page preview within the admin (users can check the landing page directly)
- No rich text editor — plain text inputs and textareas only
- No image upload — `imageUrl` field is not exposed in the admin UI
- No revision history or undo
- No per-section publish control — publish is per page

## Design Considerations

- Follow the existing admin app patterns: use shadcn/ui components (Card, Input, Textarea, Tabs, Switch, Button, Label)
- Section groups should be wrapped in `Card` components with `CardHeader` and `CardContent`
- Use the existing `Tabs` component from shadcn/ui for page switching
- Icon selectors can be a simple `Select` dropdown with icon names as options
- The form should be a single scrollable page per tab — no nested navigation
- Swedish labels throughout (matching the rest of the admin app)

## Technical Considerations

- The CMS backend (`convex/cms.ts`) already has all needed functions: `getPage`, `listPages`, `createPage`, `updatePage`
- The `sectionValidator` in `cms.ts` defines the section shape — form data must conform to this
- The `sections` array uses `type` to distinguish sections and `order` for positioning
- For items (features, values, contact info, stats), the CMS uses `items` array with `title`, `description`, and `icon` fields
- Stats on the Startsida map `value` → item `title` and `label` → item `description`
- Story content on Om oss uses `content` field with paragraphs joined by `\n\n`
- Services on Tjänster use only `title`, `description`, and `icon` from the items (the `features` sub-list in the fallback is not part of the CMS schema and should be excluded)
- Active tab can be tracked via TanStack Router search params

## Success Metrics

- Admin can edit all 4 landing page contents without touching code
- Changes saved in admin are reflected on the landing page immediately (Convex real-time)
- Form correctly round-trips data: save → reload → same data in form

## Open Questions

- Should the Tjänster page's per-service feature bullet lists be editable? The current CMS schema (`items` array with `title`/`description`/`icon`) does not support sub-lists. For now, excluded — the feature lists would remain hardcoded in the landing page fallback.
