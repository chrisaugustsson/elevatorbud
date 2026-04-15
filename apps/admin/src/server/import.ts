import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { and, eq, inArray } from "drizzle-orm";
import {
  elevators,
  elevatorDetails,
  elevatorBudgets,
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

// Payload upper bound: real production files (Bostadsbolaget) sit around
// ~1200 rows. 10k leaves plenty of headroom for larger customers while
// preventing unbounded payloads that could exhaust server memory. Extension
// requires a deliberate schema bump.
const MAX_IMPORT_ROWS = 10000;

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
      inspection_month: z.string().nullish(),
      maintenance_company: z.string().nullish(),
      modernization_year: z.string().nullish(),
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
      revision_year: z.number().nullish(),
      recommended_modernization_year: z.string().nullish(),
      budget_amount: z.number().nullish(),
      measures: z.string().nullish(),
      modernization_measures: z.string().nullish(),
      warranty: z.boolean().nullish(),
      // Resolved org ID from mapping step
      _organizationId: z.string(),
      _source_row: z.number().optional(),
      }),
    )
    .max(MAX_IMPORT_ROWS),
});

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

async function analyzeFn(
  db: Database,
  input: z.infer<typeof analyzeImportSchema>,
) {
  // Find existing elevators by number (batched to avoid parameter limit)
  const existingElevatorNumbers: Record<string, string> = {};
  const BATCH_SIZE = 100;
  for (let i = 0; i < input.elevatorNumberList.length; i += BATCH_SIZE) {
    const batch = input.elevatorNumberList.slice(i, i + BATCH_SIZE);
    const existing = await db
      .select({
        id: elevators.id,
        elevatorNumber: elevators.elevatorNumber,
      })
      .from(elevators)
      .where(inArray(elevators.elevatorNumber, batch));
    for (const e of existing) {
      existingElevatorNumbers[e.elevatorNumber] = e.id;
    }
  }

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

  const newCount = input.elevatorNumberList.filter(
    (n) => !existingElevatorNumbers[n],
  ).length;
  const updatedCount = input.elevatorNumberList.filter(
    (n) => existingElevatorNumbers[n],
  ).length;

  return {
    existingElevatorNumbers,
    orgMatchNames,
    orgMatchIds,
    newOrgNames,
    summary: {
      newElevators: newCount,
      updatedElevators: updatedCount,
      matchedOrgs: orgMatchNames.length,
      newOrgs: newOrgNames.length,
    },
  };
}

