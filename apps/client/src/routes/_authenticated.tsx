import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@elevatorbud/auth";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@elevatorbud/ui/components/ui/sidebar";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import { AppSidebar } from "../components/app-sidebar";
import { OrgDisplay } from "../components/org-display";

export const Route = createFileRoute("/_authenticated")({
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { isSignedIn, isLoaded } = useAuth();
  const user = useQuery(api.users.me);

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Laddar...</div>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Navigate to="/login" />;
  }

  if (user === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Laddar användare...</div>
      </div>
    );
  }

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            Ditt konto konfigureras. Vänta ett ögonblick...
          </p>
        </div>
      </div>
    );
  }

  if (user.roll !== "kund") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Åtkomst nekad
          </h2>
          <p className="mt-2 text-muted-foreground">
            Du har inte behörighet att komma åt kundportalen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          {user.organisation_id && (
            <OrgDisplay organisationId={user.organisation_id} />
          )}
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
