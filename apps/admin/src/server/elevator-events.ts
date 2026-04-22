import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { and, desc, eq, inArray, ne, sql } from "drizzle-orm";
import type { Database, DatabaseHttp } from "@elevatorbud/db";
import {
  elevators,
  elevatorDetails,
  elevatorEvents,
  ELEVATOR_EVENT_TYPES,
} from "@elevatorbud/db/schema";
import { adminMiddleware, adminMiddlewareRead } from "./auth";
import {
  MODERNIZATION_FIELD_KEYS,
  REPLACEMENT_CLEAR_DETAIL_KEYS,
  isModernizationFieldKey,
  type ModernizationFieldKey,
} from "~/features/elevator-events/modernization-fields";

type ReadDb = Database | DatabaseHttp;

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const eventTypeSchema = z.enum(ELEVATOR_EVENT_TYPES);

// Occurred-at accepts either an ISO string (full timestamp) or a date-only
// `YYYY-MM-DD` from the HTML <input type="date">. Date-only is normalized
// to midnight UTC so the timeline sorts deterministically.
const occurredAtSchema = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), "Ogiltigt datum")
  .transform((v) => {
    // Bare YYYY-MM-DD -> treat as UTC midnight
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return new Date(`${v}T00:00:00Z`);
    return new Date(v);
  });

