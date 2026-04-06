import { TableAggregate } from "@convex-dev/aggregate";
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { v } from "convex/values";
import { Triggers } from "convex-helpers/server/triggers";
import {
  customCtx,
  customMutation,
} from "convex-helpers/server/customFunctions";
import {
  mutation as rawMutation,
  internalMutation as rawInternalMutation,
} from "./_generated/server";

// ---------------------------------------------------------------------------
// Aggregate definitions (core elevator fields only)
// ---------------------------------------------------------------------------

/** Listing pagination: O(log n) count + offset-based page access */
export const elevatorAggregate = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.aggregate, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.elevator_number],
});

/** Count by district */
export const byDistrict = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byDistrict, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.district ?? "Okänt"],
});

/** Count by elevator type */
export const byElevatorType = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byElevatorType, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.elevator_type ?? "Okänt"],
});

/** Count by manufacturer */
export const byManufacturer = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byManufacturer, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.manufacturer ?? "Okänt"],
});

/** Count by maintenance company */
export const byMaintenanceCompany = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byMaintenanceCompany, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.maintenance_company ?? "Okänt"],
});

/** Count by inspection month */
export const byInspectionMonth = new TableAggregate<{
  Namespace: string;
  Key: [string, string];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byInspectionMonth, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.inspection_month ?? ""],
});

/** Count + build_year sum for average age calculation */
export const byBuildYear = new TableAggregate<{
  Namespace: string;
  Key: [string, number];
  DataModel: DataModel;
  TableName: "elevators";
}>(components.byBuildYear, {
  namespace: (doc) => doc.organization_id,
  sortKey: (doc) => [doc.status, doc.build_year ?? -1],
  sumValue: (doc) => doc.build_year ?? 0,
});

// ---------------------------------------------------------------------------
// Triggers: auto-sync all aggregates on every elevator write
// ---------------------------------------------------------------------------

const triggers = new Triggers<DataModel>();
triggers.register("elevators", elevatorAggregate.trigger());
triggers.register("elevators", byDistrict.trigger());
triggers.register("elevators", byElevatorType.trigger());
triggers.register("elevators", byManufacturer.trigger());
triggers.register("elevators", byMaintenanceCompany.trigger());
triggers.register("elevators", byInspectionMonth.trigger());
triggers.register("elevators", byBuildYear.trigger());

// Custom mutations that auto-update all aggregates via triggers
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));
export const internalMutation = customMutation(
  rawInternalMutation,
  customCtx(triggers.wrapDB),
);

// ---------------------------------------------------------------------------
// Backfill: one-time population for existing data
// ---------------------------------------------------------------------------

const ALL_AGGREGATES = [
  elevatorAggregate,
  byDistrict,
  byElevatorType,
  byManufacturer,
  byMaintenanceCompany,
  byInspectionMonth,
  byBuildYear,
];

export const backfill = rawInternalMutation({
  args: {
    cursor: v.optional(v.string()),
    batchSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const batchSize = args.batchSize ?? 50;
    const result = await ctx.db
      .query("elevators")
      .paginate({ cursor: args.cursor ?? null, numItems: batchSize });

    let count = 0;
    for (const doc of result.page) {
      for (const agg of ALL_AGGREGATES) {
        await agg.insertIfDoesNotExist(ctx, doc);
      }
      count++;
    }

    console.log(
      `Backfilled batch of ${count} elevators. Done: ${result.isDone}`,
    );

    return {
      count,
      isDone: result.isDone,
      continueCursor: result.isDone ? null : result.continueCursor,
    };
  },
});
