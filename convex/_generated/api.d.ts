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
import type * as elevators from "../elevators.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as imports from "../imports.js";
import type * as importsInternal from "../importsInternal.js";
import type * as organizations from "../organizations.js";
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
  elevators: typeof elevators;
  email: typeof email;
  http: typeof http;
  imports: typeof imports;
  importsInternal: typeof importsInternal;
  organizations: typeof organizations;
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
