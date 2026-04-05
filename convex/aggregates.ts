import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "./_generated/server";

/**
 * Elevator aggregate: namespace by organization_id, sort by elevator_number.
 *
 * Provides O(log n) count and offset-based pagination per org, avoiding
 * the need to .collect() the entire elevators table.
 */
export const elevatorAggregate = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.aggregate, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.elevator_number],
});

// Triggers: automatically keep the aggregate in sync on every db write
const triggers = new Triggers<DataModel>();
triggers.register("elevators", elevatorAggregate.trigger());

// Custom mutations that auto-update the aggregate via triggers
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);

// One-time backfill for existing elevator data
export const backfill = rawInternalMutation({
  args: {},
  handler: async (ctx) => {
    const elevators = await ctx.db.query("elevators").collect();
    let count = 0;
    for (const doc of elevators) {
      await elevatorAggregate.insertIfDoesNotExist(ctx, doc);
      count++;
    }
    console.log(`Backfilled ${count} elevators into aggregate`);
  },
});
