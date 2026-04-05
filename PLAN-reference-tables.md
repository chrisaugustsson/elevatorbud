# Plan: Fix suggested_values merge/rename + add budget aggregates

## Overview

Keep the current architecture (elevators store strings, `suggested_values` provides
dropdown hints). Fix the merge/rename gap by propagating changes to elevator
documents. Add 2 budget aggregates for the remaining `.collect()` chart queries.

---

## 1. Add propagation to merge and rename (convex/suggestedValues.ts)

Currently, `merge` deletes the source suggested value but doesn't touch elevators.
`update` (rename) changes the suggested value string but elevators keep the old one.

### Merge fix

When merging source into target within a category:

1. Find the elevator field name for the category (e.g. `"manufacturer"` -> `"manufacturer"`)
2. Query all elevators where that field equals `source.value`
3. Patch each elevator to use `target.value`
4. Delete the source suggested value

```ts
// In merge mutation, after validation:
const field = categoryToField(source.category); // maps category -> elevator field name
const elevators = await ctx.db.query("elevators").collect();
const toUpdate = elevators.filter(e => e[field] === source.value);
for (const elevator of toUpdate) {
  await ctx.db.patch(elevator._id, { [field]: target.value });
}
await ctx.db.delete(sourceId);
```

Note: at 50k elevators the `.collect()` is fine within transaction limits (read-only
scan + targeted patches). The number of actual patches will be much smaller (only
elevators matching the source value).

### Rename fix

When renaming a suggested value:

1. Find the elevator field name for the category
2. Query all elevators where that field equals the old value
3. Patch each elevator to use the new value
4. Update the suggested value

Same pattern as merge, just updating to the new name instead of the target's value.

### Category-to-field mapping

Most categories map 1:1 to the elevator field name. Define a mapping:

```ts
const CATEGORY_TO_FIELD: Record<string, string> = {
  elevator_type: "elevator_type",
  manufacturer: "manufacturer",
  district: "district",
  maintenance_company: "maintenance_company",
  inspection_authority: "inspection_authority",
  elevator_designation: "elevator_designation",
  door_type: "door_type",
  collective: "collective",
  drive_system: "drive_system",
  machine_placement: "machine_placement",
  modernization_measures: "modernization_measures",
};
```

### Transaction limit consideration

Convex limit: 16,384 document reads+writes per transaction. A merge that touches
many elevators could approach this. At 50k total elevators:
- The `.collect()` read costs 50k reads
- Each patch costs 1 read + 1 write
- Worst case: 50k reads + N patches

If a single value appears on more than ~8k elevators AND the total table exceeds
~8k rows, we'd need to paginate. For realistic data (50k elevators, largest
manufacturer maybe 5k), this is fine.

If needed later: split into a Convex action that processes in batches via
scheduled internal mutations.

---

## 2. Add budget aggregates (convex/aggregates.ts)

Two new aggregate instances to eliminate `.collect()` in the budget query's
byDistrict and byType breakdowns.

### New aggregates

| Aggregate | Key | sumValue |
|---|---|---|
| `byDistrictBudget` | `[status, district \|\| "Okänt"]` | `budget_amount ?? 0` |
| `byTypeBudget` | `[status, elevator_type \|\| "Okänt"]` | `budget_amount ?? 0` |

### Changes needed

**convex/convex.config.ts** — add 2 new component instances:
```ts
app.use(aggregate, { name: "byDistrictBudget" });
app.use(aggregate, { name: "byTypeBudget" });
```

**convex/aggregates.ts** — add 2 new TableAggregate definitions + register triggers:
```ts
export const byDistrictBudget = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byDistrictBudget, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.district ?? "Okänt"],
  sumValue: (doc) => doc.budget_amount ?? 0,
});

export const byTypeBudget = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byTypeBudget, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.elevator_type ?? "Okänt"],
  sumValue: (doc) => doc.budget_amount ?? 0,
});
```

Register both triggers and add to ALL_AGGREGATES for backfill.

**convex/elevators/modernization.ts** — update `budget` query:
- byYear: already uses `byModernizationYear.sumBatch` (done)
- byDistrict: use `byDistrictBudget.sumBatch` with suggested_values list
- byType: use `byTypeBudget.sumBatch` with suggested_values list
- Removes the `.collect()` from the org-scoped path entirely

---

## 3. Use custom mutation in suggestedValues.ts

Currently `suggestedValues.ts` imports raw `mutation` from `_generated/server`.
Since merge/rename now patches elevator documents, it needs to use the custom
`mutation` from `aggregates.ts` so that aggregate triggers fire on the elevator
updates.

```ts
// Before
import { query, mutation } from "./_generated/server";

// After
import { query } from "./_generated/server";
import { mutation } from "./aggregates";
```

---

## Execution order

1. Add `CATEGORY_TO_FIELD` mapping and propagation logic to `suggestedValues.ts`
2. Switch `suggestedValues.ts` to use custom `mutation` from aggregates
3. Add 2 budget aggregates to `convex.config.ts` and `convex/aggregates.ts`
4. Update `modernization.ts budget` query to use budget aggregates
5. Deploy and run `npx convex run aggregates:backfill`

---

## What this doesn't change

- Elevator schema stays as-is (strings)
- `suggested_values` table stays as-is
- Forms, filters, import, export — all unchanged
- `autoAddSuggestedValues` stays (auto-creates suggested values on elevator create/update)
- Admin referensdata page stays (just merge/rename now actually propagate)

## Notes

- After merge/rename, the aggregate triggers fire automatically because we use
  the custom mutation. No manual aggregate update needed.
- The admin UI already has merge and rename dialogs — they just work better now.
- If scale exceeds transaction limits later, paginate with scheduled functions.
