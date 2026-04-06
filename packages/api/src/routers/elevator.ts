import { z } from "zod";
import { eq, and, or, ilike, inArray, gte, lte, ne, sql, desc, asc } from "drizzle-orm";
import type { Database } from "@elevatorbud/db";
import {
  elevators,
  elevatorDetails,
  elevatorBudgets,
  organizations,
  suggestedValues,
} from "@elevatorbud/db/schema";

const NOT_MODERNIZED = "Ej ombyggd";

const CATEGORY_FIELDS = [
  "elevator_type",
  "manufacturer",
  "district",
  "maintenance_company",
  "inspection_authority",
  "elevator_classification",
  "door_type",
  "dispatch_mode",
  "drive_system",
  "machine_placement",
  "measures",
] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function autoAddSuggestedValues(
  db: Database,
  fields: Record<string, unknown>,
) {
  for (const category of CATEGORY_FIELDS) {
    const value = fields[category];
    if (typeof value !== "string" || value === "") continue;

    await db
      .insert(suggestedValues)
      .values({ category, value, active: true })
      .onConflictDoNothing();
  }
}

export const filterSchema = z.object({
  search: z.string().optional(),
  district: z.array(z.string()).optional(),
  elevatorType: z.array(z.string()).optional(),
  manufacturer: z.array(z.string()).optional(),
  maintenanceCompany: z.array(z.string()).optional(),
  inspectionAuthority: z.array(z.string()).optional(),
  buildYearMin: z.number().optional(),
  buildYearMax: z.number().optional(),
  modernized: z.boolean().optional(),
  status: z.enum(["active", "demolished", "archived", "all"]).optional(),
  organizationId: z.string().uuid().optional(),
});

type FilterInput = z.infer<typeof filterSchema>;

function buildWhereConditions(
  filters: FilterInput,
  orgScope: string | undefined,
) {
  const conditions = [];

  if (orgScope) {
    conditions.push(eq(elevators.organizationId, orgScope));
  }

  const status = filters.status ?? "active";
  if (status !== "all") {
    conditions.push(eq(elevators.status, status));
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    conditions.push(
      or(
        ilike(elevators.elevatorNumber, s),
        ilike(elevators.address, s),
        ilike(elevators.district, s),
        ilike(elevators.manufacturer, s),
        ilike(elevators.elevatorType, s),
      ),
    );
  }

  if (filters.district?.length) {
    conditions.push(inArray(elevators.district, filters.district));
  }
  if (filters.elevatorType?.length) {
    conditions.push(inArray(elevators.elevatorType, filters.elevatorType));
  }
  if (filters.manufacturer?.length) {
    conditions.push(inArray(elevators.manufacturer, filters.manufacturer));
  }
  if (filters.maintenanceCompany?.length) {
    conditions.push(
      inArray(elevators.maintenanceCompany, filters.maintenanceCompany),
    );
  }
  if (filters.inspectionAuthority?.length) {
    conditions.push(
      inArray(elevators.inspectionAuthority, filters.inspectionAuthority),
    );
  }
  if (filters.buildYearMin !== undefined) {
    conditions.push(gte(elevators.buildYear, filters.buildYearMin));
  }
  if (filters.buildYearMax !== undefined) {
    conditions.push(lte(elevators.buildYear, filters.buildYearMax));
  }
  if (filters.modernized === true) {
    conditions.push(sql`${elevators.modernizationYear} IS NOT NULL`);
    conditions.push(ne(elevators.modernizationYear, NOT_MODERNIZED));
  } else if (filters.modernized === false) {
    conditions.push(
      or(
        sql`${elevators.modernizationYear} IS NULL`,
        eq(elevators.modernizationYear, NOT_MODERNIZED),
      ),
    );
  }

  return conditions.length ? and(...conditions) : undefined;
}

// ─── Detail/Budget field splitting ───────────────────────────────────────────

const DETAIL_KEYS = new Set([
  "speed",
  "liftHeight",
  "loadCapacity",
  "floorCount",
  "doorCount",
  "doorType",
  "passthrough",
  "dispatchMode",
  "cabSize",
  "doorOpening",
  "doorCarrier",
  "doorMachine",
  "driveSystem",
  "suspension",
  "machinePlacement",
  "machineType",
  "controlSystemType",
  "shaftLighting",
  "emergencyPhoneModel",
  "emergencyPhoneType",
  "emergencyPhonePrice",
  "comments",
]);

const BUDGET_KEYS = new Set([
  "revisionYear",
  "recommendedModernizationYear",
  "budgetAmount",
  "measures",
  "warranty",
]);

