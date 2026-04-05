/* eslint-disable */
/**
 * Standalone API type declarations generated via `npx convex-helpers ts-api-spec`.
 *
 * This replaces the default Convex-generated api.d.ts which uses relative imports
 * that break TypeScript in monorepo app typechecks. Regenerate after schema changes.
 *
 * @module
 */

import type { FunctionReference } from "convex/server";
import type { GenericId as Id } from "convex/values";

export declare const api: PublicApiType;
export declare const internal: InternalApiType;
export declare const components: {};

export type PublicApiType = {
  cms: {
    getPage: FunctionReference<"query", "public", { slug: string }, any>;
    listPages: FunctionReference<"query", "public", Record<string, never>, any>;
    createPage: FunctionReference<
      "mutation",
      "public",
      {
        published?: boolean;
        sections: Array<{
          content?: string;
          cta?: { href: string; text: string };
          id: string;
          imageUrl?: string;
          items?: Array<{
            description?: string;
            icon?: string;
            title?: string;
          }>;
          order: number;
          subtitle?: string;
          title?: string;
          type: string;
        }>;
        slug: string;
        title: string;
      },
      any
    >;
    updatePage: FunctionReference<
      "mutation",
      "public",
      {
        id: Id<"pages">;
        published?: boolean;
        sections?: Array<{
          content?: string;
          cta?: { href: string; text: string };
          id: string;
          imageUrl?: string;
          items?: Array<{
            description?: string;
            icon?: string;
            title?: string;
          }>;
          order: number;
          subtitle?: string;
          title?: string;
          type: string;
        }>;
        title?: string;
      },
      any
    >;
  };
  imports: {
    analyze: FunctionReference<
      "query",
      "public",
      { elevatorNumberList: Array<string>; orgNames: Array<string> },
      any
    >;
    confirm: FunctionReference<
      "action",
      "public",
      {
        adminEmail?: string;
        elevators: Array<Record<string, any>>;
        existingOrgMatchIds: Array<string>;
        existingOrgMatchNames: Array<string>;
        newOrgNames: Array<string>;
      },
      any
    >;
  };
  organizations: {
    list: FunctionReference<"query", "public", Record<string, never>, any>;
    get: FunctionReference<"query", "public", { id: Id<"organizations"> }, any>;
    create: FunctionReference<
      "mutation",
      "public",
      {
        contact_person?: string;
        email?: string;
        name: string;
        organization_number?: string;
        phone_number?: string;
      },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      {
        contact_person?: string;
        email?: string;
        id: Id<"organizations">;
        name?: string;
        organization_number?: string;
        phone_number?: string;
      },
      any
    >;
  };
  suggestedValues: {
    list: FunctionReference<"query", "public", { category?: string }, any>;
    create: FunctionReference<
      "mutation",
      "public",
      { category: string; value: string },
      any
    >;
    update: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suggested_values">; value: string },
      any
    >;
    merge: FunctionReference<
      "mutation",
      "public",
      { sourceId: Id<"suggested_values">; targetId: Id<"suggested_values"> },
      any
    >;
    deactivate: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suggested_values"> },
      any
    >;
    activate: FunctionReference<
      "mutation",
      "public",
      { id: Id<"suggested_values"> },
      any
    >;
  };
  userAdmin: {
    create: FunctionReference<
      "action",
      "public",
      {
        email: string;
        name: string;
        organization_id?: Id<"organizations">;
        role: "admin" | "customer";
      },
      any
    >;
    update: FunctionReference<
      "action",
      "public",
      {
        email?: string;
        id: Id<"users">;
        name?: string;
        organization_id?: Id<"organizations">;
        role?: "admin" | "customer";
      },
      any
    >;
    deactivate: FunctionReference<"action", "public", { id: Id<"users"> }, any>;
    activate: FunctionReference<"action", "public", { id: Id<"users"> }, any>;
    remove: FunctionReference<"action", "public", { id: Id<"users"> }, any>;
    list: FunctionReference<
      "query",
      "public",
      {
        organization_id?: Id<"organizations">;
        role?: "admin" | "customer";
        search?: string;
      },
      any
    >;
    get: FunctionReference<"query", "public", { id: Id<"users"> }, any>;
    listByOrganization: FunctionReference<
      "query",
      "public",
      { organization_id: Id<"organizations"> },
      any
    >;
  };
  users: { me: FunctionReference<"query", "public", any, any> };
  dashboard: {
    overview: FunctionReference<"query", "public", Record<string, never>, any>;
  };
  elevators: {
    analytics: {
      stats: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      chartData: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
    };
    crud: {
      get: FunctionReference<"query", "public", { id: Id<"elevators"> }, any>;
      checkElevatorNumber: FunctionReference<
        "query",
        "public",
        { elevator_number: string; excludeId?: Id<"elevators"> },
        any
      >;
      search: FunctionReference<"query", "public", { search: string }, any>;
      update: FunctionReference<
        "mutation",
        "public",
        {
          address?: string;
          budget_amount?: number;
          build_year?: number;
          cab_size?: string;
          collective?: string;
          comments?: string;
          control_system_type?: string;
          daylight_opening?: string;
          district?: string;
          door_count?: number;
          door_machine?: string;
          door_type?: string;
          drive_system?: string;
          elevator_designation?: string;
          elevator_number?: string;
          elevator_type?: string;
          emergency_phone_model?: string;
          emergency_phone_price?: number;
          emergency_phone_type?: string;
          floor_count?: number;
          grab_rail?: string;
          has_emergency_phone?: boolean;
          id: Id<"elevators">;
          inspection_authority?: string;
          inspection_month?: string;
          lift_height?: string;
          load_capacity?: string;
          machine_placement?: string;
          machine_type?: string;
          maintenance_company?: string;
          manufacturer?: string;
          modernization_measures?: string;
          modernization_year?: string;
          needs_upgrade?: boolean;
          organization_id?: Id<"organizations">;
          passthrough?: boolean;
          recommended_modernization_year?: string;
          shaft_lighting?: string;
          speed?: string;
          suspension?: string;
          warranty?: boolean;
        },
        any
      >;
      create: FunctionReference<
        "mutation",
        "public",
        {
          address?: string;
          budget_amount?: number;
          build_year?: number;
          cab_size?: string;
          collective?: string;
          comments?: string;
          control_system_type?: string;
          daylight_opening?: string;
          district?: string;
          door_count?: number;
          door_machine?: string;
          door_type?: string;
          drive_system?: string;
          elevator_designation?: string;
          elevator_number: string;
          elevator_type?: string;
          emergency_phone_model?: string;
          emergency_phone_price?: number;
          emergency_phone_type?: string;
          floor_count?: number;
          grab_rail?: string;
          has_emergency_phone?: boolean;
          inspection_authority?: string;
          inspection_month?: string;
          lift_height?: string;
          load_capacity?: string;
          machine_placement?: string;
          machine_type?: string;
          maintenance_company?: string;
          manufacturer?: string;
          modernization_measures?: string;
          modernization_year?: string;
          needs_upgrade?: boolean;
          organization_id: Id<"organizations">;
          passthrough?: boolean;
          recommended_modernization_year?: string;
          shaft_lighting?: string;
          speed?: string;
          suspension?: string;
          warranty?: boolean;
        },
        any
      >;
      archive: FunctionReference<
        "mutation",
        "public",
        { id: Id<"elevators">; status: "demolished" | "archived" },
        any
      >;
    };
    listing: {
      list: FunctionReference<
        "query",
        "public",
        {
          buildYearMax?: number;
          buildYearMin?: number;
          district?: Array<string>;
          elevator_type?: Array<string>;
          inspection_authority?: Array<string>;
          limit?: number;
          maintenance_company?: Array<string>;
          manufacturer?: Array<string>;
          modernized?: boolean;
          order?: "asc" | "desc";
          organization_id?: Id<"organizations">;
          page?: number;
          search?: string;
          sort?: string;
          status?: "active" | "demolished" | "archived" | "all";
        },
        any
      >;
      exportData: FunctionReference<
        "query",
        "public",
        {
          buildYearMax?: number;
          buildYearMin?: number;
          district?: Array<string>;
          elevator_type?: Array<string>;
          inspection_authority?: Array<string>;
          maintenance_company?: Array<string>;
          manufacturer?: Array<string>;
          modernized?: boolean;
          organization_id?: Id<"organizations">;
          search?: string;
          status?: "active" | "demolished" | "archived" | "all";
        },
        any
      >;
    };
    maintenance: {
      inspectionCalendar: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      companies: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      emergencyPhoneStatus: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      inspectionList: FunctionReference<
        "query",
        "public",
        { month: string; organization_id?: Id<"organizations"> },
        any
      >;
      todaysElevators: FunctionReference<
        "query",
        "public",
        { todayStart: number },
        any
      >;
    };
    modernization: {
      timeline: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      budget: FunctionReference<
        "query",
        "public",
        { organization_id?: Id<"organizations"> },
        any
      >;
      priorityList: FunctionReference<
        "query",
        "public",
        {
          organization_id?: Id<"organizations">;
          yearFrom?: number;
          yearTo?: number;
        },
        any
      >;
    };
  };
  search: {
    global: FunctionReference<"query", "public", { search: string }, any>;
  };
  contactSubmissions: {
    submit: FunctionReference<
      "action",
      "public",
      {
        email: string;
        message: string;
        name: string;
        phone?: string;
        turnstileToken: string;
      },
      any
    >;
    list: FunctionReference<
      "query",
      "public",
      { status?: "new" | "read" | "archived" },
      any
    >;
    unreadCount: FunctionReference<
      "query",
      "public",
      Record<string, never>,
      any
    >;
    updateStatus: FunctionReference<
      "mutation",
      "public",
      { id: Id<"contactSubmissions">; status: "new" | "read" | "archived" },
      any
    >;
  };
};

type InternalApiType = {
  contactSubmissions: {
    insertSubmission: FunctionReference<
      "mutation",
      "internal",
      {
        name: string;
        email: string;
        phone?: string;
        message: string;
      },
      any
    >;
  };
  users: {
    upsertFromClerk: FunctionReference<
      "mutation",
      "internal",
      { data: any },
      any
    >;
    deleteFromClerk: FunctionReference<
      "mutation",
      "internal",
      { clerkUserId: string },
      any
    >;
  };
  importsInternal: {
    processBatch: FunctionReference<"mutation", "internal", any, any>;
  };
  userAdminInternal: {
    insertUser: FunctionReference<"mutation", "internal", any, any>;
    updateUser: FunctionReference<"mutation", "internal", any, any>;
    setActive: FunctionReference<"mutation", "internal", any, any>;
    deleteUser: FunctionReference<"mutation", "internal", any, any>;
  };
};
