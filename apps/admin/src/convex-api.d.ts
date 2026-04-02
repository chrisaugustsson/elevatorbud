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
      list: FunctionReference<"query", "public">;
      exportData: FunctionReference<"query", "public">;
      stats: FunctionReference<"query", "public">;
      chartData: FunctionReference<"query", "public">;
      moderniseringTidslinje: FunctionReference<"query", "public">;
      moderniseringBudget: FunctionReference<"query", "public">;
      moderniseringPrioritetslista: FunctionReference<"query", "public">;
      moderniseringAtgarder: FunctionReference<"query", "public">;
      besiktningskalender: FunctionReference<"query", "public">;
      besiktningslista: FunctionReference<"query", "public">;
      skotselforetag: FunctionReference<"query", "public">;
      nodtelefonstatus: FunctionReference<"query", "public">;
      dagensHissar: FunctionReference<"query", "public">;
      get: FunctionReference<"query", "public">;
      checkHissnummer: FunctionReference<"query", "public">;
      search: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
      archive: FunctionReference<"mutation", "public">;
    };
    importera: {
      analyze: FunctionReference<"query", "public">;
      confirm: FunctionReference<"action", "public">;
    };
    forslagsvarden: {
      list: FunctionReference<"query", "public">;
      create: FunctionReference<"mutation", "public">;
      update: FunctionReference<"mutation", "public">;
      merge: FunctionReference<"mutation", "public">;
      deactivate: FunctionReference<"mutation", "public">;
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
    importeraInternal: {
      checkAdmin: FunctionReference<"query", "internal">;
      createOrg: FunctionReference<"mutation", "internal">;
      importBatch: FunctionReference<"mutation", "internal">;
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