function splitFields(fields: Record<string, unknown>) {
  const core: Record<string, unknown> = {};
  const details: Record<string, unknown> = {};
  const budget: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    if (DETAIL_KEYS.has(key)) details[key] = value;
    else if (BUDGET_KEYS.has(key)) budget[key] = value;
    else core[key] = value;
  }

  return { core, details, budget };
}

// ─── Zod Schemas for Inputs ─────────────────────────────────────────────────

export const createInput = z.object({
  // Core
  elevatorNumber: z.string().min(1),
  address: z.string().optional(),
  elevatorClassification: z.string().optional(),
  district: z.string().optional(),
  elevatorType: z.string().optional(),
  manufacturer: z.string().optional(),
  buildYear: z.number().optional(),
  inspectionAuthority: z.string().optional(),
  inspectionMonth: z.string().optional(),
  maintenanceCompany: z.string().optional(),
  modernizationYear: z.string().optional(),
  hasEmergencyPhone: z.boolean().optional(),
  needsUpgrade: z.boolean().optional(),
  organizationId: z.string().uuid(),
  // Details
  speed: z.string().optional(),
  liftHeight: z.string().optional(),
  loadCapacity: z.string().optional(),
  floorCount: z.number().optional(),
  doorCount: z.number().optional(),
  doorType: z.string().optional(),
  passthrough: z.boolean().optional(),
  dispatchMode: z.string().optional(),
  cabSize: z.string().optional(),
  doorOpening: z.string().optional(),
  doorCarrier: z.string().optional(),
  doorMachine: z.string().optional(),
  driveSystem: z.string().optional(),
  suspension: z.string().optional(),
  machinePlacement: z.string().optional(),
  machineType: z.string().optional(),
  controlSystemType: z.string().optional(),
  shaftLighting: z.string().optional(),
  emergencyPhoneModel: z.string().optional(),
  emergencyPhoneType: z.string().optional(),
  emergencyPhonePrice: z.number().optional(),
  comments: z.string().optional(),
  // Budget
  revisionYear: z.number(),
  recommendedModernizationYear: z.string().optional(),
  budgetAmount: z.number().optional(),
  measures: z.string().optional(),
  warranty: z.boolean().optional(),
});

export const updateInput = z.object({
  id: z.string().uuid(),
  // Core
  elevatorNumber: z.string().optional(),
  address: z.string().optional(),
  elevatorClassification: z.string().optional(),
  district: z.string().optional(),
  elevatorType: z.string().optional(),
  manufacturer: z.string().optional(),
  buildYear: z.number().optional(),
  inspectionAuthority: z.string().optional(),
  inspectionMonth: z.string().optional(),
  maintenanceCompany: z.string().optional(),
  modernizationYear: z.string().optional(),
  hasEmergencyPhone: z.boolean().optional(),
  needsUpgrade: z.boolean().optional(),
  organizationId: z.string().uuid().optional(),
  // Details
  speed: z.string().optional(),
  liftHeight: z.string().optional(),
  loadCapacity: z.string().optional(),
  floorCount: z.number().optional(),
  doorCount: z.number().optional(),
  doorType: z.string().optional(),
  passthrough: z.boolean().optional(),
  dispatchMode: z.string().optional(),
  cabSize: z.string().optional(),
  doorOpening: z.string().optional(),
  doorCarrier: z.string().optional(),
  doorMachine: z.string().optional(),
  driveSystem: z.string().optional(),
  suspension: z.string().optional(),
  machinePlacement: z.string().optional(),
  machineType: z.string().optional(),
  controlSystemType: z.string().optional(),
  shaftLighting: z.string().optional(),
  emergencyPhoneModel: z.string().optional(),
  emergencyPhoneType: z.string().optional(),
  emergencyPhonePrice: z.number().optional(),
  comments: z.string().optional(),
  // Budget
  revisionYear: z.number().optional(),
  recommendedModernizationYear: z.string().optional(),
  budgetAmount: z.number().optional(),
  measures: z.string().optional(),
  warranty: z.boolean().optional(),
});

// ─── Functions ──────────────────────────────────────────────────────────────

export async function get(db: Database, id: string) {
  const elevator = await db.query.elevators.findFirst({
    where: eq(elevators.id, id),
    with: { organization: true },
  });
  if (!elevator) {
    throw new Error("Hissen hittades inte");
  }
  return elevator;
}