const createEventInput = z.object({
  elevatorId: z.string().uuid(),
  type: eventTypeSchema,
  occurredAt: occurredAtSchema,
  title: z.string().min(1, "Titel krävs").max(200),
  description: z.string().max(5000).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  performedBy: z.string().max(200).optional().nullable(),
  // Loose shape on purpose — validated per-type in the future if/when the
  // UI starts writing typed metadata. For now it's free-form.
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

const updateEventInput = z.object({
  id: z.string().uuid(),
  elevatorId: z.string().uuid(),
  type: eventTypeSchema,
  occurredAt: occurredAtSchema,
  title: z.string().min(1).max(200),
  description: z.string().max(5000).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  performedBy: z.string().max(200).optional().nullable(),
  // Preserve-on-omit semantics: callers that don't pass `metadata` leave
  // whatever is already stored alone. This matters for modernization and
  // replacement events, whose metadata (`changes` / `snapshot`) carries
  // the actual history — a generic edit dialog that only touches title/
  // description MUST NOT wipe the diff. Passing an explicit `null` still
  // clears it, which is the escape hatch for deliberate erasure.
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// Diff entry — a single field's before → after for a modernization event.
// `field` is validated against the allowlist; the server refuses anything
// outside MODERNIZATION_FIELD_KEYS so the UI can't accidentally (or
// maliciously) mutate columns that aren't modernization-eligible.
const modernizationChangeSchema = z.object({
  field: z
    .string()
    .refine(isModernizationFieldKey, "Okänt fält"),
  label: z.string().max(200),
  from: z.unknown(),
  to: z.unknown(),
});

const createModernizationInput = z.object({
  elevatorId: z.string().uuid(),
  occurredAt: occurredAtSchema,
  description: z.string().max(5000).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  performedBy: z.string().max(200).optional().nullable(),
  changes: z
    .array(modernizationChangeSchema)
    .min(1, "Minst en ändring krävs"),
});

// Shape of the new unit's technical details. Every field is optional — the
// user can leave anything unknown and fill it in later. Keys correspond
// directly to columns on elevator_details; keys not listed here are either
// preserved (floorCount et al.) or not part of the detail row.
const newDetailsSchema = z
  .object({
    // Technical specification
    speed: z.string().max(100).optional().nullable(),
    liftHeight: z.string().max(100).optional().nullable(),
    loadCapacity: z.string().max(100).optional().nullable(),
    doorCount: z.number().int().min(0).max(20).optional().nullable(),
    // Doors & cab
    doorType: z.string().max(200).optional().nullable(),
    doorOpening: z.string().max(100).optional().nullable(),
    doorCarrier: z.string().max(200).optional().nullable(),
    doorMachine: z.string().max(200).optional().nullable(),
    cabSize: z.string().max(100).optional().nullable(),
    passthrough: z.boolean().optional().nullable(),
    dispatchMode: z.string().max(200).optional().nullable(),
    // Machinery
    driveSystem: z.string().max(200).optional().nullable(),
    suspension: z.string().max(100).optional().nullable(),
    machinePlacement: z.string().max(200).optional().nullable(),
    machineType: z.string().max(200).optional().nullable(),
    controlSystemType: z.string().max(200).optional().nullable(),
    // Safety & emergency phone
    shaftLighting: z.string().max(200).optional().nullable(),
    emergencyPhone: z.string().max(400).optional().nullable(),
    emergencyPhonePrice: z.number().nonnegative().optional().nullable(),
  })
  .optional();

const createReplacementInput = z.object({
  elevatorId: z.string().uuid(),
  occurredAt: occurredAtSchema,
  description: z.string().max(5000).optional().nullable(),
  cost: z.number().nonnegative().optional().nullable(),
  currency: z.string().max(8).optional().nullable(),
  performedBy: z.string().max(200).optional().nullable(),
  newIdentity: z.object({
    elevatorNumber: z.string().min(1, "Hissnummer krävs").max(100),
    manufacturer: z.string().min(1, "Fabrikat krävs").max(200),
    buildYear: z
      .number()
      .int()
      .min(1800)
      .max(2100),
  }),
  // Optional full spec for the new unit. When present, the user filled in
  // the replacement page's form instead of leaving the new unit with only
  // identity. Server applies these in the same transaction that archives
  // the outgoing state.
  newDetails: newDetailsSchema,
});

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

async function listEventsFn(db: ReadDb, elevatorId: string) {
  return db.query.elevatorEvents.findMany({
    where: eq(elevatorEvents.elevatorId, elevatorId),
    orderBy: [desc(elevatorEvents.occurredAt), desc(elevatorEvents.createdAt)],
    with: {
      createdByUser: { columns: { id: true, name: true } },
    },
  });
}

export type ElevatorEventListItem = Awaited<ReturnType<typeof listEventsFn>>[number];

// ---------------------------------------------------------------------------
// Write helpers
// ---------------------------------------------------------------------------

/**
 * When an event changes the "latest state" of the elevator in a way that
 * `elevators.inventoryDate` / `elevators.modernizationYear` mirror, sync
 * those columns inside the same transaction. These columns are used by
 * list views, filters, and analytics — the events table is the source of
 * truth, the elevator columns are a denormalized cache.
 *
 * Replacement events count as the most recent modernization for cache
 * purposes — the elevator was physically replaced, so the "year modernized"
 * is the replacement year. The event `type` column differentiates if
 * reporting ever needs to (see PRD decision).
 */
async function syncElevatorCache(
  db: DbOrTx,
  elevatorId: string,
) {
  // One aggregated query instead of three serial ones — syncElevatorCache is
  // on the hot path for every event write and every matching update.
  const rows = await db
    .select({
      type: elevatorEvents.type,
      occurredAt: sql<Date>`max(${elevatorEvents.occurredAt})`,
    })
    .from(elevatorEvents)
    .where(
      and(
        eq(elevatorEvents.elevatorId, elevatorId),
        inArray(elevatorEvents.type, [
          "inventory",
          "modernization",
          "replacement",
        ]),
      ),
    )
    .groupBy(elevatorEvents.type);

  let latestInventory: Date | null = null;
  let newestModLike: Date | null = null;
  for (const r of rows) {
    // Neon's HTTP driver returns `timestamptz` as an ISO string, while the
    // WS/pool driver returns a Date. Normalize.
    const occurredAt =
      r.occurredAt instanceof Date ? r.occurredAt : new Date(r.occurredAt);
    if (r.type === "inventory") {
      latestInventory = occurredAt;
    } else if (r.type === "modernization" || r.type === "replacement") {
      // Either a modernization or a replacement counts as "the year this unit
      // was last renewed" for the denormalized cache. Event `type` on the
      // events table differentiates if reporting ever needs to split them.
      if (!newestModLike || occurredAt > newestModLike) {
        newestModLike = occurredAt;
      }
    }
  }

  const patch: Record<string, unknown> = {};
  if (latestInventory) {
    // elevators.inventoryDate is stored as text (YYYY-MM-DD) — match.
    patch.inventoryDate = latestInventory.toISOString().slice(0, 10);
  }
  if (newestModLike) {
    // elevators.modernizationYear is stored as text — use the year.
    patch.modernizationYear = String(newestModLike.getUTCFullYear());
  }
  if (Object.keys(patch).length > 0) {
    await db.update(elevators).set(patch).where(eq(elevators.id, elevatorId));
  }
}

type DbOrTx = Parameters<Parameters<Database["transaction"]>[0]>[0] | Database;

async function createEventFn(
  db: Database,
  input: z.infer<typeof createEventInput>,
  userId: string,
) {
  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.id, input.elevatorId),
    columns: { id: true },
  });
  if (!existing) throw new Error("Hissen hittades inte");

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(elevatorEvents)
      .values({
        elevatorId: input.elevatorId,
        type: input.type,
        occurredAt: input.occurredAt,
        title: input.title,
        description: input.description ?? undefined,
        cost: input.cost != null ? String(input.cost) : undefined,
        currency: input.currency ?? undefined,
        performedBy: input.performedBy ?? undefined,
        metadata: input.metadata ?? undefined,
        createdBy: userId,
      })
      .returning({ id: elevatorEvents.id });

    if (input.type === "inventory" || input.type === "modernization") {
      await syncElevatorCache(tx, input.elevatorId);
    }

    if (!row) throw new Error("Kunde inte skapa händelse");
    return row;
  });

  return { id: result.id };
}

