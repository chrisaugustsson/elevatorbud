import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { parentContextOptions, userDirectOrgsOptions } from "../../server/context";
import { meOptions } from "../../server/user";
import { getLastUsedOrg } from "../../shared/components/org-switcher";
import { toast } from "sonner";

/**
 * FR-38: fall back to last-used context when available and still valid;
 * otherwise pick the first direct grant alphabetically.
 */
function resolveFallbackOrgId(organizationIds: string[]): string | undefined {
  if (organizationIds.length === 0) return undefined;
  const lastUsed = getLastUsedOrg();
  if (lastUsed && organizationIds.includes(lastUsed)) return lastUsed;
  return [...organizationIds].sort()[0];
}

export const Route = createFileRoute("/_authenticated/$parentOrgId")({
  beforeLoad: async ({ params, context }) => {
    const user = await context.queryClient.ensureQueryData(meOptions());

    if (!user || !user.organizationIds.includes(params.parentOrgId)) {
      toast.error("Den organisationen är inte tillgänglig");
      const fallback = user ? resolveFallbackOrgId(user.organizationIds) : undefined;
      if (fallback) {
        throw redirect({ to: "/$parentOrgId/dashboard", params: { parentOrgId: fallback } });
      }
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(parentContextOptions(params.parentOrgId));
    context.queryClient.prefetchQuery(userDirectOrgsOptions());
  },
  component: ParentOrgLayout,
});

/**
 * FR-35: Crossfade the route content on parent-context switch (≤200ms).
 * The `key` forces React to remount the subtree so the fade-in animation
 * replays for every parent change. `motion-reduce:` disables the animation
 * when the user has requested reduced motion.
 */
function ParentOrgLayout() {
  const { parentOrgId } = Route.useParams();
  return (
    <div
      key={parentOrgId}
      className="animate-in fade-in duration-200 motion-reduce:animate-none motion-reduce:duration-0"
    >
      <Outlet />
    </div>
  );
}
