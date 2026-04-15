import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
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
import { adminMiddleware } from "./auth";

// ---------------------------------------------------------------------------
// Constants & helpers (inlined from packages/api/src/routers/elevator.ts)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

const filterSchema = z.object({
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

const createInput = z.object({
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

const updateInput = z.object({
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

// ---------------------------------------------------------------------------
// Detail/Budget field splitting
// ---------------------------------------------------------------------------

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

const NUMERIC_FIELDS = new Set(["emergencyPhonePrice", "budgetAmount"]);

function splitFields(fields: Record<string, unknown>) {
  const core: Record<string, unknown> = {};
  const details: Record<string, unknown> = {};
  const budget: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(fields)) {
    const stored =
      NUMERIC_FIELDS.has(key) && typeof value === "number"
        ? String(value)
        : value;

    if (DETAIL_KEYS.has(key)) details[key] = stored;
    else if (BUDGET_KEYS.has(key)) budget[key] = stored;
    else core[key] = stored;
  }

  return { core, details, budget };
}

// ---------------------------------------------------------------------------
// Where-condition builder for list/export
// Admin: organizationId is an optional FILTER passed directly from input.
// ---------------------------------------------------------------------------

function buildWhereConditions(
  filters: FilterInput,
  organizationId: string | undefined,
) {
  const conditions = [];

  if (organizationId) {
    conditions.push(eq(elevators.organizationId, organizationId));
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

// ---------------------------------------------------------------------------
// Inlined query functions — no org-scoping security boundary for admin.
// ---------------------------------------------------------------------------

async function getElevatorFn(db: Database, id: string) {
  const elevator = await db.query.elevators.findFirst({
    where: eq(elevators.id, id),
    with: { organization: true },
  });
  if (!elevator) {
    throw new Error("Hissen hittades inte");
  }
  return elevator;
}

async function getDetailsFn(db: Database, elevatorId: string) {
  return db.query.elevatorDetails.findFirst({
    where: eq(elevatorDetails.elevatorId, elevatorId),
  });
}

async function getLatestBudgetFn(db: Database, elevatorId: string) {
  return db.query.elevatorBudgets.findFirst({
    where: eq(elevatorBudgets.elevatorId, elevatorId),
    orderBy: [desc(elevatorBudgets.createdAt)],
  });
}

async function checkElevatorNumberFn(
  db: Database,
  elevatorNumber: string,
  organizationId: string | undefined,
  excludeId?: string,
) {
  // Uniqueness is scoped to (organizationId, elevatorNumber) per the
  // elevators_organization_id_elevator_number_unique composite index. A
  // cross-org check would flag "H1" in org B as a duplicate of an unrelated
  // "H1" in org A, which would not actually conflict on save.
  if (!elevatorNumber || !organizationId) return { exists: false };
  const existing = await db.query.elevators.findFirst({
    where: and(
      eq(elevators.elevatorNumber, elevatorNumber),
      eq(elevators.organizationId, organizationId),
    ),
  });
  if (!existing) return { exists: false };
  if (excludeId && existing.id === excludeId) return { exists: false };
  return { exists: true };
}

async function searchFn(db: Database, searchTerm: string) {
  if (!searchTerm.trim()) return [];
  const s = `%${searchTerm}%`;

  const conditions = [
    eq(elevators.status, "active"),
    or(
      ilike(elevators.elevatorNumber, s),
      ilike(elevators.address, s),
    ),
  ];

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

async function listFn(
  db: Database,
  filters: FilterInput & {
    page?: number;
    pageSize?: number;
    sortBy?: "elevatorNumber" | "address" | "district" | "elevatorType" | "manufacturer" | "buildYear" | "maintenanceCompany" | "inspectionMonth" | "recommendedModernizationYear" | "budgetAmount";
    sortOrder?: "asc" | "desc";
  },
) {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;
  const sortBy = filters.sortBy ?? "elevatorNumber";
  const sortOrder = filters.sortOrder ?? "asc";
  const where = buildWhereConditions(filters, filters.organizationId);
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
        recommendedModernizationYear: sql<string | null>`(
          SELECT recommended_modernization_year
          FROM elevator_budgets
          WHERE elevator_id = ${elevators.id}
          ORDER BY created_at DESC
          LIMIT 1
        )`,
        budgetAmount: sql<number | null>`(
          SELECT budget_amount
          FROM elevator_budgets
          WHERE elevator_id = ${elevators.id}
          ORDER BY created_at DESC
          LIMIT 1
        )`,
      })
      .from(elevators)
      .leftJoin(
        organizations,
        eq(elevators.organizationId, organizations.id),
      )
      .where(where)
      .orderBy((() => {
        const dir = sortOrder === "desc" ? sql`DESC` : sql`ASC`;
        if (sortBy === "recommendedModernizationYear") {
          return sql`(
            SELECT recommended_modernization_year::int
            FROM elevator_budgets
            WHERE elevator_id = ${elevators.id}
              AND recommended_modernization_year ~ '^[0-9]+$'
            ORDER BY created_at DESC
            LIMIT 1
          ) ${dir} NULLS LAST`;
        }
        if (sortBy === "budgetAmount") {
          return sql`(
            SELECT budget_amount
            FROM elevator_budgets
            WHERE elevator_id = ${elevators.id}
            ORDER BY created_at DESC
            LIMIT 1
          ) ${dir} NULLS LAST`;
        }
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
        const col = columnMap[sortBy as keyof typeof columnMap];
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

async function exportDataFn(db: Database, filters: FilterInput) {
  const where = buildWhereConditions(filters, filters.organizationId);

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

async function createFn(
  db: Database,
  input: z.infer<typeof createInput>,
  userId: string,
) {
  // Check for duplicate elevator number within the organization
  const dupConditions = [
    eq(elevators.elevatorNumber, input.elevatorNumber),
    eq(elevators.organizationId, input.organizationId),
  ];
  const existing = await db.query.elevators.findFirst({
    where: and(...dupConditions),
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
      budgetAmount:
        budget.budgetAmount != null
          ? String(budget.budgetAmount)
          : undefined,
      measures: budget.measures as string | undefined,
      warranty: budget.warranty as boolean | undefined,
      createdBy: userId,
    });
  }

  return elevator;
}

async function updateFn(
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

  // Check duplicate elevator number within the organization
  if (
    fields.elevatorNumber &&
    fields.elevatorNumber !== existing.elevatorNumber
  ) {
    const dupConditions = [
      eq(elevators.elevatorNumber, fields.elevatorNumber),
      eq(elevators.organizationId, fields.organizationId ?? existing.organizationId),
    ];
    const duplicate = await db.query.elevators.findFirst({
      where: and(...dupConditions),
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
      budgetAmount:
        budget.budgetAmount != null
          ? String(budget.budgetAmount)
          : undefined,
      measures: budget.measures as string | undefined,
      warranty: budget.warranty as boolean | undefined,
      createdBy: userId,
    });
  }

  return { id };
}

async function archiveFn(
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

// ---------------------------------------------------------------------------
// Server functions
// ---------------------------------------------------------------------------

export const getElevator = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return getElevatorFn(context.db, data.id);
  });

export const elevatorOptions = (id: string) =>
  queryOptions({
    queryKey: ["elevator", id],
    queryFn: () => getElevator({ data: { id } }),
  });

export const getElevatorDetails = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ elevatorId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return getDetailsFn(context.db, data.elevatorId);
  });

export const elevatorDetailsOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "details", elevatorId],
    queryFn: () => getElevatorDetails({ data: { elevatorId } }),
  });

export const getLatestBudget = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ elevatorId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return getLatestBudgetFn(context.db, data.elevatorId);
  });

export const elevatorBudgetOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "budget", elevatorId],
    queryFn: () => getLatestBudget({ data: { elevatorId } }),
  });

