import { useState, useEffect, useMemo } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { useSelectedOrg } from "../../lib/org-context";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/react-table";
import { Button } from "@elevatorbud/ui/components/ui/button";
import { Input } from "@elevatorbud/ui/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@elevatorbud/ui/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@elevatorbud/ui/components/ui/popover";
import { Checkbox } from "@elevatorbud/ui/components/ui/checkbox";
import { Badge } from "@elevatorbud/ui/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@elevatorbud/ui/components/ui/select";
import { Skeleton } from "@elevatorbud/ui/components/ui/skeleton";
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Search,
  X,
  Building2,
  ChevronLeft,
  ChevronRight,
  Pencil,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/register")({
  component: Register,
});

type HissRow = {
  _id: string;
  hissnummer: string;
  adress?: string;
  distrikt?: string;
  hisstyp?: string;
  fabrikat?: string;
  byggar?: number;
  moderniserar?: string;
  rekommenderat_moderniserar?: string;
  budget_belopp?: number;
  organisationsnamn: string;
};

type ListResult = {
  data: HissRow[];
  totalCount: number;
  page: number;
  limit: number;
  totalPages: number;
};

type ForslagsvardItem = {
  _id: string;
  kategori: string;
  varde: string;
  aktiv: boolean;
};

function SortHeader({
  label,
  field,
  sorting,
  onSort,
}: {
  label: string;
  field: string;
  sorting: SortingState;
  onSort: (field: string) => void;
}) {
  const active = sorting.find((s) => s.id === field);
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3"
      onClick={() => onSort(field)}
    >
      {label}
      {active ? (
        active.desc ? (
          <ArrowDown className="ml-1 size-3" />
        ) : (
          <ArrowUp className="ml-1 size-3" />
        )
      ) : (
        <ArrowUpDown className="ml-1 size-3" />
      )}
    </Button>
  );
}

function MultiSelectFilter({
  title,
  options,
  selected,
  onSelectedChange,
}: {
  title: string;
  options: string[];
  selected: string[];
  onSelectedChange: (selected: string[]) => void;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9">
          {title}
          {selected.length > 0 && (
            <Badge
              variant="secondary"
              className="ml-1 rounded-sm px-1 text-xs"
            >
              {selected.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-2" align="start">
        <div className="max-h-60 space-y-1 overflow-y-auto">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
            >
              <Checkbox
                checked={selected.includes(opt)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onSelectedChange([...selected, opt]);
                  } else {
                    onSelectedChange(selected.filter((s) => s !== opt));
                  }
                }}
              />
              {opt}
            </label>
          ))}
          {options.length === 0 && (
            <p className="px-2 py-1 text-sm text-muted-foreground">
              Inga alternativ
            </p>
          )}
        </div>
        {selected.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-1 w-full text-xs"
            onClick={() => onSelectedChange([])}
          >
            Rensa
          </Button>
        )}
      </PopoverContent>
    </Popover>
  );
}

