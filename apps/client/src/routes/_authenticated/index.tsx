import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { meOptions } from "../../server/user";
import { defaultParentOrgOptions } from "../../server/context";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/")({
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(defaultParentOrgOptions());
  },
  component: Home,
});

function Home() {
  const { data: defaultOrg } = useSuspenseQuery(defaultParentOrgOptions());

  if (!defaultOrg) {
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

  return <Navigate to="/$parentOrgId/dashboard" params={{ parentOrgId: defaultOrg.id }} />;
}
