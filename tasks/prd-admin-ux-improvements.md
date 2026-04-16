# PRD: Admin UX/UI Improvements

## Introduction

The Hisskompetens admin app (Elevatorbud) has accumulated a set of UX issues, bugs, and missing features that hurt usability and professional feel. This PRD covers a comprehensive improvement pass: fixing critical bugs (encoding, navigation), polishing existing UI (sidebar, search, reference data, elevator edit form), adding missing CRUD for users, and restructuring the app navigation around organizations with a global search replacing the current org selector dropdown.

## Goals

- Fix all visible bugs (encoding issues, broken back navigation)
- Improve data density and usability of existing pages (reference data, elevator edit)
- Complete user management with full CRUD, role assignment, and org membership
- Restructure app navigation: org details page with elevator lists as tabs, global search replacing org selector
- Polish sidebar UX (toggle placement, user profile display)
- Eliminate unnecessary server round-trips (search debounce)

## User Stories

### Phase 1: Bug Fixes

---

### US-001: Fix Unicode encoding in elevator fields

**Description:** As a user, I want to see proper Swedish characters in the elevator edit form so that field labels and values are readable.

**Context:** The elevator edit form displays raw Unicode escape sequences instead of decoded characters. For example: `\u00c5tg\u00e4rder` instead of "Åtgärder", `Bygg\u00e5r` instead of "Byggår", `N\u00f6dtelefon` instead of "Nödtelefon", `Beh\u00f6ver` instead of "Behöver". This affects section headers and field labels in the modernization and emergency phone sections. The issue is likely in the reference data values stored in Convex or in how imported data is encoded.

**Acceptance Criteria:**
- [ ] All field labels display correct Swedish characters (å, ä, ö, Å, Ä, Ö)
- [ ] All reference data values display correctly (no `\uXXXX` sequences visible anywhere)
- [ ] Identify root cause: is this a data-layer issue (stored encoded) or a rendering issue?
- [ ] If data-layer: write a migration/fix to decode existing values in the database
- [ ] If rendering: fix the component to properly decode Unicode
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-002: Fix back button navigation from elevator edit

**Description:** As a user, I want the back button on the elevator edit page to return me to the page I came from, not the search page.

**Context:** The back arrow on `hiss.$id.redigera.tsx` currently navigates to `/sok` (search page) instead of the previous page. It should use browser history or navigate to the elevator detail page.

**Acceptance Criteria:**
- [ ] Back button navigates to the elevator detail page (`/hiss/:id`) or uses `router.history.back()`
- [ ] If the user came from a list page (register, modernisering, underhåll), back returns them there
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Phase 2: Quick Wins

---

### US-003: Debounce search on users page

**Description:** As a user, I want the search on the users page to not trigger a server request on every keystroke so the UI feels snappy and doesn't waste resources.

**Context:** Currently `admin.anvandare.tsx` passes `searchText` directly to `useQuery(api.userAdmin.list, { search: searchText })`, triggering a Convex query on every keystroke. Either debounce the search input (300-500ms) or switch to client-side filtering if the user list is small enough.

**Acceptance Criteria:**
- [ ] Search input is debounced (300-500ms delay before querying)
- [ ] No query fires while user is actively typing
- [ ] Results appear after user stops typing
- [ ] Clearing the search field immediately shows all users
- [ ] Typecheck/lint passes

---

### US-004: Move sidebar toggle inside sidebar

**Description:** As a user, I want the sidebar collapse toggle to be inside the sidebar so it doesn't look disconnected when the sidebar is collapsed.

**Context:** The `SidebarTrigger` is currently in the header bar (in `_authenticated.tsx` layout). When the sidebar is collapsed to icon mode, the toggle button floats awkwardly outside. It should be positioned inside the sidebar, e.g., at the top of the sidebar near the logo.

**Acceptance Criteria:**
- [ ] Sidebar toggle button is inside the sidebar component (`app-sidebar.tsx`), not in the header
- [ ] Toggle is visible in both expanded and collapsed states
- [ ] Toggle icon clearly indicates expand/collapse direction
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-005: Show user name and email in expanded sidebar

**Description:** As a user, I want to see my name and email in the sidebar footer when expanded so I know which account I'm logged in as.

**Context:** The sidebar footer currently shows only a `UserButton` avatar icon. In expanded state, it should also display the user's name and email. In collapsed state, just the avatar is fine.

