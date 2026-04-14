import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import {
  eq,
  and,
  or,
  ilike,
  inArray,
  gte,
  lte,
  ne,
  sql,
  desc,
  asc,
} from "drizzle-orm";
import {
  elevators,
  elevatorDetails,
  elevatorBudgets,
  organizations,
} from "@elevatorbud/db/schema";
import { authMiddleware } from "./auth";

const NOT_MODERNIZED = "Ej ombyggd";

// ---------------------------------------------------------------------------
// Filter schema (client version — no organizationId, always user's org)
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
});

type FilterInput = z.infer<typeof filterSchema>;

function buildWhereConditions(filters: FilterInput, orgId: string) {
  const conditions = [eq(elevators.organizationId, orgId)];

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
      )!,
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
      )!,
    );
  }

  return and(...conditions);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getElevator = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];
    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.id),
        eq(elevators.organizationId, orgId),
      ),
      with: { organization: true },
    });
    if (!elevator) {
      throw new Error("Hissen hittades inte");
    }
    return elevator;
  });

export const elevatorOptions = (id: string) =>
  queryOptions({
    queryKey: ["elevator", id],
    queryFn: () => getElevator({ data: { id } }),
  });

export const getElevatorDetails = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ elevatorId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];

    // Verify elevator belongs to user's org
    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.elevatorId),
        eq(elevators.organizationId, orgId),
      ),
      columns: { organizationId: true },
    });
    if (!elevator) return null;

    return context.db.query.elevatorDetails.findFirst({
      where: eq(elevatorDetails.elevatorId, data.elevatorId),
    });
  });

export const elevatorDetailsOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "details", elevatorId],
    queryFn: () => getElevatorDetails({ data: { elevatorId } }),
  });

export const getLatestBudget = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ elevatorId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];

    // Verify elevator belongs to user's org
    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.elevatorId),
        eq(elevators.organizationId, orgId),
      ),
      columns: { organizationId: true },
    });
    if (!elevator) return null;

    return context.db.query.elevatorBudgets.findFirst({
      where: eq(elevatorBudgets.elevatorId, data.elevatorId),
      orderBy: [desc(elevatorBudgets.createdAt)],
    });
  });

export const elevatorBudgetOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "budget", elevatorId],
    queryFn: () => getLatestBudget({ data: { elevatorId } }),
  });

export const searchElevators = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(z.object({ search: z.string() }))
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];

    if (!data.search.trim()) return [];
    const s = `%${data.search}%`;

    return context.db
      .select({
        id: elevators.id,
        elevatorNumber: elevators.elevatorNumber,
        address: elevators.address,
        organizationName: organizations.name,
      })
      .from(elevators)
      .leftJoin(organizations, eq(elevators.organizationId, organizations.id))
      .where(
        and(
          eq(elevators.organizationId, orgId),
          eq(elevators.status, "active"),
          or(
            ilike(elevators.elevatorNumber, s),
            ilike(elevators.address, s),
          ),
        ),
      )
      .limit(20);
  });

export const searchElevatorsOptions = (search: string) =>
  queryOptions({
    queryKey: ["elevator", "search", search],
    queryFn: () => searchElevators({ data: { search } }),
  });

const listInputSchema = filterSchema.extend({
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
    ])
    .optional(),
  sortOrder: z.enum(["asc", "desc"]).optional(),
});

export const listElevators = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(listInputSchema)
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 50;
    const sortBy = data.sortBy ?? "elevatorNumber";
    const sortOrder = data.sortOrder ?? "asc";
    const where = buildWhereConditions(data, orgId);
    const offset = (page - 1) * pageSize;

    const [items, countResult] = await Promise.all([
      context.db
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
        .orderBy(
          (() => {
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
          })(),
        )
        .limit(pageSize)
        .offset(offset),
      context.db
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
  });

export const elevatorListOptions = (
  filters: z.infer<typeof listInputSchema>,
) =>
  queryOptions({
    queryKey: ["elevator", "list", filters],
    queryFn: () => listElevators({ data: filters }),
  });

export const exportElevatorData = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .inputValidator(filterSchema)
  .handler(async ({ data, context }) => {
    const orgId = context.user.organizationIds[0];
    const where = buildWhereConditions(data, orgId);

    return context.db
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
  });

export const exportElevatorDataOptions = (
  filters: z.infer<typeof filterSchema>,
) =>
  queryOptions({
    queryKey: ["elevator", "export", filters],
    queryFn: () => exportElevatorData({ data: filters }),
  });
