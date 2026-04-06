import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { suggestedValues } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";

// ---------------------------------------------------------------------------
// Input schemas (exported for reuse as server-function validators)
// ---------------------------------------------------------------------------

export const listSuggestedValuesSchema = z.object({
  category: z.string(),
  activeOnly: z.boolean().optional().default(true),
});

export const createSuggestedValueSchema = z.object({
  category: z.string(),
  value: z.string().min(1),
});

export const updateSuggestedValueSchema = z.object({
  id: z.string().uuid(),
  value: z.string().min(1),
});

export const mergeSuggestedValuesSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

export const toggleActiveSuggestedValueSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

export async function list(
  db: Database,
  input: z.infer<typeof listSuggestedValuesSchema>,
) {
  const conditions = [eq(suggestedValues.category, input.category)];
  if (input.activeOnly) {
    conditions.push(eq(suggestedValues.active, true));
  }
  return db.query.suggestedValues.findMany({
    where: and(...conditions),
    orderBy: (sv, { asc }) => [asc(sv.value)],
  });
}

export async function create(
  db: Database,
  input: z.infer<typeof createSuggestedValueSchema>,
) {
  const [sv] = await db
    .insert(suggestedValues)
    .values(input)
    .onConflictDoNothing()
    .returning();
  return sv;
}

export async function update(
  db: Database,
  input: z.infer<typeof updateSuggestedValueSchema>,
) {
  const [sv] = await db
    .update(suggestedValues)
    .set({ value: input.value })
    .where(eq(suggestedValues.id, input.id))
    .returning();
  return sv;
}

export async function merge(
  db: Database,
  input: z.infer<typeof mergeSuggestedValuesSchema>,
) {
  // Look up source and target values
  const [source, target] = await Promise.all([
    db.query.suggestedValues.findFirst({
      where: eq(suggestedValues.id, input.sourceId),
    }),
    db.query.suggestedValues.findFirst({
      where: eq(suggestedValues.id, input.targetId),
    }),
  ]);
  if (!source || !target || source.category !== target.category) {
    return { merged: false };
  }

  // Update elevator records that reference the source value
  const cat = source.category;
  const coreColumns = [
    "elevator_type",
    "manufacturer",
    "district",
    "maintenance_company",
    "inspection_authority",
    "elevator_classification",
  ];
  const detailColumns = [
    "door_type",
    "dispatch_mode",
    "drive_system",
    "machine_placement",
  ];

  if (coreColumns.includes(cat)) {
    await db.execute(
      sql`UPDATE elevators SET ${sql.identifier(cat)} = ${target.value} WHERE ${sql.identifier(cat)} = ${source.value}`,
    );
  } else if (detailColumns.includes(cat)) {
    await db.execute(
      sql`UPDATE elevator_details SET ${sql.identifier(cat)} = ${target.value} WHERE ${sql.identifier(cat)} = ${source.value}`,
    );
  } else if (cat === "measures") {
    await db.execute(
      sql`UPDATE elevator_budgets SET measures = ${target.value} WHERE measures = ${source.value}`,
    );
  }

  // Delete the source suggested value
  await db
    .delete(suggestedValues)
    .where(eq(suggestedValues.id, input.sourceId));

  return { merged: true };
}

export async function toggleActive(
  db: Database,
  input: z.infer<typeof toggleActiveSuggestedValueSchema>,
) {
  const [sv] = await db
    .update(suggestedValues)
    .set({ active: input.active })
    .where(eq(suggestedValues.id, input.id))
    .returning();
  return sv;
}
