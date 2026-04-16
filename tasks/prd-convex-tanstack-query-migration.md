# PRD: Migrate to ConvexQueryClient + TanStack Query

## Introduction

The admin app uses Convex's `useQuery` directly, which only works client-side. On page refresh, users see loading spinners while the Convex WebSocket connects and queries resolve. A manual `ConvexHttpClient` workaround was added for the authenticated layout, but it doesn't scale to every page.

`@convex-dev/react-query` provides `ConvexQueryClient` which bridges Convex with TanStack Query, enabling server-side rendering via HTTP with automatic handoff to Convex's real-time WebSocket subscriptions on the client. This gives us SSR, streaming, caching, prefetch-on-hover, and cleaner loading state management across all 22 files that use Convex queries.

## Goals

- Eliminate all client-side loading flashes on page refresh by streaming server-rendered content
- Enable prefetch-on-hover navigation via TanStack Router's `defaultPreload: "intent"`
- Replace all `=== undefined` loading guards with Suspense-based loading via `useSuspenseQuery`
- Build skeleton `pendingComponent` for every route
- Maintain real-time Convex subscriptions (live updates) after hydration
- Maintain Clerk authentication on both server (SSR) and client (WebSocket)
- Remove the manual `ConvexHttpClient` workaround in `_authenticated.tsx`

## User Stories

### US-001: Install dependencies and set up router with ConvexQueryClient
**Description:** As a developer, I need the TanStack Query + Convex integration packages installed and the router configured so that Convex queries can run through TanStack Query on both server and client.

**Acceptance Criteria:**
- [ ] `@convex-dev/react-query`, `@tanstack/react-query`, and `@tanstack/react-router-with-query` are installed in `apps/admin`
- [ ] `apps/admin/src/router.tsx` creates `ConvexReactClient`, `ConvexQueryClient`, and `QueryClient` with correct wiring (`hashFn`, `queryFn`, `connect`)
- [ ] Router is created via `routerWithQueryClient()` with `{ queryClient, convexClient, convexQueryClient }` in context
- [ ] Router `Wrap` renders `<ConvexProvider>` around children
- [ ] `RouterContext` type is exported for use by root route
- [ ] `defaultPreload: "intent"` is enabled on the router
- [ ] Existing pages still load and function (backwards compatible — Convex `useQuery` still works inside `ConvexProvider`)
- [ ] Typecheck passes

### US-002: Rewrite root route with server-side auth token and provider restructure
**Description:** As a developer, I need the root route to fetch the Clerk auth token server-side and set it on `ConvexQueryClient`'s HTTP client so that SSR queries can authenticate against Convex.

**Acceptance Criteria:**
- [ ] Root route uses `createRootRouteWithContext<RouterContext>()`
- [ ] `beforeLoad` calls a server function that fetches the Clerk token via `auth().getToken({ template: "convex" })` and sets it on `convexQueryClient.serverHttpClient?.setAuth(token)`
- [ ] `shellComponent` (RootDocument) contains only HTML shell: `<html>`, `<head>`, `<body>`, `ThemeProvider`, `<Scripts>` — no data providers
- [ ] Root route `component` (RootLayout) renders `ClerkProvider` → `ConvexProviderWithClerk` → `<Outlet>` + `<Toaster>`
- [ ] `ConvexProviderWithClerk` receives the `convexClient` from route context and `useAuth` from Clerk
- [ ] Module-level `ConvexReactClient` instantiation is removed from `__root.tsx` (moved to `router.tsx`)
- [ ] App loads without console errors
- [ ] Clerk UI components (SignIn, UserButton) still render correctly
- [ ] Typecheck passes

### US-003: Migrate `_authenticated.tsx` to `ensureQueryData` + `useSuspenseQuery`
**Description:** As a developer, I need the authenticated layout to use the proper ConvexQueryClient integration instead of the manual `ConvexHttpClient` workaround, so the user data is prefetched server-side and available instantly.

