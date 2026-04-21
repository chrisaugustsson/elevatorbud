import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  elevators,
  elevatorDetails,
  elevatorBudgets,
  elevatorEvents,
  organizations,
  suggestedValues,
} from "@elevatorbud/db/schema";
import type { Database } from "@elevatorbud/db";
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Zod schemas (inlined from packages/api/src/routers/import.ts)
// ---------------------------------------------------------------------------

const analyzeImportSchema = z.object({
  elevatorNumberList: z.array(z.string()),
  orgNames: z.array(z.string()),
});

// Defensive cap for a single confirm chunk. The client chunks by a small
// number (5) for per-chunk progress + per-row failure isolation; anything
// noticeably larger than that is a buggy or hostile caller.
const MAX_CHUNK_ROWS = 100;

// Upper bound for the full-file payloads (extract org names, analyze). Real
// production files (Bostadsbolaget) sit around ~1200 rows; 10k leaves room
// for larger customers while capping unbounded JSON.
const MAX_FILE_ROWS = 10000;

const confirmImportSchema = z.object({
  elevators: z
    .array(
      z.object({
      elevator_number: z.string(),
      address: z.string().nullish(),
      elevator_classification: z.string().nullish(),
      elevator_designation: z.string().nullish(),
      district: z.string().nullish(),
      elevator_type: z.string().nullish(),
      manufacturer: z.string().nullish(),
      build_year: z.number().nullish(),
      inspection_authority: z.string().nullish(),
      inspection_month: z.number().int().min(1).max(12).nullish(),
      maintenance_company: z.string().nullish(),
      // Year-like fields accept only 4-digit year or null/undefined.
      // modernization_year additionally accepts the "Ej ombyggd" sentinel
      // for backwards compatibility with existing exports. Client-side
      // parsers strip invalid values with warnings; this is a second
      // layer of defense so the DB never ends up with "2025 Maskin" again.
      modernization_year: z
        .string()
        .refine(
          (v) =>
            v === "Ej ombyggd" ||
            (/^\d{4}$/.test(v) &&
              Number(v) >= 1800 &&
              Number(v) <= 2100),
          'modernization_year: endast 4-siffrigt år eller "Ej ombyggd".',
        )
        .nullish(),
      // YYYY-MM-DD expected when provided. Used to seed the initial
      // `inventory` event AND cached on elevators.inventory_date.
      inventory_date: z.string().nullish(),
      // YYYY-MM-DD expected when provided. Warranty expiration date for
      // the most recent modernization (or null when the source cell was
      // a sentinel like "Ja"/"Nej"/"?"/"okänt").
      warranty_expires_at: z
        .string()
        .refine(
          (v) => /^\d{4}-\d{2}-\d{2}$/.test(v),
          "warranty_expires_at: ISO YYYY-MM-DD krävs.",
        )
        .nullish(),
      needs_upgrade: z.boolean().nullish(),
      // Details
      speed: z.string().nullish(),
      lift_height: z.string().nullish(),
      load_capacity: z.string().nullish(),
      floor_count: z.number().nullish(),
      door_count: z.number().nullish(),
      door_type: z.string().nullish(),
      passthrough: z.boolean().nullish(),
      dispatch_mode: z.string().nullish(),
      collective: z.string().nullish(),
      cab_size: z.string().nullish(),
      door_opening: z.string().nullish(),
      daylight_opening: z.string().nullish(),
      door_carrier: z.string().nullish(),
      grab_rail: z.string().nullish(),
      door_machine: z.string().nullish(),
      drive_system: z.string().nullish(),
      suspension: z.string().nullish(),
      machine_placement: z.string().nullish(),
      machine_type: z.string().nullish(),
      control_system_type: z.string().nullish(),
      shaft_lighting: z.string().nullish(),
      comments: z.string().nullish(),
      // Contact person
      contact_person_name: z.string().nullish(),
      contact_person_phone: z.string().nullish(),
      contact_person_email: z.string().nullish(),
      // Budget
      recommended_modernization_year: z
        .string()
        .refine(
          (v) =>
            /^\d{4}$/.test(v) && Number(v) >= 1800 && Number(v) <= 2100,
          "recommended_modernization_year: endast 4-siffrigt år (1800–2100).",
        )
        .nullish(),
      budget_amount: z.number().nullish(),
      modernization_measures: z.string().nullish(),
      // Resolved org ID from mapping step
      _organizationId: z.string(),
      _source_row: z.number().optional(),
      _source_sheet: z.string().optional(),
      }),
    )
    .max(MAX_CHUNK_ROWS),
});

