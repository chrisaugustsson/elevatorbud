# Plan: Replace suggested_values with reference tables

## Overview

Replace the single `suggested_values` table with 8 dedicated reference tables.
Elevator fields change from `v.string()` to `v.id("manufacturers")` etc.
The `suggested_values` table and all related code is removed.

Data can be wiped and re-imported from Excel.

---

## 1. New reference tables (schema.ts)

Create these 8 tables, all with the same shape:

```
name: v.string()        // "KONE", "Personhiss", etc.
active: v.boolean()     // soft-delete / hide from dropdowns
created_at: v.number()
```

Each gets an index on `name` for fast lookup during import.

| Table | Replaces field | Example values |
|---|---|---|
| `elevator_types` | `elevator_type` | Personhiss, Varupersonhiss |
| `manufacturers` | `manufacturer` | KONE, Schindler, OTIS |
| `districts` | `district` | Centrum, Söder, Norr |
| `maintenance_companies` | `maintenance_company` | KONE, Schindler Service |
| `inspection_authorities` | `inspection_authority` | Kiwa, RISE |
| `door_types` | `door_type` | Teleskop, Central |
| `collectives` | `collective` | Fullkollektiv, Nedkollektiv |
| `drive_systems` | `drive_system` | Linhydraulisk, Hydraulisk |

## 2. Update elevator schema

Change these 8 fields from `v.optional(v.string())` to `v.optional(v.id("table"))`:

```ts
elevator_type:        v.optional(v.id("elevator_types"))
manufacturer:         v.optional(v.id("manufacturers"))
district:             v.optional(v.id("districts"))
maintenance_company:  v.optional(v.id("maintenance_companies"))
inspection_authority: v.optional(v.id("inspection_authorities"))
door_type:            v.optional(v.id("door_types"))
collective:           v.optional(v.id("collectives"))
drive_system:         v.optional(v.id("drive_systems"))
```

Keep as plain strings (no table needed):
- `elevator_designation`, `machine_placement`, `modernization_measures`
- All other free-text fields (speed, cab_size, etc.)

## 3. Drop suggested_values

- Delete `convex/suggestedValues.ts` entirely
- Remove `suggested_values` from `schema.ts`
- Remove `autoAddSuggestedValues()` from `convex/elevators/helpers.ts`
- Remove the call to it in `convex/elevators/crud.ts` (update mutation)

## 4. Reference data CRUD (backend)

Create `convex/referenceData.ts` with generic helpers or per-table mutations:

- `list(table)` — return all rows (or filtered by active)
- `create(table, name)` — insert new, check for duplicate name
- `rename(table, id, newName)` — update name
- `merge(table, sourceId, targetId)` — re-point all elevators from source to target, then delete source
- `deactivate(table, id)` / `activate(table, id)` — toggle active flag

**Merge is the key difference from today**: because elevators now store IDs,
merging means updating all `elevator.manufacturer` from `sourceId` to `targetId`.
This is a proper cascade that the old string-based system couldn't do.

Consider: merge may need to be an internal mutation + action if elevator count
exceeds transaction limits. For 600 elevators per org this is fine. For 60k total,
a paginated approach may be needed (merge within one org at a time, or use a
scheduled function).

## 5. Reference data admin page (frontend)

Update `apps/admin/src/routes/_authenticated/admin.referensdata.tsx`:

- Instead of categories in a dropdown, show 8 tabs (one per table)
- CRUD operations call the new mutations
- Merge dialog: select target from same table, confirm, backend cascades to elevators
- Rename: just patches the reference row — all elevators automatically show new name
  (this is the big win over strings)

## 6. Update aggregates

### Existing aggregates — change sortKey from string to ID

The aggregate keys currently use the string value (e.g. `doc.district ?? "Okant"`).
After migration they should use the reference ID:

```ts
// Before
sortKey: (doc) => [doc.status, doc.district ?? "Okant"]

// After
sortKey: (doc) => [doc.status, doc.district ?? "none"]
```

The key becomes `[status, Id<"districts">]` or `[status, "none"]` for unset.

Chart queries change: instead of getting string names from suggested_values,
they get all rows from the reference table, countBatch by ID, then map IDs to names.

### New budget aggregates

Add 2 new aggregate instances:

| Aggregate | Key | sumValue |
|---|---|---|
| `byDistrictBudget` | `[status, district \|\| "none"]` | `budget_amount ?? 0` |
| `byTypeBudget` | `[status, elevator_type \|\| "none"]` | `budget_amount ?? 0` |

Register in `convex.config.ts` and `convex/aggregates.ts`.
Update `modernization.ts budget` query to use these instead of `.collect()`.

### Backfill

After deploying and re-importing data, run `npx convex run aggregates:backfill`
to populate all aggregate trees.

## 7. Update elevator forms (frontend)

### ComboboxField -> SelectField