**Acceptance Criteria:**
- [ ] `ConvexHttpClient` import and manual server-side prefetch logic are removed
- [ ] `convex/browser` import is removed
- [ ] Route `loader` uses `ensureQueryData(convexQuery(api.users.me, {}))` to prefetch user data (this is the only blocking loader in the app — needed for the admin role gate)
- [ ] Component uses `useSuspenseQuery(convexQuery(api.users.me, {}))` instead of `useQuery` from `convex/react`
- [ ] The `prefetchedUser` / `liveUser` fallback pattern is removed
- [ ] The `if (user === undefined)` loading state is removed
- [ ] `beforeLoad` auth guard (redirect to `/login` if unauthenticated) is kept
- [ ] Null check (webhook not synced yet) and `user.role !== "admin"` check are kept
- [ ] Hard refresh on any authenticated page shows no "Laddar användare..." flash
- [ ] Real-time updates still work (change user role in Convex dashboard → UI updates)
- [ ] Typecheck passes

### US-004: Migrate dashboard page
**Description:** As a developer, I need the dashboard page to use `useSuspenseQuery` with a skeleton `pendingComponent` so it streams server-rendered content instead of showing a client-side loading state.

**Acceptance Criteria:**
- [ ] `useQuery` from `convex/react` replaced with `useSuspenseQuery` from `@tanstack/react-query` + `convexQuery` from `@convex-dev/react-query`
- [ ] `if (data === undefined)` loading check removed
- [ ] Skeleton `pendingComponent` added to route definition
- [ ] `useMutation`/`useAction` from `convex/react` remain unchanged (if any)
- [ ] Page renders via streaming SSR with skeleton fallback
- [ ] Real-time updates still work
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-005: Migrate organisationer index page
**Description:** As a developer, I need the organizations list page to use `useSuspenseQuery` with its existing skeleton as `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` replaced with `useSuspenseQuery` + `convexQuery`
- [ ] Existing skeleton loading state extracted to `pendingComponent`
- [ ] Inline `if (orgs === undefined)` check removed
- [ ] `useMutation` calls (create, update) remain on `convex/react` — mutations auto-propagate to TanStack Query cache via Convex subscriptions
- [ ] Creating/updating an organization updates the table without manual cache invalidation
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-006: Migrate användare page
**Description:** As a developer, I need the users management page to use `useSuspenseQuery` with its existing skeleton as `pendingComponent`.

