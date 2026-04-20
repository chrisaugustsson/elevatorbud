# PRD: Modernization & Replacement Events with Diff Tracking

## Introduction

Today, registering a modernization event only captures free-text notes while any actual spec changes (control system, machine, doors, etc.) must be edited manually on the elevator, overwriting prior values and erasing history. This PRD introduces two distinct event flows:

1. **Modernization event** — a two-step wizard that lets users pick which fields changed and record a structured `before → after` diff stored on the event itself, then applies the new values to the elevator.
2. **Replacement event** — a separate, simpler flow for when an entire elevator is swapped for a new unit. The full prior state is archived onto the event, and the elevator row is reset with new identification.

Result: the `elevator_events` timeline becomes a lossless history of every spec change, not a lossy free-text log.

## Goals

- Preserve full historical state for every modernization (old + new values per changed field).
- Make it impossible to "modernize" without capturing what actually changed.
- Cleanly separate partial modifications (modernization) from whole-unit swaps (replacement).
- Surface the diff in the timeline so anyone viewing history sees `Control system: ABB → KONE` at a glance.
- Keep the interaction lightweight for the common case (1–3 fields changed) and scalable to 20 fields.

## User Stories

### US-001: Add typed diff payload to event schema
**Description:** As a developer, I need `elevator_events` to store a structured diff so history survives later edits to the elevator.

**Acceptance Criteria:**
- [ ] `metadata` jsonb on `elevator_events` carries a typed `changes` array: `{ field: string; label: string; from: unknown; to: unknown }[]` for `modernization` events.
- [ ] For `replacement` events, metadata carries a `snapshot` object containing every field of the outgoing elevator plus a `replacedWith` object for the incoming unit's key identification fields.
- [ ] Zod schemas for `createEventInput` (in `apps/admin/src/server/elevator-events.ts`) extended with discriminated-union validation per event type.
- [ ] Typecheck passes (`pnpm -r typecheck`).

### US-002: Step 1 — "What changed?" field picker
**Description:** As a user registering a modernization, I want to pick which fields changed before I type any values, so I'm not shown an overwhelming form up front.

**Acceptance Criteria:**
- [ ] New dialog `ModernizationWizard` opens when the user selects "Modernisering" from the event dropdown on the elevator detail page.
- [ ] Step 1 shows a checklist of modernization-relevant fields grouped into collapsible sections (see FR-4 for grouping).
- [ ] Each row shows: checkbox, field label (Swedish), and the current value as dimmed helper text (empty values render as "—").
- [ ] Header has a search/filter input that narrows the visible rows live.
- [ ] A sticky footer shows a counter ("3 fält valda") and a primary "Nästa" button, disabled when 0 fields are selected.
- [ ] Progress indicator at the top reads `Steg 1 av 2 — Välj fält` with a progress bar.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-003: Step 2 — Before → After entry
**Description:** As a user, I want to see the current value and edit the new value side-by-side for every field I picked, with the new-value input pre-filled with the current value so I only have to touch what actually changed.

**Acceptance Criteria:**
- [ ] Step 2 renders a stacked list of rows, one per selected field, in the same group order as step 1.
- [ ] Each row shows three columns on desktop: field label, current value (read-only, muted), new value (editable input).
- [ ] On narrow widths, the row collapses to label on top, current value as helper text, new value input below.
- [ ] The new-value input is pre-filled with the current value on entry to step 2. Rows the user doesn't edit stay equal to the current value and are filtered out on submit (see FR-13).
- [ ] The correct input type is used per field: select for enums (doorType, driveSystem, controlSystemType, etc.), number with `inputmode="decimal"` and tabular figures for numerics (speed, loadCapacity, liftHeight, floorCount, doorCount), plain text otherwise.
- [ ] A subtle "Ingen ändring" (no change) badge appears on rows where the new value still equals the current value, so the user can see which of their picked fields won't end up in the diff.
- [ ] A free-text "Anteckningar" textarea sits below the list and maps to the event's `description`.
- [ ] `occurredAt` and optional `cost` / `performedBy` fields appear in a compact details section below notes.
- [ ] Back button returns to step 1 preserving selections and any entered values.
- [ ] Primary "Spara" button is disabled while submitting and shows a spinner.
- [ ] Inline validation on blur; first invalid field receives focus after a failed submit.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-004: Persist event + apply elevator updates atomically
**Description:** As a developer, I need the server to write the event and update the elevator in one transaction so history and current state never drift.

