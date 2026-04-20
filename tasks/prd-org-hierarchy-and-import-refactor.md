# PRD: Organization Hierarchy, Multi-Org Access, and Import Refactor

## Introduction/Overview

Currently the system treats organizations as flat — users have access to a single org, elevators belong directly to one org, and the Excel import treats every distinct org name as its own top-level entity. This is a poor fit for how customers actually work: a single parent organization (e.g. Bostadsbolaget) has many sub-organizations, users often need access across several of them, and contact persons vary per building rather than per org.

This PRD introduces:

1. **Organization hierarchy** via a `parentId` relationship, so sub-organizations can belong to a parent. The hierarchy is **exactly one level deep** — an org that already has a parent cannot itself be a parent to another org.
2. **Multi-org user access** via a many-to-many relationship, with inherited access through the hierarchy (access to a parent implies access to its direct children).
3. **Contact person on the elevator** instead of the organization, since contact info varies per building.
4. **Revised Excel import flow** — the user maps each distinct org name in the file to an existing org (auto-matched when possible) before the import runs, and can create new orgs inline via a dialog.
5. **Flexible sheet handling in the import** — drop the hard-coded sheet names (`Hissar`, `Nödtelefoner`, `Rivna hissar`) and let the admin pick which sheets to import from. The existing column-mapping step is reused per selected sheet. Emergency phone and removed-elevator imports are dropped entirely.

Since the project is not yet live, all existing data will be cleared as part of this rollout. No migration of existing records is required.

## Goals

- Support a parent/child organization structure — one-level deep only (root orgs and their direct children).
- Support users with access to multiple organizations, with access to a parent org implying access to its direct children.
- Move contact person from organization to elevator so each elevator can have its own contact.
- Replace the current "auto-create org from Excel" import behavior with an explicit mapping step.
- Eliminate the risk of accidentally creating duplicate organizations through silent fuzzy matching.
- Support Excel files with arbitrary sheet structures (e.g., sheets grouped by country) by letting the admin select which sheets to import from.
- Remove support for importing emergency phones and removed elevators — these features are no longer maintained.

## User Stories

### US-001: Add `parentId` to organizations with one-level-deep constraint
**Description:** As a developer, I want organizations to support a self-referential parent so that we can model a one-level parent/child hierarchy.

**Acceptance Criteria:**
- [ ] Add nullable `parentId` column to `organizations` table referencing `organizations.id`
- [ ] Enforce one-level-deep constraint at the database layer: an org with a non-null `parentId` cannot itself be referenced by another org's `parentId` (check constraint, trigger, or validation in the write path — pick the simplest reliable option)
- [ ] Drizzle schema updated with self-relation
- [ ] Migration generated and runs cleanly
- [ ] Typecheck passes

### US-002: Add user-organization many-to-many
**Description:** As a developer, I want a join table between users and organizations so that a user can have direct access to multiple orgs.

**Acceptance Criteria:**
- [ ] Create `userOrganizations` table (userId, organizationId, createdAt, composite PK)
- [ ] Remove `organizationId` column from `users` table
- [ ] Drizzle schema + relations updated
- [ ] Cascade delete on both userId and organizationId
- [ ] Migration runs cleanly
- [ ] Typecheck passes

### US-003: Move contact person to elevator
**Description:** As a user, I want each elevator to have its own contact person so that different buildings can have different on-site contacts.

**Acceptance Criteria:**
- [ ] Remove `contactPerson*` fields from `organizations` table
- [ ] Add `contactPersonName`, `contactPersonPhone`, `contactPersonEmail` to `elevators` table (single contact per elevator)
- [ ] Drizzle schema updated
- [ ] Migration runs cleanly
- [ ] Typecheck passes

### US-004: Resolve effective org access for a user
**Description:** As a developer, I want a helper that returns the full set of org IDs a user has access to (directly granted + direct children of those grants), so that client-app queries can filter correctly.

