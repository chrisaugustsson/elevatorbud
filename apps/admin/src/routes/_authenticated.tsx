import { createFileRoute, Navigate, Outlet } from "@tanstack/react-router";
import { useAuth } from "@elevatorbud/auth";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  SidebarProvider,
  SidebarInset,
} from "@elevatorbud/ui/components/ui/sidebar";
import { AppSidebar } from "../shared/components/app-sidebar";
import { OrgSelector } from "../shared/components/org-selector";
import { OrgProvider } from "../shared/lib/org-context";

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

  if (user.role !== "admin") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Åtkomst nekad
          </h2>
          <p className="mt-2 text-muted-foreground">
            Du har inte behörighet att komma åt adminportalen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <OrgProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <OrgSelector />
          </header>
          <div className="flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </OrgProvider>
  );
}
