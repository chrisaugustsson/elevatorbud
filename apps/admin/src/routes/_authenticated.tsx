import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import { useSuspenseQuery, useQuery as useTanstackQuery } from "@tanstack/react-query";
import { getMeOptions } from "../server/user";
import { unreadCountOptions } from "../server/contact";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@elevatorbud/ui/components/ui/sidebar";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Bell } from "lucide-react";
import { useClerk } from "@elevatorbud/auth";
import { AppSidebar } from "../shared/components/app-sidebar";
import { GlobalSearch } from "../shared/components/global-search";

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    throw redirect({ to: "/login" });
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => authGuard(),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.prefetchQuery(getMeOptions()),
      context.queryClient.prefetchQuery(unreadCountOptions()),
    ]);
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { signOut } = useClerk();
  const { data: user } = useSuspenseQuery(getMeOptions());

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
          <Button
            variant="outline"
            className="mt-4"
            onClick={() => signOut()}
          >
            Logga ut
          </Button>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider className="h-svh min-h-0 overflow-hidden">
      <AppSidebar />
      <SidebarInset className="h-svh overflow-hidden">
        <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator
            orientation="vertical"
            className="mr-2 data-[orientation=vertical]:h-4"
          />
          <GlobalSearch />
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </header>
        <div className="min-w-0 flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

function NotificationBell() {
  const { data: count } = useTanstackQuery(unreadCountOptions());

  const unread = typeof count === "number" ? count : 0;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link to="/admin/meddelanden">
        <Bell className={`size-5 ${unread > 0 ? "text-foreground" : "text-muted-foreground"}`} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </Link>
    </Button>
  );
}