**Acceptance Criteria:**
- [ ] Helper function `getEffectiveOrganizationIds(userId)` in `packages/auth/` or `packages/db/`
- [ ] Uses a single join (no recursion needed — hierarchy is one level deep)
- [ ] Returns deduplicated array of org IDs (direct grants ∪ orgs where `parentId` is in the direct grants)
- [ ] Unit tested with: user with a single direct grant (no children), user with a direct grant that has children, user with multiple direct grants at different roots
- [ ] Typecheck passes

### US-005: Scope client-app queries to the current parent context
**Description:** As a client-app user, I want every page to show data for the parent organization I'm currently viewing (including its direct children), so that each screen has a clear, single-context scope.

**Acceptance Criteria:**
- [ ] Client app routes include the current parent org in the URL: `/:parentOrgId/...`
- [ ] Every client-app server function filters by `organizationId IN (currentParentId, ...childrenOfCurrentParent)`
- [ ] Middleware validates the URL's `parentOrgId` is in the user's effective direct grants — otherwise 404/redirect
- [ ] `context.user.organizationId` / `organizationIds` is replaced with `context.currentContextOrgIds` (array: the parent plus its direct children)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill — a user with access to a parent org sees elevators from its child orgs merged into each view

### US-006: Admin can set parent on organization
**Description:** As an admin, I want to set a parent organization when creating or editing an org, so that I can build out the one-level hierarchy.

**Acceptance Criteria:**
- [ ] Org create/edit form includes "Parent organization" dropdown (searchable)
- [ ] Dropdown only shows **root orgs** (orgs with `parentId = null`) — an org that already has a parent is not a valid parent choice
- [ ] Dropdown excludes the org being edited
- [ ] If the org being edited already has children, the parent dropdown is disabled with a tooltip ("This organization has sub-organizations and cannot itself have a parent")
- [ ] Clearing the dropdown sets `parentId` to null (makes it a top-level org)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Admin can grant user access to multiple orgs
**Description:** As an admin, I want to grant a user access to one or more organizations, so that users with multi-org responsibilities have a single login.

**Acceptance Criteria:**
- [ ] User edit page shows list of orgs the user currently has direct access to
- [ ] Admin can add/remove orgs from the user's access list
- [ ] UI visually distinguishes inherited access (via parent grant) from direct grants
- [ ] When revoking a direct grant, a toast confirms the action and lists the child orgs the user also lost implicit access to (e.g., "Removed access to Bostadsbolaget. User also lost inherited access to 4 sub-organizations.")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Parse Excel and extract distinct org names
**Description:** As a developer, I want the import to parse the Excel file and return a list of distinct org names (case-sensitive) found in it, so that the mapping UI can drive from a clean dataset.

**Acceptance Criteria:**
- [ ] Server function returns `{ orgNames: string[], rowCount: number, parsedRows: ... }` from uploaded Excel
- [ ] Names are deduplicated as exact strings (case preserved — "Bostadsbolaget" and "bostadsbolaget" appear as two separate entries)
- [ ] Parsed row data held server-side (or re-uploaded on import) so mapping UI doesn't have to re-parse
- [ ] Typecheck passes

### US-009: Build the import mapping UI
**Description:** As an admin, I want a mapping screen that shows every org name in the Excel alongside a dropdown of existing orgs, with auto-selected exact matches, so that I can confirm or change each mapping before running the import.

**Acceptance Criteria:**
- [ ] Table UI: one row per distinct org name in Excel
- [ ] Each row has a searchable dropdown of existing orgs
- [ ] Exact case-sensitive matches are auto-selected (shown as pre-selected, not silently applied)
- [ ] Rows with no match show a "Create organization" option in the dropdown
- [ ] Admin can change any auto-selected mapping
- [ ] Import button is disabled until every row has a resolved org ID
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Inline "Create organization" dialog
**Description:** As an admin, I want to create a new organization from within the import flow without losing my parsed Excel or partial mapping, so that I can resolve unmapped names without restarting.