async function updateEventFn(
  db: Database,
  input: z.infer<typeof updateEventInput>,
  userId: string,
) {
  const existing = await db.query.elevatorEvents.findFirst({
    where: eq(elevatorEvents.id, input.id),
  });
  if (!existing) throw new Error("Händelsen hittades inte");
  if (existing.elevatorId !== input.elevatorId) {
    throw new Error("Händelsen tillhör inte den hissen");
  }

  // Build the patch dynamically so we only touch `metadata` when the
  // caller explicitly passes it. Undefined → preserve the existing jsonb
  // (critical for modernization/replacement events whose diff/snapshot
  // lives there). Explicit null → clear.
  const patch: Record<string, unknown> = {
    type: input.type,
    occurredAt: input.occurredAt,
    title: input.title,
    description: input.description ?? null,
    cost: input.cost != null ? String(input.cost) : null,
    currency: input.currency ?? null,
    performedBy: input.performedBy ?? null,
    updatedBy: userId,
    updatedAt: new Date(),
  };
  if (input.metadata !== undefined) {
    patch.metadata = input.metadata;
  }

  await db.transaction(async (tx) => {
    await tx
      .update(elevatorEvents)
      .set(patch)
      .where(eq(elevatorEvents.id, input.id));

    if (
      input.type === "inventory" ||
      input.type === "modernization" ||
      input.type === "replacement" ||
      existing.type === "inventory" ||
      existing.type === "modernization" ||
      existing.type === "replacement"
    ) {
      await syncElevatorCache(tx, input.elevatorId);
    }
  });

  return { id: input.id };
}

/**
 * Coerce a raw `to` value from the client into the shape the elevator_details
 * column expects. Integers get Number-coerced; booleans get a truthy cast;
 * everything else goes through as a string. Empty strings become null so the
 * column ends up nullable-consistent with the rest of the codebase.
 */
function coerceDetailValue(
  key: ModernizationFieldKey,
  raw: unknown,
): string | number | boolean | null {
  if (raw == null || raw === "") return null;
  if (key === "floorCount" || key === "doorCount") {
    const n = typeof raw === "number" ? raw : Number(raw);
    if (!Number.isFinite(n)) return null;
    return Math.trunc(n);
  }
  if (key === "passthrough") {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      const s = raw.trim().toLowerCase();
      if (s === "true" || s === "ja") return true;
      if (s === "false" || s === "nej") return false;
    }
    return null;
  }
  return String(raw);
}