export const searchElevators = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ search: z.string() }))
  .handler(async ({ data, context }) => {
    return searchFn(context.db, data.search);
  });

export const searchElevatorsOptions = (search: string) =>
  queryOptions({
    queryKey: ["elevator", "search", search],
    queryFn: () => searchElevators({ data: { search } }),
  });

export const listElevators = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    filterSchema.extend({
      page: z.number().optional(),
      pageSize: z.number().optional(),
      sortBy: z
        .enum([
          "elevatorNumber",
          "address",
          "district",
          "elevatorType",
          "manufacturer",
          "buildYear",
          "maintenanceCompany",
          "inspectionMonth",
          "recommendedModernizationYear",
          "budgetAmount",
        ])
        .optional(),
      sortOrder: z.enum(["asc", "desc"]).optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    return listFn(context.db, data);
  });

export const listElevatorsOptions = (
  filters: z.infer<typeof filterSchema> & {
    page?: number;
    pageSize?: number;
    sortBy?: "elevatorNumber" | "address" | "district" | "elevatorType" | "manufacturer" | "buildYear" | "maintenanceCompany" | "inspectionMonth" | "recommendedModernizationYear" | "budgetAmount";
    sortOrder?: "asc" | "desc";
  },
) =>
  queryOptions({
    queryKey: ["elevator", "list", filters],
    queryFn: () => listElevators({ data: filters }),
  });

export const exportElevatorData = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(filterSchema)
  .handler(async ({ data, context }) => {
    return exportDataFn(context.db, data);
  });

export const exportElevatorDataOptions = (
  filters: z.infer<typeof filterSchema>,
) =>
  queryOptions({
    queryKey: ["elevator", "export", filters],
    queryFn: () => exportElevatorData({ data: filters }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const checkElevatorNumber = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      elevatorNumber: z.string(),
      organizationId: z.string().uuid().optional(),
      excludeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    return checkElevatorNumberFn(
      context.db,
      data.elevatorNumber,
      data.organizationId,
      data.excludeId,
    );
  });

export const createElevator = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(createInput)
  .handler(async ({ data, context }) => {
    return createFn(context.db, data, context.user.id);
  });

export const updateElevator = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(updateInput)
  .handler(async ({ data, context }) => {
    return updateFn(context.db, data, context.user.id);
  });

export const archiveElevator = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      status: z.enum(["demolished", "archived"]),
    }),
  )
  .handler(async ({ data, context }) => {
    return archiveFn(context.db, data.id, data.status, context.user.id);
  });
