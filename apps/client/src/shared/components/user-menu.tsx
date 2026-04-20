import { ChevronsUpDown, LogOut, Moon, Sun, UserCog } from "lucide-react";
import { useClerk, useUser } from "@elevatorbud/auth";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useTheme } from "@elevatorbud/ui/hooks/use-theme";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@elevatorbud/ui/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@elevatorbud/ui/components/ui/dropdown-menu";
import {
  SidebarMenuButton,
  useSidebar,
} from "@elevatorbud/ui/components/ui/sidebar";

function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function UserMenu() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const { isMobile } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const routeParams = useParams({ strict: false }) as { parentOrgId?: string };
  const parentOrgId = routeParams.parentOrgId;

  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <Avatar className="size-8 rounded-lg">
            <AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
            <AvatarFallback className="rounded-lg">
              {getInitials(user.fullName)}
            </AvatarFallback>
          </Avatar>
          <div className="grid flex-1 text-left text-sm leading-tight">
            <span className="truncate font-medium">{user.fullName}</span>
            <span className="truncate text-xs text-muted-foreground">
              {user.primaryEmailAddress?.emailAddress}
            </span>
          </div>
          <ChevronsUpDown className="ml-auto size-4" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg"
        side={isMobile ? "bottom" : "right"}
        align="end"
        sideOffset={4}
      >
        <DropdownMenuLabel className="p-0 font-normal">
          <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
            <Avatar className="size-8 rounded-lg">
              <AvatarImage src={user.imageUrl} alt={user.fullName ?? ""} />
              <AvatarFallback className="rounded-lg">
                {getInitials(user.fullName)}
              </AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-semibold">{user.fullName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.primaryEmailAddress?.emailAddress}
              </span>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={() => parentOrgId && navigate({ to: "/$parentOrgId/profil", params: { parentOrgId } })}
            className="cursor-pointer"
          >
            <UserCog />
            Profil
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={toggleTheme}
            className="cursor-pointer"
          >
            {theme === "dark" ? <Sun /> : <Moon />}
            {theme === "dark" ? "Ljust läge" : "Mörkt läge"}
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => signOut()}
          className="cursor-pointer"
        >
          <LogOut />
          Logga ut
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