async function confirmFn(
  db: Database,
  userId: string,
  input: z.infer<typeof confirmImportSchema>,
) {
  return await db.transaction(async (tx) => {
    const allRows = input.elevators;

    // Verify every referenced organization exists before any writes. Zod only
    // guarantees non-empty string shape; a stale mapping could still point at
    // a deleted org. Doing this inside the tx means a failure aborts the
    // whole import atomically.
    const referencedOrgIds = [...new Set(allRows.map((r) => r._organizationId))];
    if (referencedOrgIds.length > 0) {
      const existingOrgs = await tx
        .select({ id: organizations.id })
        .from(organizations)
        .where(inArray(organizations.id, referencedOrgIds));
      const existingOrgIds = new Set(existingOrgs.map((o) => o.id));
      const missingOrgIds = referencedOrgIds.filter(
        (id) => !existingOrgIds.has(id),
      );
      if (missingOrgIds.length > 0) {
        throw new Error(
          `Kan inte importera: ${missingOrgIds.length} organisation(er) i mappningen hittades inte. Uppdatera mappningen och försök igen.`,
        );
      }
    }

    // 1. Batch-lookup which (org, elevatorNumber) pairs already exist.
    //
    // Scoping by BOTH org and number is load-bearing: without the org filter,
    // importing "H1" against org B would match org A's existing "H1" and
    // silently reassign it to B (cross-org move bug). The (org, number) pair
    // is also protected by a composite unique index (see schema).
    //
    // Group rows by org so we can do one IN (...) lookup per org and still
    // respect the batch size for the parameter limit.
    const rowsByOrg = new Map<string, string[]>();
    for (const r of allRows) {
      const list = rowsByOrg.get(r._organizationId) ?? [];
      list.push(r.elevator_number);
      rowsByOrg.set(r._organizationId, list);
    }

    const existingMap = new Map<string, { id: string }>();
    const keyFor = (orgId: string, num: string) => `${orgId}::${num}`;

    for (const [orgId, numbers] of rowsByOrg) {
      const unique = [...new Set(numbers)];
      for (let i = 0; i < unique.length; i += 100) {
        const batch = unique.slice(i, i + 100);
        const found = await tx
          .select({
            id: elevators.id,
            elevatorNumber: elevators.elevatorNumber,
          })
          .from(elevators)
          .where(
            and(
              eq(elevators.organizationId, orgId),
              inArray(elevators.elevatorNumber, batch),
            ),
          );
        for (const e of found) {
          existingMap.set(keyFor(orgId, e.elevatorNumber), { id: e.id });
        }
      }
    }

    // Batch-lookup existing details for updates
    const existingIds = [...existingMap.values()].map((e) => e.id);
    const existingDetailsMap = new Map<string, string>();
    for (let i = 0; i < existingIds.length; i += 100) {
      const batch = existingIds.slice(i, i + 100);
      const found = await tx
        .select({ id: elevatorDetails.id, elevatorId: elevatorDetails.elevatorId })
        .from(elevatorDetails)
        .where(inArray(elevatorDetails.elevatorId, batch));
      for (const d of found) {
        existingDetailsMap.set(d.elevatorId, d.id);
      }
    }

    // Split into new vs update — keyed by (org, number) so "H1" in org A and
    // "H1" in org B are treated independently.
    const toCreate = allRows.filter(
      (r) => !existingMap.has(keyFor(r._organizationId, r.elevator_number)),
    );
    const toUpdate = allRows.filter((r) =>
      existingMap.has(keyFor(r._organizationId, r.elevator_number)),
    );

    // 2. Bulk insert new elevators
    let created = 0;
    if (toCreate.length > 0) {
      const insertedElevators = await tx
        .insert(elevators)
        .values(
          toCreate.map((r) => ({
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
            needsUpgrade: r.needs_upgrade,
            organizationId: r._organizationId,
            contactPersonName: r.contact_person_name,
            contactPersonPhone: r.contact_person_phone,
            contactPersonEmail: r.contact_person_email,
            status: "active" as const,
            createdBy: userId,
          })),
        )
        .returning({ id: elevators.id });

      // Bulk insert details for new elevators
      await tx.insert(elevatorDetails).values(
        insertedElevators.map((e, idx) => ({
          elevatorId: e.id,
          ...toDetailData(toCreate[idx]!),
        })),
      );

      // Bulk insert budgets for new elevators that have budget data
      const budgetRows = insertedElevators
        .map((e, idx) => {
          const d = toCreate[idx]!;
          if (!d.recommended_modernization_year && !d.budget_amount) return null;
          return {
            elevatorId: e.id,
            revisionYear: d.revision_year ?? new Date().getFullYear(),
            recommendedModernizationYear: d.recommended_modernization_year,
            budgetAmount:
              d.budget_amount != null ? String(d.budget_amount) : undefined,
            measures: d.measures ?? d.modernization_measures,
            warranty: d.warranty,
            createdBy: userId,
          };
        })
        .filter((r): r is NonNullable<typeof r> => r !== null);

      if (budgetRows.length > 0) {
        await tx.insert(elevatorBudgets).values(budgetRows);
      }

      // Bulk insert suggested values
      const svEntries: { category: string; value: string }[] = [];
      const svSeen = new Set<string>();
      for (const r of toCreate) {
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

      created = toCreate.length;
    }

    // 3. Update existing elevators
    let updated = 0;
    if (toUpdate.length > 0) {
      const now = new Date();
      const currentYear = new Date().getFullYear();

      for (const r of toUpdate) {
        const existing = existingMap.get(
          keyFor(r._organizationId, r.elevator_number),
        )!;

        await tx
          .update(elevators)
          .set({
            address: r.address,
            district: r.district,
            elevatorType: r.elevator_type,
            manufacturer: r.manufacturer,
            buildYear: r.build_year,
            inspectionAuthority: r.inspection_authority,
            inspectionMonth: r.inspection_month,
            maintenanceCompany: r.maintenance_company,
            modernizationYear: r.modernization_year,
            needsUpgrade: r.needs_upgrade,
            organizationId: r._organizationId,
            contactPersonName: r.contact_person_name,
            contactPersonPhone: r.contact_person_phone,
            contactPersonEmail: r.contact_person_email,
            lastUpdatedAt: now,
            lastUpdatedBy: userId,
          })
          .where(eq(elevators.id, existing.id));

        const detailData = toDetailData(r);
        const existingDetailId = existingDetailsMap.get(existing.id);
        if (existingDetailId) {
          await tx
            .update(elevatorDetails)
            .set(detailData)
            .where(eq(elevatorDetails.id, existingDetailId));
        } else {
          await tx
            .insert(elevatorDetails)
            .values({ elevatorId: existing.id, ...detailData });
        }

        if (r.recommended_modernization_year || r.budget_amount) {
          await tx.insert(elevatorBudgets).values({
            elevatorId: existing.id,
            revisionYear: r.revision_year ?? currentYear,
            recommendedModernizationYear: r.recommended_modernization_year,
            budgetAmount:
              r.budget_amount != null ? String(r.budget_amount) : undefined,
            measures: r.measures ?? r.modernization_measures,
            warranty: r.warranty,
            createdBy: userId,
          });
        }

        updated++;
      }
    }

    const perOrgCounts: Record<string, { orgName: string; created: number; updated: number }> = {};
    for (const r of toCreate) {
      const orgId = r._organizationId;
      if (!perOrgCounts[orgId]) perOrgCounts[orgId] = { orgName: "", created: 0, updated: 0 };
      perOrgCounts[orgId].created++;
    }
    for (const r of toUpdate) {
      const orgId = r._organizationId;
      if (!perOrgCounts[orgId]) perOrgCounts[orgId] = { orgName: "", created: 0, updated: 0 };
      perOrgCounts[orgId].updated++;
    }

    const touchedOrgIds = Object.keys(perOrgCounts);
    if (touchedOrgIds.length > 0) {
      const orgRows = await tx
        .select({ id: organizations.id, name: organizations.name })
        .from(organizations)
        .where(inArray(organizations.id, touchedOrgIds));
      for (const o of orgRows) {
        if (perOrgCounts[o.id]) perOrgCounts[o.id]!.orgName = o.name;
      }
    }

    return { created, updated, perOrgCounts };
  });
}

// ---------------------------------------------------------------------------
// Extract org names
// ---------------------------------------------------------------------------

const extractOrgNamesSchema = z.object({
  rows: z.array(
    z.object({
      _organisation_namn: z.string().optional(),
    }).passthrough(),
  ),
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
