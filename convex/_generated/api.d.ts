/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aggregates from "../aggregates.js";
import type * as auth from "../auth.js";
import type * as cms from "../cms.js";
import type * as contactSubmissions from "../contactSubmissions.js";
import type * as dashboard from "../dashboard.js";
import type * as elevators_analytics from "../elevators/analytics.js";
import type * as elevators_crud from "../elevators/crud.js";
import type * as elevators_helpers from "../elevators/helpers.js";
import type * as elevators_listing from "../elevators/listing.js";
import type * as elevators_maintenance from "../elevators/maintenance.js";
import type * as elevators_modernization from "../elevators/modernization.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as importsInternal from "../importsInternal.js";
import type * as organizations from "../organizations.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as suggestedValues from "../suggestedValues.js";
import type * as userAdmin from "../userAdmin.js";
import type * as userAdminInternal from "../userAdminInternal.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aggregates: typeof aggregates;
  auth: typeof auth;
  cms: typeof cms;
  contactSubmissions: typeof contactSubmissions;
  dashboard: typeof dashboard;
  "elevators/analytics": typeof elevators_analytics;
  "elevators/crud": typeof elevators_crud;
  "elevators/helpers": typeof elevators_helpers;
  "elevators/listing": typeof elevators_listing;
  "elevators/maintenance": typeof elevators_maintenance;
  "elevators/modernization": typeof elevators_modernization;
  email: typeof email;
  http: typeof http;
  imports: typeof imports;
  importsInternal: typeof importsInternal;
  organizations: typeof organizations;
  search: typeof search;
  seed: typeof seed;
  suggestedValues: typeof suggestedValues;
  userAdmin: typeof userAdmin;
  userAdminInternal: typeof userAdminInternal;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  aggregate: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byDistrict: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byElevatorType: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byManufacturer: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byMaintenanceCompany: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byInspectionMonth: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
  byBuildYear: {
    btree: {
      aggregateBetween: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any },
        { count: number; sum: number }
      >;
      aggregateBetweenBatch: FunctionReference<
        "query",
        "internal",
        { queries: Array<{ k1?: any; k2?: any; namespace?: any }> },
        Array<{ count: number; sum: number }>
      >;
      atNegativeOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffset: FunctionReference<
        "query",
        "internal",
        { k1?: any; k2?: any; namespace?: any; offset: number },
        { k: any; s: number; v: any }
      >;
      atOffsetBatch: FunctionReference<
        "query",
        "internal",
        {
          queries: Array<{
            k1?: any;
            k2?: any;
            namespace?: any;
            offset: number;
          }>;
        },
        Array<{ k: any; s: number; v: any }>
      >;
      get: FunctionReference<
        "query",
        "internal",
        { key: any; namespace?: any },
        null | { k: any; s: number; v: any }
      >;
      offset: FunctionReference<
        "query",
        "internal",
        { k1?: any; key: any; namespace?: any },
        number
      >;
      offsetUntil: FunctionReference<
        "query",
        "internal",
        { k2?: any; key: any; namespace?: any },
        number
      >;
      paginate: FunctionReference<
        "query",
        "internal",
        {
          cursor?: string;
          k1?: any;
          k2?: any;
          limit: number;
          namespace?: any;
          order: "asc" | "desc";
        },
        {
          cursor: string;
          isDone: boolean;
          page: Array<{ k: any; s: number; v: any }>;
        }
      >;
      paginateNamespaces: FunctionReference<
        "query",
        "internal",
        { cursor?: string; limit: number },
        { cursor: string; isDone: boolean; page: Array<any> }
      >;
      validate: FunctionReference<
        "query",
        "internal",
        { namespace?: any },
        any
      >;
    };
    inspect: {
      display: FunctionReference<"query", "internal", { namespace?: any }, any>;
      dump: FunctionReference<"query", "internal", { namespace?: any }, string>;
      inspectNode: FunctionReference<
        "query",
        "internal",
        { namespace?: any; node?: string },
        null
      >;
      listTreeNodes: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          aggregate?: { count: number; sum: number };
          items: Array<{ k: any; s: number; v: any }>;
          subtrees: Array<string>;
        }>
      >;
      listTrees: FunctionReference<
        "query",
        "internal",
        { take?: number },
        Array<{
          _creationTime: number;
          _id: string;
          maxNodeSize: number;
          namespace?: any;
          root: string;
        }>
      >;
    };
    public: {
      clear: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      delete_: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        null
      >;
      deleteIfExists: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any },
        any
      >;
      init: FunctionReference<
        "mutation",
        "internal",
        { maxNodeSize?: number; namespace?: any; rootLazy?: boolean },
        null
      >;
      insert: FunctionReference<
        "mutation",
        "internal",
        { key: any; namespace?: any; summand?: number; value: any },
        null
      >;
      makeRootLazy: FunctionReference<
        "mutation",
        "internal",
        { namespace?: any },
        null
      >;
      replace: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        null
      >;
      replaceOrInsert: FunctionReference<
        "mutation",
        "internal",
        {
          currentKey: any;
          namespace?: any;
          newKey: any;
          newNamespace?: any;
          summand?: number;
          value: any;
        },
        any
      >;
    };
  };
};