**Acceptance Criteria:**
- [ ] New server function `createModernizationEvent` in `apps/admin/src/server/elevator-events.ts` accepts `{ elevatorId, occurredAt, description?, cost?, performedBy?, changes: Array<{field, from, to}> }`.
- [ ] Executes inside a `db.transaction`: inserts the event with `type: 'modernization'` and `metadata.changes`, then updates the elevator's changed fields with the `to` values.
- [ ] Updates `elevators.modernizationYear` to the year of `occurredAt` (existing behavior).
- [ ] Rejects the request if any `field` is not in the server-side allowlist of modernization-eligible columns.
- [ ] Returns the created event; client invalidates elevator + event list queries.
- [ ] Typecheck passes.

### US-005: Render diffs in the timeline
**Description:** As a user viewing an elevator's history, I want to see exactly which fields changed and to what values on each modernization.

**Acceptance Criteria:**
- [ ] `event-timeline.tsx` renders a compact diff block under modernization events: each change on its own line as `Field: old → new` with a subtle arrow glyph.
- [ ] Removed/empty values render as "—" to distinguish from "no change".
- [ ] If more than 4 changes, the first 4 are shown and a "+N fler ändringar" expander reveals the rest.
- [ ] Numeric values render with tabular figures so columns align across rows.
- [ ] Color is NOT the sole signal of old vs new (use label + arrow too) for a11y.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-006: Replacement flow — entry point + confirmation
**Description:** As a user swapping an elevator for a new unit, I want a distinct entry point and a clear confirmation so I don't click it by accident.

