import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { parentContextOptions } from "../../server/context";
import { meOptions } from "../../server/user";

export const Route = createFileRoute("/_authenticated/$parentOrgId")({
  beforeLoad: async ({ params, context }) => {
    const user = await context.queryClient.ensureQueryData(meOptions());

    if (!user || !user.organizationIds.includes(params.parentOrgId)) {
      const defaultOrgId = user?.organizationIds[0];
      if (defaultOrgId) {
        throw redirect({ to: "/$parentOrgId/dashboard", params: { parentOrgId: defaultOrgId } });
      }
      throw redirect({ to: "/" });
    }
  },
  loader: ({ context, params }) => {
    context.queryClient.prefetchQuery(parentContextOptions(params.parentOrgId));
  },
  component: ParentOrgLayout,
});

function ParentOrgLayout() {
  return <Outlet />;
}
