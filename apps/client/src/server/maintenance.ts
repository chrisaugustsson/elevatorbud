import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { authMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as maintenance from "@elevatorbud/api/maintenance";

export const getInspectionCalendar = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return maintenance.inspectionCalendar(context.db, orgScope);
  });

export const inspectionCalendarOptions = () =>
  queryOptions({
    queryKey: ["maintenance", "inspectionCalendar"],
    queryFn: () => getInspectionCalendar(),
  });

export const getMaintenanceCompanies = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return maintenance.companies(context.db, orgScope);
  });

export const maintenanceCompaniesOptions = () =>
  queryOptions({
    queryKey: ["maintenance", "companies"],
    queryFn: () => getMaintenanceCompanies(),
  });

export const getEmergencyPhoneStatus = createServerFn()
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const orgScope = getOrgScope(context.user);
    return maintenance.emergencyPhoneStatus(context.db, orgScope);
  });

export const emergencyPhoneStatusOptions = () =>
  queryOptions({
    queryKey: ["maintenance", "emergencyPhoneStatus"],
    queryFn: () => getEmergencyPhoneStatus(),
  });

export const getInspectionList = createServerFn()
  .middleware([authMiddleware])
  .inputValidator((input: { month: string }) => input)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user);
    return maintenance.inspectionList(context.db, orgScope, data.month);
  });

export const inspectionListOptions = (month: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionList", month],
    queryFn: () => getInspectionList({ data: { month } }),
  });
