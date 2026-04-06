import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { adminMiddleware } from "./auth";
import * as contact from "@elevatorbud/api/contact";

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export const getUnreadCount = createServerFn()
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return contact.unreadCount(context.db);
  });

export const unreadCountOptions = () =>
  queryOptions({
    queryKey: ["contact", "unreadCount"],
    queryFn: () => getUnreadCount(),
  });

export const listContacts = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(contact.listContactsSchema)
  .handler(async ({ data, context }) => {
    return contact.list(context.db, data);
  });

export const listContactsOptions = (
  filters?: z.infer<typeof contact.listContactsSchema>,
) =>
  queryOptions({
    queryKey: ["contact", "list", filters],
    queryFn: () => listContacts({ data: filters }),
  });

// ---------------------------------------------------------------------------
// Mutations (no queryOptions)
// ---------------------------------------------------------------------------

export const updateContactStatus = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .inputValidator(contact.updateContactStatusSchema)
  .handler(async ({ data, context }) => {
    return contact.updateStatus(context.db, data);
  });
