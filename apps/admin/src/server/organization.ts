import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import * as organization from "@elevatorbud/api/organization";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const listOrganizations = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return organization.list(context.db);
  });

export const listOrganizationsOptions = () =>
  queryOptions({
    queryKey: ["organization", "list"],
    queryFn: () => listOrganizations(),
  });

export const getOrganization = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data, context }) => {
    return organization.get(context.db, data.id);
  });

export const organizationOptions = (id: string) =>
  queryOptions({
    queryKey: ["organization", id],
    queryFn: () => getOrganization({ data: { id } }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const createOrganization = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(organization.createOrganizationSchema)
  .handler(async ({ data, context }) => {
    return organization.create(context.db, data);
  });

export const updateOrganization = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(organization.updateOrganizationSchema)
  .handler(async ({ data, context }) => {
    return organization.update(context.db, data);
  });
