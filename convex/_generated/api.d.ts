/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as cms from "../cms.js";
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
  auth: typeof auth;
  cms: typeof cms;
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

export declare const components: {};