export async function getDetails(db: Database, elevatorId: string) {
  const elevator = await db.query.elevators.findFirst({
    where: eq(elevators.id, elevatorId),
    columns: { organizationId: true },
  });
  if (!elevator) return null;

  return db.query.elevatorDetails.findFirst({
    where: eq(elevatorDetails.elevatorId, elevatorId),
  });
}

export async function getLatestBudget(db: Database, elevatorId: string) {
  const elevator = await db.query.elevators.findFirst({
    where: eq(elevators.id, elevatorId),
    columns: { organizationId: true },
  });
  if (!elevator) return null;

  return db.query.elevatorBudgets.findFirst({
    where: eq(elevatorBudgets.elevatorId, elevatorId),
    orderBy: [desc(elevatorBudgets.createdAt)],
  });
}

export async function checkElevatorNumber(
  db: Database,
  elevatorNumber: string,
  orgScope: string | undefined,
  excludeId?: string,
) {
  if (!elevatorNumber) return { exists: false };
  const conditions = [eq(elevators.elevatorNumber, elevatorNumber)];
  if (orgScope) conditions.push(eq(elevators.organizationId, orgScope));

  const existing = await db.query.elevators.findFirst({
    where: and(...conditions),
  });
  if (!existing) return { exists: false };
  if (excludeId && existing.id === excludeId) return { exists: false };
  return { exists: true };
}

export async function search(
  db: Database,
  searchTerm: string,
  orgScope: string | undefined,
) {
  if (!searchTerm.trim()) return [];
  const s = `%${searchTerm}%`;

  const conditions = [
    eq(elevators.status, "active"),
    or(
      ilike(elevators.elevatorNumber, s),
      ilike(elevators.address, s),
    ),
  ];
  if (orgScope) {
    conditions.push(eq(elevators.organizationId, orgScope));
  }

  const results = await db
    .select({
      id: elevators.id,
      elevatorNumber: elevators.elevatorNumber,
      address: elevators.address,
      organizationName: organizations.name,
    })
    .from(elevators)
    .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
    .where(and(...conditions))
    .limit(20);

  return results;
}

export async function list(
  db: Database,
  filters: FilterInput & {
    page?: number;
    pageSize?: number;
    sortBy?: "elevatorNumber" | "address" | "district" | "elevatorType" | "manufacturer" | "buildYear" | "maintenanceCompany" | "inspectionMonth";
    sortOrder?: "asc" | "desc";
  },
  orgScope: string | undefined,
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const sortBy = filters.sortBy ?? "elevatorNumber";
  const sortOrder = filters.sortOrder ?? "asc";
  const where = buildWhereConditions(filters, orgScope);
  const offset = (page - 1) * pageSize;

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: elevators.id,
        elevatorNumber: elevators.elevatorNumber,
        address: elevators.address,
        elevatorClassification: elevators.elevatorClassification,
        district: elevators.district,
        elevatorType: elevators.elevatorType,
        manufacturer: elevators.manufacturer,
        buildYear: elevators.buildYear,
        inspectionMonth: elevators.inspectionMonth,
        maintenanceCompany: elevators.maintenanceCompany,
        modernizationYear: elevators.modernizationYear,
        hasEmergencyPhone: elevators.hasEmergencyPhone,
        needsUpgrade: elevators.needsUpgrade,
        status: elevators.status,
        organizationId: elevators.organizationId,
        organizationName: organizations.name,
      })
      .from(elevators)
      .leftJoin(
        organizations,
        eq(elevators.organizationId, organizations.id),
      )
      .where(where)
      .orderBy((() => {
        const columnMap = {
          elevatorNumber: elevators.elevatorNumber,
          address: elevators.address,
          district: elevators.district,
          elevatorType: elevators.elevatorType,
          manufacturer: elevators.manufacturer,
          buildYear: elevators.buildYear,
          maintenanceCompany: elevators.maintenanceCompany,
          inspectionMonth: elevators.inspectionMonth,
        } as const;
        const col = columnMap[sortBy];
        return sortOrder === "desc" ? desc(col) : asc(col);
      })())
      .limit(pageSize)
      .offset(offset),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(elevators)
      .where(where),
  ]);

  return {
    items,
    total: countResult[0]?.count ?? 0,
    page,
    pageSize,
  };
}

