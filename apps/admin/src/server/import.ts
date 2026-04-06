import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import * as importFns from "@elevatorbud/api/import";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const analyzeImport = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(importFns.analyzeImportSchema)
  .handler(async ({ data, context }) => {
    return importFns.analyze(context.db, data);
  });

export const analyzeImportOptions = (
  input: z.infer<typeof importFns.analyzeImportSchema>,
) =>
  queryOptions({
    queryKey: ["import", "analyze", input],
    queryFn: () => analyzeImport({ data: input }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const confirmImport = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(importFns.confirmImportSchema)
  .handler(async ({ data, context }) => {
    return importFns.confirm(context.db, context.user.id, data);
  });