**Acceptance Criteria:**
- [ ] Dialog opens from the "Create organization" option in the mapping dropdown
- [ ] Minimal fields: name (prefilled from Excel row), optional parent organization
- [ ] On save, the new org is created and auto-selected for that mapping row
- [ ] Parsed Excel and other mapping selections persist across dialog open/close
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Run the import with resolved mapping
**Description:** As an admin, I want the import to create elevators (not organizations) using the confirmed mapping, so that each elevator is linked to the right org.

**Acceptance Criteria:**
- [ ] Import creates one elevator per Excel row
- [ ] `organizationId` is set from the resolved mapping
- [ ] `contactPersonName`, `contactPersonPhone`, `contactPersonEmail` are populated from the Excel row
- [ ] No organizations are created as a side effect of running the import
- [ ] Import is transactional — all-or-nothing, failure rolls back
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Clear existing data and reset
**Description:** As a developer, I want all existing elevators, organizations, user-org links, and related records cleared so that the new schema starts with a clean slate.

**Acceptance Criteria:**
- [ ] Reset script truncates relevant tables in the correct FK order
- [ ] Script is guarded to prevent accidental execution against prod
- [ ] Typecheck passes

### US-013: Drop hard-coded sheet name validation
**Description:** As a developer, I want the parser to stop requiring specific sheet names (`Hissar`, `Nödtelefoner`, `Rivna hissar`) so that files with any sheet structure can be imported.

**Acceptance Criteria:**
- [ ] Remove the mandatory-sheet check in `parse-excel-import-with-mapping.ts`
- [ ] Parser can open any workbook and return metadata about each sheet (name, row count, first-row preview)
- [ ] Typecheck passes

### US-014: Remove emergency phone and removed-elevator import
**Description:** As a developer, I want to drop the emergency phone (`Nödtelefoner`) and removed elevator (`Rivna hissar`) import paths so the codebase only handles elevators.

**Acceptance Criteria:**
- [ ] Delete the hard-coded parsers for `Nödtelefoner` and `Rivna hissar`
- [ ] Remove emergency-phone-specific header aliases and types
- [ ] Remove the join logic that merges emergency phone data into elevators
- [ ] Any UI elements related to these two flows are removed
- [ ] Typecheck passes

### US-015: Sheet selection step in import
**Description:** As an admin, I want to pick which sheets to import from after uploading the file, so that I can skip sheets that aren't relevant (e.g., emergency phones, removed elevators, or country sheets I don't want).

**Acceptance Criteria:**
- [ ] After upload, a new step shows a list of all sheets in the workbook
- [ ] Each sheet row shows: sheet name, row count, and a preview of the first row's values
- [ ] Admin selects sheets via checkboxes (defaults: all selected for multi-sheet files of equal shape; can be changed)
- [ ] At least one sheet must be selected to proceed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Per-sheet column mapping with inherited defaults
**Description:** As an admin, I want each selected sheet to go through its own column-mapping step so I stay in control, but the mapping from the previous sheet should carry over as a default so I don't have to redo identical work.

**Acceptance Criteria:**
- [ ] After sheet selection, the column-mapping step runs once per selected sheet, sequentially, with a visible progress indicator ("Sheet 2 of 4: [sheet name]")
- [ ] The first sheet uses the existing auto-mapping logic (via `HEADER_ALIASES`)
- [ ] Subsequent sheets inherit the previous sheet's resolved mapping as their starting default, overlaid on auto-detection
- [ ] Admin can change any mapping on any sheet before advancing — the inherited default is a suggestion, not a lock
- [ ] Mandatory field validation applies per sheet before advancing
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-017: Merge rows from all selected sheets before org mapping
**Description:** As a developer, I want rows from every selected sheet merged into a single parsed dataset before the org-mapping step, so that the downstream flow doesn't have to know how many sheets were involved.

**Acceptance Criteria:**
- [ ] After column mapping is resolved for all selected sheets, rows are concatenated into one dataset
- [ ] `_source_sheet` metadata is preserved on each row for debug/trace
- [ ] The org-name-mapping step (US-009) receives the deduplicated org names across all merged rows
- [ ] Typecheck passes

