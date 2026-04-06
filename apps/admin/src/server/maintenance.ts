import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import { getOrgScope } from "@elevatorbud/api/helpers";
import * as maintenance from "@elevatorbud/api/maintenance";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getInspectionCalendar = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return maintenance.inspectionCalendar(context.db, orgScope);
  });

export const inspectionCalendarOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionCalendar", { organizationId }],
    queryFn: () => getInspectionCalendar({ data: { organizationId } }),
  });

export const getMaintenanceCompanies = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return maintenance.companies(context.db, orgScope);
  });

export const maintenanceCompaniesOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "companies", { organizationId }],
    queryFn: () => getMaintenanceCompanies({ data: { organizationId } }),
  });

export const getEmergencyPhoneStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(z.object({ organizationId: z.string().uuid().optional() }).optional())
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data?.organizationId);
    return maintenance.emergencyPhoneStatus(context.db, orgScope);
  });

export const emergencyPhoneStatusOptions = (organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "emergencyPhoneStatus", { organizationId }],
    queryFn: () => getEmergencyPhoneStatus({ data: { organizationId } }),
  });

export const getInspectionList = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(maintenance.inspectionListInput)
  .handler(async ({ data, context }) => {
    const orgScope = getOrgScope(context.user, data.organizationId);
    return maintenance.inspectionList(context.db, orgScope, data.month);
  });

export const inspectionListOptions = (month: string, organizationId?: string) =>
  queryOptions({
    queryKey: ["maintenance", "inspectionList", { month, organizationId }],
    queryFn: () => getInspectionList({ data: { month, organizationId } }),
  });

export const getTodaysElevators = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return maintenance.todaysElevators(context.db, context.user.id);
  });

export const todaysElevatorsOptions = () =>
  queryOptions({
    queryKey: ["maintenance", "todaysElevators"],
    queryFn: () => getTodaysElevators(),
  });