function Register() {
  const { selectedOrgId } = useSelectedOrg();

  // Search state
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Sort state (server-side)
  const [sorting, setSorting] = useState<SortingState>([]);

  // Pagination state
  const [page, setPage] = useState(0);
  const [limit, setLimit] = useState(25);

  // Multi-select filter state
  const [filterDistrikt, setFilterDistrikt] = useState<string[]>([]);
  const [filterHisstyp, setFilterHisstyp] = useState<string[]>([]);
  const [filterFabrikat, setFilterFabrikat] = useState<string[]>([]);

  // Range filter
  const [byggarMin, setByggarMin] = useState("");
  const [byggarMax, setByggarMax] = useState("");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [
    debouncedSearch,
    filterDistrikt,
    filterHisstyp,
    filterFabrikat,
    byggarMin,
    byggarMax,
    selectedOrgId,
  ]);

  // Get filter options from forslagsvarden
  const allSuggestions = useQuery(api.forslagsvarden.list, {});
  const filterOptions = useMemo(() => {
    if (!allSuggestions) return null;
    const aktiv = (allSuggestions as ForslagsvardItem[]).filter((s) => s.aktiv);
    const byCategory = (cat: string) =>
      aktiv
        .filter((s) => s.kategori === cat)
        .map((s) => s.varde)
        .sort((a, b) => a.localeCompare(b, "sv"));
    return {
      distrikt: byCategory("distrikt"),
      hisstyp: byCategory("hisstyp"),
      fabrikat: byCategory("fabrikat"),
    };
  }, [allSuggestions]);

  // Build query args
  const sortField = sorting.length > 0 ? sorting[0].id : undefined;
  const sortOrder =
    sorting.length > 0 ? (sorting[0].desc ? "desc" : "asc") : undefined;

  const queryArgs = {
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(filterDistrikt.length > 0 ? { distrikt: filterDistrikt } : {}),
    ...(filterHisstyp.length > 0 ? { hisstyp: filterHisstyp } : {}),
    ...(filterFabrikat.length > 0 ? { fabrikat: filterFabrikat } : {}),
    ...(byggarMin && !isNaN(parseInt(byggarMin))
      ? { byggarMin: parseInt(byggarMin) }
      : {}),
    ...(byggarMax && !isNaN(parseInt(byggarMax))
      ? { byggarMax: parseInt(byggarMax) }
      : {}),
    ...(sortField ? { sort: sortField } : {}),
    ...(sortOrder ? { order: sortOrder } : {}),
    ...(selectedOrgId ? { organisation_id: selectedOrgId } : {}),
    page,
    limit,
  } as never;

  const result = useQuery(api.hissar.list, queryArgs) as
    | ListResult
    | undefined;

  const hasActiveFilters =
    filterDistrikt.length > 0 ||
    filterHisstyp.length > 0 ||
    filterFabrikat.length > 0 ||
    byggarMin !== "" ||
    byggarMax !== "";

  function clearAllFilters() {
    setFilterDistrikt([]);
    setFilterHisstyp([]);
    setFilterFabrikat([]);
    setByggarMin("");
    setByggarMax("");
  }

  function handleSort(field: string) {
    setSorting((prev) => {
      const existing = prev.find((s) => s.id === field);
      if (!existing) return [{ id: field, desc: false }];
      if (!existing.desc) return [{ id: field, desc: true }];
      return [];
    });
  }

  const columnHelper = createColumnHelper<HissRow>();
  const columns = useMemo(
    () => [
      columnHelper.accessor("hissnummer", {
        header: () => (
          <SortHeader
            label="Hissnummer"
            field="hissnummer"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => (
          <span className="font-medium">{info.getValue()}</span>
        ),
      }),
      columnHelper.accessor("adress", {
        header: () => (
          <SortHeader
            label="Adress"
            field="adress"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("distrikt", {
        header: () => (
          <SortHeader
            label="Distrikt"
            field="distrikt"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("hisstyp", {
        header: () => (
          <SortHeader
            label="Hisstyp"
            field="hisstyp"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("fabrikat", {
        header: () => (
          <SortHeader
            label="Fabrikat"
            field="fabrikat"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("byggar", {
        header: () => (
          <SortHeader
            label="Bygg\u00e5r"
            field="byggar"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() ?? "\u2014",
      }),
      columnHelper.accessor("moderniserar", {
        header: () => (
          <SortHeader
            label="Moderniserad"
            field="moderniserar"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("rekommenderat_moderniserar", {
        header: () => (
          <SortHeader
            label="Rek. modern."
            field="rekommenderat_moderniserar"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => info.getValue() || "\u2014",
      }),
      columnHelper.accessor("budget_belopp", {
        header: () => (
          <SortHeader
            label="Budget"
            field="budget_belopp"
            sorting={sorting}
            onSort={handleSort}
          />
        ),
        cell: (info) => {
          const v = info.getValue();
          return v !== undefined && v !== null
            ? `${(v / 1000).toFixed(0)} tkr`
            : "\u2014";
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: (info) => (
          <Link
            to="/hiss/$id/redigera"
            params={{ id: info.row.original._id }}
            onClick={(e) => e.stopPropagation()}
          >
            <Button variant="ghost" size="icon" className="size-8">
              <Pencil className="size-3.5" />
            </Button>
          </Link>
        ),
      }),
    ],
    [sorting],
  );

  const table = useReactTable({
    data: result?.data ?? [],
    columns,
    manualSorting: true,
    manualPagination: true,
    pageCount: result?.totalPages ?? -1,
    state: {
      sorting,
      pagination: { pageIndex: page, pageSize: limit },
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
  });

  if (result === undefined) {
    return <RegisterSkeleton />;
  }

  const { totalCount, totalPages } = result;
  const offset = page * limit;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Register</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {totalCount} hissar i registret
        </p>
      </div>

      {/* Search bar */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="S\u00f6k hissnummer, adress, distrikt..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
        {search && (
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 size-7 -translate-y-1/2"
            onClick={() => setSearch("")}
          >
            <X className="size-3.5" />
          </Button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        {filterOptions && (
          <>
            <MultiSelectFilter
              title="Distrikt"
              options={filterOptions.distrikt}
              selected={filterDistrikt}
              onSelectedChange={setFilterDistrikt}
            />
            <MultiSelectFilter
              title="Hisstyp"
              options={filterOptions.hisstyp}
              selected={filterHisstyp}
              onSelectedChange={setFilterHisstyp}
            />
            <MultiSelectFilter
              title="Fabrikat"
              options={filterOptions.fabrikat}
              selected={filterFabrikat}
              onSelectedChange={setFilterFabrikat}
            />
          </>
        )}

        <div className="flex items-center gap-1">
          <span className="text-sm text-muted-foreground">Bygg\u00e5r:</span>
          <Input
            type="number"
            placeholder="Fr\u00e5n"
            value={byggarMin}
            onChange={(e) => setByggarMin(e.target.value)}
            className="h-9 w-20"
          />
          <span className="text-muted-foreground">\u2013</span>
          <Input
            type="number"
            placeholder="Till"
            value={byggarMax}
            onChange={(e) => setByggarMax(e.target.value)}
            className="h-9 w-20"
          />
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            <X className="mr-1 size-3" />
            Rensa filter
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  className="cursor-pointer"
                  onClick={() => {
                    window.location.href = `/hiss/${row.original._id}`;
                  }}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <Building2 className="size-8" />
                    <p>Inga hissar hittades.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Visar {offset + 1}\u2013{Math.min(offset + limit, totalCount)} av{" "}
            {totalCount}
          </p>
          <div className="flex items-center gap-2">
            <Select
              value={String(limit)}
              onValueChange={(v) => {
                setLimit(Number(v));
                setPage(0);
              }}
            >
              <SelectTrigger className="h-9 w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="size-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon"
              className="size-9"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

function RegisterSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-80" />
      <Skeleton className="h-9 w-full max-w-xl" />
      <Skeleton className="h-[400px] w-full rounded-md" />
      <Skeleton className="h-9 w-64" />
    </div>
  );
}