**Acceptance Criteria:**
- [ ] The elevator detail page's event dropdown gains a "Ersätt hiss" item, visually separated (divider above, danger-toned icon).
- [ ] Clicking opens a `ReplacementDialog` with a prominent warning banner explaining what will happen: the current unit's state is archived on an event and the elevator is reset to the new unit.
- [ ] Dialog has a single form: new identification fields (`manufacturer`, `buildYear`, plus the elevator's primary identifier field) plus `occurredAt`, optional `cost`, optional `performedBy`, and a `description` textarea.
- [ ] Primary button is labeled "Ersätt hiss" and uses the danger color token; secondary "Avbryt".
- [ ] No type-to-confirm pattern. The danger-toned button + warning banner + explicit label are the confirmation.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-007: Replacement flow — server handling
**Description:** As a developer, I need the replacement server function to archive the outgoing elevator's full state onto the event and reset the elevator with the new identity.

**Acceptance Criteria:**
- [ ] New server function `createReplacementEvent` in `apps/admin/src/server/elevator-events.ts`.
- [ ] In a single transaction: reads the current elevator row (plus details), writes an event with `type: 'replacement'` and `metadata.snapshot` containing the full outgoing state, then updates the elevator with the new identification fields.
- [ ] **Technical fields are cleared to null** on replacement (machinery, doors, cab, performance, safety specs — see FR-6b). **Contextual fields are preserved** (floorCount, inspectionAuthority, inspectionMonth, maintenanceCompany, warrantyExpiresAt, plus any org/building association). The new unit lives in the same building under the same inspection regime, but its specs are blank slate.
- [ ] `elevators.modernizationYear` is updated to the year of `occurredAt` (replacements count as the most recent modernization for denormalization purposes; the event `type` differentiates if reporting ever needs to).
- [ ] Returns the event; client invalidates elevator + event list queries.
- [ ] Typecheck passes.

### US-008: Render replacement events in timeline
**Description:** As a user, I want replacement events to stand out in the timeline and offer access to the archived snapshot.

**Acceptance Criteria:**
- [ ] Replacement events render with a distinct icon (e.g. `Replace` from lucide) and a warmer tone than modernization.
- [ ] Row shows `Ersatt med: [new manufacturer] [new id/serial]` as the headline.
- [ ] Secondary row shows `Tidigare: [old manufacturer] [old id/serial] ([old buildYear])`.
- [ ] An expander reveals the full archived snapshot as a read-only field list.
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

### US-009: Draft autosave for the wizard
**Description:** As a user, I don't want to lose my work if I accidentally close the wizard.

**Acceptance Criteria:**
- [ ] The modernization wizard autosaves its state (selected fields, new values, notes) to localStorage under `modernization-draft:{elevatorId}` with a 500ms debounce.
- [ ] On reopen, if a draft exists, show a non-blocking banner at the top of step 1: "Fortsätt där du slutade?" with "Återställ" and "Börja om" buttons.
- [ ] Draft is cleared on successful submit and on explicit "Börja om".
- [ ] Closing the dialog with unsaved changes prompts "Spara utkast och stäng?" (confirm before dismiss).
- [ ] Typecheck passes.
- [ ] Verify in browser using dev-browser skill.

## Functional Requirements

- **FR-1** — `elevator_events.metadata` for `modernization` events must conform to `{ changes: Array<{ field: string; label: string; from: unknown; to: unknown }> }`.
- **FR-2** — `elevator_events.metadata` for `replacement` events must conform to `{ snapshot: Record<string, unknown>; replacedWith: Record<string, unknown> }`.
- **FR-3** — The modernization wizard must be a two-step flow with a visible progress indicator and a back button.
- **FR-4** — Field grouping and order in step 1:
  - **Styr & maskin:** `controlSystemType`, `machineType`, `driveSystem`, `machinePlacement`, `suspension`
  - **Dörrar:** `doorType`, `doorOpening`, `doorCount`, `doorCarrier`, `doorMachine`
  - **Hisskorg:** `cabSize`, `passthrough`, `dispatchMode`
  - **Prestanda:** `speed`, `loadCapacity`, `liftHeight`, `floorCount`
  - **Säkerhet & övrigt:** `shaftLighting`, `emergencyPhoneModel`, `emergencyPhoneType`
- **FR-5** — On submit, the server must apply changes atomically (single transaction, event insert + elevator update). No intermediate state visible to clients.
- **FR-6** — Replacement flow must require new values for at minimum: the elevator's primary identifier field, `manufacturer`, and `buildYear`. Other fields remain optional.
- **FR-6a** — Replacement flow must NOT use a type-to-confirm pattern. The danger-toned primary button + warning banner + explicit "Ersätt hiss" label are sufficient. (Revisit only if accidental replacements are observed post-launch.)
- **FR-6b** — On replacement, the server must clear **technical** fields to null and preserve **contextual** fields:
  - **Clear (technical):** `controlSystemType`, `machineType`, `driveSystem`, `machinePlacement`, `suspension`, `doorType`, `doorOpening`, `doorCount`, `doorCarrier`, `doorMachine`, `cabSize`, `passthrough`, `dispatchMode`, `speed`, `loadCapacity`, `liftHeight`, `shaftLighting`, `emergencyPhoneModel`, `emergencyPhoneType`, `emergencyPhonePrice`.
  - **Preserve (contextual):** `floorCount`, `inspectionAuthority`, `inspectionMonth`, `maintenanceCompany`, `warrantyExpiresAt`, organization/building associations.
  - Rationale: the new unit lives in the same shaft, building, and inspection regime as the old one, but its own specs start blank and must be re-entered.
- **FR-7** — The elevator detail page's event creation menu must render "Ersätt hiss" visually separated from additive events (modernization, inspection, repair, note) with a divider and danger-toned styling.
- **FR-8** — The timeline must render a compact diff summary for modernization events without requiring a click, and an expandable full snapshot for replacement events.
- **FR-9** — Only fields in the server-side modernization allowlist may appear as diff entries; unknown fields in `changes` must cause the request to fail validation.
- **FR-10** — All new UI text is in Swedish and follows existing terminology in the app (e.g. "Hiss", "Modernisering", "Ersätt hiss").
- **FR-11** — The modernization wizard's submit button must be disabled while `isSubmitting` and show a spinner; errors must render inline near the offending field, with the first invalid field receiving focus.
- **FR-12** — On entry to step 2, every new-value input is pre-filled with the corresponding current value. The user only edits fields that actually changed.
- **FR-13** — Changes where `from === to` must be filtered out client-side before submit and never persisted as a diff entry. (Combined with FR-12, this means unchanged picked fields silently drop out on submit — no errors, no noise.)
- **FR-14** — Replacement events must update `elevators.modernizationYear` to the year of `occurredAt`. No separate `replacementYear` column is introduced; event `type` differentiates.

## Non-Goals

- Rolling back a modernization ("undo" a diff) — events are immutable history, not a time machine.
- Merging two elevator records into one.
- Bulk modernization across multiple elevators at once.
- Attachments on any event (modernization, replacement, or the generic dialog). The `attachments` jsonb column exists on the schema but there is no upload infrastructure yet — implementing attachments requires an S3 bucket (or equivalent) and an upload pipeline, which are separate future work.
- Migrating historical free-text modernization events to the new diff structure — old events keep their current shape and render with the existing (non-diff) UI.
- Editing an already-created diff after the fact beyond the existing `updateElevatorEvent` mutation (title/description/occurredAt only). Editing individual `changes` entries is out of scope.
- Exposing the replacement flow in the client (read-only) app — admin only for now.

## Design Considerations

**Entry points.** The existing plus-icon dropdown on the elevator detail page (`hiss.$id.index.tsx`) is the single entry point. Order from top: Modernisering, Besiktning, Reparation, Anteckning, ─ divider ─, Ersätt hiss (danger tone). Standard note/inspection/repair still use the existing `EventDialog`; only Modernisering and Ersätt hiss open the new wizards.

**Progress & step indicator.** A 2-segment progress bar at the top of the wizard with text label `Steg 1 av 2 — Välj fält` / `Steg 2 av 2 — Ange nya värden`.

**Field grouping UI (step 1).** Use collapsible `<fieldset>` style sections, all expanded by default. Each group header shows the count of selected fields in that group (e.g. `Styr & maskin (2)`). A search input at the top filters across all groups live.

**Empty state (step 1).** If the user clears all selections, the footer disables Nästa and shows muted text "Välj minst ett fält för att fortsätta".

**Before → after layout (step 2).** Desktop uses a 3-column grid: label | current | new. Current value column is right-aligned, muted, with tabular figures for numbers and a subtle arrow glyph pointing right. Narrow widths collapse to a single-column stacked layout with current value shown as helper text under the label, input below. "Ingen ändring" is a small subtle badge on the right edge of the row, not an alert — it's informational.

**Replacement dialog visual language.** Use the danger color token for the primary button and the warning banner; keep the rest of the form neutral to avoid fatigue. Reserve the confirmation input (type-to-confirm) as the last friction step before the primary button enables.

**Timeline diff presentation.** Compact, one change per line, format: `<strong>Styrsystem:</strong> ABB → KONE`. Use `tabular-nums` for numeric fields. Missing values render as `—`. Arrow glyph is `→` (U+2192) to stay a11y-friendly. For replacement events, the archived snapshot is behind a disclosure to keep the default timeline scannable.

**Accessibility.** All diffs convey meaning through text and structure, not color. Focus moves to the first invalid field on failed submit. Wizard supports keyboard navigation: Enter advances, Esc prompts to save draft and close.

**Responsive.** The wizard uses the existing `Dialog` component; on narrow widths it becomes full-width with a sticky footer containing the primary action.

## Technical Considerations

- **Transactions.** Use `db.transaction()` in the Drizzle connection. Both the modernization and replacement flows must write in a single transaction.
- **Allowlist.** A shared constant (e.g. `MODERNIZATION_FIELDS`) defines which columns are modernization-eligible and their Swedish labels + input types. Used by both client UI and server validation to prevent drift.
- **Enum inputs.** Fields like `controlSystemType`, `driveSystem`, `doorType`, etc. already have option lists somewhere in the wizard components (`apps/admin/src/features/elevator/components/wizard-steps/`). Reuse those options — do not duplicate.
- **Form state.** Keep using TanStack Form + Zod, matching the pattern in `event-dialog.tsx` and `elevator-wizard.tsx`. Don't introduce react-hook-form.
- **Draft persistence.** Follow the existing localStorage pattern used by `elevator-wizard.tsx` (debounced writes, versioned key, explicit reset).
- **Cache sync.** The existing elevator denormalization (`modernizationYear`, `inventoryDate`) must still be updated. Replacement events reuse `modernizationYear` (no new column); event `type` differentiates replacement from modernization for any future reporting.
- **Server function naming.** Follow existing conventions in `apps/admin/src/server/elevator-events.ts`: `createModernizationEvent`, `createReplacementEvent`. Keep `createElevatorEvent` for the generic path (inspection/repair/note).
- **Query invalidation.** After each mutation, invalidate both the events list and the elevator detail query so the detail page reflects new values immediately.

## Success Metrics

- Zero free-text-only modernization events created after launch (every modernization has a `changes` diff).
- Users can register a typical 1–3 field modernization in under 30 seconds.
- Timeline renders the diff for any event with a `changes` payload without requiring a click.
- No cases of elevator fields being silently overwritten without a corresponding event row.

## Decisions (resolved)

- **Replacement reset behavior.** Clear technical fields, preserve contextual fields (see FR-6b for the explicit split).
- **Modernization year vs replacement year.** Reuse `elevators.modernizationYear` for both. No new column. Event `type` differentiates.
- **Attachments.** Out of scope. Schema has the column, but upload infrastructure (S3 or equivalent) doesn't exist yet — separate future work.
- **Modernization field list (FR-4).** Locked in as specified. Identity fields (`elevatorType`, `manufacturer`, `buildYear`) only change on replacement, not modernization. Administrative fields (`inspectionAuthority`, `inspectionMonth`, `maintenanceCompany`, `warrantyExpiresAt`) are not modernization-eligible and belong on a separate contract-edit flow. `emergencyPhonePrice` is budget data, not a spec.
- **Type-to-confirm on replacement.** Dropped. Replacement is not truly destructive — the full snapshot is archived on the event. The danger-toned primary button + warning banner + explicit "Ersätt hiss" label are the confirmation. Revisit only if accidental replacements are observed post-launch.
