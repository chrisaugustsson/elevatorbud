import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as elevator from "@elevatorbud/api/elevator";

export const getElevator = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { id: string }) => input)
  .handler(async ({ data, context }) => {
    return elevator.get(context.db, data.id);
  });

export const elevatorOptions = (id: string) =>
  queryOptions({
    queryKey: ["elevator", id],
    queryFn: () => getElevator({ data: { id } }),
  });

export const getElevatorDetails = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { elevatorId: string }) => input)
  .handler(async ({ data, context }) => {
    return elevator.getDetails(context.db, data.elevatorId);
  });

export const elevatorDetailsOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "details", elevatorId],
    queryFn: () => getElevatorDetails({ data: { elevatorId } }),
  });

export const getLatestBudget = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { elevatorId: string }) => input)
  .handler(async ({ data, context }) => {
    return elevator.getLatestBudget(context.db, data.elevatorId);
  });

export const elevatorBudgetOptions = (elevatorId: string) =>
  queryOptions({
    queryKey: ["elevator", "budget", elevatorId],
    queryFn: () => getLatestBudget({ data: { elevatorId } }),
  });

export const searchElevators = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { search: string }) => input)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    return elevator.search(context.db, data.search, orgScope);
  });

export const searchElevatorsOptions = (search: string) =>
  queryOptions({
    queryKey: ["elevator", "search", search],
    queryFn: () => searchElevators({ data: { search } }),
  });

export const listElevators = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    (
      input: Record<string, unknown> & {
        page?: number;
        limit?: number;
        sort?: string;
        order?: string;
      },
    ) => input,
  )
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    const { page, limit, sort, order, ...filters } = data;
    return elevator.list(
      context.db,
      {
        ...filters,
        page: page != null ? page + 1 : undefined,
        pageSize: limit,
        sortBy: sort as never,
        sortOrder: order as "asc" | "desc" | undefined,
      },
      orgScope,
    );
  });

export const elevatorListOptions = (
  filters: Record<string, unknown> & {
    page?: number;
    limit?: number;
    sort?: string;
    order?: string;
  },
) =>
  queryOptions({
    queryKey: ["elevator", "list", filters],
    queryFn: () => listElevators({ data: filters }),
  });

export const exportElevatorData = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: Record<string, unknown>) => input)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    return elevator.exportData(context.db, data as never, orgScope);
  });

export const exportElevatorDataOptions = (filters: Record<string, unknown>) =>
  queryOptions({
    queryKey: ["elevator", "export", filters],
    queryFn: () => exportElevatorData({ data: filters }),
  });
