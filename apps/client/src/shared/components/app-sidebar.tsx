import {
  BarChart3,
  ClipboardList,
  HardHat,
  Wrench,
} from "lucide-react";
import { Link, useParams, useRouterState } from "@tanstack/react-router";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@elevatorbud/ui/components/ui/sidebar";
import { UserMenu } from "./user-menu";

const navItems = [
  { title: "Dashboard", path: "dashboard", icon: BarChart3 },
  { title: "Register", path: "register", icon: ClipboardList },
  { title: "Modernisering", path: "modernisering", icon: HardHat },
  { title: "Underhåll", path: "underhall", icon: Wrench },
] as const;

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;
  const params = useParams({ strict: false }) as { parentOrgId?: string };
  const parentOrgId = params.parentOrgId;

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground font-bold text-sm">
            H
          </div>
          <span className="truncate font-semibold text-sm group-data-[collapsible=icon]:hidden">
            Hisskompetens
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {parentOrgId && navItems.map((item) => {
                const href = `/${parentOrgId}/${item.path}`;
                return (
                  <SidebarMenuItem key={item.path}>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname.includes(`/${item.path}`)}
                      tooltip={item.title}
                    >
                      <Link to={`/$parentOrgId/${item.path}`} params={{ parentOrgId }}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <UserMenu />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
