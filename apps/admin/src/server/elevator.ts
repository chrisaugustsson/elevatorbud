import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as elevator from "@elevatorbud/api/elevator";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getElevator = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return elevator.get(context.db, data.id);
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
    return elevator.getDetails(context.db, data.elevatorId);
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
    return elevator.getLatestBudget(context.db, data.elevatorId);
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
    const orgScope = getOrgScope(context.user);
    return elevator.search(context.db, data.search, orgScope);
  });

export const searchElevatorsOptions = (search: string) =>
  queryOptions({
    queryKey: ["elevator", "search", search],
    queryFn: () => searchElevators({ data: { search } }),
  });

export const listElevators = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(
    elevator.filterSchema.extend({
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
    }),
  )
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data.organizationId);
    return elevator.list(context.db, data, orgScope);
  });

export const listElevatorsOptions = (
  filters: z.infer<typeof elevator.filterSchema> & {
    page?: number;
    pageSize?: number;
    sortBy?: "elevatorNumber" | "address" | "district" | "elevatorType" | "manufacturer" | "buildYear" | "maintenanceCompany" | "inspectionMonth";
    sortOrder?: "asc" | "desc";
  },
) =>
  queryOptions({
    queryKey: ["elevator", "list", filters],
    queryFn: () => listElevators({ data: filters }),
  });

export const exportElevatorData = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(elevator.filterSchema)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data.organizationId);
    return elevator.exportData(context.db, data, orgScope);
  });

export const exportElevatorDataOptions = (
  filters: z.infer<typeof elevator.filterSchema>,
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
      excludeId: z.string().uuid().optional(),
    }),
  )
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    return elevator.checkElevatorNumber(
      context.db,
      data.elevatorNumber,
      orgScope,
      data.excludeId,
    );
  });

export const createElevator = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(elevator.createInput)
  .handler(async ({ data, context }) => {
    return elevator.create(context.db, data, context.user.id);
  });

export const updateElevator = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(elevator.updateInput)
  .handler(async ({ data, context }) => {
    return elevator.update(context.db, data, context.user.id);
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
    return elevator.archive(context.db, data.id, data.status, context.user.id);
  });
