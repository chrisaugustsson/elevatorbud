import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@elevatorbud/ui/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@elevatorbud/ui/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@elevatorbud/ui/components/ui/tooltip";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@elevatorbud/ui/components/ui/command";
import { userDirectOrgsOptions } from "../../server/context";
import { useSidebar } from "@elevatorbud/ui/components/ui/sidebar";
import { useAnnounce } from "./live-region";

const LAST_ORG_KEY = "elevatorbud:lastParentOrgId";

export function saveLastUsedOrg(orgId: string) {
  try {
    localStorage.setItem(LAST_ORG_KEY, orgId);
  } catch {}
}

export function getLastUsedOrg(): string | null {
  try {
    return localStorage.getItem(LAST_ORG_KEY);
  } catch {
    return null;
  }
}

export function OrgSwitcher() {
  const { data: orgs, isLoading } = useQuery(userDirectOrgsOptions());
  const params = useParams({ strict: false }) as { parentOrgId?: string };
  const parentOrgId = params.parentOrgId;
  const navigate = useNavigate();
  const { isMobile } = useSidebar();
  const [open, setOpen] = useState(false);
  const announce = useAnnounce();

  // Only persist the last-used org once we've confirmed it's in the user's
  // direct grants. Without this guard, an invalid-id redirect bounce would
  // briefly cache an inaccessible org.
  useEffect(() => {
    if (!parentOrgId || !orgs) return;
    if (orgs.some((o) => o.id === parentOrgId)) {
      saveLastUsedOrg(parentOrgId);
    }
  }, [parentOrgId, orgs]);

  const currentOrg = useMemo(
    () => orgs?.find((o) => o.id === parentOrgId),
    [orgs, parentOrgId],
  );

  // FR-39: expose type-to-filter once there are 10+ direct grants.
  const showFilter = (orgs?.length ?? 0) >= 10;

  const handleSelect = useCallback(
    (orgId: string) => {
      if (orgId === parentOrgId) {
        setOpen(false);
        return;
      }
      setOpen(false);
      saveLastUsedOrg(orgId);
      const orgName = orgs?.find((o) => o.id === orgId)?.name ?? "";
      navigate({
        to: "/$parentOrgId/dashboard",
        params: { parentOrgId: orgId },
      });
      // FR-40: announce context change via the stable aria-live region
      // mounted at the auth-shell layer so the message survives the
      // route-level crossfade remount in $parentOrgId.tsx.
      announce(`Bytte till ${orgName}`);
      requestAnimationFrame(() => {
        const target =
          document.getElementById("page-heading") ??
          document.querySelector<HTMLElement>("main[role='main'], [role='main'], main");
        if (target instanceof HTMLElement) {
          target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
        }
      });
    },
    [parentOrgId, navigate, orgs, announce],
  );

  if (isLoading) {
    // FR-37: skeleton matches the 44px switcher height to avoid layout shift.
    return <Skeleton className="h-11 w-40" />;
  }

  if (!orgs || orgs.length === 0 || !parentOrgId) {
    return null;
  }

  if (orgs.length === 1) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className="flex items-center gap-2 text-sm"
              aria-label={`Aktiv organisation: ${currentOrg?.name ?? ""}`}
            >
              <Building2
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="max-w-[200px] truncate font-medium text-foreground">
                {currentOrg?.name ?? "Laddar..."}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{currentOrg?.name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // FR-37: trigger is ≥44×44. Use h-11 (44px) with extra horizontal padding.
  const triggerButton = (
    <Button
      variant="ghost"
      className="flex h-11 min-h-11 items-center gap-2 px-3"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`Byt organisation. Nuvarande: ${currentOrg?.name ?? ""}`}
    >
      <Building2 className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[200px] truncate text-sm font-medium text-foreground">
              {currentOrg?.name ?? "Laddar..."}
            </span>
          </TooltipTrigger>
          <TooltipContent>{currentOrg?.name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ChevronsUpDown
        className="size-3.5 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </Button>
  );

  /**
   * cmdk's `Command` primitive provides arrow-key navigation, Home/End,
   * roving tabindex, Enter/Space to activate, and Escape to close — the
   * full FR-30 keyboard model for free. Items use `role="menuitemradio"`
   * with `aria-checked` so the single-selection semantics are correct
   * (WAI-ARIA pattern), while keeping a visible checkmark.
   */
  const orgList = (
    <Command
      loop
      filter={(value, search) =>
        value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0
      }
    >
      {showFilter && (
        <CommandInput
          placeholder="Filtrera organisationer..."
          aria-label="Filtrera organisationer"
        />
      )}
      <CommandList role="menu" aria-label="Välj organisation">
        <CommandEmpty>Inga organisationer matchar</CommandEmpty>
        <CommandGroup>
          {orgs.map((org) => {
            const isSelected = org.id === parentOrgId;
            return (
              <CommandItem
                key={org.id}
                value={org.name}
                role="menuitemradio"
                aria-checked={isSelected}
                aria-current={isSelected ? "true" : undefined}
                onSelect={() => handleSelect(org.id)}
                className="flex items-center gap-2 py-2"
              >
                <Check
                  className={`size-4 shrink-0 ${
                    isSelected ? "opacity-100" : "opacity-0"
                  }`}
                  aria-hidden
                />
                <span className="truncate">{org.name}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );

  return isMobile ? (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{triggerButton}</SheetTrigger>
      <SheetContent side="bottom" className="max-h-[80vh]">
        <SheetHeader>
          <SheetTitle>Välj organisation</SheetTitle>
        </SheetHeader>
        {orgList}
      </SheetContent>
    </Sheet>
  ) : (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        {orgList}
      </PopoverContent>
    </Popover>
  );
}
