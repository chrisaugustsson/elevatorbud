import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { auth } from "@elevatorbud/auth/server";
import { useSuspenseQuery } from "@tanstack/react-query";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@elevatorbud/ui/components/ui/sidebar";
import { Separator } from "@elevatorbud/ui/components/ui/separator";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { useClerk } from "@elevatorbud/auth";
import { meOptions } from "../server/user";
import { userDirectOrgsOptions } from "../server/context";
import { AppSidebar } from "../shared/components/app-sidebar";
import { OrgSwitcher } from "../shared/components/org-switcher";
import { GlobalSearch } from "../shared/components/global-search";
import { LiveRegionProvider } from "../shared/components/live-region";

const authGuard = createServerFn().handler(async () => {
  const { isAuthenticated } = await auth();

  if (!isAuthenticated) {
    throw redirect({ to: "/login" });
  }
});

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: () => authGuard(),
  loader: ({ context }) => {
    context.queryClient.prefetchQuery(meOptions());
    context.queryClient.prefetchQuery(userDirectOrgsOptions());
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { signOut } = useClerk();
  const { data: user } = useSuspenseQuery(meOptions());

  if (user === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            Ditt konto konfigureras. Vänta ett ögonblick...
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

  if (user.role !== "customer") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground">
            Åtkomst nekad
          </h2>
          <p className="mt-2 text-muted-foreground">
            Du har inte behörighet att komma åt kundportalen.
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
    <LiveRegionProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <Separator
              orientation="vertical"
              className="mr-2 data-[orientation=vertical]:h-4"
            />
            <OrgSwitcher />
            <div className="ml-auto">
              <GlobalSearch />
            </div>
          </header>
          <div className="min-w-0 flex-1 overflow-auto p-6">
            <Outlet />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </LiveRegionProvider>
  );
}
