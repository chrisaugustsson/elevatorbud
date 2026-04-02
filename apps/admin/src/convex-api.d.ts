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
    };
  };

  export const internal: {
    users: {
      upsertFromClerk: FunctionReference<"mutation", "internal">;
      deleteFromClerk: FunctionReference<"mutation", "internal">;
    };
  };
}
