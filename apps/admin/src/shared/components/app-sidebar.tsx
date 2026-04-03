import {
  BarChart3,
  Building2,
  ClipboardList,
  Database,
  Globe,
  HardHat,
  Plus,
  Upload,
  Users,
  Wrench,
} from "lucide-react";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  AppSidebar as AppSidebarBase,
  type NavGroup,
} from "@elevatorbud/ui/components/ui/app-sidebar";
import { UserMenu } from "./user-menu";

const navigation: NavGroup[] = [
  {
    items: [
      { title: "Ny hiss", href: "/ny", icon: Plus, variant: "primary" },
    ],
  },
  {
    items: [
      { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
      { title: "Register", href: "/register", icon: ClipboardList },
      { title: "Organisationer", href: "/admin/organisationer", icon: Building2 },
      { title: "Modernisering", href: "/modernisering", icon: HardHat },
      { title: "Underhåll", href: "/underhall", icon: Wrench },
    ],
  },
  {
    label: "Admin",
    items: [
      { title: "Användare", href: "/admin/anvandare", icon: Users },
      { title: "Import", href: "/admin/import", icon: Upload },
      { title: "Referensdata", href: "/admin/referensdata", icon: Database },
    ],
  },
  {
    label: "Webbplats",
    items: [{ title: "Webbplats", href: "/webbplats", icon: Globe }],
  },
];

export function AppSidebar() {
  const routerState = useRouterState();
  const pathname = routerState.location.pathname;

  return (
    <AppSidebarBase
      logo="H"
      name="Hisskompetens"
      navigation={navigation}
      pathname={pathname}
      renderLink={({ href, children }) => (
        <Link to={href}>{children}</Link>
      )}
      footer={<UserMenu />}
    />
  );
}