/**
 * Build a descriptive error string pointing at the exact Excel row that
 * broke the import, so the admin can fix it without guessing. Keeps the
 * transaction-rolled-back reminder from the UI copy so the two messages
 * stay consistent.
 *
 * Drizzle wraps PG errors in `DrizzleQueryError` whose `.message` is just
 * "Failed query: <SQL>\nparams: <params>". The real reason (FK/check
 * violation, column overflow, etc.) is on `.cause`, and on some drivers
 * wrapped one level deeper. Walk the chain to surface it — without this
 * the admin sees a wall of SQL but not the actual cause.
 */
function rootCauseMessage(err: unknown): string {
  let cur: unknown = err;
  let root = "";
  for (let depth = 0; depth < 5 && cur; depth++) {
    if (cur instanceof Error) {
      // Prefer a non-"Failed query" message as the root; Drizzle's wrapper
      // always starts with that string, PG's does not.
      if (cur.message && !cur.message.startsWith("Failed query:")) {
        root = cur.message;
      } else if (!root) {
        root = cur.message ?? "";
      }
      cur = (cur as { cause?: unknown }).cause;
    } else {
      if (!root) root = String(cur);
      break;
    }
  }
  return root || "okänt fel";
}

export type ImportFailure = {
  elevator_number: string;
  sheet: string | null;
  row: number | null;
  reason: string;
};

// ---------------------------------------------------------------------------
// Inlined query logic — no org scoping (import is admin-only).
// ---------------------------------------------------------------------------

function toDetailData(data: z.infer<typeof confirmImportSchema>["elevators"][number]) {
  return {
    speed: data.speed,
    liftHeight: data.lift_height,
    loadCapacity: data.load_capacity,
    floorCount: data.floor_count,
    doorCount: data.door_count,
    doorType: data.door_type,
    passthrough: data.passthrough,
    dispatchMode: data.dispatch_mode ?? data.collective,
    cabSize: data.cab_size,
    doorOpening: data.door_opening ?? data.daylight_opening,
    doorCarrier: data.door_carrier,
    doorMachine: data.door_machine,
    driveSystem: data.drive_system,
    suspension: data.suspension,
    machinePlacement: data.machine_placement,
    machineType: data.machine_type,
    controlSystemType: data.control_system_type,
    shaftLighting: data.shaft_lighting,
    comments: data.comments,
  };
}

// Re-imports use merge semantics: a blank Excel cell (null/undefined from the
// parser) must NOT clear existing DB data — admins may bulk-edit only a few
// columns and re-upload the whole file. The helpers below drop null/undefined
// so the UPDATE only touches columns the admin actually provided.
type MergeSource = Record<string, unknown>;

function mergeNonNull(source: MergeSource): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(source)) {
    if (val !== null && val !== undefined) out[key] = val;
  }
  return out;
}

function toElevatorMergeUpdate(r: ConfirmRow) {
  return mergeNonNull({
    address: r.address,
    elevatorClassification: r.elevator_classification,
    district: r.district,
    elevatorType: r.elevator_type,
    manufacturer: r.manufacturer,
    buildYear: r.build_year,
    inspectionAuthority: r.inspection_authority,
    inspectionMonth: r.inspection_month,
    maintenanceCompany: r.maintenance_company,
    modernizationYear: r.modernization_year,
    warrantyExpiresAt: r.warranty_expires_at,
    inventoryDate: r.inventory_date,
    needsUpgrade: r.needs_upgrade,
    contactPersonName: r.contact_person_name,
    contactPersonPhone: r.contact_person_phone,
    contactPersonEmail: r.contact_person_email,
  });
}

function toDetailMergeUpdate(r: ConfirmRow) {
  return mergeNonNull(toDetailData(r));
}

function toBudgetMergeUpdate(r: ConfirmRow) {
  return mergeNonNull({
    recommendedModernizationYear: r.recommended_modernization_year,
    budgetAmount: r.budget_amount != null ? String(r.budget_amount) : undefined,
    measures: r.modernization_measures,
  });
}

async function analyzeFn(
  db: Database,
  input: z.infer<typeof analyzeImportSchema>,
) {
  // Imports always create new elevator rows — no reconciliation against
  // existing numbers. The analyze step only resolves org-name matches now.

  // Match org names EXACT case-sensitive (PRD FR-9).
  // Non-exact variants (different casing / whitespace / punctuation) must NOT
  // auto-merge; the admin decides in the mapping UI.
  const orgMatchNames: string[] = [];
  const orgMatchIds: string[] = [];
  const newOrgNames: string[] = [];

  if (input.orgNames.length > 0) {
    const allOrgs = await db.query.organizations.findMany();
    const orgMap = new Map(allOrgs.map((o) => [o.name, o]));

    for (const name of input.orgNames) {
      const match = orgMap.get(name);
      if (match) {
        orgMatchNames.push(match.name);
        orgMatchIds.push(match.id);
      } else {
        newOrgNames.push(name);
      }
    }
  }

  return {
    orgMatchNames,
    orgMatchIds,
    newOrgNames,
    summary: {
      newElevators: input.elevatorNumberList.length,
      matchedOrgs: orgMatchNames.length,
      newOrgs: newOrgNames.length,
    },
  };
}

