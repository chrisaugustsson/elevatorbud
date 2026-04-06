import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, and, sql } from "drizzle-orm";
import { suggestedValues } from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/suggested-values.ts)
// ---------------------------------------------------------------------------

const listSuggestedValuesSchema = z.object({
  category: z.string(),
  activeOnly: z.boolean().optional().default(true),
});

const createSuggestedValueSchema = z.object({
  category: z.string(),
  value: z.string().min(1),
});

const updateSuggestedValueSchema = z.object({
  id: z.string().uuid(),
  value: z.string().min(1),
});

const mergeSuggestedValuesSchema = z.object({
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
});

const toggleActiveSuggestedValueSchema = z.object({
  id: z.string().uuid(),
  active: z.boolean(),
});

// ---------------------------------------------------------------------------
// Inlined query logic — no org scoping (reference data is global).
// ---------------------------------------------------------------------------

async function listFn(
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

async function createFn(
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

async function updateFn(
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

async function mergeFn(
  db: Database,
  input: z.infer<typeof mergeSuggestedValuesSchema>,
) {
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

  await db
    .delete(suggestedValues)
    .where(eq(suggestedValues.id, input.sourceId));

  return { merged: true };
}

async function toggleActiveFn(
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

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const listSuggestedValues = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(listSuggestedValuesSchema)
  .handler(async ({ data, context }) => {
    return listFn(context.db, data);
  });

export const suggestedValuesOptions = (category: string) =>
  queryOptions({
    queryKey: ["suggestedValues", category],
    queryFn: () => listSuggestedValues({ data: { category } }),
  });

export const createSuggestedValue = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return createFn(context.db, data);
  });

export const updateSuggestedValue = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return updateFn(context.db, data);
  });

export const mergeSuggestedValues = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(mergeSuggestedValuesSchema)
  .handler(async ({ data, context }) => {
    return mergeFn(context.db, data);
  });

export const toggleSuggestedValueActive = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(toggleActiveSuggestedValueSchema)
  .handler(async ({ data, context }) => {
    return toggleActiveFn(context.db, data);
  });