### US-018: Import flow stepper with back navigation
**Description:** As an admin, I want to see which step I'm on during the import and be able to go back without losing my work, so that I can correct mistakes without restarting.

**Acceptance Criteria:**
- [ ] Step indicator visible on every import screen (e.g., "Step 2 of 5: Select sheets")
- [ ] Steps: (1) Upload, (2) Select sheets, (3) Map columns, (4) Map org names, (5) Review & import
- [ ] Current step highlighted; completed steps marked done; future steps disabled/muted
- [ ] Back button on every step except upload
- [ ] Going back preserves all state — uploaded file, sheet selection, column mappings, org-name mappings
- [ ] Re-entering a later step after going back does not reset its state
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-019: File upload validation and error states
**Description:** As an admin, I want clear error messages when an upload fails, so that I know how to fix the problem rather than the flow silently breaking.

**Acceptance Criteria:**
- [ ] Reject non-Excel files (not `.xlsx` / `.xls`) with a message stating the accepted formats
- [ ] Enforce a file size limit (TBD, e.g. 10MB) with a message stating the limit and the uploaded size
- [ ] Surface a parse error if the workbook is corrupt or unreadable
- [ ] Surface an error if the workbook has zero sheets
- [ ] Every error message states the cause AND the recovery step (e.g., "File must be .xlsx — re-export from Excel and try again")
- [ ] Errors are announced via `aria-live="assertive"` for screen readers
- [ ] Upload zone supports drag-drop with visible hover state plus a keyboard-accessible "Choose file" button
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-020: Empty and unmappable sheet handling
**Description:** As an admin, I want meaningful feedback when selected sheets have no usable data or missing mandatory columns, so that I'm never stuck at a dead end.

**Acceptance Criteria:**
- [ ] Sheets with only a header row (zero data rows) show an inline warning on the sheet-selection row
- [ ] If every selected sheet has zero data rows, the "Next" button is disabled with an explanation
- [ ] Column mapping surfaces missing mandatory fields prominently (red badge + list)
- [ ] "Next" from column mapping is disabled until every mandatory field is mapped (per sheet when headers differ; once when headers match)
- [ ] If no matching orgs exist at all on the org-name mapping step, the step still works — every row defaults to "Create organization" with a helpful banner
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-021: Confirm navigation away from unsaved import
**Description:** As an admin, I don't want to accidentally lose my parsed Excel and in-progress mappings by clicking away or refreshing, so that a stray click doesn't waste 20 minutes of mapping work.

**Acceptance Criteria:**
- [ ] Navigating away (route change, tab close, refresh) after upload triggers a confirmation dialog
- [ ] Dialog states clearly that import progress will be lost
- [ ] Confirmation only fires when in-progress state exists (not on bare upload step before a file is selected, not after successful import)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-022: Import execution progress and result reporting
**Description:** As an admin, I want to see progress during import execution and a clear result afterwards, so that large imports don't feel like a black box and failures are actionable.

**Acceptance Criteria:**
- [ ] During import, show a progress indicator with batch progress (e.g., "Importing… 250 / 1200 elevators")
- [ ] Import button disabled during execution
- [ ] On success: a summary screen with counts per org ("Created 200 elevators in Bostadsbolaget, 80 in Sub-Org A")
- [ ] On failure: an error screen stating which row/sheet/field caused the failure + a reminder that the transaction was rolled back (per FR-11), plus "Back to mapping" and "Start over" actions
- [ ] Parse and analyze steps each show skeleton/loading feedback when they exceed 300ms
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-023: Warn when org parent change affects user access
**Description:** As an admin, I want to know when changing an org's parent will grant or revoke inherited access for existing users, so that I don't silently expand or cut off access to other people's data.