async function createModernizationEventFn(
  db: Database,
  input: z.infer<typeof createModernizationInput>,
  userId: string,
) {
  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.id, input.elevatorId),
    columns: { id: true },
  });
  if (!existing) throw new Error("Hissen hittades inte");

  // Build the partial elevator_details patch — only the `to` value for each
  // changed field. Everything else on the row is untouched.
  const detailPatch: Record<string, unknown> = {};
  for (const change of input.changes) {
    // Validated above, but narrow for TS.
    if (!isModernizationFieldKey(change.field)) continue;
    detailPatch[change.field] = coerceDetailValue(change.field, change.to);
  }

  // Title is derived — a short summary of what changed. Users type the long
  // description separately (maps to `description`).
  const title =
    input.changes.length === 1
      ? `Modernisering: ${input.changes[0]!.label}`
      : `Modernisering (${input.changes.length} fält)`;

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(elevatorEvents)
      .values({
        elevatorId: input.elevatorId,
        type: "modernization",
        occurredAt: input.occurredAt,
        title,
        description: input.description ?? undefined,
        cost: input.cost != null ? String(input.cost) : undefined,
        currency: input.currency ?? undefined,
        performedBy: input.performedBy ?? undefined,
        metadata: {
          changes: input.changes.map((c) => ({
            field: c.field,
            label: c.label,
            from: c.from ?? null,
            to: c.to ?? null,
          })),
        },
        createdBy: userId,
      })
      .returning({ id: elevatorEvents.id });

    // Upsert the details row: insert the patch if no row exists yet, or
    // update the patched fields on conflict. elevatorId is unique on
    // elevator_details so it's a valid conflict target.
    await tx
      .insert(elevatorDetails)
      .values({
        elevatorId: input.elevatorId,
        ...detailPatch,
      })
      .onConflictDoUpdate({
        target: elevatorDetails.elevatorId,
        set: detailPatch,
      });

    await syncElevatorCache(tx, input.elevatorId);

    if (!row) throw new Error("Kunde inte skapa händelse");
    return row;
  });

  return { id: result.id };
}

