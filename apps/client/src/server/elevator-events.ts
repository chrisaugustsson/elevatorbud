import { createServerFn } from "@tanstack/react-start";
import { queryOptions } from "@tanstack/react-query";
import { z } from "zod";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  elevators,
  elevatorEvents,
} from "@elevatorbud/db/schema";
import { authMiddlewareRead } from "./auth";
import { getContextOrgIds } from "./context";

// Client app is read-only for events. Registering events is admin-only for
// MVP. The client timeline renders the same shape the admin list returns.

export const listElevatorEvents = createServerFn()
  .middleware([authMiddlewareRead])
  .inputValidator(
    z.object({
      elevatorId: z.string().uuid(),
      parentOrgId: z.string().uuid(),
    }),
  )
  .handler(async ({ data, context }) => {
    const contextOrgIds = await getContextOrgIds(
      context.db,
      context.user,
      data.parentOrgId,
    );

    // Org-scoping: confirm the elevator itself is in the user's context
    // before returning any event rows.
    const elevator = await context.db.query.elevators.findFirst({
      where: and(
        eq(elevators.id, data.elevatorId),
        inArray(elevators.organizationId, contextOrgIds),
      ),
      columns: { id: true },
    });
    if (!elevator) return [];

    return context.db.query.elevatorEvents.findMany({
      where: eq(elevatorEvents.elevatorId, data.elevatorId),
      orderBy: [desc(elevatorEvents.occurredAt), desc(elevatorEvents.createdAt)],
    });
  });

export const elevatorEventsOptions = (
  elevatorId: string,
  parentOrgId: string,
) =>
  queryOptions({
    queryKey: ["elevator", "events", elevatorId, parentOrgId],
    queryFn: () =>
      listElevatorEvents({ data: { elevatorId, parentOrgId } }),
  });
