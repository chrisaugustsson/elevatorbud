import {
  createFileRoute,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@elevatorbud/ui/components/ui/sidebar";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import { AppSidebar } from "../shared/components/app-sidebar";
import { GlobalSearch } from "../shared/components/global-search";

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated, userId, getToken } = await auth();

  if (!isAuthenticated) {
    throw redirect({ to: "/login" });
  }

  // Prefetch user from Convex server-side to avoid client loading flash
  try {
    const token = await getToken({ template: "convex" });
    if (token) {
      const httpClient = new ConvexHttpClient(
        import.meta.env.VITE_CONVEX_URL as string,
      );
      httpClient.setAuth(token);
      const user = await httpClient.query(api.users.me);
      return { userId, user };
    }
  } catch {
    // Fall back to client-side fetch
  }

  return { userId, user: undefined as undefined };
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => authGuard(),
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user: prefetchedUser } = Route.useRouteContext();
  const liveUser = useQuery(api.users.me);

  // Use live subscription once available, fall back to server-prefetched data
  const user = liveUser !== undefined ? liveUser : prefetchedUser;

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
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <GlobalSearch />
        </header>
        <div className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
