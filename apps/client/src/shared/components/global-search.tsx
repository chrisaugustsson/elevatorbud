import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { convexQuery } from "@convex-dev/react-query";
import { api } from "@convex/_generated/api";
import { useNavigate } from "@tanstack/react-router";
import {
  BarChart3,
  ClipboardList,
  Clock,
  ArrowUpDown,
  HardHat,
  Search,
  Wrench,
  X,
} from "lucide-react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
} from "@elevatorbud/ui/components/ui/command";

interface ElevatorResult {
  _id: string;
  elevator_number: string;
  address: string | null;
  district: string | null;
  organizationName: string | null;
}

interface RecentSearch {
  query: string;
  timestamp: number;
}

const STORAGE_KEY = "hisskompetens-client-recent-searches";
const MAX_RECENT = 5;

function getRecentSearches(): RecentSearch[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored) as RecentSearch[];
  } catch {
    return [];
  }
}

function saveRecentSearch(query: string) {
  const trimmed = query.trim();
  if (!trimmed || trimmed.length < 2) return;
  const existing = getRecentSearches().filter((s) => s.query !== trimmed);
  const updated = [{ query: trimmed, timestamp: Date.now() }, ...existing].slice(
    0,
    MAX_RECENT,
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

function removeRecentSearch(query: string) {
  const updated = getRecentSearches().filter((s) => s.query !== query);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

const quickNav = [
  { title: "Dashboard", href: "/dashboard", icon: BarChart3 },
  { title: "Register", href: "/register", icon: ClipboardList },
  { title: "Modernisering", href: "/modernisering", icon: HardHat },
  { title: "Underhåll", href: "/underhall", icon: Wrench },
] as const;

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [recentSearches, setRecentSearches] = useState<RecentSearch[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setRecentSearches(getRecentSearches());
    }
  }, [open]);

  useEffect(() => {
    if (!search.trim()) {
      setDebouncedSearch("");
      return;
    }
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

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

  const { data: results, isFetching } = useQuery({
    ...convexQuery(api.search.global, { search: debouncedSearch! }),
    enabled: !!debouncedSearch,
  }) as {
    data: { elevators: ElevatorResult[] } | undefined;
    isFetching: boolean;
  };

  const handleSelect = useCallback(
    (id: string) => {
      if (search.trim()) {
        saveRecentSearch(search.trim());
      }
      setOpen(false);
      setSearch("");
      setDebouncedSearch("");
      navigate({ to: "/hiss/$id", params: { id } });
    },
    [navigate, search],
  );

  const handleNavigate = useCallback(
    (href: string) => {
      setOpen(false);
      setSearch("");
      setDebouncedSearch("");
      navigate({ to: href });
    },
    [navigate],
  );

  const handleRecentClick = useCallback(
    (query: string) => {
      setSearch(query);
      setDebouncedSearch(query);
    },
    [],
  );

  const handleRemoveRecent = useCallback(
    (e: React.MouseEvent, query: string) => {
      e.stopPropagation();
      removeRecentSearch(query);
      setRecentSearches(getRecentSearches());
    },
    [],
  );

  const hasElevators = results && results.elevators.length > 0;
  const isSearching = debouncedSearch.length > 0;
  const showDefaultState = !isSearching;

  const filteredNav = useMemo(() => {
    if (!search.trim()) return quickNav;
    const lower = search.toLowerCase();
    return quickNav.filter((item) => item.title.toLowerCase().includes(lower));
  }, [search]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex w-auto items-center justify-center rounded-md border border-input bg-background p-1.5 text-muted-foreground shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring sm:w-72 sm:gap-2 sm:px-3 md:w-80 lg:w-96"
      >
        <Search className="size-4" />
        <span className="hidden flex-1 text-left text-sm sm:inline">Sök hissar...</span>
        <kbd className="pointer-events-none hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) {
            setSearch("");
            setDebouncedSearch("");
          }
        }}
      >
        <CommandInput
          placeholder="Sök hissar..."
          value={search}
          onValueChange={setSearch}
        />
        <CommandList>
          {isSearching && !hasElevators && !isFetching && (
            <CommandEmpty>Inga resultat för "{debouncedSearch}"</CommandEmpty>
          )}

          {isSearching && isFetching && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Söker...
            </div>
          )}

          {hasElevators && (
            <CommandGroup heading="Hissar">
              {results.elevators.map((elevator) => (
                <CommandItem
                  key={elevator._id}
                  value={`elevator-${elevator._id}-${elevator.elevator_number}`}
                  onSelect={() => handleSelect(elevator._id)}
                >
                  <ArrowUpDown className="size-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-col">
                    <span className="truncate font-medium">
                      {elevator.elevator_number}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {[elevator.address, elevator.district]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          {showDefaultState && (
            <>
              {recentSearches.length > 0 && (
                <CommandGroup heading="Senaste sökningar">
                  {recentSearches.map((recent) => (
                    <CommandItem
                      key={recent.query}
                      value={`recent-${recent.query}`}
                      onSelect={() => handleRecentClick(recent.query)}
                    >
                      <Clock className="size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{recent.query}</span>
                      <button
                        className="rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-data-[selected=true]:opacity-100"
                        onClick={(e) => handleRemoveRecent(e, recent.query)}
                        tabIndex={-1}
                      >
                        <X className="size-3" />
                      </button>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}

              {recentSearches.length > 0 && <CommandSeparator />}

              <CommandGroup heading="Gå till">
                {filteredNav.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`nav-${item.title}`}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {isSearching && filteredNav.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Gå till">
                {filteredNav.map((item) => (
                  <CommandItem
                    key={item.href}
                    value={`nav-${item.title}`}
                    onSelect={() => handleNavigate(item.href)}
                  >
                    <item.icon className="size-4 text-muted-foreground" />
                    <span>{item.title}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
        </CommandList>

        <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↑↓</kbd>
              navigera
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">↵</kbd>
              öppna
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono text-[10px]">esc</kbd>
              stäng
            </span>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}