**Acceptance Criteria:**
- [ ] Both `useQuery` calls (`api.userAdmin.list`, `api.organizations.list`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] Existing skeleton loading state extracted to `pendingComponent`
- [ ] Inline `if (users === undefined || orgs === undefined)` check removed
- [ ] `useAction` calls (create, update, deactivate, activate, remove) remain on `convex/react`
- [ ] User actions (create, edit, deactivate) update the table automatically
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-007: Migrate referensdata page
**Description:** As a developer, I need the reference data page to use `useSuspenseQuery` with its existing skeleton as `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` replaced with `useSuspenseQuery` + `convexQuery`
- [ ] Existing skeleton loading state extracted to `pendingComponent`
- [ ] Inline `if (values === undefined)` check removed
- [ ] `useMutation` calls (create, update, merge, deactivate, activate) remain on `convex/react`
- [ ] Mutations update the table automatically
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-008: Migrate organisationer detail page
**Description:** As a developer, I need the organization detail page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] All `useQuery` calls (`organizations.get`, `analytics.stats`, `analytics.chartData`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout (header, stats cards, chart area, tabs)
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-009: Migrate hiss detail page
**Description:** As a developer, I need the elevator detail page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` calls (`elevators.crud.get`, `organizations.get`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout
- [ ] `useMutation` (archive) remains on `convex/react`
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-010: Migrate hiss edit page
**Description:** As a developer, I need the elevator edit page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` calls (`elevators.crud.get`, `organizations.list`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the form layout
- [ ] `useMutation` (update) remains on `convex/react`
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-011: Migrate register page
**Description:** As a developer, I need the elevator register page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` calls (`suggestedValues.list`, `elevators.listing.list`, `exportData`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout (filters + table)
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-012: Migrate modernisering page
**Description:** As a developer, I need the modernization page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] All `useQuery` calls (timeline, budget, measures, priorityList) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-013: Migrate underhåll page
**Description:** As a developer, I need the maintenance page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] All `useQuery` calls (inspectionCalendar, companies, emergencyPhoneStatus, inspectionList) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-014: Migrate ny (create elevator) page
**Description:** As a developer, I need the create elevator page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` (`organizations.list`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the form layout
- [ ] `useMutation` (create) remains on `convex/react`
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-015: Migrate webbplats page
**Description:** As a developer, I need the website/CMS page to use `useSuspenseQuery` with a new skeleton `pendingComponent`.

**Acceptance Criteria:**
- [ ] `useQuery` (`cms.getPage`) replaced with `useSuspenseQuery` + `convexQuery`
- [ ] New skeleton `pendingComponent` created matching the page layout
- [ ] `useMutation` calls (createPage, updatePage) remain on `convex/react`
- [ ] Inline loading checks removed
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-016: Migrate conditional query routes (sök, global search)
**Description:** As a developer, I need the search pages to migrate from Convex's `"skip"` pattern to TanStack Query's `enabled` pattern for conditional queries.

**Acceptance Criteria:**
- [ ] `sok.tsx`: `useQuery(api.search.global, query ? {...} : "skip")` replaced with `useQuery({ ...convexQuery(api.search.global, {...}), enabled: !!query })` from `@tanstack/react-query`
- [ ] `global-search.tsx`: Same pattern with `enabled: !!debouncedSearch`
- [ ] Loading/empty states use `isPending` or `isFetching` from the query result (not `data === undefined`)
- [ ] Search still works: type query → results appear, clear query → results disappear
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-017: Migrate feature components with Suspense wrappers
**Description:** As a developer, I need the feature components that use Convex queries to migrate to `useSuspenseQuery`, with their parent routes wrapping them in `<Suspense>` boundaries.

**Acceptance Criteria:**
- [ ] `org-register-view.tsx`: All `useQuery` calls replaced with `useSuspenseQuery` + `convexQuery`
- [ ] `org-modernization-view.tsx`: All `useQuery` calls replaced with `useSuspenseQuery` + `convexQuery`
- [ ] `org-maintenance-view.tsx`: All `useQuery` calls replaced with `useSuspenseQuery` + `convexQuery`
- [ ] `org-users-view.tsx`: `useQuery` calls replaced; `useAction` calls remain on `convex/react`
- [ ] Each component's parent wraps it in `<Suspense fallback={<Skeleton />}>` with an appropriate skeleton
- [ ] Inline `if (data === undefined)` checks removed from each component
- [ ] Typecheck passes
- [ ] Verify in browser using dev-browser skill

### US-018: Migrate conditional feature hooks
**Description:** As a developer, I need the conditional query hooks to use TanStack Query's `enabled` pattern.

**Acceptance Criteria:**
- [ ] `hissnummer-field.tsx`: `useQuery` replaced with `useQuery` from `@tanstack/react-query` + `convexQuery` + `enabled` flag
- [ ] `use-suggestions.ts`: `useQuery` replaced with `useSuspenseQuery` + `convexQuery`
- [ ] `use-import-machine.ts`: `useQuery` calls replaced with `useQuery` from `@tanstack/react-query` + `convexQuery` + `enabled` flags for conditional queries; `useAction` remains on `convex/react`
- [ ] State machine logic in `use-import-machine.ts` still functions correctly (analyze only runs when conditions are met)
- [ ] Typecheck passes

### US-019: Clean up deprecated code and unused exports
**Description:** As a developer, I need to remove code that was made obsolete by the migration.

**Acceptance Criteria:**
- [ ] `ConvexHttpClient` and `convex/browser` imports fully removed from `_authenticated.tsx`
- [ ] Module-level `ConvexReactClient` removed from `__root.tsx`
- [ ] `ConvexClerkProvider` removed from `packages/auth/src/provider.tsx` if unused elsewhere
- [ ] `packages/auth/src/index.ts` still exports `ConvexProviderWithClerk` (used in root route)
- [ ] All `as ... | undefined` type assertions that were workarounds for Convex's `useQuery` return type are removed where no longer needed
- [ ] No remaining imports of `useQuery` from `convex/react` in migrated files (except files that only use `useMutation`/`useAction`)
- [ ] Typecheck passes

## Functional Requirements

- FR-1: All Convex read queries must go through `@convex-dev/react-query`'s `convexQuery` helper, executed via `useSuspenseQuery` or `useQuery` from `@tanstack/react-query`
- FR-2: All Convex mutations and actions must remain on `useMutation`/`useAction` from `convex/react` — no migration needed, cache is auto-updated via Convex subscriptions
- FR-3: The router must be created with `routerWithQueryClient` and pass `queryClient`, `convexClient`, and `convexQueryClient` in context
- FR-4: The root route `beforeLoad` must fetch the Clerk JWT server-side and set it on `convexQueryClient.serverHttpClient` for authenticated SSR queries
- FR-5: Only `api.users.me` in `_authenticated.tsx` uses a blocking `loader` with `ensureQueryData` (required for the admin role gate). All other queries stream via Suspense
- FR-6: Every route that uses `useSuspenseQuery` must define a `pendingComponent` with a skeleton matching the page layout
- FR-7: Feature components using `useSuspenseQuery` must be wrapped in `<Suspense>` boundaries by their parent
- FR-8: Conditional queries (search, hissnummer check, import analysis) must use `useQuery` with `enabled` flag instead of Convex's `"skip"` pattern
- FR-9: `ConvexProviderWithClerk` must remain in the component tree for client-side Clerk auth token refresh on the WebSocket
- FR-10: `ConvexProvider` must wrap the router output via `Wrap` for TanStack Query SSR integration

## Non-Goals

- No migration of `useMutation` or `useAction` to TanStack Query mutations — Convex subscription-based cache updates make this unnecessary
- No optimistic updates — current mutation UX (wait for server confirmation) is acceptable
- No custom `staleTime` or `gcTime` configuration — Convex subscriptions keep data fresh automatically
- No migration of the `login.tsx` route — it has no Convex queries
- No changes to Convex backend functions — this is purely a client/SSR integration change
- No changes to the `packages/auth` server exports (`clerkMiddleware`, `auth`)

## Technical Considerations

- **Cloudflare Workers**: The app runs on Cloudflare Workers (not Node.js). `ConvexQueryClient`'s `serverHttpClient` uses `fetch` which is available in Workers. Verify no Node.js-specific APIs are pulled in by `@convex-dev/react-query`.
- **Provider nesting**: Router `Wrap` provides `ConvexProvider` (for SSR). Root route `component` provides `ConvexProviderWithClerk` (for client auth). Both share the same `ConvexReactClient` instance. The inner provider overrides the outer context.
- **Streaming SSR**: TanStack Start on Cloudflare supports streaming via Web Streams API. Suspense boundaries stream content progressively — the shell renders first, then each boundary resolves and streams in.
- **`shellComponent` vs `component`**: Moving `ClerkProvider` from `shellComponent` to root route `component` changes SSR rendering order. Clerk UI components must still render correctly.
- **Conditional queries**: `enabled: false` returns `{ data: undefined, isPending: true }`. Code must use `isPending`/`isFetching` for loading states, not `data === undefined`.
- **`createRootRouteWithContext` type change**: Switching from `createRootRoute()` to `createRootRouteWithContext<RouterContext>()()` changes the route's type signature. TanStack Router's file-based codegen should propagate the context type to child routes automatically.

## Success Metrics

- Zero "Laddar..." text visible on hard refresh for any authenticated page
- Navigation between pages feels instant (data prefetched on hover)
- Real-time updates continue working — data changes in Convex propagate to UI within 1 second
- Mutations update the UI without page refresh or manual cache invalidation
- No increase in bundle size beyond the added packages (~15-20KB gzipped for `@tanstack/react-query`)
- `pnpm typecheck` passes with zero errors

## Open Questions

- Does `ConvexQueryClient`'s `serverHttpClient` work correctly on Cloudflare Workers, or does it depend on Node.js APIs? Needs verification during US-001.
- When `useSuspenseQuery` is used in a feature component without an explicit `<Suspense>` boundary, React bubbles up to the nearest one. If a developer forgets the boundary, the entire route might flash. Should we add a default `<Suspense>` wrapper in the authenticated layout as a safety net?