type ConfirmRow = z.infer<typeof confirmImportSchema>["elevators"][number];

function toElevatorInsert(r: ConfirmRow, userId: string) {
  return {
    elevatorNumber: r.elevator_number,
    address: r.address,
    elevatorClassification: r.elevator_classification,
    district: r.district,
    elevatorType: r.elevator_type,
    manufacturer: r.manufacturer,
    buildYear: r.build_year,
    inspectionAuthority: r.inspection_authority,
    inspectionMonth: r.inspection_month,
    maintenanceCompany: r.maintenance_company,
    modernizationYear: r.modernization_year,
    warrantyExpiresAt: r.warranty_expires_at,
    inventoryDate: r.inventory_date,
    needsUpgrade: r.needs_upgrade,
    organizationId: r._organizationId,
    contactPersonName: r.contact_person_name,
    contactPersonPhone: r.contact_person_phone,
    contactPersonEmail: r.contact_person_email,
    status: "active" as const,
    createdBy: userId,
  };
}

/**
 * Parse a year-like string from the Excel column `Moderniseringsår`. Accepts
 * bare 4-digit years and common variants ("1987", "1987-88", " 1987 ").
 * Returns null for "Ej ombyggd" sentinels and non-parseable values.
 *
 * The elevator's modernization event occurredAt is set to July 1 of the
 * parsed year — a neutral mid-year placeholder when the day isn't known,
 * consistent enough for year-based grouping on the timeline.
 */
function parseModernizationYearForEvent(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.toLowerCase() === "ej ombyggd") return null;
  const match = trimmed.match(/^(\d{4})/);
  if (!match) return null;
  const year = Number(match[1]);
  if (!Number.isFinite(year) || year < 1800 || year > 2100) return null;
  return new Date(Date.UTC(year, 6, 1)); // July 1 UTC
}