**Acceptance Criteria:**
- [ ] Expanded sidebar footer shows user avatar, full name, and email
- [ ] Collapsed sidebar shows only the avatar icon (no text)
- [ ] Text truncates gracefully if name/email is long
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Phase 3: User Management

---

### US-006: Edit user details

**Description:** As an admin, I want to edit a user's name, email, role, and organization so I can keep user information up to date.

**Context:** The users page (`admin.anvandare.tsx`) has a create dialog but no edit functionality. Add an edit action (pencil icon or row click) that opens a dialog pre-filled with the user's current data. The backend action `api.userAdmin.update` already exists.

**Acceptance Criteria:**
- [ ] Each user row has an edit button (pencil icon or similar)
- [ ] Clicking edit opens a dialog pre-filled with current name, email, role, organization
- [ ] Admin can change any field: name, email, role, organization
- [ ] Changing role from "customer" to "admin" clears the organization field (admins don't belong to orgs)
- [ ] Changing role to "customer" requires selecting an organization
- [ ] Save calls `api.userAdmin.update` and refreshes the list
- [ ] Validation: email format, required fields
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-007: Deactivate and delete users

**Description:** As an admin, I want to deactivate or delete users so I can manage access to the system.

**Acceptance Criteria:**
- [ ] Each user row has a menu (three dots or similar) with "Deactivate" and "Delete" options
- [ ] Deactivate toggles the user's `active` field (with confirmation dialog)
- [ ] Deactivated users are blocked from logging in (enforce in auth middleware/Clerk)
- [ ] Deactivated users show a visual indicator (grayed out, "Inactive" badge)
- [ ] Delete shows a confirmation dialog with the user's name: "Are you sure you want to delete [name]?"
- [ ] Delete permanently removes the user (hard delete via Convex)
- [ ] Cannot delete yourself
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-008: Manage user organization membership

**Description:** As an admin, I want to assign users to organizations and manage their membership so I can control what data they can access.

**Context:** Currently users have a single `organization_id`. This story ensures the org assignment works properly in the edit flow and that the org filter on the users page correctly shows users by org.

**Acceptance Criteria:**
- [ ] Edit dialog shows organization dropdown populated from `api.organizations.list`
- [ ] Organization is required for "customer" role, hidden for "admin" role
- [ ] Org filter dropdown on the users page correctly filters by organization
- [ ] Changing a user's organization takes effect immediately
- [ ] Typecheck/lint passes

---

### Phase 4: UI Improvements

---

### US-009: Reference data page - replace cards with table

**Description:** As an admin, I want to see reference data values in a compact table instead of large cards so I can scan and manage more items without scrolling.

**Context:** The reference data page (`admin.referensdata.tsx`) currently renders each value as a full-width card with the value name and action icons. With 16+ items per category, this wastes vertical space. A table with columns [Value, Status, Actions] would show 3-4x more items per screen.

**Acceptance Criteria:**
- [ ] Replace card list with a data table: columns = Value, Status (active/inactive badge), Actions
- [ ] Actions column contains: Edit (pencil), Merge (if active), Deactivate/Activate toggle
- [ ] Table supports sorting by value name
- [ ] Search filter still works as before
- [ ] Inactive items shown with reduced opacity or strikethrough
- [ ] "Nytt värde" button remains in the same position
- [ ] Category dropdown selector remains unchanged
- [ ] Active/inactive counts still displayed
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-010: Elevator edit form - tabbed layout

**Description:** As a user, I want the elevator edit form organized into tabs instead of a long scrolling page so I can quickly navigate to the section I need.

**Context:** The elevator edit page (`hiss.$id.redigera.tsx`) currently renders 8 numbered sections sequentially. Group them into 4 tabs. A `Tabs` component already exists in `packages/ui` (Radix-based, supports `line` variant).

**Tab grouping:**
- **Grundinfo** (Basic Info): Organization + Section 1 (Identifiering)
- **Teknik** (Technical): Section 2 (Teknisk specifikation) + Section 3 (Dörrar och korg) + Section 4 (Maskineri)
- **Underhåll & Modernisering** (Maintenance): Section 5 (Besiktning och underhåll) + Section 6 (Modernisering)
- **Övrigt** (Other): Section 7 (Nödtelefon) + Section 8 (Kommentarer)

**Acceptance Criteria:**
- [ ] Form is organized into 4 tabs using the existing `Tabs` component from `@elevatorbud/ui`
- [ ] Tab labels: Grundinfo, Teknik, Underhåll & Modernisering, Övrigt
- [ ] Each tab shows only its sections (no scrolling between unrelated sections)
- [ ] Active tab is persisted in URL search params (e.g., `?tab=teknik`) so refreshing stays on the same tab
- [ ] Form state is preserved when switching between tabs (no data loss)
- [ ] Save button is always visible regardless of active tab (sticky footer or outside tabs)
- [ ] All existing form validation still works
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### Phase 5: App Restructure

---

### US-011: Global search in header (replaces org selector)

**Description:** As a user, I want a global search in the header that can search for any elevator or organization so I can quickly find what I'm looking for without navigating through menus.

**Context:** The current global org selector dropdown (`org-selector.tsx`) will be replaced by a command palette-style search (Cmd+K). The org context will no longer be global — instead, users navigate into specific organizations via org details pages.

**Acceptance Criteria:**
- [ ] Remove the org selector dropdown from the header
- [ ] Add a search input/trigger in the header that opens a command palette (Cmd+K shortcut)
- [ ] Search queries elevators (by hissnummer, address, organization name, district) and organizations (by name)
- [ ] Results grouped by type: "Hissar" and "Organisationer" sections
- [ ] Selecting an elevator navigates to `/hiss/:id`
- [ ] Selecting an organization navigates to the org details page (US-012)
- [ ] Search is debounced (300ms)
- [ ] Empty state shows helpful text when no results
- [ ] Keyboard navigation: arrow keys to move, Enter to select, Escape to close
- [ ] Create a Convex query that searches across both tables
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-012: Organization details page

**Description:** As an admin, I want an organization details page with tabs for overview, elevators, and users so I can manage everything about an organization in one place.

**Context:** Currently there is no org details page. Create one at route `/admin/organisationer/:id` with three tabs. The Hissar tab should support sub-tabs or a view switcher for Register/Modernisering/Underhåll views, so users can see all specialized elevator data within the org context.

**Acceptance Criteria:**
- [ ] New route: `/admin/organisationer/:id`
- [ ] Page header shows organization name and basic info
- [ ] Three tabs: Översikt (Overview), Hissar (Elevators), Användare (Users)
- [ ] **Översikt tab**: Key stats — total elevators, elevators by type (pie/bar chart), upcoming inspections count, maintenance company breakdown
- [ ] **Hissar tab**: Table of elevators belonging to this org with sub-tabs or view switcher for: Register, Modernisering, Underhåll views. Each view shows the same org-scoped data as the corresponding top-level page. Clickable rows navigate to `/hiss/:id`
- [ ] **Användare tab**: Table of users belonging to this org with columns: Name, Email, Role, Last login. Actions: edit, deactivate (reuse components from US-006/US-007)
- [ ] Back button navigates to organizations list
- [ ] Organization list page (`admin.organisationer.tsx`) links each org row to this details page
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-013: Move elevator list pages into org-scoped context

**Description:** As a user, I want to access elevator lists (Register, Modernisering, Underhåll) from within an organization context so the data is naturally scoped, and I want a top-level elevator list to search across all organizations.

**Context:** Currently Register, Modernisering, and Underhåll are top-level sidebar pages filtered by the global org selector. With the org selector removed (US-011), these need to work differently:
- The org details page (US-012) "Hissar" tab becomes the org-scoped elevator list
- Top-level pages (Register, Modernisering, Underhåll) show ALL elevators across all orgs, useful for cross-org searches

**Acceptance Criteria:**
- [ ] Remove the `OrgProvider` / global org context from the app layout
- [ ] Dashboard becomes a landing page with links to organizations, recent activity, quick stats, and shortcuts to common actions
- [ ] Top-level Register page shows all elevators (no org filter needed since there's no selector)
- [ ] Top-level Modernisering page shows all elevators' modernization status across all orgs
- [ ] Top-level Underhåll page shows all maintenance data across all orgs
- [ ] Each elevator row in any table shows which organization it belongs to (new column)
- [ ] Organization name in table rows is clickable, navigates to org details page
- [ ] Sidebar navigation remains the same (Dashboard, Register, Modernisering, Underhåll, etc.)
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

### US-014: Fix maintenance page layout

**Description:** As a user, I want the "Skötselföretag" section on the maintenance page to have proper layout so the chart and table don't feel disconnected.

**Context:** The maintenance page (`underhall.tsx`) has a "Skötselföretag" section with a bar chart ("Antal hissar per företag") and a matrix table ("Företag per distrikt") side by side. The placement feels odd — both components compete for horizontal space and the table is cut off.

**Acceptance Criteria:**
- [ ] Bar chart and matrix table are stacked vertically (chart on top, table below) OR given proper responsive breakpoints so the table isn't cut off
- [ ] Matrix table is horizontally scrollable with sticky first column (company name)
- [ ] Section has a clear heading and consistent spacing with other maintenance sections
- [ ] On smaller screens, both components stack vertically
- [ ] Typecheck/lint passes
- [ ] Verify in browser using dev-browser skill

---

## Functional Requirements

- FR-1: All Swedish characters (å, ä, ö, Å, Ä, Ö) must render correctly throughout the app
- FR-2: Back navigation must respect browser history or navigate to logical parent page
- FR-3: Search inputs must be debounced (300-500ms) before triggering server queries
- FR-4: Sidebar toggle must be positioned inside the sidebar component
- FR-5: Expanded sidebar footer must show authenticated user's name and email
- FR-6: Admin users must be able to create, read, update, and delete other users
- FR-7: Admin users must be able to assign roles (admin/customer) and organization membership
- FR-8: Reference data must be displayed in a table format, not cards
- FR-9: Elevator edit form must use a tabbed layout with 4 tab groups
- FR-10: A global search (Cmd+K) must search elevators by hissnummer, address, organization name, and district, and search organizations by name
- FR-11: Organization details page must have Overview, Elevators (with Register/Modernisering/Underhåll sub-views), and Users tabs
- FR-15: Deactivated users must be blocked from logging in
- FR-12: Top-level elevator pages must show data across all organizations (no global org filter)
- FR-13: Each elevator row across all tables must show its organization
- FR-14: Maintenance page "Skötselföretag" section must have proper responsive layout

## Non-Goals

- No changes to the Webbplats (website) section
- No changes to the Import functionality
- No changes to the elevator create flow (only edit form gets tabs)
- No multi-org membership for users (a user still belongs to one org)
- No real-time collaboration or live updates beyond what Convex already provides
- No mobile-responsive overhaul (just fix the maintenance table overflow)
- No changes to authentication flow or login page
- No permission system beyond admin/customer roles

## Design Considerations

- Reuse the existing `Tabs` component from `@elevatorbud/ui` (Radix-based, supports `line` variant) for elevator edit and org details
- Use command palette pattern (similar to shadcn `cmdk`) for global search
- Reference data table should reuse the same table component pattern used on the users page (React Table)
- Maintain the existing sidebar design language — just relocate the toggle and expand the footer
- Screenshots for reference in `/screenshots/` directory

## Technical Considerations

- **Convex backend**: All queries and mutations go through Convex. New queries needed for global search (cross-table), org details stats, and org-scoped user lists
- **Encoding fix**: Root cause is likely in the CSV/Excel import pipeline storing escaped Unicode. Fix both the import logic and existing data
- **OrgProvider removal**: This is a significant refactor since `useSelectedOrg()` is used across multiple pages. Remove it incrementally: first add org column to tables, then remove the provider
- **TanStack Router**: File-based routing. New routes needed: `/admin/organisationer/$id` for org details
- **Search indexing**: Convex supports search indexes. Ensure `elevators` and `organizations` tables have appropriate search indexes for the global search feature

## Success Metrics

- Zero encoding issues visible anywhere in the app
- Users page search feels instant (no flicker or unnecessary loading states)
- Admin can complete full user lifecycle (create, edit, deactivate, delete) without leaving the users page
- Reference data page shows at least 15 items without scrolling
- Elevator edit form accessible to any section within 1 click (tab switch)
- Global search returns results within 500ms for any elevator or organization query
- Organization details page gives a complete picture of an org without navigating away

## Resolved Decisions

- **Global search fields**: Search elevators by all fields — hissnummer, address, organization name, and district
- **Dashboard**: Becomes a landing page with links to orgs, recent activity, and shortcuts (not org-scoped)
- **Deactivated users**: Blocked from logging in entirely (enforced in auth layer)
- **Org details Översikt**: Show elevator count, elevators by type, upcoming inspections count, and maintenance company breakdown
- **Org details Hissar tab**: Supports sub-tabs/view switcher for Register, Modernisering, and Underhåll views within the org context
