import {
  BarChart3,
  Building2,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Database,
  Globe,
  HardHat,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@elevatorbud/ui/components/ui/sidebar";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { UserButton } from "@elevatorbud/auth";

const mainNav = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Register", href: "/register", icon: ClipboardList },
  { title: "Modernisering", href: "/modernisering", icon: HardHat },
  { title: "Underhåll", href: "/underhall", icon: Wrench },
] as const;

const webbplatsNav = [
  { title: "Webbplats", href: "/webbplats", icon: Globe },
] as const;

const adminNav = [
  { title: "Organisationer", href: "/admin/organisationer", icon: Building2 },
  { title: "Användare", href: "/admin/anvandare", icon: Users },
  { title: "Import", href: "/admin/import", icon: Upload },
  { title: "Referensdata", href: "/admin/referensdata", icon: Database },
] as const;

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const { toggleSidebar, state } = useSidebar();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            H
          </div>
          <span className="truncate font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Hisskompetens
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto size-7 shrink-0 group-data-[collapsible=icon]:ml-0"
            onClick={toggleSidebar}
          >
            {state === "expanded" ? (
              <ChevronsLeft className="size-4" />
            ) : (
              <ChevronsRight className="size-4" />
            )}
            <span className="sr-only">
              {state === "expanded" ? "Fäll ihop sidopanel" : "Expandera sidopanel"}
            </span>
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      pathname === item.href ||
                      (item.href === "/dashboard" && pathname === "/")
                    }
                    tooltip={item.title}
                  >
                    <Link to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Webbplats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {webbplatsNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link to={item.href} search={{ sida: "startsida" }}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarGroup>
          <SidebarGroupLabel>Admin</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {adminNav.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    tooltip={item.title}
                  >
                    <Link to={item.href}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <UserButton />
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
