// Type declarations for Convex API — resolved at runtime by Vite alias.
// Full generated types available when `npx convex dev` is running.
declare module "@convex/_generated/api" {
  import type { FunctionReference } from "convex/server";

  export const api: {
    users: {
      me: FunctionReference<"query", "public">;
    };
    organisationer: {
      list: FunctionReference<"query", "public">;
      get: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
    };
    anvandare: {
      create: FunctionReference<"action", "public">;
      update: FunctionReference<"action", "public">;
      inaktivera: FunctionReference<"action", "public">;
      remove: FunctionReference<"action", "public">;
      list: FunctionReference<"query", "public">;
      get: FunctionReference<"query", "public">;
      listByOrganisation: FunctionReference<"query", "public">;
    };
    hissar: {
      checkHissnummer: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
    };
    forslagsvarden: {
      list: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
      merge: FunctionReference<"mutation", "public">;
      deactivate: FunctionReference<"mutation", "public">;
    };
  };

  export const internal: {
    users: {
      upsertFromClerk: FunctionReference<"mutation", "internal">;
      deleteFromClerk: FunctionReference<"mutation", "internal">;
    };
    anvandareInternal: {
      checkAdmin: FunctionReference<"query", "internal">;
      insertAnvandare: FunctionReference<"mutation", "internal">;
      updateAnvandare: FunctionReference<"mutation", "internal">;
      inaktiveraAnvandare: FunctionReference<"mutation", "internal">;
      removeAnvandare: FunctionReference<"mutation", "internal">;
      getInternal: FunctionReference<"query", "internal">;
    };
  };
}

declare module "@convex/_generated/dataModel" {
  export type Id<T extends string> = string & { __tableName: T };
}
