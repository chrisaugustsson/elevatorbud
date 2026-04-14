import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Building2, Check, ChevronsUpDown, Search } from "lucide-react";
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
} from "@elevatorbud/ui/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@elevatorbud/ui/components/ui/tooltip";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import { userDirectOrgsOptions } from "../../server/context";
import { useSidebar } from "@elevatorbud/ui/components/ui/sidebar";

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
  const [filter, setFilter] = useState("");
  const announceRef = useRef<HTMLDivElement>(null);
  const mainHeadingRef = useRef<HTMLHeadingElement | null>(null);

  useEffect(() => {
    if (parentOrgId) {
      saveLastUsedOrg(parentOrgId);
    }
  }, [parentOrgId]);

  const currentOrg = useMemo(
    () => orgs?.find((o) => o.id === parentOrgId),
    [orgs, parentOrgId],
  );

  const showFilter = (orgs?.length ?? 0) >= 10;

  const filteredOrgs = useMemo(() => {
    if (!orgs) return [];
    if (!filter) return orgs;
    const lower = filter.toLowerCase();
    return orgs.filter((o) => o.name.toLowerCase().includes(lower));
  }, [orgs, filter]);

  const handleSelect = useCallback(
    (orgId: string) => {
      if (orgId === parentOrgId) {
        setOpen(false);
        return;
      }
      setOpen(false);
      setFilter("");
      saveLastUsedOrg(orgId);
      const orgName = orgs?.find((o) => o.id === orgId)?.name ?? "";
      navigate({
        to: "/$parentOrgId/dashboard",
        params: { parentOrgId: orgId },
      });
      if (announceRef.current) {
        announceRef.current.textContent = `Bytte till ${orgName}`;
      }
      requestAnimationFrame(() => {
        const heading = document.querySelector("main h1, [role='main'] h1, .min-w-0 h1");
        if (heading instanceof HTMLElement) {
          heading.setAttribute("tabindex", "-1");
          heading.focus();
        }
      });
    },
    [parentOrgId, navigate, orgs],
  );

  if (isLoading) {
    return <Skeleton className="h-8 w-40" />;
  }

  if (!orgs || orgs.length === 0 || !parentOrgId) {
    return null;
  }

  if (orgs.length === 1) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-2 text-sm">
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
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

  const triggerButton = (
    <Button
      variant="ghost"
      size="sm"
      className="flex items-center gap-2 px-2"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-label={`Byt organisation. Nuvarande: ${currentOrg?.name ?? ""}`}
    >
      <Building2 className="size-4 shrink-0 text-muted-foreground" />
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="max-w-[200px] truncate font-medium text-foreground text-sm">
              {currentOrg?.name ?? "Laddar..."}
            </span>
          </TooltipTrigger>
          <TooltipContent>{currentOrg?.name}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
    </Button>
  );

  const orgList = (
    <div role="menu" aria-label="Välj organisation">
      {showFilter && (
        <div className="flex items-center gap-2 border-b px-3 py-2">
          <Search className="size-4 text-muted-foreground" />
          <input
            type="text"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Filtrera organisationer..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            autoFocus
          />
        </div>
      )}
      <div className="max-h-[300px] overflow-y-auto p-1">
        {filteredOrgs.length === 0 ? (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Inga organisationer matchar
          </div>
        ) : (
          filteredOrgs.map((org) => {
            const isCurrent = org.id === parentOrgId;
            return (
              <button
                key={org.id}
                role="menuitem"
                aria-current={isCurrent ? "true" : undefined}
                className="flex w-full items-center gap-2 rounded-sm px-3 py-2 text-sm hover:bg-accent focus:bg-accent focus:outline-none"
                onClick={() => handleSelect(org.id)}
              >
                <Check
                  className={`size-4 shrink-0 ${isCurrent ? "opacity-100" : "opacity-0"}`}
                />
                <span className="truncate">{org.name}</span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={announceRef}
        aria-live="polite"
        className="sr-only"
      />
      {isMobile ? (
        <Sheet open={open} onOpenChange={setOpen}>
          <button onClick={() => setOpen(true)} className="contents">
            {triggerButton}
          </button>
          <SheetContent side="bottom" className="max-h-[80vh]">
            <SheetHeader>
              <SheetTitle>Välj organisation</SheetTitle>
            </SheetHeader>
            {orgList}
          </SheetContent>
        </Sheet>
      ) : (
        <Popover open={open} onOpenChange={(v) => { setOpen(v); if (!v) setFilter(""); }}>
          <PopoverTrigger asChild>{triggerButton}</PopoverTrigger>
          <PopoverContent
            className="w-[280px] p-0"
            align="start"
          >
            {orgList}
          </PopoverContent>
        </Popover>
      )}
    </>
  );
}