export async function exportData(
  db: Database,
  filters: FilterInput,
  orgScope: string | undefined,
) {
  const where = buildWhereConditions(filters, orgScope);

  return db
    .select({
      id: elevators.id,
      elevatorNumber: elevators.elevatorNumber,
      address: elevators.address,
      elevatorClassification: elevators.elevatorClassification,
      district: elevators.district,
      elevatorType: elevators.elevatorType,
      manufacturer: elevators.manufacturer,
      buildYear: elevators.buildYear,
      inspectionAuthority: elevators.inspectionAuthority,
      inspectionMonth: elevators.inspectionMonth,
      maintenanceCompany: elevators.maintenanceCompany,
      modernizationYear: elevators.modernizationYear,
      hasEmergencyPhone: elevators.hasEmergencyPhone,
      needsUpgrade: elevators.needsUpgrade,
      status: elevators.status,
      organizationName: organizations.name,
    })
    .from(elevators)
    .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
    .where(where)
    .orderBy(elevators.elevatorNumber);
}

export async function create(
  db: Database,
  input: z.infer<typeof createInput>,
  userId: string,
) {
  // Check for duplicate elevator number
  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.elevatorNumber, input.elevatorNumber),
  });
  if (existing) {
    throw new Error(
      `Hissnummer ${input.elevatorNumber} finns redan i registret`,
    );
  }

  await autoAddSuggestedValues(db, input);
  const { core, details, budget } = splitFields(input);

  // Insert core elevator
  const [elevator] = await db
    .insert(elevators)
    .values({
      ...core,
      elevatorNumber: input.elevatorNumber,
      organizationId: input.organizationId,
      status: "active",
      createdBy: userId,
    })
    .returning();

  // Insert details
  await db.insert(elevatorDetails).values({
    elevatorId: elevator.id,
    ...details,
  });

  // Insert budget if relevant fields present
  if (budget.recommendedModernizationYear || budget.budgetAmount) {
    await db.insert(elevatorBudgets).values({
      elevatorId: elevator.id,
      revisionYear: input.revisionYear,
      recommendedModernizationYear:
        budget.recommendedModernizationYear as string | undefined,
      budgetAmount: budget.budgetAmount as number | undefined,
      measures: budget.measures as string | undefined,
      warranty: budget.warranty as boolean | undefined,
      createdBy: userId,
    });
  }

  return elevator;
}

export async function update(
  db: Database,
  input: z.infer<typeof updateInput>,
  userId: string,
) {
  const { id, ...fields } = input;

  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.id, id),
  });
  if (!existing) {
    throw new Error("Hissen hittades inte");
  }

  // Check duplicate elevator number
  if (
    fields.elevatorNumber &&
    fields.elevatorNumber !== existing.elevatorNumber
  ) {
    const duplicate = await db.query.elevators.findFirst({
      where: eq(elevators.elevatorNumber, fields.elevatorNumber),
    });
    if (duplicate) {
      throw new Error(
        `Hissnummer ${fields.elevatorNumber} finns redan i registret`,
      );
    }
  }

  await autoAddSuggestedValues(db, fields);
  const { core, details, budget } = splitFields(fields);

  // Update core
  if (Object.keys(core).length > 0) {
    await db
      .update(elevators)
      .set({ ...core, lastUpdatedBy: userId, lastUpdatedAt: new Date() })
      .where(eq(elevators.id, id));
  }

  // Upsert details
  if (Object.keys(details).length > 0) {
    const existingDetails = await db.query.elevatorDetails.findFirst({
      where: eq(elevatorDetails.elevatorId, id),
    });
    if (existingDetails) {
      await db
        .update(elevatorDetails)
        .set(details)
        .where(eq(elevatorDetails.id, existingDetails.id));
    } else {
      await db
        .insert(elevatorDetails)
        .values({ elevatorId: id, ...details });
    }
  }

  // New budget entry if budget fields changed
  if (
    budget.recommendedModernizationYear !== undefined ||
    budget.budgetAmount !== undefined ||
    budget.measures !== undefined
  ) {
    await db.insert(elevatorBudgets).values({
      elevatorId: id,
      revisionYear:
        (budget.revisionYear as number) ?? new Date().getFullYear(),
      recommendedModernizationYear:
        budget.recommendedModernizationYear as string | undefined,
      budgetAmount: budget.budgetAmount as number | undefined,
      measures: budget.measures as string | undefined,
      warranty: budget.warranty as boolean | undefined,
      createdBy: userId,
    });
  }

  return { id };
}

export async function archive(
  db: Database,
  id: string,
  status: "demolished" | "archived",
  userId: string,
) {
  const existing = await db.query.elevators.findFirst({
    where: eq(elevators.id, id),
  });
  if (!existing) {
    throw new Error("Hissen hittades inte");
  }

  await db
    .update(elevators)
    .set({
      status,
      lastUpdatedBy: userId,
      lastUpdatedAt: new Date(),
    })
    .where(eq(elevators.id, id));

  return { id };
}