**Acceptance Criteria:**
- [ ] When saving a `parentId` change, the system computes the diff of effective access for all users with a direct grant on the old parent and/or the new parent
- [ ] If any user gains OR loses inherited access, show a warning dialog with aggregate counts: "X users will gain access, Y users will lose access"
- [ ] Dialog includes an expandable "View affected users" section that lists the affected users (name, email, and gain/lose indicator)
- [ ] Admin must confirm explicitly before the change is applied
- [ ] No warning when the change has no access-inheritance impact
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-024: Effective access preview in user-org management
**Description:** As an admin, I want to see the total effective org count and which orgs are inherited vs direct for a user, so that I understand the reach of each grant.

**Acceptance Criteria:**
- [ ] User access page shows "Effective access: N organizations" total
- [ ] Each direct grant row is expandable to show the descendants it transitively grants
- [ ] Inherited orgs shown read-only, labeled "via [parent name]"
- [ ] Direct grants use a solid badge; inherited shown with a muted/outline badge + label (never color alone)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-025a: Client-app parent context + switcher
**Description:** As a client-app user with access to one or more parent orgs, I want the app to place me in one parent context at a time (with a switcher in the header if I have more than one), so that I always see a focused view without being forced to pick an org upfront.

**Acceptance Criteria:**
- [ ] On login, the user lands on their last-used parent context (via cookie/localStorage). Fallback: first direct grant alphabetically
- [ ] Header shows the current parent org name
- [ ] If the user has 2+ direct grants, the header name is a dropdown listing those direct grants (not their children); selecting one routes to that parent
- [ ] If the user has only 1 direct grant, no switcher is shown (name is static text)
- [ ] Switching updates the URL (`/:parentOrgId/...`) and replaces the list/dashboard state
- [ ] A user with a direct grant on a child org only (not its parent) treats that child as their context, as if it were a root
- [ ] Admin grant UI (US-007) prevents granting a user direct access to both a parent and one of its children (redundant — the child grant is implied)
- [ ] Long org names in the trigger truncate with ellipsis; full name available via accessible tooltip and `aria-label`
- [ ] Trigger button has `aria-haspopup="menu"`, `aria-expanded`, and `aria-label` that describes state (e.g., "Current organization: Bostadsbolaget. Click to switch.")
- [ ] Dropdown uses semantic menu roles; current selection marked `aria-current="true"` AND a visible checkmark (not color alone)
- [ ] Dropdown is keyboard-navigable (arrow keys, Enter to select, Escape to close); closes on outside click; focus returns to the trigger after close
- [ ] When the user has 10+ direct grants, the dropdown includes a type-to-filter input at the top
- [ ] Loading state: while orgs are being fetched on initial app load, the header shows a skeleton placeholder for the switcher slot
- [ ] Narrow viewport (<768px): switcher opens as a full-screen sheet or bottom sheet rather than a cramped dropdown
- [ ] After a switch, the context change is announced via `aria-live="polite"` (e.g., "Switched to Sub-Org A"), focus moves to the main content heading, and the page content crossfades (≤200ms, respects `prefers-reduced-motion`)
- [ ] Invalid or inaccessible `:parentOrgId` in URL: redirect to last-used or default context with a toast ("That organization is unavailable")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-025b: Sub-org filter on client-app list pages
**Description:** As a client-app user in a parent context that has sub-orgs, I want to filter list pages by sub-org and see which sub-org each row belongs to, so that I can narrow focus when needed.