`apps/admin/src/features/elevator/components/combobox-field.tsx` currently takes
a `category` string and calls `useSuggestions(category)` to get string options.

Replace with a hook like `useReferenceData("manufacturers")` that returns
`{ _id, name }[]`. The combobox/select stores the `_id` as the form value
instead of the string name.

**Files to update:**
- `basic-info-section.tsx` — district, elevator_designation (designation stays string)
- `technical-section.tsx` (or similar) — elevator_type, manufacturer
- `doors-and-cab-section.tsx` — door_type, collective
- `machinery-section.tsx` — drive_system
- `inspection-section.tsx` — inspection_authority, maintenance_company

The form type `HissFormValues` changes these 8 fields from `string` to `string`
(still string in the form, but it's the ID string). The submit handler sends
the ID to the backend.

### Display

Anywhere that displays these fields needs to resolve ID -> name.
Options:
- Eager: backend queries join/enrich before returning
- Lazy: frontend resolves with a lookup map from reference data

Recommended: backend enrichment (like `enrichWithOrgName` does for org names).
Add a similar helper that resolves all reference IDs on elevator documents.

## 8. Update Excel import

### Import flow changes

`convex/importsInternal.ts` `importBatch` currently receives string values
and stores them directly. After migration:

1. **Option A — resolve on backend**: Import sends raw strings. Backend mutation
   looks up or creates reference rows by name, then stores the ID on the elevator.
   Simpler for the import UI but may hit transaction limits for large batches.

2. **Option B — resolve on frontend**: Before calling `importBatch`, the frontend
   reads all reference tables, builds a name->ID map, and resolves strings to IDs.
   Unmatched strings create new reference rows first. More work but keeps mutations small.

**Recommended: Option A** (resolve on backend). The import mutation already processes
rows one at a time. For each string field, do:

```ts
async function resolveOrCreate(ctx, table, name) {
  const existing = await ctx.db.query(table)
    .withIndex("by_name", q => q.eq("name", name))
    .first();
  if (existing) return existing._id;
  return await ctx.db.insert(table, { name, active: true, created_at: Date.now() });
}
```

This replaces `autoAddSuggestedValues` — new values are created as reference rows
during import automatically.

### Export

`convex/elevators/listing.ts` `exportData` returns elevator docs directly.
After migration, the exported data needs ID -> name resolution for the 8 fields.
Add enrichment before returning.

## 9. Update remaining query files

These files read elevator string fields and need to resolve IDs to names:

- `convex/elevators/analytics.ts` — chartData uses field values for chart labels
- `convex/elevators/maintenance.ts` — companies, emergencyPhoneStatus, inspectionList
- `convex/elevators/modernization.ts` — budget byDistrict/byType, priorityList
- `convex/dashboard.ts` — recentActivity

For aggregate-based chart queries: load reference table, countBatch by ID,
zip IDs with names.

For .collect()-based queries: enrich elevator docs with resolved names.

## 10. Filters

`convex/elevators/helpers.ts` `filterArgs` and `fetchAndFilter`:

- Change filter args from `v.array(v.string())` to `v.array(v.id("table"))`
  for the 8 fields that become references
- Filter comparison changes from string matching to ID equality
- Frontend filter dropdowns load from reference tables instead of suggested_values

## 11. Search

`fetchAndFilter` text search currently searches string values:
```ts
h.manufacturer && h.manufacturer.toLowerCase().includes(s)
```

After migration, `h.manufacturer` is an ID. Text search on these fields would need
to resolve IDs first, or maintain a denormalized search field. Consider:
- Skip searching reference fields in text search (search by elevator_number, address only)
- Or: add a `search_text` computed field on elevator that concatenates resolved names

---

## Execution order

1. Create 8 reference tables in schema.ts (add indexes)
2. Update elevator schema (8 fields become IDs)
3. Create referenceData.ts (CRUD + merge mutations)
4. Update aggregates (sortKey uses IDs, add 2 budget aggregates)
5. Delete suggestedValues.ts + autoAddSuggestedValues
6. Update importsInternal.ts (resolve-or-create during import)
7. Update all backend query files (analytics, maintenance, modernization, dashboard, listing export)
8. Update helpers.ts (filterArgs, fetchAndFilter, remove autoAddSuggestedValues)
9. Update frontend forms (ComboboxField -> reference data selects)
10. Update frontend referensdata page (tabs per table, merge with cascade)
11. Update frontend filters (load options from reference tables)
12. Handle search (decide approach)
13. Wipe elevator data, re-import from Excel
14. Run aggregates:backfill

---

## Notes

- The 3 fields staying as strings: `elevator_designation`, `machine_placement`, `modernization_measures` — no autocomplete after migration
- Admin global views (dashboard.ts) still use `.collect()` — acceptable for admin-only
- Merge cascade: test with large datasets. May need pagination if merging across 60k elevators
- After this migration, renaming "KONE AB" to "KONE" is just a patch on the reference row — zero elevator updates needed