async function createReplacementEventFn(
  db: Database,
  input: z.infer<typeof createReplacementInput>,
  userId: string,
) {
  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.id, input.elevatorId),
    with: { details: true },
  });
  if (!existing) throw new Error("Hissen hittades inte");

  // Snapshot every non-audit field of the outgoing elevator + its details.
  // This is what "preserves history" on a replacement — the event carries
  // the full pre-replacement state so nothing is lost when we overwrite the
  // elevator row below.
  const snapshot = {
    elevator: {
      elevatorNumber: existing.elevatorNumber,
      elevatorType: existing.elevatorType,
      manufacturer: existing.manufacturer,
      buildYear: existing.buildYear,
      modernizationYear: existing.modernizationYear,
      warrantyExpiresAt: existing.warrantyExpiresAt,
      hasEmergencyPhone: existing.hasEmergencyPhone,
      needsUpgrade: existing.needsUpgrade,
    },
    details: existing.details ?? null,
  };

  const replacedWith = {
    elevatorNumber: input.newIdentity.elevatorNumber,
    manufacturer: input.newIdentity.manufacturer,
    buildYear: input.newIdentity.buildYear,
  };

  const title = `Utbyte: ${existing.manufacturer ?? "okänt fabrikat"} → ${input.newIdentity.manufacturer}`;

  // Technical fields cleared on replacement. Contextual fields (floorCount,
  // plus columns on `elevators` like inspectionAuthority) are preserved.
  // See PRD FR-6b.
  //
  // The "clear patch" starts as {key: null, ...} for every clear-on-replace
  // column, then we overlay any `newDetails` the user supplied — so fields
  // the user filled in end up with their new value, and fields left blank
  // end up null. One upsert instead of clear-then-apply.
  const detailPatch: Record<string, unknown> = {};
  for (const key of REPLACEMENT_CLEAR_DETAIL_KEYS) {
    detailPatch[key as string] = null;
  }
  if (input.newDetails) {
    for (const [key, value] of Object.entries(input.newDetails)) {
      if (value === undefined) continue;
      // emergencyPhonePrice is stored as numeric → needs string coercion.
      if (key === "emergencyPhonePrice" && typeof value === "number") {
        detailPatch[key] = String(value);
      } else {
        detailPatch[key] = value;
      }
    }
  }

  // Preflight duplicate check — the new identity may reuse a number that
  // already exists on another elevator in the same org, which would trip the
  // (organizationId, elevatorNumber) unique index and surface the raw Postgres
  // error to the user. Only check if the number is actually changing.
  if (input.newIdentity.elevatorNumber !== existing.elevatorNumber) {
    const duplicate = await db.query.elevators.findFirst({
      where: and(
        eq(elevators.elevatorNumber, input.newIdentity.elevatorNumber),
        eq(elevators.organizationId, existing.organizationId),
        ne(elevators.id, input.elevatorId),
      ),
      columns: { id: true },
    });
    if (duplicate) {
      throw new Error(
        `Hissnummer ${input.newIdentity.elevatorNumber} finns redan i registret`,
      );
    }
  }

  const result = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(elevatorEvents)
      .values({
        elevatorId: input.elevatorId,
        type: "replacement",
        occurredAt: input.occurredAt,
        title,
        description: input.description ?? undefined,
        cost: input.cost != null ? String(input.cost) : undefined,
        currency: input.currency ?? undefined,
        performedBy: input.performedBy ?? undefined,
        metadata: { snapshot, replacedWith },
        createdBy: userId,
      })
      .returning({ id: elevatorEvents.id });

    await tx
      .update(elevators)
      .set({
        elevatorNumber: input.newIdentity.elevatorNumber,
        manufacturer: input.newIdentity.manufacturer,
        buildYear: input.newIdentity.buildYear,
        lastUpdatedBy: userId,
        lastUpdatedAt: new Date(),
      })
      .where(eq(elevators.id, input.elevatorId));

    // Upsert the details row: insert if no row exists yet (new elevator
    // never had a details record), update on conflict. This also covers
    // the case where the user filled in new spec fields during the
    // replacement flow — those values take precedence over the nulls.
    await tx
      .insert(elevatorDetails)
      .values({
        elevatorId: input.elevatorId,
        ...detailPatch,
      })
      .onConflictDoUpdate({
        target: elevatorDetails.elevatorId,
        set: detailPatch,
      });

    await syncElevatorCache(tx, input.elevatorId);

    if (!row) throw new Error("Kunde inte skapa händelse");
    return row;
  });

  return { id: result.id };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const listElevatorEvents = createServerFn()
  .middleware([adminMiddlewareRead])
  .inputValidator(z.object({ elevatorId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return listEventsFn(context.db, data.elevatorId);
  });

export const elevatorEventsOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "events", elevatorId],
    queryFn: () => listElevatorEvents({ data: { elevatorId } }),
  });

export const createElevatorEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createEventInput)
  .handler(async ({ data, context }) => {
    return createEventFn(context.db, data, context.user.id);
  });

export const updateElevatorEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateEventInput)
  .handler(async ({ data, context }) => {
    return updateEventFn(context.db, data, context.user.id);
  });

export const createModernizationEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createModernizationInput)
  .handler(async ({ data, context }) => {
    return createModernizationEventFn(context.db, data, context.user.id);
  });

export const createReplacementEvent = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createReplacementInput)
  .handler(async ({ data, context }) => {
    return createReplacementEventFn(context.db, data, context.user.id);
  });

// Input type re-exports so client-side mutations can share the shape without
// redeclaring it.
export type CreateModernizationInput = z.input<typeof createModernizationInput>;
export type CreateReplacementInput = z.input<typeof createReplacementInput>;