function parseInventoryDateForEvent(value: string | null | undefined): Date | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T00:00:00Z`);
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

function rowRef(r: ConfirmRow): Pick<ImportFailure, "elevator_number" | "sheet" | "row"> {
  return {
    elevator_number: r.elevator_number,
    sheet: r._source_sheet ?? null,
    row: r._source_row ?? null,
  };
}

export type ConfirmImportResult = {
  created: number;
  updated: number;
  failures: ImportFailure[];
  perOrgCounts: Record<
    string,
    { orgName: string; created: number; updated: number }
  >;
};

/**
 * Process one chunk of elevators. Each row runs inside its own PG savepoint
 * so a failure isolates to that row — successful rows in the same chunk
 * commit. The client calls this in a loop with small chunks to stream
 * progress and build a per-row failure report.
 *
 * Exported so integration tests can call it directly with a test DB,
 * bypassing the server-fn wrapper and auth middleware.
 */
export async function confirmFn(
  db: Database,
  userId: string,
  input: z.infer<typeof confirmImportSchema>,
): Promise<ConfirmImportResult> {
  const rows = input.elevators;
  const failures: ImportFailure[] = [];
  const perOrgCounts: Record<
    string,
    { orgName: string; created: number; updated: number }
  > = {};
  let created = 0;
  let updated = 0;

  if (rows.length === 0) {
    return { created: 0, updated: 0, failures: [], perOrgCounts: {} };
  }

  // Look up every referenced org once per chunk. Rows whose org vanished
  // between mapping and import are recorded as per-row failures instead of
  // aborting the whole chunk — the admin can re-map and re-run.
  const referencedOrgIds = [...new Set(rows.map((r) => r._organizationId))];
  const existingOrgs = await db
    .select({ id: organizations.id, name: organizations.name })
    .from(organizations)
    .where(inArray(organizations.id, referencedOrgIds));
  const orgById = new Map(existingOrgs.map((o) => [o.id, o]));

  const successfulRows: ConfirmRow[] = [];

  await db.transaction(async (tx) => {
    for (const row of rows) {
      const org = orgById.get(row._organizationId);
      if (!org) {
        failures.push({
          ...rowRef(row),
          reason:
            "Organisationen i mappningen hittades inte — uppdatera och försök igen.",
        });
        continue;
      }

      // Tracked outside the savepoint callback so the outer scope can
      // bucket the row as created/updated only if the savepoint commits.
      // Re-imports: existing (organizationId, elevatorNumber) → UPDATE with
      // merge semantics (blank Excel cells leave DB values untouched).
      let rowOutcome: "created" | "updated" | null = null;

      try {
        await tx.transaction(async (sp) => {
          const [existing] = await sp
            .select({ id: elevators.id })
            .from(elevators)
            .where(
              and(
                eq(elevators.organizationId, row._organizationId),
                eq(elevators.elevatorNumber, row.elevator_number),
              ),
            )
            .limit(1);

          let elevatorId: string;
          const isUpdate = !!existing;

          if (existing) {
            elevatorId = existing.id;

            const elevatorUpdate = toElevatorMergeUpdate(row);
            // Always stamp the updater, even if no other columns changed —
            // the fact that the admin re-submitted this row is itself signal.
            await sp
              .update(elevators)
              .set({
                ...elevatorUpdate,
                lastUpdatedBy: userId,
                lastUpdatedAt: new Date(),
              })
              .where(eq(elevators.id, elevatorId));

            const detailUpdate = toDetailMergeUpdate(row);
            const [existingDetail] = await sp
              .select({ id: elevatorDetails.id })
              .from(elevatorDetails)
              .where(eq(elevatorDetails.elevatorId, elevatorId))
              .limit(1);
            if (existingDetail) {
              if (Object.keys(detailUpdate).length > 0) {
                await sp
                  .update(elevatorDetails)
                  .set(detailUpdate)
                  .where(eq(elevatorDetails.elevatorId, elevatorId));
              }
            } else {
              await sp.insert(elevatorDetails).values({
                elevatorId,
                ...toDetailData(row),
              });
            }
          } else {
            const [inserted] = await sp
              .insert(elevators)
              .values(toElevatorInsert(row, userId))
              .returning({ id: elevators.id });
            if (!inserted) {
              throw new Error(
                `Kunde inte skapa hiss ${row.elevator_number}.`,
              );
            }
            elevatorId = inserted.id;

            await sp.insert(elevatorDetails).values({
              elevatorId,
              ...toDetailData(row),
            });
          }

          // Budget: merge onto the most recent row (the import only ever
          // creates one; if the admin added extras in the app, we update
          // the newest so the latest planning values win). When no budget
          // row exists yet AND Excel has budget data, create one.
          const budgetUpdate = toBudgetMergeUpdate(row);
          if (Object.keys(budgetUpdate).length > 0) {
            const [latestBudget] = await sp
              .select({ id: elevatorBudgets.id })
              .from(elevatorBudgets)
              .where(eq(elevatorBudgets.elevatorId, elevatorId))
              .orderBy(desc(elevatorBudgets.createdAt))
              .limit(1);
            if (latestBudget) {
              await sp
                .update(elevatorBudgets)
                .set(budgetUpdate)
                .where(eq(elevatorBudgets.id, latestBudget.id));
            } else {
              await sp.insert(elevatorBudgets).values({
                elevatorId,
                createdBy: userId,
                ...budgetUpdate,
              });
            }
          }

          // Seed historical events from the Excel row. On re-import, dedupe
          // by (elevatorId, type, occurredAt) so repeated imports don't
          // produce duplicate timeline entries. Modernization occurredAt is
          // deterministic (July 1 of the year), inventory is the exact
          // date — both make reliable dedupe keys.
          //
          // The "Åtgärder vid modernisering" column describes the FUTURE
          // recommended modernization (it lives on the budget/plan), not what
          // was actually done in the historic year. So the seeded modernization
          // event has no description — we only know the year happened.
          const modernizationDate = parseModernizationYearForEvent(
            row.modernization_year,
          );
          if (modernizationDate) {
            let shouldInsert = true;
            if (isUpdate) {
              const [dup] = await sp
                .select({ id: elevatorEvents.id })
                .from(elevatorEvents)
                .where(
                  and(
                    eq(elevatorEvents.elevatorId, elevatorId),
                    eq(elevatorEvents.type, "modernization"),
                    eq(elevatorEvents.occurredAt, modernizationDate),
                  ),
                )
                .limit(1);
              shouldInsert = !dup;
            }
            if (shouldInsert) {
              await sp.insert(elevatorEvents).values({
                elevatorId,
                type: "modernization",
                occurredAt: modernizationDate,
                title: `Modernisering ${modernizationDate.getUTCFullYear()}`,
                metadata: {
                  source: "import",
                  rawModernizationYear: row.modernization_year ?? null,
                },
                createdBy: userId,
              });
            }
          }

          const inventoryDate = parseInventoryDateForEvent(row.inventory_date);
          if (inventoryDate) {
            let shouldInsert = true;
            if (isUpdate) {
              const [dup] = await sp
                .select({ id: elevatorEvents.id })
                .from(elevatorEvents)
                .where(
                  and(
                    eq(elevatorEvents.elevatorId, elevatorId),
                    eq(elevatorEvents.type, "inventory"),
                    eq(elevatorEvents.occurredAt, inventoryDate),
                  ),
                )
                .limit(1);
              shouldInsert = !dup;
            }
            if (shouldInsert) {
              await sp.insert(elevatorEvents).values({
                elevatorId,
                type: "inventory",
                occurredAt: inventoryDate,
                title: "Inventering",
                metadata: {
                  source: "import",
                  rawInventoryDate: row.inventory_date ?? null,
                },
                createdBy: userId,
              });
            }
          }

          rowOutcome = isUpdate ? "updated" : "created";
        });

        if (!perOrgCounts[org.id])
          perOrgCounts[org.id] = { orgName: org.name, created: 0, updated: 0 };
        if (rowOutcome === "updated") {
          updated++;
          perOrgCounts[org.id]!.updated++;
        } else {
          created++;
          perOrgCounts[org.id]!.created++;
        }
        successfulRows.push(row);
      } catch (e) {
        failures.push({ ...rowRef(row), reason: rootCauseMessage(e) });
      }
    }

    // Suggested values are chunk-level reference data, not per-row state —
    // collect from every row that committed and upsert once. `onConflictDoNothing`
    // keeps repeated chunks safe.
    const svEntries: { category: string; value: string }[] = [];
    const svSeen = new Set<string>();
    for (const r of successfulRows) {
      const pairs: [string, string | null | undefined][] = [
        ["elevator_type", r.elevator_type],
        ["manufacturer", r.manufacturer],
        ["district", r.district],
        ["maintenance_company", r.maintenance_company],
        ["inspection_authority", r.inspection_authority],
        ["elevator_classification", r.elevator_classification],
      ];
      for (const [cat, val] of pairs) {
        if (val && !svSeen.has(`${cat}:${val}`)) {
          svSeen.add(`${cat}:${val}`);
          svEntries.push({ category: cat, value: val });
        }
      }
    }
    if (svEntries.length > 0) {
      await tx
        .insert(suggestedValues)
        .values(svEntries.map((e) => ({ ...e, active: true })))
        .onConflictDoNothing();
    }
  });

  return { created, updated, failures, perOrgCounts };
}

// ---------------------------------------------------------------------------
// Extract org names
// ---------------------------------------------------------------------------

const extractOrgNamesSchema = z.object({
  rows: z
    .array(
      z
        .object({
          _organisation_namn: z.string().optional(),
        })
        .passthrough(),
    )
    // Whole-file payload: covers every row in the spreadsheet so we can
    // list the org names in one pass. Distinct from the per-chunk confirm
    // cap, which is deliberately small.
    .max(MAX_FILE_ROWS),
});

function extractOrgNamesFn(input: z.infer<typeof extractOrgNamesSchema>) {
  const seen = new Set<string>();
  const orgNames: string[] = [];
  for (const row of input.rows) {
    const name = row._organisation_namn;
    if (name && !seen.has(name)) {
      seen.add(name);
      orgNames.push(name);
    }
  }
  return { orgNames, rowCount: input.rows.length };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const extractOrgNames = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(extractOrgNamesSchema)
  .handler(async ({ data }) => {
    return extractOrgNamesFn(data);
  });

export const extractOrgNamesOptions = (
  rows: z.infer<typeof extractOrgNamesSchema>["rows"] | null,
) =>
  queryOptions({
    queryKey: ["import", "extractOrgNames", rows?.length ?? 0],
    queryFn: () => extractOrgNames({ data: { rows: rows! } }),
    enabled: !!rows && rows.length > 0,
  });

export const analyzeImport = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(analyzeImportSchema)
  .handler(async ({ data, context }) => {
    return analyzeFn(context.db, data);
  });

export const analyzeImportOptions = (
  input: z.infer<typeof analyzeImportSchema>,
) =>
  queryOptions({
    queryKey: ["import", "analyze", input],
    queryFn: () => analyzeImport({ data: input }),
  });

export const confirmImport = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(confirmImportSchema)
  .handler(async ({ data, context }) => {
    return confirmFn(context.db, context.user.id, data);
  });
