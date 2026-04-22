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
  customFieldDefs,
} from "@elevatorbud/db/schema";
import { authMiddlewareRead } from "./auth";
import { getContextOrgIds } from "./context";

const NOT_MODERNIZED = "Ej ombyggd";

// ---------------------------------------------------------------------------
// Filter schema (client version — parentOrgId scopes to parent + children)
// ---------------------------------------------------------------------------

const filterSchema = z.object({
  parentOrgId: z.string().uuid(),
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
  subOrgId: z.string().uuid().optional(),
});

type FilterInput = z.infer<typeof filterSchema>;

function buildWhereConditions(filters: FilterInput, contextOrgIds: string[]) {
  const conditions = [inArray(elevators.organizationId, contextOrgIds)];

  if (filters.subOrgId) {
    conditions.push(eq(elevators.organizationId, filters.subOrgId));
  }

  const status = filters.status ?? "active";
  if (status !== "all") {
    conditions.push(eq(elevators.status, status));
  }

  if (filters.search) {
    const s = `%${filters.search}%`;
    const searchPredicate = or(
      ilike(elevators.elevatorNumber, s),
      ilike(elevators.address, s),
      ilike(elevators.district, s),
      ilike(elevators.manufacturer, s),
      ilike(elevators.elevatorType, s),
    );
    if (searchPredicate) conditions.push(searchPredicate);
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
    const notModernizedPredicate = or(
      sql`${elevators.modernizationYear} IS NULL`,
      eq(elevators.modernizationYear, NOT_MODERNIZED),
    );
    if (notModernizedPredicate) conditions.push(notModernizedPredicate);
  }

  return and(...conditions);
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getElevator = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ id: z.string().uuid(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.id),
        inArray(elevators.organizationId, contextOrgIds),
      ),
      with: { organization: true },
    });
    if (!elevator) {
      throw new Error("Hissen hittades inte");
    }
    return elevator;
  });

export const elevatorOptions = (id: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["elevator", id, parentOrgId],
    queryFn: () => getElevator({ data: { id, parentOrgId } }),
  });

export const getElevatorDetails = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ elevatorId: z.string().uuid(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.elevatorId),
        inArray(elevators.organizationId, contextOrgIds),
      ),
      columns: { organizationId: true },
    });
    if (!elevator) return null;

    return context.db.query.elevatorDetails.findFirst({
      where: eq(elevatorDetails.elevatorId, data.elevatorId),
    });
  });

export const elevatorDetailsOptions = (elevatorId: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["elevator", "details", elevatorId, parentOrgId],
    queryFn: () => getElevatorDetails({ data: { elevatorId, parentOrgId } }),
  });

export const getLatestBudget = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ elevatorId: z.string().uuid(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.elevatorId),
        inArray(elevators.organizationId, contextOrgIds),
      ),
      columns: { organizationId: true },
    });
    if (!elevator) return null;

    return context.db.query.elevatorBudgets.findFirst({
      where: eq(elevatorBudgets.elevatorId, data.elevatorId),
      orderBy: [desc(elevatorBudgets.createdAt)],
    });
  });

export const elevatorBudgetOptions = (elevatorId: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["elevator", "budget", elevatorId, parentOrgId],
    queryFn: () => getLatestBudget({ data: { elevatorId, parentOrgId } }),
  });

export const searchElevators = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(z.object({ search: z.string(), parentOrgId: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);

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
          inArray(elevators.organizationId, contextOrgIds),
          eq(elevators.status, "active"),
          or(
            ilike(elevators.elevatorNumber, s),
            ilike(elevators.address, s),
          ),
        ),
      )
      .limit(20);
  });

export const searchElevatorsOptions = (search: string, parentOrgId: string) =>
  queryOptions({
    queryKey: ["elevator", "search", search, parentOrgId],
    queryFn: () => searchElevators({ data: { search, parentOrgId } }),
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
  .middleware([authMiddlewareRead])
  .inputValidator(listInputSchema)
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    if (data.subOrgId && !contextOrgIds.includes(data.subOrgId)) {
      throw new Error("Underorganisation hittades inte");
    }
    const page = data.page ?? 1;
    const pageSize = data.pageSize ?? 50;
    const sortBy = data.sortBy ?? "elevatorNumber";
    const sortOrder = data.sortOrder ?? "asc";
    const where = buildWhereConditions(data, contextOrgIds);
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
  .middleware([authMiddlewareRead])
  .inputValidator(filterSchema)
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(context.db, context.user, data.parentOrgId);
    if (data.subOrgId && !contextOrgIds.includes(data.subOrgId)) {
      throw new Error("Underorganisation hittades inte");
    }
    const where = buildWhereConditions(data, contextOrgIds);

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

// Global catalog of user-defined columns — read-only for the client app.
// Used by the detail view to render labels for entries in
// `elevators.customFields`.
export const listCustomFieldDefs = createServerFn()
  .middleware([authMiddlewareRead])
  .handler(async ({ context }) => {
    return context.db
      .select({
        id: customFieldDefs.id,
        key: customFieldDefs.key,
        label: customFieldDefs.label,
        type: customFieldDefs.type,
      })
      .from(customFieldDefs)
      .orderBy(asc(customFieldDefs.label));
  });

export const customFieldDefsOptions = () =>
  queryOptions({
    queryKey: ["customFieldDefs"],
    queryFn: () => listCustomFieldDefs(),
  });
