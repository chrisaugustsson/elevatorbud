import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { eq, inArray } from "drizzle-orm";
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

const confirmImportSchema = z.object({
  elevators: z.array(
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
      has_emergency_phone: z.boolean().nullish(),
      needs_upgrade: z.boolean().nullish(),
      status: z.enum(["active", "demolished", "arkiverad"]).optional(),
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
      emergency_phone_model: z.string().nullish(),
      emergency_phone_type: z.string().nullish(),
      emergency_phone_price: z.number().nullish(),
      comments: z.string().nullish(),
      // Budget
      revision_year: z.number().nullish(),
      recommended_modernization_year: z.string().nullish(),
      budget_amount: z.number().nullish(),
      measures: z.string().nullish(),
      modernization_measures: z.string().nullish(),
      warranty: z.boolean().nullish(),
      // Org mapping
      _organisation_namn: z.string().optional(),
      _source_row: z.number().optional(),
    }),
  ),
  existingOrgMatchNames: z.array(z.string()),
  existingOrgMatchIds: z.array(z.string()),
  newOrgNames: z.array(z.string()),
  adminEmail: z.string().optional(),
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
    emergencyPhoneModel: data.emergency_phone_model,
    emergencyPhoneType: data.emergency_phone_type,
    emergencyPhonePrice:
      data.emergency_phone_price != null
        ? String(data.emergency_phone_price)
        : undefined,
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

  // Match org names (case-insensitive)
  const orgMatchNames: string[] = [];
  const orgMatchIds: string[] = [];
  const newOrgNames: string[] = [];

  if (input.orgNames.length > 0) {
    const allOrgs = await db.query.organizations.findMany();
    const orgMap = new Map(allOrgs.map((o) => [o.name.toLowerCase(), o]));

    for (const name of input.orgNames) {
      const match = orgMap.get(name.toLowerCase());
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
  // 1. Create new organizations
  const orgIdMap = new Map<string, string>();
  for (let i = 0; i < input.existingOrgMatchNames.length; i++) {
    orgIdMap.set(
      input.existingOrgMatchNames[i]!.toLowerCase(),
      input.existingOrgMatchIds[i]!,
    );
  }

  const orgsCreated: string[] = [];
  for (const name of input.newOrgNames) {
    const [org] = await db
      .insert(organizations)
      .values({ name })
      .returning();
    orgIdMap.set(name.toLowerCase(), org.id);
    orgsCreated.push(name);
  }

  // 2. Resolve orgs and split into valid / errored
  const errors: { elevator_number: string; error: string }[] = [];
  type ResolvedRow = {
    data: z.infer<typeof confirmImportSchema>["elevators"][number];
    organizationId: string;
    dbStatus: "active" | "demolished" | "archived";
  };
  const validRows: ResolvedRow[] = [];

  for (const data of input.elevators) {
    const orgName = (data._organisation_namn || "").toLowerCase();
    const organizationId = orgIdMap.get(orgName);
    if (!organizationId) {
      errors.push({
        elevator_number: data.elevator_number,
        error: `Organisation "${data._organisation_namn ?? ""}" hittades inte`,
      });
      continue;
    }
    const dbStatus = data.status === "arkiverad" ? "archived" as const : (data.status ?? "active");
    validRows.push({ data, organizationId, dbStatus });
  }

  // 3. Batch-lookup which elevator numbers already exist
  const elevatorNumbers = validRows.map((r) => r.data.elevator_number);
  const existingMap = new Map<string, { id: string }>();

  for (let i = 0; i < elevatorNumbers.length; i += 100) {
    const batch = elevatorNumbers.slice(i, i + 100);
    const found = await db
      .select({ id: elevators.id, elevatorNumber: elevators.elevatorNumber })
      .from(elevators)
      .where(inArray(elevators.elevatorNumber, batch));
    for (const e of found) {
      existingMap.set(e.elevatorNumber, { id: e.id });
    }
  }

  // Also batch-lookup existing details for updates
  const existingIds = [...existingMap.values()].map((e) => e.id);
  const existingDetailsMap = new Map<string, string>();
  for (let i = 0; i < existingIds.length; i += 100) {
    const batch = existingIds.slice(i, i + 100);
    const found = await db
      .select({ id: elevatorDetails.id, elevatorId: elevatorDetails.elevatorId })
      .from(elevatorDetails)
      .where(inArray(elevatorDetails.elevatorId, batch));
    for (const d of found) {
      existingDetailsMap.set(d.elevatorId, d.id);
    }
  }

  // Split into new vs update
  const toCreate = validRows.filter((r) => !existingMap.has(r.data.elevator_number));
  const toUpdate = validRows.filter((r) => existingMap.has(r.data.elevator_number));

  // 4. Bulk insert new elevators
  let created = 0;
  if (toCreate.length > 0) {
    const insertedElevators = await db
      .insert(elevators)
      .values(
        toCreate.map((r) => ({
          elevatorNumber: r.data.elevator_number,
          address: r.data.address,
          elevatorClassification: r.data.elevator_classification,
          district: r.data.district,
          elevatorType: r.data.elevator_type,
          manufacturer: r.data.manufacturer,
          buildYear: r.data.build_year,
          inspectionAuthority: r.data.inspection_authority,
          inspectionMonth: r.data.inspection_month,
          maintenanceCompany: r.data.maintenance_company,
          modernizationYear: r.data.modernization_year,
          hasEmergencyPhone: r.data.has_emergency_phone,
          needsUpgrade: r.data.needs_upgrade,
          organizationId: r.organizationId,
          status: r.dbStatus,
          createdBy: userId,
        })),
      )
      .returning({ id: elevators.id });

    // Bulk insert details for new elevators
    await db.insert(elevatorDetails).values(
      insertedElevators.map((e, idx) => ({
        elevatorId: e.id,
        ...toDetailData(toCreate[idx]!.data),
      })),
    );

    // Bulk insert budgets for new elevators that have budget data
    const budgetRows = insertedElevators
      .map((e, idx) => {
        const d = toCreate[idx]!.data;
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
      await db.insert(elevatorBudgets).values(budgetRows);
    }

    // Bulk insert suggested values
    const svEntries: { category: string; value: string }[] = [];
    const svSeen = new Set<string>();
    for (const r of toCreate) {
      const pairs: [string, string | null | undefined][] = [
        ["elevator_type", r.data.elevator_type],
        ["manufacturer", r.data.manufacturer],
        ["district", r.data.district],
        ["maintenance_company", r.data.maintenance_company],
        ["inspection_authority", r.data.inspection_authority],
        ["elevator_classification", r.data.elevator_classification],
      ];
      for (const [cat, val] of pairs) {
        if (val && !svSeen.has(`${cat}:${val}`)) {
          svSeen.add(`${cat}:${val}`);
          svEntries.push({ category: cat, value: val });
        }
      }
    }
    if (svEntries.length > 0) {
      await db
        .insert(suggestedValues)
        .values(svEntries.map((e) => ({ ...e, active: true })))
        .onConflictDoNothing();
    }

    created = toCreate.length;
  }

  // 5. Update existing elevators (parallel per row)
  let updated = 0;
  if (toUpdate.length > 0) {
    const now = new Date();
    const currentYear = new Date().getFullYear();

    await Promise.all(
      toUpdate.map(async (r) => {
        try {
          const existing = existingMap.get(r.data.elevator_number)!;

          // Update core elevator
          await db
            .update(elevators)
            .set({
              address: r.data.address,
              district: r.data.district,
              elevatorType: r.data.elevator_type,
              manufacturer: r.data.manufacturer,
              buildYear: r.data.build_year,
              inspectionAuthority: r.data.inspection_authority,
              inspectionMonth: r.data.inspection_month,
              maintenanceCompany: r.data.maintenance_company,
              modernizationYear: r.data.modernization_year,
              hasEmergencyPhone: r.data.has_emergency_phone,
              needsUpgrade: r.data.needs_upgrade,
              organizationId: r.organizationId,
              lastUpdatedAt: now,
              lastUpdatedBy: userId,
            })
            .where(eq(elevators.id, existing.id));

          // Upsert details
          const detailData = toDetailData(r.data);
          const existingDetailId = existingDetailsMap.get(existing.id);
          if (existingDetailId) {
            await db
              .update(elevatorDetails)
              .set(detailData)
              .where(eq(elevatorDetails.id, existingDetailId));
          } else {
            await db
              .insert(elevatorDetails)
              .values({ elevatorId: existing.id, ...detailData });
          }

          // Add budget if present
          if (r.data.recommended_modernization_year || r.data.budget_amount) {
            await db.insert(elevatorBudgets).values({
              elevatorId: existing.id,
              revisionYear: r.data.revision_year ?? currentYear,
              recommendedModernizationYear: r.data.recommended_modernization_year,
              budgetAmount:
                r.data.budget_amount != null
                  ? String(r.data.budget_amount)
                  : undefined,
              measures: r.data.measures ?? r.data.modernization_measures,
              warranty: r.data.warranty,
              createdBy: userId,
            });
          }

          updated++;
        } catch (e) {
          errors.push({
            elevator_number: r.data.elevator_number,
            error: e instanceof Error ? e.message : "Okänt fel",
          });
        }
      }),
    );
  }

  const orgsCreatedIds = orgsCreated.map((name) => orgIdMap.get(name.toLowerCase())!);
  return { created, updated, errors, orgsCreated, orgsCreatedIds };
}

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

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
