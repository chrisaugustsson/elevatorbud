import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as modernization from "@elevatorbud/api/modernization";

export const getTimeline = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return modernization.timeline(context.db, orgScope);
  });

export const timelineOptions = () =>
  queryOptions({
    queryKey: ["modernization", "timeline"],
    queryFn: () => getTimeline(),
  });

export const getBudget = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return modernization.budget(context.db, orgScope);
  });

export const budgetOptions = () =>
  queryOptions({
    queryKey: ["modernization", "budget"],
    queryFn: () => getBudget(),
  });

export const getPriorityList = createServerFn()
  .middleware([authMiddleware])
  .inputValidator(
    (input: { yearFrom?: number; yearTo?: number; page?: number; pageSize?: number }) => input,
  )
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    return modernization.priorityList(context.db, orgScope, {
      yearFrom: data.yearFrom,
      yearTo: data.yearTo,
      page: data.page ?? 1,
      pageSize: data.pageSize ?? 50,
    });
  });

export const priorityListOptions = (filters?: {
  yearFrom?: number;
  yearTo?: number;
  page?: number;
  pageSize?: number;
}) =>
  queryOptions({
    queryKey: ["modernization", "priorityList", filters],
    queryFn: () => getPriorityList({ data: filters ?? {} }),
  });
