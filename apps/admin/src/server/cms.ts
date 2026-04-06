import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import * as cms from "@elevatorbud/api/cms";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getPageAdmin = createServerFn()
  .middleware([adminMiddleware])
  .inputValidator(z.object({ slug: z.string() }))
  .handler(async ({ data, context }) => {
    return cms.getPageAdmin(context.db, data.slug);
  });

export const pageAdminOptions = (slug: string) =>
  queryOptions({
    queryKey: ["cms", "page", slug],
    queryFn: () => getPageAdmin({ data: { slug } }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const createPage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(cms.createPageSchema)
  .handler(async ({ data, context }) => {
    return cms.createPage(context.db, data);
  });

export const updatePage = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(cms.updatePageSchema)
  .handler(async ({ data, context }) => {
    return cms.updatePage(context.db, data);
  });
