import * as React from "react"
import type { LucideIcon } from "lucide-react"

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
} from "@elevatorbud/ui/components/ui/sidebar"

export type NavItem = {
  title: string
  href: string
  icon: LucideIcon
  variant?: "default" | "primary"
}

export type NavGroup = {
  label?: string
  items: NavItem[]
}

export type AppSidebarProps = {
  /** Brand logo — rendered inside an 8x8 rounded container */
  logo: React.ReactNode
  /** Brand name shown when sidebar is expanded */
  name: string
  /** Navigation groups with optional labels */
  navigation: NavGroup[]
  /** Footer content (e.g. user button) */
  footer?: React.ReactNode
  /** Current pathname for active state detection */
  pathname: string
  /** Render a link element. Receives href, children, and should spread any extra props. */
  renderLink: (props: {
    href: string
    children: React.ReactNode
    className?: string
    [key: string]: unknown
  }) => React.ReactNode
  /** Whether active state uses exact match or startsWith. Default: first group uses exact, rest use prefix. */
  isActive?: (pathname: string, href: string, groupIndex: number) => boolean
}

function defaultIsActive(pathname: string, href: string, groupIndex: number): boolean {
  if (groupIndex === 0) {
    return pathname === href
  }
  return pathname.startsWith(href)
}

export function AppSidebar({
  logo,
  name,
  navigation,
  footer,
  pathname,
  renderLink,
  isActive = defaultIsActive,
}: AppSidebarProps) {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-bold text-sm">
                {logo}
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{name}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {navigation.map((group, groupIndex) => (
          <SidebarGroup key={group.label ?? groupIndex}>
            {group.label && <SidebarGroupLabel>{group.label}</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={item.variant !== "primary" && isActive(pathname, item.href, groupIndex)}
                      tooltip={item.title}
                      className={item.variant === "primary" ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90 hover:text-sidebar-primary-foreground" : undefined}
                    >
                      {renderLink({
                        href: item.href,
                        children: (
                          <>
                            <item.icon />
                            <span>{item.title}</span>
                          </>
                        ),
                      })}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      {footer && (
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              {footer}
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      )}
    </Sidebar>
  )
}
