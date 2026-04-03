// Type declarations for Convex API — resolved at runtime by Vite alias.
// Full generated types available when `npx convex dev` is running.
declare module "@convex/_generated/api" {
  import type { FunctionReference } from "convex/server";

  export const api: {
    users: {
      me: FunctionReference<"query", "public">;
    };
    organizations: {
      list: FunctionReference<"query", "public">;
      get: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
    };
    userAdmin: {
      create: FunctionReference<"action", "public">;
      update: FunctionReference<"action", "public">;
      deactivate: FunctionReference<"action", "public">;
      activate: FunctionReference<"action", "public">;
      remove: FunctionReference<"action", "public">;
      list: FunctionReference<"query", "public">;
      get: FunctionReference<"query", "public">;
      listByOrganization: FunctionReference<"query", "public">;
    };
    elevators: {
      crud: {
        get: FunctionReference<"query", "public">;
        search: FunctionReference<"query", "public">;
        checkElevatorNumber: FunctionReference<"query", "public">;
        create: FunctionReference<"mutation", "public">;
        update: FunctionReference<"mutation", "public">;
        archive: FunctionReference<"mutation", "public">;
      };
      listing: {
        list: FunctionReference<"query", "public">;
        exportData: FunctionReference<"query", "public">;
      };
      analytics: {
        stats: FunctionReference<"query", "public">;
        chartData: FunctionReference<"query", "public">;
      };
      modernization: {
        timeline: FunctionReference<"query", "public">;
        budget: FunctionReference<"query", "public">;
        priorityList: FunctionReference<"query", "public">;
        measures: FunctionReference<"query", "public">;
      };
      maintenance: {
        inspectionCalendar: FunctionReference<"query", "public">;
        companies: FunctionReference<"query", "public">;
        emergencyPhoneStatus: FunctionReference<"query", "public">;
        inspectionList: FunctionReference<"query", "public">;
        todaysElevators: FunctionReference<"query", "public">;
      };
    };
    imports: {
      analyze: FunctionReference<"query", "public">;
      confirm: FunctionReference<"action", "public">;
    };
    suggestedValues: {
      list: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
      merge: FunctionReference<"mutation", "public">;
      deactivate: FunctionReference<"mutation", "public">;
      activate: FunctionReference<"mutation", "public">;
    };
    search: {
      global: FunctionReference<"query", "public">;
    };
    cms: {
      getPage: FunctionReference<"query", "public">;
      listPages: FunctionReference<"query", "public">;
      createPage: FunctionReference<"mutation", "public">;
      updatePage: FunctionReference<"mutation", "public">;
    };
  };

  export const internal: {
    users: {
      upsertFromClerk: FunctionReference<"mutation", "internal">;
      deleteFromClerk: FunctionReference<"mutation", "internal">;
    };
    importsInternal: {
      checkAdmin: FunctionReference<"query", "internal">;
      createOrg: FunctionReference<"mutation", "internal">;
      importBatch: FunctionReference<"mutation", "internal">;
    };
    userAdminInternal: {
      checkAdmin: FunctionReference<"query", "internal">;
      insertUser: FunctionReference<"mutation", "internal">;
      updateUser: FunctionReference<"mutation", "internal">;
      deactivateUser: FunctionReference<"mutation", "internal">;
      activateUser: FunctionReference<"mutation", "internal">;
      removeUser: FunctionReference<"mutation", "internal">;
      getInternal: FunctionReference<"query", "internal">;
    };
  };
}

declare module "@convex/_generated/dataModel" {
  export type Id<T extends string> = string & { __tableName: T };
}