**Acceptance Criteria:**
- [ ] When the current parent has one or more children, list pages (register and equivalents) show a sub-org filter and a sub-org column
- [ ] When the current parent has zero children, the filter and column are hidden entirely (no "only one value" dropdown appears)
- [ ] Filter is single-select; default option is "All sub-organizations"
- [ ] When a specific sub-org is selected, a dismissable filter chip appears above the table ("Sub-Org A ×") mirroring existing filter-chip treatment
- [ ] Filter state persists in URL query params (consistent with existing URL-driven filter pattern)
- [ ] Empty state when the selected sub-org has zero matching rows: "No elevators in [Sub-Org Name]" with a "Clear filter" action
- [ ] Narrow viewport (<768px): sub-org filter moves into the existing filter drawer; sub-org column is hidden (the sub-org name appears inline in the row's secondary text instead)
- [ ] Filter change announces the new result count via `aria-live="polite"` (e.g., "Showing 42 elevators")
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-025c: Dashboard aggregates across the current parent context
**Description:** As a client-app user, I want the dashboard to show aggregated numbers across the current parent org and all its sub-orgs, so that I can see the full picture at a glance.

**Acceptance Criteria:**
- [ ] Dashboard queries use `currentContextOrgIds` (parent + direct children)
- [ ] No sub-org filter shown on the dashboard by default
- [ ] Existing drill-down mechanism on charts can reveal per-sub-org breakdowns where the chart supports it
- [ ] Each chart loads independently — one slow or failed query does not block the others
- [ ] Each chart has its own skeleton placeholder during load (no blank axis frames)
- [ ] Each chart has its own error state with a retry action; never a broken axis or blank panel
- [ ] Empty-data state (parent + sub-orgs have zero elevators): each chart shows a "No data yet" message with supporting copy, rather than an empty axis
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-025d: Modernisering page sub-org drill-down
**Description:** As a client-app user viewing modernisering charts for a parent context with sub-orgs, I want to drill down to a specific sub-org using the existing chart-click mechanism, so that I can focus on one sub-org without needing dedicated filter controls.

**Acceptance Criteria:**
- [ ] When the current parent has children, a chart dimension (or existing clickable bar) supports drilling down by sub-org
- [ ] Clicking a sub-org in a chart filters the other charts on the page to that sub-org via URL params (reuses existing URL-driven filter pattern)
- [ ] Clickable bars have a visible hover/focus state (cursor pointer + outline or elevation change) signaling interactivity
- [ ] Chart bars are keyboard-focusable; Enter or Space triggers drill-down (parity with click)
- [ ] After drill-down, a dismissable filter chip appears above the chart grid ("Sub-Org A ×") — clearing the chip restores the aggregated view
- [ ] Drill-down state change is announced via `aria-live="polite"` ("Filtered to Sub-Org A")
- [ ] When the parent has no children, no sub-org drill-down affordance is rendered at all (no disabled hint, no dead hover state)
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-025: Accessibility across import and org management flows
**Description:** As a keyboard or screen-reader user, I want the entire import flow and org management pages to be fully operable with predictable focus and clear announcements.

**Acceptance Criteria:**
- [ ] All interactive elements keyboard-reachable in logical tab order
- [ ] On step advance, focus moves to the step heading
- [ ] Form errors use `aria-live="polite"`; hard failures use `role="alert"`
- [ ] All icon-only buttons have `aria-label`
- [ ] Modal dialogs (create-org, change-parent warning) trap focus and restore focus on close
- [ ] Color is never the sole indicator (inherited vs direct access, valid vs invalid mapping, required vs optional column — always icon or text too)
- [ ] Color contrast ≥4.5:1 for all text in both light and dark mode
- [ ] Typecheck passes

## Functional Requirements

- FR-1: `organizations` gains a nullable self-referential `parentId` column.
- FR-2: Organization hierarchy is exactly one level deep. An org with a non-null `parentId` cannot itself be referenced as another org's parent. Enforced at both the database layer and in the UI (parent dropdown only shows root orgs).
- FR-3: `users.organizationId` is removed and replaced by a `userOrganizations` join table (many-to-many).
- FR-4: A user's effective access is the union of their direct grants and the direct children of those grants (single join, no recursion).
- FR-5: `organizations.contactPerson*` fields are removed.
- FR-6: `elevators` gains `contactPersonName`, `contactPersonPhone`, and `contactPersonEmail` — a single contact per elevator.
- FR-7: The Excel import no longer creates organizations as a side effect.
- FR-8: The import presents a mapping UI that lists every distinct org name (case-sensitive) found in the file.
- FR-9: Exact case-sensitive matches are auto-selected in the mapping dropdown. Non-exact variants (different casing, whitespace, punctuation) are NOT auto-merged — the admin decides.
- FR-10: The import cannot run until every mapping row has a resolved org ID.
- FR-11: The inline "Create organization" dialog preserves import state (parsed file + mapping selections) across open/close.
- FR-12: The client app operates within a single **parent context** at a time. The context is the parent org (determined by URL param `:parentOrgId`) plus its direct children. Every client-app query filters by the resolved context org IDs. Middleware validates the URL's `parentOrgId` is in the user's effective direct grants.
- FR-13: Admin app is unaffected — continues to see all data; `organizationId` remains an optional filter when viewing a single org.
- FR-14: Existing data is cleared at deployment time; no migration of prior records.
- FR-15: The import parser accepts any workbook regardless of sheet names. Sheet names are no longer validated against a fixed list.
- FR-16: The import flow includes an explicit sheet-selection step after upload. Only selected sheets are parsed and imported.
- FR-17: Column mapping runs once per selected sheet. The first sheet uses auto-mapping; each subsequent sheet inherits the previous sheet's resolved mapping as its default, which the admin can override before advancing.
- FR-18: Rows from all selected sheets are merged into a single dataset before the org-mapping step.
- FR-19: Emergency phone imports (`Nödtelefoner`) and removed-elevator imports (`Rivna hissar`) are fully removed from the codebase and UI.
- FR-20: Every async operation that exceeds 300ms must show a loading indicator (skeleton, progress bar, or spinner).
- FR-21: All org-selection dropdowns (org-name mapping, parent selector, user access) are type-to-filter searchable with keyboard navigation (arrow keys, enter, escape).
- FR-22: The import flow preserves all user state across back/forward step navigation until a successful import or an explicit "Start over".
- FR-23: Navigating away from the import flow after upload, with in-progress state, triggers a confirmation dialog.
- FR-24: Required-column validation blocks advancing the column-mapping step until all mandatory fields are mapped (per sheet when headers differ; once when they match).
- FR-25: Every error message describes cause AND recovery path; no bare "Error" or "Invalid" messages.
- FR-26: Form errors use `aria-live`; modal dialogs trap focus and restore on close.
- FR-27: A step indicator is visible on every import step (current highlighted, completed done, future muted).
- FR-28: Each import step has exactly one primary CTA (Next / Import) and at most one secondary action (Back / Cancel).
- FR-29: Client app URLs are scoped to the current parent context: `/:parentOrgId/...`. Deep links preserve context.
- FR-30: Header switcher only shows the user's direct grants (parent-level orgs). Children are never switcher entries.
- FR-31: Header switcher is shown only when the user has 2+ direct grants. With one direct grant, the current org name is static text.
- FR-32: On login the client app restores the last-used parent context (per user), or defaults to the first direct grant alphabetically when no prior state exists.
- FR-33: The admin user-grant UI (US-007) prevents creating a direct grant on a user for both a parent and one of its children.
- FR-34: Sub-org filter and column on list pages are only rendered when the current parent has 1+ children; otherwise hidden.
- FR-35: Context switch animates via a ≤200ms content crossfade and respects `prefers-reduced-motion` (no animation when set).
- FR-36: The list of direct grants for the header is loaded alongside the app shell; the header switcher slot shows a skeleton while not yet loaded.
- FR-37: At narrow viewports (<768px) the switcher renders as a full-screen or bottom sheet instead of a dropdown.
- FR-38: An invalid or inaccessible `:parentOrgId` in the URL redirects to the user's last-used or default context and surfaces a toast explaining the redirect.
- FR-39: The header switcher exposes a type-to-filter search when the user has 10+ direct grants.
- FR-40: After a context switch, focus moves to the main content heading and the change is announced via `aria-live="polite"`.
- FR-41: Dashboard and modernisering charts render independently — one chart's loading or error state never blocks the others. Each chart has its own skeleton, error-with-retry, and empty-data states.
- FR-42: Active chart drill-down state is represented by a dismissable filter chip above the chart grid and is announced via `aria-live`.

## Non-Goals

- No multiple contact persons per elevator (single contact only for now).
- No fuzzy matching of org names during import — only exact string matches auto-select.
- No migration of existing data — it is wiped.
- No closure table, recursion, or deeper hierarchies — one level is the whole story.
- No hierarchical permission levels (e.g., "viewer on child orgs, editor on parent") — access is binary.
- No bulk user-org grants via UI — one at a time is enough for this PRD.
- No changes to the landing app or auth/session setup.
- No import support for emergency phones or removed elevators — both features are removed, not migrated.
- No automatic reconciliation when selected sheets have partially overlapping headers — either identical (map once) or different (map per sheet). No "merge compatible columns" attempt.
- No persistence of mapping templates across imports — each import starts fresh.

## Design Considerations

- The mapping UI should reuse existing table and dropdown primitives from the admin app.
- The inline "Create organization" dialog should reuse the existing org create form, with parent preselected if the admin is importing from within a specific parent org's page.
- The create-org dialog must confirm discard when closed with modified fields.
- In the user access UI, "inherited via parent" access is visually distinct from direct grants — solid badge for direct, muted/outline badge + "via X" label for inherited. Icon and text, not color alone.
- Destructive or impactful actions (clear-data reset, parent change with user-access impact) use warning styling and explicit confirmation.
- Sheet-selection step shows sheet name, row count, and a first-row preview for each sheet so the admin can recognize which sheet is which without re-opening Excel.
- File upload zone supports drag-drop with a clear drop-zone hover state, plus a keyboard-accessible "Choose file" button.
- Long org dropdowns should virtualize or paginate if the list exceeds ~100 items.
- Loading: show skeletons for parsing/analysis (exceeds 300ms); show a labeled progress bar for the import execution (batch counter).
- Touch targets on the import flow steps and mapping rows are at least 44×44px to stay usable on tablets.
- Dark and light modes are tested independently — inherited-access badges, mandatory-field warnings, and error states must remain legible in both.
- Header switcher: chevron icon appears only when 2+ direct grants exist. Current parent name uses the same typographic treatment whether or not the switcher is present, so single-grant users don't feel "downgraded" visually.
- Switching parent context replaces the current page's state (filters, drill-downs, pagination reset) rather than trying to translate state between contexts, which would often produce nonsense.
- Sub-org filter on list pages reuses the existing filter-bar primitives. Sub-org column shows the sub-org name as a muted label — not a link (no navigation to a dedicated sub-org page in the client app).
- Switcher trigger: current org name + chevron. Icon style and spacing match the existing admin/client header iconography; min 44×44px hit area.
- Dropdown menu surface uses the existing elevated-card token (shadow, radius) — no bespoke values.
- Filter chips above tables/charts: muted background + high-contrast label + clearly visible × with a ≥24×24px hit area.
- Context change uses opacity crossfade only (no directional slide) — the user stays on the same page type, they just re-scope its data.
- On narrow viewports, the sub-org name shown inline in list rows uses a secondary type style (smaller/muted) to preserve row density.

## Technical Considerations

- Effective-org-ID resolution is a single join (`orgs where id IN userDirectGrants OR parentId IN userDirectGrants`). Cache per request in middleware.
- Drizzle self-relations require careful typing — follow the official Drizzle pattern for self-referential foreign keys.
- One-level-deep enforcement: prefer a DB check constraint or trigger over application-only validation, since multiple code paths can write to `organizations`.
- `userOrganizations` should cascade delete on both `userId` and `organizationId`.
- Import parsed state: either hold parsed rows server-side keyed by an import session ID, or have the client re-upload the Excel with the resolved mapping. Favor the latter for simplicity.

## Success Metrics

- Admin can import the real Bostadsbolaget Excel file without creating any duplicate organizations.
- A user granted access to a parent org can see elevators belonging to descendant orgs without additional grants.
- Zero organizations are created as a side effect of the import.
- All mapping UI edits are non-destructive — admin can freely change mappings before clicking Import.

## Open Questions

_No open questions at this time — all previously raised questions are resolved in the stories and requirements above._
