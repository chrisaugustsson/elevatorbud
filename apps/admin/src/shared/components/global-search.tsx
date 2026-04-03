import { useState, useEffect, useCallback } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import { Building2, ArrowUpDown, Search } from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
} from "@elevatorbud/ui/components/ui/command";

interface ElevatorResult {
  _id: string;
  elevator_number: string;
  address: string | null;
  district: string | null;
  organizationName: string | null;
}

interface OrgResult {
  _id: string;
  name: string;
}

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const navigate = useNavigate();

  // Debounce search input
  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Cmd+K shortcut
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const results = useQuery(
    api.search.global,
    debouncedSearch ? { search: debouncedSearch } : "skip"
  ) as { elevators: ElevatorResult[]; organizations: OrgResult[] } | undefined;

  const handleSelect = useCallback(
    (type: "elevator" | "organization", id: string) => {
      setOpen(false);
      setSearch("");
      setDebouncedSearch("");
      if (type === "elevator") {
        navigate({ to: "/hiss/$id", params: { id } });
      } else {
        // Route will be created in US-014
        navigate({ to: `/admin/organisationer/${id}` as string });
      }
    },
    [navigate]
  );

  const hasElevators = results && results.elevators.length > 0;
  const hasOrganizations = results && results.organizations.length > 0;
  const hasResults = hasElevators || hasOrganizations;
  const isSearching = debouncedSearch.length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring w-[260px]"
      >
        <Search className="size-4" />
        <span className="flex-1 text-left">Sök hissar, organisationer...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          placeholder="Sök hissar, organisationer..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {isSearching && !hasResults && (
            <CommandEmpty>Inga resultat hittades.</CommandEmpty>
          )}
          {!isSearching && (
            <CommandEmpty className="text-muted-foreground">
              Börja skriva för att söka...
            </CommandEmpty>
          )}
          {hasElevators && (
            <CommandGroup heading="Hissar">
              {results.elevators.map((elevator) => (
                <CommandItem
                  key={elevator._id}
                  value={`elevator-${elevator._id}-${elevator.elevator_number}`}
                  onSelect={() => handleSelect("elevator", elevator._id)}
                >
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                  <div className="flex flex-col min-w-0">
                    <span className="font-medium truncate">
                      {elevator.elevator_number}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {[elevator.address, elevator.district, elevator.organizationName]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
          {hasElevators && hasOrganizations && <CommandSeparator />}
          {hasOrganizations && (
            <CommandGroup heading="Organisationer">
              {results.organizations.map((org) => (
                <CommandItem
                  key={org._id}
                  value={`org-${org._id}-${org.name}`}
                  onSelect={() => handleSelect("organization", org._id)}
                >
                  <Building2 className="size-4 text-muted-foreground" />
                  <span className="truncate">{org.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
}
