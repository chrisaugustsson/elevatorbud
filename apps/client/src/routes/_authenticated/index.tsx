import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { userDirectOrgsOptions } from "../../server/context";
import { getLastUsedOrg } from "../../shared/components/org-switcher";

export const Route = createFileRoute("/_authenticated/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(userDirectOrgsOptions());
  },
  component: Home,
});

function Home() {
  const { data: orgs } = useSuspenseQuery(userDirectOrgsOptions());

  const targetOrgId = useMemo(() => {
    if (!orgs || orgs.length === 0) return null;
    const lastUsed = getLastUsedOrg();
    if (lastUsed && orgs.some((o) => o.id === lastUsed)) return lastUsed;
    return orgs[0].id;
  }, [orgs]);

  if (!targetOrgId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            Du har inte tillgång till någon organisation.
          </p>
        </div>
      </div>
    );
  }

  return <Navigate to="/$parentOrgId/dashboard" params={{ parentOrgId: targetOrgId }} />;
}
